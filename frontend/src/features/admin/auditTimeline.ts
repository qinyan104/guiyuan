import type { AuditLogEntry } from '../../api/audit'

export type AuditTone = 'neutral' | 'info' | 'success' | 'danger'

const ACTION_META: Record<string, { label: string; tone: AuditTone }> = {
  LOGIN: { label: '登录', tone: 'info' },
  LOGOUT: { label: '退出登录', tone: 'neutral' },
  CREATE_PUB: { label: '创建族谱', tone: 'success' },
  DELETE_PUB: { label: '删除族谱', tone: 'danger' },
  UPDATE_PUB: { label: '更新族谱', tone: 'neutral' },
  CREATE_USER: { label: '创建用户', tone: 'success' },
  DELETE_USER: { label: '删除用户', tone: 'danger' },
  RESET_PASSWORD: { label: '重置密码', tone: 'danger' },
  BACKUP: { label: '数据库备份', tone: 'success' },
}

export function getAuditActionMeta(action: string) {
  return ACTION_META[action] ?? { label: action, tone: 'neutral' as const }
}

function getLocalDayKey(value: string | Date) {
  const date = typeof value === 'string' ? new Date(value) : value

  return [date.getFullYear(), date.getMonth(), date.getDate()].join('-')
}

export function summarizeAuditLogs(logs: AuditLogEntry[], now = new Date()) {
  const todayKey = getLocalDayKey(now)
  const todayCount = logs.filter((log) => getLocalDayKey(log.createdAt) === todayKey).length
  const riskCount = logs.filter((log) => getAuditActionMeta(log.action).tone === 'danger').length
  const latestBackupAt = logs.reduce<string | null>((latest, log) => {
    if (log.action !== 'BACKUP') {
      return latest
    }

    return latest === null || log.createdAt > latest ? log.createdAt : latest
  }, null)

  return {
    totalCount: logs.length,
    todayCount,
    riskCount,
    latestBackupAt,
  }
}
