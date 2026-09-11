import { describe, expect, it } from 'vitest'

import { getAuditActionMeta, summarizeAuditLogs } from './auditTimeline'

describe('auditTimeline helpers', () => {
  it('maps known actions to readable labels and tones', () => {
    expect(getAuditActionMeta('DELETE_USER')).toEqual({
      label: '删除用户',
      tone: 'danger',
    })
  })

  it('builds summary counters for the current day', () => {
    const logs = [
      { id: 1, username: 'root', action: 'BACKUP', detail: 'nightly', createdAt: '2026-05-04T01:00:00Z' },
      { id: 2, username: 'editor', action: 'DELETE_USER', detail: 'viewer', createdAt: '2026-05-04T02:00:00Z' },
      { id: 3, username: 'root', action: 'LOGIN', detail: '', createdAt: '2026-05-03T02:00:00Z' },
    ]

    const result = summarizeAuditLogs(logs, new Date('2026-05-04T10:00:00Z'))

    expect(result).toEqual({
      totalCount: 3,
      todayCount: 2,
      riskCount: 1,
      latestBackupAt: '2026-05-04T01:00:00Z',
    })
  })

  it('counts entries by local calendar day', () => {
    const logs = [
      { id: 1, username: 'root', action: 'LOGIN', detail: '', createdAt: '2026-05-03T16:30:00Z' },
      { id: 2, username: 'editor', action: 'LOGOUT', detail: '', createdAt: '2026-05-03T15:30:00Z' },
    ]

    const result = summarizeAuditLogs(logs, new Date('2026-05-04T10:00:00+08:00'))

    expect(result.todayCount).toBe(1)
  })

  it('uses the latest backup timestamp regardless of input order', () => {
    const logs = [
      { id: 1, username: 'root', action: 'BACKUP', detail: 'older', createdAt: '2026-05-04T01:00:00Z' },
      { id: 2, username: 'root', action: 'BACKUP', detail: 'newer', createdAt: '2026-05-04T03:00:00Z' },
      { id: 3, username: 'editor', action: 'DELETE_USER', detail: 'viewer', createdAt: '2026-05-04T02:00:00Z' },
    ]

    const result = summarizeAuditLogs(logs, new Date('2026-05-04T10:00:00Z'))

    expect(result.latestBackupAt).toBe('2026-05-04T03:00:00Z')
  })
})
