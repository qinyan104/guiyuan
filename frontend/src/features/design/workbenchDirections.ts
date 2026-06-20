export type WorkbenchDirectionId = 'archive' | 'pro' | 'collab'

export type WorkbenchDirection = {
  id: WorkbenchDirectionId
  label: string
  title: string
  subtitle: string
  summary: string
  fit: string
  risk: string
  recommended?: boolean
  bullets: string[]
  nowGap: string[]
  rollout: string[]
}

export const workbenchDirections: WorkbenchDirection[] = [
  {
    id: 'archive',
    label: '方向 A',
    title: '典藏长卷',
    subtitle: '像在整理一份可编修的馆藏文献',
    summary:
      '强调文献感、留白和卷宗秩序，画布像被摊开的谱牒长页，工具感退后，仪式感最强。',
    fit: '适合品牌首页气质、重要演示场景，以及高端文化定位。',
    risk: '如果直接作为主工作台，编辑效率会被稀释。',
    bullets: ['纸面层次更强', '顶部动作更克制', '人物信息以边注形式出现'],
    nowGap: [
      '当前版本的工具感比文献感更强，画布像编辑器，不像被展开的谱牒长卷。',
      '顶部与侧边信息块偏多，会打断“阅卷式”的沉浸节奏。',
      '现在的人物编辑抽屉更像功能面板，不像典藏式边注系统。',
    ],
    rollout: [
      '压缩显性操作，把高频按钮收得更静。',
      '增强纸面质感、边注系统和长卷秩序。',
      '把右侧抽屉改得更像“人物录”而不是表单容器。',
    ],
  },
  {
    id: 'pro',
    label: '方向 B',
    title: '专业修谱台',
    subtitle: '像真正拿来长期工作的专业工具',
    summary:
      '让画布成为唯一主角，工具栏和抽屉都服务于编辑效率，看起来专业但不行政后台。',
    fit: '最适合作为现在的正式实现方向，短期能把核心产品做扎实。',
    risk: '如果处理不好，会滑向普通管理系统，所以要用材质和字体把气质拉回来。',
    recommended: true,
    bullets: ['画布优先级最高', '左下焦点块移除', '右侧编辑抽屉成为唯一主编辑区'],
    nowGap: [
      '当前版本已经接近这个方向，但还有重复表达，尤其是多处同时提示当前人物。',
      '顶部还可以再减法，状态、导航、动作还没有完全分层。',
      '画布虽然已经是主角，但周边信息噪音还没压到足够低。',
    ],
    rollout: [
      '移除左下常驻焦点块，只保留必要的瞬时反馈。',
      '继续收束顶部，让它只承载最重要的状态与关键动作。',
      '强化右侧人物抽屉，让它成为唯一主编辑区，避免信息多头并行。',
    ],
  },
  {
    id: 'collab',
    label: '方向 C',
    title: '家族共修台',
    subtitle: '像一个多人共同编修的家族工作现场',
    summary:
      '把协作者、动态、批注和分工可视化，表达“这不是单人画图工具，而是家族共修平台”。',
    fit: '很适合长期商业化和会员体系，但现在不宜压过单人编辑主流程。',
    risk: '前期做得太重，容易把工作台做成协作后台。',
    bullets: ['协作者存在感更强', '活动流更突出', '局部讨论和待处理事项前置'],
    nowGap: [
      '当前版本已经有协作者入口，但协作存在感仍然偏弱，更多像单人编辑器。',
      '“谁在改、改了什么、待确认什么”还没有进入主界面层级。',
      '共修视角的任务感还没建立起来。',
    ],
    rollout: [
      '增强顶部与侧边的协作者状态与最近动态。',
      '把局部讨论、待确认注记和分支处理做成可见层。',
      '仍旧保持画布主角地位，避免变成消息后台。',
    ],
  },
]

export function getWorkbenchDirection(directionId: string | undefined) {
  return workbenchDirections.find((direction) => direction.id === directionId)
}
