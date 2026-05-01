import { describe, expect, it } from 'vitest'

import { calculateRevealPan } from './canvasViewport'

describe('calculateRevealPan', () => {
  it('keeps pan unchanged when the card is already visible', () => {
    expect(
      calculateRevealPan({
        viewportWidth: 1200,
        viewportHeight: 800,
        layoutWidth: 2400,
        layoutHeight: 1600,
        zoom: 1,
        panX: 0,
        panY: 0,
        card: {
          personId: 'p1',
          x: 1100,
          y: 700,
          width: 160,
          height: 280,
        },
      }),
    ).toEqual({
      panX: 0,
      panY: 0,
      changed: false,
    })
  })

  it('moves the viewport just enough to reveal a card on the right', () => {
    expect(
      calculateRevealPan({
        viewportWidth: 1200,
        viewportHeight: 800,
        layoutWidth: 2400,
        layoutHeight: 1600,
        zoom: 1,
        panX: 0,
        panY: 0,
        padding: 40,
        card: {
          personId: 'p2',
          x: 1800,
          y: 700,
          width: 160,
          height: 280,
        },
      }),
    ).toEqual({
      panX: -200,
      panY: 0,
      changed: true,
    })
  })

  it('respects the right inset used by the editor drawer', () => {
    expect(
      calculateRevealPan({
        viewportWidth: 1200,
        viewportHeight: 800,
        layoutWidth: 2400,
        layoutHeight: 1600,
        zoom: 1,
        panX: 0,
        panY: 0,
        padding: 40,
        rightInset: 440,
        card: {
          personId: 'p3',
          x: 1200,
          y: 700,
          width: 160,
          height: 280,
        },
      }),
    ).toEqual({
      panX: -40,
      panY: 0,
      changed: true,
    })
  })
})
