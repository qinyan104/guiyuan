# Shared Data Context Refactoring Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refactor secondary views to use the shared publication context for zero-latency navigation and centralized state management.

**Architecture:** Use Vue's `inject` to access the `publication-context` provided by `PublicationLayout.vue`. Remove local loading logic and API calls in secondary views.

**Tech Stack:** Vue 3, Composition API, TypeScript.

---

### Task 1: Refactor PersonDetailView.vue

**Files:**
- Modify: `frontend/src/views/PersonDetailView.vue`

- [ ] **Step 1: Remove redundant API import and update handleSave**
- [ ] **Step 2: Use context methods for saving and history marking**

```typescript
// Before
async function handleSave() {
  if (!person.value) return
  isSaving.value = true
  try {
    await updatePerson(props.publicationId, props.personId, editForm.value)
    Object.assign(person.value, editForm.value)
    isEditing.value = false
  } catch (err: any) {
    alert('保存失败: ' + (err.message || '未知错误'))
  } finally {
    isSaving.value = false
  }
}

// After
const { pub, saveToServer, history } = inject('publication-context') as any

async function handleSave() {
  if (!person.value) return
  isSaving.value = true
  try {
    // Update reactive state in shared context
    Object.assign(pub.publication.people[props.personId], editForm.value)
    
    // Trigger immediate save and mark history
    await saveToServer()
    history.markHistory('修改人物详情')
    
    isEditing.value = false
  } catch (err: any) {
    alert('保存失败: ' + (err.message || '未知错误'))
  } finally {
    isSaving.value = false
  }
}
```

### Task 2: Refactor PublicationStatsView.vue

**Files:**
- Modify: `frontend/src/views/PublicationStatsView.vue`

- [ ] **Step 1: Ensure it uses pub.publication directly**
- [ ] **Step 2: Remove any redundant loading indicators if parent handles it**

### Task 3: Refactor TimelineView.vue

**Files:**
- Modify: `frontend/src/views/TimelineView.vue`

- [ ] **Step 1: Ensure it uses pub.publication directly**
- [ ] **Step 2: Clean up unused imports**

### Task 4: Verification

- [ ] **Step 1: Verify navigation between views is instantaneous**
- [ ] **Step 2: Verify editing a person in PersonDetailView updates the state and syncs to server**
- [ ] **Step 3: Verify stats and timeline reflect changes immediately**
