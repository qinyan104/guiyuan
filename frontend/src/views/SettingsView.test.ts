import { flushPromises, mount } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'

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
  it('shows profile by default, system tab navigable for super admin', async () => {
    const wrapper = mount(SettingsView, {
      global: { stubs: { ConfirmDialog: true } },
    })

    await flushPromises()

    // Default: profile
    expect(wrapper.text()).toContain('root')

    // Navigate to system
    const items = wrapper.findAll('.nav-item')
    await items[items.length - 1].trigger('click')

    expect(wrapper.text()).toContain('数据备份')
    expect(wrapper.text()).toContain('下载备份')
    expect(wrapper.text()).toContain('数据库还原')
  })
})
