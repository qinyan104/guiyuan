# 王朝示例模板化实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将王朝示例提取到族谱列表首页作为置顶模板，并仅保留唐朝和明朝示例。

**Architecture:** 精简 `builtinDynastySamples.ts` 数据源；在 `PublicationListView.vue` 中新增模板展示区及克隆逻辑；移除工作台内部的示例加载菜单。

**Tech Stack:** Vue 3, Vite, TypeScript.

---

### Task 1: 数据源精简 (builtinDynastySamples.ts)

**Files:**
- Modify: `frontend/src/data/builtinDynastySamples.ts`

- [ ] **Step 1: 删除冗余朝代定义**

修改 `successionSampleDefinitions`，仅保留 `tang` 和 `xia`（注意：由于 `ming` 是在 `builtinSamples` 数组里手动合并的 `samplePublication`，我们需要保留 `tang`）。等等，用户说保留唐朝和明朝。在原代码中，明朝是直接使用 `samplePublication` 的。

```typescript
// 修改后的 successionSampleDefinitions 应该只包含 tang (因为 ming 在后面合并)
const successionSampleDefinitions: SuccessionSampleDefinition[] = [
  // 仅保留 tang
  {
    id: 'tang',
    label: '唐朝',
    group: '隋唐五代',
    rulers: [
      { name: '唐高祖', note: '李渊建唐' },
      // ... (保留完整的唐朝数据)
    ],
    branches: [
      // ... (保留完整的唐朝分支数据)
    ],
  },
]
```

- [ ] **Step 2: 清理历史字典字典**

删除 `dynastyClanProfiles`、`personClanOverrides` 和 `historicalRulerProfiles` 中所有非 `tang` 的键。

- [ ] **Step 3: 扁平化导出 `builtinSamples`**

确保 `builtinSamples` 导出的数组只包含唐朝和明朝。

```typescript
export const builtinSamples: BuiltinSampleRecord[] = [
  ...successionSampleDefinitions.map((definition) => ({
    id: definition.id,
    label: definition.label,
    group: definition.group,
    publication: createSuccessionSample(definition),
  })),
  {
    id: 'ming',
    label: '明朝',
    group: '宋辽夏金元明清',
    publication: samplePublication,
  },
]
```

- [ ] **Step 4: Commit 数据变更**

```bash
git add frontend/src/data/builtinDynastySamples.ts
git commit -m "refactor(data): cleanup dynasty samples to keep only Tang and Ming"
```

---

### Task 2: 首页模板入口实现 (PublicationListView.vue)

**Files:**
- Modify: `frontend/src/views/PublicationListView.vue`

- [ ] **Step 1: 导入模板数据和 API**

```typescript
import { builtinSamples } from '../data/builtinDynastySamples'
import { defaultSettings } from '../data/sampleFamily'
// 确保 createPublication 已导入
```

- [ ] **Step 2: 实现 `handleCreateFromTemplate` 方法**

```typescript
async function handleCreateFromTemplate(sample: any) {
  const title = `${sample.label}示例 (副本)`
  try {
    const id = await createPublication(
      { ...sample.publication, title },
      defaultSettings,
      title,
    )
    router.push({ name: 'workbench', params: { id } })
  } catch (err) {
    console.error('从模板创建失败:', err)
  }
}
```

- [ ] **Step 3: 更新模板，添加模板展示区**

在 `.list-header` 之后添加模板区域：

```vue
<div class="template-section">
  <h2 class="section-title">内置示例模板</h2>
  <div class="template-grid">
    <div 
      v-for="sample in builtinSamples" 
      :key="sample.id" 
      class="template-card"
      @click="handleCreateFromTemplate(sample)"
    >
      <div class="template-card__icon">📜</div>
      <div class="template-card__info">
        <h3>{{ sample.label }}世系示例</h3>
        <p>点击克隆一份副本进行编辑</p>
      </div>
    </div>
  </div>
</div>
```

- [ ] **Step 4: 添加样式**

在 `<style>` 中添加 `.template-section`、`.template-grid` 和 `.template-card` 的样式，确保其具有特殊的视觉效果（如浅金色的背景或边框）。

- [ ] **Step 5: Commit 首页变更**

```bash
git add frontend/src/views/PublicationListView.vue
git commit -m "feat(list): add pinned dynasty templates section"
```

---

### Task 3: 工作台冗余清理

**Files:**
- Modify: `frontend/src/components/WorkbenchHeader.vue`
- Modify: `frontend/src/views/WorkbenchView.vue`
- Modify: `frontend/src/composables/useRelationshipActions.ts`

- [ ] **Step 1: 移除 `WorkbenchHeader` 中的示例菜单**

删除 `sample-groups` prop，删除模板中对应的下拉项。

- [ ] **Step 2: 移除 `WorkbenchView` 中的引用**

删除 `builtinSampleGroups` 的导入和向 `WorkbenchHeader` 的传参。

- [ ] **Step 3: 移除 `useRelationshipActions` 中的逻辑**

删除 `loadBuiltinSample` 和 `restoreSample` 的实现及导出。

- [ ] **Step 4: 运行 Lint 和类型检查**

确保移除代码后没有引起引用报错。

- [ ] **Step 5: Final Commit**

```bash
git add .
git commit -m "refactor(workbench): remove internal sample loading UI"
```
