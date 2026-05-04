export interface DashboardCard {
  id: 'publications' | 'users' | 'create' | 'backup'
  label: string
  value: string
  detail: string
  tone: 'ink' | 'amber' | 'olive' | 'danger'
}

export interface DashboardOverview {
  heroEyebrow: string
  heroTitle: string
  heroDetail: string
  cards: DashboardCard[]
}

export function buildDashboardOverview(input: {
  publicationCount: number
  userCount: number
  isAdmin: boolean
  isSuperAdmin: boolean
  backupLoading: boolean
}): DashboardOverview {
  const cards: DashboardCard[] = [
    {
      id: 'publications',
      label: '馆藏族谱',
      value: String(input.publicationCount),
      detail: '当前可继续编研的卷册总数',
      tone: 'ink',
    },
    {
      id: 'create',
      label: '快捷动作',
      value: '新建卷册',
      detail: '从空白卷或模板开始新的编研工作',
      tone: 'amber',
    },
  ]

  if (input.isAdmin) {
    cards.splice(1, 0, {
      id: 'users',
      label: '后台用户',
      value: String(input.userCount),
      detail: '当前拥有后台访问权限的账号总数',
      tone: 'olive',
    })
  }

  if (input.isSuperAdmin) {
    cards.push({
      id: 'backup',
      label: '系统维护',
      value: input.backupLoading ? '备份中…' : '立即备份',
      detail: '执行数据库备份并保留最近一次系统快照',
      tone: 'danger',
    })
  }

  return {
    heroEyebrow: '馆藏总览',
    heroTitle: '今日可从最近编研卷册继续工作',
    heroDetail: '保留现有数据流，只重构摘要信息的组织方式与视觉层级。',
    cards,
  }
}
