import { flushPromises, mount } from '@vue/test-utils'
import { describe, expect, it, vi, beforeEach } from 'vitest'
import type { PublicationLoadResult } from '../api/publication'
import { defaultSettings } from '../data/sampleFamily'

// Mock vue-router
vi.mock('vue-router', () => ({
  useRoute: () => ({ params: { id: '7' } }),
  useRouter: () => ({ push: vi.fn() }),
}))

// Mock the API
vi.mock('../api/publication', () => ({
  getPublication: vi.fn(),
  updatePublication: vi.fn(),
  createPublication: vi.fn(),
}))

import { getPublication, updatePublication } from '../api/publication'
import PublicationLayout from './PublicationLayout.vue'

const mockPublicationData: PublicationLoadResult = {
  id: 7,
  revision: 5,
  publication: {
    title: 'Test',
    subtitle: '',
    focusFamilyId: '',
    people: {},
    families: {},
    info: {},
    revision: 5,
  },
  settings: {
    ...defaultSettings,
    paper: 'A4',
    cardWidth: 142,
    generationGap: 20,
    siblingGap: 10,
    partnerGap: 10,
    zoom: 1,
    showAge: false,
    showNote: false,
    paddingX: 10,
    paddingY: 10,
  },
}

describe('PublicationLayout conflict handling', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(getPublication).mockResolvedValue(mockPublicationData)
  })

  it('switches to conflict state and stops autosave retries until reload', async () => {
    vi.mocked(updatePublication).mockRejectedValueOnce({
      response: {
        status: 409,
        data: { message: 'Publication is stale. Reload before saving.' },
      },
      config: { method: 'put', url: '/publications/7' },
    })

    const wrapper = mount(PublicationLayout, {
      global: { stubs: { RouterView: true } },
    })

    // Wait for load to complete (the watcher will fire and schedule delayed autosave)
    await flushPromises()

    const publicationContext = (wrapper.vm as any).pub
    publicationContext.publication.title = 'Changed title'
    await wrapper.vm.$nextTick()

    // Call saveToServer directly to test conflict handling
    // (avoids waiting for the 3000ms autosave debounce timer)
    // The throw is expected — direct callers (e.g. PersonDetailView)
    // receive it so they can react to the conflict
    await (wrapper.vm as any).saveToServer().catch(() => {})

    // Check conflict banner is shown — this string comes from the
    // 409 response data.message rendered in the sync-conflict-banner
    expect(wrapper.text()).toContain('Reload before saving')

    // Verify autosave is paused: calling saveToServer again should bail
    // due to syncStatus === 'conflict' guard (won't call updatePublication again)
    vi.mocked(updatePublication).mockClear()
    await (wrapper.vm as any).saveToServer().catch(() => {})
    expect(vi.mocked(updatePublication)).not.toHaveBeenCalled()
  })

  it('does not schedule another autosave after only the server revision changes', async () => {
    vi.useFakeTimers()
    vi.mocked(updatePublication).mockResolvedValue(6)

    const wrapper = mount(PublicationLayout, {
      global: { stubs: { RouterView: true } },
    })

    await flushPromises()

    const publicationContext = (wrapper.vm as any).pub
    publicationContext.publication.title = 'Changed title'

    await wrapper.vm.$nextTick()
    await vi.advanceTimersByTimeAsync(3000)
    await flushPromises()

    expect(vi.mocked(updatePublication)).toHaveBeenCalledTimes(1)

    await vi.advanceTimersByTimeAsync(3000)
    await flushPromises()

    expect(vi.mocked(updatePublication)).toHaveBeenCalledTimes(1)

    vi.useRealTimers()
  })
})
