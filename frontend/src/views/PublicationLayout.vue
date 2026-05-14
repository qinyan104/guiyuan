<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, provide, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { getPublication, updatePublication } from '../api/publication'
import { useFeedback } from '../composables/useFeedback'
import { usePublicationState } from '../composables/usePublicationState'
import { defaultSettings } from '../data/sampleFamily'
import { useEditorHistory } from '../features/history/useEditorHistory'
import type { EditorSnapshot } from '../features/history/historyCore'
import type { PublicationData, PublicationSettings } from '../types/family'

const route = useRoute()
const publicationId = computed(() => Number(route.params.id))

const loading = ref(true)
const serverPublicationId = ref<number | null>(null)
const syncStatus = ref<'saved' | 'pending' | 'syncing' | 'error' | 'conflict'>('saved')
const conflictMessage = ref('')
const serverRevision = ref<number | null>(null)
const lastSyncedSignature = ref('')

// Viewport state to persist camera across views
const viewportPan = ref({ x: 0, y: 0 })

const feedback = useFeedback()

// NOTE: Start empty so the UI does not flash sample data before the real payload loads.
const pub = usePublicationState({ title: '', people: {}, families: {}, focusFamilyId: '' } as any, defaultSettings)

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

function buildPersistedSignature() {
  const publicationSnapshot = JSON.parse(JSON.stringify(pub.publication)) as PublicationData
  delete (publicationSnapshot as Partial<PublicationData>).revision

  return JSON.stringify({
    publication: publicationSnapshot,
    settings: JSON.parse(JSON.stringify(pub.settings)) as PublicationSettings,
  })
}

const persistedSignature = computed(() => buildPersistedSignature())

let serverSaveTimeout: ReturnType<typeof setTimeout> | null = null
let saveRequestedWhileSyncing = false

function clearScheduledSave() {
  if (serverSaveTimeout) {
    clearTimeout(serverSaveTimeout)
    serverSaveTimeout = null
  }
}

function scheduleAutosave(delay = 3000) {
  clearScheduledSave()
  serverSaveTimeout = setTimeout(() => {
    saveToServer().catch(() => {})
  }, delay)
}

async function saveToServer() {
  if (syncStatus.value === 'conflict' || !serverPublicationId.value) return
  if (syncStatus.value === 'syncing') {
    saveRequestedWhileSyncing = true
    return
  }

  clearScheduledSave()
  if (persistedSignature.value === lastSyncedSignature.value) {
    syncStatus.value = 'saved'
    return
  }

  syncStatus.value = 'syncing'
  const signatureAtSaveStart = persistedSignature.value

  try {
    pub.publication.revision = serverRevision.value ?? 0
    const newRevision = await updatePublication(serverPublicationId.value, pub.publication, pub.settings)
    serverRevision.value = newRevision
    pub.publication.revision = newRevision
    lastSyncedSignature.value = signatureAtSaveStart
    feedback.errorMessage.value = ''
  } catch (err) {
    const { asPublicationConflict } = await import('../api/conflict')
    const conflict = asPublicationConflict(err)

    if (conflict) {
      syncStatus.value = 'conflict'
      conflictMessage.value = conflict.message
      feedback.errorMessage.value = conflict.message
      clearScheduledSave()
      throw new Error(conflict.message, { cause: conflict })
    }

    syncStatus.value = 'error'
    feedback.setError('同步到服务器失败')
  }

  // After successful save (no exception was thrown by conflict handler):
  const hasUnsavedChanges = persistedSignature.value !== lastSyncedSignature.value
  if (saveRequestedWhileSyncing || hasUnsavedChanges) {
    saveRequestedWhileSyncing = false
    syncStatus.value = 'pending'
    scheduleAutosave()
  } else if (syncStatus.value !== 'error') {
    syncStatus.value = 'saved'
  }
}

watch(
  persistedSignature,
  (nextSignature) => {
    if (!serverPublicationId.value || loading.value || syncStatus.value === 'conflict') return
    if (nextSignature === lastSyncedSignature.value) return

    syncStatus.value = 'pending'
    scheduleAutosave()
    history.scheduleHistoryCommit()
  },
  { flush: 'post' },
)

async function load() {
  const targetId = publicationId.value
  if (!targetId) {
    loading.value = false
    return
  }

  if (serverPublicationId.value === targetId && Object.keys(pub.publication.people).length > 0) {
    loading.value = false
    return
  }

  loading.value = true
  clearScheduledSave()

  try {
    const result = await getPublication(targetId)
    pub.replaceReactiveObject(pub.publication, result.publication)
    pub.replaceReactiveObject(pub.settings, result.settings)

    if (!pub.selectedPersonId.value || !result.publication.people[pub.selectedPersonId.value]) {
      pub.selectedPersonId.value = Object.keys(result.publication.people)[0] ?? ''
    }

    serverPublicationId.value = result.id
    serverRevision.value = result.revision
    pub.publication.revision = result.revision
    conflictMessage.value = ''
    syncStatus.value = 'saved'
    lastSyncedSignature.value = persistedSignature.value
    history.initializeHistoryBaseline()
  } catch {
    feedback.setError('加载族谱失败')
  } finally {
    loading.value = false
  }
}

watch(publicationId, (newId) => {
  if (newId && newId !== serverPublicationId.value) {
    load()
  }
})

provide('publication-context', {
  pub,
  history,
  syncStatus,
  saveToServer,
  serverPublicationId,
  viewportPan,
})

function handleHistoryShortcut(event: KeyboardEvent) {
  const target = event.target as HTMLElement | null
  if (target?.closest('input, textarea, select, [contenteditable="true"]')) return
  if (!(event.ctrlKey || event.metaKey)) return

  const key = event.key.toLowerCase()
  if (key === 'z' && !event.shiftKey) {
    event.preventDefault()
    history.undoChange()
    return
  }
  if (key === 'y' || (key === 'z' && event.shiftKey)) {
    event.preventDefault()
    history.redoChange()
  }
}

async function reloadFromServerAfterConflict() {
  conflictMessage.value = ''
  await load()
}

onMounted(() => {
  load()
  window.addEventListener('keydown', handleHistoryShortcut)
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', handleHistoryShortcut)
  history.disposeHistory()
  clearScheduledSave()
})

defineExpose({ pub, saveToServer, reloadFromServerAfterConflict })
</script>

<template>
  <div v-if="loading" class="loading-overlay">
    <div class="loading-spinner"></div>
    <span>正在加载族谱数据...</span>
  </div>
  <router-view v-else />
  <div v-if="syncStatus === 'conflict'" class="sync-conflict-banner">
    <span>{{ conflictMessage }}</span>
    <button type="button" @click="reloadFromServerAfterConflict">Reload latest version</button>
  </div>
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

.sync-conflict-banner {
  position: sticky;
  top: 0;
  z-index: 100;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 1rem;
  padding: 0.75rem 1rem;
  background: #fff3cd;
  border-bottom: 1px solid #ffc107;
  color: #856404;
  font-weight: 600;
}

.sync-conflict-banner button {
  padding: 0.25rem 0.75rem;
  border: 1px solid #856404;
  border-radius: 4px;
  background: #fff;
  color: #856404;
  cursor: pointer;
  font-weight: 500;
}

.sync-conflict-banner button:hover {
  background: #856404;
  color: #fff;
}
</style>
