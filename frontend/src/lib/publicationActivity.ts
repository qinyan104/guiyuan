export type ActivityCategory = 'all' | 'person' | 'publication' | 'sharing' | 'danger'
export type ActivityTone = 'info' | 'success' | 'warning' | 'danger'

export interface ActivityMeta {
  label: string
  category: Exclude<ActivityCategory, 'all'>
  tone: ActivityTone
}

export interface ActivityLike {
  action: string
  createdAt: string
  username?: string | null
}

export interface ActivitySummary {
  totalCount: number
  todayCount: number
  latestUsername: string
  latestActionLabel: string
  latestCreatedAt: string
}

const DEFAULT_ACTIVITY_META: ActivityMeta = {
  label: '其他操作',
  category: 'publication',
  tone: 'info',
}

const PUBLICATION_ACTIVITY_META: Record<string, ActivityMeta> = {
  CREATE_PUB: { label: '创建族谱', category: 'publication', tone: 'success' },
  UPDATE_PUB: { label: '保存族谱', category: 'person', tone: 'info' },
  UPDATE_PUB_META: { label: '修改族谱信息', category: 'publication', tone: 'info' },
  UPDATE_PERSON: { label: '编辑人物', category: 'person', tone: 'info' },
  DELETE_PUB: { label: '删除族谱', category: 'danger', tone: 'danger' },
  CREATE_SHARE_LINK: { label: '创建分享链接', category: 'sharing', tone: 'success' },
  REVOKE_SHARE_LINK: { label: '撤销分享链接', category: 'sharing', tone: 'warning' },
  UPDATE_ACCESS: { label: '更新协作者', category: 'sharing', tone: 'info' },
  REMOVE_ACCESS: { label: '移除协作者', category: 'sharing', tone: 'warning' },
}

export const PUBLICATION_ACTIVITY_FILTERS: Array<{ key: ActivityCategory; label: string }> = [
  { key: 'all', label: '全部' },
  { key: 'person', label: '人物变更' },
  { key: 'publication', label: '族谱信息' },
  { key: 'sharing', label: '分享协作' },
  { key: 'danger', label: '危险操作' },
]

export function getPublicationActivityMeta(action?: string | null): ActivityMeta {
  if (!action) return DEFAULT_ACTIVITY_META
  return PUBLICATION_ACTIVITY_META[action] ?? { ...DEFAULT_ACTIVITY_META, label: action }
}

export function getPublicationActivityLabel(action?: string | null): string {
  return action ? getPublicationActivityMeta(action).label : ''
}

export function filterPublicationActivity<T extends ActivityLike>(
  entries: T[],
  filter: ActivityCategory,
): T[] {
  if (filter === 'all') return entries
  return entries.filter((entry) => getPublicationActivityMeta(entry.action).category === filter)
}

export function summarizePublicationActivity(
  entries: ActivityLike[],
  now = new Date(),
): ActivitySummary {
  const latest = entries[0]
  const todayKey = now.toISOString().slice(0, 10)
  const todayCount = entries.filter((entry) => entry.createdAt.slice(0, 10) === todayKey).length

  return {
    totalCount: entries.length,
    todayCount,
    latestUsername: latest?.username || '暂无',
    latestActionLabel: latest ? getPublicationActivityMeta(latest.action).label : '暂无记录',
    latestCreatedAt: latest?.createdAt || '',
  }
}
