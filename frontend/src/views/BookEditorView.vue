<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue"
import { onBeforeRouteLeave, useRoute, useRouter } from "vue-router"
import BookSpread from "../components/book-editor/BookSpread.vue"
import BookToolbar from "../components/book-editor/BookToolbar.vue"
import PageThumbnailRail from "../components/book-editor/PageThumbnailRail.vue"
import BookLayoutPanel from "../components/book-editor/BookLayoutPanel.vue"
import { getPublication } from "../api/publication"
import { generateBookDocument } from "../features/book-editor/bookGenerator"
import { getBookDocument, saveBookDocument } from "../features/book-editor/bookDocumentApi"
import { loadBookFontSupport, type BookFontSupport } from "../features/book-editor/bookFonts"
import { paginateBook } from "../features/book-editor/bookPaginator"
import { exportBookPdf } from "../features/book-editor/bookPdfExport"
import { DEFAULT_BOOK_LAYOUT, type BookBlock, type BookDocument, type BookLayout } from "../types/bookDocument"
import type { PublicationData } from "../types/family"

const route = useRoute()
const router = useRouter()
const publicationId = computed(() => Number(route.params.publicationId))

const loading = ref(true)
const saving = ref(false)
const exporting = ref(false)
const message = ref("")
const error = ref("")
const fontError = ref("")
const publication = ref<PublicationData | null>(null)
const document = ref<BookDocument | null>(null)
const currentPageIndex = ref(0)
const selectedBlockIndex = ref<number | null>(null)
const viewMode = ref<"single" | "spread">("spread")
const zoom = ref(1)
const fontSupport = ref<BookFontSupport | null>(null)
const savedSnapshot = ref<string | null>(null)
const layoutOpen = ref(false)
let fontRequest = 0

function draftSnapshot(value: BookDocument | null): string | null {
  return value ? JSON.stringify({ title: value.title, layout: value.layout, blocks: value.blocks }) : null
}

const layout = computed(() => document.value?.layout ?? DEFAULT_BOOK_LAYOUT)
const currentSnapshot = computed(() => draftSnapshot(document.value))
const hasUnsavedChanges = computed(() => currentSnapshot.value !== null && currentSnapshot.value !== savedSnapshot.value)
const paginationState = computed(() => {
  if (!document.value || !fontSupport.value) return { pagination: null, error: "" }
  try {
    return { pagination: paginateBook(document.value, fontSupport.value), error: "" }
  } catch (e) {
    return { pagination: null, error: e instanceof Error ? e.message : "排版失败" }
  }
})
const pagination = computed(() => paginationState.value.pagination)
const layoutError = computed(() => paginationState.value.error)
const pages = computed(() => pagination.value?.pages ?? [])
const selectedBlock = computed(() => selectedBlockIndex.value === null ? null : document.value?.blocks[selectedBlockIndex.value] ?? null)
const canInsertPageBreak = computed(() => {
  const blocks = document.value?.blocks
  const index = selectedBlockIndex.value
  return Boolean(blocks && index !== null && selectedBlock.value?.type !== "pageBreak" && index < blocks.length - 1 && blocks[index + 1]?.type !== "pageBreak")
})
const canDeletePageBreak = computed(() => selectedBlock.value?.type === "pageBreak")

watch(() => document.value?.layout.fontFamily, async (fontFamily) => {
  const request = ++fontRequest
  fontSupport.value = null
  fontError.value = ""
  if (!fontFamily) return
  try {
    const support = await loadBookFontSupport(fontFamily)
    if (request === fontRequest) fontSupport.value = support
  } catch (e) {
    if (request === fontRequest) fontError.value = e instanceof Error ? e.message : "加载排版字体失败"
  }
})

watch(pages, (next) => {
  if (selectedBlockIndex.value !== null) {
    const nextIndex = next.findIndex((page) => page.blocks.some((item) => item.blockIndex === selectedBlockIndex.value))
    if (nextIndex >= 0) {
      currentPageIndex.value = nextIndex
      return
    }
  }
  if (currentPageIndex.value >= next.length) currentPageIndex.value = Math.max(0, next.length - 1)
})

onMounted(async () => {
  window.addEventListener("beforeunload", protectBrowserLeave)
  loading.value = true
  error.value = ""
  try {
    const [pubResult, saved] = await Promise.all([
      getPublication(publicationId.value),
      getBookDocument(publicationId.value),
    ])
    publication.value = pubResult.publication
    document.value = saved
    savedSnapshot.value = draftSnapshot(saved)
  } catch (e) {
    error.value = e instanceof Error ? e.message : "加载书稿失败"
  } finally {
    loading.value = false
  }
})

onBeforeUnmount(() => window.removeEventListener("beforeunload", protectBrowserLeave))
onBeforeRouteLeave(() => !hasUnsavedChanges.value || confirm("书稿有未保存修改，确定离开吗？"))

function protectBrowserLeave(event: BeforeUnloadEvent) {
  if (!hasUnsavedChanges.value) return
  event.preventDefault()
  event.returnValue = ""
}

function back() {
  router.push(`/publication/${publicationId.value}`)
}

function blockAnchor(block: BookBlock | undefined): string | null {
  if (!block || block.type === "pageBreak") return null
  if (block.type === "person") return `person:${block.personId}`
  if (block.type === "generationHeading") return `generation:${block.generation}`
  return block.type
}

function generate() {
  if (!publication.value) return
  if (document.value && !confirm("重新生成会覆盖当前书稿，确定继续吗？")) return
  error.value = ""
  try {
    const previous = document.value
    const generated = generateBookDocument(publicationId.value, publication.value)
    if (previous) {
      generated.layout = previous.layout
      const pageBreaks = previous.blocks.flatMap((block, index, blocks) => {
        const anchor = block.type === "pageBreak" ? blockAnchor(blocks[index - 1]) : null
        return anchor ? [{ anchor, block }] : []
      })
      for (const pageBreak of pageBreaks) {
        const anchorIndex = generated.blocks.findIndex((block) => blockAnchor(block) === pageBreak.anchor)
        if (anchorIndex >= 0 && generated.blocks[anchorIndex + 1]?.type !== "pageBreak") {
          generated.blocks.splice(anchorIndex + 1, 0, pageBreak.block)
        }
      }
    }
    document.value = generated
    savedSnapshot.value = draftSnapshot(generated)
    currentPageIndex.value = 0
    selectedBlockIndex.value = null
    message.value = "已生成书稿，请及时保存"
  } catch (e) {
    error.value = e instanceof Error ? e.message : "生成书稿失败"
  }
}

async function save() {
  if (!document.value) return
  const savingDocument = document.value
  const savingSnapshot = draftSnapshot(savingDocument)
  saving.value = true
  message.value = ""
  error.value = ""
  try {
    const saved = await saveBookDocument(savingDocument)
    savedSnapshot.value = draftSnapshot(saved)
    if (currentSnapshot.value === savingSnapshot) document.value = saved
    message.value = hasUnsavedChanges.value ? "已保存较早版本，当前仍有未保存修改" : "书稿已保存"
  } catch (e) {
    error.value = e instanceof Error ? e.message : "保存失败"
  } finally {
    saving.value = false
  }
}

function updateLayout(next: BookLayout) {
  if (!document.value) return
  document.value = { ...document.value, layout: next }
}

function updateBlock(blockIndex: number, field: "text" | "note" | "title" | "subtitle", text: string) {
  if (!document.value) return
  selectedBlockIndex.value = blockIndex
  const blocks = [...document.value.blocks]
  const block = blocks[blockIndex]
  if (field === "note" && block?.type === "person") blocks[blockIndex] = { ...block, note: text }
  else if (field === "text" && (block?.type === "person" || block?.type === "preface")) blocks[blockIndex] = { ...block, text }
  else if ((field === "title" || field === "subtitle") && block?.type === "cover") blocks[blockIndex] = { ...block, [field]: text }
  else return
  document.value = { ...document.value, title: field === "title" ? text : document.value.title, blocks }
}

function updatePerson(blockIndex: number, text: string) {
  updateBlock(blockIndex, "text", text)
}

function updateViewMode(next: "single" | "spread") {
  viewMode.value = next
}

function goToPage(pageNumber: number) {
  const index = pages.value.findIndex((page) => page.pageNumber === pageNumber)
  if (index >= 0) currentPageIndex.value = index
  selectedBlockIndex.value = null
}

function updateZoom(delta: number) {
  zoom.value = Math.max(0.6, Math.min(1.8, Number((zoom.value + delta).toFixed(3))))
}

function insertPageBreak() {
  if (!document.value || !canInsertPageBreak.value || selectedBlockIndex.value === null) return
  const blocks = [...document.value.blocks]
  const index = selectedBlockIndex.value
  blocks.splice(index + 1, 0, { type: "pageBreak", id: `break-${Date.now()}` })
  document.value = { ...document.value, blocks }
  selectedBlockIndex.value = index + 1
  message.value = "已插入分页"
}

function deletePageBreak() {
  if (!document.value || !canDeletePageBreak.value || selectedBlockIndex.value === null) return
  const blocks = [...document.value.blocks]
  const index = selectedBlockIndex.value
  blocks.splice(index, 1)
  document.value = { ...document.value, blocks }
  selectedBlockIndex.value = Math.max(0, index - 1)
  message.value = "已删除分页"
}

async function exportPdf() {
  if (!document.value || !pagination.value) return
  exporting.value = true
  error.value = ""
  try {
    await exportBookPdf(document.value, pagination.value)
    message.value = "PDF 已导出"
  } catch (e) {
    error.value = e instanceof Error ? e.message : "导出失败"
  } finally {
    exporting.value = false
  }
}
</script>

<template>
  <div class="book-editor">
    <BookToolbar
      :title="document?.title || publication?.title || '古籍族谱'"
      :layout="layout"
      :saving="saving"
      :exporting="exporting"
      :hasDocument="Boolean(document)"
      :viewMode="viewMode"
      :zoom="zoom"
      :canInsertPageBreak="canInsertPageBreak"
      :canDeletePageBreak="canDeletePageBreak"
      :hasUnsavedChanges="hasUnsavedChanges"
      :layoutOpen="layoutOpen"
      @back="back"
      @generate="generate"
      @save="save"
      @exportPdf="exportPdf"
      @insertPageBreak="insertPageBreak"
      @deletePageBreak="deletePageBreak"
      @updateLayout="updateLayout"
      @updateViewMode="updateViewMode"
      @zoomIn="updateZoom(0.1)"
      @zoomOut="updateZoom(-0.1)"
      @resetZoom="zoom = 1"
      @toggleLayout="layoutOpen = !layoutOpen"
    />

    <div v-if="loading" class="state">正在加载书稿...</div>
    <div v-else-if="error && !publication" class="state error">{{ error }}</div>
    <div v-else-if="!document" class="start">
      <div class="start-card">
        <div class="start-seal">譜</div>
        <h1>{{ publication?.title || "古籍族谱" }}</h1>
        <p>基于当前谱系世系与族人资料，一键自动编排线装仿古书卷，支持苏欧版芯、双页对开阅览与高精矢量 PDF 出版印刷。</p>
        <button type="button" class="btn-generate" @click="generate">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>
            <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
          </svg>
          一键生成古籍书稿
        </button>
      </div>
    </div>
    <div v-else-if="!pagination" class="state" :class="{ error: fontError || layoutError }">{{ fontError || layoutError || "正在加载排版字体..." }}</div>
    <div v-else class="workbench">
      <PageThumbnailRail :pages="pages" :currentPage="currentPageIndex" @select="currentPageIndex = $event" />
      <BookSpread
        :pagination="pagination"
        :title="document.title"
        :currentPageIndex="currentPageIndex"
        :layout="document.layout"
        :viewMode="viewMode"
        :zoom="zoom"
        :selectedBlockIndex="selectedBlockIndex"
        @updateBlock="updateBlock"
        @updatePerson="updatePerson"
        @selectBlock="selectedBlockIndex = $event"
        @goToPage="goToPage"
        @zoom="updateZoom"
      />
      <BookLayoutPanel
        v-if="layoutOpen && document"
        :layout="layout"
        :canInsertPageBreak="canInsertPageBreak"
        :canDeletePageBreak="canDeletePageBreak"
        @updateLayout="updateLayout"
        @insertPageBreak="insertPageBreak"
        @deletePageBreak="deletePageBreak"
        @close="layoutOpen = false"
      />
    </div>

    <div v-if="message || error || fontError || layoutError" class="toast" :class="{ danger: error || fontError || layoutError }">
      {{ error || fontError || layoutError || message }}
    </div>
  </div>
</template>

<style scoped>
.book-editor {
  height: 100dvh;
  display: flex;
  flex-direction: column;
  background: var(--canvas-bg, #f2ece1);
  color: var(--color-neutral-9);
}

.workbench {
  min-height: 0;
  flex: 1;
  display: flex;
  position: relative;
  overflow: hidden;
}

.state,
.start {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;
  padding: 32px;
  color: var(--color-neutral-7);
}

.state {
  font-size: 14px;
  font-weight: 600;
}

.start-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  padding: 40px 48px;
  background: var(--bg-paper-raised, #fcfbfa);
  border: 1px solid var(--line-soft, rgba(122, 95, 65, 0.16));
  border-radius: 14px;
  box-shadow: 0 12px 32px rgba(24, 18, 12, 0.08);
  max-width: 520px;
}

.start-seal {
  width: 52px;
  height: 52px;
  display: grid;
  place-items: center;
  border-radius: 12px;
  background: rgba(169, 52, 38, 0.08);
  border: 1.5px solid rgba(169, 52, 38, 0.3);
  color: #a93426;
  font-family: var(--font-serif, "Noto Serif SC", serif);
  font-size: 26px;
  font-weight: 700;
  letter-spacing: 0;
  box-shadow: inset 0 0 10px rgba(169, 52, 38, 0.06);
}

.btn-generate {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 10px;
  height: 42px;
  padding: 0 24px;
  border: 0;
  border-radius: 9px;
  background: var(--btn-primary-bg, #241a10);
  color: #fff;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  box-shadow: 0 4px 14px rgba(0, 0, 0, 0.15);
  transition: all 0.15s ease;
}

.btn-generate:hover {
  background: #382c20;
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.22);
  transform: translateY(-1px);
}

.start h1 {
  margin: 0;
  color: var(--color-neutral-10);
  font-family: var(--font-serif);
  font-size: clamp(30px, 4vw, 48px);
  font-weight: 800;
  letter-spacing: 0;
  text-wrap: balance;
}

.start p {
  max-width: 520px;
  margin: 0;
  text-align: center;
  line-height: 1.9;
  color: var(--color-neutral-7);
}

.start button {
  margin-top: 10px;
  height: 42px;
  padding: 0 20px;
  border: 0;
  border-radius: 7px;
  background: var(--color-accent);
  color: #fff;
  font-weight: 700;
  cursor: pointer;
  box-shadow: 0 12px 26px rgba(198, 60, 46, 0.22);
  transition: transform 180ms ease, box-shadow 180ms ease;
}

.start button:hover {
  transform: translateY(-1px);
  box-shadow: 0 16px 30px rgba(198, 60, 46, 0.28);
}

.start button:active { transform: translateY(0); }

.start button:focus-visible {
  outline: 3px solid var(--color-accent-muted);
  outline-offset: 3px;
}

.error { color: var(--color-accent); }

.toast {
  position: fixed;
  right: 18px;
  bottom: 18px;
  padding: 11px 14px;
  border: 1px solid rgba(28, 24, 20, 0.08);
  border-radius: 6px;
  background: #fffdfa;
  color: var(--color-neutral-8);
  box-shadow: 0 14px 34px rgba(46, 37, 26, 0.14);
  font-size: 13px;
  font-weight: 600;
}

.toast.danger {
  color: var(--color-accent);
}
</style>
