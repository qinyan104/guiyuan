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

const loadingProgress = ref(10)
const loadingStageText = ref('正在读取宗谱档案...')
const isLargeDataDetected = ref(false)

const isTestEnv = import.meta.env.MODE === 'test'
const isOverlayVisible = ref(isTestEnv)
let overlayDelayTimer: ReturnType<typeof setTimeout> | null = null

function clearOverlayDelay() {
  if (overlayDelayTimer) {
    clearTimeout(overlayDelayTimer)
    overlayDelayTimer = null
  }
}

let progressTimer: ReturnType<typeof setInterval> | null = null
let loadStartTime = 0

function startProgressSimulation() {
  loadStartTime = Date.now()
  loadingProgress.value = 15
  loadingStageText.value = '正在读取宗谱档案...'
  isLargeDataDetected.value = false
  if (progressTimer) clearInterval(progressTimer)

  // Asymptotic smooth progression that NEVER freezes:
  // Step is proportional to (95 - current), updating every 50ms (20fps)
  progressTimer = setInterval(() => {
    const elapsed = Date.now() - loadStartTime
    const targetCap = 94
    const delta = Math.max(0.12, (targetCap - loadingProgress.value) * 0.045)
    loadingProgress.value = Math.min(targetCap, loadingProgress.value + delta)

    if (elapsed > 1800) {
      isLargeDataDetected.value = true
      loadingStageText.value = '谱系规模庞大，正在构建分支谱图与世系索引...'
    } else if (elapsed > 600) {
      loadingStageText.value = '正在解析世系分支与人丁记录...'
    }
  }, 50)
}

function stopProgressSimulation() {
  if (progressTimer) {
    clearInterval(progressTimer)
    progressTimer = null
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
  clearOverlayDelay()
  stopProgressSimulation()

  // 240ms 免打扰策略：
  // 若能在 240ms 内极速返回（小族谱或快速缓存），不弹出中心加载卡片，避免对用户造成无谓的打扰与视觉闪烁；
  // 若耗时超过 240ms（大族谱或慢网络），才顺畅浮现中心进度卡片与灵动流光。
  if (isTestEnv) {
    isOverlayVisible.value = true
    startProgressSimulation()
  } else {
    isOverlayVisible.value = false
    loadStartTime = Date.now()
    overlayDelayTimer = setTimeout(() => {
      if (loading.value && myGeneration === loadGeneration) {
        isOverlayVisible.value = true
        startProgressSimulation()
      }
    }, 240)
  }

  try {
    const result = await getPublication(targetId)
    // Check if a newer load() call has started
    if (myGeneration !== loadGeneration) return

    clearOverlayDelay()
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

    const peopleCount = Object.keys(result.publication.people).length
    loadingProgress.value = 100
    if (peopleCount > 80) {
      isLargeDataDetected.value = true
      loadingStageText.value = `已载入 ${peopleCount} 位族人，正在展开世系谱图...`
    } else {
      loadingStageText.value = '宗谱载入就绪，正在展开世系...'
    }

    // 只有当加载确实较慢并向用户展示了加载卡片时，才给予 120ms 的自然冲顶过渡；
    // 快速加载（未展示卡片）直接 0 延迟切换，实现真正的“瞬开”。
    if (!isTestEnv && isOverlayVisible.value) {
      await new Promise(resolve => setTimeout(resolve, 120))
    }

    stopProgressSimulation()
    isOverlayVisible.value = false
    loading.value = false
    initializeLargeStateAfterPaint(myGeneration, result.publication, { ...defaultSettings, ...result.settings })
  } catch (err: any) {
    clearOverlayDelay()
    stopProgressSimulation()
    // Don't show error for stale requests
    if (myGeneration !== loadGeneration) return
    isOverlayVisible.value = false
    loading.value = false
    if (err?.response?.status === 403) {
      loadError.value = '你无权访问此家谱，请联系管理员将你添加为协作者'
    } else {
      loadError.value = err?.response?.data?.message || err?.message || '加载族谱失败'
    }
    feedback.setError(loadError.value)
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

function isSynced() {
  return syncStatus.value === 'saved'
}

async function confirmLeaveWithUnsavedChanges() {
  if (isSynced()) return true
  if (syncStatus.value !== 'conflict' && syncStatus.value !== 'syncing') {
    try {
      await saveToServer()
    } catch {
      // A conflict is handled below by the explicit leave confirmation.
    }
  }
  if (isSynced()) return true
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
  clearOverlayDelay()
  stopProgressSimulation()
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
  <div v-if="loadError" class="loading-overlay loading-overlay--error">
    <strong>加载族谱失败</strong>
    <span>{{ loadError }}</span>
    <button class="btn btn--primary" type="button" @click="router.push({ name: 'publications' })">返回族谱列表</button>
  </div>
  <router-view v-else />

  <!-- 灵动全屏加载遮罩 (使用 Vue transition 实现离开时优雅淡出，不阻断路由挂载) -->
  <transition name="overlay-fade">
    <div
      v-if="loading && !loadError"
      class="loading-overlay"
      :class="{ 'loading-overlay--quiet': !isOverlayVisible }"
      aria-live="polite"
    >
      <div v-if="isOverlayVisible" class="loading-card panel-glass">
        <!-- 典雅同心圆转动动效 (Lively Concentric Rings & Ink Ripple) -->
        <div class="loading-circular">
          <div class="circular-aura"></div>
          <div class="circular-ring-outer"></div>
          <div class="circular-ring-inner"></div>
          <div class="circular-center-seal">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
            </svg>
          </div>
        </div>

        <!-- 动态阶段文案与族谱格调副标 -->
        <div class="loading-info">
          <h3 class="loading-title">{{ loadingStageText }}</h3>
          <p class="loading-subtitle">宗族源流 · 脉络考定</p>
        </div>

        <!-- 灵动进度条 (Lively Fluid Progress Bar) -->
        <div class="loading-bar-wrapper">
          <div class="loading-bar-track">
            <div class="loading-bar-fill" :style="{ width: `${loadingProgress}%` }">
              <!-- 永不停歇的水波流光 (Continuous Liquid Stream) -->
              <div class="loading-bar-liquid"></div>
              <!-- 前端脉动水滴光晕 (Leading Head Droplet) -->
              <div class="loading-bar-head"></div>
            </div>
          </div>
          <span class="loading-bar-percent">{{ Math.round(loadingProgress) }}%</span>
        </div>

        <div class="loading-tip" v-if="isLargeDataDetected">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
          <span>当前族谱人丁浩繁，正在加速构建谱图排版</span>
        </div>
      </div>
    </div>
  </transition>
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
  color: var(--text-soft, #888);
}

.overlay-fade-enter-active,
.overlay-fade-leave-active {
  transition: opacity 0.28s cubic-bezier(0.4, 0, 0.2, 1),
              transform 0.28s cubic-bezier(0.4, 0, 0.2, 1),
              filter 0.28s cubic-bezier(0.4, 0, 0.2, 1);
}

.overlay-fade-enter-from,
.overlay-fade-leave-to {
  opacity: 0;
  transform: scale(1.025);
  filter: blur(4px);
  pointer-events: none;
}

.loading-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 34px 38px;
  background: var(--bg-paper, #ffffff);
  border: 1px solid var(--border-color, rgba(122, 95, 65, 0.16));
  border-radius: 20px;
  box-shadow: 0 18px 48px rgba(70, 48, 24, 0.14), 0 2px 8px rgba(0, 0, 0, 0.04);
  min-width: 320px;
  max-width: 440px;
  width: 90%;
  text-align: center;
  position: relative;
  backdrop-filter: blur(14px);
  animation: card-appear 0.24s cubic-bezier(0.16, 1, 0.3, 1);
}

@keyframes card-appear {
  from { opacity: 0; transform: scale(0.95) translateY(10px); }
  to { opacity: 1; transform: scale(1) translateY(0); }
}

/* 典雅同心环圆圈指示器 (Circular Indicator) */
.loading-circular {
  position: relative;
  width: 68px;
  height: 68px;
  margin-bottom: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* 外层水墨呼吸光晕 (Ambient Aura Ripple) */
.circular-aura {
  position: absolute;
  inset: -6px;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(198, 60, 46, 0.18) 0%, rgba(198, 60, 46, 0) 70%);
  animation: aura-breath 2.4s ease-in-out infinite;
  pointer-events: none;
}

@keyframes aura-breath {
  0%, 100% { transform: scale(0.88); opacity: 0.35; }
  50% { transform: scale(1.22); opacity: 0.85; }
}

.circular-ring-outer {
  position: absolute;
  inset: 0;
  border-radius: 50%;
  border: 2px dashed rgba(198, 60, 46, 0.35);
  animation: ring-rotate-clockwise 16s linear infinite;
}

.circular-ring-inner {
  position: absolute;
  inset: 6px;
  border-radius: 50%;
  border: 2.5px solid transparent;
  border-top-color: var(--color-accent, #c63c2e);
  border-right-color: var(--color-accent, #c63c2e);
  animation: ring-cadence 1.4s cubic-bezier(0.65, 0.05, 0.35, 0.95) infinite;
}

@keyframes ring-cadence {
  0% { transform: rotate(0deg); }
  50% { transform: rotate(200deg); }
  100% { transform: rotate(360deg); }
}

.circular-center-seal {
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--color-accent, #c63c2e);
  animation: seal-pulse 2s ease-in-out infinite;
  filter: drop-shadow(0 2px 6px rgba(198, 60, 46, 0.25));
}

@keyframes seal-pulse {
  0%, 100% { transform: scale(0.95); opacity: 0.85; }
  50% { transform: scale(1.1); opacity: 1; }
}

/* 阶段文本 */
.loading-info {
  margin-bottom: 20px;
}

.loading-title {
  font-family: var(--font-serif, 'Noto Serif SC', serif);
  font-size: 15.5px;
  font-weight: 600;
  color: var(--text-main, #241a10);
  margin: 0 0 6px;
  letter-spacing: 0.03em;
  transition: all 0.25s ease;
}

.loading-subtitle {
  font-size: 12px;
  color: var(--text-soft, #8c827a);
  margin: 0;
  letter-spacing: 0.1em;
}

/* 灵动进度条 (Lively Progress Bar) */
.loading-bar-wrapper {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 12px;
}

.loading-bar-track {
  flex: 1;
  height: 7px;
  background: var(--line-soft, rgba(122, 95, 65, 0.12));
  border-radius: 999px;
  overflow: hidden;
  position: relative;
  box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.06);
}

.loading-bar-fill {
  height: 100%;
  background: linear-gradient(90deg, #B23023, #C63C2E, #E06D53);
  border-radius: 999px;
  transition: width 0.15s cubic-bezier(0.2, 0.8, 0.4, 1);
  position: relative;
  overflow: visible;
}

/* 永不停歇的水波流光 (Continuous Liquid Stream) */
.loading-bar-liquid {
  position: absolute;
  inset: 0;
  background: linear-gradient(
    90deg,
    transparent 0%,
    rgba(255, 255, 255, 0.4) 45%,
    rgba(255, 255, 255, 0.85) 50%,
    rgba(255, 255, 255, 0.4) 55%,
    transparent 100%
  );
  background-size: 200% 100%;
  animation: liquid-sweep 1.6s infinite linear;
}

@keyframes liquid-sweep {
  0% { transform: translateX(-100%); }
  100% { transform: translateX(100%); }
}

/* 前端脉动水滴光晕 (Leading Head Droplet) */
.loading-bar-head {
  position: absolute;
  right: -3px;
  top: 50%;
  transform: translateY(-50%);
  width: 9px;
  height: 9px;
  border-radius: 50%;
  background: #ffffff;
  box-shadow: 0 0 8px #C63C2E, 0 0 12px rgba(255, 255, 255, 0.8);
  animation: head-pulse 1.2s infinite alternate ease-in-out;
}

@keyframes head-pulse {
  0% { transform: translateY(-50%) scale(0.85); opacity: 0.7; }
  100% { transform: translateY(-50%) scale(1.25); opacity: 1; }
}

.loading-bar-percent {
  font-size: 12.5px;
  font-family: monospace;
  font-weight: 700;
  color: var(--text-main, #241a10);
  min-width: 36px;
  text-align: right;
  letter-spacing: 0.02em;
}

.loading-tip {
  margin-top: 15px;
  padding: 6px 12px;
  border-radius: 8px;
  background: rgba(198, 60, 46, 0.08);
  color: var(--color-accent, #c63c2e);
  font-size: 11.5px;
  display: flex;
  align-items: center;
  gap: 6px;
  animation: tip-fade-in 0.3s ease-out;
}

@keyframes ring-rotate-clockwise {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

@keyframes tip-fade-in {
  from { opacity: 0; transform: translateY(4px); }
  to { opacity: 1; transform: translateY(0); }
}

.loading-overlay--error {
  background: var(--color-neutral-1, #f5f0e8);
  text-align: center;
  gap: 1rem;
}

.loading-overlay--error strong {
  color: var(--color-neutral-10, #1f1d1a);
  font-family: var(--font-serif, serif);
  font-size: var(--text-title-24, 24px);
  font-weight: 500;
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

