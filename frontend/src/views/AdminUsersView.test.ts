import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import AdminUsersView from './AdminUsersView.vue'
import { adminChangeRole, adminDeleteUser, adminListUsers } from '../api/admin'

vi.mock('../api/auth', () => ({
  isSuperAdmin: vi.fn(() => true),
}))

vi.mock('../api/admin', () => ({
  adminListUsers: vi.fn(),
  adminCreateUser: vi.fn(),
  adminDeleteUser: vi.fn(),
  adminResetPassword: vi.fn(),
  adminChangeRole: vi.fn(),
}))

describe('AdminUsersView', () => {
  beforeEach(() => {
    vi.mocked(adminListUsers).mockReset()
    vi.mocked(adminDeleteUser).mockReset()
    vi.mocked(adminChangeRole).mockReset()

    vi.mocked(adminListUsers).mockResolvedValue([
      {
        id: 7,
        username: 'alice',
        nickname: 'Alice',
        role: 'USER',
        createdAt: '2026-05-10T12:00:00Z',
      },
    ])
    vi.mocked(adminDeleteUser).mockResolvedValue()
    vi.mocked(adminChangeRole).mockResolvedValue()
  })

  it('requires confirmation before deleting a user', async () => {
    const wrapper = mount(AdminUsersView, {
      global: {
        stubs: {
          Teleport: {
            template: '<div><slot /></div>',
          },
        },
      },
    })

    await flushPromises()
    await wrapper.get('.icon-btn.danger').trigger('click')

    expect(adminDeleteUser).not.toHaveBeenCalled()
    expect(wrapper.text()).toContain('确认删除编委')

    await wrapper.get('button[data-role="confirm"]').trigger('click')

    expect(adminDeleteUser).toHaveBeenCalledWith(7)
  })

  it('requires confirmation before changing a user role', async () => {
    const wrapper = mount(AdminUsersView, {
      global: {
        stubs: {
          Teleport: {
            template: '<div><slot /></div>',
          },
        },
      },
    })

    await flushPromises()
    await wrapper.get('select.glass-select').setValue('ADMIN')

    expect(adminChangeRole).not.toHaveBeenCalled()
    expect(wrapper.text()).toContain('确认调整系统角色')

    await wrapper.get('button[data-role="confirm"]').trigger('click')

    expect(adminChangeRole).toHaveBeenCalledWith(7, 'ADMIN')
  })
})
