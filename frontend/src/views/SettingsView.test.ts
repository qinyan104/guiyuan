import { flushPromises, mount } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'

import SettingsView from './SettingsView.vue'

vi.mock('../api/auth', () => ({
  getRole: vi.fn(() => 'SUPER_ADMIN'),
  getUsername: vi.fn(() => 'root'),
  isSuperAdmin: vi.fn(() => true),
}))

vi.mock('../api/profile', () => ({
  changePassword: vi.fn(),
  changeNickname: vi.fn(),
  getMyProfile: vi.fn(() => Promise.resolve({
    person: { name: '馆主', gender: 'unknown', deceased: false },
    publication: { id: 1, title: '测试族谱' },
    hasPendingChanges: false,
    personDbId: 1,
  })),
  updateMyProfileName: vi.fn(),
  uploadAvatar: vi.fn(),
}))

vi.mock('../api/admin', () => ({
  downloadBackup: vi.fn(),
  adminRestoreDatabase: vi.fn(),
  adminCheckConsistency: vi.fn(),
}))

describe('SettingsView', () => {
  it('renders profile and system sections for super admin', async () => {
    const wrapper = mount(SettingsView, {
      global: { stubs: { ConfirmDialog: true } },
    })

    await flushPromises()

    expect(wrapper.text()).toContain('root')
    expect(wrapper.text()).toContain('超级管理员')
    expect(wrapper.text()).toContain('个人资料')
    expect(wrapper.text()).toContain('登录密码')
    expect(wrapper.text()).toContain('数据备份')
    expect(wrapper.text()).toContain('数据库还原')
  })
})
