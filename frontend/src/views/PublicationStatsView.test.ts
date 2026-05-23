import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ref } from 'vue'

import { getPublicationActivity } from '../api/publication'
import { PUBLICATION_CONTEXT_KEY } from '../types/family'
import PublicationStatsView from './PublicationStatsView.vue'

const push = vi.fn()

vi.mock('vue-router', () => ({
  useRouter: () => ({
    push,
  }),
}))

vi.mock('../api/publication', () => ({
  getPublicationActivity: vi.fn(),
}))

function mountView(people: Record<string, unknown>) {
  return mount(PublicationStatsView, {
    props: { publicationId: 7 },
    global: {
      provide: {
        [PUBLICATION_CONTEXT_KEY as symbol]: {
          pub: {
            publication: {
              title: '陈氏宗谱',
              subtitle: '南浦支系',
              people,
              families: {
                f1: {
                  id: 'f1',
                  adults: ['p1', 'p2'],
                  children: ['p3'],
                },
              },
              focusFamilyId: 'f1',
              info: {
                ancestralOrigin: '颍川',
                hallName: '崇本堂',
                familyMotto: '敦亲睦族',
              },
            },
          },
          serverPublicationId: ref(7),
        },
      },
    },
  })
}

describe('PublicationStatsView', () => {
  beforeEach(() => {
    push.mockReset()
    vi.mocked(getPublicationActivity).mockReset()
    vi.mocked(getPublicationActivity).mockResolvedValue([
      {
        id: 1,
        username: 'alice',
        action: 'UPDATE_PERSON',
        detail: '[]',
        createdAt: new Date().toISOString(),
        parsedDetail: [
          {
            personId: 'p1',
            personName: '陈一',
            changes: [{ field: 'name', fieldLabel: '姓名', old: '陈旧名', new: '陈一' }],
          },
        ],
      },
      {
        id: 2,
        username: 'bob',
        action: 'CREATE_SHARE_LINK',
        detail: '创建分享链接',
        createdAt: '2026-05-18T08:00:00.000Z',
        parsedDetail: null,
      },
    ])
  })

  it('renders summary metrics inside an edge-safe page shell', async () => {
    const wrapper = mountView({
      p1: {
        id: 'p1',
        name: '陈一',
        gender: 'male',
        birth: '1901年',
        death: '1971年',
        deceased: true,
      },
      p2: {
        id: 'p2',
        name: '李氏',
        gender: 'female',
        birth: '1905年',
      },
      p3: {
        id: 'p3',
        name: '陈二',
        gender: 'male',
        birth: '1930年',
      },
    })

    await flushPromises()

    expect(wrapper.get('[data-testid="stats-view"]').classes()).toContain('page-shell')
    expect(wrapper.find('[data-testid="stats-title"]').exists()).toBe(true)
    expect(wrapper.get('[data-testid="metric-total"]').text()).toContain('3')
    expect(wrapper.get('[data-testid="metric-generations"]').text()).toContain('2')
    expect(wrapper.text()).toContain('alice')
    expect(wrapper.text()).toContain('bob')
  })

  it('filters revision activity within the page', async () => {
    const wrapper = mountView({
      p1: {
        id: 'p1',
        name: '陈一',
        gender: 'male',
        birth: '1901年',
      },
      p2: {
        id: 'p2',
        name: '李氏',
        gender: 'female',
        birth: '1905年',
      },
      p3: {
        id: 'p3',
        name: '陈二',
        gender: 'male',
        birth: '1930年',
      },
    })

    await flushPromises()
    await wrapper.get('[data-testid="activity-filter-sharing"]').trigger('click')

    expect(wrapper.text()).toContain('bob')
    expect(wrapper.text()).not.toContain('陈旧名')
  })

  it('shows an empty state when no family data exists', async () => {
    const wrapper = mountView({})

    await flushPromises()

    expect(wrapper.find('[data-testid="stats-empty"]').exists()).toBe(true)
    expect(wrapper.find('.primary-btn').exists()).toBe(true)
  })
})
