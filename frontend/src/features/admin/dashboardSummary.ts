export interface DashboardOverviewOptions {
  publicationCount: number
  userCount: number
  isAdmin: boolean
  isSuperAdmin: boolean
  backupLoading: boolean
}

export interface DashboardOverviewCard {
  id: 'publications' | 'create' | 'users' | 'backup'
  title: string
  value: string
  adminOnly?: boolean
  superAdminOnly?: boolean
}

export interface DashboardOverview {
  cards: DashboardOverviewCard[]
}

export function buildDashboardOverview(options: DashboardOverviewOptions): DashboardOverview {
  const cards: DashboardOverviewCard[] = [
    {
      id: 'publications',
      title: '馆藏总卷数',
      value: String(options.publicationCount),
    },
    {
      id: 'create',
      title: '起草新谱',
      value: '立即创建',
    },
  ]

  if (options.isAdmin) {
    cards.push({
      id: 'users',
      title: '编委人数',
      value: String(options.userCount),
      adminOnly: true,
    })
  }

  if (options.isSuperAdmin) {
    cards.push({
      id: 'backup',
      title: '数据归档',
      value: options.backupLoading ? '备份中…' : '数据归档',
      adminOnly: true,
      superAdminOnly: true,
    })
  }

  return { cards }
}
