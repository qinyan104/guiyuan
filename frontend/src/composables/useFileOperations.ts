import { nextTick, ref, shallowRef, type Ref } from 'vue'

import type { DraftPackage, PublicationData, PublicationLayout, PublicationSettings } from '../types/family'
import {
  createStandalonePublicationSvg,
  serializeSvg as serializeStandaloneSvg,
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

import type { PublicationStateReturn } from './usePublicationState'
interface FileOperationsDeps {
  pub: PublicationStateReturn
  statusMessage: Ref<string>
  errorMessage: Ref<string>
  getErrorMessage: (error: unknown, fallback: string) => string
  initializeHistoryBaseline: () => void
  canvasRef: Ref<{ getSvgElement?: () => SVGSVGElement | null; resetView?: () => void } | null>
  layout: PublicationStateReturn['layout']
  onImport?: () => void
}

export function useFileOperations(deps: FileOperationsDeps) {
  const {
    pub,
    statusMessage,
    errorMessage,
    getErrorMessage,
    initializeHistoryBaseline,
    canvasRef,
    layout,
  } = deps

  const {
    publication,
    settings,
    selectedPersonId,
    replaceReactiveObject,
    getDefaultSelectedPersonId,
  } = pub

  const onImport = deps.onImport

  const draftFileHandle = shallowRef<DraftFileHandle | null>(null)
  const draftFileName = ref('')
  const hasUnsavedFileChanges = ref(false)
  const nativeFileAccessSupported = isNativeDraftFileAccessSupported()
  let isApplyingFileDraft = false

  function getIsApplyingFileDraft(): boolean {
    return isApplyingFileDraft
  }

  function sanitizeFileName(raw: string): string {
    return raw.replace(/[\\/:*?"<>|]/g, '-').trim() || '族谱出版预览'
  }

  async function createCurrentStandaloneSvg(): Promise<SVGSVGElement | null> {
    const svgElement = canvasRef.value?.getSvgElement?.()
    if (!svgElement || layout.value.cards.length === 0 || layout.value.width <= 0 || layout.value.height <= 0) {
      return null
    }
    return await createStandalonePublicationSvg({
      svgElement,
      layout: layout.value,
      title: publication.title.trim() || '族谱出版预览',
    })
  }

  async function serializeCurrentSvg(): Promise<string | null> {
    const svg = await createCurrentStandaloneSvg()
    if (!svg) return null
    return serializeStandaloneSvg(svg)
  }

  function downloadTextFile(fileName: string, content: string, type: string) {
    const blob = new Blob([content], { type })
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

  function shouldReplaceCurrentDraft(): boolean {
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
    replaceReactiveObject(publication, draft.publication)
    replaceReactiveObject(settings, draft.settings)
    selectedPersonId.value = getDefaultSelectedPersonId(draft.publication)
    draftFileHandle.value = options.handle ?? null
    draftFileName.value = options.fileName ?? ''
    hasUnsavedFileChanges.value = false
    errorMessage.value = ''
    statusMessage.value = options.statusMessage
    initializeHistoryBaseline()
    canvasRef.value?.resetView?.()
    onImport?.()
    void nextTick(() => {
      isApplyingFileDraft = false
    })
  }

  async function openDraftFile() {
    if (!nativeFileAccessSupported) return
    if (!shouldReplaceCurrentDraft()) return

    try {
      const openedDraft = await openDraftFileWithPicker()
      if (!openedDraft) return

      const parsed = parseDraftJson(openedDraft.content)
      if (!parsed.ok) {
        errorMessage.value = formatValidationIssues(parsed.issues)
        statusMessage.value = ''
        return
      }

      applyFileDraft(parsed.value, {
        fileName: openedDraft.name,
        handle: openedDraft.handle,
        statusMessage: `已打开文件：${openedDraft.name}`,
      })
    } catch (error) {
      errorMessage.value = getErrorMessage(error, '打开文件失败，请重试。')
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
        statusMessage.value = `已保存到文件：${draftFileName.value}`
        return
      }

      if (nativeFileAccessSupported) {
        const nextHandle = await saveDraftFileWithPicker(suggestedName, content)
        if (!nextHandle) return
        draftFileHandle.value = nextHandle
        draftFileName.value = nextHandle.name || suggestedName
        hasUnsavedFileChanges.value = false
        errorMessage.value = ''
        statusMessage.value = `已保存到文件：${draftFileName.value}`
        return
      }

      downloadTextFile(suggestedName, content, 'application/json;charset=utf-8')
      draftFileHandle.value = null
      draftFileName.value = suggestedName
      hasUnsavedFileChanges.value = false
      errorMessage.value = ''
      statusMessage.value = `已下载文件：${suggestedName}`
    } catch (error) {
      errorMessage.value = getErrorMessage(error, '保存文件失败，请重试。')
      statusMessage.value = ''
    }
  }

  async function downloadSvg() {
    const serialized = await serializeCurrentSvg()
    if (!serialized) {
      errorMessage.value = '当前画布还没有可导出的 SVG。'
      statusMessage.value = ''
      return
    }
    errorMessage.value = ''
    downloadTextFile(`${sanitizeFileName(publication.title)}.svg`, serialized, 'image/svg+xml;charset=utf-8')
  }

  async function exportJson() {
    statusMessage.value = '正在导出 (处理图片中)...'
    try {
      const portablePub = await createPortablePublication(publication)
      const draft = createDraftPackage(portablePub, settings)
      downloadTextFile(
        `${sanitizeFileName(publication.title)}.json`,
        serializeDraftPackage(draft),
        'application/json;charset=utf-8',
      )
      statusMessage.value = '已导出 JSON 草稿 (包含图片)。'
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

    applyFileDraft(parsed.value, {
      fileName: file.name,
      handle: null,
      statusMessage: `已导入文件：${file.name}`,
    })
  }

  async function exportShareHtml(password?: string) {
    const svgElement = canvasRef.value?.getSvgElement?.()
    if (!svgElement || layout.value.cards.length === 0) {
      errorMessage.value = '当前画布还没有可导出的内容。'
      statusMessage.value = ''
      return
    }

    statusMessage.value = '正在生成分享网页...'
    errorMessage.value = ''

    try {
      const html = await generateShareHtml({
        publication,
        settings,
        layout: layout.value,
        svgElement,
        password: password || undefined,
        onProgress: (stage, percent) => {
          statusMessage.value = `正在生成分享网页... ${percent}%`
        },
      })

      const fileName = `${sanitizeFileName(publication.title)}-分享.html`
      downloadTextFile(fileName, html, 'text/html;charset=utf-8')
      statusMessage.value = '分享网页已生成并下载。'
      errorMessage.value = ''
    } catch (err) {
      errorMessage.value = getErrorMessage(err, '生成分享网页失败。')
      statusMessage.value = ''
    }
  }

  return {
    draftFileHandle,
    draftFileName,
    hasUnsavedFileChanges,
    nativeFileAccessSupported,
    getIsApplyingFileDraft,
    sanitizeFileName,
    shouldReplaceCurrentDraft,
    openDraftFile,
    saveDraftFile,
    downloadSvg,
    exportJson,
    exportShareHtml,
    importDraftFromFileEvent,
  }
}
