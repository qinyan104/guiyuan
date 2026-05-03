# 全局族谱上下文与秒开架构设计文档

## 背景与目的
当前系统在不同视图（工作台、统计、时间轴、详情）间切换时，每个视图都会独立向后端发起数据请求。这导致了不必要的加载延迟，破坏了“正在编辑同一份族谱”的沉浸感。
本设计旨在通过“单源事实”架构，实现一份族谱在整个会话期间的数据共享、内存同步及全局撤销历史。

## 范围与影响
- **路由层**：重构 `src/router/index.ts`，引入嵌套路由。
- **视图层**：
    - 新增 `PublicationLayout.vue` 作为数据持有者。
    - 改造 `WorkbenchView.vue`、`PublicationStatsView.vue`、`TimelineView.vue`、`PersonDetailView.vue`。
- **状态管理**：将 `usePublicationState`、`useEditorHistory` 等核心逻辑从 `WorkbenchView` 提升至 `PublicationLayout`。

## 核心架构设计

### 1. 父级布局容器 (`PublicationLayout.vue`)
- **数据加载**：在 `onMounted` 时根据路由参数 `id` 调用一次 `getPublication`。
- **状态持有**：
    - `publication`: 响应式族谱数据。
    - `settings`: 响应式排版设置。
    - `history`: 维护全局 `undo/redo` 栈。
- **上下文下发 (Provide/Inject)**：
    ```typescript
    provide('publication-context', {
      publication,
      settings,
      history: { canUndo, canRedo, undo, redo, markHistory },
      syncStatus,
      saveToServer
    })
    ```
- **全局同步**：统一管理防抖自动保存，监听内存中数据的任何变化并同步至后端。

### 2. 子页面秒开逻辑
- **取消独立加载**：子页面不再拥有 `onMounted` 里的 API 调用。
- **即时渲染**：子页面通过 `inject` 获取已在内存中的数据引用。由于 Vue 的响应式特性，任何页面的修改都会立即反映在其他页面。
- **详情页无缝保存**：在 `PersonDetailView` 编辑并保存时，直接修改内存中的对象并触发 Layout 的 `saveToServer`，返回画布时无需重新请求。

### 3. 全局历史记录 (Global History)
- **统一撤销栈**：无论是画布上的位置移动，还是详情页的名字修改，都计入 Layout 持有的同一个历史栈。
- **跨页操作溯源**：在详情页完成复杂编辑后返回画布，用户依然可以使用 `Ctrl+Z` 撤销刚才在详情页的操作。

## 交互设计
- **加载状态**：仅在进入族谱时显示一次全局加载动画。
- **平滑切换**：利用 Vue 的 `<RouterView />`，子页面切换时数据保持稳定，仅视图组件发生替换。

## 潜在问题与对策
- **内存占用**：对于万人规模的族谱，内存占用在现代浏览器中依然可控（约数十 MB）。
- **并发冲突**：由于是单人编辑模式，内存同步能有效避免页面间的数据覆盖。

## 测试与验证
1. 验证从画布进入统计页是否为“瞬间呈现”。
2. 在详情页修改人物名字，验证返回画布后，对应的卡片名字是否已同步更新。
3. 在详情页修改后，验证在画布页面按 `Ctrl+Z` 能否撤回修改。
4. 验证退出族谱返回列表页再进入另一份族谱时，数据能正确重载。
