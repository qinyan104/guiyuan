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
import { getConflictDraft, saveConflictDraft } from '../features/conflict/conflictDraft'
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
    localStorage.clear()
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
    // The throw is expected — direct callers
    // receive it so they can react to the conflict
    await (wrapper.vm as any).saveToServer().catch(() => {})

    // Check conflict banner is shown — this string comes from the
    // 409 response data.message rendered in the sync-conflict-banner
    expect(wrapper.text()).toContain('Reload before saving')
    expect(wrapper.text()).toContain('本地未同步副本已保留')

    const savedDraft = JSON.parse(localStorage.getItem('guiyuan:conflict-draft:7') || 'null')
    expect(savedDraft.publication.title).toBe('Changed title')
    expect(savedDraft.serverRevision).toBe(5)

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

  it('queues another autosave when real edits happen during an in-flight save', async () => {
    vi.useFakeTimers()

    let resolveFirstSave!: (revision: number) => void
    vi.mocked(updatePublication)
      .mockImplementationOnce(
        () =>
          new Promise<number>((resolve) => {
            resolveFirstSave = resolve
          }),
      )
      .mockResolvedValueOnce(7)

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

    publicationContext.publication.subtitle = 'Changed subtitle during sync'
    await wrapper.vm.$nextTick()

    expect(vi.mocked(updatePublication)).toHaveBeenCalledTimes(1)

    resolveFirstSave(6)
    await flushPromises()
    await vi.runOnlyPendingTimersAsync()
    await flushPromises()

    expect(vi.mocked(updatePublication)).toHaveBeenCalledTimes(2)
    expect(vi.mocked(updatePublication).mock.calls[1]?.[1].subtitle).toBe(
      'Changed subtitle during sync',
    )

    vi.useRealTimers()
  })

  it('shows a local draft notice after loading a publication with a saved conflict draft', async () => {
    saveConflictDraft({
      publicationId: 7,
      serverRevision: 4,
      message: 'Previous save conflicted.',
      publication: {
        ...mockPublicationData.publication,
        title: 'Unsynced local title',
      },
      settings: mockPublicationData.settings,
    })

    const wrapper = mount(PublicationLayout, {
      global: { stubs: { RouterView: true } },
    })

    await flushPromises()

    expect(wrapper.find('[data-testid="conflict-draft-notice"]').exists()).toBe(true)
    expect(wrapper.text()).toContain('Unsynced local title')
  })

  it('restores and clears a saved local draft', async () => {
    saveConflictDraft({
      publicationId: 7,
      serverRevision: 4,
      message: 'Previous save conflicted.',
      publication: {
        ...mockPublicationData.publication,
        title: 'Unsynced local title',
      },
      settings: {
        ...mockPublicationData.settings,
        showAge: true,
      },
    })

    const wrapper = mount(PublicationLayout, {
      global: { stubs: { RouterView: true } },
    })

    await flushPromises()
    await wrapper.find('[data-testid="restore-conflict-draft"]').trigger('click')
    await wrapper.vm.$nextTick()

    const publicationContext = (wrapper.vm as any).pub
    expect(publicationContext.publication.title).toBe('Unsynced local title')
    expect(publicationContext.settings.showAge).toBe(true)
    expect(getConflictDraft(7)).toBeNull()
  })
})
