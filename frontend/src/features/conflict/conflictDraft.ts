import type { PublicationData, PublicationSettings } from '../../types/family'

const CONFLICT_STORAGE_PREFIX = 'guiyuan:conflict-draft:'
const RECOVERY_STORAGE_PREFIX = 'guiyuan:recovery-draft:'

export interface ConflictDraft {
  publicationId: number
  serverRevision: number | null
  message: string
  savedAt: string
  publication: PublicationData
  settings: PublicationSettings
}

export type RecoveryDraft = ConflictDraft

function storageKey(prefix: string, publicationId: number): string {
  return `${prefix}${publicationId}`
}

function saveDraft(prefix: string, input: Omit<ConflictDraft, 'savedAt'>): ConflictDraft | null {
  try {
    const draft: ConflictDraft = {
      ...input,
      savedAt: new Date().toISOString(),
      publication: JSON.parse(JSON.stringify(input.publication)) as PublicationData,
      settings: JSON.parse(JSON.stringify(input.settings)) as PublicationSettings,
    }
    localStorage.setItem(storageKey(prefix, input.publicationId), JSON.stringify(draft))
    return draft
  } catch {
    return null
  }
}

function getDraft(prefix: string, publicationId: number): ConflictDraft | null {
  try {
    const raw = localStorage.getItem(storageKey(prefix, publicationId))
    if (!raw) return null
    const draft = JSON.parse(raw) as Partial<ConflictDraft>
    return draft.publicationId === publicationId && draft.publication && draft.settings && draft.savedAt
      ? draft as ConflictDraft
      : null
  } catch {
    return null
  }
}

function clearDraft(prefix: string, publicationId: number): void {
  try {
    localStorage.removeItem(storageKey(prefix, publicationId))
  } catch {
    // localStorage can be unavailable in restricted browsing modes.
  }
}

export const saveConflictDraft = (input: Omit<ConflictDraft, 'savedAt'>) => saveDraft(CONFLICT_STORAGE_PREFIX, input)
export const getConflictDraft = (publicationId: number) => getDraft(CONFLICT_STORAGE_PREFIX, publicationId)
export const clearConflictDraft = (publicationId: number) => clearDraft(CONFLICT_STORAGE_PREFIX, publicationId)

export const saveRecoveryDraft = (input: Omit<RecoveryDraft, 'savedAt'>) => saveDraft(RECOVERY_STORAGE_PREFIX, input)
export const getRecoveryDraft = (publicationId: number) => getDraft(RECOVERY_STORAGE_PREFIX, publicationId)
export const clearRecoveryDraft = (publicationId: number) => clearDraft(RECOVERY_STORAGE_PREFIX, publicationId)
