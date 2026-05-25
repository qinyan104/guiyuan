<script setup lang="ts">
/**
 * PageCanvas — 古籍书页实时预览组件
 *
 * 使用 BookLayoutEngine + CanvasRenderer 实现浏览器端实时排版和渲染。
 *
 * 支持：
 *  - 12 种画布模板实时切换
 *  - 点击文字 → 内联编辑
 *  - 翻页导航
 */
import { computed, onMounted, onUnmounted, ref, watch, nextTick } from "vue"
import type { LineagePage } from "../../types/publishing"
import type { PublicationData } from "../../types/family"
import type { ComposedPage, HitRegion } from "../../lib/bookLayout/types"
import { getBookLayoutEngine } from "../../lib/bookLayout/BookLayoutEngine"
import { getCanvasRenderer } from "../../lib/bookLayout/CanvasRenderer"
import { computeLineageText } from "../../lib/lineageText"
import type { LayoutOptions as LineageLayoutOptions } from "../../lib/lineageText"
import type { LayoutOptions } from "../../lib/bookLayout/types"
import { CANVAS_TEMPLATES } from "../../lib/vrainTemplates"

const props = defineProps<{
  sheetNumber: number
  pageData?: LineagePage | null
  publicationData?: PublicationData | null
  draftId: number
  canvasId: string
  totalPages: number
  paper?: "A4" | "A3"
  templateName?: string
  statusText?: string
  relayouting?: boolean
  fontSize?: number
  lineHeight?: number
  columns?: number
}>()

const emit = defineEmits<{
  navigateToPage: [index: number]
  editEntry: [personId: string, newText: string]
}>()

const engine = getBookLayoutEngine()
const renderer = getCanvasRenderer()

// 预加载字体 + 纹理
renderer.preloadFont("qiji-combo", "/vrain/fonts/qiji-combo.ttf")
renderer.preloadImages([
  "/vrain/canvas/paper.jpg",
  "/vrain/canvas/3leaves.png",
])

const canvasRef = ref<HTMLCanvasElement | null>(null)
const composedPages = ref<ComposedPage[]>([])
const layoutReady = ref(false)
const editingRegion = ref<HitRegion | null>(null)
const editText = ref("")
const showInlineEditor = ref(false)
const editorPos = ref({ x: 0, y: 0 })

// ── 缩放 & 拖拽 ──
const zoom = ref(1)
const panX = ref(0)
const panY = ref(0)
const isDragging = ref(false)
const dragStart = ref({ x: 0, y: 0, panX: 0, panY: 0 })

// ── 沉浸模式 ──
const immersive = ref(false)

function toggleImmersive() {
  immersive.value = !immersive.value
  nextTick(() => renderCanvas())
}

function onKeydown(e: KeyboardEvent) {
  if (e.key === "Escape" && immersive.value) {
    immersive.value = false
    nextTick(() => renderCanvas())
  }
}

const template = computed(() => CANVAS_TEMPLATES.find(t => t.id === props.canvasId) ?? CANVAS_TEMPLATES[0])
const displayPage = computed(() => Math.min(Math.max(props.sheetNumber - 1, 0), composedPages.value.length - 1))

// ── 排版 ──

function runLayout() {
  if (!props.publicationData) return

  // 生成 LineageEntry[]（复用现有的 lineageText）
  const lineageOpts: LineageLayoutOptions = {
    fontSize: props.fontSize ?? 18,
    lineHeight: props.lineHeight ?? 1.9,
    columns: props.columns ?? 1,
    marginPreset: "standard",
  }
  const entries = computeLineageText(props.publicationData, lineageOpts)

  // 展平所有页面的条目
  const allEntries = entries.flatMap(p => p.entries)
  if (allEntries.length === 0) {
    composedPages.value = []
    layoutReady.value = false
    return
  }

  const opts: LayoutOptions = {
    fontSize: props.fontSize ?? 18,
    lineHeight: props.lineHeight ?? 1.9,
    columns: props.columns ?? 1,
    marginPreset: "standard",
  }

  composedPages.value = engine.layoutSync(allEntries, props.canvasId, opts)
  layoutReady.value = true
}

// ── 渲染 ──

function renderCanvas() {
  const canvas = canvasRef.value
  if (!canvas || composedPages.value.length === 0) return

  const page = composedPages.value[displayPage.value]
  if (!page) return

  const viewport = canvas.closest('.page-canvas__viewport') as HTMLElement | null

  // 沉浸模式用整个窗口，普通模式用 viewport
  let containerW: number, containerH: number
  if (immersive.value) {
    containerW = window.innerWidth - 32
    containerH = window.innerHeight - 80
  } else {
    containerW = (viewport?.clientWidth ?? canvas.parentElement?.clientWidth ?? 800) - 24
    containerH = (viewport?.clientHeight ?? canvas.parentElement?.clientHeight ?? 600) - 24
  }

  const dpr = window.devicePixelRatio || 1
  const fitScale = renderer.getFitScale(page, containerW, containerH, props.fontSize ?? 18)
  const totalScale = fitScale * zoom.value

  canvas.width = page.width * totalScale * dpr
  canvas.height = page.height * totalScale * dpr
  canvas.style.width = `${page.width * totalScale}px`
  canvas.style.height = `${page.height * totalScale}px`

  const ctx = canvas.getContext("2d")
  if (!ctx) return

  ctx.clearRect(0, 0, canvas.width, canvas.height)
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)

  // 应用平移
  ctx.translate(panX.value, panY.value)

  renderer.render(ctx, page, totalScale)

  // 绘制编辑光标
  if (editingRegion.value) {
    renderer.renderCursor(ctx, editingRegion.value, totalScale)
  }
}

// ── 交互 ──

function handleCanvasClick(e: MouseEvent) {
  if (composedPages.value.length === 0) return
  const canvas = canvasRef.value
  if (!canvas) return

  const rect = canvas.getBoundingClientRect()
  // canvas 物理像素 → CSS 像素比率 → 页面坐标（考虑缩放和平移）
  const px2css = canvas.width / rect.width
  const hitPage = composedPages.value[displayPage.value]
  if (!hitPage) return
  const fitScale = renderer.getFitScale(hitPage, canvas.parentElement?.clientWidth ?? 800, canvas.parentElement?.clientHeight ?? 600, props.fontSize ?? 18)
  const totalScale = fitScale * zoom.value
  const mouseX = ((e.clientX - rect.left) * px2css - panX.value * (window.devicePixelRatio || 1)) / totalScale
  const mouseY = ((e.clientY - rect.top) * px2css - panY.value * (window.devicePixelRatio || 1)) / totalScale

  const hit = renderer.hitTest(mouseX, mouseY, hitPage, 1)
  if (hit && hit.action === "edit") {
    startInlineEdit(hit)
  } else {
    cancelInlineEdit()
  }
}

function startInlineEdit(region: HitRegion) {
  editingRegion.value = region
  editText.value = region.entry.formattedText
  showInlineEditor.value = true

  // 计算编辑器位置（Canvas 坐标 → 屏幕坐标）
  const canvas = canvasRef.value
  if (canvas) {
    const rect = canvas.getBoundingClientRect()
    editorPos.value = {
      x: rect.left + region.rect.x + region.rect.width + 10,
      y: rect.top + region.rect.y,
    }
  }

  renderCanvas()
}

function cancelInlineEdit() {
  editingRegion.value = null
  showInlineEditor.value = false
  renderCanvas()
}

function confirmInlineEdit() {
  if (editingRegion.value && editText.value !== editingRegion.value.entry.formattedText) {
    emit("editEntry", editingRegion.value.entry.personId, editText.value)
  }
  cancelInlineEdit()
}

// ── 滚动缩放 ──

function handleWheel(e: WheelEvent) {
  e.preventDefault()
  const delta = e.deltaY > 0 ? -0.08 : 0.08
  zoom.value = Math.max(0.3, Math.min(3, zoom.value + delta))
  nextTick(() => renderCanvas())
}

function handleMouseDown(e: MouseEvent) {
  if (e.button !== 0) return
  isDragging.value = true
  dragStart.value = { x: e.clientX, y: e.clientY, panX: panX.value, panY: panY.value }
  ;(e.target as HTMLElement).style.cursor = "grabbing"
}

function handleMouseMove(e: MouseEvent) {
  if (!isDragging.value) return
  panX.value = dragStart.value.panX + (e.clientX - dragStart.value.x)
  panY.value = dragStart.value.panY + (e.clientY - dragStart.value.y)
  renderCanvas()
}

function handleMouseUp(e: MouseEvent) {
  if (!isDragging.value) return
  isDragging.value = false
  ;(e.target as HTMLElement).style.cursor = "crosshair"
}

// ── 生命周期 ──

onMounted(() => {
  runLayout()
  nextTick(() => renderCanvas())
  document.addEventListener("keydown", onKeydown)
})

onUnmounted(() => {
  composedPages.value = []
  document.removeEventListener("keydown", onKeydown)
})

watch(
  () => [props.publicationData, props.canvasId, props.fontSize, props.lineHeight, props.columns],
  () => {
    runLayout()
    nextTick(() => renderCanvas())
  },
  { deep: false },
)

watch(
  () => props.sheetNumber,
  () => nextTick(() => renderCanvas()),
)

defineExpose({
  reloadPreview: () => { runLayout(); nextTick(() => renderCanvas()) },
  composedPages,
})
</script>

<template>
  <div :class="['page-canvas', { immersive }]">
    <div class="page-canvas__stage">
      <div class="page-canvas__toolbar">
        <div>
          <span class="page-canvas__eyebrow">当前画布</span>
          <h3 class="page-canvas__title">版面预览</h3>
        </div>
        <div class="page-canvas__meta">
          <span>{{ templateName || '默认模板' }}</span>
          <span>{{ paper || 'A4' }}</span>
          <span>第 {{ sheetNumber }} 页</span>
          <button class="immersive-btn" @click="toggleImmersive" :title="immersive ? '退出沉浸' : '沉浸预览'">
            {{ immersive ? '✕ 退出' : '⛶ 沉浸' }}
          </button>
          <span v-if="statusText">{{ statusText }}</span>
          <span v-if="!layoutReady" class="meta-warn">排版中…</span>
          <template v-if="layoutReady">
            <span class="meta-zoom" @click="zoom = 1; panX = 0; panY = 0; renderCanvas()" title="点击重置">
              {{ Math.round(zoom * 100) }}%
            </span>
          </template>
        </div>
      </div>

      <div class="page-canvas__viewport">
        <div v-if="relayouting" class="page-canvas__overlay">正在刷新预览...</div>

        <!-- Canvas 渲染层 -->
        <div
          class="canvas-container"
          @click="handleCanvasClick"
          @wheel="handleWheel"
          @mousedown="handleMouseDown"
          @mousemove="handleMouseMove"
          @mouseup="handleMouseUp"
          @mouseleave="handleMouseUp"
        >
          <canvas ref="canvasRef" class="page-canvas__canvas"></canvas>
        </div>

        <!-- 翻页按钮 -->
        <div v-if="composedPages.length > 0" class="page-nav">
          <button
            class="nav-btn"
            :disabled="displayPage <= 0"
            @click="$emit('navigateToPage', displayPage - 1)"
          >上一页</button>
          <span class="nav-info">{{ displayPage + 1 }} / {{ composedPages.length }}</span>
          <button
            class="nav-btn"
            :disabled="displayPage >= composedPages.length - 1"
            @click="$emit('navigateToPage', displayPage + 1)"
          >下一页</button>
        </div>

        <!-- 内联编辑器 -->
        <Teleport to="body">
          <div
            v-if="showInlineEditor"
            class="inline-editor"
            :style="{ left: editorPos.x + 'px', top: editorPos.y + 'px' }"
          >
            <textarea
              v-model="editText"
              class="inline-editor__input"
              rows="4"
              @keydown.escape="cancelInlineEdit"
              @keydown.ctrl.enter="confirmInlineEdit"
            ></textarea>
            <div class="inline-editor__actions">
              <span class="inline-editor__hint">Ctrl+Enter 确认 · Esc 取消</span>
              <button class="btn-confirm" @click="confirmInlineEdit">确认</button>
            </div>
          </div>
        </Teleport>
      </div>
    </div>
  </div>

</template>

<style scoped>
.page-canvas {
  display: flex;
  min-width: 0;
  height: 100%;
  padding: 6px;
  background:
    radial-gradient(circle at 50% 0%, var(--color-neutral-2), transparent 55%),
    var(--color-canvas-bg);
}

.page-canvas__stage {
  display: flex;
  flex-direction: column;
  width: 100%;
  min-width: 0;
  border: 1px solid var(--color-card-stroke);
  border-radius: var(--radius-xl);
  background: var(--color-neutral-1);
  box-shadow: var(--shadow-whisper);
  overflow: hidden;
}

.page-canvas__toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 14px 18px;
  border-bottom: 1px solid var(--color-card-stroke);
  background: var(--color-panel-bg);
  flex-shrink: 0;
}

.page-canvas__eyebrow {
  display: block;
  margin-bottom: 1px;
  font-family: var(--font-sans);
  font-size: 11px;
  font-weight: 600;
  color: var(--color-accent);
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

.page-canvas__title {
  margin: 0;
  font-family: var(--font-serif);
  font-size: 15px;
  font-weight: 600;
  color: var(--color-neutral-10);
}

.page-canvas__meta {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 8px 12px;
  font-size: 12px;
  color: var(--color-neutral-6);
}

.meta-warn {
  color: var(--color-accent);
  font-weight: 500;
}

.meta-zoom {
  cursor: pointer;
  user-select: none;
  padding: 2px 8px;
  border-radius: 4px;
  background: var(--color-neutral-2);
  font-variant-numeric: tabular-nums;
  transition: background 0.15s;
}
.meta-zoom:hover {
  background: var(--color-accent);
  color: #fff;
}

.page-canvas__viewport {
  position: relative;
  flex: 1;
  min-height: 0;
  overflow: auto;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 12px;
}

.page-canvas__overlay {
  position: absolute;
  top: 14px;
  right: 14px;
  z-index: 2;
  padding: 8px 12px;
  border-radius: 999px;
  background: var(--color-panel-bg);
  backdrop-filter: blur(8px);
  border: 1px solid var(--color-card-stroke);
  color: var(--color-neutral-6);
  font-size: 12px;
  font-weight: 500;
}

.canvas-container {
  display: flex;
  align-items: center;
  justify-content: center;
  flex: 1;
  min-height: 0;
  min-width: 0;
  cursor: crosshair;
  overflow: hidden;
}

.page-canvas__canvas {
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
  border-radius: 2px;
  max-width: 100%;
  max-height: 100%;
}

.page-nav {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-top: 12px;
  flex-shrink: 0;
}

.nav-btn {
  padding: 6px 20px;
  border: 1px solid var(--color-card-stroke);
  border-radius: 6px;
  background: var(--color-neutral-1);
  color: var(--color-neutral-7);
  font-size: 13px;
  cursor: pointer;
  transition: all 0.15s;
}

.nav-btn:hover:not(:disabled) {
  background: var(--color-neutral-2);
  color: var(--color-neutral-9);
}

.nav-btn:disabled {
  opacity: 0.35;
  cursor: default;
}

.nav-info {
  font-size: 12px;
  color: var(--color-neutral-5);
  font-variant-numeric: tabular-nums;
  min-width: 60px;
  text-align: center;
}

/* ── 内联编辑器 ── */

.inline-editor {
  position: fixed;
  z-index: 9999;
  background: var(--color-neutral-1);
  border: 1px solid var(--color-accent);
  border-radius: 10px;
  padding: 12px;
  min-width: 260px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.18);
  backdrop-filter: blur(12px);
}

.inline-editor__input {
  width: 100%;
  min-height: 80px;
  border: 1px solid var(--color-card-stroke);
  border-radius: 6px;
  padding: 8px 10px;
  font-family: "Noto Serif SC", serif;
  font-size: 13px;
  line-height: 1.8;
  color: var(--color-neutral-9);
  background: var(--color-neutral-1);
  resize: vertical;
  outline: none;
}

.inline-editor__input:focus {
  border-color: var(--color-accent);
  box-shadow: 0 0 0 3px rgba(196, 58, 49, 0.1);
}

.inline-editor__actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 8px;
}

.inline-editor__hint {
  font-size: 10px;
  color: var(--color-neutral-4);
}

.btn-confirm {
  padding: 4px 16px;
  background: var(--color-accent);
  color: #fff;
  border: none;
  border-radius: 6px;
  font-size: 12px;
  cursor: pointer;
}

.btn-confirm:hover {
  opacity: 0.9;
}

/* ── 沉浸预览模式 ── */
.page-canvas.immersive {
  position: fixed;
  inset: 0;
  z-index: 9999;
  padding: 0;
  background: rgba(0, 0, 0, 0.92);
}

.page-canvas.immersive .page-canvas__stage {
  border: none;
  border-radius: 0;
  box-shadow: none;
  background: transparent;
}

.page-canvas.immersive .page-canvas__toolbar {
  display: none;
}

.page-canvas.immersive .page-canvas__viewport {
  padding: 0;
}

.page-canvas.immersive .page-canvas__overlay {
  top: 60px;
}

.immersive-btn {
  padding: 4px 12px;
  border: 1px solid var(--color-card-stroke);
  border-radius: 6px;
  background: var(--color-neutral-1);
  color: var(--color-neutral-7);
  font-size: 12px;
  cursor: pointer;
  transition: all 0.15s;
}
.immersive-btn:hover {
  background: var(--color-accent);
  color: #fff;
  border-color: var(--color-accent);
}
</style>
