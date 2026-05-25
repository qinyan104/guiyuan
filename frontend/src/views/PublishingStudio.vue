<script setup lang="ts">
import { computed, onMounted, ref, nextTick } from "vue"
import { useRoute, useRouter } from "vue-router"
import FeedbackStrip from "../components/FeedbackStrip.vue"
import EntryEditor from "../components/publishing/EntryEditor.vue"
import PageCanvas from "../components/publishing/PageCanvas.vue"
import PageThumbnailBar from "../components/publishing/PageThumbnailBar.vue"
import StudioStatusBar from "../components/publishing/StudioStatusBar.vue"
import StudioToolbar from "../components/publishing/StudioToolbar.vue"
import TweaksPanel from "../components/publishing/TweaksPanel.vue"
import type { LayoutTweaks } from "../components/publishing/TweaksPanel.vue"
import { getPublication } from "../api/publication"
import { deleteSheet, exportPdfV2, listSheets, saveSheets, updateDraft } from "../api/publishing"
import { useFeedback } from "../composables/useFeedback"
import { usePublishingStudio } from "../composables/usePublishingStudio"
import { computeLineageText, paginate, type LayoutOptions } from "../lib/lineageText"
import { CANVAS_TEMPLATES } from "../lib/vrainTemplates"
import type { PublicationData } from "../types/family"
import type { LineagePage } from "../types/publishing"

const feedback = useFeedback()
const route = useRoute()
const router = useRouter()
const draftId = computed(() => Number(route.params.draftId))

const {
  draft,
  activeSheetIndex,
  syncStatus,
  loading,
  hasPendingSync,
  loadDraft,
} = usePublishingStudio(draftId)

const pubData = ref<PublicationData | null>(null)
const layoutPages = ref<LineagePage[]>([])
const sheetTypes = ref<string[]>([])
const savedSheetIds = ref<number[]>([])
const canvasId = ref("mr_5")
const paper = ref<"A4" | "A3">("A4")
const editorOpen = ref(true)
const tweaksOpen = ref(false)
const exporting = ref(false)
const autoLayouting = ref(false)
const relayouting = ref(false)
const canvasNotice = ref("")
const canvasRef = ref<InstanceType<typeof PageCanvas> | null>(null)
const pubLoadError = ref("")
/** Canvas 点击条目 → EntryEditor 高亮对应的 personId */
const highlightedPersonId = ref<string | null>(null)

let canvasNoticeTimer: ReturnType<typeof setTimeout> | null = null

const layoutTweaks = ref<LayoutTweaks>({
  fontSize: 48,
  lineHeight: 1.4,
  columns: 1,
  marginPreset: "standard",
})
const fontFamily = ref("qiji-combo")

const draftStyleConfig = ref<Record<string, unknown>>({})

onMounted(async () => {
  await loadDraft()
  if (!draft.value) return

  try {
    let parsed = JSON.parse((draft.value as any).styleConfig || "{}")
    if (typeof parsed === "string") {
      parsed = JSON.parse(parsed)
    }
    draftStyleConfig.value = parsed
    if (parsed.paper === "A3") paper.value = "A3"
    if (parsed.fontSize) layoutTweaks.value.fontSize = parsed.fontSize
    if (parsed.canvasId) canvasId.value = parsed.canvasId
  } catch {}

  try {
    const result = await getPublication(draft.value.publicationId)
    pubData.value = result.publication
    pubLoadError.value = ""
  } catch (e: any) {
    pubLoadError.value = "无法加载族谱数据，请检查网络后重试"
    console.error("Failed to load publication:", e)
  }

  try {
    const saved = await listSheets(draftId.value)
    if (saved.length > 0) {
      layoutPages.value = saved
        .map((sheet) => {
          try {
            let data = JSON.parse(sheet.layoutData)
            if (typeof data === "string") {
              data = JSON.parse(data)
            }
            return data as LineagePage
          } catch {
            return null
          }
        })
        .filter(Boolean) as LineagePage[]
      savedSheetIds.value = saved.map((sheet) => sheet.id)
      sheetTypes.value = saved.map((sheet) => sheet.sheetType)
      await nextTick()
      canvasRef.value?.reloadPreview()
      return
    }
  } catch {}

  const count = draft.value.sheetCount || 1
  sheetTypes.value = Array.from({ length: count }, () => "genealogy")
  if (pubData.value) {
    await runLayout(false)
    canvasRef.value?.reloadPreview()
  }
})

function handleBack() {
  if (draft.value?.publicationId) {
    router.push(`/publishing/publication/${draft.value.publicationId}`)
  } else {
    router.push("/publishing")
  }
}

async function retryLoadPublication() {
  if (!draft.value) return
  pubLoadError.value = ""
  try {
    const result = await getPublication(draft.value.publicationId)
    pubData.value = result.publication
    if (layoutPages.value.length === 0) {
      await runLayout(false)
      canvasRef.value?.reloadPreview()
    }
  } catch (e: any) {
    pubLoadError.value = "无法加载族谱数据: " + (e.message || "未知错误")
  }
}

function handleCanvasChange(id: string) {
  canvasId.value = id
  void updateDraft(draftId.value, {
    publicationId: draft.value!.publicationId,
    title: draft.value!.title,
    styleConfig: JSON.stringify({
      ...draftStyleConfig.value,
      paper: paper.value,
      canvasId: id,
      fontSize: layoutTweaks.value.fontSize,
    }),
  })
  showCanvasNotice(`已切换到 ${currentTemplateName.value}`)
}

function handlePaperChange(nextPaper: "A4" | "A3") {
  paper.value = nextPaper
  void updateDraft(draftId.value, {
    publicationId: draft.value!.publicationId,
    title: draft.value!.title,
    styleConfig: JSON.stringify({
      ...draftStyleConfig.value,
      paper: nextPaper,
      canvasId: canvasId.value,
      fontSize: layoutTweaks.value.fontSize,
    }),
  })
  showCanvasNotice(`纸张已切换为 ${nextPaper}`)
}

function toggleEditor() {
  editorOpen.value = !editorOpen.value
}

function toggleTweaks() {
  tweaksOpen.value = !tweaksOpen.value
}

function showCanvasNotice(message: string, duration = 2400) {
  canvasNotice.value = message
  if (canvasNoticeTimer) clearTimeout(canvasNoticeTimer)
  canvasNoticeTimer = setTimeout(() => {
    canvasNotice.value = ""
    canvasNoticeTimer = null
  }, duration)
}

async function handleExport() {
  const composedPages = canvasRef.value?.composedPages
  if (!composedPages || composedPages.length === 0) {
    feedback.errorMessage.value = "请先执行「自动排版」生成书页"
    return
  }

  exporting.value = true
  try {
    feedback.statusMessage.value = "正在生成古籍 PDF..."
    showCanvasNotice("正在生成 PDF...", 1800)

    const pagesJson = JSON.stringify(composedPages)
    const blob = await exportPdfV2(draftId.value, pagesJson)

    // Trigger browser download
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `${draft.value?.title || "族谱"}.pdf`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)

    feedback.statusMessage.value = "PDF 导出成功"
    showCanvasNotice("PDF 已下载")
  } catch (e: any) {
    feedback.errorMessage.value = "导出失败: " + (e.message || e)
  } finally {
    exporting.value = false
  }
}

async function handleAutoLayout() {
  if (!pubData.value) {
    feedback.errorMessage.value = "请先加载族谱数据"
    return
  }
  autoLayouting.value = true
  await runLayout()
  canvasRef.value?.reloadPreview()
}

async function runLayout(skipNotice = true) {
  if (!pubData.value) return
  try {
    const opts: LayoutOptions = {
      fontSize: layoutTweaks.value.fontSize,
      lineHeight: layoutTweaks.value.lineHeight,
      columns: layoutTweaks.value.columns,
      marginPreset: layoutTweaks.value.marginPreset,
      paper: paper.value,
    }
    const pages = computeLineageText(pubData.value, opts)
    layoutPages.value = pages
    sheetTypes.value = pages.map(() => "genealogy")
    activeSheetIndex.value = 0
    const sheetsToSave = pages.map((page, index) => ({
      sheetNumber: index + 1,
      sheetType: "genealogy",
      layoutData: JSON.stringify(page),
    }))
    const saved = await saveSheets(draftId.value, sheetsToSave)
    savedSheetIds.value = saved.map((sheet) => sheet.id)
    await updateDraft(draftId.value, {
      publicationId: draft.value!.publicationId,
      title: draft.value!.title,
      styleConfig: JSON.stringify({
        ...draftStyleConfig.value,
        paper: paper.value,
        canvasId: canvasId.value,
        fontSize: layoutTweaks.value.fontSize,
      }),
    })
    feedback.statusMessage.value = `排版完成，共 ${pages.length} 页`
    showCanvasNotice(`已生成 ${pages.length} 页版面`)
  } catch (e: any) {
    feedback.errorMessage.value = "自动排版失败: " + (e.message || e)
  } finally {
    autoLayouting.value = false
  }
}

/** 防抖重排版（不保存后端），微调参数变化后 400ms 自动重分页 */
let tweakDebounceTimer: ReturnType<typeof setTimeout> | null = null

function handleTweakUpdate(key: string, value: number | string) {
  layoutTweaks.value = { ...layoutTweaks.value, [key]: value }
  showCanvasNotice(getTweakLabel(key) + '已更新')

  // 持久化微调参数到草稿
  void updateDraft(draftId.value, {
    publicationId: draft.value!.publicationId,
    title: draft.value!.title,
    styleConfig: JSON.stringify({
      ...draftStyleConfig.value,
      paper: paper.value,
      canvasId: canvasId.value,
      fontSize: layoutTweaks.value.fontSize,
    }),
  })

  // 防抖：400ms 无操作后重新分页（保留用户编辑内容）
  if (tweakDebounceTimer) clearTimeout(tweakDebounceTimer)
  tweakDebounceTimer = setTimeout(() => {
    if (!pubData.value) return
    const allEntries = layoutPages.value.flatMap(p => p.entries)
    const rootIds = layoutPages.value[0]?.rootPersonIds ?? []
    const opts: LayoutOptions = {
      fontSize: layoutTweaks.value.fontSize,
      lineHeight: layoutTweaks.value.lineHeight,
      columns: layoutTweaks.value.columns,
      marginPreset: layoutTweaks.value.marginPreset,
      paper: paper.value,
    }
    const repaginated = paginate(allEntries, rootIds, opts)
    layoutPages.value = repaginated
    sheetTypes.value = repaginated.map(() => "genealogy")
    if (activeSheetIndex.value >= repaginated.length) {
      activeSheetIndex.value = Math.max(0, repaginated.length - 1)
    }
    showCanvasNotice('版面已更新')
  }, 400)
}

function getTweakLabel(key: string): string {
  const map: Record<string, string> = {
    fontSize: '字号',
    lineHeight: '行距',
    columns: '栏数',
    marginPreset: '边距',
  }
  return map[key] || key
}

async function handleTweaksChange(nextTweaks: LayoutTweaks) {
  layoutTweaks.value = nextTweaks
  await runLayout()
  canvasRef.value?.reloadPreview()
}

async function handleAddSheet() {
  const newPage: LineagePage = {
    pageNumber: layoutPages.value.length + 1,
    entries: [],
    rootPersonIds: [],
  }
  layoutPages.value.push(newPage)
  sheetTypes.value.push("genealogy")
  activeSheetIndex.value = layoutPages.value.length - 1
  await syncSheets()
  showCanvasNotice("已新增一页空白版面")
}

async function handleDeleteSheet(index: number) {
  if (layoutPages.value.length <= 1) return
  const backendId = savedSheetIds.value[index]
  layoutPages.value.splice(index, 1)
  sheetTypes.value.splice(index, 1)
  if (activeSheetIndex.value >= layoutPages.value.length) {
    activeSheetIndex.value = layoutPages.value.length - 1
  }
  try {
    if (backendId) await deleteSheet(draftId.value, backendId)
    await syncSheets()
    showCanvasNotice("页面已删除")
  } catch {}
}

async function handleReorderSheets(fromIndex: number, toIndex: number) {
  const [moved] = layoutPages.value.splice(fromIndex, 1)
  layoutPages.value.splice(toIndex, 0, moved)
  const [movedType] = sheetTypes.value.splice(fromIndex, 1)
  sheetTypes.value.splice(toIndex, 0, movedType)
  layoutPages.value.forEach((page, index) => {
    page.pageNumber = index + 1
  })
  if (activeSheetIndex.value === fromIndex) activeSheetIndex.value = toIndex
  else if (fromIndex < activeSheetIndex.value && toIndex >= activeSheetIndex.value) activeSheetIndex.value--
  else if (fromIndex > activeSheetIndex.value && toIndex <= activeSheetIndex.value) activeSheetIndex.value++
  await syncSheets()
  showCanvasNotice("页面顺序已更新")
}

async function syncSheets() {
  try {
    const sheetsToSave = layoutPages.value.map((page, index) => ({
      sheetNumber: index + 1,
      sheetType: sheetTypes.value[index] || "genealogy",
      layoutData: JSON.stringify(page),
    }))
    const saved = await saveSheets(draftId.value, sheetsToSave)
    savedSheetIds.value = saved.map((sheet) => sheet.id)
  } catch {}
}

function handleSelectSheet(index: number) {
  activeSheetIndex.value = index
}

function handleNavigateToPage(index: number) {
  activeSheetIndex.value = index
}

function handleUpdateEntry(index: number, text: string) {
  if (!currentPageData.value) return
  currentPageData.value.entries[index].formattedText = text
  canvasRef.value?.reloadPreview()
}

function handleMoveEntry(from: number, to: number) {
  if (!currentPageData.value) return
  const entries = currentPageData.value.entries
  const [moved] = entries.splice(from, 1)
  entries.splice(to, 0, moved)
  canvasRef.value?.reloadPreview()
}

function handleDeleteEntry(index: number) {
  if (!currentPageData.value) return
  currentPageData.value.entries.splice(index, 1)
  canvasRef.value?.reloadPreview()
}

function handleMoveToPage(entryIndex: number, targetPageIndex: number) {
  if (!currentPageData.value || targetPageIndex >= layoutPages.value.length) return
  const entry = currentPageData.value.entries.splice(entryIndex, 1)[0]
  layoutPages.value[targetPageIndex].entries.push(entry)
  canvasRef.value?.reloadPreview()
}

function handleFontChange(fontId: string) {
  fontFamily.value = fontId
  showCanvasNotice(`字体已切换`)
  canvasRef.value?.reloadPreview()
}

function handleCanvasFocusEntry(personId: string) {
  highlightedPersonId.value = personId
  // 如果当前页面没有该条目，自动跳转到对应页面
  if (currentPageData.value && !currentPageData.value.entries.some(e => e.personId === personId)) {
    const targetPageIndex = layoutPages.value.findIndex(p => p.entries.some(e => e.personId === personId))
    if (targetPageIndex !== -1) {
      activeSheetIndex.value = targetPageIndex
    }
  }
}

/** Canvas 内联编辑 → 回写到 layoutPages */
function handleCanvasEditEntry(personId: string, newText: string) {
  for (const page of layoutPages.value) {
    const idx = page.entries.findIndex(e => e.personId === personId)
    if (idx !== -1) {
      page.entries[idx].formattedText = newText
      canvasRef.value?.reloadPreview()
      showCanvasNotice('已保存编辑')
      return
    }
  }
}

async function handleSaveAndRelayout() {
  relayouting.value = true
  try {
    await syncSheets()
    feedback.statusMessage.value = "已保存，正在刷新预览"
    showCanvasNotice("版面已保存，正在刷新预览...", 2000)
    canvasRef.value?.reloadPreview()
  } finally {
    relayouting.value = false
  }
}

const totalPages = computed(() => layoutPages.value.length || 1)
const currentPage = computed(() => activeSheetIndex.value + 1)
const currentPageData = computed(() => layoutPages.value[activeSheetIndex.value] || null)
/** 展平所有页面的条目，传给 PageCanvas 用于排版渲染 */
const allEntries = computed(() => layoutPages.value.flatMap(p => p.entries))
const currentEntryCount = computed(() => currentPageData.value?.entries?.length ?? 0)
const currentTemplateName = computed(() => {
  const match = CANVAS_TEMPLATES.find((item) => item.id === canvasId.value)
  return match?.name ?? "默认模板"
})
const syncStatusText = computed(() => {
  if (syncStatus.value?.hasPendingSync) return "内容已变更"
  return "已同步"
})
const statusText = computed(() => {
  if (relayouting.value) return "正在刷新预览"
  if (autoLayouting.value) return "正在重新生成版面"
  if (exporting.value) return "正在导出 PDF"
  if (hasPendingSync.value) return syncStatusText.value
  if (syncStatus.value) return syncStatusText.value
  return "已同步"
})
</script>

<template>
  <FeedbackStrip
    :errorMessage="feedback.errorMessage.value"
    :statusMessage="feedback.statusMessage.value"
    @dismiss="feedback.dismiss"
  />

  <div v-if="loading" class="studio-loading">
    <p>正在加载出版工作室...</p>
  </div>

  <div v-else-if="!draft" class="studio-loading">
    <p>草稿未找到</p>
    <button class="btn-back-link" @click="handleBack">返回列表</button>
  </div>

  <div v-else class="publishing-studio">
    <div v-if="pubLoadError" class="studio-error-banner">
      <span class="studio-error-icon">⚠️</span>
      <span>{{ pubLoadError }}</span>
      <button class="btn-retry" @click="retryLoadPublication">重试加载</button>
    </div>

    <StudioToolbar
      :draftTitle="draft?.title || ''"
      :draftStatus="draft?.status || 'draft'"
      :canvasId="canvasId"
      :paper="paper"
      :tweaksOpen="tweaksOpen"
      :editorOpen="editorOpen"
      :currentPage="currentPage"
      :totalPages="totalPages"
      :templateName="currentTemplateName"
      :exporting="exporting"
      :autoLayouting="autoLayouting"
      :tweakFontSize="layoutTweaks.fontSize"
      :tweakLineHeight="layoutTweaks.lineHeight"
      :tweakColumns="layoutTweaks.columns"
      :tweakMarginPreset="layoutTweaks.marginPreset"
      :selectedFont="fontFamily"
      @back="handleBack"
      @autoLayout="handleAutoLayout"
      @export="handleExport"
      @canvasChange="handleCanvasChange"
      @paperChange="handlePaperChange"
      @toggleTweaks="toggleTweaks"
      @toggleEditor="toggleEditor"
      @updateTweakFontSize="(v) => handleTweakUpdate('fontSize', v)"
      @updateTweakLineHeight="(v) => handleTweakUpdate('lineHeight', v)"
      @updateTweakColumns="(v) => handleTweakUpdate('columns', v)"
      @updateTweakMarginPreset="(v) => handleTweakUpdate('marginPreset', v)"
      @updateFont="handleFontChange"
    />

    <div class="studio-workbench">
      <PageThumbnailBar
        :sheetCount="totalPages"
        :activeSheetIndex="activeSheetIndex"
        :sheetTypes="sheetTypes"
        :pages="layoutPages"
        :currentPage="currentPage"
        :templateName="currentTemplateName"
        :canvasId="canvasId"
        @selectSheet="handleSelectSheet"
        @addSheet="handleAddSheet"
        @deleteSheet="handleDeleteSheet"
        @reorderSheets="handleReorderSheets"
      />

      <div class="studio-main">
        <div class="canvas-stage">
          <PageCanvas
            ref="canvasRef"
            :sheetNumber="currentPage"
            :pageData="currentPageData"
            :entries="allEntries"
            :publicationData="pubData"
            :draftId="draftId"
            :canvasId="canvasId"
            :totalPages="totalPages"
            :paper="paper"
            :templateName="currentTemplateName"
            :fontSize="layoutTweaks.fontSize"
            :lineHeight="layoutTweaks.lineHeight"
            :columns="layoutTweaks.columns"
            :fontFamily="fontFamily"
            :relayouting="relayouting"
            @navigateToPage="handleNavigateToPage"
            @editEntry="handleCanvasEditEntry"
            @focusEntry="handleCanvasFocusEntry"
          />

          <Transition name="notice-fade">
            <div v-if="canvasNotice" class="canvas-notice">{{ canvasNotice }}</div>
          </Transition>
        </div>
      </div>

      <div class="studio-side">
        <EntryEditor
          :open="editorOpen"
          :pageData="currentPageData"
          :pageNumber="currentPage"
          :totalPages="totalPages"
          :templateName="currentTemplateName"
          :relayouting="relayouting"
          :highlightedPersonId="highlightedPersonId"
          @close="editorOpen = false"
          @updateEntry="handleUpdateEntry"
          @moveEntry="handleMoveEntry"
          @deleteEntry="handleDeleteEntry"
          @moveToPage="handleMoveToPage"
          @saveAndRelayout="handleSaveAndRelayout"
        />
      </div>
    </div>

    <StudioStatusBar
      :currentPage="currentPage"
      :totalPages="totalPages"
      :paper="paper"
      :templateName="currentTemplateName"
    />
  </div>
</template>

<style scoped>
.publishing-studio {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background:
    radial-gradient(circle at 50% 0%, var(--color-neutral-2), transparent 60%),
    var(--color-neutral-1);
}

.studio-workbench {
  display: grid;
  grid-template-columns: 240px minmax(0, 1fr) 0;
  gap: 0;
  flex: 1;
  min-height: 0;
  transition: grid-template-columns 0.2s ease;
}

.studio-workbench:has(.entry-editor) {
  grid-template-columns: 240px minmax(0, 1fr) minmax(316px, 360px);
}

.studio-main {
  display: flex;
  flex-direction: column;
  min-width: 0;
  min-height: 0;
  overflow: hidden;
  background: #e8e0d4;
}

.studio-side {
  position: relative;
  min-width: 0;
  min-height: 0;
  overflow: hidden;
  background: var(--color-neutral-1);
  border-left: 1px solid var(--color-card-stroke);
}

.canvas-stage {
  position: relative;
  flex: 1;
  min-height: 0;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #e8e0d4;
}

.tweaks-dock {
  position: absolute;
  top: 14px;
  right: 14px;
  z-index: 5;
  pointer-events: none;
}

.tweaks-dock :deep(*) {
  pointer-events: auto;
}

.studio-loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100vh;
  color: var(--color-neutral-6);
  font-size: 16px;
}

.btn-back-link {
  margin-top: 12px;
  background: transparent;
  border: none;
  color: var(--color-accent);
  font-size: 14px;
  cursor: pointer;
}

.btn-back-link:hover {
  text-decoration: underline;
}

.canvas-notice {
  position: absolute;
  top: 18px;
  right: 20px;
  padding: 10px 14px;
  border: 1px solid var(--color-card-stroke);
  border-radius: var(--radius-lg);
  background: var(--color-panel-bg);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  box-shadow: var(--shadow-whisper);
  color: var(--color-neutral-8);
  font-size: 12px;
  font-weight: 500;
  z-index: 4;
  pointer-events: none;
}

.tweaks-drop-enter-active,
.tweaks-drop-leave-active {
  transition: opacity 0.15s ease, transform 0.15s ease;
}

.tweaks-drop-enter-from,
.tweaks-drop-leave-to {
  opacity: 0;
  transform: translateY(-6px);
}

.notice-fade-enter-active,
.notice-fade-leave-active {
  transition: opacity 0.16s ease, transform 0.16s ease;
}

.notice-fade-enter-from,
.notice-fade-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}

@media (max-width: 1280px) {
  .studio-workbench {
    grid-template-columns: 208px minmax(0, 1fr) 0;
  }

  .studio-workbench:has(.entry-editor) {
    grid-template-columns: 208px minmax(0, 1fr) minmax(280px, 320px);
  }
}

.studio-error-banner {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 20px;
  background: var(--color-accent-muted);
  border-bottom: 1px solid rgba(196, 58, 49, 0.18);
  font-size: 13px;
  color: var(--color-accent);
  flex-shrink: 0;
}

.studio-error-icon {
  font-size: 16px;
}

.btn-retry {
  margin-left: auto;
  padding: 4px 12px;
  border: 1px solid var(--color-accent);
  border-radius: 6px;
  background: var(--color-accent);
  color: #fff;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  transition: opacity 0.14s ease;
}

.btn-retry:hover {
  opacity: 0.85;
}
</style>
