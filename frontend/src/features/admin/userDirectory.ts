import type { AdminUser } from '../../api/auth'

export type UserRoleTab = 'all' | 'SUPER_ADMIN' | 'ADMIN' | 'USER'

const TAB_LABELS: Record<UserRoleTab, string> = {
  all: '全部',
  SUPER_ADMIN: '超级管理员',
  ADMIN: '管理员',
  USER: '普通用户',
}

const USER_ROLE_LABELS: Record<Exclude<UserRoleTab, 'all'>, string> = {
  SUPER_ADMIN: '超级管理员',
  ADMIN: '管理员',
  USER: '普通用户',
}

function hasUserRoleLabel(role: string): role is Exclude<UserRoleTab, 'all'> {
  return role in USER_ROLE_LABELS
}

export function buildUserRoleSummary(users: AdminUser[]) {
  return (['all', 'SUPER_ADMIN', 'ADMIN', 'USER'] as const).map((tab) => ({
    tab,
    label: TAB_LABELS[tab],
    count: tab === 'all' ? users.length : users.filter((user) => user.role === tab).length,
  }))
}

export function filterUsersByRole(users: AdminUser[], activeTab: UserRoleTab) {
  if (activeTab === 'all') return users
  return users.filter((user) => user.role === activeTab)
}

export function getUserRoleLabel(role: AdminUser['role']) {
  return hasUserRoleLabel(role) ? USER_ROLE_LABELS[role] : role
}

export function isProtectedUser(user: Pick<AdminUser, 'role'>) {
  return user.role === 'SUPER_ADMIN'
}
