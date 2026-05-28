<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, provide, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { getPublication, updatePublication } from '../api/publication'
import { listAccounts } from '../api/account'
import { getUsername } from '../api/tokenStore'
import { useFeedback } from '../composables/useFeedback'
import { usePublicationState } from '../composables/usePublicationState'
import { defaultSettings } from '../data/sampleFamily'
import { clearConflictDraft, getConflictDraft, saveConflictDraft, type ConflictDraft } from '../features/conflict/conflictDraft'
import { useEditorHistory } from '../features/history/useEditorHistory'
import type { EditorSnapshot } from '../features/history/historyCore'
import { PUBLICATION_CONTEXT_KEY, type PublicationContext, type PublicationData, type PublicationSettings } from '../types/family'

const route = useRoute()
const publicationId = computed(() => Number(route.params.id))

const loading = ref(true)
const serverPublicationId = ref<number | null>(null)
const syncStatus = ref<'saved' | 'pending' | 'syncing' | 'error' | 'conflict'>('saved')
const conflictMessage = ref('')
const conflictDraftSaved = ref(false)
const conflictDraft = ref<ConflictDraft | null>(null)
const serverRevision = ref<number | null>(null)
const lastSyncedSignature = ref('')

// Viewport state to persist camera across views
const viewportPan = ref({ x: 0, y: 0 })

const feedback = useFeedback()

// NOTE: Start empty so the UI does not flash sample data before the real payload loads.
const viewerPersonId = ref<string | null>(null)
const pub = usePublicationState({ title: '', subtitle: '', people: {}, families: {}, focusFamilyId: '' }, defaultSettings, viewerPersonId.value)

function createEditorSnapshot(): EditorSnapshot {
  // 使用 JSON 序列化而非 structuredClone:
  // Vue reactive 代理(P<0x>xy)有 [[ProxyHandler]] 内部插槽，
  // structuredClone 规范明确对此抛出 DataCloneError。
  const raw = pub.publication as unknown as PublicationData
  return {
    publication: JSON.parse(JSON.stringify(raw)) as PublicationData,
    settings: JSON.parse(JSON.stringify(pub.settings)) as PublicationSettings,
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

function applyPublicationSnapshot(publication: PublicationData, settings: PublicationSettings) {
  pub.replaceReactiveObject(pub.publication, publication)
  pub.replaceReactiveObject(pub.settings, settings)
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
      const draftPublicationId = conflict.publicationId ?? serverPublicationId.value
      if (draftPublicationId) {
        conflictDraftSaved.value = saveConflictDraft({
          publicationId: draftPublicationId,
          serverRevision: serverRevision.value,
          message: conflict.message,
          publication: pub.publication,
          settings: pub.settings,
        }) !== null
      }
      syncStatus.value = 'conflict'
      conflictMessage.value = conflict.message
      feedback.errorMessage.value = conflict.message
      clearScheduledSave()
      throw new Error(conflict.message, { cause: conflict })
    }

    syncStatus.value = 'error'
    feedback.setError('同步到服务器失败')
    return
  }

  // After successful save:
  const hasUnsavedChanges = persistedSignature.value !== lastSyncedSignature.value
  if (saveRequestedWhileSyncing || hasUnsavedChanges) {
    saveRequestedWhileSyncing = false
    syncStatus.value = 'pending'
    scheduleAutosave()
  } else {
    syncStatus.value = 'saved'
  }
}

watch(
  persistedSignature,
  (nextSignature) => {
    history.scheduleHistoryCommit()
    if (!serverPublicationId.value || loading.value || syncStatus.value === 'conflict') return
    if (nextSignature === lastSyncedSignature.value) return

    syncStatus.value = 'pending'
    scheduleAutosave()
    history.scheduleHistoryCommit()
  },
  { flush: 'post' },
)

async function detectViewerPerson() {
  const username = getUsername()
  if (!username || !serverPublicationId.value) return
  try {
    const accounts = await listAccounts(serverPublicationId.value)
    const myAccount = accounts.find(a => a.username === username)
    if (myAccount) {
      pub.setViewerPersonId(String(myAccount.personDbId))
      return
    }
    // Fallback: try matching by name for non-collaborators
    for (const [pid, person] of Object.entries(pub.publication.people)) {
      if (person.name === username) {
        pub.setViewerPersonId(pid)
        return
      }
    }
  } catch {
    // Fallback even on API error
    for (const [pid, person] of Object.entries(pub.publication.people)) {
      if (person.name === username) {
        pub.setViewerPersonId(pid)
        return
      }
    }
  }
}

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
    applyPublicationSnapshot(result.publication, result.settings)

    if (!pub.selectedPersonId.value || !result.publication.people[pub.selectedPersonId.value]) {
      pub.selectedPersonId.value = Object.keys(result.publication.people)[0] ?? ''
    }

    serverPublicationId.value = result.id
    serverRevision.value = result.revision
    pub.publication.revision = result.revision
    conflictMessage.value = ''
    conflictDraftSaved.value = false
    conflictDraft.value = getConflictDraft(result.id)
    syncStatus.value = 'saved'
    lastSyncedSignature.value = persistedSignature.value
    history.initializeHistoryBaseline()
    await detectViewerPerson()
  } catch (err: any) {
    if (err?.response?.status === 403) {
      feedback.setError('你无权访问此家谱，请联系管理员将你添加为协作者')
    } else {
      feedback.setError('加载族谱失败')
    }
  } finally {
    loading.value = false
  }
}

watch(publicationId, (newId) => {
  if (newId && newId !== serverPublicationId.value) {
    load()
  }
})

provide(PUBLICATION_CONTEXT_KEY, {
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
  conflictDraftSaved.value = false
  await load()
}

function restoreConflictDraft() {
  if (!conflictDraft.value) return

  applyPublicationSnapshot(conflictDraft.value.publication, conflictDraft.value.settings)
  clearConflictDraft(conflictDraft.value.publicationId)
  conflictDraft.value = null
  syncStatus.value = 'pending'
  scheduleAutosave(0)
}

function dismissConflictDraft() {
  if (!conflictDraft.value) return

  clearConflictDraft(conflictDraft.value.publicationId)
  conflictDraft.value = null
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

defineExpose({ pub, saveToServer, reloadFromServerAfterConflict, restoreConflictDraft, dismissConflictDraft })
</script>

<template>
  <div v-if="loading" class="loading-overlay">
    <div class="loading-spinner"></div>
    <span>正在加载族谱数据...</span>
  </div>
  <router-view v-else />
  <div v-if="conflictDraft && syncStatus !== 'conflict'" class="conflict-draft-notice" data-testid="conflict-draft-notice">
    <div class="conflict-draft-notice__text">
      <span>检测到未恢复的本地草稿：{{ conflictDraft.publication.title || '未命名族谱' }}</span>
      <small>保存于 {{ new Date(conflictDraft.savedAt).toLocaleString() }}</small>
    </div>
    <div class="conflict-draft-notice__actions">
      <button type="button" data-testid="restore-conflict-draft" @click="restoreConflictDraft">恢复本地草稿</button>
      <button type="button" class="ghost" @click="dismissConflictDraft">忽略</button>
    </div>
  </div>
  <div v-if="syncStatus === 'conflict'" class="sync-conflict-banner">
    <div class="sync-conflict-banner__text">
      <span>{{ conflictMessage }}</span>
      <small v-if="conflictDraftSaved">本地未同步副本已保留，刷新后可作为手动恢复参考。</small>
    </div>
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
  font-weight: 500;
}

.loading-spinner {
  width: 40px;
  height: 40px;
  border: 3px solid var(--border-color, rgba(0,0,0,0.06));
  border-top-color: var(--accent-signal, #a96e35);
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
  font-weight: 500;
}

.conflict-draft-notice {
  position: sticky;
  top: 0;
  z-index: 99;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 1rem;
  padding: 0.75rem 1rem;
  background: #eef7ff;
  border-bottom: 1px solid #7db7e8;
  color: #204d73;
  font-weight: 500;
}

.conflict-draft-notice__text {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
}

.conflict-draft-notice__text small {
  color: #416983;
  font-size: 0.78rem;
  font-weight: 500;
}

.conflict-draft-notice__actions {
  display: flex;
  gap: 0.5rem;
}

.conflict-draft-notice button {
  padding: 0.25rem 0.75rem;
  border: 1px solid #2d6f9f;
  border-radius: 4px;
  background: #fff;
  color: #204d73;
  cursor: pointer;
  font-weight: 500;
}

.conflict-draft-notice button:hover {
  background: #204d73;
  color: #fff;
}

.conflict-draft-notice button.ghost {
  border-color: #9ab8cf;
  color: #416983;
}

.sync-conflict-banner__text {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
}

.sync-conflict-banner__text small {
  color: #6f5700;
  font-size: 0.78rem;
  font-weight: 500;
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

