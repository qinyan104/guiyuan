import { flushPromises, mount } from '@vue/test-utils'
import { describe, expect, it, vi, beforeEach } from 'vitest'

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

const mockPublicationData = {
  id: 7,
  revision: 5,
  publication: {
    title: 'Test',
    subtitle: '',
    focusFamilyId: '',
    people: {},
    families: {},
    info: {},
  },
  settings: {
    paper: 'A4',
    layoutMode: 'modern',
    cardWidth: 142,
    generationGap: 20,
    siblingGap: 10,
    partnerGap: 10,
    fontScale: 1,
    zoom: 1,
    showDeath: true,
    showAge: false,
    showNote: false,
    showPhoto: true,
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
})
