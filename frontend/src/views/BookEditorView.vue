<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from "vue"
import { useRoute, useRouter } from "vue-router"
import BookSpread from "../components/book-editor/BookSpread.vue"
import BookToolbar from "../components/book-editor/BookToolbar.vue"
import PageThumbnailRail from "../components/book-editor/PageThumbnailRail.vue"
import { getPublication } from "../api/publication"
import { generateBookDocument } from "../features/book-editor/bookGenerator"
import { getBookDocument, saveBookDocument } from "../features/book-editor/bookDocumentApi"
import { paginateBook } from "../features/book-editor/bookPaginator"
import { exportBookPdf } from "../features/book-editor/bookPdfExport"
import { DEFAULT_BOOK_LAYOUT, type BookDocument, type BookLayout } from "../types/bookDocument"
import type { PublicationData } from "../types/family"

const route = useRoute()
const router = useRouter()
const publicationId = computed(() => Number(route.params.publicationId))

const loading = ref(true)
const saving = ref(false)
const exporting = ref(false)
const message = ref("")
const error = ref("")
const publication = ref<PublicationData | null>(null)
const document = ref<BookDocument | null>(null)
const currentPageIndex = ref(0)
const selectedBlockIndex = ref<number | null>(null)
const viewMode = ref<"single" | "spread">("spread")
const autoSingleEdit = ref(false)
let returnToSpreadTimer: ReturnType<typeof setTimeout> | null = null

const layout = computed(() => document.value?.layout ?? DEFAULT_BOOK_LAYOUT)
const pages = computed(() => document.value ? paginateBook(document.value) : [])

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
  loading.value = true
  error.value = ""
  try {
    const [pubResult, saved] = await Promise.all([
      getPublication(publicationId.value),
      getBookDocument(publicationId.value),
    ])
    publication.value = pubResult.publication
    document.value = saved
  } catch (e) {
    error.value = e instanceof Error ? e.message : "加载书稿失败"
  } finally {
    loading.value = false
  }
})

function back() {
  router.push(`/publication/${publicationId.value}`)
}

function generate() {
  if (!publication.value) return
  if (document.value && !confirm("重新生成会覆盖当前书稿，确定继续吗？")) return
  document.value = generateBookDocument(publicationId.value, publication.value)
  currentPageIndex.value = 0
  selectedBlockIndex.value = null
  message.value = "已生成书稿"
}

async function save() {
  if (!document.value) return
  saving.value = true
  error.value = ""
  try {
    document.value = await saveBookDocument(document.value)
    message.value = "书稿已保存"
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

function updatePerson(blockIndex: number, text: string) {
  if (!document.value) return
  selectedBlockIndex.value = blockIndex
  const blocks = [...document.value.blocks]
  const block = blocks[blockIndex]
  if (block?.type !== "person") return
  blocks[blockIndex] = { ...block, text }
  document.value = { ...document.value, blocks }
  if (!autoSingleEdit.value) return
  if (returnToSpreadTimer) clearTimeout(returnToSpreadTimer)
  returnToSpreadTimer = setTimeout(() => {
    viewMode.value = "spread"
    autoSingleEdit.value = false
    returnToSpreadTimer = null
  }, 400)
}

async function focusEditPage(pageIndex: number, blockIndex: number) {
  currentPageIndex.value = pageIndex
  viewMode.value = "single"
  autoSingleEdit.value = true
  await nextTick()
  const editable = globalThis.document.querySelector<HTMLElement>(
    `[data-book-block-index="${blockIndex}"] .person-text`,
  )
  editable?.focus()
}

function updateViewMode(next: "single" | "spread") {
  viewMode.value = next
  autoSingleEdit.value = false
}

onBeforeUnmount(() => {
  if (returnToSpreadTimer) clearTimeout(returnToSpreadTimer)
}

function insertPageBreak() {
  if (!document.value) return
  const blocks = [...document.value.blocks]
  const index = selectedBlockIndex.value ?? blocks.length - 1
  blocks.splice(index + 1, 0, { type: "pageBreak", id: `break-${Date.now()}` })
  document.value = { ...document.value, blocks }
  message.value = "已插入分页"
}

async function exportPdf() {
  if (!document.value) return
  exporting.value = true
  error.value = ""
  try {
    await exportBookPdf(document.value, pages.value)
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
      @back="back"
      @generate="generate"
      @save="save"
      @exportPdf="exportPdf"
      @insertPageBreak="insertPageBreak"
      @updateLayout="updateLayout"
      @updateViewMode="updateViewMode"
    />

    <div v-if="loading" class="state">正在加载书稿...</div>
    <div v-else-if="error && !document" class="state error">{{ error }}</div>
    <div v-else-if="!document" class="start">
      <h1>{{ publication?.title || "古籍族谱" }}</h1>
      <p>从当前族谱自动生成封面和世系录，之后可在书页中直接编辑人物条目。</p>
      <button type="button" @click="generate">生成古籍族谱</button>
    </div>
    <div v-else class="workbench">
      <PageThumbnailRail :pages="pages" :currentPage="currentPageIndex" @select="currentPageIndex = $event" />
      <BookSpread
        :pages="pages"
        :currentPageIndex="currentPageIndex"
        :layout="document.layout"
        :viewMode="viewMode"
        @updatePerson="updatePerson"
        @selectBlock="selectedBlockIndex = $event"
        @editFocus="focusEditPage"
      />
    </div>

    <div v-if="message || error" class="toast" :class="{ danger: error }">
      {{ error || message }}
    </div>
  </div>
</template>

<style scoped>
.book-editor {
  height: 100dvh;
  display: flex;
  flex-direction: column;
  background: #eee7da;
  color: var(--color-neutral-9);
}

.workbench {
  min-height: 0;
  flex: 1;
  display: grid;
  grid-template-columns: 136px minmax(0, 1fr);
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
