<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'

import { calculateRevealPan, type RevealPersonOptions } from '../lib/canvasViewport'
import type { Person, PublicationData, PublicationLayout, PublicationSettings } from '../types/family'
import PersonCardSvg from './PersonCardSvg.vue'

const props = defineProps<{
  publication: PublicationData
  settings: PublicationSettings
  layout: PublicationLayout
  selectedPersonId: string
}>()

const emit = defineEmits<{
  (event: 'select-person', personId: string): void
  (event: 'update-zoom', zoom: number): void
}>()

const svgRef = ref<SVGSVGElement | null>(null)
const viewportRef = ref<HTMLDivElement | null>(null)
const minimapContainerRef = ref<HTMLDivElement | null>(null)
const minimapCanvasRef = ref<HTMLCanvasElement | null>(null)
const isDragging = ref(false)
const panX = ref(0)
const panY = ref(0)
const viewportWidth = ref(0)
const viewportHeight = ref(0)
const isMinimapDragging = ref(false)

let pendingSelectPersonId = ''
let dragStartX = 0
let dragStartY = 0
let panStartX = 0
let panStartY = 0
let resizeObserver: ResizeObserver | null = null
let rafId: number | null = null

const MINIMAP_WIDTH = 220
const MINIMAP_HEIGHT = 164
const DRAG_SELECT_THRESHOLD = 5

const MINIMAP_COLORS = {
  male: '#4b7bec',
  female: '#eb3b5a',
  unknown: '#a5b1c2',
  selected: '#f7b731',
}

const stageStyle = computed(() => ({
  width: `${props.layout.width * props.settings.zoom}px`,
  height: `${props.layout.height * props.settings.zoom}px`,
  '--paper-width': `${props.layout.paperPixelWidth * props.settings.zoom}px`,
  '--paper-height': `${props.layout.paperPixelHeight * props.settings.zoom}px`,
}))

const viewportStyle = computed(() => ({
  '--grid-offset-x': `${panX.value}px`,
  '--grid-offset-y': `${panY.value}px`,
}))

const cameraStyle = computed(() => ({
  left: `calc(50% + ${panX.value}px)`,
  top: `calc(50% + ${panY.value}px)`,
}))

const minimapData = computed(() => {
  const padding = 12
  const scale = Math.min((MINIMAP_WIDTH - padding * 2) / props.layout.width, (MINIMAP_HEIGHT - padding * 2) / props.layout.height)
  const paperWidth = props.layout.width * scale
  const paperHeight = props.layout.height * scale
  const paperOffsetX = (MINIMAP_WIDTH - paperWidth) / 2
  const paperOffsetY = (MINIMAP_HEIGHT - paperHeight) / 2
  const visibleWorldWidth = viewportWidth.value / props.settings.zoom
  const visibleWorldHeight = viewportHeight.value / props.settings.zoom
  const worldLeft = props.layout.width / 2 - visibleWorldWidth / 2 - panX.value / props.settings.zoom
  const worldTop = props.layout.height / 2 - visibleWorldHeight / 2 - panY.value / props.settings.zoom
  const worldRight = worldLeft + visibleWorldWidth
  const worldBottom = worldTop + visibleWorldHeight
  const clippedLeft = clamp(worldLeft, 0, props.layout.width)
  const clippedTop = clamp(worldTop, 0, props.layout.height)
  const clippedRight = clamp(worldRight, 0, props.layout.width)
  const clippedBottom = clamp(worldBottom, 0, props.layout.height)

  return {
    scale,
    paperWidth,
    paperHeight,
    paperOffsetX,
    paperOffsetY,
    viewportRect: {
      x: paperOffsetX + clippedLeft * scale,
      y: paperOffsetY + clippedTop * scale,
      width: Math.max(16, (clippedRight - clippedLeft) * scale),
      height: Math.max(16, (clippedBottom - clippedTop) * scale),
    },
  }
})

const BUFFER_SIZE = 500

const visibleWorldRect = computed(() => {
  const zoom = props.settings.zoom
  const visibleWorldWidth = viewportWidth.value / zoom
  const visibleWorldHeight = viewportHeight.value / zoom

  // 计算当前视口中心在世界坐标系中的位置
  const worldLeft = props.layout.width / 2 - visibleWorldWidth / 2 - panX.value / zoom
  const worldTop = props.layout.height / 2 - visibleWorldHeight / 2 - panY.value / zoom

  return {
    left: worldLeft - BUFFER_SIZE,
    top: worldTop - BUFFER_SIZE,
    right: worldLeft + visibleWorldWidth + BUFFER_SIZE,
    bottom: worldTop + visibleWorldHeight + BUFFER_SIZE,
  }
})

const visibleCards = computed(() => {
  const rect = visibleWorldRect.value
  return props.layout.cards.filter((card) => {
    // 简单的矩形碰撞检测：卡片是否与视口(含缓冲区)相交
    const cardRight = card.x + card.width
    const cardBottom = card.y + card.height

    return !(
      card.x > rect.right ||
      cardRight < rect.left ||
      card.y > rect.bottom ||
      cardBottom < rect.top
    )
  })
})

function drawMinimapCanvas() {
  if (rafId) cancelAnimationFrame(rafId)
  rafId = requestAnimationFrame(() => {
    const canvas = minimapCanvasRef.value
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    ctx.clearRect(0, 0, canvas.width, canvas.height)

    const scale = minimapData.value.scale

    props.layout.cards.forEach((card) => {
      const person = props.publication.people[card.personId]
      const isSelected = card.personId === props.selectedPersonId

      if (isSelected) {
        ctx.fillStyle = MINIMAP_COLORS.selected
      } else {
        ctx.fillStyle = person?.gender === 'female' ? MINIMAP_COLORS.female : person?.gender === 'male' ? MINIMAP_COLORS.male : MINIMAP_COLORS.unknown
      }

      const x = (card.x + card.width / 2) * scale
      const y = (card.y + card.height / 2) * scale
      const size = isSelected ? 4 : 3

      ctx.fillRect(x - size / 2, y - size / 2, size, size)
    })
  })
}

import { watch } from 'vue'

watch(
  () => [props.layout.cards, props.selectedPersonId, minimapData.value.scale],
  () => {
    drawMinimapCanvas()
  },
  { immediate: true, deep: true },
)

function resolvePerson(personId: string): Person {
  return props.publication.people[personId]
}

function handleSelect(personId: string) {
  emit('select-person', personId)
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

function updateViewportSize() {
  if (!viewportRef.value) {
    return
  }

  viewportWidth.value = viewportRef.value.clientWidth
  viewportHeight.value = viewportRef.value.clientHeight
}

function handlePointerDown(event: PointerEvent) {
  const target = event.target as Element | null
  pendingSelectPersonId = target?.closest<SVGGElement>('.person-card')?.dataset.personId ?? ''
  isDragging.value = true
  dragStartX = event.clientX
  dragStartY = event.clientY
  panStartX = panX.value
  panStartY = panY.value
  viewportRef.value?.setPointerCapture(event.pointerId)
}

function handlePointerMove(event: PointerEvent) {
  if (!isDragging.value) {
    return
  }

  const deltaX = event.clientX - dragStartX
  const deltaY = event.clientY - dragStartY

  if (Math.hypot(deltaX, deltaY) > DRAG_SELECT_THRESHOLD) {
    pendingSelectPersonId = ''
  }

  panX.value = panStartX + deltaX
  panY.value = panStartY + deltaY
}

function finishDrag(event: PointerEvent) {
  if (!isDragging.value) {
    return
  }

  const selectPersonId = pendingSelectPersonId
  pendingSelectPersonId = ''
  isDragging.value = false

  if (viewportRef.value?.hasPointerCapture(event.pointerId)) {
    viewportRef.value.releasePointerCapture(event.pointerId)
  }

  if (selectPersonId && Math.hypot(event.clientX - dragStartX, event.clientY - dragStartY) <= DRAG_SELECT_THRESHOLD) {
    handleSelect(selectPersonId)
  }
}

function handleWheel(event: WheelEvent) {
  event.preventDefault()
  updateViewportSize()

  if (!viewportRef.value) {
    return
  }

  const currentZoom = props.settings.zoom
  const nextZoom = clamp(Number((currentZoom * Math.exp(-event.deltaY * 0.0016)).toFixed(2)), 0.55, 1.35)

  if (nextZoom === currentZoom) {
    return
  }

  const rect = viewportRef.value.getBoundingClientRect()
  const pointerX = event.clientX - rect.left
  const pointerY = event.clientY - rect.top
  const worldX = props.layout.width / 2 + (pointerX - rect.width / 2 - panX.value) / currentZoom
  const worldY = props.layout.height / 2 + (pointerY - rect.height / 2 - panY.value) / currentZoom

  panX.value = pointerX - rect.width / 2 - (worldX - props.layout.width / 2) * nextZoom
  panY.value = pointerY - rect.height / 2 - (worldY - props.layout.height / 2) * nextZoom

  emit('update-zoom', nextZoom)
}

function updatePanFromMinimap(clientX: number, clientY: number) {
  if (!minimapContainerRef.value) {
    return
  }

  const rect = minimapContainerRef.value.getBoundingClientRect()
  const localX = clientX - rect.left
  const localY = clientY - rect.top
  const worldX = clamp((localX - minimapData.value.paperOffsetX) / minimapData.value.scale, 0, props.layout.width)
  const worldY = clamp((localY - minimapData.value.paperOffsetY) / minimapData.value.scale, 0, props.layout.height)

  panX.value = (props.layout.width / 2 - worldX) * props.settings.zoom
  panY.value = (props.layout.height / 2 - worldY) * props.settings.zoom
}

function handleMinimapPointerDown(event: PointerEvent) {
  event.stopPropagation()
  isMinimapDragging.value = true
  minimapContainerRef.value?.setPointerCapture(event.pointerId)
  updatePanFromMinimap(event.clientX, event.clientY)
}

function handleMinimapPointerMove(event: PointerEvent) {
  if (!isMinimapDragging.value) {
    return
  }

  event.stopPropagation()
  updatePanFromMinimap(event.clientX, event.clientY)
}

function handleMinimapPointerUp(event: PointerEvent) {
  if (!isMinimapDragging.value) {
    return
  }

  event.stopPropagation()
  isMinimapDragging.value = false

  if (minimapContainerRef.value?.hasPointerCapture(event.pointerId)) {
    minimapContainerRef.value.releasePointerCapture(event.pointerId)
  }
}

function resetView() {
  panX.value = 0
  panY.value = 0
}

function revealPerson(personId: string, options: RevealPersonOptions = {}) {
  updateViewportSize()

  const card = props.layout.cards.find((item) => item.personId === personId)
  if (!card || !viewportRef.value) {
    return
  }

  const nextPan = calculateRevealPan({
    viewportWidth: viewportWidth.value,
    viewportHeight: viewportHeight.value,
    layoutWidth: props.layout.width,
    layoutHeight: props.layout.height,
    zoom: props.settings.zoom,
    panX: panX.value,
    panY: panY.value,
    card,
    ...options,
  })

  if (!nextPan.changed) {
    return
  }

  panX.value = nextPan.panX
  panY.value = nextPan.panY
}

onMounted(() => {
  updateViewportSize()

  if (viewportRef.value) {
    resizeObserver = new ResizeObserver(() => updateViewportSize())
    resizeObserver.observe(viewportRef.value)
  }
})

onBeforeUnmount(() => {
  resizeObserver?.disconnect()
  if (rafId) cancelAnimationFrame(rafId)
})

defineExpose({
  getSvgElement: () => svgRef.value,
  resetView,
  revealPerson,
})
</script>

<template>
  <div
    ref="viewportRef"
    class="canvas-viewport"
    :class="{ 'canvas-viewport--dragging': isDragging }"
    :style="viewportStyle"
    @pointerdown="handlePointerDown"
    @pointermove="handlePointerMove"
    @pointerup="finishDrag"
    @pointercancel="finishDrag"
    @wheel="handleWheel"
  >
    <div class="canvas-camera" :style="cameraStyle">
      <div class="publication-stage" :style="stageStyle">
        <svg
          ref="svgRef"
          class="publication-svg"
          xmlns="http://www.w3.org/2000/svg"
          :viewBox="`0 0 ${layout.width} ${layout.height}`"
          :width="layout.width * settings.zoom"
          :height="layout.height * settings.zoom"
        >
          <defs>
            <filter id="cardShadow" x="-30%" y="-30%" width="160%" height="160%">
              <feDropShadow dx="0" dy="12" stdDeviation="12" flood-color="#6d4f31" flood-opacity="0.12" />
            </filter>
          </defs>

          <g class="tree-lines">
            <line
              v-for="(line, index) in layout.lines"
              :key="`line-${index}`"
              :x1="line.x1"
              :y1="line.y1"
              :x2="line.x2"
              :y2="line.y2"
            />
          </g>

          <g filter="url(#cardShadow)">
            <PersonCardSvg
              v-for="card in visibleCards"
              :key="card.personId"
              :data-person-id="card.personId"
              :person="resolvePerson(card.personId)"
              :card="card"
              :settings="settings"
              :selected="card.personId === selectedPersonId"
              @select="handleSelect"
            />
          </g>
        </svg>
      </div>
    </div>

    <div
      ref="minimapContainerRef"
      class="canvas-minimap"
      @pointerdown="handleMinimapPointerDown"
      @pointermove="handleMinimapPointerMove"
      @pointerup="handleMinimapPointerUp"
      @pointercancel="handleMinimapPointerUp"
    >
      <div class="canvas-minimap__header">
        <span>Mini Map</span>
        <strong>{{ Math.round(settings.zoom * 100) }}%</strong>
      </div>

      <div class="canvas-minimap__stage">
        <div
          class="canvas-minimap__paper"
          :style="{
            left: `${minimapData.paperOffsetX}px`,
            top: `${minimapData.paperOffsetY}px`,
            width: `${minimapData.paperWidth}px`,
            height: `${minimapData.paperHeight}px`,
          }"
        >
          <canvas
            ref="minimapCanvasRef"
            :width="minimapData.paperWidth"
            :height="minimapData.paperHeight"
            class="canvas-minimap__canvas"
          />

          <div
            class="canvas-minimap__viewport"
            :style="{
              left: `${minimapData.viewportRect.x - minimapData.paperOffsetX}px`,
              top: `${minimapData.viewportRect.y - minimapData.paperOffsetY}px`,
              width: `${minimapData.viewportRect.width}px`,
              height: `${minimapData.viewportRect.height}px`,
            }"
          />
        </div>
      </div>
    </div>
  </div>
</template>
