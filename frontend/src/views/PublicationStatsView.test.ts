import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ref } from 'vue'

import { PUBLICATION_CONTEXT_KEY } from '../types/family'
import PublicationStatsView from './PublicationStatsView.vue'

const push = vi.fn()

vi.mock('vue-router', () => ({
  useRouter: () => ({
    push,
  }),
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
  })

  it('renders the family title and narrative summary', async () => {
    const wrapper = mountView({
      p1: { id: 'p1', name: '陈一', gender: 'male', birth: '1901年', death: '1971年', deceased: true },
      p2: { id: 'p2', name: '李氏', gender: 'female', birth: '1905年' },
      p3: { id: 'p3', name: '陈二', gender: 'male', birth: '1930年' },
    })

    await flushPromises()

    expect(wrapper.get('[data-testid="stats-view"]').classes()).toContain('chronicle-root')
    expect(wrapper.text()).toContain('陈氏宗谱')
    expect(wrapper.text()).toContain('3')
    expect(wrapper.text()).toContain('2')
    expect(wrapper.text()).toContain('南浦支系')
  })

  it('shows meaningful content when no family data exists', async () => {
    const wrapper = mountView({})

    await flushPromises()

    expect(wrapper.find('[data-testid="stats-view"]').element).toBeTruthy()
    expect(wrapper.text()).toContain('陈氏宗谱')
    // Still renders the page structure even with empty data
    expect(wrapper.text()).toContain('0')
  })
})
