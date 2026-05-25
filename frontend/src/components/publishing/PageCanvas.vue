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
import type { LineageEntry, LineagePage } from "../../types/publishing"
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
  /** 外部传入的全部条目（已编辑的优先），替代内部 computeLineageText */
  entries?: LineageEntry[]
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
  focusEntry: [personId: string]
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
/** 当前渲染参数，编辑器定位 & 缩放计算需要（renderCanvas 中更新） */
const currentTotalScale = ref(1)
const currentFitScale = ref(1)
const currentDpr = ref(window.devicePixelRatio || 1)
const currentCenterX = ref(0)
const currentCenterY = ref(0)
const currentContainerW = ref(800)
const currentContainerH = ref(600)
const currentPageWidth = ref(800)
const currentPageHeight = ref(600)

/** 内联编辑器屏幕坐标 — 跟随 zoom/pan 实时更新 */
const editorPos = computed(() => {
  const region = editingRegion.value
  const canvas = canvasRef.value
  if (!region || !canvas) return { x: 0, y: 0 }
  const rect = canvas.getBoundingClientRect()
  const dpr = window.devicePixelRatio || 1
  const ts = currentTotalScale.value
  // 匹配 renderCanvas：页坐标 * totalScale + pan/dpr + center → CSS 像素
  return {
    x: rect.left + (region.rect.x + region.rect.width) * ts + panX.value / dpr + currentCenterX.value + 10,
    y: rect.top + region.rect.y * ts + panY.value / dpr + currentCenterY.value,
  }
})

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
  // 优先使用父组件传入的条目（含用户编辑），否则从 publicationData 生成
  let allEntries: LineageEntry[]

  if (props.entries && props.entries.length > 0) {
    allEntries = props.entries
  } else if (props.publicationData) {
    const lineageOpts: LineageLayoutOptions = {
      fontSize: props.fontSize ?? 18,
      lineHeight: props.lineHeight ?? 1.9,
      columns: props.columns ?? 1,
      marginPreset: "standard",
    }
    const computed = computeLineageText(props.publicationData, lineageOpts)
    allEntries = computed.flatMap(p => p.entries)
  } else {
    composedPages.value = []
    layoutReady.value = false
    return
  }

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

  // 容器尺寸
  let containerW: number, containerH: number
  if (immersive.value) {
    containerW = window.innerWidth - 32
    containerH = window.innerHeight - 80
  } else {
    const parent = canvas.parentElement
    containerW = parent?.clientWidth ?? 800
    containerH = parent?.clientHeight ?? 600
  }

  const dpr = window.devicePixelRatio || 1
  const fitScale = renderer.getFitScale(page, containerW, containerH, props.fontSize ?? 18)
  const totalScale = fitScale * zoom.value
  currentTotalScale.value = totalScale
  currentFitScale.value = fitScale
  currentDpr.value = dpr
  currentContainerW.value = containerW
  currentContainerH.value = containerH
  currentPageWidth.value = page.width
  currentPageHeight.value = page.height

  // canvas 填满容器，避免周围露出白色背景
  canvas.style.width = containerW + "px"
  canvas.style.height = containerH + "px"
  canvas.width = containerW * dpr
  canvas.height = containerH * dpr

  // 页面在 canvas 中的居中偏移
  const pageCssW = page.width * totalScale
  const pageCssH = page.height * totalScale
  const centerX = (containerW - pageCssW) / 2
  const centerY = (containerH - pageCssH) / 2
  currentCenterX.value = centerX
  currentCenterY.value = centerY

  const ctx = canvas.getContext("2d")
  if (!ctx) return

  ctx.clearRect(0, 0, canvas.width, canvas.height)
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)

  // 居中 + 用户平移
  ctx.translate(panX.value + centerX * dpr, panY.value + centerY * dpr)

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
  const hitPage = composedPages.value[displayPage.value]
  if (!hitPage) return
  const dpr = currentDpr.value
  const ts = currentTotalScale.value
  const cx = currentCenterX.value
  const cy = currentCenterY.value
  // 屏幕坐标 → 页面坐标：screen = page*ts + pan/dpr + center
  const mouseX = (e.clientX - rect.left - panX.value / dpr - cx) / ts
  const mouseY = (e.clientY - rect.top - panY.value / dpr - cy) / ts

  const hit = renderer.hitTest(mouseX, mouseY, hitPage, 1)
  if (hit) {
    emit("focusEntry", hit.entry.personId)
    if (hit.action === "edit") {
      startInlineEdit(hit)
    } else {
      cancelInlineEdit()
    }
  } else {
    cancelInlineEdit()
  }
}

function startInlineEdit(region: HitRegion) {
  editingRegion.value = region
  editText.value = region.entry.formattedText
  showInlineEditor.value = true
  // editorPos 是 computed，跟随 zoom/pan 自动更新，无需手动计算
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
  const canvas = canvasRef.value
  if (!canvas || composedPages.value.length === 0) return

  const oldZoom = zoom.value
  const delta = e.deltaY > 0 ? -0.08 : 0.08
  const newZoom = Math.max(0.3, Math.min(3, oldZoom + delta))
  if (oldZoom === newZoom) return

  // 缩放以光标为中心：调整平移使鼠标下的页面点保持不动
  const rect = canvas.getBoundingClientRect()
  const mouseX = e.clientX - rect.left
  const mouseY = e.clientY - rect.top
  const fs = currentFitScale.value
  const dpr = currentDpr.value
  const pw = currentPageWidth.value
  const ph = currentPageHeight.value
  const cw = currentContainerW.value
  const ch = currentContainerH.value
  const oldCx = currentCenterX.value
  const oldCy = currentCenterY.value

  // 页面上光标所指的点（旧坐标系）
  const ppX = (mouseX - panX.value / dpr - oldCx) / (fs * oldZoom)
  const ppY = (mouseY - panY.value / dpr - oldCy) / (fs * oldZoom)

  // 新缩放后的居中偏移
  const newCx = (cw - pw * fs * newZoom) / 2
  const newCy = (ch - ph * fs * newZoom) / 2

  // 调整 pan 使同一页面点保持在光标下
  panX.value = (mouseX - ppX * fs * newZoom - newCx) * dpr
  panY.value = (mouseY - ppY * fs * newZoom - newCy) * dpr
  zoom.value = newZoom
  renderCanvas()
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
  () => [props.publicationData, props.entries, props.canvasId, props.fontSize, props.lineHeight, props.columns] as const,
  () => {
    // 重置缩放/平移
    zoom.value = 1
    panX.value = 0
    panY.value = 0
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
  <canvas
    ref="canvasRef"
    :class="['page-canvas', { immersive }]"
    @click="handleCanvasClick"
    @wheel="handleWheel"
    @mousedown="handleMouseDown"
    @mousemove="handleMouseMove"
    @mouseup="handleMouseUp"
    @mouseleave="handleMouseUp"
  />

  <div v-if="relayouting" class="page-canvas__overlay">正在刷新预览...</div>

  <!-- 浮动控件：缩放 + 沉浸 -->
  <div v-if="layoutReady" class="page-canvas__float">
    <span class="meta-zoom" @click="zoom = 1; panX = 0; panY = 0; renderCanvas()" title="重置缩放">
      {{ Math.round(zoom * 100) }}%
    </span>
    <button class="immersive-btn" @click="toggleImmersive" :title="immersive ? '退出沉浸' : '沉浸预览'">
      {{ immersive ? '✕' : '⛶' }}
    </button>
  </div>

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
</template>

<style scoped>
.page-canvas {
  display: block;
  cursor: crosshair;
  box-shadow: 0 2px 16px rgba(0, 0, 0, 0.10);
  border-radius: 2px;
}

/* 浮动控件 */
.page-canvas__float {
  position: absolute;
  bottom: 16px;
  right: 16px;
  z-index: 3;
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 8px;
  border-radius: 8px;
  background: var(--color-panel-bg);
  backdrop-filter: blur(8px);
  border: 1px solid var(--color-card-stroke);
}

.meta-zoom {
  cursor: pointer;
  user-select: none;
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 11px;
  color: var(--color-neutral-7);
  font-variant-numeric: tabular-nums;
  transition: background 0.15s;
}
.meta-zoom:hover {
  background: var(--color-accent);
  color: #fff;
}

.immersive-btn {
  width: 26px;
  height: 26px;
  border: none;
  background: transparent;
  color: var(--color-neutral-6);
  font-size: 14px;
  cursor: pointer;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.15s;
}
.immersive-btn:hover {
  background: var(--color-accent);
  color: #fff;
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

.page-canvas.immersive .page-canvas__float {
  display: none;
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
