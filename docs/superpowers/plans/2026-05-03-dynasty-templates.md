# Dynasty Templates Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a "Dynasty Templates" section to the genealogy list view to allow users to quickly create large genealogies.

**Architecture:** Use a dedicated UI section above the main list. Logic involves cloning pre-defined JSON data from `builtinDynastySamples` into a new database record via the existing `createPublication` API.

**Tech Stack:** Vue 3 (Composition API), TypeScript, CSS (Scoped).

---

### Task 1: Setup Imports and State

**Files:**
- Modify: `frontend/src/views/PublicationListView.vue`

- [ ] **Step 1: Add required imports**

```typescript
import { builtinSamples } from '../data/builtinDynastySamples'
import { defaultSettings } from '../data/sampleFamily'
```

- [ ] **Step 2: Add `creatingTemplate` ref**

```typescript
const creatingTemplate = ref(false)
```

- [ ] **Step 3: Commit**

```bash
git commit -m "chore(list): import template data and add creating state"
```

### Task 2: Implement Cloning Logic

**Files:**
- Modify: `frontend/src/views/PublicationListView.vue`

- [ ] **Step 1: Implement `handleCreateFromTemplate`**

```typescript
async function handleCreateFromTemplate(sample: typeof builtinSamples[0]) {
  if (creatingTemplate.value) return
  
  creatingTemplate.value = true
  const baseTitle = sample.publication.title || sample.label
  const newTitle = baseTitle + ' (副本)'
  
  try {
    const id = await createPublication(
      sample.publication,
      defaultSettings,
      newTitle
    )
    router.push({ name: 'workbench', params: { id } })
  } catch (err: any) {
    alert('创建模板失败: ' + (err.message || '未知错误'))
  } finally {
    creatingTemplate.value = false
  }
}
```

- [ ] **Step 2: Commit**

```bash
git commit -m "feat(list): implement handleCreateFromTemplate logic"
```

### Task 3: Implement Template UI

**Files:**
- Modify: `frontend/src/views/PublicationListView.vue`

- [ ] **Step 1: Insert Template Section HTML**

Place this before `.publication-grid`.

```html
<div class="template-section">
  <div class="section-header">
    <h2 class="section-title">王朝世系模板</h2>
    <p class="section-desc">快速体验大规模世系图的自动排版与交互效果</p>
  </div>
  
  <div class="template-grid">
    <div 
      v-for="sample in builtinSamples" 
      :key="sample.id"
      class="template-card"
      :class="{ 'template-card--loading': creatingTemplate }"
      @click="handleCreateFromTemplate(sample)"
    >
      <div class="template-card__body">
        <div class="template-card__badge">官方模板</div>
        <h3 class="template-card__title">{{ sample.publication.title }}</h3>
        <p class="template-card__subtitle">{{ sample.publication.subtitle }}</p>
      </div>
      <div class="template-card__footer">
        <span class="template-card__action">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
          使用此模板
        </span>
      </div>
    </div>
  </div>
</div>
```

- [ ] **Step 2: Add Loading Overlay (Optional but recommended)**

```html
<div v-if="creatingTemplate" class="loading-overlay">
  <div class="loading-spinner"></div>
  <p>正在生成世系图...</p>
</div>
```

- [ ] **Step 3: Commit**

```bash
git commit -m "feat(list): add template section UI structure"
```

### Task 4: Styling

**Files:**
- Modify: `frontend/src/views/PublicationListView.vue`

- [ ] **Step 1: Add CSS for Template Section**

```css
.template-section {
  margin-bottom: 2.5rem;
  padding-bottom: 2rem;
  border-bottom: 1px solid var(--border-color, rgba(0,0,0,0.06));
}

.section-header {
  margin-bottom: 1.25rem;
}

.section-title {
  font-size: 1.25rem;
  font-family: 'Noto Serif SC', serif;
  font-weight: 700;
  color: var(--accent-ink, #6a4b2f);
  margin: 0;
}

.section-desc {
  font-size: 0.85rem;
  color: var(--text-soft, #888);
  margin: 0.25rem 0 0;
}

.template-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
  gap: 1.25rem;
}

.template-card {
  background: linear-gradient(to bottom right, #fff, rgba(212, 175, 55, 0.05));
  border: 1.5px solid rgba(212, 175, 55, 0.3);
  border-radius: 16px;
  cursor: pointer;
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  display: flex;
  flex-direction: column;
  position: relative;
  overflow: hidden;
}

.template-card:hover {
  transform: translateY(-4px);
  border-color: var(--accent-amber, #a96e35);
  box-shadow: 0 12px 32px rgba(169, 110, 53, 0.12);
}

.template-card--loading {
  opacity: 0.6;
  pointer-events: none;
}

.template-card__body {
  padding: 1.5rem;
  flex: 1;
}

.template-card__badge {
  display: inline-block;
  font-size: 0.65rem;
  font-weight: 700;
  padding: 0.2rem 0.5rem;
  background: rgba(212, 175, 55, 0.15);
  color: #8a6d3b;
  border-radius: 6px;
  margin-bottom: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.template-card__title {
  margin: 0 0 0.5rem;
  font-size: 1.1rem;
  font-family: 'Noto Serif SC', serif;
  color: var(--text-main, #1a1a1a);
}

.template-card__subtitle {
  margin: 0;
  font-size: 0.8rem;
  color: var(--text-soft, #666);
  line-height: 1.6;
}

.template-card__footer {
  padding: 0.75rem 1.5rem;
  background: rgba(212, 175, 55, 0.05);
  border-top: 1px solid rgba(212, 175, 55, 0.1);
}

.template-card__action {
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--accent-amber, #a96e35);
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.loading-overlay {
  position: fixed;
  inset: 0;
  background: rgba(255, 255, 255, 0.7);
  backdrop-filter: blur(4px);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  z-index: 2000;
  color: var(--accent-ink, #6a4b2f);
}

.loading-spinner {
  width: 40px;
  height: 40px;
  border: 3px solid rgba(169, 110, 53, 0.1);
  border-top-color: var(--accent-amber, #a96e35);
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 1rem;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}
```

- [ ] **Step 2: Commit**

```bash
git commit -m "style(list): style the dynasty templates section"
```
