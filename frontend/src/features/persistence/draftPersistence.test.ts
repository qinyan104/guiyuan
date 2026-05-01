import { describe, expect, it } from 'vitest'

import { defaultSettings, samplePublication } from '../../data/sampleFamily'
import { DRAFT_PACKAGE_VERSION } from '../../types/family'
import {
  createDraftPackage,
  parseDraftJson,
  parseLocalDraftState,
  serializeDraftPackage,
  serializeLocalDraftState,
} from './draftPersistence'

describe('draft persistence', () => {
  it('serializes and parses a draft package', () => {
    const draft = createDraftPackage(samplePublication, defaultSettings, '2026-04-17T00:00:00.000Z')
    const parsed = parseDraftJson(serializeDraftPackage(draft))

    expect(parsed).toEqual({
      ok: true,
      value: expect.objectContaining({
        version: DRAFT_PACKAGE_VERSION,
        savedAt: '2026-04-17T00:00:00.000Z',
        publication: expect.objectContaining({ focusFamilyId: samplePublication.focusFamilyId }),
        settings: expect.objectContaining({ paper: defaultSettings.paper }),
      }),
    })
  })

  it('rejects malformed JSON with a readable issue', () => {
    expect(parseDraftJson('{broken')).toEqual({
      ok: false,
      issues: [
        {
          code: 'invalid-json',
          path: 'json',
          message: 'JSON 格式错误，无法解析。',
        },
      ],
    })
  })

  it('preserves selected person for local draft state only when the person exists', () => {
    const state = serializeLocalDraftState(samplePublication, defaultSettings, 'p3', '2026-04-17T00:00:00.000Z')
    const parsed = parseLocalDraftState(state)

    expect(parsed).toEqual({
      ok: true,
      value: expect.objectContaining({
        selectedPersonId: 'p3',
      }),
    })
  })
})
