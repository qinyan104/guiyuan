<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, provide, ref, watch } from 'vue'
import { onBeforeRouteLeave, onBeforeRouteUpdate, useRoute, useRouter } from 'vue-router'
import { getPublication, updatePublication } from '../api/publication'
import { listAccounts } from '../api/account'
import { getUsername } from '../api/tokenStore'
import { useFeedback } from '../composables/useFeedback'
import { usePublicationState } from '../composables/usePublicationState'
import { defaultSettings } from '../data/sampleFamily'
import {
  clearConflictDraft,
  clearRecoveryDraft,
  getConflictDraft,
  getRecoveryDraft,
  saveConflictDraft,
  saveRecoveryDraft,
  type ConflictDraft,
  type RecoveryDraft,
} from '../features/conflict/conflictDraft'
import { useEditorHistory } from '../features/history/useEditorHistory'
import { serializeTrackedState, type EditorSnapshot } from '../features/history/historyCore'
import { PUBLICATION_CONTEXT_KEY, type PublicationContext, type PublicationData, type PublicationSettings } from '../types/family'

const route = useRoute()
const router = useRouter()
const publicationId = computed(() => Number(route.params.id))

const loading = ref(true)
const loadError = ref('')
const serverPublicationId = ref<number | null>(null)
const syncStatus = ref<'saved' | 'pending' | 'syncing' | 'error' | 'conflict'>('saved')
const conflictMessage = ref('')
const conflictDraftSaved = ref(false)
const conflictDraft = ref<ConflictDraft | null>(null)
const recoveryDraft = ref<RecoveryDraft | null>(null)
const serverRevision = ref<number | null>(null)
const lastSyncedSignature = ref('')
const baselineReady = ref(false)

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
  pub.replaceReactiveObject(pub.settings, { ...defaultSettings, ...settings })
}

const history = useEditorHistory({
  createSnapshot: createEditorSnapshot,
  restoreSnapshot: restoreEditorSnapshot,
})

function buildPersistedSignature() {
  return serializeTrackedState(pub.publication as unknown as PublicationData, pub.settings as PublicationSettings)
}

const persistedSignature = computed(() => baselineReady.value ? buildPersistedSignature() : lastSyncedSignature.value)

let serverSaveTimeout: ReturnType<typeof setTimeout> | null = null
let baselineInitTimeout: ReturnType<typeof setTimeout> | null = null
let saveRequestedWhileSyncing = false

function clearScheduledSave() {
  if (serverSaveTimeout) {
    clearTimeout(serverSaveTimeout)
    serverSaveTimeout = null
  }
}

function clearBaselineInit() {
  if (baselineInitTimeout) {
    clearTimeout(baselineInitTimeout)
    baselineInitTimeout = null
  }
}

function scheduleAutosave(delay = 3000) {
  clearScheduledSave()
  serverSaveTimeout = setTimeout(() => {
    saveToServer().catch(() => {})
  }, delay)
}

// ponytail: event-triggered snapshots avoid O(n) storage work per edit; use IndexedDB if continuous crash recovery is needed.
function saveRecoverySnapshot(message: string) {
  if (loading.value || !serverPublicationId.value || (syncStatus.value === 'saved' && baselineReady.value)) return true
  const snapshot = {
    publicationId: serverPublicationId.value,
    serverRevision: serverRevision.value,
    message,
    publication: pub.publication,
    settings: pub.settings,
  }
  if (syncStatus.value === 'conflict') {
    const savedDraft = saveConflictDraft({ ...snapshot, message: conflictMessage.value || message })
    conflictDraftSaved.value = Boolean(savedDraft)
    conflictDraft.value = savedDraft
    return Boolean(savedDraft)
  }
  return Boolean(saveRecoveryDraft(snapshot))
}

async function saveToServer() {
  const currentPublicationId = serverPublicationId.value
  if (syncStatus.value === 'conflict' || !currentPublicationId) return
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
    const newRevision = await updatePublication(currentPublicationId, pub.publication, pub.settings)
    serverRevision.value = newRevision
    pub.publication.revision = newRevision
    lastSyncedSignature.value = signatureAtSaveStart
    feedback.errorMessage.value = ''
  } catch (err) {
    const { asPublicationConflict } = await import('../api/conflict')
    const conflict = asPublicationConflict(err)

    if (conflict) {
      const draftPublicationId = conflict.publicationId ?? currentPublicationId
      if (draftPublicationId) {
        conflictDraftSaved.value = saveConflictDraft({
          publicationId: draftPublicationId,
          serverRevision: serverRevision.value,
          message: conflict.message,
          publication: pub.publication,
          settings: pub.settings,
        }) !== null
        if (conflictDraftSaved.value) {
          clearRecoveryDraft(draftPublicationId)
          recoveryDraft.value = null
        }
      }
      syncStatus.value = 'conflict'
      conflictMessage.value = conflict.message
      feedback.errorMessage.value = conflict.message
      clearScheduledSave()
      throw new Error(conflict.message, { cause: conflict })
    }

    syncStatus.value = 'error'
    const recoverySaved = saveRecoverySnapshot('服务器同步失败时保存的本地恢复副本')
    feedback.setError(recoverySaved ? '同步到服务器失败，本地恢复副本已保留' : '同步失败且无法保存本地副本，请立即导出 JSON 备份')
    return
  }

  // After successful save:
  const hasUnsavedChanges = persistedSignature.value !== lastSyncedSignature.value
  if (!hasUnsavedChanges) {
    clearRecoveryDraft(currentPublicationId)
    recoveryDraft.value = null
  }
  if (saveRequestedWhileSyncing || hasUnsavedChanges) {
    saveRequestedWhileSyncing = false
    syncStatus.value = 'pending'
    scheduleAutosave()
  } else {
    syncStatus.value = 'saved'
  }
}

function initializeLargeStateAfterPaint(
  myGeneration: number,
  publication: PublicationData,
  settings: PublicationSettings,
) {
  clearBaselineInit()
  // ponytail: defer O(n) JSON snapshots so large trees render before bookkeeping runs.
  baselineInitTimeout = setTimeout(async () => {
    baselineInitTimeout = null
    if (myGeneration !== loadGeneration || loading.value) return
    const signature = serializeTrackedState(publication, settings)
    const revision = serverRevision.value ?? publication.revision
    const zoom = settings.zoom
    const selectedPersonId = pub.selectedPersonId.value
    lastSyncedSignature.value = signature
    history.initializeHistoryBaseline({
      trackedStateSerialized: signature,
      createSnapshot: () => {
        const baseline = JSON.parse(signature) as Pick<EditorSnapshot, 'publication' | 'settings'>
        return {
          publication: { ...baseline.publication, revision },
          settings: { ...baseline.settings, zoom },
          selectedPersonId,
        }
      },
    })
    baselineReady.value = true
    await detectViewerPerson()
  }, 600)
}

watch(
  persistedSignature,
  (nextSignature) => {
    if (!baselineReady.value) return
    history.scheduleHistoryCommit(nextSignature)
    if (!serverPublicationId.value || loading.value || syncStatus.value === 'conflict') return
    if (nextSignature === lastSyncedSignature.value) return

    syncStatus.value = 'pending'
    scheduleAutosave()
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

let loadGeneration = 0

async function load(force = false) {
  const targetId = publicationId.value
  if (!targetId) {
    loading.value = false
    return
  }

  if (!force && serverPublicationId.value === targetId && Object.keys(pub.publication.people).length > 0) {
    loading.value = false
    return
  }

  const myGeneration = ++loadGeneration
  loading.value = true
  baselineReady.value = false
  clearScheduledSave()
  clearBaselineInit()

  try {
    const result = await getPublication(targetId)
    // Check if a newer load() call has started
    if (myGeneration !== loadGeneration) return

    applyPublicationSnapshot(result.publication, result.settings)

    if (!pub.selectedPersonId.value || !result.publication.people[pub.selectedPersonId.value]) {
      pub.selectedPersonId.value = Object.keys(result.publication.people)[0] ?? ''
    }

    serverPublicationId.value = result.id
    serverRevision.value = result.revision
    pub.publication.revision = result.revision
    conflictMessage.value = ''
    loadError.value = ''
    conflictDraftSaved.value = false
    conflictDraft.value = getConflictDraft(result.id)
    const storedRecoveryDraft = getRecoveryDraft(result.id)
    if (storedRecoveryDraft && serializeTrackedState(storedRecoveryDraft.publication, storedRecoveryDraft.settings) === buildPersistedSignature()) {
      clearRecoveryDraft(result.id)
      recoveryDraft.value = null
    } else {
      recoveryDraft.value = storedRecoveryDraft
    }
    syncStatus.value = 'saved'
    lastSyncedSignature.value = `revision:${result.revision}`
    loading.value = false
    initializeLargeStateAfterPaint(myGeneration, result.publication, { ...defaultSettings, ...result.settings })
  } catch (err: any) {
    // Don't show error for stale requests
    if (myGeneration !== loadGeneration) return
    if (err?.response?.status === 403) {
      loadError.value = '你无权访问此家谱，请联系管理员将你添加为协作者'
    } else {
      loadError.value = err?.response?.data?.message || err?.message || '加载族谱失败'
    }
    feedback.setError(loadError.value)
  } finally {
    if (myGeneration === loadGeneration) {
      loading.value = false
    }
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
  reloadFromServer: () => load(true),
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
  await load(true)
}

async function confirmLeaveWithUnsavedChanges() {
  if (syncStatus.value === 'saved') return true
  if (syncStatus.value !== 'conflict' && syncStatus.value !== 'syncing') {
    try {
      await saveToServer()
    } catch {
      // A conflict is handled below by the explicit leave confirmation.
    }
  }
  if (syncStatus.value === 'saved') return true
  saveRecoverySnapshot('离开页面前保存的本地恢复副本')
  return window.confirm('当前修改尚未保存到服务器，确定离开吗？')
}

function protectBrowserLeave(event: BeforeUnloadEvent) {
  if (syncStatus.value === 'saved') return
  saveRecoverySnapshot('关闭页面前保存的本地恢复副本')
  event.preventDefault()
  event.returnValue = ''
}

function preserveRecoveryWhenHidden() {
  if (document.visibilityState === 'hidden') {
    saveRecoverySnapshot('页面隐藏时保存的本地恢复副本')
  }
}

onBeforeRouteLeave(confirmLeaveWithUnsavedChanges)
onBeforeRouteUpdate((to, from) => (
  to.params.id === from.params.id ? true : confirmLeaveWithUnsavedChanges()
))

function applyStoredDraft(draft: ConflictDraft) {
  if (!baselineReady.value) {
    clearBaselineInit()
    lastSyncedSignature.value = buildPersistedSignature()
    history.initializeHistoryBaseline()
    baselineReady.value = true
  }
  applyPublicationSnapshot(draft.publication, draft.settings)
  return draft.serverRevision === serverRevision.value
}

function restoreConflictDraft() {
  const draft = conflictDraft.value
  if (!draft) return

  if (!applyStoredDraft(draft)) {
    syncStatus.value = 'conflict'
    conflictMessage.value = '本地草稿基于旧版本，已恢复供查看，但不会自动覆盖服务器。请先导出备份，再重新加载最新版本。'
    conflictDraftSaved.value = true
    return
  }

  clearConflictDraft(draft.publicationId)
  conflictDraft.value = null
  syncStatus.value = 'pending'
  scheduleAutosave(0)
}

function dismissConflictDraft() {
  if (!conflictDraft.value) return

  clearConflictDraft(conflictDraft.value.publicationId)
  conflictDraft.value = null
}

function restoreRecoveryDraft() {
  const draft = recoveryDraft.value
  if (!draft) return

  if (!applyStoredDraft(draft)) {
    const message = '服务器已有更新，本地恢复副本已打开供查看，但不会自动覆盖新版本。请先导出备份，再重新加载最新版本。'
    const savedConflictDraft = saveConflictDraft({
      publicationId: draft.publicationId,
      serverRevision: draft.serverRevision,
      message,
      publication: draft.publication,
      settings: draft.settings,
    })
    conflictDraftSaved.value = Boolean(savedConflictDraft)
    conflictDraft.value = savedConflictDraft
    if (savedConflictDraft) {
      clearRecoveryDraft(draft.publicationId)
      recoveryDraft.value = null
    }
    syncStatus.value = 'conflict'
    conflictMessage.value = message
    clearScheduledSave()
    return
  }

  clearRecoveryDraft(draft.publicationId)
  recoveryDraft.value = null
  syncStatus.value = 'pending'
  scheduleAutosave(0)
}

function dismissRecoveryDraft() {
  if (!recoveryDraft.value) return
  clearRecoveryDraft(recoveryDraft.value.publicationId)
  recoveryDraft.value = null
}

onMounted(() => {
  load()
  window.addEventListener('keydown', handleHistoryShortcut)
  window.addEventListener('beforeunload', protectBrowserLeave)
  document.addEventListener('visibilitychange', preserveRecoveryWhenHidden)
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', handleHistoryShortcut)
  window.removeEventListener('beforeunload', protectBrowserLeave)
  document.removeEventListener('visibilitychange', preserveRecoveryWhenHidden)
  history.disposeHistory()
  clearScheduledSave()
  clearBaselineInit()
})

defineExpose({ pub, saveToServer, reloadFromServerAfterConflict, restoreConflictDraft, dismissConflictDraft })
</script>

<template>
  <div v-if="loading" class="loading-overlay">
    <div class="loading-spinner"></div>
    <span>正在加载族谱数据...</span>
  </div>
  <div v-else-if="loadError" class="loading-overlay loading-overlay--error">
    <strong>加载族谱失败</strong>
    <span>{{ loadError }}</span>
    <button class="btn btn--primary" type="button" @click="router.push({ name: 'publications' })">返回族谱列表</button>
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
  <div v-if="recoveryDraft && !conflictDraft && syncStatus !== 'conflict'" class="conflict-draft-notice">
    <div class="conflict-draft-notice__text">
      <span>检测到未保存的本地修改：{{ recoveryDraft.publication.title || '未命名族谱' }}</span>
      <small>{{ recoveryDraft.message }} · {{ new Date(recoveryDraft.savedAt).toLocaleString() }}</small>
    </div>
    <div class="conflict-draft-notice__actions">
      <button type="button" @click="restoreRecoveryDraft">恢复本地修改</button>
      <button type="button" class="ghost" @click="dismissRecoveryDraft">使用服务器版本</button>
    </div>
  </div>
  <div v-if="syncStatus === 'conflict'" class="sync-conflict-banner">
    <div class="sync-conflict-banner__text">
      <span>{{ conflictMessage }}</span>
      <small v-if="conflictDraftSaved">本地未同步副本已保留，刷新后可作为手动恢复参考。</small>
    </div>
    <button type="button" @click="reloadFromServerAfterConflict">重新加载最新版本</button>
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

.loading-overlay--error {
  background: var(--color-neutral-1, #f5f0e8);
  text-align: center;
}

.loading-overlay--error strong {
  color: var(--color-neutral-10, #1f1d1a);
  font-family: var(--font-serif, serif);
  font-size: var(--text-title-24, 24px);
  font-weight: 500;
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

