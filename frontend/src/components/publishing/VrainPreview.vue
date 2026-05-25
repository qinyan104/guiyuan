<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch, nextTick } from "vue"
import { generatePreview } from "../../api/publishing"
import * as pdfjsLib from "pdfjs-dist"
import PDFWorker from "pdfjs-dist/build/pdf.worker.mjs?url"

// Initialize PDF.js worker using local bundled file
pdfjsLib.GlobalWorkerOptions.workerSrc = PDFWorker

const props = defineProps<{
  draftId: number
  canvasId: string
  activePageIndex: number
}>()

const emit = defineEmits<{
  navigateToPage: [index: number]
  pagesLoaded: [count: number]
}>()

const loading = ref(false)
const error = ref<string | null>(null)
const pdfDoc = ref<any>(null)
const numPages = ref(0)
const canvasRefs = ref<HTMLCanvasElement[]>([])
const pdfUrl = ref<string | null>(null)

async function loadPreview() {
  loading.value = true
  error.value = null

  // Cleanup old URL
  if (pdfUrl.value) {
    URL.revokeObjectURL(pdfUrl.value)
    pdfUrl.value = null
  }

  try {
    const blob = await generatePreview(props.draftId, props.canvasId)
    pdfUrl.value = URL.createObjectURL(blob)

    const loadingTask = pdfjsLib.getDocument(pdfUrl.value)
    pdfDoc.value = await loadingTask.promise
    numPages.value = pdfDoc.value.numPages
    emit("pagesLoaded", numPages.value)

    await nextTick()
    renderAllPages()
  } catch (e: any) {
    console.error("PDF load error:", e)
    error.value = e.message || "预览加载失败"
  } finally {
    loading.value = false
  }
}

async function renderPage(index: number) {
  if (!pdfDoc.value || !canvasRefs.value[index]) return

  const page = await pdfDoc.value.getPage(index + 1)
  const canvas = canvasRefs.value[index]
  const context = canvas.getContext("2d")
  if (!context) return

  const viewport = page.getViewport({ scale: 1.5 }) // Higher scale for clarity
  canvas.height = viewport.height
  canvas.width = viewport.width

  const renderContext = {
    canvasContext: context,
    viewport: viewport,
  }
  await page.render(renderContext).promise
}

async function renderAllPages() {
  for (let i = 0; i < numPages.value; i++) {
    renderPage(i)
  }
}

onMounted(loadPreview)
onUnmounted(() => {
  if (pdfUrl.value) URL.revokeObjectURL(pdfUrl.value)
})

watch(() => props.canvasId, loadPreview)
watch(() => props.activePageIndex, (newIdx) => {
  // Ensure the active page is rendered if it wasn't already
  renderPage(newIdx)
})

defineExpose({ reload: loadPreview })
</script>

<template>
  <div class="vrain-scroll-container">
    <div v-if="loading" class="preview-loading">
      <div class="loading-spinner"></div>
      <p>vRain 排版中…</p>
    </div>

    <div v-else-if="error" class="preview-error">
      <p>{{ error }}</p>
      <button class="retry-btn" @click="loadPreview">重试</button>
    </div>

    <div v-else-if="numPages === 0" class="preview-empty">
      <p>点击"自动排版"生成书页</p>
    </div>

    <div v-else class="pages-stack">
      <div
        v-for="i in numPages"
        :key="i"
        :class="['page-slot', { 'page-slot--active': (i - 1) === activePageIndex }]"
        @click="$emit('navigateToPage', i - 1)"
      >
        <canvas
          :ref="(el) => { if (el) canvasRefs[i - 1] = el as HTMLCanvasElement }"
          class="page-canvas"
        ></canvas>
        <span class="page-num">{{ i }}</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.vrain-scroll-container {
  flex: 1; overflow-y: auto; overflow-x: hidden;
  padding: 32px 40px; background: #1e1b18;
  display: flex; flex-direction: column; align-items: center;
}

.preview-loading {
  display: flex; flex-direction: column; align-items: center;
  justify-content: center; min-height: 300px; color: rgba(255,255,255,0.5); gap: 12px;
}

.loading-spinner {
  width: 32px; height: 32px;
  border: 3px solid rgba(255,255,255,0.1);
  border-top-color: var(--color-accent); border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin { to { transform: rotate(360deg); } }

.preview-error { text-align: center; color: #e88; padding: 40px; }
.retry-btn { margin-top: 12px; padding: 6px 20px; background: var(--color-accent); color: #fff; border: none; border-radius: 4px; font-size: 13px; cursor: pointer; }
.preview-empty { color: rgba(255,255,255,0.3); padding: 60px 20px; font-size: 14px; }

.pages-stack { display: flex; flex-direction: column; align-items: center; gap: 32px; width: 100%; }

.page-slot { position: relative; flex-shrink: 0; cursor: pointer; transition: transform 0.15s; }
.page-slot:hover { transform: scale(1.01); }
.page-slot--active .page-canvas { outline: 2px solid var(--color-accent); outline-offset: 3px; }

.page-canvas {
  display: block;
  max-width: 100%;
  height: auto;
  box-shadow: 0 4px 20px rgba(0,0,0,0.4);
  background: white; /* Ensure visibility before render */
}

.page-num { position: absolute; bottom: -24px; left: 50%; transform: translateX(-50%); font-size: 11px; color: rgba(255,255,255,0.4); pointer-events: none; }
</style>
