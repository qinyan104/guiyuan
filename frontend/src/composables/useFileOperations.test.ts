import { ref } from 'vue'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  createStandalonePublicationSvg: vi.fn(),
  serializeSvg: vi.fn(() => '<svg></svg>'),
}))

vi.mock('../features/export/publicationExport', () => ({
  createPrintDocument: vi.fn(),
  createPrintLayoutPages: vi.fn(),
  createPrintPageSvg: vi.fn(),
  createStandalonePublicationSvg: mocks.createStandalonePublicationSvg,
  rasterizeSvgToPngBlob: vi.fn(),
  serializeSvg: mocks.serializeSvg,
}))

vi.mock('../features/export/shareHtmlExport', () => ({ generateShareHtml: vi.fn() }))

import { useFileOperations } from './useFileOperations'

function createOperations() {
  const statusMessage = ref('')
  const errorMessage = ref('')
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
  const releaseExportLock = vi.fn()
  const publication = {
    title: '测试族谱',
    focusFamilyId: 'f1',
    people: { p1: { id: 'p1', name: '甲', gender: 'male' } },
    families: { f1: { id: 'f1', adults: ['p1'], children: [] } },
  }
  const layout = {
    width: 100,
    height: 100,
    cards: [{}],
    lines: [],
    displayedPeople: 1,
    generationCount: 1,
    pageCount: 1,
    paperPixelWidth: 100,
    paperPixelHeight: 100,
    titleAreaHeight: 0,
  }

  const operations = useFileOperations({
    pub: {
      publication,
      settings: { paper: 'A4' },
      selectedPersonId: ref('p1'),
      replaceReactiveObject: vi.fn(),
      getDefaultSelectedPersonId: vi.fn(() => 'p1'),
      layout: ref(layout),
    } as never,
    statusMessage,
    errorMessage,
    getErrorMessage: (error) => error instanceof Error ? error.message : '导出失败',
    initializeHistoryBaseline: vi.fn(),
    markHistory: vi.fn(),
    canvasRef: ref({
      prepareForExport: vi.fn(async () => undefined),
      releaseExportLock,
      getSvgElement: () => svg,
    }),
    layout: ref(layout) as never,
    serverPublicationId: ref(null),
  })

  return { operations, statusMessage, errorMessage, releaseExportLock }
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.stubGlobal('URL', {
    createObjectURL: vi.fn(() => 'blob:test'),
    revokeObjectURL: vi.fn(),
  })
  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined)
})

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

describe('useFileOperations exports', () => {
  it('tracks export progress and ignores a concurrent export', async () => {
    let finish!: (svg: SVGSVGElement) => void
    mocks.createStandalonePublicationSvg.mockReturnValue(new Promise((resolve) => { finish = resolve }))
    const { operations } = createOperations()

    const first = operations.downloadSvg()
    await Promise.resolve()
    expect(operations.isExporting.value).toBe(true)

    const second = operations.downloadSvg()
    expect(mocks.createStandalonePublicationSvg).toHaveBeenCalledOnce()

    finish(document.createElementNS('http://www.w3.org/2000/svg', 'svg'))
    await Promise.all([first, second])
    expect(operations.isExporting.value).toBe(false)
  })

  it('converts SVG preparation failures into user-visible export errors', async () => {
    mocks.createStandalonePublicationSvg.mockRejectedValue(new Error('图片嵌入失败'))
    const { operations, statusMessage, errorMessage, releaseExportLock } = createOperations()

    await expect(operations.downloadSvg()).resolves.toBeUndefined()

    expect(errorMessage.value).toBe('图片嵌入失败')
    expect(statusMessage.value).toBe('')
    expect(releaseExportLock).toHaveBeenCalledOnce()
    expect(operations.isExporting.value).toBe(false)
  })
})
