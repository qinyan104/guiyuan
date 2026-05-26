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
import type { ComposedPage } from "../../lib/bookLayout/types"
import { getBookLayoutEngine } from "../../lib/bookLayout/BookLayoutEngine"
import { getCanvasRenderer } from "../../lib/bookLayout/CanvasRenderer"
import { getCanvasConfig } from "../../lib/bookLayout/CanvasConfig"
import { composePages } from "../../lib/bookLayout/PageComposer"
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
  fontFamily?: string
  hoveredPersonId?: string | null
}>()

const emit = defineEmits<{
  navigateToPage: [index: number]
  focusEntry: [personId: string]
}>()

const engine = getBookLayoutEngine()
const renderer = getCanvasRenderer()

// 预加载字体 + 纹理
// 预加载所有可用字体
renderer.preloadFont("qiji-combo", "/vrain/fonts/qiji-combo.ttf")
renderer.preloadFont("HanaMinA", "/vrain/fonts/HanaMinA.ttf")
renderer.preloadFont("HanaMinB", "/vrain/fonts/HanaMinB.ttf")
renderer.preloadFont("XiaolaiMonoSC", "/vrain/fonts/XiaolaiMonoSC-Regular.ttf")
renderer.preloadFont("WenYue-GuTiFangSong", "/vrain/fonts/WenYue-GuTiFangSong-JRFC-2.otf")
renderer.preloadFont("PingXianZhenSong", "/vrain/fonts/PingXianZhenSong.ttf")
renderer.preloadImages([
  "/vrain/canvas/paper.jpg",
  "/vrain/canvas/3leaves.png",
])

const canvasRef = ref<HTMLCanvasElement | null>(null)
const composedPages = ref<ComposedPage[]>([])
const layoutReady = ref(false)
/** 当前渲染参数（renderCanvas 中更新） */
const currentTotalScale = ref(1)
const currentFitScale = ref(0)
const currentDpr = ref(window.devicePixelRatio || 1)
const currentCenterX = ref(0)
const currentCenterY = ref(0)
const currentContainerW = ref(800)
const currentContainerH = ref(600)
const currentPageWidth = ref(800)
const currentPageHeight = ref(600)

// ── 缩放 & 拖拽 ──
const zoom = ref(0.3)
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
  const canvasCfg = getCanvasConfig(props.canvasId)
  const opts: LayoutOptions = {
    fontSize: props.fontSize ?? 48,
    lineHeight: props.lineHeight ?? 1.4,
    columns: props.columns ?? 1,
    marginPreset: "standard",
    fontFamily: props.fontFamily,
  }
  if (props.fontFamily) renderer.setBodyFont(props.fontFamily)

  // 获取当前页面的条目
  const entries = props.pageData?.entries
  if (entries && entries.length > 0) {
    const raw = engine.layoutSync(entries, props.canvasId, opts)
    composedPages.value = raw
    layoutReady.value = true
    return
  }

  // 空白页 → 渲染完整空白纸页（底色+纹理+版框+鱼尾+书口）
  if (props.pageData && entries?.length === 0) {
    // 用 composePages 生成真正的空白页（和引擎渲染完全一致）
    const emptyGlyphs = { pageNumber: props.sheetNumber, generationHeaders: [] as any[] }
    composedPages.value = composePages([emptyGlyphs], canvasCfg)
    layoutReady.value = true
    return
  }

  // 首次加载无页面数据 → 从 publicationData 生成全部
  if (props.publicationData) {
    const lineageOpts: LineageLayoutOptions = {
      fontSize: props.fontSize ?? 48,
      lineHeight: props.lineHeight ?? 1.4,
      columns: props.columns ?? 1,
      marginPreset: "standard",
    }
    const computed = computeLineageText(props.publicationData, lineageOpts)
    const allEntries = computed.flatMap(p => p.entries)
    if (allEntries.length > 0) {
      composedPages.value = engine.layoutSync(allEntries, props.canvasId, opts)
      layoutReady.value = true
      return
    }
  }

  composedPages.value = []
  layoutReady.value = false
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
  // fitScale 仅首次计算，之后保持不变（除非容器尺寸变化）
  if (currentFitScale.value === 0 || currentContainerW.value !== containerW || currentContainerH.value !== containerH) {
    currentFitScale.value = renderer.getFitScale(page, containerW, containerH)
  }
  const fitScale = currentFitScale.value
  const totalScale = fitScale * zoom.value
  currentTotalScale.value = totalScale
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

  // 页面居中偏移 — 使用缓存值，仅在缩放/容器变化时更新
  const pageCssW = page.width * totalScale
  const pageCssH = page.height * totalScale
  const centerX = currentCenterX.value || (containerW - pageCssW) / 2
  const centerY = currentCenterY.value || (containerH - pageCssH) / 2

  const ctx = canvas.getContext("2d")
  if (!ctx) return

  ctx.clearRect(0, 0, canvas.width, canvas.height)
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)

  // 居中 + 用户平移
  ctx.translate(panX.value + centerX * dpr, panY.value + centerY * dpr)

  renderer.render(ctx, page, totalScale)

  // 悬停高亮
  if (props.hoveredPersonId) {
    for (const region of page.hitRegions) {
      if (region.entry.personId === props.hoveredPersonId) {
        ctx.save()
        if (totalScale !== 1) ctx.scale(totalScale, totalScale)
        ctx.fillStyle = "rgba(196, 58, 49, 0.12)"
        ctx.fillRect(region.rect.x, region.rect.y, region.rect.width, region.rect.height)
        ctx.restore()
      }
    }
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
  }
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
  currentCenterX.value = newCx
  currentCenterY.value = newCy
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

// 模板 / 族谱数据变化 → 完整重置（entries 变化不重置，避免微调时跳动）
watch(
  () => [props.publicationData, props.canvasId] as const,
  () => {
    zoom.value = 0.3
    panX.value = 0
    panY.value = 0
    currentFitScale.value = 0
    currentCenterX.value = 0
    currentCenterY.value = 0
    runLayout()
    nextTick(() => renderCanvas())
  },
  { deep: false },
)

// 字号 / 行距 / 栏数 / 字体微调 → 保留 zoom/pan 位置
watch(
  () => [props.fontSize, props.lineHeight, props.columns, props.fontFamily] as const,
  () => {
    runLayout()
    nextTick(() => renderCanvas())
  },
  { deep: false },
)

watch(
  () => [props.sheetNumber, props.pageData] as const,
  () => { runLayout(); nextTick(() => renderCanvas()) },
)

watch(
  () => props.hoveredPersonId,
  () => nextTick(() => renderCanvas()),
)

defineExpose({
  reloadPreview: () => { runLayout(); nextTick(() => renderCanvas()) },
  composedPages,
  zoom,
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

  <!-- 沉浸按钮 -->
  <button v-if="layoutReady" class="immersive-btn" @click="toggleImmersive" :title="immersive ? '退出沉浸' : '沉浸预览'">
    {{ immersive ? '✕' : '⛶' }}
  </button>


</template>

<style scoped>
.page-canvas {
  display: block;
  cursor: crosshair;
  box-shadow: 0 2px 16px rgba(0, 0, 0, 0.10);
  border-radius: 2px;
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



/* ── 沉浸预览模式 ── */
.immersive-btn { position: absolute; top: 8px; right: 8px; z-index: 3; }
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
