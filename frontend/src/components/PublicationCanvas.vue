<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { calculateRevealPan, type RevealPersonOptions } from '../lib/canvasViewport'
import type { KinshipTerm } from '../lib/kinship'
import { getPersonStatusLabel } from '../lib/personStatus'
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
const cameraRef = ref<HTMLDivElement | null>(null)
const stageRef = ref<HTMLDivElement | null>(null)
const isDragging = ref(false)
const isInertiaActive = ref(false)
const isZooming = ref(false)
const renderedZoom = ref(props.settings.zoom)
const viewportWidth = ref(0)
const viewportHeight = ref(0)
const isCanvasMoving = computed(() => isDragging.value || isInertiaActive.value || isZooming.value)

// Theme adaptation
const isSu = computed(() => false)
const isOu = computed(() => false)

const junctions = computed(() => {
  if (!isSu.value) return []
  const junctionPoints = new Set<string>()
  const endpoints = new Set<string>()

  const lines = props.layout.lines

  // Pass 1: collect shared endpoints
  for (const line of lines) {
    const p1 = `${line.x1},${line.y1}`
    const p2 = `${line.x2},${line.y2}`
    if (endpoints.has(p1)) junctionPoints.add(p1)
    if (endpoints.has(p2)) junctionPoints.add(p2)
    endpoints.add(p1)
    endpoints.add(p2)
  }

  // Pass 2: T-junction detection using spatial index (O(L) instead of O(L²))
  // Group axis-aligned lines by their fixed coordinate
  const verticalByX = new Map<number, { y1: number; y2: number }[]>()
  const horizontalByY = new Map<number, { x1: number; x2: number }[]>()

  for (const line of lines) {
    if (line.x1 === line.x2) {
      const yMin = Math.min(line.y1, line.y2)
      const yMax = Math.max(line.y1, line.y2)
      const arr = verticalByX.get(line.x1)
      if (arr) arr.push({ y1: yMin, y2: yMax })
      else verticalByX.set(line.x1, [{ y1: yMin, y2: yMax }])
    } else if (line.y1 === line.y2) {
      const xMin = Math.min(line.x1, line.x2)
      const xMax = Math.max(line.x1, line.x2)
      const arr = horizontalByY.get(line.y1)
      if (arr) arr.push({ x1: xMin, x2: xMax })
      else horizontalByY.set(line.y1, [{ x1: xMin, x2: xMax }])
    }
  }

  // Check each endpoint against perpendicular lines at that coordinate
  for (const line of lines) {
    const points = [
      { x: line.x1, y: line.y1 },
      { x: line.x2, y: line.y2 },
    ]
    for (const p of points) {
      const key = `${p.x},${p.y}`
      if (junctionPoints.has(key)) continue

      if (line.x1 === line.x2) {
        // Current line is vertical — check if point lies on any horizontal line at this y
        const horizontals = horizontalByY.get(p.y)
        if (horizontals) {
          for (const h of horizontals) {
            if (p.x > h.x1 && p.x < h.x2) { junctionPoints.add(key); break }
          }
        }
      } else if (line.y1 === line.y2) {
        // Current line is horizontal — check if point lies on any vertical line at this x
        const verticals = verticalByX.get(p.x)
        if (verticals) {
          for (const v of verticals) {
            if (p.y > v.y1 && p.y < v.y2) { junctionPoints.add(key); break }
          }
        }
      }
    }
  }

  return Array.from(junctionPoints).map(s => {
    const [x, y] = s.split(',').map(Number)
    return { x, y }
  })
})


function cameraTransform(x: number, y: number) {
  return `translate3d(calc(-50% + ${x}px), calc(-50% + ${y}px), 0)`
}

let localPanX = props.panX
let localPanY = props.panY
let localZoom = props.settings.zoom

function applyLocalViewport() {
  cameraRef.value?.style.setProperty('transform', cameraTransform(localPanX, localPanY))
  stageRef.value?.style.setProperty('transform', `scale(${localZoom / renderedZoom.value})`)
  viewportRef.value?.style.setProperty('--grid-offset-x', `${localPanX}px`)
  viewportRef.value?.style.setProperty('--grid-offset-y', `${localPanY}px`)
}

function commitViewport() {
  if (localPanX !== props.panX) emit('update:panX', localPanX)
  if (localPanY !== props.panY) emit('update:panY', localPanY)
}

function setPan(x: number, y: number, commit = false) {
  localPanX = x
  localPanY = y
  applyLocalViewport()
  if (commit) commitViewport()
}

let pendingSelectPersonId = ''
let dragStartX = 0
let dragStartY = 0
let panStartX = 0
let panStartY = 0
let resizeObserver: ResizeObserver | null = null
let pinchStartDist = 0
let pinchStartZoom = 0
let lastMoveTime = 0
let lastMoveX = 0
let lastMoveY = 0
let velocityX = 0
let velocityY = 0
let inertiaRafId: number | null = null
let panRafId: number | null = null
let pendingMoveX = 0
let pendingMoveY = 0
let pendingMoveTime = 0
let zoomIdleTimer: ReturnType<typeof setTimeout> | null = null
let pinchMidX = 0
let pinchMidY = 0

onBeforeUnmount(() => {
  if (inertiaRafId !== null) { cancelAnimationFrame(inertiaRafId); inertiaRafId = null }
  if (panRafId !== null) cancelAnimationFrame(panRafId)
  if (zoomIdleTimer !== null) clearTimeout(zoomIdleTimer)
})

const DRAG_SELECT_THRESHOLD = 5

const stageStyle = computed(() => ({
  width: `${props.layout.width * renderedZoom.value}px`,
  height: `${props.layout.height * renderedZoom.value}px`,
  '--paper-width': `${props.layout.paperPixelWidth * renderedZoom.value}px`,
  '--paper-height': `${props.layout.paperPixelHeight * renderedZoom.value}px`,
}))

const viewportStyle = computed(() => ({
  '--grid-offset-x': `${props.panX}px`,
  '--grid-offset-y': `${props.panY}px`,
}))

const cameraStyle = computed(() => ({
  left: '50%',
  top: '50%',
  transform: cameraTransform(props.panX, props.panY),
}))

watch(
  () => [props.panX, props.panY],
  () => {
    localPanX = props.panX
    localPanY = props.panY
    applyLocalViewport()
  },
)

watch(
  () => props.settings.zoom,
  (zoom) => {
    if (zoom === localZoom) return
    localZoom = zoom
    beginZoomInteraction()
    applyLocalViewport()
  },
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

const selectedPerson = computed(() => props.selectedPersonId ? props.publication.people[props.selectedPersonId] ?? null : null)
const hoveredPerson = computed(() => props.hoveredPersonId ? props.publication.people[props.hoveredPersonId] ?? null : null)

const CARD_TO_SCREEN_RATIO = 1

function getCardScreenPosition(personId: string) {
  const card = props.layout.cards.find((item) => item.personId === personId)
  if (!card) return null
  return {
    x: (card.x + card.width / 2) * localZoom * CARD_TO_SCREEN_RATIO + localPanX,
    y: (card.y + card.height / 2) * localZoom * CARD_TO_SCREEN_RATIO + localPanY,
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
    zoom: localZoom,
    panX: localPanX,
    panY: localPanY,
    card,
    ...options,
  })
  if (!result.changed) return false
  setPan(result.panX, result.panY, true)
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
  if (panRafId !== null) {
    cancelAnimationFrame(panRafId)
    panRafId = null
  }
  const target = event.target as Element | null
  pendingSelectPersonId = target?.closest<SVGGElement>('.person-card')?.dataset.personId ?? ''
  isDragging.value = true
  dragStartX = event.clientX
  dragStartY = event.clientY
  panStartX = localPanX
  panStartY = localPanY
  lastMoveTime = 0
  velocityX = 0
  velocityY = 0
  viewportRef.value?.setPointerCapture(event.pointerId)
}

function applyPendingPointerMove() {
  panRafId = null
  if (!isDragging.value) return

  const deltaX = pendingMoveX - dragStartX
  const deltaY = pendingMoveY - dragStartY
  if (lastMoveTime > 0) {
    const dt = pendingMoveTime - lastMoveTime
    if (dt > 5) {
      velocityX = ((pendingMoveX - lastMoveX) / dt) * 16
      velocityY = ((pendingMoveY - lastMoveY) / dt) * 16
    }
  }
  lastMoveTime = pendingMoveTime
  lastMoveX = pendingMoveX
  lastMoveY = pendingMoveY

  setPan(panStartX + deltaX, panStartY + deltaY)
}

function queuePointerMove(clientX: number, clientY: number) {
  pendingMoveX = clientX
  pendingMoveY = clientY
  pendingMoveTime = performance.now()
  if (panRafId === null) panRafId = requestAnimationFrame(applyPendingPointerMove)
}

function flushPointerMove(clientX: number, clientY: number) {
  pendingMoveX = clientX
  pendingMoveY = clientY
  pendingMoveTime = performance.now()
  if (panRafId !== null) cancelAnimationFrame(panRafId)
  applyPendingPointerMove()
}

function handlePointerMove(event: PointerEvent) {
  if (!isDragging.value) return

  if (Math.hypot(event.clientX - dragStartX, event.clientY - dragStartY) > DRAG_SELECT_THRESHOLD) {
    pendingSelectPersonId = ''
  }
  queuePointerMove(event.clientX, event.clientY)
}

function cancelInertia() {
  if (inertiaRafId !== null) {
    cancelAnimationFrame(inertiaRafId)
    inertiaRafId = null
  }
  isInertiaActive.value = false
}

const INERTIA_FRICTION = 0.94
const INERTIA_STOP_THRESHOLD = 0.5

function startInertia() {
  cancelInertia()
  const vx = velocityX
  const vy = velocityY
  if (Math.abs(vx) < INERTIA_STOP_THRESHOLD && Math.abs(vy) < INERTIA_STOP_THRESHOLD) {
    commitViewport()
    return
  }
  isInertiaActive.value = true
  let cvx = vx
  let cvy = vy
  function step() {
    cvx *= INERTIA_FRICTION
    cvy *= INERTIA_FRICTION
    if (Math.abs(cvx) < INERTIA_STOP_THRESHOLD && Math.abs(cvy) < INERTIA_STOP_THRESHOLD) {
      inertiaRafId = null
      isInertiaActive.value = false
      commitViewport()
      return
    }
    setPan(localPanX + cvx, localPanY + cvy)
    inertiaRafId = requestAnimationFrame(step)
  }
  inertiaRafId = requestAnimationFrame(step)
}

function finishDrag(event: PointerEvent) {
  if (!isDragging.value) {
    return
  }

  flushPointerMove(event.clientX, event.clientY)
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
  } else {
    commitViewport()
  }
}

function finishZoomInteraction() {
  zoomIdleTimer = null
  renderedZoom.value = localZoom
  nextTick(() => {
    applyLocalViewport()
    isZooming.value = false
  })
}

function beginZoomInteraction() {
  isZooming.value = true
  if (zoomIdleTimer !== null) clearTimeout(zoomIdleTimer)
  zoomIdleTimer = setTimeout(finishZoomInteraction, 140)
}

function handleWheel(event: WheelEvent) {
  event.preventDefault()
  cancelInertia()
  updateViewportSize()

  if (!viewportRef.value) {
    return
  }

  const currentZoom = localZoom
  const nextZoom = clamp(Number((currentZoom * Math.exp(-event.deltaY * 0.0016)).toFixed(2)), 0.10, 1.35)

  if (nextZoom === currentZoom) {
    return
  }

  const rect = viewportRef.value.getBoundingClientRect()
  const pointerX = event.clientX - rect.left
  const pointerY = event.clientY - rect.top
  const worldX = props.layout.width / 2 + (pointerX - rect.width / 2 - localPanX) / currentZoom
  const worldY = props.layout.height / 2 + (pointerY - rect.height / 2 - localPanY) / currentZoom

  const nextPanX = pointerX - rect.width / 2 - (worldX - props.layout.width / 2) * nextZoom
  const nextPanY = pointerY - rect.height / 2 - (worldY - props.layout.height / 2) * nextZoom

  localZoom = nextZoom
  beginZoomInteraction()
  setPan(nextPanX, nextPanY, true)
  emit('update-zoom', nextZoom)
}

function handleTouchStart(event: TouchEvent) {
  if (event.touches.length === 2) {
    updateViewportSize()
    const dx = event.touches[0].clientX - event.touches[1].clientX
    const dy = event.touches[0].clientY - event.touches[1].clientY
    pinchStartDist = Math.hypot(dx, dy)
    pinchStartZoom = localZoom
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

    if (nextZoom === localZoom || !viewportRef.value) return

    const rect = viewportRef.value.getBoundingClientRect()
    const midX = pinchMidX - rect.left
    const midY = pinchMidY - rect.top
    const worldX = props.layout.width / 2 + (midX - rect.width / 2 - localPanX) / localZoom
    const worldY = props.layout.height / 2 + (midY - rect.height / 2 - localPanY) / localZoom

    const nextPanX = midX - rect.width / 2 - (worldX - props.layout.width / 2) * nextZoom
    const nextPanY = midY - rect.height / 2 - (worldY - props.layout.height / 2) * nextZoom

    localZoom = nextZoom
    beginZoomInteraction()
    setPan(nextPanX, nextPanY, true)
    emit('update-zoom', nextZoom)
  }
}

function resetView() {
  if (!props.layout.cards.length) {
    setPan(0, 0, true)
    return
  }
  const focusFamily = props.publication.families[props.publication.focusFamilyId]
  const rootPersonId = focusFamily?.adults.find((adultId) => Boolean(adultId))
  const rootCard =
    (rootPersonId ? props.layout.cards.find((card) => card.personId === rootPersonId) : undefined) ??
    props.layout.cards.reduce((min, card) => {
      if (card.y !== min.y) return card.y < min.y ? card : min
      return card.x < min.x ? card : min
    })
  const cx = rootCard.x + rootCard.width / 2
  const cy = rootCard.y + rootCard.height / 2
  setPan(
    (props.layout.width / 2 - cx) * localZoom,
    (props.layout.height / 2 - cy) * localZoom,
    true,
  )
}

</script>

<template>
  <div
    ref="viewportRef"
    class="canvas-viewport"
    :class="{
      'canvas-viewport--dragging': isDragging,
    }"
    :style="viewportStyle"
    @pointerdown="handlePointerDown"
    @pointermove="handlePointerMove"
    @pointerup="finishDrag"
    @pointercancel="finishDrag"
    @wheel="handleWheel"
    @touchstart.passive="handleTouchStart"
    @touchmove.prevent="handleTouchMove"
  >
    <div ref="cameraRef" class="canvas-camera" :style="cameraStyle">
      <div ref="stageRef" id="publication-canvas-root" class="publication-stage" :style="stageStyle">
        <svg
          ref="svgRef"
          class="publication-svg"
          xmlns="http://www.w3.org/2000/svg"
          :viewBox="`0 0 ${layout.width} ${layout.height}`"
          :width="layout.width * renderedZoom"
          :height="layout.height * renderedZoom"
        >
          <defs>
            <filter id="cardShadow" x="-30%" y="-30%" width="160%" height="160%">
              <feDropShadow dx="0" dy="6" stdDeviation="8" flood-color="var(--color-shadow, #6d4f31)" :flood-opacity="settings.cardShadowOpacity / 100" />
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
              :class="{ 'tree-lines__line--spousal': line.type === 'spousal' }"
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

          <g :filter="isCanvasMoving || settings.cardShadowOpacity <= 0 ? undefined : 'url(#cardShadow)'">
            <PersonCardSvg
              v-for="card in layout.cards"
              :key="card.personId"
              :data-person-id="card.personId"
              :person="resolvePerson(card.personId)"
              :card="card"
              :settings="settings"
              :selected="card.personId === selectedPersonId"
              :hovered="card.personId === hoveredPersonId"
              :subdued="Boolean(hoveredPersonId && card.personId !== selectedPersonId && card.personId !== hoveredPersonId)"
              :kinshipNote="card.personId === hoveredPersonId && relationshipToSelected ? relationshipToSelected.term + (relationshipToSelected.description ? ' · ' + relationshipToSelected.description : '') : kinshipNotes?.[card.personId] ?? null"
              @select="handleSelect"
              @hover="handleHoverPerson"
            />
          </g>
        </svg>
      </div>
    </div>
  </div>
</template>

<style scoped>
.canvas-viewport {
  position: relative;
  min-height: calc(100vh - 164px);
  overflow: hidden;
  touch-action: none;
  cursor: default;
  overscroll-behavior: contain;
  background:
    linear-gradient(var(--canvas-grid-color) 1px, transparent 1px),
    linear-gradient(90deg, var(--canvas-grid-color) 1px, transparent 1px),
    var(--canvas-bg);
  background-size: 44px 44px, 44px 44px, auto;
  background-position:
    calc(50% + var(--grid-offset-x, 0px)) calc(50% + var(--grid-offset-y, 0px)),
    calc(50% + var(--grid-offset-x, 0px)) calc(50% + var(--grid-offset-y, 0px)),
    center;
}

.canvas-viewport::before {
  content: '';
  position: absolute;
  inset: 0;
  background: var(--workspace-glow, transparent);
  pointer-events: none;
}

.canvas-viewport--dragging {
  cursor: grabbing;
  user-select: none;
}

.canvas-camera {
  position: absolute;
  transform: translate(-50%, -50%);
  will-change: transform;
}

.publication-stage {
  position: relative;
  background: transparent;
  border-radius: 8px;
  filter: var(--filter-paper);
  transform-origin: center;
  will-change: transform;
}

.publication-svg {
  display: block;
  overflow: visible;
  user-select: none;
  -webkit-user-select: none;
}

.tree-lines line {
  stroke: var(--tree-line-color);
  stroke-width: 2.6;
  stroke-linecap: round;
}

.tree-lines line.tree-lines__line--spousal {
  stroke-width: 2.2;
  stroke-linecap: butt;
}

@media (max-width: 980px) {
  .canvas-viewport {
    min-height: calc(100vh - 152px);
  }

}
</style>
