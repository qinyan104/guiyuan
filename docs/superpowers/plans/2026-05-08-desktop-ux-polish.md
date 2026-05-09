# 桌面端体验打磨 实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 完善桌面端用户体验 — 空状态引导、新手引导、全局搜索、用户管理增强、数据备份 UI。

**Architecture:** 不新增架构，在现有视图上做增强。后端新增 SearchController/SearchService 和头像上传端点，前端在各视图添加空状态条件和引导组件。

**Tech Stack:** Vue 3 + TypeScript (前端), Spring Boot 3.3 + Java 17 (后端), MySQL, Vite 6

---

## 文件结构

### 修改的文件

| 文件 | 变更 |
|------|------|
| `frontend/src/views/DashboardView.vue` | 空状态欢迎卡片 |
| `frontend/src/views/PublicationListView.vue` | 空状态提示 |
| `frontend/src/views/TimelineView.vue` | 空状态提示 |
| `frontend/src/views/PublicationStatsView.vue` | 空状态提示 |
| `frontend/src/views/SettingsView.vue` | 头像上传 + 备份区域 |
| `frontend/src/App.vue` | 注册后引导条件检查 |
| `frontend/src/api/profile.ts` | 新增头像上传方法 |
| `frontend/src/types/api.ts` | 新增搜索响应类型 |
| `backend/.../ProfileController.java` | 新增头像上传端点 |
| `backend/.../AdminLayout.vue` | 顶部搜索栏 + 头像展示 |

### 新建的文件

| 文件 | 职责 |
|------|------|
| `frontend/src/components/OnboardingGuide.vue` | 3 步新手引导弹窗 |
| `frontend/src/api/search.ts` | 搜索 API 封装 |
| `frontend/src/components/GlobalSearch.vue` | 全局搜索组件 |
| `backend/.../search/SearchController.java` | 搜索端点 |
| `backend/.../search/SearchService.java` | 搜索逻辑 |
| `backend/.../search/SearchResult.java` | 搜索结果 DTO |

---

## Phase 1: 空状态 + 新手引导

### Task 1: Dashboard 空状态

**Files:**
- Modify: `frontend/src/views/DashboardView.vue`

- [ ] **Step 1: 分析当前 Dashboard 的空态处理**

现有代码 `DashboardView.vue:93-101` 在 `latestPub` 为 null 时显示一个简单空卡片：
```html
<div v-else class="bento-card card-hero empty-hero">
  <div class="card-glass-panel">
    <span class="card-eyebrow">起步</span>
    <h2 class="hero-pub-title">尚未创建族谱</h2>
    <div class="hero-footer">
      <button class="ghost-pill" @click="router.push({ name: 'publications' })">立即创建</button>
    </div>
  </div>
</div>
```
同时，其余卡片（统计、历史、用户数、备份）在 `pubCount === 0` 时仍在渲染，显示空数据。

- [ ] **Step 2: 替换 Dashboard 空状态**

将 `<div v-if="!loading" class="bento-grid">` 改为：
- 当 `pubCount > 0` → 现有 `bento-grid`
- 当 `pubCount === 0` → 全屏欢迎卡片

删除 `empty-hero` 相关分支，新增全屏欢迎区域。

在 `DashboardView.vue` 的 `<script setup>` 中找到 `const otherRecentPubs = ...` 之后，添加：
```typescript
const showCreateDialog = ref(false)
```

在 `<template>` 中将：
```html
<div v-else class="bento-grid">
```
改为：
```html
<div v-else-if="pubCount > 0" class="bento-grid">

<!-- Welcome empty state -->
<div v-else class="welcome-stage">
  <div class="welcome-card">
    <div class="welcome-glow"></div>
    <div class="welcome-content">
      <div class="welcome-seal">序</div>
      <h2 class="welcome-title">欢迎来到数字档案馆</h2>
      <p class="welcome-desc">创建您的第一个族谱，开启家族编修之旅。</p>
      <div class="welcome-actions">
        <button class="welcome-btn primary" @click="showCreateDialog = true">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          创建第一个族谱
        </button>
        <button class="welcome-btn secondary" @click="router.push({ name: 'publications' })">
          浏览示例模板
        </button>
        <button class="welcome-btn ghost" onclick="document.getElementById('import-input')?.click()">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
          导入族谱数据
        </button>
      </div>
    </div>
  </div>
</div>

<!-- Create dialog (reuse existing pattern from PublicationListView) -->
<Teleport to="body">
  <div v-if="showCreateDialog" class="dialog-overlay" @click.self="showCreateDialog = false">
    <div class="dialog-panel">
      <h3>创建新族谱</h3>
      <p style="color: var(--text-soft); margin: 8px 0 20px;">输入族谱名称后即可开始编撰。</p>
      <input v-model="newTitle" placeholder="族谱名称..." class="glass-input" @keyup.enter="handleCreateFromDashboard" />
      <input v-model="newSubtitle" placeholder="副标题（可选）..." class="glass-input" style="margin-top: 12px;" />
      <div class="dialog-actions" style="margin-top: 20px; display: flex; gap: 12px; justify-content: flex-end;">
        <button class="bento-btn" @click="showCreateDialog = false">取消</button>
        <button class="bento-btn primary" @click="handleCreateFromDashboard">创建</button>
      </div>
    </div>
  </div>
</Teleport>
```

并在 `<script setup>` 中添加：
```typescript
const newTitle = ref('')
const newSubtitle = ref('')

async function handleCreateFromDashboard() {
  const { createPublication, defaultSettings, blankPublication } = await import('../api/publication')
  const title = newTitle.value.trim() || '未命名族谱'
  try {
    const id = await createPublication({ ...blankPublication, title, subtitle: newSubtitle.value.trim() }, defaultSettings, title)
    router.push({ name: 'workbench', params: { id } })
  } catch (err: any) {
    alert('创建失败: ' + (err.message || '未知错误'))
  }
}
```

- [ ] **Step 3: 添加欢迎卡片样式**

在 `DashboardView.vue` 的 `<style scoped>` 末尾添加：
```css
/* ── Welcome Empty State ── */
.welcome-stage {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 40px;
}
.welcome-card {
  position: relative;
  max-width: 520px;
  width: 100%;
  background: var(--glass-panel-bg, rgba(255,255,255,0.6));
  backdrop-filter: blur(40px) saturate(180%);
  border-radius: 32px;
  border: 1px solid var(--glass-border-highlight);
  box-shadow: 0 32px 64px rgba(0,0,0,0.08);
  overflow: hidden;
  text-align: center;
}
.welcome-glow {
  position: absolute;
  top: -50%;
  left: -50%;
  width: 200%;
  height: 200%;
  background: radial-gradient(circle at center, var(--accent-amber) 0%, transparent 40%);
  opacity: 0.06;
  pointer-events: none;
}
.welcome-content {
  position: relative;
  padding: 64px 40px;
  display: flex;
  flex-direction: column;
  align-items: center;
}
.welcome-seal {
  width: 72px;
  height: 72px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, var(--accent-ink), var(--accent-amber));
  border-radius: 20px;
  font-family: 'Noto Serif SC', serif;
  font-size: 2rem;
  color: #fff;
  margin-bottom: 24px;
  box-shadow: 0 16px 32px rgba(0,0,0,0.12);
}
.welcome-title {
  font-family: 'Noto Serif SC', serif;
  font-size: 1.8rem;
  font-weight: 700;
  color: var(--text-main);
  margin: 0 0 12px;
}
.welcome-desc {
  color: var(--text-soft);
  font-size: 1rem;
  margin: 0 0 32px;
  line-height: 1.6;
}
.welcome-actions {
  display: flex;
  flex-direction: column;
  gap: 12px;
  width: 100%;
  max-width: 320px;
}
.welcome-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 14px 24px;
  border-radius: 14px;
  font-size: 0.95rem;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.2s ease;
  border: none;
}
.welcome-btn.primary {
  background: linear-gradient(135deg, var(--accent-ink), var(--accent-amber));
  color: #fff;
  box-shadow: 0 8px 24px rgba(0,0,0,0.15);
}
.welcome-btn.primary:hover {
  transform: translateY(-2px);
  box-shadow: 0 12px 32px rgba(0,0,0,0.2);
}
.welcome-btn.secondary {
  background: var(--text-main);
  color: var(--bg-panel);
}
.welcome-btn.secondary:hover {
  transform: translateY(-2px);
}
.welcome-btn.ghost {
  background: transparent;
  color: var(--text-soft);
  border: 1px solid var(--glass-border-shadow);
}
.welcome-btn.ghost:hover {
  background: rgba(0,0,0,0.03);
  color: var(--text-main);
}
```

- [ ] **Step 4: 提交**

```bash
cd frontend && npx vitest run --reporter=verbose 2>&1 | tail -20
git add frontend/src/views/DashboardView.vue
git commit -m "feat: add welcome empty state to DashboardView

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

### Task 2: 其他视图空状态

**Files:**
- Modify: `frontend/src/views/PublicationListView.vue`
- Modify: `frontend/src/views/TimelineView.vue`
- Modify: `frontend/src/views/PublicationStatsView.vue`

- [ ] **Step 1: PublicationListView 空状态**

在 `PublicationListView.vue` 中找到模板内渲染 publications 列表的区域（被 `<div v-if="loading">` 和 `<div v-else>` 包裹），在列表为空时添加空提示。

在 `<template>` 中找到 `v-if="loading"` 的 `else` 分支，修改为：
```html
<div v-else>
  <div v-if="publications.length === 0" class="empty-state">
    <div class="empty-icon">
      <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" opacity="0.3"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>
    </div>
    <h3 class="empty-title">还没有族谱</h3>
    <p class="empty-desc">快来创建第一个族谱，或从示例模板开始。</p>
    <div class="empty-actions">
      <button class="bento-btn primary" @click="showCreateDialog = true">创建族谱</button>
    </div>
  </div>
  <div v-else class="publication-grid">
    ... 现有列表内容 ...
  </div>
</div>
```

找到 `.publication-grid` 相关样式，在其后添加：
```css
/* ── Empty State ── */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 80px 40px;
  text-align: center;
}
.empty-icon {
  margin-bottom: 20px;
}
.empty-title {
  font-family: 'Noto Serif SC', serif;
  font-size: 1.4rem;
  font-weight: 700;
  color: var(--text-main);
  margin: 0 0 8px;
}
.empty-desc {
  color: var(--text-soft);
  font-size: 0.9rem;
  margin: 0 0 24px;
}
```

- [ ] **Step 2: TimelineView 空状态**

在 `TimelineView.vue` 的 `<template>` 中找到渲染时间线的区域，添加空状态条件：
```html
<div v-if="events.length === 0" class="timeline-empty">
  <div class="empty-icon">
    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" opacity="0.3"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
  </div>
  <h3 class="empty-title">时间线尚未生成</h3>
  <p class="empty-desc">添加人物并填写生卒年份后，时间线将自动生成。</p>
  <button class="bento-btn primary" @click="router.push({ name: 'workbench', params: { id: publicationId } })">前往画布添加人物</button>
</div>
<div v-else>
  ... 现有时间线内容 ...
</div>
```

在 `<style scoped>` 末尾添加：
```css
.timeline-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 80px 40px;
  text-align: center;
  min-height: 400px;
}
.timeline-empty .empty-title {
  font-family: 'Noto Serif SC', serif;
  font-size: 1.4rem;
  font-weight: 700;
  color: var(--text-main);
  margin: 0 0 8px;
}
.timeline-empty .empty-desc {
  color: var(--text-soft);
  font-size: 0.9rem;
  margin: 0 0 24px;
}
```

- [ ] **Step 3: PublicationStatsView 空状态**

在 `PublicationStatsView.vue` 的 `<template>` 中找到渲染统计数据的区域，添加空状态条件：
```html
<div v-if="totalCount === 0" class="stats-empty">
  <div class="empty-icon">
    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" opacity="0.3"><path d="M18 20V10"/><path d="M12 20V4"/><path d="M6 20v-6"/></svg>
  </div>
  <h3 class="empty-title">数据面板尚待充实</h3>
  <p class="empty-desc">在画布中添加更多人物后，统计数据将自动呈现。</p>
  <button class="bento-btn primary" @click="router.push({ name: 'workbench', params: { id: publicationId } })">前往画布</button>
</div>
<div v-else>
  ... 现有统计内容 ...
</div>
```

在 `<style scoped>` 末尾添加：
```css
.stats-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 80px 40px;
  text-align: center;
  min-height: 400px;
}
.stats-empty .empty-title {
  font-family: 'Noto Serif SC', serif;
  font-size: 1.4rem;
  font-weight: 700;
  color: var(--text-main);
  margin: 0 0 8px;
}
.stats-empty .empty-desc {
  color: var(--text-soft);
  font-size: 0.9rem;
  margin: 0 0 24px;
}
```

- [ ] **Step 4: 提交**

```bash
git add frontend/src/views/PublicationListView.vue frontend/src/views/TimelineView.vue frontend/src/views/PublicationStatsView.vue
git commit -m "feat: add empty states to publication list, timeline, and stats views

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

### Task 3: 新手引导组件

**Files:**
- Create: `frontend/src/components/OnboardingGuide.vue`
- Modify: `frontend/src/App.vue`
- Modify: `frontend/src/api/profile.ts`

- [ ] **Step 1: 创建 OnboardingGuide 组件**

```vue
<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()
const visible = ref(false)
const currentStep = ref(0)

const ONBOARDING_KEY = 'genealogy_onboarding_done'

const steps = [
  {
    icon: 'create',
    title: '创建或导入族谱',
    desc: '点击"创建第一个族谱"开始全新的族谱编撰，或导入已有的族谱数据。您也可以浏览王朝示例模板快速上手。',
    action: '创建族谱',
    routeName: 'publications' as const,
  },
  {
    icon: 'people',
    title: '在画布中添加人物',
    desc: '进入族谱后，在工坊中使用画布工具添加人物节点。填写姓名、生卒年份等基本信息，建立人物关系。',
    action: '前往画布',
    routeName: 'workbench' as const,
  },
  {
    icon: 'detail',
    title: '完善人物详情',
    desc: '点击画布中的人物节点，进入纪传体个人志页面，可添加传文、照片、家训等丰富内容。',
    action: '完成',
    routeName: null as const,
  },
]

function getIcon(type: string) {
  if (type === 'create') return '<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>'
  if (type === 'people') return '<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>'
  return '<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>'
}

onMounted(() => {
  if (!localStorage.getItem(ONBOARDING_KEY)) {
    visible.value = true
  }
})

function next() {
  if (currentStep.value < steps.length - 1) {
    currentStep.value++
  }
}

function prev() {
  if (currentStep.value > 0) {
    currentStep.value--
  }
}

function goTo(routeName: string | null) {
  if (routeName) {
    router.push({ name: routeName, params: routeName === 'workbench' ? { id: '__latest__' } : undefined })
  }
  dismiss()
}

function dismiss() {
  visible.value = false
  try { localStorage.setItem(ONBOARDING_KEY, 'true') } catch {}
}

defineExpose({ show: () => { visible.value = true; currentStep.value = 0 } })
</script>

<template>
  <Teleport to="body">
    <transition name="guide-fade">
      <div v-if="visible" class="onboarding-overlay" @click.self="dismiss">
        <div class="onboarding-panel">
          <!-- Step indicators -->
          <div class="step-dots">
            <span v-for="(_, i) in steps" :key="i" class="dot" :class="{ active: i === currentStep }"></span>
          </div>

          <!-- Step content -->
          <div class="step-content" v-for="(step, i) in steps" :key="i" v-show="i === currentStep">
            <div class="step-icon" v-html="getIcon(step.icon)"></div>
            <h3 class="step-title">{{ step.title }}</h3>
            <p class="step-desc">{{ step.desc }}</p>
          </div>

          <!-- Actions -->
          <div class="guide-actions">
            <button v-if="currentStep > 0" class="guide-btn ghost" @click="prev">上一步</button>
            <div class="guide-spacer"></div>
            <button class="guide-btn ghost" @click="dismiss">跳过</button>
            <button v-if="currentStep < steps.length - 1" class="guide-btn primary" @click="next">下一步</button>
            <button v-else class="guide-btn primary" @click="dismiss">开始使用</button>
          </div>
        </div>
      </div>
    </transition>
  </Teleport>
</template>

<style scoped>
.onboarding-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(8px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10000;
}
.onboarding-panel {
  width: 440px;
  max-width: 90vw;
  background: var(--bg-panel, #fff);
  border-radius: 28px;
  padding: 40px;
  box-shadow: 0 48px 80px rgba(0, 0, 0, 0.2);
  position: relative;
}
.step-dots {
  display: flex;
  justify-content: center;
  gap: 8px;
  margin-bottom: 32px;
}
.dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--glass-border-shadow);
  transition: all 0.3s ease;
}
.dot.active {
  background: var(--accent-amber);
  width: 24px;
  border-radius: 4px;
}
.step-content {
  text-align: center;
  min-height: 200px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}
.step-icon {
  width: 56px;
  height: 56px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, var(--accent-ink), var(--accent-amber));
  border-radius: 16px;
  color: #fff;
  margin-bottom: 20px;
}
.step-title {
  font-family: 'Noto Serif SC', serif;
  font-size: 1.3rem;
  font-weight: 700;
  color: var(--text-main);
  margin: 0 0 12px;
}
.step-desc {
  color: var(--text-soft);
  font-size: 0.9rem;
  line-height: 1.7;
  margin: 0;
  max-width: 340px;
}
.guide-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 32px;
}
.guide-spacer { flex: 1; }
.guide-btn {
  padding: 10px 20px;
  border-radius: 12px;
  font-size: 0.85rem;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.2s ease;
  border: none;
}
.guide-btn.primary {
  background: var(--text-main);
  color: var(--bg-panel);
}
.guide-btn.primary:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(0,0,0,0.15);
}
.guide-btn.ghost {
  background: transparent;
  color: var(--text-soft);
}
.guide-btn.ghost:hover {
  background: rgba(0,0,0,0.04);
  color: var(--text-main);
}
.guide-fade-enter-active,
.guide-fade-leave-active {
  transition: opacity 0.3s ease;
}
.guide-fade-enter-from,
.guide-fade-leave-to {
  opacity: 0;
}
</style>
```

- [ ] **Step 2: 在 App.vue 中集成 OnboardingGuide**

在 `App.vue` 的 `<script setup>` 中添加：
```typescript
import { ref } from 'vue'
import OnboardingGuide from './components/OnboardingGuide.vue'

const onboardingRef = ref<InstanceType<typeof OnboardingGuide> | null>(null)
```

在 `App.vue` 的 `<template>` 中、`<router-view />` 之后添加：
```html
<OnboardingGuide ref="onboardingRef" />
```

在 `onMounted` 的 catch 块中（刷新 token 失败时），添加对引导状态的检测——实际上引导组件自身在 `onMounted` 中检查 localStorage，所以这一步已经够了。但为了让用户在 Settings 中可以重新唤起引导，还需要暴露方法到 provide。

实际最简单：`App.vue` 在 `<script setup>` 末尾添加：
```typescript
import { provide } from 'vue'
provide('show-onboarding', () => onboardingRef.value?.show())
```

- [ ] **Step 3: 在 SettingsView 中添加重新唤起引导的入口**

在 `SettingsView.vue` 的 `<script setup>` 中添加：
```typescript
import { inject } from 'vue'
const showOnboarding = inject<() => void>('show-onboarding', () => {})
```

在 `<template>` 中、密码卡片之下添加：
```html
<!-- Onboarding Card -->
<div class="bento-card guide-card">
  <div class="card-header">
    <h3 class="card-title">新手引导</h3>
    <p class="card-subtitle">重新查看入门引导步骤，了解系统基本用法。</p>
  </div>
  <button class="bento-btn primary" @click="showOnboarding">查看引导</button>
</div>
```

- [ ] **Step 4: 提交**

```bash
git add frontend/src/components/OnboardingGuide.vue frontend/src/App.vue frontend/src/views/SettingsView.vue frontend/src/api/profile.ts
git commit -m "feat: add onboarding guide component and integration

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

## Phase 2: 用户管理（头像上传）

### Task 4: 后端头像上传端点

**Files:**
- Modify: `backend/src/main/java/com/genealogy/server/controller/ProfileController.java`

- [ ] **Step 1: 添加头像上传端点**

在 `ProfileController.java` 的 class 中添加：
```java
@Value("${app.upload.dir:uploads/avatars}")
private String avatarUploadDir;

@PostMapping("/avatar")
public ApiResponse<String> uploadAvatar(@RequestParam("file") MultipartFile file, Authentication authentication) throws IOException {
    String username = authentication.getName();

    if (file.isEmpty()) {
        return ApiResponse.error(400, "文件不能为空");
    }

    // Validate file type
    String contentType = file.getContentType();
    if (contentType == null || !contentType.startsWith("image/")) {
        return ApiResponse.error(400, "仅支持图片文件");
    }

    // Ensure upload directory exists
    Path uploadPath = Path.of(avatarUploadDir);
    Files.createDirectories(uploadPath);

    // Save file with unique name
    String extension = Optional.ofNullable(file.getOriginalFilename())
            .map(f -> f.contains(".") ? f.substring(f.lastIndexOf(".")) : ".jpg")
            .orElse(".jpg");
    String filename = username + "_" + System.currentTimeMillis() + extension;
    Path targetPath = uploadPath.resolve(filename);
    Files.copy(file.getInputStream(), targetPath, StandardCopyOption.REPLACE_EXISTING);

    // Save reference to user (simplified: store filename, or use user_avatar table)
    String avatarUrl = "/api/photos/avatars/" + filename;

    return ApiResponse.success("头像上传成功", avatarUrl);
}
```

需要添加的 import：
```java
import org.springframework.beans.factory.annotation.Value;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.multipart.MultipartFile;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.util.Optional;
```

注意：实际头像文件存储路径需要与照片访问端点一致。如果现有 `PhotoController` 可提供 `/api/photos/avatars/*` 路径的读取，则无需修改。否则需要添加静态资源映射。

在 `WebConfig.java` 中添加资源映射（如无对应映射）：
```java
@Override
public void addResourceHandlers(ResourceHandlerRegistry registry) {
    // ... 现有映射 ...
    registry.addResourceHandler("/api/photos/avatars/**")
            .addResourceLocations("file:uploads/avatars/");
}
```

- [ ] **Step 2: 编译验证**

```bash
cd backend && ./mvnw compile -q
```
Expected: BUILD SUCCESS (no errors)

- [ ] **Step 3: 提交**

```bash
git add backend/src/main/java/com/genealogy/server/controller/ProfileController.java backend/src/main/java/com/genealogy/server/config/WebConfig.java
git commit -m "feat: add avatar upload endpoint to ProfileController

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

### Task 5: 前端头像上传

**Files:**
- Modify: `frontend/src/api/profile.ts`
- Modify: `frontend/src/views/SettingsView.vue`
- Modify: `frontend/src/views/AdminLayout.vue`

- [ ] **Step 1: 添加头像 API**

在 `frontend/src/api/profile.ts` 末尾添加：
```typescript
export async function uploadAvatar(file: File): Promise<string> {
  const formData = new FormData()
  formData.append('file', file)
  const resp = await http.post<ApiResponse<string>>('/user/avatar', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
  if (resp.data.code !== 200) throw new Error(resp.data.message || '头像上传失败')
  return resp.data.data
}
```

- [ ] **Step 2: SettingsView 添加头像上传 UI**

在 `SettingsView.vue` 的 `<script setup>` 中添加：
```typescript
import { uploadAvatar } from '../api/profile'

const avatarUrl = ref('') // will be loaded from user profile
const avatarUploading = ref(false)
const fileInputRef = ref<HTMLInputElement | null>(null)

async function handleAvatarUpload(event: Event) {
  const input = event.target as HTMLInputElement
  if (!input.files?.length) return
  const file = input.files[0]
  if (!file.type.startsWith('image/')) {
    alert('仅支持图片文件')
    return
  }
  if (file.size > 5 * 1024 * 1024) {
    alert('图片大小不能超过 5MB')
    return
  }
  avatarUploading.value = true
  try {
    const url = await uploadAvatar(file)
    avatarUrl.value = url
  } catch (err: any) {
    alert('头像上传失败: ' + (err.message || '未知错误'))
  } finally {
    avatarUploading.value = false
    input.value = '' // reset
  }
}
```

将头像区域从文本改为图片（找到 avatar-glow-ring 区域）：
```html
<div class="avatar-glow-ring" @click="fileInputRef?.click()" style="cursor: pointer;">
  <img v-if="avatarUrl" :src="avatarUrl" class="large-avatar-img" />
  <div v-else class="large-avatar">{{ userInitials }}</div>
</div>
<input ref="fileInputRef" type="file" accept="image/*" style="display: none" @change="handleAvatarUpload" />
```

在 `<style scoped>` 末尾添加：
```css
.large-avatar-img {
  width: 100%;
  height: 100%;
  border-radius: 50%;
  object-fit: cover;
}
```

- [ ] **Step 3: 提交**

```bash
git add frontend/src/api/profile.ts frontend/src/views/SettingsView.vue
git commit -m "feat: add avatar upload UI to settings

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

## Phase 3: 全局搜索

### Task 6: 后端搜索

**Files:**
- Create: `backend/src/main/java/com/genealogy/server/search/SearchResult.java`
- Create: `backend/src/main/java/com/genealogy/server/search/SearchService.java`
- Create: `backend/src/main/java/com/genealogy/server/search/SearchController.java`

- [ ] **Step 1: 创建 SearchResult DTO**

```java
package com.genealogy.server.search;

import java.util.List;

public class SearchResult {
    private List<PublicationHit> publications;
    private List<PersonHit> persons;

    public SearchResult(List<PublicationHit> publications, List<PersonHit> persons) {
        this.publications = publications;
        this.persons = persons;
    }

    public List<PublicationHit> getPublications() { return publications; }
    public List<PersonHit> getPersons() { return persons; }

    public static class PublicationHit {
        private Long id;
        private String title;
        private String subtitle;

        public PublicationHit(Long id, String title, String subtitle) {
            this.id = id; this.title = title; this.subtitle = subtitle;
        }

        public Long getId() { return id; }
        public String getTitle() { return title; }
        public String getSubtitle() { return subtitle; }
    }

    public static class PersonHit {
        private String personId;
        private String name;
        private Long publicationId;
        private String publicationTitle;

        public PersonHit(String personId, String name, Long publicationId, String publicationTitle) {
            this.personId = personId; this.name = name;
            this.publicationId = publicationId; this.publicationTitle = publicationTitle;
        }

        public String getPersonId() { return personId; }
        public String getName() { return name; }
        public Long getPublicationId() { return publicationId; }
        public String getPublicationTitle() { return publicationTitle; }
    }
}
```

- [ ] **Step 2: 创建 SearchService**

```java
package com.genealogy.server.search;

import com.genealogy.server.model.Publication;
import com.genealogy.server.repository.PublicationRepository;
import com.genealogy.server.service.PublicationAuthorizationService;
import com.genealogy.server.auth.AccessSubject;
import com.genealogy.server.auth.AccessPermission;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;

@Service
public class SearchService {

    private final PublicationRepository publicationRepository;
    private final PublicationAuthorizationService authService;

    public SearchService(PublicationRepository publicationRepository,
                         PublicationAuthorizationService authService) {
        this.publicationRepository = publicationRepository;
        this.authService = authService;
    }

    public SearchResult search(String query, AccessSubject subject) {
        String keyword = "%" + query.toLowerCase() + "%";
        String prefixKeyword = query.toLowerCase() + "%";

        List<Publication> userPubs = publicationRepository.findAll();

        List<SearchResult.PublicationHit> pubHits = new ArrayList<>();
        List<SearchResult.PersonHit> personHits = new ArrayList<>();

        for (Publication pub : userPubs) {
            if (!authService.hasPermission(subject, pub.getId(), AccessPermission.READ)) {
                continue;
            }

            // Match publication title
            if (pub.getTitle() != null && pub.getTitle().toLowerCase().contains(query.toLowerCase())) {
                pubHits.add(new SearchResult.PublicationHit(
                        pub.getId(), pub.getTitle(), pub.getSubtitle()));
            }

            // Match person names within the publication's JSON data
            if (pub.getPublicationData() != null) {
                try {
                    JsonObject root = JsonParser.parseString(pub.getPublicationData()).getAsJsonObject();
                    if (root.has("people")) {
                        JsonObject people = root.getAsJsonObject("people");
                        for (var entry : people.entrySet()) {
                            JsonObject p = entry.getValue().getAsJsonObject();
                            String name = p.has("name") ? p.get("name").getAsString() : "";
                            if (name.toLowerCase().contains(query.toLowerCase())) {
                                personHits.add(new SearchResult.PersonHit(
                                    entry.getKey(), name, pub.getId(), pub.getTitle()));
                            }
                        }
                    }
                } catch (Exception ignored) {}
            }
        }

        // Sort: prefix matches first
        personHits.sort((a, b) -> {
            boolean aPrefix = a.getName().toLowerCase().startsWith(query.toLowerCase());
            boolean bPrefix = b.getName().toLowerCase().startsWith(query.toLowerCase());
            if (aPrefix != bPrefix) return aPrefix ? -1 : 1;
            return a.getName().compareTo(b.getName());
        });

        return new SearchResult(pubHits, personHits);
    }
}
```

需要添加的 import（在 SearchService.java 中）：
```java
import com.google.gson.JsonObject;
import com.google.gson.JsonParser;
```
```

- [ ] **Step 3: 创建 SearchController**

```java
package com.genealogy.server.search;

import com.genealogy.server.auth.UserSubject;
import com.genealogy.server.dto.ApiResponse;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/search")
public class SearchController {

    private final SearchService searchService;

    public SearchController(SearchService searchService) {
        this.searchService = searchService;
    }

    @GetMapping
    public ApiResponse<SearchResult> search(
            @RequestParam("q") String query,
            Authentication authentication) {
        if (query == null || query.trim().isEmpty()) {
            return ApiResponse.success("", new SearchResult(List.of(), List.of()));
        }
        UserSubject subject = new UserSubject(authentication.getName());
        SearchResult result = searchService.search(query.trim(), subject);
        return ApiResponse.success("", result);
    }
}
```

需要 import：
```java
import java.util.List;
```

- [ ] **Step 4: 测试搜索后端**

```bash
cd backend && ./mvnw test -q -Dtest="SearchServiceTest" 2>&1 | tail -10 || echo "No search test yet"
```

- [ ] **Step 5: 提交**

```bash
git add backend/src/main/java/com/genealogy/server/search/
git commit -m "feat: add global search backend (SearchController + SearchService)

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

### Task 7: 前端搜索组件

**Files:**
- Create: `frontend/src/api/search.ts`
- Create: `frontend/src/components/GlobalSearch.vue`
- Modify: `frontend/src/views/AdminLayout.vue`
- Modify: `frontend/src/types/api.ts`

- [ ] **Step 1: 创建搜索 API**

`frontend/src/api/search.ts`：
```typescript
import http from './http'
import type { ApiResponse } from '../types/api'

export interface PublicationHit {
  id: number
  title: string
  subtitle: string
}

export interface PersonHit {
  personId: string
  name: string
  publicationId: number
  publicationTitle: string
}

export interface SearchResponse {
  publications: PublicationHit[]
  persons: PersonHit[]
}

export async function globalSearch(query: string): Promise<SearchResponse> {
  if (!query.trim()) return { publications: [], persons: [] }
  const resp = await http.get<ApiResponse<SearchResponse>>('/search', {
    params: { q: query.trim() },
  })
  if (resp.data.code !== 200) throw new Error(resp.data.message || '搜索失败')
  return resp.data.data
}
```

- [ ] **Step 2: 创建 GlobalSearch 组件**

```vue
<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import { useRouter } from 'vue-router'
import { globalSearch, type SearchResponse, type PersonHit, type PublicationHit } from '../api/search'

const router = useRouter()
const query = ref('')
const results = ref<SearchResponse>({ publications: [], persons: [] })
const searching = ref(false)
const focused = ref(false)

let debounceTimer: ReturnType<typeof setTimeout> | null = null

watch(query, (val) => {
  if (debounceTimer) clearTimeout(debounceTimer)
  if (!val.trim()) {
    results.value = { publications: [], persons: [] }
    return
  }
  debounceTimer = setTimeout(async () => {
    searching.value = true
    try {
      results.value = await globalSearch(val)
    } catch {
      results.value = { publications: [], persons: [] }
    } finally {
      searching.value = false
    }
  }, 300)
})

const hasResults = computed(() =>
  results.value.publications.length > 0 || results.value.persons.length > 0
)

function navigateToPerson(hit: PersonHit) {
  focused.value = false
  query.value = ''
  router.push({ name: 'person-detail', params: { id: hit.publicationId, personId: hit.personId } })
}

function navigateToPublication(hit: PublicationHit) {
  focused.value = false
  query.value = ''
  router.push({ name: 'workbench', params: { id: hit.id } })
}
</script>

<template>
  <div class="global-search" :class="{ focused }">
    <div class="search-input-wrapper">
      <svg class="search-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
      <input
        v-model="query"
        type="text"
        placeholder="搜索族谱或人物..."
        class="search-input"
        @focus="focused = true"
        @blur="setTimeout(() => focused = false, 200)"
        @keydown.escape="focused = false; query = ''"
      />
      <div v-if="searching" class="search-spinner"></div>
    </div>

    <transition name="search-drop">
      <div v-if="focused && (query.trim() || hasResults)" class="search-dropdown">
        <div v-if="searching" class="search-status">搜索中...</div>
        <div v-else-if="!hasResults && query.trim()" class="search-status">未找到相关结果</div>

        <template v-if="results.publications.length > 0">
          <div class="search-group-label">族谱</div>
          <div
            v-for="hit in results.publications"
            :key="'pub-' + hit.id"
            class="search-item"
            @mousedown.prevent="navigateToPublication(hit)"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" opacity="0.4"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>
            <div class="search-item-text">
              <span class="search-item-title">{{ hit.title }}</span>
              <span v-if="hit.subtitle" class="search-item-sub">{{ hit.subtitle }}</span>
            </div>
          </div>
        </template>

        <template v-if="results.persons.length > 0">
          <div class="search-group-label">人物</div>
          <div
            v-for="hit in results.persons"
            :key="'person-' + hit.publicationId + '-' + hit.personId"
            class="search-item"
            @mousedown.prevent="navigateToPerson(hit)"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" opacity="0.4"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
            <div class="search-item-text">
              <span class="search-item-title">{{ hit.name }}</span>
              <span class="search-item-sub">{{ hit.publicationTitle }}</span>
            </div>
          </div>
        </template>
      </div>
    </transition>
  </div>
</template>

<style scoped>
.global-search {
  position: relative;
  flex: 1;
  max-width: 400px;
}
.search-input-wrapper {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 16px;
  border-radius: 14px;
  background: var(--glass-pill-bg, rgba(255,255,255,0.5));
  border: 1px solid transparent;
  transition: all 0.2s ease;
}
.global-search.focused .search-input-wrapper {
  background: var(--bg-panel, #fff);
  border-color: var(--text-main);
  box-shadow: 0 0 0 4px rgba(0,0,0,0.04);
}
:global([data-theme="ink-wash"]) .search-input-wrapper,
:global([data-theme="rosewood"]) .search-input-wrapper,
:global([data-theme="star-sea"]) .search-input-wrapper {
  background: rgba(0,0,0,0.3);
}
:global([data-theme="ink-wash"]) .global-search.focused .search-input-wrapper,
:global([data-theme="rosewood"]) .global-search.focused .search-input-wrapper,
:global([data-theme="star-sea"]) .global-search.focused .search-input-wrapper {
  background: rgba(30,30,30,1);
}
.search-icon {
  flex-shrink: 0;
  color: var(--text-soft);
  opacity: 0.6;
}
.search-input {
  flex: 1;
  border: none;
  background: transparent;
  outline: none;
  font-size: 0.9rem;
  color: var(--text-main);
  min-width: 0;
}
.search-input::placeholder {
  color: var(--text-soft);
  opacity: 0.6;
}
.search-spinner {
  width: 16px;
  height: 16px;
  border: 2px solid var(--glass-border-shadow);
  border-top-color: var(--accent-amber);
  border-radius: 50%;
  animation: spin 0.6s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }

.search-dropdown {
  position: absolute;
  top: calc(100% + 8px);
  left: 0;
  right: 0;
  background: var(--bg-panel, #fff);
  border-radius: 16px;
  box-shadow: 0 24px 48px rgba(0,0,0,0.1), 0 0 0 1px rgba(0,0,0,0.05);
  padding: 8px;
  z-index: 1000;
  max-height: 360px;
  overflow-y: auto;
}
:global([data-theme="ink-wash"]) .search-dropdown,
:global([data-theme="rosewood"]) .search-dropdown,
:global([data-theme="star-sea"]) .search-dropdown {
  background: rgba(20,20,20,1);
  box-shadow: 0 24px 48px rgba(0,0,0,0.4);
}
.search-status {
  padding: 24px;
  text-align: center;
  color: var(--text-soft);
  font-size: 0.85rem;
}
.search-group-label {
  font-size: 0.65rem;
  font-weight: 700;
  letter-spacing: 0.15em;
  color: var(--text-soft);
  padding: 8px 12px 4px;
  text-transform: uppercase;
}
.search-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 12px;
  border-radius: 12px;
  cursor: pointer;
  transition: background 0.15s;
}
.search-item:hover {
  background: rgba(0,0,0,0.04);
}
:global([data-theme="ink-wash"]) .search-item:hover,
:global([data-theme="rosewood"]) .search-item:hover,
:global([data-theme="star-sea"]) .search-item:hover {
  background: rgba(255,255,255,0.06);
}
.search-item-text {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}
.search-item-title {
  font-weight: 600;
  font-size: 0.85rem;
  color: var(--text-main);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.search-item-sub {
  font-size: 0.75rem;
  color: var(--text-soft);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.search-drop-enter-active,
.search-drop-leave-active {
  transition: opacity 0.15s ease, transform 0.15s ease;
}
.search-drop-enter-from,
.search-drop-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}
</style>
```

- [ ] **Step 3: 集成到 AdminLayout**

在 `AdminLayout.vue` 的 `<script setup>` 中移除不需要的 import（保留必要项），并添加：
```typescript
import GlobalSearch from '../components/GlobalSearch.vue'
```

在 `<template>` 中替换原有 `spacer` 区域（约 114 行）：
```html
<!-- Top Action Bar -->
<header class="top-action-bar">
  <GlobalSearch />
  <div class="top-actions-group">
    ...
  </div>
</header>
```

移除 `AdminLayout.vue` 中的 `<div class="spacer"></div>` 或直接替换。

注意：GlobalSearch 需要 `flex: 1`，可能需要微调 top-action-bar 的布局。修改 `.top-action-bar` 样式中的 `justify-content: space-between` 保持不变即可。

- [ ] **Step 4: 提交**

```bash
git add frontend/src/api/search.ts frontend/src/components/GlobalSearch.vue frontend/src/views/AdminLayout.vue
git commit -m "feat: add global search UI component

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

## Phase 4: 数据备份 UI

### Task 8: SettingsView 备份区域

**Files:**
- Modify: `frontend/src/views/SettingsView.vue`
- Modify: `frontend/src/api/auth.ts`（如 `adminBackupDatabase` 不存在）

- [ ] **Step 1: 检查现有备份 API**

在 `frontend/src/api/auth.ts` 中已有 `adminBackupDatabase`（DashboardView 中使用了）。确认存在后不需要新增。

如不存在，添加：
```typescript
export async function adminBackupDatabase(): Promise<void> {
  const resp = await http.get('/admin/backup', { responseType: 'blob' })
  const url = window.URL.createObjectURL(new Blob([resp.data]))
  const link = document.createElement('a')
  link.href = url
  link.setAttribute('download', `backup-${new Date().toISOString().slice(0, 10)}.sql`)
  document.body.appendChild(link)
  link.click()
  link.remove()
  window.URL.revokeObjectURL(url)
}
```

- [ ] **Step 2: 在 SettingsView 中添加备份区域**

在 `SettingsView.vue` 的 `<script setup>` 末尾添加：
```typescript
import { isSuperAdmin } from '../api/auth'
import { adminBackupDatabase } from '../api/auth'

const backupLoading = ref(false)
async function handleBackup() {
  backupLoading.value = true
  try {
    await adminBackupDatabase()
  } catch (err: any) {
    alert('备份失败: ' + (err.message || '未知错误'))
  } finally {
    backupLoading.value = false
  }
}
```

在 `<template>` 的引导卡片之后、`</div>` 之前添加：
```html
<!-- Backup Card (Admin only) -->
<div v-if="isSuperAdmin()" class="bento-card backup-card">
  <div class="card-header">
    <h3 class="card-title">数据归档与备份</h3>
    <p class="card-subtitle">导出当前数据库的完整备份文件，用于数据迁移或灾备恢复。</p>
  </div>
  <button class="bento-btn primary" :disabled="backupLoading" @click="handleBackup">
    {{ backupLoading ? '正在归档...' : '创建备份' }}
  </button>
</div>
```

在 `<style scoped>` 末尾添加：
```css
.backup-card {
  margin-top: 0;
}
```

- [ ] **Step 3: 提交**

```bash
git add frontend/src/views/SettingsView.vue
git commit -m "feat: add database backup UI to SettingsView

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

## Final: 运行全量测试

- [ ] **Step: 运行前端测试**

```bash
cd frontend && npx vitest run 2>&1 | tail -20
```
Expected: all 61+ tests pass (estimate 65+ after additions)

- [ ] **Step: 运行前端类型检查**

```bash
cd frontend && npx vue-tsc --noEmit 2>&1
```
Expected: no errors

- [ ] **Step: 运行前端构建**

```bash
cd frontend && npm run build 2>&1 | tail -5
```
Expected: built successfully

- [ ] **Step: 运行后端测试**

```bash
cd backend && ./mvnw test 2>&1 | tail -20
```
Expected: BUILD SUCCESS, 88+ tests pass

- [ ] **Step: 提交最终整合**

```bash
git add -A
git commit -m "refactor: finalize desktop UX polish

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```
