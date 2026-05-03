# [SUPERSEDED] 无限画布虚拟化 (Viewport Culling) 设计文档

**Status: SUPERSEDED (2026-05-03)**
*This design was implemented but later reverted in favor of **Full SVG Rendering + GPU Acceleration** to eliminate component mount/unmount lag during fast panning. See `MEMORY.md` for the current performance strategy.*

## 1. 背景与目标 (Background & Goals)
目前族谱管理系统的 `PublicationCanvas.vue` 采用全量渲染模式。当族谱人数增加到几百人甚至上千人时，SVG 内部的 DOM 节点（`<g class="person-card">`）会成倍增加，导致：
- 初次打开画布时 CPU 占用过高。
- 拖动和缩放时浏览器布局计算频率过高，产生掉帧。

**目标**：实现视口裁剪（Viewport Culling），仅渲染当前屏幕可见区域（及周边缓冲区）内的卡片，确保无论数据量多大，渲染性能始终保持在极高水准。

## 2. 核心逻辑 (Core Logic)

### 2.1 视口坐标转换
我们需要计算出当前屏幕在“族谱世界”中的矩形坐标 `visibleWorldRect`。
- **输入**：`viewportWidth`, `viewportHeight` (物理屏幕尺寸)；`panX`, `panY` (平移量)；`zoom` (缩放倍率)。
- **公式**：
  - `centerWorldX = layout.width / 2 - panX / zoom`
  - `centerWorldY = layout.height / 2 - panY / zoom`
  - `worldHalfWidth = (viewportWidth / 2) / zoom`
  - `worldHalfHeight = (viewportHeight / 2) / zoom`
  - `rect = { left: centerWorldX - worldHalfWidth, top: centerWorldY - worldHalfHeight, ... }`

### 2.2 渲染缓冲区 (Buffer)
为了防止快速拖动时出现边缘闪烁（白边），我们在计算出的 `visibleWorldRect` 基础上，向四周额外扩展 **500像素**（世界坐标单位）的缓冲区。

### 2.3 动态过滤
在渲染 `PersonCardSvg` 时，不再直接遍历 `layout.cards`，而是遍历计算后的 `visibleCards`。
- **判断标准**：卡片的矩形范围（`x, y, width, height`）与 `visibleWorldRect` 是否相交。

## 3. 技术实现细节

- **响应式优化**：视口范围的计算应与 `panX`, `panY`, `zoom` 以及窗口大小变化挂钩。
- **批量处理**：对于上万个点的坐标对比，可以使用简单的矩形相交算法，性能开销微乎其微。
- **保持连线**：族谱的背景连线（SVG Line）暂时保持全量渲染，因为线条的 DOM 结构极轻。

## 4. Git Commit 计划 (Incremental Execution)

1. **Step 1: 核心计算逻辑**
   - 在 `PublicationCanvas.vue` 中添加 `visibleWorldRect` 和缓冲区计算逻辑。
   - *Commit: "refactor(canvas): implement viewport bounding box calculation with buffer"*

2. **Step 2: 应用过滤渲染**
   - 修改模板，将 `v-for` 的对象替换为 `visibleCards`。
   - *Commit: "feat(canvas): implement viewport culling for person cards"*

3. **Step 3: 边界情况优化**
   - 确保缩放至极小时（能看全全局）逻辑依然正确。
   - *Commit: "fix(canvas): ensure virtualization stability at extreme zoom levels"*

## 5. 自我审查 (Self-Review)
- **占位符检查**：无 TBD。
- **一致性**：坐标系转换逻辑与现有 `minimapData` 保持一致。
- **范围检查**：500px 缓冲区足以覆盖大多数拖动场景。
- **功能完整性**：所有卡片交互（点击、选择）不受影响，因为 DOM 只是被动态增删，Vue 的事件绑定会自动处理。
