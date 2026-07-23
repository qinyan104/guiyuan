<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue"
import { useRoute, useRouter } from "vue-router"
import BookPage from "../components/book-editor/BookPage.vue"
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

const layout = computed(() => document.value?.layout ?? DEFAULT_BOOK_LAYOUT)
const pages = computed(() => document.value ? paginateBook(document.value) : [])
const currentPage = computed(() => pages.value[currentPageIndex.value] ?? pages.value[0] ?? null)

watch(pages, (next) => {
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
  if (!document.value || !text) return
  const blocks = [...document.value.blocks]
  const block = blocks[blockIndex]
  if (block?.type !== "person") return
  blocks[blockIndex] = { ...block, text }
  document.value = { ...document.value, blocks }
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
      @back="back"
      @generate="generate"
      @save="save"
      @exportPdf="exportPdf"
      @insertPageBreak="insertPageBreak"
      @updateLayout="updateLayout"
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
      <BookPage
        :page="currentPage"
        :layout="document.layout"
        @updatePerson="updatePerson"
        @selectBlock="selectedBlockIndex = $event"
      />
    </div>

    <div v-if="message || error" class="toast" :class="{ danger: error }">
      {{ error || message }}
    </div>
  </div>
</template>

<style scoped>
.book-editor {
  height: 100vh;
  display: flex;
  flex-direction: column;
  background: var(--color-neutral-2);
}

.workbench {
  min-height: 0;
  flex: 1;
  display: grid;
  grid-template-columns: 136px minmax(0, 1fr);
}

.state,
.start {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 14px;
  color: var(--color-neutral-7);
}

.start h1 {
  margin: 0;
  color: var(--color-neutral-9);
  font-size: 28px;
  font-weight: 500;
}

.start p {
  max-width: 520px;
  margin: 0;
  text-align: center;
  line-height: 1.8;
}

.start button {
  margin-top: 8px;
  height: 38px;
  padding: 0 18px;
  border: 0;
  border-radius: 7px;
  background: var(--color-accent);
  color: #fff;
  cursor: pointer;
}

.error { color: var(--color-accent); }

.toast {
  position: fixed;
  right: 18px;
  bottom: 18px;
  padding: 10px 14px;
  border: 1px solid var(--color-card-stroke);
  border-radius: 8px;
  background: var(--color-neutral-1);
  color: var(--color-neutral-8);
  box-shadow: var(--shadow-whisper);
}

.toast.danger {
  color: var(--color-accent);
}
</style>
