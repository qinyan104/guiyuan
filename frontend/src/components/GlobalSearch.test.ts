import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const { searchApi, routerPush } = vi.hoisted(() => ({
  searchApi: vi.fn(),
  routerPush: vi.fn(),
}))

vi.mock('vue-router', () => ({
  useRouter: () => ({
    push: routerPush,
  }),
}))

vi.mock('../api/search', () => ({
  searchApi,
}))

import GlobalSearch from './GlobalSearch.vue'

describe('GlobalSearch', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    searchApi.mockReset()
    routerPush.mockReset()
  })

  it('routes person hits back to the workbench with a personId query', async () => {
    searchApi.mockResolvedValue({
      publications: [],
      persons: [
        {
          personId: 'p9',
          name: 'Zhao',
          publicationId: 12,
          publicationTitle: 'Clan Book',
        },
      ],
    })

    const wrapper = mount(GlobalSearch)
    await wrapper.get('input').setValue('zhao')
    await vi.advanceTimersByTimeAsync(300)
    await flushPromises()

    await wrapper.get('.result-item').trigger('mousedown')

    expect(routerPush).toHaveBeenCalledWith({
      name: 'workbench',
      params: { id: 12 },
      query: { personId: 'p9' },
    })
  })
})
