import { beforeEach, describe, expect, it } from 'vitest'
import { clearConflictDraft, getConflictDraft, saveConflictDraft } from './conflictDraft'
import { defaultSettings } from '../../data/sampleFamily'

describe('conflictDraft', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('stores the local unsynced publication snapshot for a conflicted save', () => {
    saveConflictDraft({
      publicationId: 7,
      serverRevision: 5,
      message: 'Publication is stale.',
      publication: {
        title: 'Local title',
        subtitle: '',
        focusFamilyId: '',
        people: {},
        families: {},
      },
      settings: defaultSettings,
    })

    const draft = getConflictDraft(7)

    expect(draft?.publication.title).toBe('Local title')
    expect(draft?.serverRevision).toBe(5)
    expect(draft?.message).toBe('Publication is stale.')
    expect(draft?.savedAt).toEqual(expect.any(String))
  })

  it('clears only the selected publication draft', () => {
    saveConflictDraft({
      publicationId: 7,
      serverRevision: 5,
      message: 'Publication 7 conflicted.',
      publication: {
        title: 'Seven',
        subtitle: '',
        focusFamilyId: '',
        people: {},
        families: {},
      },
      settings: defaultSettings,
    })
    saveConflictDraft({
      publicationId: 8,
      serverRevision: 2,
      message: 'Publication 8 conflicted.',
      publication: {
        title: 'Eight',
        subtitle: '',
        focusFamilyId: '',
        people: {},
        families: {},
      },
      settings: defaultSettings,
    })

    clearConflictDraft(7)

    expect(getConflictDraft(7)).toBeNull()
    expect(getConflictDraft(8)?.publication.title).toBe('Eight')
  })
})
