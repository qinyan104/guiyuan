import type { AdminUser } from '../../api/auth'

export type UserRoleTab = 'all' | 'SUPER_ADMIN' | 'ADMIN' | 'USER'

const ROLE_LABELS: Record<UserRoleTab, string> = {
  all: '全部',
  SUPER_ADMIN: '超级管理员',
  ADMIN: '管理员',
  USER: '普通用户',
}

export function buildUserRoleSummary(users: AdminUser[]) {
  return (['all', 'SUPER_ADMIN', 'ADMIN', 'USER'] as const).map((tab) => ({
    tab,
    label: ROLE_LABELS[tab],
    count: tab === 'all' ? users.length : users.filter((user) => user.role === tab).length,
  }))
}

export function filterUsersByRole(users: AdminUser[], activeTab: UserRoleTab) {
  if (activeTab === 'all') return users
  return users.filter((user) => user.role === activeTab)
}

export function getUserRoleLabel(role: AdminUser['role']) {
  return ROLE_LABELS[role]
}

export function isProtectedUser(user: Pick<AdminUser, 'role'>) {
  return user.role === 'SUPER_ADMIN'
}
