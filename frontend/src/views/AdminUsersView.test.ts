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
    document.body.innerHTML = ''
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
      attachTo: document.body,
    })

    await flushPromises()
    await wrapper.get('.icon-btn.danger').trigger('click')
    await flushPromises()

    expect(adminDeleteUser).not.toHaveBeenCalled()
    expect(document.body.textContent).toContain('确认删除编委')

    const confirmButton = document.body.querySelector('button[data-role="confirm"]') as HTMLButtonElement
    confirmButton.click()
    await flushPromises()

    expect(adminDeleteUser).toHaveBeenCalledWith(7)
  })

  it('requires confirmation before changing a user role', async () => {
    const wrapper = mount(AdminUsersView, {
      attachTo: document.body,
    })

    await flushPromises()

    await wrapper.get('.role-select .app-select__trigger').trigger('click')
    await flushPromises()

    const adminOption = [...document.body.querySelectorAll('.app-select__option')]
      .find((option) => option.textContent?.trim() === '协修') as HTMLElement | undefined
    expect(adminOption).not.toBeNull()
    adminOption!.click()
    await flushPromises()

    expect(adminChangeRole).not.toHaveBeenCalled()
    expect(document.body.textContent).toContain('确认调整系统角色')

    const confirmButton = document.body.querySelector('button[data-role="confirm"]') as HTMLButtonElement
    confirmButton.click()
    await flushPromises()

    expect(adminChangeRole).toHaveBeenCalledWith(7, 'ADMIN')
  })
})
