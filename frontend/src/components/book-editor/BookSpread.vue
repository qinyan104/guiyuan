<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from "vue"
import BookPage from "./BookPage.vue"
import type { BookLayout, BookPaginationResult } from "../../types/bookDocument"

const props = defineProps<{
  pagination: BookPaginationResult
  title?: string
  currentPageIndex: number
  layout: BookLayout
  viewMode: "single" | "spread"
  zoom: number
  selectedBlockIndex?: number | null
}>()

const emit = defineEmits<{
  updateBlock: [blockIndex: number, field: "text" | "note" | "title" | "subtitle", text: string]
  selectBlock: [blockIndex: number]
  goToPage: [pageNumber: number]
  zoom: [delta: number]
}>()

const stageRef = ref<HTMLElement | null>(null)
const contentRef = ref<HTMLElement | null>(null)
const stageWidth = ref(0)
const stageHeight = ref(0)
const isPanning = ref(false)
const pages = computed(() => props.pagination.pages)
const currentPage = computed(() => pages.value[props.currentPageIndex] ?? pages.value[0] ?? null)
const isCover = computed(() => currentPage.value?.blocks.some((item) => item.block.type === "cover") ?? false)
const spreadPages = computed(() => {
  if (props.viewMode === "single" || isCover.value) {
    return { right: currentPage.value, left: null }
  }
  const bodyIndex = Math.max(0, props.currentPageIndex - 1)
  const rightIndex = 1 + Math.floor(bodyIndex / 2) * 2
  return {
    right: pages.value[rightIndex] ?? null,
    left: pages.value[rightIndex + 1] ?? null,
  }
})
const singleScale = computed(() => fitScale(1, 0.56) * props.zoom)
const spreadScale = computed(() => fitScale(2, 0.48) * props.zoom)
const blankLeafStyle = computed(() => ({
  width: `${props.pagination.metrics.pageWidth * spreadScale.value}px`,
  height: `${props.pagination.metrics.pageHeight * spreadScale.value}px`,
}))

let resizeObserver: ResizeObserver | null = null
let panPointerId: number | null = null
let panStartX = 0
let panStartY = 0
let panStartScrollLeft = 0
let panStartScrollTop = 0
let panLastX = 0
let panLastY = 0
let panLastTime = 0
let panVelocityX = 0
let panVelocityY = 0
let inertiaFrame = 0
let suppressClick = false

function fitScale(pageCount: 1 | 2, max: number) {
  if (!stageWidth.value || !stageHeight.value) return pageCount === 1 ? 0.56 : 0.46
  const chromeWidth = pageCount === 1 ? 88 : 160
  const chromeHeight = pageCount === 1 ? 72 : 96
  const spine = pageCount === 2 ? 18 : 0
  const byWidth = (stageWidth.value - chromeWidth - spine) / (props.pagination.metrics.pageWidth * pageCount)
  const byHeight = (stageHeight.value - chromeHeight) / props.pagination.metrics.pageHeight
  return Math.max(0.3, Math.min(max, byWidth, byHeight))
}

function watchSize() {
  if (!stageRef.value) return
  const rect = stageRef.value.getBoundingClientRect()
  stageWidth.value = rect.width
  stageHeight.value = rect.height
}

function stopInertia() {
  cancelAnimationFrame(inertiaFrame)
  inertiaFrame = 0
}

async function zoomWithWheel(event: WheelEvent) {
  const stage = stageRef.value
  const book = contentRef.value?.firstElementChild as HTMLElement | null
  if (!stage || !book) return
  stopInertia()
  const before = book.getBoundingClientRect()
  const clientX = event.clientX
  const clientY = event.clientY
  const anchorX = Math.max(0, Math.min(1, (clientX - before.left) / before.width))
  const anchorY = Math.max(0, Math.min(1, (clientY - before.top) / before.height))
  const unit = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? stageHeight.value : 1
  const delta = Math.max(-0.08, Math.min(0.08, -event.deltaY * unit / 1000))
  if (!delta) return
  emit("zoom", delta)
  await nextTick()
  const after = book.getBoundingClientRect()
  stage.scrollLeft += after.left + after.width * anchorX - clientX
  stage.scrollTop += after.top + after.height * anchorY - clientY
}

function startPan(event: PointerEvent) {
  const stage = stageRef.value
  const target = event.target as HTMLElement | null
  if (!stage || event.button !== 0 || target?.closest("button, input, textarea, select, a, [contenteditable]")) return
  stopInertia()
  panPointerId = event.pointerId
  panStartX = event.clientX
  panStartY = event.clientY
  panStartScrollLeft = stage.scrollLeft
  panStartScrollTop = stage.scrollTop
  panLastX = event.clientX
  panLastY = event.clientY
  panLastTime = performance.now()
  panVelocityX = 0
  panVelocityY = 0
  stage.setPointerCapture(event.pointerId)
}

function panStage(event: PointerEvent) {
  const stage = stageRef.value
  if (!stage || event.pointerId !== panPointerId) return
  const deltaX = event.clientX - panStartX
  const deltaY = event.clientY - panStartY
  if (!isPanning.value && Math.hypot(deltaX, deltaY) < 4) return
  isPanning.value = true
  event.preventDefault()
  stage.scrollLeft = panStartScrollLeft - deltaX
  stage.scrollTop = panStartScrollTop - deltaY
  const now = performance.now()
  const elapsed = Math.max(1, now - panLastTime)
  panVelocityX = -(event.clientX - panLastX) / elapsed * 16
  panVelocityY = -(event.clientY - panLastY) / elapsed * 16
  panLastX = event.clientX
  panLastY = event.clientY
  panLastTime = now
}

function startInertia() {
  const stage = stageRef.value
  if (!stage || Math.hypot(panVelocityX, panVelocityY) < 0.5) return
  let previousTime = performance.now()
  const move = (time: number) => {
    const frameScale = Math.min(2, (time - previousTime) / 16)
    previousTime = time
    panVelocityX *= Math.pow(0.9, frameScale)
    panVelocityY *= Math.pow(0.9, frameScale)
    const previousLeft = stage.scrollLeft
    const previousTop = stage.scrollTop
    stage.scrollLeft += panVelocityX * frameScale
    stage.scrollTop += panVelocityY * frameScale
    if (stage.scrollLeft === previousLeft) panVelocityX = 0
    if (stage.scrollTop === previousTop) panVelocityY = 0
    if (Math.hypot(panVelocityX, panVelocityY) >= 0.2) inertiaFrame = requestAnimationFrame(move)
  }
  inertiaFrame = requestAnimationFrame(move)
}

function finishPan(event: PointerEvent, inertial = true) {
  const stage = stageRef.value
  if (!stage || event.pointerId !== panPointerId) return
  suppressClick = isPanning.value
  if (inertial && isPanning.value && performance.now() - panLastTime < 80) startInertia()
  isPanning.value = false
  panPointerId = null
  if (stage.hasPointerCapture(event.pointerId)) stage.releasePointerCapture(event.pointerId)
}

function cancelPan(event: PointerEvent) {
  finishPan(event, false)
}

function stopDraggedClick(event: MouseEvent) {
  if (!suppressClick) return
  suppressClick = false
  event.preventDefault()
  event.stopPropagation()
}

onMounted(() => {
  watchSize()
  resizeObserver = new ResizeObserver(watchSize)
  if (stageRef.value) resizeObserver.observe(stageRef.value)
})

onBeforeUnmount(() => {
  stopInertia()
  resizeObserver?.disconnect()
})
</script>

<template>
  <main
    ref="stageRef"
    :class="['book-stage', { 'book-stage--single': viewMode === 'single' || isCover, 'is-panning': isPanning }]"
    @wheel.prevent="zoomWithWheel"
    @pointerdown="startPan"
    @pointermove="panStage"
    @pointerup="finishPan"
    @pointercancel="cancelPan"
    @click.capture="stopDraggedClick"
  >
    <div ref="contentRef" class="book-stage-content">
      <BookPage
        v-if="viewMode === 'single' || isCover"
        :page="currentPage"
        :bookTitle="title"
        :layout="layout"
        :metrics="pagination.metrics"
        :scale="singleScale"
        side="single"
        :selectedBlockIndex="selectedBlockIndex"
        @updateBlock="(blockIndex, field, text) => emit('updateBlock', blockIndex, field, text)"
        @selectBlock="emit('selectBlock', $event)"
        @goToPage="emit('goToPage', $event)"
      />
      <div v-else class="book-spread">
        <div class="spread-side spread-side--left">
          <BookPage
            v-if="spreadPages.left"
            :page="spreadPages.left"
            :bookTitle="title"
            :layout="layout"
            :metrics="pagination.metrics"
            :scale="spreadScale"
            side="left"
            framed
            :selectedBlockIndex="selectedBlockIndex"
            @updateBlock="(blockIndex, field, text) => emit('updateBlock', blockIndex, field, text)"
            @selectBlock="emit('selectBlock', $event)"
            @goToPage="emit('goToPage', $event)"
          />
          <div v-else class="blank-leaf" :style="blankLeafStyle" aria-hidden="true"></div>
        </div>
        <div class="book-spine" aria-hidden="true"></div>
        <div class="spread-side spread-side--right">
          <BookPage
            :page="spreadPages.right"
            :bookTitle="title"
            :layout="layout"
            :metrics="pagination.metrics"
            :scale="spreadScale"
            side="right"
            framed
            :selectedBlockIndex="selectedBlockIndex"
            @updateBlock="(blockIndex, field, text) => emit('updateBlock', blockIndex, field, text)"
            @selectBlock="emit('selectBlock', $event)"
            @goToPage="emit('goToPage', $event)"
          />
        </div>
      </div>
    </div>
  </main>
</template>

<style scoped>
.book-stage {
  min-width: 0;
  height: 100%;
  overflow: auto;
  overscroll-behavior: contain;
  cursor: grab;
  background:
    radial-gradient(circle at 50% 12%, rgba(255, 253, 250, 0.75), transparent 34%),
    linear-gradient(180deg, #eee7da, #e0d5c3);
}

.book-stage.is-panning {
  cursor: grabbing;
  user-select: none;
}

.book-stage.is-panning * {
  cursor: grabbing !important;
}

.book-stage-content {
  box-sizing: border-box;
  width: max-content;
  min-width: 100%;
  min-height: 100%;
  padding: 36px 44px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.book-stage--single .book-stage-content {
  align-items: flex-start;
}

.book-spread {
  display: grid;
  grid-template-columns: minmax(0, auto) 18px minmax(0, auto);
  align-items: stretch;
  padding: 18px 24px;
  background: #cdbfa9;
  box-shadow:
    0 30px 70px rgba(45, 34, 22, 0.2),
    inset 0 0 0 1px rgba(255, 246, 226, 0.24);
}

.spread-side {
  background: #f4ead8;
}

.blank-leaf {
  background:
    linear-gradient(90deg, rgba(122, 90, 56, 0.035), transparent 20%),
    #f8f0df;
}

.spread-side--left {
  box-shadow: inset -18px 0 28px rgba(76, 51, 28, 0.1);
}

.spread-side--right {
  box-shadow: inset 18px 0 28px rgba(76, 51, 28, 0.1);
}

.book-spine {
  background:
    linear-gradient(90deg, rgba(70, 47, 26, 0.16), rgba(255, 248, 236, 0.16), rgba(70, 47, 26, 0.18)),
    #bca98e;
}
</style>
