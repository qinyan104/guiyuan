import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import PublicationListView from './PublicationListView.vue'
import { deletePublication, listPublications } from '../api/publication'

const push = vi.fn()

vi.mock('vue-router', () => ({
  useRouter: () => ({
    push,
  }),
}))

vi.mock('../api/publication', () => ({
  listPublications: vi.fn(),
  createPublication: vi.fn(),
  deletePublication: vi.fn(),
  updatePublicationMetadata: vi.fn(),
}))

describe('PublicationListView', () => {
  beforeEach(() => {
    push.mockReset()
    vi.mocked(listPublications).mockReset()
    vi.mocked(deletePublication).mockReset()

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
    vi.mocked(deletePublication).mockResolvedValue()
  })

  it('requires explicit confirmation before deleting a publication', async () => {
    const wrapper = mount(PublicationListView, {
      global: {
        stubs: {
          Teleport: {
            template: '<div><slot /></div>',
          },
          ShareLinkManager: true,
          CollaboratorManager: true,
        },
      },
    })

    await flushPromises()

    await wrapper.get('.icon-btn.danger').trigger('click')

    expect(deletePublication).not.toHaveBeenCalled()
    expect(wrapper.text()).toContain('确认焚毁')

    await wrapper.get('.delete-overlay button.danger').trigger('click')

    expect(deletePublication).toHaveBeenCalledWith(7)
  })

  it('shows who last updated the publication', async () => {
    const wrapper = mount(PublicationListView, {
      global: {
        stubs: {
          Teleport: {
            template: '<div><slot /></div>',
          },
          ShareLinkManager: true,
          CollaboratorManager: true,
        },
      },
    })

    await flushPromises()

    expect(wrapper.text()).toContain('陈氏宗谱测试卷')
    expect(wrapper.text()).toContain('2026/05/10')
  })
})
