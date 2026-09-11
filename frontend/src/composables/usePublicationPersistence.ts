import { ref, type Ref } from 'vue'
import { updatePublication } from '../api/publication'
import { asPublicationConflict } from '../api/conflict'
import {
  clearRecoveryDraft,
  saveConflictDraft,
  saveRecoveryDraft,
  type ConflictDraft,
  type RecoveryDraft,
} from '../features/conflict/conflictDraft'
import { serializeTrackedState } from '../features/history/historyCore'
import type { PublicationData, PublicationSettings } from '../types/family'

export type PublicationSyncStatus = 'saved' | 'pending' | 'syncing' | 'error' | 'conflict'

type Feedback = {
  errorMessage: Ref<string>
  setError: (message: string) => void
}

interface PublicationPersistenceOptions {
  publication: PublicationData
  settings: PublicationSettings
  loading: Ref<boolean>
  serverPublicationId: Ref<number | null>
  serverRevision: Ref<number | null>
  baselineReady: Ref<boolean>
  feedback: Feedback
}

export function usePublicationPersistence(options: PublicationPersistenceOptions) {
  const syncStatus = ref<PublicationSyncStatus>('saved')
  const conflictMessage = ref('')
  const conflictDraftSaved = ref(false)
  const conflictDraft = ref<ConflictDraft | null>(null)
  const recoveryDraft = ref<RecoveryDraft | null>(null)
  const lastSyncedSignature = ref('')
  let serverSaveTimeout: ReturnType<typeof setTimeout> | null = null
  let saveRequestedWhileSyncing = false

  function buildPersistedSignature() {
    return serializeTrackedState(options.publication, options.settings)
  }

  function clearScheduledSave() {
    if (serverSaveTimeout) {
      clearTimeout(serverSaveTimeout)
      serverSaveTimeout = null
    }
  }

  function scheduleAutosave(delay = 3000) {
    clearScheduledSave()
    serverSaveTimeout = setTimeout(() => {
      void saveToServer().catch(() => undefined)
    }, delay)
  }

  function saveRecoverySnapshot(message: string) {
    if (
      options.loading.value ||
      !options.serverPublicationId.value ||
      (syncStatus.value === 'saved' && options.baselineReady.value)
    ) {
      return true
    }

    const snapshot = {
      publicationId: options.serverPublicationId.value,
      serverRevision: options.serverRevision.value,
      message,
      publication: options.publication,
      settings: options.settings,
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
    const currentPublicationId = options.serverPublicationId.value
    if (syncStatus.value === 'conflict' || !currentPublicationId) return
    if (syncStatus.value === 'syncing') {
      saveRequestedWhileSyncing = true
      return
    }

    clearScheduledSave()
    const persistedSignature = buildPersistedSignature()
    if (persistedSignature === lastSyncedSignature.value) {
      syncStatus.value = 'saved'
      return
    }

    syncStatus.value = 'syncing'
    const signatureAtSaveStart = persistedSignature

    try {
      options.publication.revision = options.serverRevision.value ?? 0
      const newRevision = await updatePublication(currentPublicationId, options.publication, options.settings)
      options.serverRevision.value = newRevision
      options.publication.revision = newRevision
      lastSyncedSignature.value = signatureAtSaveStart
      options.feedback.errorMessage.value = ''
    } catch (err) {
      const conflict = asPublicationConflict(err)
      if (conflict) {
        const draftPublicationId = conflict.publicationId ?? currentPublicationId
        conflictDraftSaved.value =
          saveConflictDraft({
            publicationId: draftPublicationId,
            serverRevision: options.serverRevision.value,
            message: conflict.message,
            publication: options.publication,
            settings: options.settings,
          }) !== null
        if (conflictDraftSaved.value) {
          clearRecoveryDraft(draftPublicationId)
          recoveryDraft.value = null
        }
        syncStatus.value = 'conflict'
        conflictMessage.value = conflict.message
        options.feedback.errorMessage.value = conflict.message
        clearScheduledSave()
        throw new Error(conflict.message, { cause: err })
      }

      syncStatus.value = 'error'
      const recoverySaved = saveRecoverySnapshot('服务器同步失败时保存的本地恢复副本')
      options.feedback.setError(
        recoverySaved ? '同步到服务器失败，本地恢复副本已保留' : '同步失败且无法保存本地副本，请立即导出 JSON 备份',
      )
      return
    }

    const hasUnsavedChanges = buildPersistedSignature() !== lastSyncedSignature.value
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

  function dispose() {
    clearScheduledSave()
  }

  return {
    syncStatus,
    conflictMessage,
    conflictDraftSaved,
    conflictDraft,
    recoveryDraft,
    lastSyncedSignature,
    buildPersistedSignature,
    clearScheduledSave,
    scheduleAutosave,
    saveRecoverySnapshot,
    saveToServer,
    dispose,
  }
}
