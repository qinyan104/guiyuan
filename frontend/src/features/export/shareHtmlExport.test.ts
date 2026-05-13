import { describe, expect, it, vi } from 'vitest'

import type {
  PublicationData,
  PublicationLayout,
  PublicationSettings,
} from '../../types/family'

vi.mock('../persistence/draftPersistence', () => ({
  createPortablePublication: vi.fn(async (publication: PublicationData) => publication),
}))

vi.mock('./publicationExport', async () => {
  const actual = await vi.importActual<typeof import('./publicationExport')>('./publicationExport')
  return {
    ...actual,
    createStandalonePublicationSvg: vi.fn(
      async ({ svgElement }: { svgElement: SVGSVGElement }) => svgElement,
    ),
    getSvgThemeMap: vi.fn(() => ({ '--bg-paper': '#fffdf8' })),
    serializeSvg: vi.fn(
      () => '<svg viewBox="0 0 100 100"><g class="person-card" data-person-id="p1"></g></svg>',
    ),
  }
})

import {
  buildEmbeddedScript,
  buildHtmlTemplate,
  buildInfoHeader,
  generateShareHtml,
} from './shareHtmlExport'

const samplePublication: PublicationData = {
  title: '李氏宗谱',
  subtitle: '陇西堂支谱',
  focusFamilyId: 'f1',
  people: {
    p1: {
      id: 'p1',
      name: '李明',
      gender: 'male',
      deceased: false,
      titleName: '族长',
    },
    p2: {
      id: 'p2',
      name: '李远',
      gender: 'male',
      deceased: true,
    },
  },
  families: {
    f1: {
      id: 'f1',
      adults: ['p1'],
      children: ['p2'],
    },
  },
  info: {
    ancestralOrigin: '陇西',
    hallName: '敦本堂',
    familyMotto: '敦亲睦族',
  },
}

const sampleSettings: PublicationSettings = {
  paper: 'A4',
  layoutMode: 'modern',
  cardWidth: 240,
  generationGap: 120,
  siblingGap: 48,
  partnerGap: 32,
  fontScale: 1,
  zoom: 1,
  showDeath: true,
  showAge: true,
  showNote: true,
  showPhoto: true,
  paddingX: 40,
  paddingY: 40,
}

const sampleLayout: PublicationLayout = {
  width: 100,
  height: 100,
  cards: [],
  lines: [],
  displayedPeople: 2,
  generationCount: 2,
  pageCount: 1,
  paperPixelWidth: 100,
  paperPixelHeight: 100,
  titleAreaHeight: 0,
}

describe('shareHtmlExport helpers', () => {
  it('buildInfoHeader renders readable publication metadata', () => {
    const html = buildInfoHeader(samplePublication)

    expect(html).toContain('郡望/祖籍：陇西')
    expect(html).toContain('堂号：敦本堂')
    expect(html).toContain('族训：敦亲睦族')
  })

  it('buildHtmlTemplate renders readable password gate copy', () => {
    const html = buildHtmlTemplate({
      title: samplePublication.title,
      themeCss: ':root {}',
      infoHeader: '<h1>李氏宗谱</h1>',
      statsHtml: '共 2 人',
      script: 'console.log("ok")',
      isEncrypted: true,
      generatedAt: '2026/05/13 23:00:00',
    })

    expect(html).toContain('<h2>族谱已加密</h2>')
    expect(html).toContain('<p>请输入密码以查看内容</p>')
    expect(html).toContain('placeholder="请输入密码"')
    expect(html).toContain('autocomplete="off"')
    expect(html).toContain('生成于：2026/05/13 23:00:00')
  })

  it('buildEmbeddedScript emits valid unlock script text', () => {
    const script = buildEmbeddedScript('{"v":1}', true)

    expect(() => new Function(script)).not.toThrow()
    expect(script).toContain('请输入密码')
    expect(script).toContain('密码错误或文件已损坏')
    expect(script).toContain('称号')
  })

  it('generateShareHtml builds a parseable standalone document shell', async () => {
    const svgElement = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
    const html = await generateShareHtml({
      publication: samplePublication,
      settings: sampleSettings,
      layout: sampleLayout,
      svgElement,
      password: 'secret',
    })

    const doc = new DOMParser().parseFromString(html, 'text/html')

    expect(doc.querySelector('#app')).not.toBeNull()
    expect(doc.querySelector('#tree-viewport')).not.toBeNull()
    expect(doc.querySelector('#detail-panel')).not.toBeNull()
    expect(doc.querySelector('#tree-camera')).not.toBeNull()
    expect(doc.querySelector('#detail-content')).not.toBeNull()
    expect(html).toContain('setupCardClick')
    expect(doc.body.textContent).toContain('李氏宗谱')
    expect(doc.body.textContent).toContain('郡望/祖籍：陇西')
    expect(doc.body.textContent).toContain('堂号：敦本堂')
    expect(doc.body.textContent).toContain('族训：敦亲睦族')
    expect(doc.body.textContent).toContain('共 2 人')
    expect(doc.body.textContent).toContain('在世 1 人')
    expect(doc.body.textContent).toContain('已故 1 人')
    expect(doc.body.textContent).toContain('族谱已加密')
    expect(doc.body.textContent).toContain('请输入密码以查看内容')
    expect(doc.querySelector('#pwd-input')?.getAttribute('placeholder')).toBe('请输入密码')
    expect(doc.querySelector('#pwd-input')?.getAttribute('autocomplete')).toBe('off')
  })
})
