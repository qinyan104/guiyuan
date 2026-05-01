import type { PositionedCard } from '../types/family'

export interface RevealPersonOptions {
  padding?: number
  leftInset?: number
  rightInset?: number
  topInset?: number
  bottomInset?: number
}

export interface CalculateRevealPanInput extends RevealPersonOptions {
  viewportWidth: number
  viewportHeight: number
  layoutWidth: number
  layoutHeight: number
  zoom: number
  panX: number
  panY: number
  card: PositionedCard
}

export interface RevealPanResult {
  panX: number
  panY: number
  changed: boolean
}

function resolveSafeRange(size: number, startInset: number, endInset: number, padding: number) {
  const start = Math.min(size, Math.max(0, startInset + padding))
  const end = Math.max(start, size - Math.max(0, endInset + padding))

  return {
    start,
    end,
    center: (start + end) / 2,
    span: Math.max(0, end - start),
  }
}

function shiftAxis(start: number, end: number, safeStart: number, safeEnd: number, safeCenter: number, safeSpan: number) {
  const span = end - start
  if (span > safeSpan) {
    return safeCenter - (start + end) / 2
  }

  if (start < safeStart) {
    return safeStart - start
  }

  if (end > safeEnd) {
    return safeEnd - end
  }

  return 0
}

export function calculateRevealPan(input: CalculateRevealPanInput): RevealPanResult {
  const padding = input.padding ?? 56
  const leftInset = input.leftInset ?? 0
  const rightInset = input.rightInset ?? 0
  const topInset = input.topInset ?? 0
  const bottomInset = input.bottomInset ?? 0

  if (input.viewportWidth <= 0 || input.viewportHeight <= 0 || input.zoom <= 0) {
    return {
      panX: input.panX,
      panY: input.panY,
      changed: false,
    }
  }

  const safeX = resolveSafeRange(input.viewportWidth, leftInset, rightInset, padding)
  const safeY = resolveSafeRange(input.viewportHeight, topInset, bottomInset, padding)
  const cardLeft = input.viewportWidth / 2 + input.panX + (input.card.x - input.layoutWidth / 2) * input.zoom
  const cardTop = input.viewportHeight / 2 + input.panY + (input.card.y - input.layoutHeight / 2) * input.zoom
  const cardRight = cardLeft + input.card.width * input.zoom
  const cardBottom = cardTop + input.card.height * input.zoom
  const deltaX = shiftAxis(cardLeft, cardRight, safeX.start, safeX.end, safeX.center, safeX.span)
  const deltaY = shiftAxis(cardTop, cardBottom, safeY.start, safeY.end, safeY.center, safeY.span)

  return {
    panX: input.panX + deltaX,
    panY: input.panY + deltaY,
    changed: deltaX !== 0 || deltaY !== 0,
  }
}
