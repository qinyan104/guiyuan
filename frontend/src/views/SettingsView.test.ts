import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import SettingsView from './SettingsView.vue'
import { listLogs } from '../api/audit'

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

vi.mock('../api/audit', () => ({
  listLogs: vi.fn(),
}))

describe('SettingsView', () => {
  beforeEach(() => {
    vi.mocked(listLogs).mockReset()
    vi.mocked(listLogs).mockResolvedValue([
      {
        id: 11,
        username: 'alice',
        action: 'BACKUP',
        detail: '数据库备份成功',
        createdAt: '2026-05-10T12:30:00Z',
      },
      {
        id: 12,
        username: 'bob',
        action: 'RESTORE_DB',
        detail: '从文件 genealogy_backup.sql 还原数据库',
        createdAt: '2026-05-10T13:45:00Z',
      },
    ])
  })

  it('shows latest backup and restore audit summaries for super admins', async () => {
    const wrapper = mount(SettingsView, {
      global: {
        provide: {
          'show-onboarding': vi.fn(),
        },
        stubs: {
          ConfirmDialog: true,
        },
      },
    })

    await flushPromises()

    expect(wrapper.text()).toContain('最近备份')
    expect(wrapper.text()).toContain('alice')
    expect(wrapper.text()).toContain('最近还原')
    expect(wrapper.text()).toContain('bob')
  })
})
