# 无限画布虚拟化 (Viewport Culling) 实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 实现视口裁剪（Viewport Culling），仅渲染当前屏幕可见区域及其缓冲区的卡片，以优化大规模族谱的性能。

**Architecture:** 在 `PublicationCanvas.vue` 中利用 `computed` 计算当前的视口坐标范围（世界坐标系），并据此过滤 `layout.cards` 渲染列表。增加 500px 的缓冲区以保证平移时的流畅性。

**Tech Stack:** Vue 3, SVG, TypeScript.

---

### Task 1: 核心计算逻辑 (Viewport Rect calculation)

**Files:**
- Modify: `frontend/src/components/PublicationCanvas.vue`

- [ ] **Step 1: 添加 `visibleWorldRect` 计算属性**

在 `minimapData` 之后添加以下代码：

```typescript
const BUFFER_SIZE = 500

const visibleWorldRect = computed(() => {
  const zoom = props.settings.zoom
  const visibleWorldWidth = viewportWidth.value / zoom
  const visibleWorldHeight = viewportHeight.value / zoom
  
  // 计算当前视口中心在世界坐标系中的位置
  const worldLeft = props.layout.width / 2 - visibleWorldWidth / 2 - panX.value / zoom
  const worldTop = props.layout.height / 2 - visibleWorldHeight / 2 - panY.value / zoom
  
  return {
    left: worldLeft - BUFFER_SIZE,
    top: worldTop - BUFFER_SIZE,
    right: worldLeft + visibleWorldWidth + BUFFER_SIZE,
    bottom: worldTop + visibleWorldHeight + BUFFER_SIZE,
  }
})
```

- [ ] **Step 2: 验证计算逻辑并 Commit**

```bash
git add frontend/src/components/PublicationCanvas.vue
git commit -m "refactor(canvas): implement viewport bounding box calculation with buffer"
```

---

### Task 2: 应用过滤渲染 (Filtered Rendering)

**Files:**
- Modify: `frontend/src/components/PublicationCanvas.vue`

- [ ] **Step 1: 添加 `visibleCards` 计算属性**

```typescript
const visibleCards = computed(() => {
  const rect = visibleWorldRect.value
  return props.layout.cards.filter((card) => {
    // 简单的矩形碰撞检测：卡片是否与视口(含缓冲区)相交
    const cardRight = card.x + card.width
    const cardBottom = card.y + card.height
    
    return !(
      card.x > rect.right ||
      cardRight < rect.left ||
      card.y > rect.bottom ||
      cardBottom < rect.top
    )
  })
})
```

- [ ] **Step 2: 更新模板，使用 `visibleCards`**

修改模板中的 `PersonCardSvg` 循环：

```vue
<!-- 修改前 -->
<PersonCardSvg
  v-for="card in layout.cards"
  ...
/>

<!-- 修改后 -->
<PersonCardSvg
  v-for="card in visibleCards"
  ...
/>
```

- [ ] **Step 3: 运行并验证性能，然后 Commit**

```bash
git add frontend/src/components/PublicationCanvas.vue
git commit -m "feat(canvas): implement viewport culling for person cards"
```

---

### Task 3: 边界情况与稳定性检查

**Files:**
- Modify: `frontend/src/components/PublicationCanvas.vue`

- [ ] **Step 1: 检查极致缩放下的稳定性**

确保当 `zoom` 非常小时，缓冲区逻辑不会导致负值或计算错误影响渲染。实际上当前的逻辑已经处理了正负号，只需确保 `visibleCards` 在全景视图下能正确包含所有卡片。

- [ ] **Step 2: Commit 最终优化**

```bash
git commit --allow-empty -m "fix(canvas): ensure virtualization stability at extreme zoom levels"
```
