# 移动端阅读模式设计

## 概述

为族谱管理系统添加移动端适配，**阅读优先**（编辑保留在桌面端）。亲戚/家属能在手机和平板上顺畅浏览族谱树、人物详情、时间线和数据看板。

## 设计原则

- **阅读优先**：移动端可以浏览全部核心数据，编辑操作回到桌面端
- **渐进增强**：能用 CSS 解决的就不新建组件，真正需要才新建
- **共享数据层**：移动端和桌面端共用同一套 composables、API、types、路由
- **单一代码库**：不引入 `/mobile/*` 路由路径，通过 layout 分发

## 总体架构

```
App.vue
├── 桌面端（>= 768px）→ AdminLayout / PublicationLayout（现有）
└── 移动端（< 768px）
    ├── 全局路由（dashboard, publications, settings）→ MobileLayout
    │   ├── MobileTopBar
    │   ├── <router-view>
    │   └── MobileBottomNav（全局模式）
    └── 族谱内路由（/publication/:id/*）
        └── PublicationLayout（移动感知）
            ├── MobileTopBar
            ├── <router-view>
            └── MobileBottomNav（族谱内模式）
```

### 关键设计决策

`PublicationLayout` 在移动模式下自身渲染方式改变——不再是纯 `<router-view>` 容器，而是包含 `MobileTopBar + <router-view> + MobileBottomNav` 的完整壳。这样 `Provide/Inject` 数据上下文保持不变，子视图（WorkbenchView 等）无需感知它们是桌面端还是移动端。


### 设备检测

`composables/useMobile.ts`（新建）
- 使用 `window.matchMedia('(max-width: 768px)')`
- 暴露 `isMobile` ref，响应式自动更新
- 附加 `isTouchDevice` 检测（`'ontouchstart' in window`）

### Layout 分发

`App.vue` 根据 `isMobile` 动态切换：
```ts
<component :is="isMobile ? MobileLayout : AdminLayout" />
```

路由保持不变，两套 layout 共用同一套定义。

## 组件结构

### MobileLayout.vue（新建）

```
┌──────────────────────┐
│     MobileTopBar      │  ← 标题 + 返回按钮
├──────────────────────┤
│    <router-view>      │  ← 内容区
├──────────────────────┤
│  首页 │ 谱目 │ 设置   │  ← MobileBottomNav
└──────────────────────┘
```

### MobileTopBar

| 区域 | 内容 |
|------|------|
| 左侧 | 返回按钮（`router.back()`，有上一级时显示） |
| 中间 | 当前页面标题 |
| 右侧 | 用户头像/退出 |

### MobileBottomNav

两级导航：

**全局模式**（不在 publication 内）：

| 标签 | 路由 | 图标 |
|------|------|------|
| 首页 | `dashboard` | home |
| 馆藏谱目 | `publications` | book |
| 设置 | `settings` | settings |

**族谱内模式**（在 PublicationLayout 子路由内）：

| 标签 | 路由 | 图标 |
|------|------|------|
| 谱图 | `workbench` | tree |
| 人物 | `person-detail` | user |
| 年表 | `timeline` | clock |
| 数据 | `publication-stats` | chart |

使用 `route.name` 判断当前处于哪一级。活跃标签高亮。

## 视图映射

| 桌面组件 | 移动端 | 策略 |
|---------|--------|------|
| DashboardView | **MobileDashboard.vue**（新建） | 简化版：最近族谱 + 快捷入口 |
| PublicationListView | 复用，CSS 响应式 | 卡片单列流式 |
| WorkbenchView | **MobileWorkbench.vue**（新建） | 只读画布，触控平移+缩放 |
| PersonDetailView | 复用，CSS 响应式 | 860px → `max-width: 100%` |
| TimelineView | 复用，CSS 响应式 | 双轨变单轨堆叠 |
| PublicationStatsView | 复用，CSS 响应式 | 图表自适应 |
| ShareView | 复用，CSS 响应式 | 流式布局 |

### PersonDetailView 移动端适配

当前 860px 居中单列布局改为：
- `max-width: 100%` 流式
- 头像区域 `width: 100%` + `aspect-ratio: 1`
- 文字排版保持宣纸纹理和字体
- 减少内边距 `padding: 24px 16px`

### TimelineView 移动端适配

当前双轨时间线改为：
- 双轨 → 单轨纵向排列
- 事件卡片 `width: 100%`
- 时间标签改为嵌入卡片顶部而非左侧

### PublicationStatsView 移动端适配

- 图表组件容器 `width: 100%`
- 统计卡片网格改为单列
- KPI 数字保持大字但横向排列时可换行

### MobileWorkbench.vue（只读画布）

新组件，功能：
- 加载 `PublicationLayout` Provide/Inject 的数据
- 渲染树形画布（复用 `PublicationCanvas` 的渲染逻辑）
- **只读模式**：无添加/删除/拖拽编辑
- **触控交互**：
  - 单指平移
  - 双指缩放（pinch zoom）
  - 点击人物跳转 PersonDetailView
- 无阴影/滤镜（性能优化）

## 路由

路由定义不变，`App.vue` 负责 layout 分发。`MobileLayout` 内需要使用嵌套的 `<router-view>` 传递子路由。

## 状态管理

- 不新增全局 store
- 移动端使用和桌面端相同的 composables
- `usePublicationState`、`useEditorHistory` 等原样复用
- `useMobile` 只在 layout 层和需要特殊触控处理的视图中使用

## 不在此范围

以下功能在移动端不做：
- 画布编辑（添加/删除人物、拖拽节点、修改关系）
- 族谱创建/导入
- 导出（PDF、SVG、分享 HTML）
- 协作者管理
- 管理员后台（用户管理、审计日志）

## 测试计划

- `useMobile` composable 单元测试（matchMedia mock）
- MobileLayout 组件测试（底部导航高亮、路由跳转）
- MobileWorkbench 触控交互测试
- 响应式 CSS 的组件测试（窗口 resize）
