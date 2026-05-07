export type AdminNavIcon = 'home' | 'book' | 'users' | 'log' | 'settings'

export interface AdminPageMeta {
  routeName: string
  icon: AdminNavIcon
  sectionTitle: string
  pageTitle: string
  sidebarLabel: string
  adminOnly?: boolean
}

const ADMIN_PAGE_META: AdminPageMeta[] = [
  {
    routeName: 'dashboard',
    icon: 'home',
    sectionTitle: '后台总览',
    pageTitle: '工作台',
    sidebarLabel: '首页',
  },
  {
    routeName: 'publications',
    icon: 'book',
    sectionTitle: '藏谱管理',
    pageTitle: '族谱藏馆',
    sidebarLabel: '藏馆谱目',
  },
  {
    routeName: 'settings',
    icon: 'settings',
    sectionTitle: '系统偏好',
    pageTitle: '偏好设置',
    sidebarLabel: '设置',
  },
  {
    routeName: 'admin-users',
    icon: 'users',
    sectionTitle: '系统治理',
    pageTitle: '编委名录',
    sidebarLabel: '编委名录',
    adminOnly: true,
  },
  {
    routeName: 'admin-logs',
    icon: 'log',
    sectionTitle: '系统治理',
    pageTitle: '操作日志',
    sidebarLabel: '修谱纪事',
    adminOnly: true,
  },
]

const DEFAULT_PAGE_META = ADMIN_PAGE_META[0]

function findAdminPageMeta(routeName: string | null | undefined): AdminPageMeta | undefined {
  return ADMIN_PAGE_META.find((item) => item.routeName === routeName)
}

export function getAdminPageMeta(routeName: string | null | undefined): AdminPageMeta {
  return findAdminPageMeta(routeName) ?? DEFAULT_PAGE_META
}

export function getAdminNavItems(): AdminPageMeta[] {
  return ADMIN_PAGE_META.map((item) => ({ ...item }))
}

export function isAdminOnlyRouteName(routeName: string | null | undefined): boolean {
  return findAdminPageMeta(routeName)?.adminOnly === true
}

export function buildAdminBreadcrumb(meta: AdminPageMeta): string {
  return `${meta.sectionTitle} / ${meta.pageTitle}`
}
