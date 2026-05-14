import { mount } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'

const { routerPush } = vi.hoisted(() => ({
  routerPush: vi.fn(),
}))

vi.mock('vue-router', () => ({
  useRouter: () => ({
    push: routerPush,
  }),
  useRoute: () => ({
    params: { id: 15 },
  }),
}))

import TimelineView from './TimelineView.vue'

describe('TimelineView', () => {
  it('routes event clicks back to the workbench with a personId query', async () => {
    const wrapper = mount(TimelineView, {
      props: {
        publicationId: 15,
      },
      global: {
        provide: {
          'publication-context': {
            pub: {
              publication: {
                people: {
                  p1: {
                    id: 'p1',
                    name: 'Alice',
                    gender: 'female',
                    birth: '1901',
                  },
                },
              },
            },
          },
        },
      },
    })

    await wrapper.get('.event-wrapper').trigger('click')

    expect(routerPush).toHaveBeenCalledWith({
      name: 'workbench',
      params: { id: 15 },
      query: { personId: 'p1' },
    })
  })
})
