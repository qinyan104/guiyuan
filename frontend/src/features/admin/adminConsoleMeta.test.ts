import { describe, expect, it } from 'vitest'

import {
  buildAdminBreadcrumb,
  getAdminNavItems,
  getAdminPageMeta,
} from './adminConsoleMeta'

describe('adminConsoleMeta', () => {
  it('returns dashboard metadata for known routes', () => {
    expect(getAdminPageMeta('dashboard')).toMatchObject({
      routeName: 'dashboard',
      sectionTitle: '后台总览',
      pageTitle: '工作台',
      sidebarLabel: '首页',
    })
  })

  it('falls back to dashboard metadata for unknown routes', () => {
    expect(getAdminPageMeta('not-a-route')).toMatchObject({
      routeName: 'dashboard',
      pageTitle: '工作台',
    })
  })

  it('falls back to dashboard metadata for inherited prototype keys', () => {
    expect(getAdminPageMeta('toString')).toMatchObject({
      routeName: 'dashboard',
      pageTitle: '工作台',
    })
  })

  it('builds a readable breadcrumb string', () => {
    const breadcrumb = buildAdminBreadcrumb(getAdminPageMeta('admin-logs'))
    expect(breadcrumb).toBe('系统治理 / 操作日志')
  })

  it('marks admin-only navigation items', () => {
    expect(getAdminNavItems()).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ routeName: 'admin-users', adminOnly: true }),
        expect.objectContaining({ routeName: 'admin-logs', adminOnly: true }),
      ]),
    )
  })
})
