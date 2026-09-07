<script setup lang="ts">
import { computed, onMounted, ref } from "vue"
import { useRoute, useRouter } from "vue-router"
import DarkModeToggle from "../components/DarkModeToggle.vue"
import { getPublication } from "../api/publication"
import { buildPublicationMarkdown } from "../features/book-editor/bookPublicationExport"
import type { PublicationData } from "../types/family"

const route = useRoute()
const router = useRouter()
const publicationId = computed(() => Number(route.params.publicationId))

const loading = ref(true)
const error = ref("")
const message = ref("")
const publication = ref<PublicationData | null>(null)

const markdown = computed(() => publication.value ? buildPublicationMarkdown(publication.value) : "")
const markdownPreview = computed(() => markdown.value.slice(0, 6000))
const peopleCount = computed(() => Object.keys(publication.value?.people ?? {}).length)
const familyCount = computed(() => Object.keys(publication.value?.families ?? {}).length)

onMounted(async () => {
  try {
    publication.value = (await getPublication(publicationId.value)).publication
  } catch (e) {
    error.value = e instanceof Error ? e.message : "族谱数据加载失败"
  } finally {
    loading.value = false
  }
})

function back() {
  router.push(`/publication/${publicationId.value}`)
}

function sanitizeFileName(value: string): string {
  return value.replace(/[\\/:*?"<>|]/g, "-").trim() || "族谱"
}

function downloadTextFile(fileName: string, content: string, type: string) {
  const url = URL.createObjectURL(new Blob([content], { type }))
  const link = window.document.createElement("a")
  link.href = url
  link.download = fileName
  window.document.body.appendChild(link)
  link.click()
  window.document.body.removeChild(link)
  window.setTimeout(() => URL.revokeObjectURL(url), 0)
}

function exportMarkdown() {
  if (!publication.value) return
  downloadTextFile(`${sanitizeFileName(publication.value.title)}.md`, markdown.value, "text/markdown;charset=utf-8")
  message.value = "Markdown 文件已下载"
  error.value = ""
}

</script>

<template>
  <main class="publication-export">
    <header class="export-header">
      <button class="back-button" type="button" title="返回族谱" @click="back">← 返回族谱</button>
      <div class="header-title">
        <span class="eyebrow">归源 · 出版数据</span>
        <h1>{{ publication?.title || "族谱出版数据" }}</h1>
      </div>
      <DarkModeToggle />
    </header>

    <section v-if="loading" class="state">正在加载族谱数据...</section>
    <section v-else-if="error" class="state state--error">{{ error }}</section>
    <section v-else-if="publication" class="export-content">
      <div class="summary">
        <div>
          <p class="section-kicker">数据提取</p>
          <h2>导出族谱元数据</h2>
          <p class="summary-copy">归源负责整理人物、家庭关系和世系顺序，下载后可交给 Word、WPS 或专业排版工具继续处理。</p>
        </div>
        <div class="summary-actions">
          <button class="button button--primary" type="button" @click="exportMarkdown">
            <span aria-hidden="true">↓</span> 下载 Markdown
          </button>
        </div>
      </div>

      <div class="stats" aria-label="族谱数据统计">
        <div><strong>{{ peopleCount }}</strong><span>人物</span></div>
        <div><strong>{{ familyCount }}</strong><span>家庭关系</span></div>
        <div><strong>{{ publication.revision ?? 0 }}</strong><span>修订版本</span></div>
      </div>

      <section class="preview-section">
        <div class="preview-heading">
          <div>
            <p class="section-kicker">Markdown 预览</p>
            <h2>简单阅读顺序</h2>
          </div>
          <span v-if="markdown.length > markdownPreview.length">预览前 {{ markdownPreview.length }} 字</span>
        </div>
        <pre class="markdown-preview">{{ markdownPreview }}</pre>
      </section>
    </section>

    <p v-if="message" class="message" role="status">{{ message }}</p>
  </main>
</template>

<style scoped>
.publication-export {
  min-height: 100dvh;
  background: var(--color-page-bg, #f7f6f2);
  color: var(--color-neutral-10, #24231f);
}

.export-header {
  height: 64px;
  display: flex;
  align-items: center;
  gap: 24px;
  padding: 0 32px;
  background: var(--color-neutral-1, #fff);
  border-bottom: 1px solid var(--color-card-stroke, rgba(0, 0, 0, 0.08));
}

.back-button {
  border: 0;
  background: transparent;
  color: var(--color-neutral-7, #686761);
  cursor: pointer;
  font-size: 13px;
  padding: 8px 0;
}

.back-button:hover { color: var(--color-neutral-10, #24231f); }

.header-title { flex: 1; min-width: 0; }
.eyebrow,
.section-kicker {
  color: var(--color-accent, #b64234);
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.eyebrow { display: block; margin-bottom: 2px; }
.header-title h1,
.summary h2,
.preview-heading h2 { margin: 0; font-weight: 600; }
.header-title h1 { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 17px; }

.export-content { max-width: 1080px; margin: 0 auto; padding: 56px 32px 72px; }
.summary { display: flex; align-items: flex-end; justify-content: space-between; gap: 32px; }
.section-kicker { margin: 0 0 8px; }
.summary h2, .preview-heading h2 { font-size: 26px; }
.summary-copy { max-width: 620px; margin: 12px 0 0; color: var(--color-neutral-6, #77756e); line-height: 1.7; }
.summary-actions { display: flex; flex-wrap: wrap; justify-content: flex-end; gap: 10px; }

.button {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  min-height: 38px;
  padding: 0 14px;
  border: 1px solid var(--color-card-stroke, rgba(0, 0, 0, 0.12));
  border-radius: 6px;
  background: var(--color-neutral-1, #fff);
  color: var(--color-neutral-9, #35342f);
  cursor: pointer;
  font-size: 13px;
  font-weight: 600;
}

.button:hover { border-color: var(--color-accent, #b64234); }
.button--primary { border-color: var(--color-accent, #b64234); background: var(--color-accent, #b64234); color: #fff; }
.button--primary:hover { background: #96362c; }

.stats { display: flex; gap: 36px; margin: 36px 0 48px; padding: 18px 0; border-top: 1px solid var(--color-card-stroke, rgba(0, 0, 0, 0.08)); border-bottom: 1px solid var(--color-card-stroke, rgba(0, 0, 0, 0.08)); }
.stats div { display: flex; align-items: baseline; gap: 8px; }
.stats strong { font-size: 24px; font-variant-numeric: tabular-nums; }
.stats span { color: var(--color-neutral-6, #77756e); font-size: 13px; }

.preview-heading { display: flex; align-items: flex-end; justify-content: space-between; gap: 16px; margin-bottom: 14px; }
.preview-heading span { color: var(--color-neutral-6, #77756e); font-size: 12px; }
.markdown-preview { min-height: 460px; max-height: 680px; overflow: auto; margin: 0; padding: 24px; border: 1px solid var(--color-card-stroke, rgba(0, 0, 0, 0.1)); background: var(--color-neutral-1, #fff); color: var(--color-neutral-8, #4b4943); font: 14px/1.8 ui-monospace, SFMono-Regular, Consolas, monospace; white-space: pre-wrap; }

.state { display: grid; min-height: calc(100dvh - 64px); place-items: center; color: var(--color-neutral-6, #77756e); }
.state--error { color: var(--color-accent, #b64234); }
.message { position: fixed; right: 24px; bottom: 24px; margin: 0; padding: 10px 14px; border: 1px solid var(--color-card-stroke, rgba(0, 0, 0, 0.1)); border-radius: 6px; background: var(--color-neutral-1, #fff); box-shadow: 0 8px 24px rgba(0, 0, 0, 0.1); font-size: 13px; }

@media (max-width: 720px) {
  .export-header { padding: 0 16px; gap: 12px; }
  .export-content { padding: 32px 16px 48px; }
  .summary { align-items: stretch; flex-direction: column; }
  .summary-actions { justify-content: flex-start; }
  .stats { gap: 20px; justify-content: space-between; }
  .stats strong { font-size: 20px; }
  .preview-heading { align-items: flex-start; flex-direction: column; gap: 4px; }
}
</style>
