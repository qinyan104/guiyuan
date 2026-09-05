import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import DashboardView from './DashboardView.vue'
import { listPublications } from '../api/publication'

const push = vi.fn()

vi.mock('vue-router', () => ({
  useRouter: () => ({
    push,
  }),
}))

vi.mock('../api/auth', () => ({
  isAdmin: vi.fn(() => false),
  isSuperAdmin: vi.fn(() => false),
}))

vi.mock('../api/admin', () => ({
  adminListUsers: vi.fn(),
  adminBackupDatabase: vi.fn(),
}))

vi.mock('../api/publication', () => ({
  listPublications: vi.fn(),
  createPublication: vi.fn(),
}))

describe('DashboardView', () => {
  beforeEach(() => {
    push.mockReset()
    vi.mocked(listPublications).mockReset()

    vi.mocked(listPublications).mockResolvedValue([
      {
        id: 7,
        revision: 1,
        title: '陈氏宗谱',
        subtitle: '测试卷',
        accessRole: 'OWNER',
        createdAt: '2026-05-10T12:00:00Z',
        updatedAt: '2026-05-10T12:00:00Z',
        lastUpdatedBy: 'alice',
        lastActivityAction: 'UPDATE_PUB',
      },
    ])
  })

  it('renders the latest publication title and access link', async () => {
    const wrapper = mount(DashboardView, {
      global: {
        stubs: {
          Teleport: {
            template: '<div><slot /></div>',
          },
        },
      },
    })

    await flushPromises()

    expect(wrapper.text()).toContain('陈氏宗谱')
    expect(wrapper.text()).toContain('继续编撰')
  })

  it('renders publication count stat card', async () => {
    const wrapper = mount(DashboardView, {
      global: {
        stubs: {
          Teleport: {
            template: '<div><slot /></div>',
          },
        },
      },
    })

    await flushPromises()

    expect(wrapper.text()).toContain('族谱总数')
  })

  it('shows empty state when no publications', async () => {
    vi.mocked(listPublications).mockResolvedValue([])

    const wrapper = mount(DashboardView, {
      global: {
        stubs: {
          Teleport: {
            template: '<div><slot /></div>',
          },
        },
      },
    })

    await flushPromises()

    expect(wrapper.text()).toContain('创建第一个族谱')
  })

  it('updates dashboard labels dynamically when lexicon changes', async () => {
    const { useLexiconStore } = await import('../stores/lexicon')
    const store = useLexiconStore()
    store.setLexicon('standard')

    const wrapper = mount(DashboardView, {
      global: {
        stubs: {
          Teleport: {
            template: '<div><slot /></div>',
          },
        },
      },
    })

    await flushPromises()
    expect(wrapper.text()).toContain('族谱总数')
    expect(wrapper.text()).toContain('新建族谱')

    store.setLexicon('archive')
    await flushPromises()
    expect(wrapper.text()).toContain('馆藏总卷')
    expect(wrapper.text()).toContain('起草新谱')

    store.setLexicon('shrine')
    await flushPromises()
    expect(wrapper.text()).toContain('宗谱总册')
    expect(wrapper.text()).toContain('修撰宗谱')

    store.setLexicon('standard')
  })
})