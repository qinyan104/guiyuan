import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import SettingsView from './SettingsView.vue'

vi.mock('../api/auth', () => ({
  getUsername: vi.fn(() => 'root'),
  isSuperAdmin: vi.fn(() => true),
}))

vi.mock('../api/profile', () => ({
  changePassword: vi.fn(),
  changeNickname: vi.fn(),
  uploadAvatar: vi.fn(),
}))

vi.mock('../api/admin', () => ({
  downloadBackup: vi.fn(),
  adminRestoreDatabase: vi.fn(),
  adminCheckConsistency: vi.fn(),
}))

describe('SettingsView', () => {
  it('renders profile, account and admin sections for super admin', async () => {
    const wrapper = mount(SettingsView, {
      global: {
        stubs: { ConfirmDialog: true },
      },
    })

    await flushPromises()

    expect(wrapper.text()).toContain('root')
    expect(wrapper.text()).toContain('系统编委')
    expect(wrapper.text()).toContain('身份标识')
    expect(wrapper.text()).toContain('通行密钥')
    expect(wrapper.text()).toContain('数据备份')
    expect(wrapper.text()).toContain('数据库还原')
  })
})
