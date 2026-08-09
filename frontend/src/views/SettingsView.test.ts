import { flushPromises, mount } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'

import SettingsView from './SettingsView.vue'
import { changePassword } from '../api/profile'

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

  it('blocks a password that does not meet the server strength policy', async () => {
    const wrapper = mount(SettingsView)

    await flushPromises()

    const passwordInputs = wrapper.findAll('input[type="password"]')
    await passwordInputs[0].setValue('123456')
    await passwordInputs[1].setValue('weakpass')
    await passwordInputs[2].setValue('weakpass')
    await wrapper.findAll('button').find((button) => button.text().includes('更新密码'))!.trigger('click')

    expect(changePassword).not.toHaveBeenCalled()
    expect(wrapper.text()).toContain('新密码须包含大小写字母和数字')
  })
})
