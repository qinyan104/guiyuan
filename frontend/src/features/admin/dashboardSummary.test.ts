import { describe, expect, it } from 'vitest'

import { buildDashboardOverview } from './dashboardSummary'

describe('buildDashboardOverview', () => {
  it('hides admin-only cards for non-admin viewers', () => {
    const result = buildDashboardOverview({
      publicationCount: 3,
      userCount: 9,
      isAdmin: false,
      isSuperAdmin: false,
      backupLoading: false,
    })

    expect(result.cards.map((card) => card.id)).toEqual(['publications', 'create'])
  })

  it('shows admin cards in the middle of the summary', () => {
    const result = buildDashboardOverview({
      publicationCount: 3,
      userCount: 9,
      isAdmin: true,
      isSuperAdmin: false,
      backupLoading: false,
    })

    expect(result.cards.map((card) => card.id)).toEqual(['publications', 'users', 'create'])
  })

  it('shows super-admin cards at the end of the summary', () => {
    const result = buildDashboardOverview({
      publicationCount: 3,
      userCount: 9,
      isAdmin: true,
      isSuperAdmin: true,
      backupLoading: false,
    })

    expect(result.cards.map((card) => card.id)).toEqual(['publications', 'users', 'create', 'backup'])
  })

  it('shows idle backup text when backup is available', () => {
    const result = buildDashboardOverview({
      publicationCount: 6,
      userCount: 2,
      isAdmin: true,
      isSuperAdmin: true,
      backupLoading: false,
    })

    expect(result.cards.find((card) => card.id === 'backup')?.value).toBe('立即备份')
  })

  it('shows loading backup text while backup is running', () => {
    const result = buildDashboardOverview({
      publicationCount: 6,
      userCount: 2,
      isAdmin: true,
      isSuperAdmin: true,
      backupLoading: true,
    })

    expect(result.cards.find((card) => card.id === 'backup')?.value).toBe('备份中…')
  })
})
