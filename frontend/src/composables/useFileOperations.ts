import { nextTick, ref, shallowRef, type Ref } from 'vue'

import type { DraftPackage, Person, PublicationLayout } from '../types/family'
import {
  createPrintDocument,
  createPrintLayoutPages,
  createPrintPageSvg,
  createStandalonePublicationSvg,
  rasterizeSvgToPngBlob,
  serializeSvg as serializeStandaloneSvg,
  type PngExportQuality,
} from '../features/export/publicationExport'
import { generateShareHtml } from '../features/export/shareHtmlExport'
import {
  createDraftPackage,
  createPortablePublication,
  parseDraftJson,
  serializeDraftPackage,
} from '../features/persistence/draftPersistence'
import {
  isNativeDraftFileAccessSupported,
  openDraftFileWithPicker,
  saveDraftFileWithPicker,
  writeDraftFile,
  type DraftFileHandle,
} from '../features/persistence/draftFileAccess'
import { formatValidationIssues } from '../features/validation/draftSchema'
import { uploadPhoto, getPhotoUrl } from '../api/photo'
import { layoutPublication } from '../lib/layout'
import { useUiStore, type ThemeMode } from '../stores/ui'

import type { PublicationStateReturn } from './usePublicationState'
interface FileOperationsDeps {
  pub: PublicationStateReturn
  statusMessage: Ref<string>
  errorMessage: Ref<string>
  getErrorMessage: (error: unknown, fallback: string) => string
  initializeHistoryBaseline: () => void
  markHistory: (label: string) => void
  canvasRef: Ref<{
    getSvgElement?: () => SVGSVGElement | null
    resetView?: () => void
    prepareForExport?: () => Promise<void>
    releaseExportLock?: () => void
  } | null>
  layout: PublicationStateReturn['layout']
  onImport?: () => void
  serverPublicationId: Ref<number | null>
}

export function useFileOperations(deps: FileOperationsDeps) {
  const {
    pub,
    statusMessage,
    errorMessage,
    getErrorMessage,
    initializeHistoryBaseline,
    markHistory,
    canvasRef,
    layout,
    serverPublicationId,
  } = deps

  const { publication, settings, selectedPersonId, replaceReactiveObject, getDefaultSelectedPersonId } = pub

  const onImport = deps.onImport

  const draftFileHandle = shallowRef<DraftFileHandle | null>(null)
  const draftFileName = ref('')
  const hasUnsavedFileChanges = ref(false)
  const isExporting = ref(false)
  const nativeFileAccessSupported = isNativeDraftFileAccessSupported()
  let isApplyingFileDraft = false

  async function runCanvasExport(fallback: string, task: () => Promise<void>): Promise<void> {
    if (isExporting.value) return
    isExporting.value = true
    errorMessage.value = ''
    try {
      await task()
    } catch (error) {
      errorMessage.value = getErrorMessage(error, fallback)
      statusMessage.value = ''
    } finally {
      isExporting.value = false
    }
  }

  function getIsApplyingFileDraft(): boolean {
    return isApplyingFileDraft
  }

  /** 将 base64 Data URL 转换为 File 对象 */
  function base64DataUrlToFile(dataUrl: string, filename: string): File {
    const [header, b64] = dataUrl.split(',')
    const mimeMatch = header.match(/:(.*?);/)
    const mime = mimeMatch?.[1] || 'image/jpeg'
    const binaryStr = atob(b64)
    const bytes = new Uint8Array(binaryStr.length)
    for (let i = 0; i < binaryStr.length; i++) {
      bytes[i] = binaryStr.charCodeAt(i)
    }
    return new File([bytes], filename, { type: mime })
  }

  /** 处理族谱数据中的 base64 头像：上传到服务器并替换为照片 URL */
  async function processBase64AvatarsInDraft(
    draft: DraftPackage,
    pubId: number,
    onProgress?: (done: number, total: number) => void,
  ): Promise<void> {
    const people = draft.publication.people
    if (!people) return

    const entries = Object.entries(people).filter(([, p]: [string, unknown]) => {
      const person = p as Person
      return person.avatarUrl?.startsWith('data:')
    })

    if (entries.length === 0) return

    let done = 0
    for (const [personId, p] of entries) {
      const person = p as Person
      try {
        const file = base64DataUrlToFile(person.avatarUrl!, `${personId}.jpg`)
        const photoId = await uploadPhoto(personId, pubId, file)
        person.avatarUrl = getPhotoUrl(photoId)
      } catch (err) {
        // 上传失败则清除该头像，避免影响整体保存
        console.warn(`[import] 头像上传失败 (${personId}):`, err)
        person.avatarUrl = undefined
      }
      done++
      onProgress?.(done, entries.length)
    }
  }

  function sanitizeFileName(raw: string): string {
    return raw.replace(/[\\/:*?"<>|]/g, '-').trim() || 'Guiyuan-archive-preview'
  }

  function getPngExportLayout(): PublicationLayout {
    return layoutPublication(publication, { ...settings, zoom: 1 })
  }

  function getActiveTheme(explicitTheme?: ThemeMode): ThemeMode {
    if (explicitTheme) return explicitTheme
    try {
      const uiStore = useUiStore()
      if (uiStore?.currentTheme) return uiStore.currentTheme
    } catch {}
    if (typeof document !== 'undefined') {
      const attr = document.documentElement.getAttribute('data-theme') as ThemeMode
      if (attr) return attr
    }
    return 'paper'
  }

  async function createCurrentStandaloneSvg(
    exportLayout: PublicationLayout = layout.value,
    theme?: ThemeMode,
  ): Promise<SVGSVGElement | null> {
    const activeTheme = getActiveTheme(theme)
    // 方案一安全锁：导出前强制渲染全部节点，防止视口裁剪导致导出残缺
    await canvasRef.value?.prepareForExport?.()
    const svgElement = canvasRef.value?.getSvgElement?.()
    if (!svgElement || exportLayout.cards.length === 0 || exportLayout.width <= 0 || exportLayout.height <= 0) {
      canvasRef.value?.releaseExportLock?.()
      return null
    }
    try {
      return await createStandalonePublicationSvg({
        svgElement,
        layout: exportLayout,
        title: publication.title.trim() || '归元档案预览',
        theme: activeTheme,
      })
    } finally {
      canvasRef.value?.releaseExportLock?.()
    }
  }

  async function serializeCurrentSvg(theme?: ThemeMode): Promise<string | null> {
    const svg = await createCurrentStandaloneSvg(layout.value, theme)
    if (!svg) return null
    return serializeStandaloneSvg(svg)
  }

  function downloadTextFile(fileName: string, content: string, type: string) {
    const blob = new Blob([content], { type })
    downloadBlobFile(fileName, blob)
  }

  function downloadBlobFile(fileName: string, blob: Blob) {
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = fileName
    link.click()
    window.setTimeout(() => URL.revokeObjectURL(url), 0)
  }

  function createCurrentDraftJson(): string {
    return serializeDraftPackage(createDraftPackage(publication, settings))
  }

  function getSuggestedDraftFileName(): string {
    const rawName = draftFileName.value.trim() || sanitizeFileName(publication.title)
    return rawName.toLowerCase().endsWith('.json') ? rawName : `${rawName}.json`
  }

  function shouldReplaceCurrentDraft(action = '导入文件'): boolean {
    if (serverPublicationId.value) {
      return window.confirm(
        `${action}会完整替换当前族谱“${publication.title || '未命名族谱'}”，并自动保存到服务器。确定继续吗？`,
      )
    }
    if (!hasUnsavedFileChanges.value) return true
    return window.confirm('当前草稿还有未保存到文件的修改，继续打开其他文件会覆盖当前内容。是否继续？')
  }

  function applyFileDraft(
    draft: DraftPackage,
    options: {
      fileName?: string
      handle?: DraftFileHandle | null
      statusMessage: string
    },
  ) {
    isApplyingFileDraft = true
    if (serverPublicationId.value) {
      markHistory(`导入文件 · ${options.fileName || 'JSON'}`)
    }
    replaceReactiveObject(publication, draft.publication)
    replaceReactiveObject(settings, draft.settings)
    selectedPersonId.value = getDefaultSelectedPersonId(draft.publication)
    draftFileHandle.value = options.handle ?? null
    draftFileName.value = options.fileName ?? ''
    hasUnsavedFileChanges.value = false
    errorMessage.value = ''
    statusMessage.value = options.statusMessage
    if (!serverPublicationId.value) initializeHistoryBaseline()
    canvasRef.value?.resetView?.()
    onImport?.()
    void nextTick(() => {
      isApplyingFileDraft = false
    })
  }

  async function openDraftFile() {
    if (!nativeFileAccessSupported) return

    try {
      const openedDraft = await openDraftFileWithPicker()
      if (!openedDraft) return
      if (!shouldReplaceCurrentDraft()) return

      const parsed = parseDraftJson(openedDraft.content)
      if (!parsed.ok) {
        errorMessage.value = formatValidationIssues(parsed.issues)
        statusMessage.value = ''
        return
      }

      applyFileDraft(parsed.value, {
        fileName: openedDraft.name,
        handle: openedDraft.handle,
        statusMessage: `Opened file: ${openedDraft.name}`,
      })
    } catch (error) {
      errorMessage.value = getErrorMessage(error, '打开文件失败。')
      statusMessage.value = ''
    }
  }

  async function saveDraftFile(forceSaveAs = false) {
    const content = createCurrentDraftJson()
    const suggestedName = getSuggestedDraftFileName()

    try {
      if (draftFileHandle.value && !forceSaveAs) {
        await writeDraftFile(draftFileHandle.value, content)
        draftFileName.value = draftFileHandle.value.name || suggestedName
        hasUnsavedFileChanges.value = false
        errorMessage.value = ''
        statusMessage.value = `Saved to file: ${draftFileName.value}`
        return
      }

      if (nativeFileAccessSupported) {
        const nextHandle = await saveDraftFileWithPicker(suggestedName, content)
        if (!nextHandle) return
        draftFileHandle.value = nextHandle
        draftFileName.value = nextHandle.name || suggestedName
        hasUnsavedFileChanges.value = false
        errorMessage.value = ''
        statusMessage.value = `Saved to file: ${draftFileName.value}`
        return
      }

      downloadTextFile(suggestedName, content, 'application/json;charset=utf-8')
      draftFileHandle.value = null
      draftFileName.value = suggestedName
      hasUnsavedFileChanges.value = false
      errorMessage.value = ''
      statusMessage.value = `Downloaded file: ${suggestedName}`
    } catch (error) {
      errorMessage.value = getErrorMessage(error, '保存文件失败。')
      statusMessage.value = ''
    }
  }

  function downloadSvg(theme?: ThemeMode) {
    return runCanvasExport('导出 SVG 失败。', async () => {
      statusMessage.value = '正在导出 SVG...'
      const serialized = await serializeCurrentSvg(theme)
      if (!serialized) {
        errorMessage.value = '当前画布没有可导出的SVG。'
        statusMessage.value = ''
        return
      }
      downloadTextFile(`${sanitizeFileName(publication.title)}.svg`, serialized, 'image/svg+xml;charset=utf-8')
      statusMessage.value = 'SVG 已下载。'
    })
  }

  function downloadPng(options?: ThemeMode | { theme?: ThemeMode; quality?: PngExportQuality }) {
    const targetTheme = typeof options === 'string' ? options : options?.theme
    const quality = (typeof options === 'object' && options?.quality) ? options.quality : 'hd'
    const activeTheme = getActiveTheme(targetTheme)

    return runCanvasExport('导出 PNG 失败。', async () => {
      statusMessage.value = '正在导出 PNG...'
      const exportLayout = getPngExportLayout()
      const svg = await createCurrentStandaloneSvg(exportLayout, activeTheme)
      if (!svg) {
        errorMessage.value = '当前画布没有可导出的内容。'
        statusMessage.value = ''
        return
      }
      const blob = await rasterizeSvgToPngBlob(svg, exportLayout, { quality })
      downloadBlobFile(`${sanitizeFileName(publication.title)}.png`, blob)
      statusMessage.value = 'PNG 已下载。'
    })
  }

  async function printPublication() {
    const svg = await createCurrentStandaloneSvg()
    if (!svg) {
      errorMessage.value = '当前画布没有可导出的SVG。'
      statusMessage.value = ''
      return
    }

    const title = publication.title.trim() || '归元档案预览'
    const pages = createPrintLayoutPages(layout.value, settings.paper)
    const pageSvgMarkups = pages.map(page => serializeStandaloneSvg(createPrintPageSvg(svg, page, title), false))
    const printWindow = window.open('', '_blank', 'width=1440,height=960')

    if (!printWindow) {
      errorMessage.value = '浏览器阻止了打印窗口。请允许弹出窗口后重试。'
      statusMessage.value = ''
      return
    }

    errorMessage.value = ''
    statusMessage.value = `已生成${pages.length}个打印页面。`
    printWindow.document.open()
    printWindow.document.write(
      createPrintDocument({
        title,
        paper: settings.paper,
        pages,
        pageSvgMarkups,
      }),
    )
    printWindow.document.close()
  }

  async function exportJson() {
    statusMessage.value = '正在导出JSON...'
    try {
      const portablePub = await createPortablePublication(publication)
      const draft = createDraftPackage(portablePub, settings)
      downloadTextFile(
        `${sanitizeFileName(publication.title)}.json`,
        serializeDraftPackage(draft),
        'application/json;charset=utf-8',
      )
      statusMessage.value = '已导出包含图片的JSON包。'
      errorMessage.value = ''
    } catch (err) {
      errorMessage.value = getErrorMessage(err, '导出失败')
      statusMessage.value = ''
    }
  }

  async function importDraftFromFileEvent(event: Event) {
    const input = event.target as HTMLInputElement
    const file = input.files?.[0]
    input.value = ''
    if (!file) return
    if (!shouldReplaceCurrentDraft()) return

    const parsed = parseDraftJson(await file.text())
    if (!parsed.ok) {
      errorMessage.value = formatValidationIssues(parsed.issues)
      statusMessage.value = ''
      return
    }

    const draft = parsed.value
    const pubId = serverPublicationId.value
    if (pubId) {
      const people = draft.publication.people
      const base64Count = people
        ? Object.values(people).filter((p: unknown) => (p as Person).avatarUrl?.startsWith('data:')).length
        : 0
      if (base64Count > 0) {
        statusMessage.value = `正在处理 ${base64Count} 张头像图片...`
        await processBase64AvatarsInDraft(draft, pubId, (done, total) => {
          statusMessage.value = `正在处理头像图片 (${done}/${total})...`
        })
      }
    }

    applyFileDraft(draft, {
      fileName: file.name,
      handle: null,
      statusMessage: `已导入文件：${file.name}`,
    })
  }

  function exportShareHtml(options?: string | { password?: string; theme?: ThemeMode }) {
    const password = typeof options === 'string' ? options : options?.password
    const targetTheme = typeof options === 'object' ? options?.theme : undefined
    const activeTheme = getActiveTheme(targetTheme)

    return runCanvasExport('生成分享页面失败。', async () => {
      statusMessage.value = '正在生成分享页面...'
      const standaloneSvg = await createCurrentStandaloneSvg(undefined, activeTheme)
      if (!standaloneSvg) {
        errorMessage.value = '当前画布没有可导出的内容。'
        statusMessage.value = ''
        return
      }

      const html = await generateShareHtml({
        publication,
        settings,
        standaloneSvg,
        password: password || undefined,
        theme: activeTheme,
        onProgress: (_stage, percent) => {
          statusMessage.value = `正在生成分享页面... ${percent}%`
        },
      })

      const fileName = `${sanitizeFileName(publication.title)}-分享.html`
      downloadTextFile(fileName, html, 'text/html;charset=utf-8')
      statusMessage.value = '分享页面已生成并下载。'
    })
  }

  return {
    draftFileHandle,
    draftFileName,
    hasUnsavedFileChanges,
    isExporting,
    nativeFileAccessSupported,
    getIsApplyingFileDraft,
    sanitizeFileName,
    shouldReplaceCurrentDraft,
    openDraftFile,
    saveDraftFile,
    downloadSvg,
    downloadPng,
    printPublication,
    exportJson,
    exportShareHtml,
    importDraftFromFileEvent,
  }
}
