export type AdminRouteName =
  | 'dashboard'
  | 'publications'
  | 'admin-users'
  | 'admin-logs'
  | 'settings'

export interface AdminPageMeta {
  routeName: AdminRouteName
  sectionTitle: string
  pageTitle: string
  pageDescription: string
  sidebarLabel: string
  icon: 'home' | 'book' | 'users' | 'log' | 'settings'
  adminOnly?: boolean
}

export interface AdminNavItem {
  key: string
  routeName: AdminRouteName
  label: string
  icon: AdminPageMeta['icon']
  adminOnly?: boolean
}

const ADMIN_PAGE_META: Record<AdminRouteName, AdminPageMeta> = {
  dashboard: {
    routeName: 'dashboard',
    sectionTitle: '后台总览',
    pageTitle: '工作台',
    pageDescription: '总览馆藏概况、最近编研卷册与关键系统动作。',
    sidebarLabel: '首页',
    icon: 'home',
  },
  publications: {
    routeName: 'publications',
    sectionTitle: '谱牒馆藏',
    pageTitle: '族谱管理',
    pageDescription: '归档、检索并继续编研现有族谱卷册。',
    sidebarLabel: '族谱管理',
    icon: 'book',
  },
  'admin-users': {
    routeName: 'admin-users',
    sectionTitle: '系统治理',
    pageTitle: '用户管理',
    pageDescription: '维护账号、角色与后台访问秩序。',
    sidebarLabel: '用户管理',
    icon: 'users',
    adminOnly: true,
  },
  'admin-logs': {
    routeName: 'admin-logs',
    sectionTitle: '系统治理',
    pageTitle: '操作日志',
    pageDescription: '查阅后台行为流水、风险动作与备份记录。',
    sidebarLabel: '操作日志',
    icon: 'log',
    adminOnly: true,
  },
  settings: {
    routeName: 'settings',
    sectionTitle: '系统治理',
    pageTitle: '系统设置',
    pageDescription: '调整后台主题、偏好与基础系统配置。',
    sidebarLabel: '系统设置',
    icon: 'settings',
  },
}

export function getAdminPageMeta(routeName: unknown): AdminPageMeta {
  if (typeof routeName === 'string' && routeName in ADMIN_PAGE_META) {
    return ADMIN_PAGE_META[routeName as AdminRouteName]
  }
  return ADMIN_PAGE_META.dashboard
}

export function getAdminNavItems(): AdminNavItem[] {
  return [
    { key: 'dashboard', routeName: 'dashboard', label: '首页', icon: 'home' },
    { key: 'publications', routeName: 'publications', label: '族谱管理', icon: 'book' },
    { key: 'users', routeName: 'admin-users', label: '用户管理', icon: 'users', adminOnly: true },
    { key: 'logs', routeName: 'admin-logs', label: '操作日志', icon: 'log', adminOnly: true },
  ]
}

export function buildAdminBreadcrumb(meta: AdminPageMeta): string {
  return `${meta.sectionTitle} / ${meta.pageTitle}`
}
