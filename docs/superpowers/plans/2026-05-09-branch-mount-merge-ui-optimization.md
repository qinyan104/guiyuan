# Branch Mount & Merge UI Optimization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Clean up the Branch Mount UI by removing redundant controls, implementing a grouped custom dropdown for publication selection, and isolating the high-impact Physical Merge action.

**Architecture:** Refactor `BranchMountManager.vue` to use local UI state for a custom dropdown and restructure the template to separate daily mount settings from advanced merge operations.

**Tech Stack:** Vue 3, TypeScript, CSS (Vanilla)

---

### Task 1: UI Cleanup - Remove Redundant Mount Button

**Files:**
- Modify: `frontend/src/components/BranchMountManager.vue`

- [ ] **Step 1: Identify and remove the redundant "Set as Mount Point" button**

In the template, locate the `.branch-mount-actions` section and remove the first button that toggles `handleToggleMountPoint`.

```vue
<!-- Before -->
<div class="branch-mount-actions">
  <button class="relation-btn" type="button" @click="handleToggleMountPoint(!person.isMountPoint)">
    ...
    {{ person.isMountPoint ? '断开挂载' : '设为挂载点' }}
  </button>
  <button ...>...</button>
</div>

<!-- After -->
<div class="branch-mount-actions">
  <button
    class="relation-btn relation-btn--accent"
    type="button"
    :disabled="mergePending || !person.isMountPoint || !person.mountPointTarget?.publicationId"
    @click="handleMerge"
  >
    ...
  </button>
</div>
```

- [ ] **Step 2: Verify Toggle Switch functionality**

Open the Person Editor, toggle the switch at the top of the "Branch Mount" section, and ensure `isMountPoint` updates correctly without needing the removed button.

- [ ] **Step 3: Commit cleanup**

```bash
git add frontend/src/components/BranchMountManager.vue
git commit -m "refactor: remove redundant mount toggle button in BranchMountManager"
```

---

### Task 2: Implement Grouped Custom Dropdown

**Files:**
- Modify: `frontend/src/components/BranchMountManager.vue`

- [ ] **Step 1: Add state and grouping logic**

Add `isDropdownOpen` ref and `groupedPublications` computed property.

```typescript
const isDropdownOpen = ref(false);

const groupedPublications = computed(() => {
  const groups: Record<string, PublicationSummary[]> = {
    'OWNER': [],
    'EDITOR': []
  };
  availablePublications.value.forEach(pub => {
    if (groups[pub.accessRole]) {
      groups[pub.accessRole].push(pub);
    } else {
      // Fallback for any other editable roles if they exist
      if (!groups['OTHER']) groups['OTHER'] = [];
      groups['OTHER'].push(pub);
    }
  });
  return groups;
});

function selectPublication(pub: PublicationSummary) {
  selectedTargetId.value = String(pub.id);
  applyTargetPublication(pub);
  isDropdownOpen.value = false;
}

function clearSelection() {
  selectedTargetId.value = '';
  applyTargetPublication(null);
  isDropdownOpen.value = false;
}
```

- [ ] **Step 2: Replace `<select>` with Custom Dropdown UI**

Update the template to use a custom div-based dropdown.

```vue
<div class="branch-mount-field">
  <span>目标族谱</span>
  <div class="custom-select" :class="{ 'is-open': isDropdownOpen }">
    <button 
      class="custom-select__trigger" 
      type="button" 
      @click="isDropdownOpen = !isDropdownOpen"
      :disabled="loading || !availablePublications.length"
    >
      <span>{{ selectedTarget?.title || '选择一个目标族谱' }}</span>
      <svg class="chevron" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg>
    </button>
    
    <div v-if="isDropdownOpen" class="custom-select__options">
      <div v-if="groupedPublications.OWNER.length" class="custom-select__group">
        <label>我的族谱</label>
        <button 
          v-for="pub in groupedPublications.OWNER" 
          :key="pub.id"
          class="custom-select__option"
          @click="selectPublication(pub)"
        >
          {{ pub.title }}
        </button>
      </div>
      <div v-if="groupedPublications.EDITOR.length" class="custom-select__group">
        <label>共享·编辑</label>
        <button 
          v-for="pub in groupedPublications.EDITOR" 
          :key="pub.id"
          class="custom-select__option"
          @click="selectPublication(pub)"
        >
          {{ pub.title }}
        </button>
      </div>
      <button class="custom-select__option custom-select__option--clear" @click="clearSelection">
        清除选择
      </button>
    </div>
  </div>
</div>
```

- [ ] **Step 3: Add CSS for Custom Dropdown**

Add scoped styles for the new dropdown components.

```css
.custom-select {
  position: relative;
  width: 100%;
}

.custom-select__trigger {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  border: 1px solid rgba(91, 70, 42, 0.14);
  border-radius: 12px;
  padding: 10px 12px;
  background: rgba(255, 255, 255, 0.92);
  color: var(--text-main);
  font-size: 0.88rem;
  cursor: pointer;
  text-align: left;
}

.custom-select__options {
  position: absolute;
  top: calc(100% + 4px);
  left: 0;
  right: 0;
  background: white;
  border: 1px solid var(--border-color);
  border-radius: 12px;
  box-shadow: 0 4px 12px rgba(0,0,0,0.1);
  z-index: 100;
  max-height: 240px;
  overflow-y: auto;
  padding: 4px;
}

.custom-select__group label {
  display: block;
  padding: 8px 12px 4px;
  font-size: 0.7rem;
  color: var(--text-soft);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.custom-select__option {
  width: 100%;
  padding: 8px 12px;
  text-align: left;
  background: none;
  border: none;
  border-radius: 8px;
  font-size: 0.9rem;
  cursor: pointer;
  transition: background 200ms;
}

.custom-select__option:hover {
  background: rgba(169, 110, 53, 0.05);
}

.custom-select__option--clear {
  color: var(--text-soft);
  border-top: 1px solid var(--border-color);
  margin-top: 4px;
  border-radius: 0 0 8px 8px;
}
```

- [ ] **Step 4: Verify dropdown functionality**

Test opening, selecting items from different groups, and clearing selection. Verify the UI updates correctly.

- [ ] **Step 5: Commit dropdown**

```bash
git add frontend/src/components/BranchMountManager.vue
git commit -m "feat: implement custom grouped dropdown for publication selection"
```

---

### Task 3: Isolate Physical Merge into Advanced Zone

**Files:**
- Modify: `frontend/src/components/BranchMountManager.vue`

- [ ] **Step 1: Restructure template to separate the merge zone**

Move the merge button and its related feedback/hints to a new section outside the main `.branch-mount-panel`.

```vue
<!-- Inside template -->
<section class="branch-mount-panel">
  <!-- ... mount settings ... -->
</section>

<section v-if="person.isMountPoint && selectedTargetId" class="advanced-merge-zone">
  <div class="advanced-merge-zone__header">
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#d97706" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
    <strong>高级合并操作</strong>
  </div>
  <p>物理合并会不可逆地将目标族谱“{{ selectedTarget?.title }}”的数据副本直接写入当前稿件。操作完成后，该挂载点将被清除。</p>
  <button
    class="relation-btn relation-btn--accent"
    type="button"
    :disabled="mergePending"
    @click="handleMerge"
  >
    {{ mergePending ? '正在物理合并...' : '确认执行物理合并' }}
  </button>
</section>
```

- [ ] **Step 2: Add styles for the Advanced Merge Zone**

```css
.advanced-merge-zone {
  margin-top: 16px;
  padding: 16px;
  background: rgba(217, 119, 6, 0.03);
  border: 1px dashed rgba(217, 119, 6, 0.2);
  border-radius: 16px;
}

.advanced-merge-zone__header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
  color: #d97706;
}

.advanced-merge-zone p {
  font-size: 0.82rem;
  color: var(--text-soft);
  line-height: 1.5;
  margin: 0 0 12px;
}
```

- [ ] **Step 3: Verify separation and visibility logic**

Ensure the "Advanced Merge Zone" only appears when a mount point is active and a target is selected. Verify the merge action still works correctly.

- [ ] **Step 4: Commit advanced zone**

```bash
git add frontend/src/components/BranchMountManager.vue
git commit -m "feat: separate physical merge into its own advanced zone"
```

---

### Task 4: Final Polish and Interaction Fixes

**Files:**
- Modify: `frontend/src/components/BranchMountManager.vue`

- [ ] **Step 1: Add click-outside listener for dropdown**

```typescript
import { onUnmounted } from 'vue';

const closeDropdown = (e: MouseEvent) => {
  if (!(e.target as HTMLElement).closest('.custom-select')) {
    isDropdownOpen.value = false;
  }
};

onMounted(() => {
  window.addEventListener('click', closeDropdown);
});

onUnmounted(() => {
  window.removeEventListener('click', closeDropdown);
});
```

- [ ] **Step 2: Final visual check**

Verify colors, spacing, and responsive behavior (mobile view). Ensure all feedback messages are still visible and helpful.

- [ ] **Step 3: Commit final polish**

```bash
git add frontend/src/components/BranchMountManager.vue
git commit -m "style: final visual polish and interaction fixes for BranchMountManager"
```
