# 出版工作室视觉 & 交互升级 — 实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (- [ ]) syntax for tracking.

**Goal:** 将出版工作室全部硬编码颜色替换为 Yohaku 设计令牌，暗色模式自动适配，同时升级目录页卡片、EntryEditor 交互、缩略图导航和 Toolbar 布局。

**Architecture:** 纯前端 Vue 3 + TypeScript 重构，不涉及后端 API 变更。所有组件样式硬编码色值替换为 CSS 令牌，引入已有琉璃类，EntryEditor 增加编辑历史栈实现撤销/重做。

**Tech Stack:** Vue 3 Composition API, TypeScript, CSS Custom Properties

**涉及文件:**
- 修改: frontend/src/views/PublishingDashboard.vue
- 修改: frontend/src/views/PublishingStudio.vue
- 修改: frontend/src/components/publishing/EntryEditor.vue
- 修改: frontend/src/components/publishing/PageThumbnail.vue
- 修改: frontend/src/components/publishing/PageThumbnailBar.vue
- 修改: frontend/src/components/publishing/PageCanvas.vue
- 修改: frontend/src/components/publishing/TweaksPanel.vue
- 修改: frontend/src/components/publishing/StudioStatusBar.vue
- 修改: frontend/src/components/publishing/StudioToolbar.vue

---

## 实施顺序

| Task | 内容 |
|------|------|
| 1 | Bug 修复: 返回按钮 → /publication/ |
| 2 | Token 换血: 9 个组件所有硬编码色 → Yohaku 令牌 + 琉璃类 |
| 3 | 目录页重设计: 卡片升级 + 搜索排序 + 空状态 + 弹窗 |
| 4 | EntryEditor 重设计: 世代分组 + 拖拽排序 + 批量操作 + 移动弹窗 + 撤销重做 |
| 5 | 缩略图导航重设计: 160px 宽 + 水印 + 空页 + 新增按钮 |
| 6 | Toolbar 重设计: 微调内联抽屉 + hover 动效 |

---

### Task 1: Bug 修复 — 返回按钮导航

**Files:** rontend/src/views/PublishingDashboard.vue

- [ ] **Step 1: 修改 handleBack**

将 handleBack 中的 outer.push('/dashboard/publications') 改为 outer.push('/publication/${effectivePublicationId}'):

@@ function handleBack() { router.push('/dashboard/publications') }
→ 
@@ function handleBack() { const pid = effectivePublicationId.value; if (pid != null) { router.push('/publication/${effectivePublicationId}') } else { router.push('/dashboard/publications') } }

---

### Task 2: Token 换血 — 9 个组件全琉璃化

**映射规则:**

| 旧 | 新 |
|----|-----|
| `rgba(255,253,248,0.96)` 等暖纸底 | `var(--color-neutral-1)` |
| `rgba(92,71,53,0.0x)` 等边框 | `var(--color-card-stroke)` |
| `#a8322a` | `var(--color-accent)` |
| 硬编码 box-shadow | `var(--shadow-whisper)` |
| `font-weight: 600/700` | `font-weight: 500` |
| `rgba(196,58,49,0.08)` 强调背景 | `var(--color-accent-muted)` |

**操作: 对以下 9 个文件的 `<style scoped>` 逐项替换:**
- PublishingDashboard.vue
- PublishingStudio.vue
- EntryEditor.vue
- PageThumbnail.vue
- PageThumbnailBar.vue
- PageCanvas.vue
- TweaksPanel.vue
- StudioStatusBar.vue
- StudioToolbar.vue

每文件构建验证: `cd frontend; npx vue-tsc --noEmit`

---

### Task 3: 目录页重设计

**Files:** `frontend/src/views/PublishingDashboard.vue`

- [ ] 添加 searchQuery + sortBy 响应式 ref + filteredDrafts computed（搜索/排序逻辑）
- [ ] Header 升级: 两行布局，上排"← 返回画布 + 标题"，下排搜索框 + 排序下拉 + 新建按钮
- [ ] 空状态: 📜 图标 + 引导文案 + "新建第一本草稿" 大按钮
- [ ] 卡片升级: 状态胶囊 + 版本号 + 页数 + 编辑时间
- [ ] 新建弹窗: 增加 placeholder 文案
- [ ] 追加搜索框/排序/空状态/卡片 新样式到 `<style scoped>`

---

### Task 4: EntryEditor 重设计

**Files:** `frontend/src/components/publishing/EntryEditor.vue`

- [ ] 新增 generationGroups computed（按世代分组）
- [ ] 新增 collapsedGroups ref + toggleGroup
- [ ] 新增 selectedEntries ref + toggleSelectAll / toggleSelect / batchDelete
- [ ] 新增 moveEntryIndex ref + openMovePopover / confirmMoveToPage
- [ ] 新增 editHistory ref / historyIndex ref / pushHistory / undo / redo
- [ ] 新增 handleKeydown（Ctrl+Z/Ctrl+Shift+Z）onMounted 注册
- [ ] 新增 dragEntryIndex / dragOverEntryIndex ref + drag 事件处理
- [ ] 模板重写: 批量操作栏 + 世代折叠组 + 条目卡片(拖拽柄+复选框+操作图标)
- [ ] 条目卡片内移动弹窗(目标页网格选择器)
- [ ] 追加所有新样式: gen-header, entry-grip, entry-check, batch-bar, move-popover, btn-icon, undo-indicator

---

### Task 5: 缩略图导航重设计

**Files:** `frontend/src/components/publishing/PageThumbnail.vue`, `PageThumbnailBar.vue`

- [ ] PageThumbnail: 添加 chineseNum() 函数
- [ ] PageThumbnail: 模板升级 — 页码水印 + 前6条姓名预览 + 底部条数/类型胶囊
- [ ] PageThumbnail: 样式重写 — 160px 宽, 200px 高, 水印大号半透明
- [ ] PageThumbnailBar: 移除 header 中小"新增页面"按钮
- [ ] PageThumbnailBar: 列表底部添加大号虚线卡片"新增页面"
- [ ] PageThumbnailBar: 追加 btn-add-sheet-large 样式

---

### Task 6: Toolbar 重设计 + 微交互

**Files:** `frontend/src/components/publishing/StudioToolbar.vue`, `PublishingStudio.vue`

- [ ] StudioToolbar.props: 新增 tweakFontSize, tweakLineHeight, tweakColumns, tweakMarginPreset
- [ ] StudioToolbar.emit: 新增 updateTweakFontSize, updateTweakLineHeight, updateTweakColumns, updateTweakMarginPreset
- [ ] StudioToolbar 模板: 内联微调抽屉（toolbar-tweaks-drawer with Transition）
- [ ] PublishingStudio: 移除旧浮层 TweaksPanel, StudioToolbar 传入微调 props + emit 处理
- [ ] PublishingStudio: 添加 handleTweakUpdate 函数
- [ ] 所有按钮 hover: translateY(-1px) + shadow-whisper
- [ ] 模板选择器: 缩至 300px, 选中自动关闭
- [ ] 追加 toolbar-tweaks-drawer + tweaks-slide 样式

---

### Task 7: 构建

`cd frontend; npx vue-tsc --noEmit; npx vite build`

Expected: 构建成功无错误。

