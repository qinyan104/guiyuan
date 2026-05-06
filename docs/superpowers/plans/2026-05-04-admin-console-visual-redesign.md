# Admin Console Visual Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement a unified archive-inspired admin console shell and redesign the dashboard, publication list, user management, and audit log pages without changing existing admin data flows.

**Architecture:** Extract shared admin metadata and derived view-model helpers into testable TypeScript modules, add a small set of reusable admin UI primitives plus global admin design tokens, then refactor `AdminLayout.vue` and the four admin views in place. Keep the existing router and API calls intact; focus changes on copy normalization, layout structure, shared styling, and responsive behavior.

**Tech Stack:** Vue 3 (Composition API), TypeScript, Vue Router, Vitest, global CSS tokens, scoped component CSS.

## Execution Status (2026-05-05)

- Worktree: `C:\Users\HX\Desktop\族谱管理系统\.worktrees\admin-console-visual-redesign`
- Branch: `feature/admin-console-visual-redesign`
- Baseline verification:
  - `npm.cmd run test` passed in the worktree before implementation (`7 files`, `40 tests`)
  - `npm.cmd run build` is still blocked by unrelated pre-existing TypeScript errors in `frontend/src/components/PublicationCanvas.vue:455` and `frontend/src/views/PublicationStatsView.vue:68`, `:70`, `:77`
- Completed tasks:
  - Task 1 complete, final reviewed head `d79bb2ecec7847e007046f76395a32d3172814b5`
  - Task 2 complete, final reviewed head `6254b69cef43e194ca9f02cfe87deb7620dd1102`
  - Task 3 complete, final reviewed head `16279a2`
  - Task 4 complete, final reviewed head `f7a6478c06593d761c41f3f24fd1fa65437797f7`
- Review status:
  - Task 1 through Task 4 passed scoped code review and are ready to merge into the feature branch implementation stream
  - Task 4 final re-review confirmed both earlier correctness issues were fixed; remaining notes are non-blocking only
  - The task-specific subagents used for Task 4 review and re-review were closed after the final handoff was captured
- Remaining work:
  - Task 5 through Task 11 are not started in the implementation branch
  - Keep the unrelated build failures separate from this redesign track unless explicitly pulled into scope

---

## File Structure

**Create**

- `frontend/src/features/admin/adminConsoleMeta.ts`
  Route metadata, sidebar items, breadcrumb text, and clean Chinese admin copy.
- `frontend/src/features/admin/adminConsoleMeta.test.ts`
  Tests for route metadata fallback, breadcrumb text, and admin-only nav items.
- `frontend/src/features/admin/dashboardSummary.ts`
  Derived dashboard hero/highlight card data from existing counts and flags.
- `frontend/src/features/admin/dashboardSummary.test.ts`
  Tests for dashboard highlight visibility and copy.
- `frontend/src/features/admin/userDirectory.ts`
  Role summary, filtering, and protected-user rules for the users page.
- `frontend/src/features/admin/userDirectory.test.ts`
  Tests for user role counts, filtering, and protected rows.
- `frontend/src/features/admin/auditTimeline.ts`
  Audit action labels/tones and log summary calculations.
- `frontend/src/features/admin/auditTimeline.test.ts`
  Tests for audit action mapping and summary counters.
- `frontend/src/components/admin/AdminPageHeader.vue`
  Shared page header with eyebrow, title, description, and action slot.
- `frontend/src/components/admin/AdminSummaryCard.vue`
  Shared stat/summary card used by dashboard and audit summary strips.
- `frontend/src/components/admin/AdminStateBlock.vue`
  Shared loading / empty / notice / error block for admin pages.
- `frontend/src/styles/admin-console.css`
  Shared admin console tokens and reusable shell/page classes.

**Modify**

- `frontend/src/main.ts`
  Import the new admin stylesheet.
- `frontend/src/style.css`
  Move the hard desktop `min-width` constraint off `body` so admin pages can become responsive.
- `frontend/src/composables/useTheme.ts`
  Replace garbled Chinese theme labels/descriptions with clean copy.
- `frontend/src/components/ThemeSwitcher.vue`
  Replace garbled UI copy and keep the trigger text compact for the new topbar.
- `frontend/src/views/AdminLayout.vue`
  Rebuild sidebar/topbar shell, breadcrumbs, and responsive drawer behavior.
- `frontend/src/views/DashboardView.vue`
  Convert the page into a narrative “卷首总览” layout using shared summary cards and state blocks.
- `frontend/src/views/PublicationListView.vue`
  Normalize copy and align the archive cards/dialogs with the shared admin shell language.
- `frontend/src/views/AdminUsersView.vue`
  Rebuild the page as a “名录册 / 人员簿” layout using shared helpers and components.
- `frontend/src/views/AuditLogView.vue`
  Rebuild the page as a “馆务流水簿” layout using shared helpers and components.

## Task 1: Create Admin Route Metadata Foundation

**Files:**
- Create: `frontend/src/features/admin/adminConsoleMeta.ts`
- Create: `frontend/src/features/admin/adminConsoleMeta.test.ts`

- [x] **Step 1: Write the failing metadata test**

```ts
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
```

- [x] **Step 2: Run the test to confirm it fails**

Run from `frontend`:

```bash
npm run test -- src/features/admin/adminConsoleMeta.test.ts
```

Expected: FAIL with `Cannot find module './adminConsoleMeta'`.

- [x] **Step 3: Implement the admin metadata module**

```ts
export type AdminRouteName =
  | 'dashboard'
  | 'publications'
  | 'admin-users'
  | 'admin-logs'
  | 'settings'

export interface AdminPageMeta {
  routeName: AdminRouteName
  sectionTitle: string
  pageTitle: string
  pageDescription: string
  sidebarLabel: string
  icon: 'home' | 'book' | 'users' | 'log' | 'settings'
  adminOnly?: boolean
}

export interface AdminNavItem {
  key: string
  routeName: AdminRouteName
  label: string
  icon: AdminPageMeta['icon']
  adminOnly?: boolean
}

const ADMIN_PAGE_META: Record<AdminRouteName, AdminPageMeta> = {
  dashboard: {
    routeName: 'dashboard',
    sectionTitle: '后台总览',
    pageTitle: '工作台',
    pageDescription: '总览馆藏概况、最近编研卷册与关键系统动作。',
    sidebarLabel: '首页',
    icon: 'home',
  },
  publications: {
    routeName: 'publications',
    sectionTitle: '谱牒馆藏',
    pageTitle: '族谱管理',
    pageDescription: '归档、检索并继续编研现有族谱卷册。',
    sidebarLabel: '族谱管理',
    icon: 'book',
  },
  'admin-users': {
    routeName: 'admin-users',
    sectionTitle: '系统治理',
    pageTitle: '用户管理',
    pageDescription: '维护账号、角色与后台访问秩序。',
    sidebarLabel: '用户管理',
    icon: 'users',
    adminOnly: true,
  },
  'admin-logs': {
    routeName: 'admin-logs',
    sectionTitle: '系统治理',
    pageTitle: '操作日志',
    pageDescription: '查阅后台行为流水、风险动作与备份记录。',
    sidebarLabel: '操作日志',
    icon: 'log',
    adminOnly: true,
  },
  settings: {
    routeName: 'settings',
    sectionTitle: '系统治理',
    pageTitle: '系统设置',
    pageDescription: '调整后台主题、偏好与基础系统配置。',
    sidebarLabel: '系统设置',
    icon: 'settings',
  },
}

export function getAdminPageMeta(routeName: unknown): AdminPageMeta {
  if (typeof routeName === 'string' && routeName in ADMIN_PAGE_META) {
    return ADMIN_PAGE_META[routeName as AdminRouteName]
  }
  return ADMIN_PAGE_META.dashboard
}

export function getAdminNavItems(): AdminNavItem[] {
  return [
    { key: 'dashboard', routeName: 'dashboard', label: '首页', icon: 'home' },
    { key: 'publications', routeName: 'publications', label: '族谱管理', icon: 'book' },
    { key: 'users', routeName: 'admin-users', label: '用户管理', icon: 'users', adminOnly: true },
    { key: 'logs', routeName: 'admin-logs', label: '操作日志', icon: 'log', adminOnly: true },
  ]
}

export function buildAdminBreadcrumb(meta: AdminPageMeta): string {
  return `${meta.sectionTitle} / ${meta.pageTitle}`
}
```

- [x] **Step 4: Run the metadata test again**

Run from `frontend`:

```bash
npm run test -- src/features/admin/adminConsoleMeta.test.ts
```

Expected: PASS with 4 tests passing in `adminConsoleMeta.test.ts`.

- [x] **Step 5: Commit the metadata foundation**

```bash
git add frontend/src/features/admin/adminConsoleMeta.ts frontend/src/features/admin/adminConsoleMeta.test.ts
git commit -m "feat(admin): add admin route metadata foundation"
```

## Task 2: Create Dashboard Summary Helper

**Files:**
- Create: `frontend/src/features/admin/dashboardSummary.ts`
- Create: `frontend/src/features/admin/dashboardSummary.test.ts`

- [x] **Step 1: Write the failing dashboard helper test**

```ts
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
```

- [x] **Step 2: Run the dashboard test to confirm it fails**

Run from `frontend`:

```bash
npm run test -- src/features/admin/dashboardSummary.test.ts
```

Expected: FAIL with `Cannot find module './dashboardSummary'`.

- [x] **Step 3: Implement the dashboard helper**

```ts
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
```

- [x] **Step 4: Run the dashboard helper test again**

Run from `frontend`:

```bash
npm run test -- src/features/admin/dashboardSummary.test.ts
```

Expected: PASS with 2 tests passing in `dashboardSummary.test.ts`.

- [x] **Step 5: Commit the dashboard helper**

```bash
git add frontend/src/features/admin/dashboardSummary.ts frontend/src/features/admin/dashboardSummary.test.ts
git commit -m "feat(admin): add dashboard summary helper"
```

## Task 3: Create User Directory Helper

**Files:**
- Create: `frontend/src/features/admin/userDirectory.ts`
- Create: `frontend/src/features/admin/userDirectory.test.ts`

- [x] **Step 1: Write the failing user directory test**

```ts
import { describe, expect, it } from 'vitest'

import {
  buildUserRoleSummary,
  filterUsersByRole,
  getUserRoleLabel,
  isProtectedUser,
} from './userDirectory'

const users = [
  { id: 1, username: 'root', nickname: '馆主', role: 'SUPER_ADMIN', createdAt: '2026-05-01T00:00:00Z' },
  { id: 2, username: 'editor', nickname: '编修', role: 'ADMIN', createdAt: '2026-05-01T00:00:00Z' },
  { id: 3, username: 'viewer', nickname: '访客', role: 'USER', createdAt: '2026-05-01T00:00:00Z' },
]

describe('userDirectory helpers', () => {
  it('builds role counts in tab order', () => {
    expect(buildUserRoleSummary(users)).toEqual([
      { tab: 'all', label: '全部', count: 3 },
      { tab: 'SUPER_ADMIN', label: '超级管理员', count: 1 },
      { tab: 'ADMIN', label: '管理员', count: 1 },
      { tab: 'USER', label: '普通用户', count: 1 },
    ])
  })

  it('filters by active role tab', () => {
    expect(filterUsersByRole(users, 'ADMIN').map((user) => user.username)).toEqual(['editor'])
  })

  it('protects super admin rows', () => {
    expect(isProtectedUser(users[0])).toBe(true)
    expect(isProtectedUser(users[2])).toBe(false)
  })

  it('maps role enums to readable labels', () => {
    expect(getUserRoleLabel('ADMIN')).toBe('管理员')
  })
})
```

- [x] **Step 2: Run the user directory test to confirm it fails**

Run from `frontend`:

```bash
npm run test -- src/features/admin/userDirectory.test.ts
```

Expected: FAIL with `Cannot find module './userDirectory'`.

- [x] **Step 3: Implement the user directory helper**

```ts
import type { AdminUser } from '../../api/auth'

export type UserRoleTab = 'all' | 'SUPER_ADMIN' | 'ADMIN' | 'USER'

const ROLE_LABELS: Record<UserRoleTab, string> = {
  all: '全部',
  SUPER_ADMIN: '超级管理员',
  ADMIN: '管理员',
  USER: '普通用户',
}

export function buildUserRoleSummary(users: AdminUser[]) {
  return (['all', 'SUPER_ADMIN', 'ADMIN', 'USER'] as const).map((tab) => ({
    tab,
    label: ROLE_LABELS[tab],
    count: tab === 'all' ? users.length : users.filter((user) => user.role === tab).length,
  }))
}

export function filterUsersByRole(users: AdminUser[], activeTab: UserRoleTab) {
  if (activeTab === 'all') return users
  return users.filter((user) => user.role === activeTab)
}

export function getUserRoleLabel(role: AdminUser['role']) {
  return ROLE_LABELS[role]
}

export function isProtectedUser(user: Pick<AdminUser, 'role'>) {
  return user.role === 'SUPER_ADMIN'
}
```

- [x] **Step 4: Run the user directory test again**

Run from `frontend`:

```bash
npm run test -- src/features/admin/userDirectory.test.ts
```

Expected: PASS with 4 tests passing in `userDirectory.test.ts`.

- [x] **Step 5: Commit the user directory helper**

```bash
git add frontend/src/features/admin/userDirectory.ts frontend/src/features/admin/userDirectory.test.ts
git commit -m "feat(admin): add user directory helper"
```

## Task 4: Create Audit Timeline Helper

**Files:**
- Create: `frontend/src/features/admin/auditTimeline.ts`
- Create: `frontend/src/features/admin/auditTimeline.test.ts`

- [x] **Step 1: Write the failing audit helper test**

```ts
import { describe, expect, it } from 'vitest'

import { getAuditActionMeta, summarizeAuditLogs } from './auditTimeline'

const logs = [
  { id: 1, username: 'root', action: 'BACKUP', detail: 'nightly', createdAt: '2026-05-04T01:00:00Z' },
  { id: 2, username: 'editor', action: 'DELETE_USER', detail: 'viewer', createdAt: '2026-05-04T02:00:00Z' },
  { id: 3, username: 'root', action: 'LOGIN', detail: '', createdAt: '2026-05-03T02:00:00Z' },
]

describe('auditTimeline helpers', () => {
  it('maps known actions to readable labels and tones', () => {
    expect(getAuditActionMeta('DELETE_USER')).toEqual({
      label: '删除用户',
      tone: 'danger',
    })
  })

  it('builds summary counters for the current day', () => {
    const result = summarizeAuditLogs(logs, new Date('2026-05-04T10:00:00Z'))

    expect(result).toEqual({
      totalCount: 3,
      todayCount: 2,
      riskCount: 1,
      latestBackupAt: '2026-05-04T01:00:00Z',
    })
  })
})
```

- [x] **Step 2: Run the audit helper test to confirm it fails**

Run from `frontend`:

```bash
npm run test -- src/features/admin/auditTimeline.test.ts
```

Expected: FAIL with `Cannot find module './auditTimeline'`.

- [x] **Step 3: Implement the audit helper**

```ts
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

export function summarizeAuditLogs(logs: AuditLogEntry[], now = new Date()) {
  const todayKey = now.toISOString().slice(0, 10)
  const todayCount = logs.filter((log) => log.createdAt.slice(0, 10) === todayKey).length
  const riskCount = logs.filter((log) => getAuditActionMeta(log.action).tone === 'danger').length
  const latestBackup = logs.find((log) => log.action === 'BACKUP')

  return {
    totalCount: logs.length,
    todayCount,
    riskCount,
    latestBackupAt: latestBackup?.createdAt ?? null,
  }
}
```

- [x] **Step 4: Run the audit helper test again**

Run from `frontend`:

```bash
npm run test -- src/features/admin/auditTimeline.test.ts
```

Expected: PASS with 2 tests passing in `auditTimeline.test.ts`.

- [x] **Step 5: Commit the audit helper**

```bash
git add frontend/src/features/admin/auditTimeline.ts frontend/src/features/admin/auditTimeline.test.ts
git commit -m "feat(admin): add audit timeline helper"
```

## Task 5: Add Shared Admin Components and Stylesheet

**Files:**
- Create: `frontend/src/components/admin/AdminPageHeader.vue`
- Create: `frontend/src/components/admin/AdminSummaryCard.vue`
- Create: `frontend/src/components/admin/AdminStateBlock.vue`
- Create: `frontend/src/styles/admin-console.css`
- Modify: `frontend/src/main.ts`

- [ ] **Step 1: Create the shared admin page header**

```vue
<script setup lang="ts">
defineProps<{
  eyebrow: string
  title: string
  description: string
}>()
</script>

<template>
  <header class="admin-page-header">
    <div class="admin-page-header__copy">
      <p class="admin-page-header__eyebrow">{{ eyebrow }}</p>
      <h1 class="admin-page-header__title">{{ title }}</h1>
      <p class="admin-page-header__description">{{ description }}</p>
    </div>
    <div v-if="$slots.actions" class="admin-page-header__actions">
      <slot name="actions" />
    </div>
  </header>
</template>
```

- [ ] **Step 2: Create the shared summary card and state block**

```vue
<!-- frontend/src/components/admin/AdminSummaryCard.vue -->
<script setup lang="ts">
const props = withDefaults(defineProps<{
  label: string
  value: string | number
  detail: string
  tone?: 'ink' | 'amber' | 'olive' | 'danger'
  interactive?: boolean
}>(), {
  tone: 'ink',
  interactive: false,
})

const emit = defineEmits<{
  (event: 'select'): void
}>()

function handleClick() {
  if (props.interactive) emit('select')
}
</script>

<template>
  <button
    v-if="interactive"
    type="button"
    class="admin-summary-card"
    :class="[`admin-summary-card--${tone}`, 'admin-summary-card--interactive']"
    @click="handleClick"
  >
    <span class="admin-summary-card__label">{{ label }}</span>
    <strong class="admin-summary-card__value">{{ value }}</strong>
    <span class="admin-summary-card__detail">{{ detail }}</span>
  </button>

  <article
    v-else
    class="admin-summary-card"
    :class="`admin-summary-card--${tone}`"
  >
    <span class="admin-summary-card__label">{{ label }}</span>
    <strong class="admin-summary-card__value">{{ value }}</strong>
    <span class="admin-summary-card__detail">{{ detail }}</span>
  </article>
</template>
```

```vue
<!-- frontend/src/components/admin/AdminStateBlock.vue -->
<script setup lang="ts">
defineProps<{
  mode: 'loading' | 'empty' | 'notice' | 'error'
  title: string
  description: string
}>()
</script>

<template>
  <section class="admin-state-block" :class="`admin-state-block--${mode}`">
    <p class="admin-state-block__title">{{ title }}</p>
    <p class="admin-state-block__description">{{ description }}</p>
    <div v-if="$slots.action" class="admin-state-block__action">
      <slot name="action" />
    </div>
  </section>
</template>
```

- [ ] **Step 3: Add the shared admin stylesheet and import it**

```css
/* frontend/src/styles/admin-console.css */
:root {
  --admin-sidebar-width: 240px;
  --admin-container-max: 1280px;
  --admin-rail-bg: color-mix(in srgb, var(--bg-panel-strong) 88%, #f9f3ea 12%);
  --admin-card-bg: color-mix(in srgb, var(--bg-paper) 94%, white 6%);
  --admin-card-border: color-mix(in srgb, var(--line-soft) 74%, rgba(36, 26, 16, 0.08) 26%);
  --admin-card-shadow: 0 16px 40px rgba(46, 31, 19, 0.05);
  --admin-accent: #8f5d2e;
  --admin-accent-soft: rgba(143, 93, 46, 0.1);
  --admin-danger: #9c4631;
  --admin-danger-soft: rgba(156, 70, 49, 0.1);
  --admin-muted-surface: rgba(255, 251, 244, 0.84);
  --admin-paper-grid: linear-gradient(180deg, rgba(255,255,255,0.32), rgba(255,255,255,0));
}

.admin-page {
  width: min(100%, var(--admin-container-max));
  margin: 0 auto;
  display: grid;
  gap: 24px;
}

.admin-page-header {
  display: flex;
  justify-content: space-between;
  align-items: end;
  gap: 20px;
  padding-bottom: 18px;
  border-bottom: 1px solid var(--admin-card-border);
}

.admin-page-header__eyebrow {
  margin: 0 0 6px;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.12em;
  color: var(--text-soft);
}

.admin-page-header__title {
  margin: 0;
  font-family: 'Noto Serif SC', 'Songti SC', serif;
  font-size: clamp(28px, 3vw, 42px);
  font-weight: 600;
  color: var(--text-main);
}

.admin-page-header__description {
  margin: 10px 0 0;
  max-width: 720px;
  color: var(--text-sub);
  line-height: 1.7;
}

.admin-summary-card {
  display: grid;
  gap: 8px;
  padding: 20px 22px;
  border-radius: 18px;
  border: 1px solid var(--admin-card-border);
  background: linear-gradient(180deg, var(--admin-card-bg), rgba(255,255,255,0.72));
  box-shadow: var(--admin-card-shadow);
  text-align: left;
}

.admin-summary-card--interactive {
  transition: transform 0.18s ease, box-shadow 0.18s ease, border-color 0.18s ease;
}

.admin-summary-card--interactive:hover {
  transform: translateY(-2px);
  border-color: rgba(143, 93, 46, 0.35);
}

.admin-summary-card__label {
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.1em;
  color: var(--text-soft);
}

.admin-summary-card__value {
  font-family: 'Noto Serif SC', 'Songti SC', serif;
  font-size: clamp(24px, 2.2vw, 34px);
  color: var(--text-main);
}

.admin-summary-card__detail {
  color: var(--text-sub);
  line-height: 1.6;
}

.admin-summary-card--amber {
  background:
    radial-gradient(circle at top right, rgba(181, 129, 78, 0.14), transparent 34%),
    linear-gradient(180deg, var(--admin-card-bg), rgba(255,255,255,0.72));
}

.admin-summary-card--olive {
  background:
    radial-gradient(circle at top right, rgba(93, 130, 103, 0.14), transparent 34%),
    linear-gradient(180deg, var(--admin-card-bg), rgba(255,255,255,0.72));
}

.admin-summary-card--danger {
  background:
    radial-gradient(circle at top right, rgba(156, 70, 49, 0.12), transparent 34%),
    linear-gradient(180deg, var(--admin-card-bg), rgba(255,255,255,0.72));
}

.admin-state-block {
  display: grid;
  gap: 10px;
  padding: 28px;
  border-radius: 18px;
  border: 1px solid var(--admin-card-border);
  background: linear-gradient(180deg, var(--admin-card-bg), rgba(255,255,255,0.76));
}

.admin-state-block--error {
  border-color: rgba(156, 70, 49, 0.22);
  background: linear-gradient(180deg, rgba(255,245,242,0.92), rgba(255,250,247,0.86));
}

.admin-state-block__title {
  margin: 0;
  font-family: 'Noto Serif SC', 'Songti SC', serif;
  font-size: 20px;
  color: var(--text-main);
}

.admin-state-block__description {
  margin: 0;
  color: var(--text-sub);
  line-height: 1.7;
}

@media (max-width: 900px) {
  .admin-page-header {
    align-items: start;
    flex-direction: column;
  }
}
```

```ts
// frontend/src/main.ts
import { createApp } from 'vue'

import App from './App.vue'
import router from './router'
import './style.css'
import './themes.css'
import './styles/admin-console.css'

createApp(App).use(router).mount('#app')
```

- [ ] **Step 4: Run a build to verify the shared admin layer compiles**

Run from `frontend`:

```bash
npm run build
```

Expected: PASS with Vite build output and no TypeScript errors.

- [ ] **Step 5: Commit the shared admin primitives**

```bash
git add frontend/src/components/admin/AdminPageHeader.vue frontend/src/components/admin/AdminSummaryCard.vue frontend/src/components/admin/AdminStateBlock.vue frontend/src/styles/admin-console.css frontend/src/main.ts
git commit -m "feat(admin): add shared admin UI primitives"
```

## Task 6: Rebuild AdminLayout and Clean Theme Picker Copy

**Files:**
- Modify: `frontend/src/composables/useTheme.ts`
- Modify: `frontend/src/components/ThemeSwitcher.vue`
- Modify: `frontend/src/views/AdminLayout.vue`
- Test: `frontend/src/features/admin/adminConsoleMeta.test.ts`

- [ ] **Step 1: Replace garbled theme copy in `useTheme.ts`**

```ts
export const THEME_OPTIONS: ThemeOption[] = [
  {
    id: 'parchment',
    name: '古卷',
    nameEn: 'Parchment',
    description: '暖纸色与古卷气息，适合作为默认主题',
    preview: ['#efe3cf', '#a96e35', '#6a4b2f', '#67724f'],
  },
  {
    id: 'su-style',
    name: '苏派',
    nameEn: 'Su Style',
    description: '垂珠墨韵，偏园林式留白与温润层次',
    preview: ['#f2ebdc', '#fff9ef', '#3a3226', '#a96e35'],
  },
  {
    id: 'ou-style',
    name: '欧派',
    nameEn: 'Ou Style',
    description: '朱砂与黑墨对比更强，适合规整排版',
    preview: ['#e8d5b5', '#fcf8f0', '#1a1a1a', '#b22222'],
  },
  {
    id: 'ink-wash',
    name: '水墨',
    nameEn: 'Ink Wash',
    description: '深色水墨背景，适合夜间浏览',
    preview: ['#1a1d23', '#7eb8da', '#c4a882', '#5c8a6e'],
  },
  {
    id: 'celadon',
    name: '青瓷',
    nameEn: 'Celadon',
    description: '柔和青瓷色调，通透但不过冷',
    preview: ['#f0f5f2', '#5a9e7c', '#3d7a6b', '#8b6e4e'],
  },
  {
    id: 'rosewood',
    name: '紫檀',
    nameEn: 'Rosewood',
    description: '深沉木色背景，适合更庄重的阅读氛围',
    preview: ['#2a1f1a', '#c89b6e', '#8b5e3c', '#6b8f7a'],
  },
  {
    id: 'frosted-glass',
    name: '琉璃',
    nameEn: 'Frosted Glass',
    description: '更现代的通透玻璃感界面',
    preview: ['#e8edf5', '#6c7baa', '#8b6db0', '#4a9a8a'],
  },
  {
    id: 'star-sea',
    name: '星海',
    nameEn: 'Star Sea',
    description: '高对比深蓝主题，偏现代控制台气质',
    preview: ['#0b1120', '#38bdf8', '#818cf8', '#34d399'],
  },
  {
    id: 'aurora',
    name: '极光',
    nameEn: 'Aqua',
    description: '亮色渐变更明显，适合轻盈界面',
    preview: ['#ff7eb3', '#8b5cf6', '#3b82f6', '#14b8a6'],
  },
  {
    id: 'eggshell',
    name: '蛋壳',
    nameEn: 'Eggshell',
    description: '极简纸感配色，黑白对比更强',
    preview: ['#fdfcfc', '#000000', '#777169', '#e5e5e5'],
  },
]
```

- [ ] **Step 2: Replace garbled strings in `ThemeSwitcher.vue`**

```vue
<button class="theme-switcher__trigger" type="button" @click="toggle" aria-label="切换主题">
  <span class="theme-switcher__icon">◌</span>
  <span class="theme-switcher__label">主题</span>
</button>

<Transition name="float-panel">
  <div v-if="open" class="theme-switcher__dropdown">
    <p class="theme-switcher__title">界面主题</p>
    <div class="theme-switcher__grid">
      <button
        v-for="theme in themes"
        :key="theme.id"
        class="theme-option"
        :class="{ 'theme-option--active': currentTheme === theme.id }"
        type="button"
        @click="selectTheme(theme.id)"
      >
        <div class="theme-option__preview">
          <span
            v-for="(color, index) in theme.preview"
            :key="index"
            class="theme-option__swatch"
            :style="{ background: color }"
          />
        </div>
        <div class="theme-option__info">
          <strong>{{ theme.name }}</strong>
          <em>{{ theme.nameEn }}</em>
        </div>
        <span class="theme-option__desc">{{ theme.description }}</span>
        <span v-if="currentTheme === theme.id" class="theme-option__check">✓</span>
      </button>
    </div>
  </div>
</Transition>
```

- [ ] **Step 3: Refactor `AdminLayout.vue` to use metadata-driven shell structure**

```vue
<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useTheme } from '../composables/useTheme'
import { logout, getUsername, isAdmin } from '../api/auth'
import ThemeSwitcher from '../components/ThemeSwitcher.vue'
import {
  buildAdminBreadcrumb,
  getAdminNavItems,
  getAdminPageMeta,
} from '../features/admin/adminConsoleMeta'

const router = useRouter()
const route = useRoute()
const theme = useTheme()

const sidebarOpen = ref(false)
const currentUsername = computed(() => getUsername() ?? '')
const pageMeta = computed(() => getAdminPageMeta(route.name))
const breadcrumb = computed(() => buildAdminBreadcrumb(pageMeta.value))
const navItems = computed(() => getAdminNavItems().filter((item) => !item.adminOnly || isAdmin()))

watch(
  () => route.fullPath,
  () => {
    sidebarOpen.value = false
  },
)

function navigateTo(routeName: string) {
  router.push({ name: routeName })
}

function toggleSidebar() {
  sidebarOpen.value = !sidebarOpen.value
}

function closeSidebar() {
  sidebarOpen.value = false
}

function handleLogout() {
  logout()
  router.push({ name: 'login' })
}

function goToSettings() {
  router.push({ name: 'settings' })
}
</script>
```

```html
<template>
  <div class="admin-shell">
    <div v-if="sidebarOpen" class="admin-shell__scrim" @click="closeSidebar"></div>

    <aside class="admin-sidebar" :class="{ 'admin-sidebar--open': sidebarOpen }">
      <div class="admin-sidebar__brand">
        <div class="admin-sidebar__seal">谱</div>
        <div class="admin-sidebar__brand-copy">
          <strong>族谱管理</strong>
          <span>Genealogy Archive Console</span>
        </div>
      </div>

      <nav class="admin-sidebar__nav">
        <button
          v-for="item in navItems"
          :key="item.key"
          type="button"
          class="admin-sidebar__item"
          :class="{ 'admin-sidebar__item--active': route.name === item.routeName }"
          @click="navigateTo(item.routeName)"
        >
          <span class="admin-sidebar__item-rail"></span>
          <span class="admin-sidebar__item-label">{{ item.label }}</span>
        </button>
      </nav>

      <div class="admin-sidebar__tools">
        <button type="button" class="admin-sidebar__item" @click="goToSettings">
          <span class="admin-sidebar__item-rail"></span>
          <span class="admin-sidebar__item-label">系统设置</span>
        </button>
      </div>
    </aside>

    <div class="admin-shell__main">
      <header class="admin-topbar">
        <button type="button" class="admin-topbar__menu" @click="toggleSidebar">目录</button>
        <div class="admin-topbar__copy">
          <p class="admin-topbar__eyebrow">{{ pageMeta.sectionTitle }}</p>
          <h1 class="admin-topbar__title">{{ breadcrumb }}</h1>
          <p class="admin-topbar__description">{{ pageMeta.pageDescription }}</p>
        </div>
        <div class="admin-topbar__actions">
          <ThemeSwitcher :current-theme="theme.currentTheme.value" @change-theme="theme.setTheme" />
          <div class="admin-topbar__user">
            <span>{{ currentUsername || '当前用户' }}</span>
          </div>
          <button type="button" class="admin-topbar__logout" @click="handleLogout">退出</button>
        </div>
      </header>

      <main class="admin-shell__content">
        <router-view />
      </main>
    </div>
  </div>
</template>
```

```css
<style scoped>
.admin-shell {
  display: flex;
  min-height: 100vh;
  background: var(--shell-bg-image);
}

.admin-sidebar {
  width: var(--admin-sidebar-width);
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  padding: 20px 16px;
  background:
    linear-gradient(180deg, rgba(255,255,255,0.24), rgba(255,255,255,0)),
    var(--admin-rail-bg);
  border-right: 1px solid var(--admin-card-border);
}

.admin-sidebar__brand {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 0 8px 18px;
  border-bottom: 1px solid var(--admin-card-border);
}

.admin-sidebar__seal {
  display: grid;
  place-items: center;
  width: 40px;
  height: 40px;
  border-radius: 12px;
  background: linear-gradient(135deg, #7a4c27, #b47a44);
  color: #fff8ef;
  font-family: 'Noto Serif SC', 'Songti SC', serif;
}

.admin-sidebar__nav,
.admin-sidebar__tools {
  display: grid;
  gap: 8px;
}

.admin-sidebar__nav {
  flex: 1;
  padding: 18px 0;
}

.admin-sidebar__tools {
  padding-top: 18px;
  border-top: 1px solid var(--admin-card-border);
}

.admin-sidebar__item {
  position: relative;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 16px;
  border-radius: 14px;
  background: transparent;
  color: var(--text-sub);
}

.admin-sidebar__item-rail {
  width: 3px;
  height: 22px;
  border-radius: 999px;
  background: transparent;
}

.admin-sidebar__item--active {
  background: var(--admin-accent-soft);
  color: var(--text-main);
}

.admin-sidebar__item--active .admin-sidebar__item-rail {
  background: var(--admin-accent);
}

.admin-shell__main {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
}

.admin-topbar {
  position: sticky;
  top: 0;
  z-index: 20;
  display: flex;
  justify-content: space-between;
  align-items: start;
  gap: 20px;
  padding: 22px 28px 18px;
  background: rgba(255, 251, 244, 0.82);
  backdrop-filter: blur(12px);
  border-bottom: 1px solid var(--admin-card-border);
}

.admin-topbar__menu {
  display: none;
}

.admin-topbar__eyebrow {
  margin: 0 0 4px;
  color: var(--text-soft);
  font-size: 12px;
  letter-spacing: 0.12em;
}

.admin-topbar__title {
  margin: 0;
  font-family: 'Noto Serif SC', 'Songti SC', serif;
  font-size: 28px;
}

.admin-topbar__description {
  margin: 8px 0 0;
  color: var(--text-sub);
}

.admin-shell__content {
  padding: 28px;
}

.admin-shell__scrim {
  position: fixed;
  inset: 0;
  z-index: 30;
  background: rgba(22, 14, 10, 0.22);
}

.admin-topbar :deep(.theme-switcher__trigger) {
  background: transparent;
  border: 1px solid var(--admin-card-border);
  border-radius: 999px;
}

@media (max-width: 1024px) {
  .admin-sidebar {
    position: fixed;
    top: 0;
    left: 0;
    bottom: 0;
    z-index: 40;
    transform: translateX(-100%);
    transition: transform 0.2s ease;
  }

  .admin-sidebar--open {
    transform: translateX(0);
  }

  .admin-topbar__menu {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    padding: 10px 14px;
    border-radius: 999px;
    background: var(--admin-muted-surface);
  }

  .admin-topbar {
    flex-direction: column;
  }
}
</style>
```

- [ ] **Step 4: Run metadata test and a full build**

Run from `frontend`:

```bash
npm run test -- src/features/admin/adminConsoleMeta.test.ts
npm run build
```

Expected: PASS for the metadata test and PASS for the build.

- [ ] **Step 5: Commit the new admin shell**

```bash
git add frontend/src/composables/useTheme.ts frontend/src/components/ThemeSwitcher.vue frontend/src/views/AdminLayout.vue
git commit -m "feat(admin): rebuild admin shell layout"
```

## Task 7: Redesign DashboardView as a Narrative Workbench

**Files:**
- Modify: `frontend/src/views/DashboardView.vue`
- Modify: `frontend/src/features/admin/dashboardSummary.ts`
- Test: `frontend/src/features/admin/dashboardSummary.test.ts`

- [ ] **Step 1: Wire the dashboard helper into the view**

```ts
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { listPublications, type PublicationSummary } from '../api/publication'
import { adminListUsers, isAdmin, isSuperAdmin, adminBackupDatabase } from '../api/auth'
import AdminPageHeader from '../components/admin/AdminPageHeader.vue'
import AdminSummaryCard from '../components/admin/AdminSummaryCard.vue'
import AdminStateBlock from '../components/admin/AdminStateBlock.vue'
import { buildDashboardOverview } from '../features/admin/dashboardSummary'

const overview = computed(() => buildDashboardOverview({
  publicationCount: pubCount.value,
  userCount: userCount.value,
  isAdmin: isAdmin(),
  isSuperAdmin: isSuperAdmin(),
  backupLoading: backupLoading.value,
}))
```

- [ ] **Step 2: Replace the dashboard template with the new header, hero, and summary grid**

```html
<template>
  <div class="admin-page dashboard-page">
    <AdminPageHeader
      eyebrow="后台总览"
      title="工作台"
      description="从最近编研卷册继续工作，并快速查看馆藏、用户与维护动作。"
    >
      <template #actions>
        <button class="dashboard-page__primary-btn" @click="router.push({ name: 'publications' })">
          进入族谱管理
        </button>
      </template>
    </AdminPageHeader>

    <section class="dashboard-hero">
      <div class="dashboard-hero__main">
        <p class="dashboard-hero__eyebrow">{{ overview.heroEyebrow }}</p>
        <h2 class="dashboard-hero__title">{{ overview.heroTitle }}</h2>
        <p class="dashboard-hero__detail">{{ overview.heroDetail }}</p>
      </div>
      <div class="dashboard-hero__aside">
        <p class="dashboard-hero__aside-label">最近更新</p>
        <strong class="dashboard-hero__aside-value">{{ recentPubs[0]?.title || '暂无卷册' }}</strong>
        <span class="dashboard-hero__aside-detail">
          {{ recentPubs[0] ? formatDate(recentPubs[0].updatedAt) : '创建第一份族谱后会出现在这里' }}
        </span>
      </div>
    </section>

    <section class="dashboard-summary-grid">
      <AdminSummaryCard
        v-for="card in overview.cards"
        :key="card.id"
        :label="card.label"
        :value="card.value"
        :detail="card.detail"
        :tone="card.tone"
        :interactive="true"
        @select="
          card.id === 'users'
            ? router.push({ name: 'admin-users' })
            : card.id === 'backup'
              ? handleBackup()
              : router.push({ name: 'publications' })
        "
      />
    </section>

    <section class="dashboard-ledger">
      <div class="dashboard-ledger__header">
        <h2>最近编研卷册</h2>
        <button class="dashboard-ledger__link" @click="router.push({ name: 'publications' })">查看全部</button>
      </div>

      <AdminStateBlock
        v-if="loading"
        mode="loading"
        title="正在整理最近卷册"
        description="保留现有数据请求，仅使用新的馆藏摘要样式呈现。"
      />

      <AdminStateBlock
        v-else-if="recentPubs.length === 0"
        mode="empty"
        title="馆藏仍为空"
        description="先创建第一份族谱卷册，再从这里继续最近的编研工作。"
      >
        <template #action>
          <button class="dashboard-page__secondary-btn" @click="router.push({ name: 'publications' })">
            去创建族谱
          </button>
        </template>
      </AdminStateBlock>

      <div v-else class="dashboard-ledger__list">
        <button
          v-for="pub in recentPubs"
          :key="pub.id"
          type="button"
          class="dashboard-ledger__item"
          @click="openPublication(pub.id)"
        >
          <div>
            <strong>{{ pub.title || '未命名族谱' }}</strong>
            <p>{{ pub.subtitle || '尚未填写副题' }}</p>
          </div>
          <span>{{ formatDate(pub.updatedAt) }}</span>
        </button>
      </div>
    </section>
  </div>
</template>
```

- [ ] **Step 3: Replace the dashboard CSS with layout-specific styles**

```css
<style scoped>
.dashboard-page {
  gap: 28px;
}

.dashboard-page__primary-btn,
.dashboard-page__secondary-btn {
  height: 42px;
  padding: 0 18px;
  border-radius: 999px;
}

.dashboard-page__primary-btn {
  background: linear-gradient(135deg, #6d4724, #a4713c);
  color: #fff9f0;
}

.dashboard-page__secondary-btn {
  background: var(--admin-muted-surface);
  color: var(--text-main);
  border: 1px solid var(--admin-card-border);
}

.dashboard-hero {
  display: grid;
  grid-template-columns: minmax(0, 1.8fr) minmax(280px, 0.9fr);
  gap: 20px;
  padding: 28px;
  border-radius: 24px;
  border: 1px solid var(--admin-card-border);
  background:
    radial-gradient(circle at top left, rgba(181, 129, 78, 0.12), transparent 36%),
    linear-gradient(180deg, rgba(255,255,255,0.34), rgba(255,255,255,0)),
    var(--admin-card-bg);
  box-shadow: var(--admin-card-shadow);
}

.dashboard-hero__eyebrow {
  margin: 0 0 8px;
  color: var(--text-soft);
  letter-spacing: 0.12em;
}

.dashboard-hero__title {
  margin: 0;
  font-family: 'Noto Serif SC', 'Songti SC', serif;
  font-size: clamp(30px, 4vw, 46px);
}

.dashboard-hero__detail,
.dashboard-hero__aside-detail {
  color: var(--text-sub);
  line-height: 1.7;
}

.dashboard-summary-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 18px;
}

.dashboard-ledger {
  display: grid;
  gap: 16px;
}

.dashboard-ledger__header,
.dashboard-ledger__item {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.dashboard-ledger__list {
  display: grid;
  gap: 10px;
}

.dashboard-ledger__item {
  padding: 18px 22px;
  border-radius: 18px;
  border: 1px solid var(--admin-card-border);
  background: rgba(255,255,255,0.78);
  text-align: left;
}

.dashboard-ledger__item p {
  margin: 6px 0 0;
  color: var(--text-sub);
}

@media (max-width: 900px) {
  .dashboard-hero {
    grid-template-columns: 1fr;
  }
}
</style>
```

- [ ] **Step 4: Run the dashboard helper test and a build**

Run from `frontend`:

```bash
npm run test -- src/features/admin/dashboardSummary.test.ts
npm run build
```

Expected: PASS for the helper test and PASS for the build.

- [ ] **Step 5: Commit the dashboard redesign**

```bash
git add frontend/src/views/DashboardView.vue frontend/src/features/admin/dashboardSummary.ts frontend/src/features/admin/dashboardSummary.test.ts
git commit -m "feat(admin): redesign dashboard overview"
```

## Task 8: Align PublicationListView with the New Admin Language

**Files:**
- Modify: `frontend/src/views/PublicationListView.vue`
- Modify: `frontend/src/components/admin/AdminPageHeader.vue`

- [ ] **Step 1: Replace the mixed English header with the shared admin page header**

```ts
import AdminPageHeader from '../components/admin/AdminPageHeader.vue'
import AdminStateBlock from '../components/admin/AdminStateBlock.vue'
```

```html
<div class="admin-page archive-page">
  <AdminPageHeader
    eyebrow="谱牒馆藏"
    title="族谱管理"
    description="归档、检索并继续编研现有卷册；模板与私人馆藏在同一馆藏语境下呈现。"
  >
    <template #actions>
      <button class="pill-btn pill-btn--black" @click="showCreateDialog = true">
        新建卷册
      </button>
    </template>
  </AdminPageHeader>
```

- [ ] **Step 2: Normalize section titles, empty states, and dialog copy to Chinese**

```html
<section class="collection-section">
  <div class="section-eyebrow">
    <span class="dot-label dot-label--ember">精选谱式</span>
    <h2 class="section-title">示例卷册模板</h2>
  </div>
</section>

<section class="exhibit-section">
  <div class="section-eyebrow">
    <span class="dot-label">个人馆藏</span>
    <h2 class="section-title">我的编研卷册</h2>
  </div>

  <AdminStateBlock
    v-if="publications.length === 0"
    mode="empty"
    title="馆藏暂空"
    description="从空白卷册或示例模板开始，第一份族谱会出现在这里。"
  />
</section>

<header class="modal-sheet__header">
  <h2 class="modal-sheet__title">新建卷册</h2>
  <button class="modal-close" @click="showCreateDialog = false">&times;</button>
</header>

<label>标题</label>
<input v-model="newTitle" type="text" placeholder="例如：陇西李氏世系谱" @keyup.enter="handleCreate" />

<label>副题</label>
<input v-model="newSubtitle" type="text" placeholder="例如：二〇二六年修订版" @keyup.enter="handleCreate" />

<button class="pill-btn pill-btn--white" @click="showCreateDialog = false">取消</button>
<button class="pill-btn pill-btn--black" @click="handleCreate">创建卷册</button>
```

- [ ] **Step 3: Tidy the card and dialog visuals so they inherit the shared admin shell**

```css
.archive-page {
  gap: 28px;
  padding: 0;
}

.archive-header {
  display: none;
}

.collection-item,
.exhibit-card,
.modal-sheet {
  border: 1px solid var(--admin-card-border);
  background:
    linear-gradient(180deg, rgba(255,255,255,0.28), rgba(255,255,255,0)),
    var(--admin-card-bg);
  box-shadow: var(--admin-card-shadow);
}

.collection-item:hover,
.exhibit-card:hover {
  border-color: rgba(143, 93, 46, 0.28);
}

.collection-item__title,
.exhibit-card__title,
.section-title {
  font-family: 'Noto Serif SC', 'Songti SC', serif;
}

.modal-sheet__title,
.input-field label,
.exhibit-confirm p {
  letter-spacing: 0.04em;
  text-transform: none;
}

.tag {
  padding: 4px 10px;
  border-radius: 999px;
  background: var(--admin-accent-soft);
  color: var(--text-sub);
}
```

- [ ] **Step 4: Run a build to catch template or style regressions**

Run from `frontend`:

```bash
npm run build
```

Expected: PASS with the publication page still compiling under the new shared header and state block imports.

- [ ] **Step 5: Commit the publication page alignment**

```bash
git add frontend/src/views/PublicationListView.vue frontend/src/components/admin/AdminPageHeader.vue
git commit -m "feat(admin): align publication list with archive shell"
```

## Task 9: Redesign AdminUsersView as a Directory Ledger

**Files:**
- Modify: `frontend/src/views/AdminUsersView.vue`
- Modify: `frontend/src/features/admin/userDirectory.ts`
- Test: `frontend/src/features/admin/userDirectory.test.ts`

- [ ] **Step 1: Replace local role filtering logic with the shared helper**

```ts
import { computed, onMounted, ref } from 'vue'
import {
  adminListUsers,
  adminCreateUser,
  adminDeleteUser,
  adminResetPassword,
  adminChangeRole,
  isSuperAdmin,
  type AdminUser,
} from '../api/auth'
import AdminPageHeader from '../components/admin/AdminPageHeader.vue'
import AdminSummaryCard from '../components/admin/AdminSummaryCard.vue'
import AdminStateBlock from '../components/admin/AdminStateBlock.vue'
import {
  buildUserRoleSummary,
  filterUsersByRole,
  getUserRoleLabel,
  isProtectedUser,
  type UserRoleTab,
} from '../features/admin/userDirectory'

const activeTab = ref<UserRoleTab>('all')

const roleSummary = computed(() => buildUserRoleSummary(users.value))
const filteredUsers = computed(() => filterUsersByRole(users.value, activeTab.value))
```

- [ ] **Step 2: Replace the page template with header, summary cards, filter chips, and a ledger-style table**

```html
<template>
  <div class="admin-page admin-users-page">
    <AdminPageHeader
      eyebrow="系统治理"
      title="用户管理"
      description="用名录册的方式管理后台账号、角色分层与访问秩序。"
    >
      <template #actions>
        <button class="btn-create" @click="showCreateForm = !showCreateForm">
          {{ showCreateForm ? '收起新增条目' : '新增用户' }}
        </button>
      </template>
    </AdminPageHeader>

    <section class="admin-users-page__summary">
      <AdminSummaryCard
        v-for="item in roleSummary"
        :key="item.tab"
        :label="item.label"
        :value="item.count"
        detail="当前角色分层数量"
        tone="ink"
        :interactive="true"
        @select="activeTab = item.tab"
      />
    </section>

    <section v-if="showCreateForm" class="create-sheet">
      <h2>新增条目</h2>
      <div class="create-sheet__grid">
        <input v-model="newUsername" type="text" placeholder="用户名" class="form-input" />
        <input v-model="newPassword" type="password" placeholder="初始密码" class="form-input" />
        <input v-model="newNickname" type="text" placeholder="显示名称（可选）" class="form-input" />
      </div>
      <div class="create-sheet__roles">
        <label class="role-filter-strip__chip">
          <input v-model="newRole" type="radio" value="USER" />
          普通用户
        </label>
        <label class="role-filter-strip__chip">
          <input v-model="newRole" type="radio" value="ADMIN" />
          管理员
        </label>
      </div>
      <div class="create-sheet__actions">
        <button class="btn-confirm" @click="handleCreate">确认创建</button>
        <button class="btn-cancel" @click="showCreateForm = false">取消</button>
      </div>
    </section>

    <section class="role-filter-strip">
      <button
        v-for="item in roleSummary"
        :key="item.tab"
        type="button"
        class="role-filter-strip__chip"
        :class="{ 'role-filter-strip__chip--active': activeTab === item.tab }"
        @click="activeTab = item.tab"
      >
        {{ item.label }} · {{ item.count }}
      </button>
    </section>

    <AdminStateBlock
      v-if="loading"
      mode="loading"
      title="正在整理用户名录"
      description="保留现有接口，只重组页面信息层级与表格表现。"
    />

    <section v-else class="directory-ledger">
      <header class="directory-ledger__header">
        <span>ID</span>
        <span>账号</span>
        <span>显示名称</span>
        <span>角色</span>
        <span>创建时间</span>
        <span>操作</span>
      </header>

      <article
        v-for="user in filteredUsers"
        :key="user.id"
        class="directory-ledger__row"
        :class="{ 'directory-ledger__row--protected': isProtectedUser(user) }"
      >
        <span>{{ user.id }}</span>
        <span>{{ user.username }}</span>
        <span>{{ user.nickname || '未设置' }}</span>
        <span>
          <select
            v-if="canManageRoles && !isProtectedUser(user)"
            :value="user.role"
            class="role-select-inline"
            @change="handleRoleChange(user.id, ($event.target as HTMLSelectElement).value)"
          >
            <option value="USER">普通用户</option>
            <option value="ADMIN">管理员</option>
          </select>
          <strong v-else>{{ getUserRoleLabel(user.role) }}</strong>
        </span>
        <span>{{ formatDate(user.createdAt) }}</span>
        <span class="directory-ledger__actions">
          <button class="action-btn action-btn--reset" @click="resetUserId = user.id; resetNewPassword = ''">重置密码</button>
          <button v-if="!isProtectedUser(user)" class="action-btn action-btn--delete" @click="deleteUserId = user.id">删除</button>
        </span>
      </article>
    </section>
  </div>
</template>
```

- [ ] **Step 3: Replace the users page CSS with the new ledger-style layout**

```css
<style scoped>
.admin-users-page {
  gap: 24px;
}

.admin-users-page__summary {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 16px;
}

.create-sheet,
.directory-ledger {
  border: 1px solid var(--admin-card-border);
  border-radius: 20px;
  background: var(--admin-card-bg);
  box-shadow: var(--admin-card-shadow);
}

.create-sheet {
  display: grid;
  gap: 16px;
  padding: 24px;
}

.create-sheet__grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
}

.create-sheet__roles {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.role-filter-strip {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.role-filter-strip__chip {
  padding: 10px 14px;
  border-radius: 999px;
  background: var(--admin-muted-surface);
  color: var(--text-sub);
  border: 1px solid var(--admin-card-border);
}

.role-filter-strip__chip--active {
  background: var(--admin-accent-soft);
  color: var(--text-main);
}

.role-select-inline {
  width: 100%;
  min-height: 38px;
  border-radius: 10px;
  border: 1px solid var(--admin-card-border);
  background: rgba(255,255,255,0.76);
  color: var(--text-main);
}

.directory-ledger__header,
.directory-ledger__row {
  display: grid;
  grid-template-columns: 72px 1.2fr 1fr 140px 140px 160px;
  gap: 12px;
  align-items: center;
  padding: 16px 20px;
}

.directory-ledger__header {
  border-bottom: 1px solid var(--admin-card-border);
  color: var(--text-soft);
  font-size: 12px;
  letter-spacing: 0.08em;
}

.directory-ledger__row {
  border-top: 1px solid rgba(117, 90, 57, 0.08);
}

.directory-ledger__row--protected {
  background: rgba(180, 110, 53, 0.05);
}

.directory-ledger__actions {
  display: flex;
  gap: 8px;
}

@media (max-width: 1024px) {
  .create-sheet__grid,
  .directory-ledger__header,
  .directory-ledger__row {
    grid-template-columns: 1fr;
  }
}
</style>
```

- [ ] **Step 4: Run the user helper test and a build**

Run from `frontend`:

```bash
npm run test -- src/features/admin/userDirectory.test.ts
npm run build
```

Expected: PASS for the user helper test and PASS for the build.

- [ ] **Step 5: Commit the users page redesign**

```bash
git add frontend/src/views/AdminUsersView.vue frontend/src/features/admin/userDirectory.ts frontend/src/features/admin/userDirectory.test.ts
git commit -m "feat(admin): redesign user directory page"
```

## Task 10: Redesign AuditLogView as an Operations Ledger

**Files:**
- Modify: `frontend/src/views/AuditLogView.vue`
- Modify: `frontend/src/features/admin/auditTimeline.ts`
- Test: `frontend/src/features/admin/auditTimeline.test.ts`

- [ ] **Step 1: Replace local label/class helpers with the shared audit helper**

```ts
import { computed, onMounted, ref } from 'vue'
import { listLogs, type AuditLogEntry } from '../api/audit'
import AdminPageHeader from '../components/admin/AdminPageHeader.vue'
import AdminSummaryCard from '../components/admin/AdminSummaryCard.vue'
import AdminStateBlock from '../components/admin/AdminStateBlock.vue'
import { getAuditActionMeta, summarizeAuditLogs } from '../features/admin/auditTimeline'

const summary = computed(() => summarizeAuditLogs(logs.value))

async function loadLogs() {
  loading.value = true
  errorMsg.value = ''
  try {
    logs.value = await listLogs()
  } catch {
    errorMsg.value = '日志查询接口暂不可用，请先在后端启用操作日志能力。'
    logs.value = []
  } finally {
    loading.value = false
  }
}
```

- [ ] **Step 2: Replace the audit log template with a summary strip and timeline-like ledger**

```html
<template>
  <div class="admin-page audit-page">
    <AdminPageHeader
      eyebrow="系统治理"
      title="操作日志"
      description="按时间阅读后台行为流水，并快速识别备份与高风险动作。"
    />

    <section class="audit-page__summary">
      <AdminSummaryCard label="全部记录" :value="summary.totalCount" detail="当前日志总数" tone="ink" />
      <AdminSummaryCard label="今日新增" :value="summary.todayCount" detail="按当天日期聚合" tone="amber" />
      <AdminSummaryCard label="高风险动作" :value="summary.riskCount" detail="删除与密码重置等操作" tone="danger" />
      <AdminSummaryCard
        label="最近备份"
        :value="summary.latestBackupAt ? formatDate(summary.latestBackupAt) : '暂无'"
        detail="最近一次数据库备份时间"
        tone="olive"
      />
    </section>

    <AdminStateBlock
      v-if="errorMsg"
      mode="error"
      title="暂时无法载入操作日志"
      :description="errorMsg"
    />

    <AdminStateBlock
      v-else-if="loading"
      mode="loading"
      title="正在整理馆务流水"
      description="保留现有日志接口，仅重新组织视觉层级和阅读顺序。"
    />

    <AdminStateBlock
      v-else-if="logs.length === 0"
      mode="empty"
      title="暂无操作记录"
      description="当前系统尚未产生可展示的馆务流水。"
    />

    <section v-else class="audit-ledger">
      <article v-for="log in logs" :key="log.id" class="audit-ledger__row">
        <time class="audit-ledger__time">{{ formatDate(log.createdAt) }}</time>
        <div class="audit-ledger__body">
          <div class="audit-ledger__top">
            <span class="audit-ledger__user">{{ log.username }}</span>
            <span class="audit-ledger__tag" :class="`audit-ledger__tag--${getAuditActionMeta(log.action).tone}`">
              {{ getAuditActionMeta(log.action).label }}
            </span>
          </div>
          <p class="audit-ledger__detail">{{ log.detail || '未提供额外说明' }}</p>
        </div>
      </article>
    </section>
  </div>
</template>
```

- [ ] **Step 3: Replace the audit page CSS with a readable timeline layout**

```css
<style scoped>
.audit-page {
  gap: 24px;
}

.audit-page__summary {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 16px;
}

.audit-ledger {
  display: grid;
  gap: 12px;
}

.audit-ledger__row {
  display: grid;
  grid-template-columns: 220px minmax(0, 1fr);
  gap: 18px;
  padding: 20px 22px;
  border-radius: 18px;
  border: 1px solid var(--admin-card-border);
  background: rgba(255,255,255,0.8);
  box-shadow: var(--admin-card-shadow);
}

.audit-ledger__time {
  color: var(--text-soft);
  font-size: 13px;
}

.audit-ledger__top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
}

.audit-ledger__user {
  font-family: 'Noto Serif SC', 'Songti SC', serif;
  font-size: 20px;
  color: var(--text-main);
}

.audit-ledger__tag {
  padding: 6px 10px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 700;
}

.audit-ledger__tag--info {
  background: rgba(59, 130, 246, 0.1);
  color: #2f6eb8;
}

.audit-ledger__tag--success {
  background: rgba(94, 138, 106, 0.12);
  color: #43684e;
}

.audit-ledger__tag--danger {
  background: var(--admin-danger-soft);
  color: var(--admin-danger);
}

.audit-ledger__detail {
  margin: 10px 0 0;
  color: var(--text-sub);
  line-height: 1.7;
}

@media (max-width: 900px) {
  .audit-ledger__row {
    grid-template-columns: 1fr;
  }
}
</style>
```

- [ ] **Step 4: Run the audit helper test and a build**

Run from `frontend`:

```bash
npm run test -- src/features/admin/auditTimeline.test.ts
npm run build
```

Expected: PASS for the audit helper test and PASS for the build.

- [ ] **Step 5: Commit the audit page redesign**

```bash
git add frontend/src/views/AuditLogView.vue frontend/src/features/admin/auditTimeline.ts frontend/src/features/admin/auditTimeline.test.ts
git commit -m "feat(admin): redesign audit operations page"
```

## Task 11: Final Responsive Sweep and Verification

**Files:**
- Modify: `frontend/src/style.css`
- Modify: `frontend/src/views/AdminLayout.vue`
- Modify: `frontend/src/views/DashboardView.vue`
- Modify: `frontend/src/views/PublicationListView.vue`
- Modify: `frontend/src/views/AdminUsersView.vue`
- Modify: `frontend/src/views/AuditLogView.vue`
- Test: `frontend/src/features/admin/adminConsoleMeta.test.ts`
- Test: `frontend/src/features/admin/dashboardSummary.test.ts`
- Test: `frontend/src/features/admin/userDirectory.test.ts`
- Test: `frontend/src/features/admin/auditTimeline.test.ts`

- [ ] **Step 1: Remove the global body width lock and move it to the workbench shell**

```css
/* frontend/src/style.css */
body {
  margin: 0;
  min-width: 320px;
}

.app-shell {
  min-width: 1120px;
  padding: 12px;
}
```

- [ ] **Step 2: Add the final responsive guardrails where any page still overflows**

```css
/* Apply in the remaining admin view files where needed */
@media (max-width: 900px) {
  .dashboard-summary-grid,
  .audit-page__summary,
  .admin-users-page__summary,
  .collection-grid,
  .exhibit-grid {
    grid-template-columns: 1fr;
  }

  .dashboard-ledger__item,
  .exhibit-card,
  .audit-ledger__top {
    align-items: start;
    flex-direction: column;
  }
}
```

- [ ] **Step 3: Run the full targeted test suite and production build**

Run from `frontend`:

```bash
npm run test -- src/features/admin/adminConsoleMeta.test.ts src/features/admin/dashboardSummary.test.ts src/features/admin/userDirectory.test.ts src/features/admin/auditTimeline.test.ts
npm run build
```

Expected:

- PASS with all four admin helper test files green.
- PASS with `vite build` succeeding and no TypeScript errors.

- [ ] **Step 4: Do a manual verification pass in the browser**

Check the following:

```text
1. 桌面端：侧栏固定、顶栏标题正确、四页切换气质一致。
2. 平板宽度：侧栏收为抽屉，内容栅格按单列或双列重排。
3. Dashboard：最近卷册、备份入口、用户入口仍可跳转。
4. PublicationList：新建 / 编辑 / 删除 / 模板创建仍可工作。
5. AdminUsers：筛选、创建、改角色、重置密码、删除仍可工作。
6. AuditLog：加载态、错误态、空态、日志行标签均显示正确。
7. 文案：后台壳层、主题切换器、四页核心文案不再出现乱码。
```

- [ ] **Step 5: Commit the final admin console sweep**

```bash
git add frontend/src/style.css frontend/src/views/AdminLayout.vue frontend/src/views/DashboardView.vue frontend/src/views/PublicationListView.vue frontend/src/views/AdminUsersView.vue frontend/src/views/AuditLogView.vue
git commit -m "feat(admin): complete archive-style console redesign"
```
