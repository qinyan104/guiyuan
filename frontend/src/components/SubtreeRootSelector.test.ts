import { flushPromises, mount } from '@vue/test-utils'
import { defineComponent } from 'vue'
import { describe, expect, it, vi } from 'vitest'

import type { PublicationLoadResult } from '../api/publication'
import type { PublicationSettings } from '../types/family'

const { mockGetPublication } = vi.hoisted(() => ({
  mockGetPublication: vi.fn(),
}))

vi.mock('../api/publication', () => ({
  getPublication: mockGetPublication,
}))

vi.mock('./PublicationCanvas.vue', () => ({
  default: defineComponent({
    name: 'PublicationCanvas',
    props: {
      publication: { type: Object, required: true },
      settings: { type: Object, required: true },
      layout: { type: Object, required: true },
      selectedPersonId: { type: String, required: true },
      panX: { type: Number, required: true },
      panY: { type: Number, required: true },
    },
    template: '<div data-testid="publication-canvas" />',
  }),
}))

import SubtreeRootSelector from './SubtreeRootSelector.vue'

const previewSettings: PublicationSettings = {
  paper: 'A3',
  layoutMode: 'su',
  cardWidth: 222,
  generationGap: 88,
  siblingGap: 44,
  partnerGap: 18,
  fontScale: 1.1,
  zoom: 1,
  showCard: true,
  showDeath: true,
  showAge: true,
  showNote: false,
  showPhoto: false,
  paddingX: 28,
  paddingY: 36,
}

const mockPublication: PublicationLoadResult = {
  id: 8,
  revision: 3,
  publication: {
    title: 'Target Publication',
    subtitle: '',
    focusFamilyId: 'f1',
    people: {
      p1: {
        id: 'p1',
        name: 'Root Person',
        gender: 'male',
        dbId: 101,
      } as any,
    },
    families: {
      f1: {
        id: 'f1',
        adults: ['p1'],
        children: [],
      },
    },
  },
  settings: previewSettings,
}

describe('SubtreeRootSelector', () => {
  it('uses the loaded publication settings for the preview canvas', async () => {
    mockGetPublication.mockResolvedValue(mockPublication)

    const wrapper = mount(SubtreeRootSelector, {
      props: {
        modelValue: true,
        publicationId: 8,
        publicationTitle: 'Target Publication',
      },
      global: {
        stubs: {
          Teleport: true,
        },
      },
    })

    await flushPromises()

    const canvas = wrapper.getComponent({ name: 'PublicationCanvas' })
    expect(canvas.props('settings')).toMatchObject(previewSettings)
  })
})
