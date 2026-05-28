import { mount } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'

import { PUBLICATION_CONTEXT_KEY } from '../types/family'
import TimelineView from './TimelineView.vue'

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

function mountView(people: Record<string, unknown>) {
  return mount(TimelineView, {
    props: { publicationId: 15 },
    global: {
      provide: {
        [PUBLICATION_CONTEXT_KEY as symbol]: {
          pub: {
            publication: {
              title: '陈氏宗谱',
              subtitle: '南浦支系',
              people,
              families: {},
              focusFamilyId: '',
            },
          },
        },
      },
    },
  })
}

describe('TimelineView', () => {
  it('shows a narrative hero even with empty data', () => {
    const wrapper = mountView({
      p1: { id: 'p1', name: '陈一', gender: 'male' },
    })

    expect(wrapper.get('[data-testid="timeline-view"]').classes()).toContain('timeline-root')
    expect(wrapper.text()).toContain('陈氏宗谱')
    expect(wrapper.text()).toContain('补充人物生卒年份')
  })

  it('routes event clicks back to the workbench with a personId query', async () => {
    const wrapper = mountView({
      p1: { id: 'p1', name: '陈一', gender: 'female', birth: '1901年' },
    })

    await wrapper.get('.event').trigger('click')

    expect(routerPush).toHaveBeenCalledWith({
      name: 'workbench',
      params: { id: 15 },
      query: { personId: 'p1' },
    })
  })
})
