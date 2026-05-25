<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { calculateRevealPan, type RevealPersonOptions } from '../lib/canvasViewport'
import type { KinshipTerm } from '../lib/kinship'
import type { Person, PublicationData, PublicationLayout, PublicationSettings } from '../types/family'
import PersonCardSvg from './PersonCardSvg.vue'

const props = defineProps<{
  publication: PublicationData
  settings: PublicationSettings
  layout: PublicationLayout
  selectedPersonId: string
  hoveredPersonId?: string | null
  relationshipToSelected?: KinshipTerm | null
  kinshipNotes?: Record<string, string> | null
  panX: number
  panY: number
}>()

const emit = defineEmits<{
  (event: 'select-person', personId: string): void
  (event: 'hover-person', personId: string | null): void
  (event: 'update-zoom', zoom: number): void
  (event: 'update:panX', x: number): void
  (event: 'update:panY', y: number): void
}>()

const svgRef = ref<SVGSVGElement | null>(null)
const viewportRef = ref<HTMLDivElement | null>(null)
const minimapContainerRef = ref<HTMLDivElement | null>(null)
const minimapCanvasRef = ref<HTMLCanvasElement | null>(null)
const isDragging = ref(false)
const viewportWidth = ref(0)
const viewportHeight = ref(0)
const isMinimapDragging = ref(false)

// Theme adaptation
const isSu = computed(() => false)
const isOu = computed(() => false)

const junctions = computed(() => {
  if (!isSu.value) return []
  const junctionPoints = new Set<string>()
  const endpoints = new Set<string>()

  props.layout.lines.forEach(line => {
    const p1 = `${line.x1},${line.y1}`
    const p2 = `${line.x2},${line.y2}`
    if (endpoints.has(p1)) junctionPoints.add(p1)
    if (endpoints.has(p2)) junctionPoints.add(p2)
    endpoints.add(p1)
    endpoints.add(p2)
  })

  // Detect T-junctions
  props.layout.lines.forEach(line => {
    const p1 = { x: line.x1, y: line.y1 }
    const p2 = { x: line.x2, y: line.y2 }
    props.layout.lines.forEach(other => {
      const op1 = { x: other.x1, y: other.y1 }
      const op2 = { x: other.x2, y: other.y2 }
      if (!((op1.x === p1.x && op1.y === p1.y) || (op1.x === p2.x && op1.y === p2.y))) {
        if (isPointOnSegment(op1, p1, p2)) junctionPoints.add(`${op1.x},${op1.y}`)
      }
      if (!((op2.x === p1.x && op2.y === p1.y) || (op2.x === p2.x && op2.y === p2.y))) {
        if (isPointOnSegment(op2, p1, p2)) junctionPoints.add(`${op2.x},${op2.y}`)
      }
    })
  })

  return Array.from(junctionPoints).map(s => {
    const [x, y] = s.split(',').map(Number)
    return { x, y }
  })
})

function isPointOnSegment(p: { x: number; y: number }, a: { x: number; y: number }, b: { x: number; y: number }) {
  if (a.x === b.x && p.x === a.x) {
    return p.y > Math.min(a.y, b.y) && p.y < Math.max(a.y, b.y)
  }
  if (a.y === b.y && p.y === a.y) {
    return p.x > Math.min(a.x, b.x) && p.x < Math.max(a.x, b.x)
  }
  return false
}

function setPan(x: number, y: number) {
  emit('update:panX', x)
  emit('update:panY', y)
}

let pendingSelectPersonId = ''
let dragStartX = 0
let dragStartY = 0
let panStartX = 0
let panStartY = 0
let resizeObserver: ResizeObserver | null = null
let rafId: number | null = null
let pinchStartDist = 0
let pinchStartZoom = 0
let lastMoveTime = 0
let lastMoveX = 0
let lastMoveY = 0
let velocityX = 0
let velocityY = 0
let inertiaRafId: number | null = null
let pinchMidX = 0
let pinchMidY = 0

const MINIMAP_WIDTH = 220
const MINIMAP_HEIGHT = 164
const DRAG_SELECT_THRESHOLD = 5

const MINIMAP_COLORS = {
  male: '#5b6e8a',
  female: '#c47a5a',
  unknown: '#b5a99a',
  selected: '#d4a853',
}

const stageStyle = computed(() => ({
  width: `${props.layout.width * props.settings.zoom}px`,
  height: `${props.layout.height * props.settings.zoom}px`,
  '--paper-width': `${props.layout.paperPixelWidth * props.settings.zoom}px`,
  '--paper-height': `${props.layout.paperPixelHeight * props.settings.zoom}px`,
}))

const viewportStyle = computed(() => ({
  '--grid-offset-x': `${props.panX}px`,
  '--grid-offset-y': `${props.panY}px`,
}))

const cameraStyle = computed(() => ({
  transform: `translate3d(calc(-50% + ${props.panX}px), calc(-50% + ${props.panY}px), 0)`,
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
  const worldLeft = props.layout.width / 2 - visibleWorldWidth / 2 - props.panX / props.settings.zoom
  const worldTop = props.layout.height / 2 - visibleWorldHeight / 2 - props.panY / props.settings.zoom
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
      const size = isSelected ? 6 : 5

      ctx.fillRect(x - size / 2, y - size / 2, size, size)
    })
  })
}

watch(
  () => [props.layout.cards, props.selectedPersonId, minimapData.value.scale],
  () => {
    drawMinimapCanvas()
  },
  { immediate: true, deep: true },
)

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

function handleSelect(personId: string) {
  emit('select-person', personId)
}

function handleHoverPerson(personId: string | null) {
  emit('hover-person', personId)
}

function resolvePerson(personId: string): Person {
  return props.publication.people[personId]
}

const CARD_TO_SCREEN_RATIO = 1

function getCardScreenPosition(personId: string) {
  const card = props.layout.cards.find((item) => item.personId === personId)
  if (!card) return null
  return {
    x: (card.x + card.width / 2) * props.settings.zoom * CARD_TO_SCREEN_RATIO + props.panX,
    y: (card.y + card.height / 2) * props.settings.zoom * CARD_TO_SCREEN_RATIO + props.panY,
  }
}

function revealPerson(personId: string, options: RevealPersonOptions = {}) {
  const card = props.layout.cards.find((item) => item.personId === personId)
  if (!card || !viewportRef.value) return false

  const result = calculateRevealPan({
    viewportWidth: viewportRef.value.clientWidth,
    viewportHeight: viewportRef.value.clientHeight,
    layoutWidth: props.layout.width,
    layoutHeight: props.layout.height,
    zoom: props.settings.zoom,
    panX: props.panX,
    panY: props.panY,
    card,
    ...options,
  })
  if (!result.changed) return false
  emit('update:panX', result.panX)
  emit('update:panY', result.panY)
  return true
}

defineExpose({ getSvgElement: () => svgRef.value, resetView, revealPerson, getCardScreenPosition })

function updateViewportSize() {
  if (!viewportRef.value) {
    return
  }

  viewportWidth.value = viewportRef.value.clientWidth
  viewportHeight.value = viewportRef.value.clientHeight
}

function handlePointerDown(event: PointerEvent) {
  cancelInertia()
  const target = event.target as Element | null
  pendingSelectPersonId = target?.closest<SVGGElement>('.person-card')?.dataset.personId ?? ''
  isDragging.value = true
  dragStartX = event.clientX
  dragStartY = event.clientY
  panStartX = props.panX
  panStartY = props.panY
  lastMoveTime = 0
  velocityX = 0
  velocityY = 0
  viewportRef.value?.setPointerCapture(event.pointerId)
}

function handlePointerMove(event: PointerEvent) {
  if (!isDragging.value) {
    return
  }

  const now = performance.now()
  const deltaX = event.clientX - dragStartX
  const deltaY = event.clientY - dragStartY

  if (Math.hypot(deltaX, deltaY) > DRAG_SELECT_THRESHOLD) {
    pendingSelectPersonId = ''
  }

  if (lastMoveTime > 0) {
    const dt = now - lastMoveTime
    if (dt > 5) {
      velocityX = ((event.clientX - lastMoveX) / dt) * 16
      velocityY = ((event.clientY - lastMoveY) / dt) * 16
    }
  }
  lastMoveTime = now
  lastMoveX = event.clientX
  lastMoveY = event.clientY

  setPan(panStartX + deltaX, panStartY + deltaY)
}

function cancelInertia() {
  if (inertiaRafId !== null) {
    cancelAnimationFrame(inertiaRafId)
    inertiaRafId = null
  }
}

const INERTIA_FRICTION = 0.94
const INERTIA_STOP_THRESHOLD = 0.5

function startInertia() {
  cancelInertia()
  const vx = velocityX
  const vy = velocityY
  if (Math.abs(vx) < INERTIA_STOP_THRESHOLD && Math.abs(vy) < INERTIA_STOP_THRESHOLD) return
  let cvx = vx
  let cvy = vy
  function step() {
    cvx *= INERTIA_FRICTION
    cvy *= INERTIA_FRICTION
    if (Math.abs(cvx) < INERTIA_STOP_THRESHOLD && Math.abs(cvy) < INERTIA_STOP_THRESHOLD) {
      inertiaRafId = null
      return
    }
    setPan(props.panX + cvx, props.panY + cvy)
    inertiaRafId = requestAnimationFrame(step)
  }
  inertiaRafId = requestAnimationFrame(step)
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

  const totalDrag = Math.hypot(event.clientX - dragStartX, event.clientY - dragStartY)
  if (selectPersonId && totalDrag <= DRAG_SELECT_THRESHOLD) {
    handleSelect(selectPersonId)
  } else if (totalDrag > DRAG_SELECT_THRESHOLD) {
    startInertia()
  }
}

function handleWheel(event: WheelEvent) {
  event.preventDefault()
  cancelInertia()
  updateViewportSize()

  if (!viewportRef.value) {
    return
  }

  const currentZoom = props.settings.zoom
  const nextZoom = clamp(Number((currentZoom * Math.exp(-event.deltaY * 0.0016)).toFixed(2)), 0.10, 1.35)

  if (nextZoom === currentZoom) {
    return
  }

  const rect = viewportRef.value.getBoundingClientRect()
  const pointerX = event.clientX - rect.left
  const pointerY = event.clientY - rect.top
  const worldX = props.layout.width / 2 + (pointerX - rect.width / 2 - props.panX) / currentZoom
  const worldY = props.layout.height / 2 + (pointerY - rect.height / 2 - props.panY) / currentZoom

  const nextPanX = pointerX - rect.width / 2 - (worldX - props.layout.width / 2) * nextZoom
  const nextPanY = pointerY - rect.height / 2 - (worldY - props.layout.height / 2) * nextZoom

  setPan(nextPanX, nextPanY)

  emit('update-zoom', nextZoom)
}

function handleTouchStart(event: TouchEvent) {
  if (event.touches.length === 2) {
    updateViewportSize()
    const dx = event.touches[0].clientX - event.touches[1].clientX
    const dy = event.touches[0].clientY - event.touches[1].clientY
    pinchStartDist = Math.hypot(dx, dy)
    pinchStartZoom = props.settings.zoom
    pinchMidX = (event.touches[0].clientX + event.touches[1].clientX) / 2
    pinchMidY = (event.touches[0].clientY + event.touches[1].clientY) / 2
  }
}

function handleTouchMove(event: TouchEvent) {
  if (event.touches.length === 2) {
    event.preventDefault()
    const dx = event.touches[0].clientX - event.touches[1].clientX
    const dy = event.touches[0].clientY - event.touches[1].clientY
    const dist = Math.hypot(dx, dy)
    const scale = dist / pinchStartDist
    const nextZoom = clamp(Number((pinchStartZoom * scale).toFixed(2)), 0.10, 1.35)

    if (nextZoom === props.settings.zoom || !viewportRef.value) return

    const rect = viewportRef.value.getBoundingClientRect()
    const midX = pinchMidX - rect.left
    const midY = pinchMidY - rect.top
    const worldX = props.layout.width / 2 + (midX - rect.width / 2 - props.panX) / props.settings.zoom
    const worldY = props.layout.height / 2 + (midY - rect.height / 2 - props.panY) / props.settings.zoom

    const nextPanX = midX - rect.width / 2 - (worldX - props.layout.width / 2) * nextZoom
    const nextPanY = midY - rect.height / 2 - (worldY - props.layout.height / 2) * nextZoom

    setPan(nextPanX, nextPanY)
    emit('update-zoom', nextZoom)
  }
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

  setPan(
    (props.layout.width / 2 - worldX) * props.settings.zoom,
    (props.layout.height / 2 - worldY) * props.settings.zoom
  )
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
  if (!props.layout.cards.length) {
    setPan(0, 0)
    return
  }
  // 找到始祖（y 最小的卡片）并居中到屏幕正中央
  const rootCard = props.layout.cards.reduce((min, card) => card.y < min.y ? card : min)
  const cx = rootCard.x + rootCard.width / 2
  const cy = rootCard.y + rootCard.height / 2
  setPan(
    (props.layout.width / 2 - cx) * props.settings.zoom,
    (props.layout.height / 2 - cy) * props.settings.zoom
  )
}

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
    @touchstart.passive="handleTouchStart"
    @touchmove.prevent="handleTouchMove"
  >
    <div class="canvas-camera" :style="cameraStyle">
      <div id="publication-canvas-root" class="publication-stage" :style="stageStyle">
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
              <feDropShadow dx="0" dy="6" stdDeviation="8" flood-color="#6d4f31" flood-opacity="0.18" />
            </filter>
            <!-- Ou Grid Pattern -->
            <pattern v-if="isOu" id="ou-grid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="var(--color-neutral-4)" stroke-width="0.5" />
            </pattern>
          </defs>

          <!-- Ou Grid Background -->
          <rect v-if="isOu" width="100%" height="100%" fill="url(#ou-grid)" />

          <g class="tree-lines" :style="isSu ? { filter: 'blur(0.3px)' } : {}">
            <line
              v-for="(line, index) in layout.lines"
              :key="`line-${index}`"
              :x1="line.x1"
              :y1="line.y1"
              :x2="line.x2"
              :y2="line.y2"
              :stroke-linejoin="isSu ? 'round' : 'miter'"
            />
            <!-- Su-style Pearl Connectors -->
            <circle
              v-for="(pt, idx) in junctions"
              :key="`junction-${idx}`"
              :cx="pt.x"
              :cy="pt.y"
              r="2.5"
              class="su-pearl"
            />
          </g>

          <g :filter="isDragging ? undefined : 'url(#cardShadow)'">
            <PersonCardSvg
              v-for="card in layout.cards"
              :key="card.personId"
              :data-person-id="card.personId"
              :person="resolvePerson(card.personId)"
              :card="card"
              :settings="settings"
              :selected="card.personId === selectedPersonId"
              :kinshipNote="kinshipNotes?.[card.personId] ?? null"
              @select="handleSelect"
              @hover="handleHoverPerson"
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
