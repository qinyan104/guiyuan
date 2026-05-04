import { describe, expect, it } from 'vitest'

import {
  buildUserRoleSummary,
  filterUsersByRole,
  getUserRoleLabel,
  isProtectedUser,
} from './userDirectory'

const users = [
  { id: 1, username: 'root', nickname: '馆主', role: 'SUPER_ADMIN', createdAt: '2026-05-01T00:00:00Z' },
  { id: 2, username: 'editor', nickname: '编修', role: 'ADMIN', createdAt: '2026-05-01T00:00:00Z' },
  { id: 3, username: 'viewer', nickname: '访客', role: 'USER', createdAt: '2026-05-01T00:00:00Z' },
]

describe('userDirectory helpers', () => {
  it('builds role counts in tab order', () => {
    expect(buildUserRoleSummary(users)).toEqual([
      { tab: 'all', label: '全部', count: 3 },
      { tab: 'SUPER_ADMIN', label: '超级管理员', count: 1 },
      { tab: 'ADMIN', label: '管理员', count: 1 },
      { tab: 'USER', label: '普通用户', count: 1 },
    ])
  })

  it('filters by active role tab', () => {
    expect(filterUsersByRole(users, 'ADMIN').map((user) => user.username)).toEqual(['editor'])
  })

  it('returns all users for the all tab', () => {
    expect(filterUsersByRole(users, 'all').map((user) => user.username)).toEqual(['root', 'editor', 'viewer'])
  })

  it('protects super admin rows', () => {
    expect(isProtectedUser(users[0])).toBe(true)
    expect(isProtectedUser(users[2])).toBe(false)
  })

  it('maps role enums to readable labels', () => {
    expect(getUserRoleLabel('ADMIN')).toBe('管理员')
    expect(getUserRoleLabel('SUPER_ADMIN')).toBe('超级管理员')
    expect(getUserRoleLabel('USER')).toBe('普通用户')
  })

  it('returns unknown roles unchanged', () => {
    expect(getUserRoleLabel('AUDITOR')).toBe('AUDITOR')
  })
})
