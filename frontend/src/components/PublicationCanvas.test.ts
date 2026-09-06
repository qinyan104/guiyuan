import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { defaultSettings } from '../data/sampleFamily'
import type { PublicationData, PublicationLayout, PublicationSettings } from '../types/family'
import PublicationCanvas from './PublicationCanvas.vue'

const publication: PublicationData = {
  title: '测试族谱',
  subtitle: '',
  focusFamilyId: 'f1',
  people: {
    p1: { id: 'p1', name: '始祖', gender: 'male' },
    p2: { id: 'p2', name: '配偶', gender: 'female' },
  },
  families: {
    f1: { id: 'f1', adults: ['p1', 'p2'], children: [] },
  },
}

const layout: PublicationLayout = {
  width: 1000,
  height: 800,
  cards: [
    { personId: 'p2', x: 340, y: 40, width: 100, height: 120 },
    { personId: 'p1', x: 200, y: 40, width: 100, height: 120 },
  ],
  lines: [],
  displayedPeople: 2,
  generationCount: 1,
  pageCount: 1,
  paperPixelWidth: 1000,
  paperPixelHeight: 800,
  titleAreaHeight: 0,
}

function mountCanvas(settings: Partial<PublicationSettings> = {}) {
  return mount(PublicationCanvas, {
    props: {
      publication,
      settings: { ...defaultSettings, zoom: 0.5, ...settings },
      layout,
      selectedPersonId: 'p1',
      hoveredPersonId: null,
      panX: 0,
      panY: 0,
    },
    global: {
      stubs: {
        PersonCardSvg: true,
      },
    },
  })
}

function mountLargeCanvas() {
  const people: PublicationData['people'] = {}
  const cards: PublicationLayout['cards'] = []
  for (let index = 0; index < 2001; index += 1) {
    const personId = `p${index}`
    people[personId] = { id: personId, name: personId, gender: 'unknown' }
    cards.push({ personId, x: index * 200, y: 40, width: 160, height: 294 })
  }

  return mount(PublicationCanvas, {
    props: {
      publication: {
        title: '大族谱',
        subtitle: '',
        focusFamilyId: 'f1',
        people,
        families: { f1: { id: 'f1', adults: ['p0'], children: [] } },
      },
      settings: { ...defaultSettings, zoom: 1 },
      layout: {
        ...layout,
        width: 400_000,
        height: 20_000,
        cards,
        displayedPeople: cards.length,
      },
      selectedPersonId: 'p0',
      panX: 0,
      panY: 0,
    },
    global: {
      stubs: {
        PersonCardSvg: true,
      },
    },
  })
}

describe('PublicationCanvas', () => {
  beforeEach(() => {
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null)
    vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockReturnValue(1280)
    vi.spyOn(HTMLElement.prototype, 'clientHeight', 'get').mockReturnValue(720)
  })

  it('anchors the camera at the center of the canvas viewport', () => {
    const wrapper = mountCanvas()

    expect(wrapper.get('.canvas-camera').attributes('style')).toContain('left: 50%')
    expect(wrapper.get('.canvas-camera').attributes('style')).toContain('top: 50%')
  })

  it('centers reset view on the focus family root person across zoom levels', () => {
    const wrapper = mountCanvas({ zoom: 0.5 })

    ;(wrapper.vm as unknown as { resetView: () => void }).resetView()

    expect(wrapper.emitted('update:panX')?.at(-1)).toEqual([125])
    expect(wrapper.emitted('update:panY')?.at(-1)).toEqual([150])
  })

  it('keeps the live SVG surface viewport-sized for a 2,000-person tree', async () => {
    const wrapper = mountLargeCanvas()
    await nextTick()

    const svg = wrapper.get('.publication-svg')
    expect(Number(svg.attributes('width'))).toBeLessThanOrEqual(3840)
    expect(svg.attributes('viewBox')).not.toBe('0 0 400000 20000')
    expect(svg.attributes('style')).toContain('overflow: hidden')

    const cameraStyle = wrapper.get('.canvas-camera').attributes('style')
    expect(cameraStyle).toContain('will-change: auto')
    expect(cameraStyle).not.toContain('translate3d')

    await (wrapper.vm as unknown as { prepareForExport: () => Promise<void> }).prepareForExport()
    expect(wrapper.get('.publication-svg').attributes('viewBox')).toBe('0 0 400000 20000')
    expect(Number(wrapper.get('.publication-svg').attributes('width'))).toBe(400_000)
  })
})
