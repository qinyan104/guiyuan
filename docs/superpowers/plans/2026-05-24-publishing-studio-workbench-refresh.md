# Publishing Studio Workbench Refresh Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将出版工作室重构为更像专业排版软件的三栏工作台，在不改动核心排版与导出逻辑的前提下，提升布局层级、工具栏分组、状态反馈和内容编辑体验。

**Architecture:** 继续沿用现有 `PublishingStudio.vue` 作为页面编排入口，保留 `usePublishingStudio` 与现有 API 调用，只在视图层重组结构。组件层以 `StudioToolbar`、`PageThumbnailBar`、`PageCanvas`、`EntryEditor`、`StudioStatusBar` 为核心进行样式与轻交互重构，必要时新增少量本地 UI 状态字段，但不重写业务链路。

**Tech Stack:** Vue 3, TypeScript, scoped CSS, Vite, vue-tsc

---

## 文件结构总览

### 主要修改

- `frontend/src/views/PublishingStudio.vue`
  - 页面编排入口
  - 管理工具栏、三栏布局、状态提示和局部 loading 文案
- `frontend/src/components/publishing/StudioToolbar.vue`
  - 顶部工作台头部
  - 分组主操作、设置项、面板开关
- `frontend/src/components/publishing/PageThumbnailBar.vue`
  - 左侧页面导航器容器
  - 导航标题、页面统计、新增页入口
- `frontend/src/components/publishing/PageThumbnail.vue`
  - 单页缩略项
  - 当前页高亮、拖拽态、页元信息
- `frontend/src/components/publishing/PageCanvas.vue`
  - 中央画布舞台壳层
  - 页信息条和预览容器
- `frontend/src/components/publishing/EntryEditor.vue`
  - 右侧内容检查器
  - 条目卡片层级、空状态、底部主动作
- `frontend/src/components/publishing/StudioStatusBar.vue`
  - 底部状态栏
  - 同步状态、模板或纸张上下文

### 验证

- `frontend/package.json`
  - 确认可用的类型检查或构建命令

### 参考文档

- `docs/superpowers/specs/2026-05-24-publishing-studio-workbench-design.md`

---

### Task 1: 重构 `PublishingStudio.vue` 页面壳层与本地状态文案

**Files:**
- Modify: `frontend/src/views/PublishingStudio.vue`
- Reference: `docs/superpowers/specs/2026-05-24-publishing-studio-workbench-design.md`
- Test: `frontend/src/views/PublishingStudio.vue`

- [ ] **Step 1: 先整理页面级本地状态字段，补上工具栏和状态栏要用到的上下文**

在 `script setup` 中新增页面级状态文案与上下文计算字段，确保后续子组件不需要自己猜状态。

```ts
const exporting = ref(false)
const autoLayouting = ref(false)
const relayouting = ref(false)
const canvasNotice = ref("")

const currentTemplateName = computed(() => {
  const match = CANVAS_TEMPLATES.find((item) => item.id === canvasId.value)
  return match?.name ?? "默认模板"
})

const statusText = computed(() => {
  if (relayouting.value) return "正在刷新预览"
  if (autoLayouting.value) return "正在重新生成版面"
  if (hasPendingSync.value) return "内容已变更"
  return "已同步"
})
```

- [ ] **Step 2: 修正当前页面中的乱码中文文案**

将加载态、空态、导出提示、排版提示等文案替换为正常中文，避免继续带着乱码推进 UI。

```ts
feedback.statusMessage.value = "正在生成古籍 PDF..."
feedback.statusMessage.value = "PDF 导出成功"
feedback.errorMessage.value = resp.data.message || "导出失败"

if (!pubData.value) {
  feedback.errorMessage.value = "请先加载族谱数据"
  return
}

feedback.statusMessage.value = `排版完成，共 ${pages.length} 页`
feedback.errorMessage.value = "自动排版失败: " + (e.message || e)
feedback.statusMessage.value = "已保存，正在刷新预览"
```

- [ ] **Step 3: 把原来的平铺布局改成三栏工作台骨架**

模板层重组为：

```vue
<div v-else class="publishing-studio">
  <StudioToolbar
    :draftTitle="draft.title"
    :draftStatus="draft.status"
    :hasPendingSync="hasPendingSync"
    :canvasId="canvasId"
    :paper="paper"
    :tweaksOpen="tweaksOpen"
    :editorOpen="editorOpen"
    :currentPage="currentPage"
    :totalPages="totalPages"
    :templateName="currentTemplateName"
    :exporting="exporting"
    :autoLayouting="autoLayouting"
    @back="handleBack"
    @autoLayout="handleAutoLayout"
    @export="handleExport"
    @canvasChange="handleCanvasChange"
    @paperChange="handlePaperChange"
    @toggleTweaks="toggleTweaks"
    @toggleEditor="toggleEditor"
  />

  <div class="studio-workbench">
    <PageThumbnailBar ... />

    <div class="studio-main">
      <PageCanvas ... />
      <Transition name="notice-fade">
        <div v-if="canvasNotice" class="canvas-notice">{{ canvasNotice }}</div>
      </Transition>
    </div>

    <EntryEditor ... />
  </div>

  <StudioStatusBar
    :currentPage="currentPage"
    :totalPages="totalPages"
    :hasPendingSync="hasPendingSync"
    :paper="paper"
    :templateName="currentTemplateName"
    :statusText="statusText"
  />
</div>
```

- [ ] **Step 4: 增加页面壳层样式，建立工作台空间层级**

```css
.publishing-studio {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background:
    linear-gradient(180deg, rgba(255,255,255,0.76), rgba(248,245,239,0.92)),
    var(--color-neutral-2);
}

.studio-workbench {
  display: grid;
  grid-template-columns: 220px minmax(0, 1fr) 360px;
  gap: 0;
  flex: 1;
  min-height: 0;
}

.studio-main {
  position: relative;
  min-width: 0;
  overflow: hidden;
}

.canvas-notice {
  position: absolute;
  top: 18px;
  right: 20px;
  padding: 10px 14px;
  border: 1px solid rgba(183, 92, 54, 0.2);
  border-radius: 12px;
  background: rgba(255, 252, 247, 0.96);
  box-shadow: 0 10px 30px rgba(63, 45, 31, 0.08);
  color: var(--color-neutral-8);
  font-size: 12px;
}
```

- [ ] **Step 5: 让导出、自动排版、保存重排的局部状态真正驱动 UI**

在现有方法里补上本地 loading 状态和局部提示。

```ts
async function handleExport() {
  exporting.value = true
  try {
    feedback.statusMessage.value = "正在生成古籍 PDF..."
    const resp = await http.post(`/publishing/drafts/${draftId.value}/export`)
    if (resp.data.code === 200) {
      canvasNotice.value = "导出任务已提交"
      feedback.statusMessage.value = resp.data.data || "PDF 导出成功"
    } else {
      feedback.errorMessage.value = resp.data.message || "导出失败"
    }
  } finally {
    exporting.value = false
  }
}
```

- [ ] **Step 6: 运行类型检查，确认页面壳层重组没有破坏 props 和事件**

Run: `npm.cmd run build`

Expected: 构建通过，或者只剩与本任务无关的既有错误；如果有新的 Vue props 或模板错误，先在本任务内修掉。

- [ ] **Step 7: Commit**

```bash
git add frontend/src/views/PublishingStudio.vue
git commit -m "feat: reshape publishing studio workbench shell"
```

---

### Task 2: 重构 `StudioToolbar.vue` 为分组式工作台头部

**Files:**
- Modify: `frontend/src/components/publishing/StudioToolbar.vue`
- Test: `frontend/src/views/PublishingStudio.vue`

- [ ] **Step 1: 扩展 props，支持页信息和按钮进行态**

```ts
defineProps<{
  draftTitle: string
  draftStatus: string
  hasPendingSync: boolean
  paper: "A4" | "A3"
  editorOpen: boolean
  tweaksOpen: boolean
  canvasId: string
  currentPage: number
  totalPages: number
  templateName: string
  exporting: boolean
  autoLayouting: boolean
}>()
```

- [ ] **Step 2: 修正工具栏中的乱码文案与状态映射**

```ts
function statusText(status: string): string {
  const map: Record<string, string> = {
    draft: "草稿",
    review: "审校",
    final: "定稿",
  }
  return map[status] || status
}
```

- [ ] **Step 3: 将模板改成左中右三组结构**

```vue
<div class="studio-toolbar">
  <div class="toolbar-group toolbar-group--identity">
    <button class="btn-back" @click="$emit('back')">返回列表</button>
    <div class="toolbar-title-block">
      <span class="toolbar-title">{{ draftTitle }}</span>
      <span class="toolbar-meta">第 {{ currentPage }} 页 / 共 {{ totalPages }} 页</span>
    </div>
    <span :class="['status-badge', statusClass(draftStatus)]">{{ statusText(draftStatus) }}</span>
  </div>

  <div class="toolbar-group toolbar-group--primary">
    <button class="btn-secondary" :disabled="autoLayouting" @click="$emit('autoLayout')">
      {{ autoLayouting ? '正在排版...' : '自动排版' }}
    </button>
    <button class="btn-primary" :disabled="exporting" @click="$emit('export')">
      {{ exporting ? '正在导出...' : '付梓导出' }}
    </button>
  </div>

  <div class="toolbar-group toolbar-group--controls">
    <!-- 模板选择、纸张切换、微调、内容面板 -->
  </div>
</div>
```

- [ ] **Step 4: 统一按钮系统和工具栏视觉层级**

```css
.studio-toolbar {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto auto;
  align-items: center;
  gap: 16px;
  padding: 14px 20px;
  border-bottom: 1px solid rgba(92, 71, 53, 0.12);
  background: rgba(255, 252, 248, 0.92);
  box-shadow: 0 6px 20px rgba(80, 58, 39, 0.05);
  backdrop-filter: blur(10px);
}

.btn-primary,
.btn-secondary,
.btn-tool {
  height: 36px;
  border-radius: 10px;
  font-size: 12px;
}
```

- [ ] **Step 5: 让同步状态进入工具栏语义，而不是悬空贴纸**

```vue
<span v-if="hasPendingSync" class="toolbar-sync">内容已变更</span>
```

- [ ] **Step 6: 运行构建，检查 props 变更是否同步到调用方**

Run: `npm.cmd run build`

Expected: 不出现 `missing required prop`、模板变量未定义、事件名错误等新问题。

- [ ] **Step 7: Commit**

```bash
git add frontend/src/components/publishing/StudioToolbar.vue frontend/src/views/PublishingStudio.vue
git commit -m "feat: redesign publishing studio toolbar"
```

---

### Task 3: 强化左侧页面导航器与底部状态栏

**Files:**
- Modify: `frontend/src/components/publishing/PageThumbnailBar.vue`
- Modify: `frontend/src/components/publishing/PageThumbnail.vue`
- Modify: `frontend/src/components/publishing/StudioStatusBar.vue`
- Test: `frontend/src/views/PublishingStudio.vue`

- [ ] **Step 1: 给 `PageThumbnailBar.vue` 增加导航头部与总页数信息**

```vue
<div class="thumbnail-bar">
  <div class="thumbnail-bar__header">
    <div>
      <p class="thumbnail-bar__eyebrow">页面导航</p>
      <h3 class="thumbnail-bar__title">共 {{ sheetCount }} 页</h3>
    </div>
    <button class="btn-add-sheet" @click="$emit('addSheet')">新增页面</button>
  </div>

  <div class="thumbnail-bar__list">
    <PageThumbnail ... />
  </div>
</div>
```

- [ ] **Step 2: 调整 `PageThumbnail.vue`，把单页缩略项做成更强结构**

```vue
<div :class="['page-thumbnail', { active, 'drag-over': dragOver }]">
  <div class="thumb-preview">...</div>
  <div class="thumb-meta">
    <span class="thumb-number">第 {{ sheetNumber }} 页</span>
    <span class="thumb-label">{{ sheetType === 'genealogy' ? '世系页' : sheetType }}</span>
  </div>
</div>
```

- [ ] **Step 3: 统一缩略项和左栏的宽度、内边距、拖拽反馈**

```css
.thumbnail-bar {
  display: flex;
  flex-direction: column;
  min-height: 0;
  padding: 14px 12px;
  border-right: 1px solid rgba(92, 71, 53, 0.12);
  background: rgba(252, 249, 243, 0.88);
}

.page-thumbnail {
  width: 100%;
  padding: 8px;
  border-radius: 12px;
}
```

- [ ] **Step 4: 扩展 `StudioStatusBar.vue` 的 props，容纳模板与纸张上下文**

```ts
defineProps<{
  currentPage: number
  totalPages: number
  hasPendingSync: boolean
  paper: "A4" | "A3"
  templateName: string
  statusText: string
}>()
```

```vue
<div class="studio-status-bar">
  <span class="status-chip">页 {{ currentPage }} / {{ totalPages }}</span>
  <span class="status-chip">{{ templateName }}</span>
  <span class="status-chip">{{ paper }}</span>
  <div class="status-spacer" />
  <span :class="['status-sync', { 'status-sync--pending': hasPendingSync }]">{{ statusText }}</span>
</div>
```

- [ ] **Step 5: 运行构建，确认左栏和状态栏重构没有新增模板错误**

Run: `npm.cmd run build`

Expected: 左栏和状态栏组件通过编译，调用方 props 对齐。

- [ ] **Step 6: Commit**

```bash
git add frontend/src/components/publishing/PageThumbnailBar.vue frontend/src/components/publishing/PageThumbnail.vue frontend/src/components/publishing/StudioStatusBar.vue frontend/src/views/PublishingStudio.vue
git commit -m "feat: refine publishing studio navigation and status bar"
```

---

### Task 4: 将 `PageCanvas.vue` 升级为画布舞台

**Files:**
- Modify: `frontend/src/components/publishing/PageCanvas.vue`
- Test: `frontend/src/views/PublishingStudio.vue`

- [ ] **Step 1: 扩展 `PageCanvas.vue` props，让它知道页与模板上下文**

```ts
const props = defineProps<{
  sheetNumber: number
  pageData?: LineagePage | null
  publicationData?: PublicationData | null
  draftId: number
  canvasId: string
  paper?: "A4" | "A3"
  templateName?: string
}>()
```

- [ ] **Step 2: 为画布添加舞台头部与承托容器**

```vue
<div class="page-canvas">
  <div class="page-canvas__stage">
    <div class="page-canvas__toolbar">
      <span class="page-canvas__title">版面预览</span>
      <span class="page-canvas__meta">{{ templateName }} · {{ paper }} · 第 {{ sheetNumber }} 页</span>
    </div>

    <div class="page-canvas__viewport">
      <VrainPreview
        ref="vrainPreviewRef"
        :draftId="draftId"
        :canvasId="canvasId"
        :activePageIndex="sheetNumber - 1"
        @navigateToPage="(i: number) => $emit('navigateToPage', i)"
      />
    </div>
  </div>
</div>
```

- [ ] **Step 3: 用样式拉出“工作台中的预览舞台”**

```css
.page-canvas {
  display: flex;
  min-width: 0;
  height: 100%;
  padding: 18px;
  background:
    radial-gradient(circle at top, rgba(255, 255, 255, 0.6), transparent 55%),
    linear-gradient(180deg, rgba(245, 241, 234, 0.8), rgba(238, 232, 223, 0.95));
}

.page-canvas__stage {
  display: flex;
  flex-direction: column;
  width: 100%;
  border: 1px solid rgba(92, 71, 53, 0.12);
  border-radius: 18px;
  background: rgba(255, 252, 248, 0.7);
  box-shadow: inset 0 1px 0 rgba(255,255,255,0.75);
  overflow: hidden;
}
```

- [ ] **Step 4: 运行构建，确认画布 props 改动与页面调用对齐**

Run: `npm.cmd run build`

Expected: `PageCanvas` 模板和调用方都能通过。

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/publishing/PageCanvas.vue frontend/src/views/PublishingStudio.vue
git commit -m "feat: add publishing studio preview stage"
```

---

### Task 5: 把 `EntryEditor.vue` 从抽屉升级为内容检查器

**Files:**
- Modify: `frontend/src/components/publishing/EntryEditor.vue`
- Test: `frontend/src/views/PublishingStudio.vue`

- [ ] **Step 1: 保留现有事件接口，先重命名视觉语义，不动业务交互**

保持 `updateEntry`、`moveEntry`、`deleteEntry`、`moveToPage`、`saveAndRelayout` 事件不变，避免业务层面联动过大。

```ts
const props = defineProps<{
  pageData: LineagePage | null
  pageNumber: number
  totalPages: number
  open: boolean
}>()
```

- [ ] **Step 2: 调整模板结构，让每个条目卡片分成头部、正文、动作区**

```vue
<div v-if="open" class="entry-editor">
  <div class="editor-header">
    <div>
      <p class="editor-eyebrow">内容检查器</p>
      <h3 class="editor-title">第 {{ pageNumber }} 页 · {{ pageData?.entries?.length ?? 0 }} 条</h3>
    </div>
    <button class="editor-close" @click="$emit('close')">×</button>
  </div>

  <div v-if="!pageData?.entries?.length" class="editor-empty">
    <p>本页暂无条目</p>
    <p class="editor-hint">先执行“自动排版”，再逐条检查内容。</p>
  </div>

  <div v-else class="editor-list">...</div>

  <div class="editor-footer">
    <button class="btn-save-relayout" @click="$emit('saveAndRelayout')">保存并重新排版</button>
  </div>
</div>
```

- [ ] **Step 3: 收敛卡片和按钮样式，避免零碎感**

```css
.entry-editor {
  width: 360px;
  display: flex;
  flex-direction: column;
  border-left: 1px solid rgba(92, 71, 53, 0.12);
  background: rgba(255, 251, 246, 0.94);
}

.entry-card {
  padding: 12px;
  border: 1px solid rgba(92, 71, 53, 0.1);
  border-radius: 12px;
  background: rgba(255,255,255,0.76);
}

.btn-sm {
  min-height: 28px;
  border-radius: 8px;
}
```

- [ ] **Step 4: 把跨页选择器的默认值恢复到占位状态，避免误触发**

```ts
const targetPage = ref(0)

function confirmMove(index: number) {
  if (!targetPage.value) return
  emit("moveToPage", index, targetPage.value - 1)
  targetPage.value = 0
}
```

- [ ] **Step 5: 运行构建，确认检查器模板与事件接口保持兼容**

Run: `npm.cmd run build`

Expected: 不出现 `v-model.number`、事件参数或模板变量错误。

- [ ] **Step 6: Commit**

```bash
git add frontend/src/components/publishing/EntryEditor.vue
git commit -m "feat: upgrade publishing studio content inspector"
```

---

### Task 6: 最终联调与回归验证

**Files:**
- Modify: `frontend/src/views/PublishingStudio.vue`
- Modify: `frontend/src/components/publishing/StudioToolbar.vue`
- Modify: `frontend/src/components/publishing/PageThumbnailBar.vue`
- Modify: `frontend/src/components/publishing/PageThumbnail.vue`
- Modify: `frontend/src/components/publishing/PageCanvas.vue`
- Modify: `frontend/src/components/publishing/EntryEditor.vue`
- Modify: `frontend/src/components/publishing/StudioStatusBar.vue`

- [ ] **Step 1: 手动检查三个关键场景的页面状态**

检查以下场景是否都符合 spec：

```text
1. 草稿已加载但尚未排版：右栏空状态明确，主操作清晰
2. 已有多页排版结果：左栏导航、中央预览、右栏检查器分工清楚
3. 执行导出 / 自动排版 / 保存重排：按钮进行态与局部状态提示清楚
```

- [ ] **Step 2: 运行一次完整前端构建**

Run: `npm.cmd run build`

Expected: BUILD SUCCESS

- [ ] **Step 3: 检查 spec 覆盖度**

核对 `docs/superpowers/specs/2026-05-24-publishing-studio-workbench-design.md`：

```text
- 三栏工作台布局：Task 1 / Task 3 / Task 4 / Task 5
- 工具栏分组与主次操作：Task 2
- 页面导航器：Task 3
- 画布舞台：Task 4
- 内容检查器：Task 5
- 状态栏与状态反馈：Task 1 / Task 3
- 乱码文案修正：Task 1 / Task 2 / Task 5
```

- [ ] **Step 4: Commit**

```bash
git add frontend/src/views/PublishingStudio.vue frontend/src/components/publishing/StudioToolbar.vue frontend/src/components/publishing/PageThumbnailBar.vue frontend/src/components/publishing/PageThumbnail.vue frontend/src/components/publishing/PageCanvas.vue frontend/src/components/publishing/EntryEditor.vue frontend/src/components/publishing/StudioStatusBar.vue
git commit -m "feat: polish publishing studio into a professional workbench"
```
