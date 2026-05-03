# Shared Genealogy Context Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement a parent layout (`PublicationLayout.vue`) that handles data loading, state management, history, and synchronization for a genealogy publication, sharing this context with child routes via Vue's `provide/inject`.

**Architecture:** Use a Parent Layout component to centralize the publication state (`usePublicationState`), history (`useEditorHistory`), and sync logic. This state is shared using a context object provided to all nested routes (`Workbench`, `Stats`, `Timeline`, `PersonDetail`).

**Tech Stack:** Vue 3, Vue Router, TypeScript, Existing Composables.

---

### Task 1: Create PublicationLayout.vue

**Files:**
- Create: `frontend/src/views/PublicationLayout.vue`

- [ ] **Step 1: Implement the layout with state and context provision**

```vue
<script setup lang="ts">
import { computed, provide, ref, watch, onMounted, onBeforeUnmount } from 'vue'
import { useRoute } from 'vue-router'
import { usePublicationState } from '../composables/usePublicationState'
import { useEditorHistory } from '../features/history/useEditorHistory'
import { useFeedback } from '../composables/useFeedback'
import { getPublication, updatePublication, createPublication } from '../api/publication'
import { defaultSettings, samplePublication } from '../data/sampleFamily'
import type { EditorSnapshot } from '../features/history/historyCore'
import type { PublicationData, PublicationSettings } from '../types/family'

const route = useRoute()
const publicationId = computed(() => Number(route.params.id))

const loading = ref(true)
const serverPublicationId = ref<number | null>(publicationId.value || null)
const syncStatus = ref<'saved' | 'pending' | 'syncing' | 'error'>('saved')

const feedback = useFeedback()

// Initialize with sample data, will be replaced by loadPublication
const pub = usePublicationState(samplePublication, defaultSettings)

// History setup
function createEditorSnapshot(): EditorSnapshot {
  return {
    publication: structuredClone(pub.publication) as PublicationData,
    settings: structuredClone(pub.settings) as PublicationSettings,
    selectedPersonId: pub.selectedPersonId.value,
  }
}

function restoreEditorSnapshot(snapshot: EditorSnapshot) {
  pub.replaceReactiveObject(pub.publication, snapshot.publication)
  pub.replaceReactiveObject(pub.settings, snapshot.settings)
  if (pub.publication.people[snapshot.selectedPersonId]) {
    pub.selectedPersonId.value = snapshot.selectedPersonId
  }
}

const history = useEditorHistory({
  createSnapshot: createEditorSnapshot,
  restoreSnapshot: restoreEditorSnapshot,
})

// Sync logic
async function saveToServer() {
  if (syncStatus.value === 'syncing') return
  syncStatus.value = 'syncing'
  try {
    if (serverPublicationId.value) {
      await updatePublication(serverPublicationId.value, pub.publication, pub.settings)
    } else {
      const id = await createPublication(pub.publication, pub.settings)
      serverPublicationId.value = id
    }
    syncStatus.value = 'saved'
    feedback.errorMessage.value = ''
  } catch (err) {
    syncStatus.value = 'error'
    feedback.setError('同步到服务器失败')
  }
}

let serverSaveTimeout: any = null
watch(
  () => [pub.publication, pub.settings, pub.selectedPersonId.value],
  () => {
    syncStatus.value = 'pending'
    if (serverSaveTimeout) clearTimeout(serverSaveTimeout)
    serverSaveTimeout = setTimeout(saveToServer, 3000)
    history.scheduleHistoryCommit()
  },
  { deep: true }
)

async function load() {
  if (!publicationId.value) {
    loading.value = false
    return
  }
  
  loading.value = true
  try {
    const result = await getPublication(publicationId.value)
    pub.replaceReactiveObject(pub.publication, result.publication)
    pub.replaceReactiveObject(pub.settings, result.settings)
    pub.selectedPersonId.value = Object.keys(result.publication.people)[0] ?? ''
    serverPublicationId.value = result.id
    history.initializeHistoryBaseline()
  } catch (err) {
    feedback.setError('加载族谱失败')
  } finally {
    loading.value = false
  }
}

provide('publication-context', {
  pub,
  history,
  syncStatus,
  saveToServer,
  serverPublicationId,
})

onMounted(load)
onBeforeUnmount(() => {
  history.disposeHistory()
  if (serverSaveTimeout) clearTimeout(serverSaveTimeout)
})
</script>

<template>
  <div v-if="loading" class="loading-overlay">
    <div class="loading-spinner"></div>
    <span>正在加载族谱数据...</span>
  </div>
  <router-view v-else />
</template>

<style scoped>
.loading-overlay {
  position: fixed;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: var(--bg-shell, #f5f0e8);
  z-index: 1000;
  gap: 1rem;
  color: var(--text-soft, #888);
  font-weight: 600;
}

.loading-spinner {
  width: 40px;
  height: 40px;
  border: 3px solid var(--border-color, rgba(0,0,0,0.06));
  border-top-color: var(--accent-amber, #a96e35);
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}
</style>
```

### Task 2: Modify Router Configuration

**Files:**
- Modify: `frontend/src/router/index.ts`

- [ ] **Step 1: Group routes under PublicationLayout**

```typescript
// Replace the flat routes with nested routes
  {
    path: '/publication/:id',
    component: () => import('../views/PublicationLayout.vue'),
    children: [
      {
        path: '',
        name: 'workbench',
        component: () => import('../views/WorkbenchView.vue'),
        props: (route) => ({ publicationId: Number(route.params.id) }),
      },
      {
        path: 'person/:personId',
        name: 'person-detail',
        component: () => import('../views/PersonDetailView.vue'),
        props: (route) => ({
          publicationId: Number(route.params.id),
          personId: route.params.personId as string,
        }),
      },
      {
        path: 'stats',
        name: 'publication-stats',
        component: () => import('../views/PublicationStatsView.vue'),
        props: (route) => ({ publicationId: Number(route.params.id) }),
      },
      {
        path: 'timeline',
        name: 'publication-timeline',
        component: () => import('../views/TimelineView.vue'),
        props: (route) => ({ publicationId: Number(route.params.id) }),
      },
    ],
  },
```

### Task 3: Update WorkbenchView to use Shared Context

**Files:**
- Modify: `frontend/src/views/WorkbenchView.vue`

- [ ] **Step 1: Inject context and remove redundant logic**

(Remove `usePublicationState`, `useEditorHistory`, `syncStatus`, `loadPublication` from `WorkbenchView.vue` and use `inject('publication-context')`).

### Task 4: Verify Compilation

- [ ] **Step 1: Run type check**
Run: `npm run type-check` (or similar)

- [ ] **Step 2: Commit changes**
Commit: `refactor(router): implement nested publication layout and shared context provider`
