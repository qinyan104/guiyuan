import type { PublicationData, PublicationSettings } from '../../types/family'

const STORAGE_PREFIX = 'guiyuan:conflict-draft:'

export interface ConflictDraft {
  publicationId: number
  serverRevision: number | null
  message: string
  savedAt: string
  publication: PublicationData
  settings: PublicationSettings
}

function storageKey(publicationId: number): string {
  return `${STORAGE_PREFIX}${publicationId}`
}

export function saveConflictDraft(input: Omit<ConflictDraft, 'savedAt'>): ConflictDraft | null {
  try {
    const draft: ConflictDraft = {
      ...input,
      savedAt: new Date().toISOString(),
      publication: JSON.parse(JSON.stringify(input.publication)) as PublicationData,
      settings: JSON.parse(JSON.stringify(input.settings)) as PublicationSettings,
    }
    localStorage.setItem(storageKey(input.publicationId), JSON.stringify(draft))
    return draft
  } catch {
    return null
  }
}

export function getConflictDraft(publicationId: number): ConflictDraft | null {
  try {
    const raw = localStorage.getItem(storageKey(publicationId))
    return raw ? JSON.parse(raw) as ConflictDraft : null
  } catch {
    return null
  }
}

export function clearConflictDraft(publicationId: number): void {
  try {
    localStorage.removeItem(storageKey(publicationId))
  } catch {
    // localStorage can be unavailable in restricted browsing modes.
  }
}
