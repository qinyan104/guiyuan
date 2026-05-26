import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ref } from 'vue'

import { getPublicationActivity } from '../api/publication'
import { PUBLICATION_CONTEXT_KEY } from '../types/family'
import PublicationActivityView from './PublicationActivityView.vue'

const push = vi.fn()
const back = vi.fn()

vi.mock('vue-router', () => ({
  useRouter: () => ({ push, back }),
}))

vi.mock('../api/publication', () => ({
  getPublicationActivity: vi.fn(),
}))

function mountView() {
  return mount(PublicationActivityView, {
    props: { publicationId: 7 },
    global: {
      provide: {
        [PUBLICATION_CONTEXT_KEY as symbol]: {
          pub: {
            publication: {
              title: '陈氏宗谱',
              subtitle: '测试卷',
              people: {},
              families: {},
              focusFamilyId: '',
            },
          },
          serverPublicationId: ref(7),
        },
      },
    },
  })
}

describe('PublicationActivityView', () => {
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
            changes: [{ field: 'name', fieldLabel: '姓名', old: '陈旧', new: '陈一' }],
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

  it('renders an independent collaboration activity page', async () => {
    const wrapper = mountView()

    await flushPromises()

    expect(wrapper.text()).toContain('协作动态')
    expect(wrapper.text()).toContain('陈氏宗谱')
    expect(wrapper.text()).toContain('最近编辑')
    expect(wrapper.text()).toContain('alice')
    expect(wrapper.text()).toContain('编辑人物')
    expect(wrapper.text()).toContain('陈一')
  })

  it('filters activity without leaving the page', async () => {
    const wrapper = mountView()

    await flushPromises()
    await wrapper.get('[data-testid="activity-filter-sharing"]').trigger('click')

    expect(wrapper.text()).toContain('创建分享链接')
    expect(wrapper.text()).toContain('bob')
    expect(wrapper.text()).not.toContain('陈一')
  })

  it('navigates back to the workbench', async () => {
    const wrapper = mountView()

    await flushPromises()
    await wrapper.get('[data-testid="activity-back"]').trigger('click')

    expect(back).toHaveBeenCalled()
  })
})
