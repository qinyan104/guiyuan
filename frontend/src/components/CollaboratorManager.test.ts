import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import CollaboratorManager from './CollaboratorManager.vue'
import {
  listAccessRecords,
  removeAccessRecord,
  searchUsers,
  updateAccessRole,
} from '../api/accessManage'

vi.mock('../api/accessManage', () => ({
  searchUsers: vi.fn(),
  listAccessRecords: vi.fn(),
  addAccessRecord: vi.fn(),
  updateAccessRole: vi.fn(),
  removeAccessRecord: vi.fn(),
}))

describe('CollaboratorManager', () => {
  beforeEach(() => {
    vi.mocked(searchUsers).mockReset()
    vi.mocked(listAccessRecords).mockReset()
    vi.mocked(updateAccessRole).mockReset()
    vi.mocked(removeAccessRecord).mockReset()

    vi.mocked(searchUsers).mockResolvedValue([])
    vi.mocked(updateAccessRole).mockResolvedValue()
    vi.mocked(removeAccessRecord).mockResolvedValue()
    vi.mocked(listAccessRecords).mockResolvedValue([
      {
        id: 1,
        userId: 10,
        username: 'owner',
        nickname: 'Owner',
        role: 'OWNER',
        createdAt: '2026-05-10T12:00:00Z',
      },
      {
        id: 2,
        userId: 11,
        username: 'editor',
        nickname: 'Editor',
        role: 'EDITOR',
        createdAt: '2026-05-10T12:00:00Z',
      },
    ])
  })

  it('shows role guidance so collaborators understand permission boundaries', async () => {
    const wrapper = mount(CollaboratorManager, {
      props: { publicationId: 7 },
      global: {
        stubs: {
          Teleport: {
            template: '<div><slot /></div>',
          },
        },
      },
    })

    await flushPromises()

    expect(wrapper.text()).toContain('编辑者可修改族谱内容')
    expect(wrapper.text()).toContain('浏览者只能查看，并会应用脱敏规则')
  })

  it('requires confirmation before changing a collaborator role', async () => {
    const wrapper = mount(CollaboratorManager, {
      props: { publicationId: 7 },
      global: {
        stubs: {
          Teleport: {
            template: '<div><slot /></div>',
          },
        },
      },
    })

    await flushPromises()

    const selects = wrapper.findAll('select.form-select.inline')
    await selects[0].setValue('VIEWER')

    expect(updateAccessRole).not.toHaveBeenCalled()
    expect(wrapper.text()).toContain('确认调整协作者权限')

    await wrapper.get('button[data-role="confirm"]').trigger('click')

    expect(updateAccessRole).toHaveBeenCalledWith(
      7,
      11,
      'VIEWER',
      '{"dates":"LIVING","note":"LIVING","photo":"LIVING"}',
    )
  })
})
