import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { defaultSettings, samplePublication } from '../../data/sampleFamily'
import type { PublicationData } from '../../types/family'
import { DRAFT_PACKAGE_VERSION } from '../../types/family'
import {
  createDraftPackage,
  createPortablePublication,
  parseDraftJson,
  parseLocalDraftState,
  serializeDraftPackage,
  serializeLocalDraftState,
} from './draftPersistence'

describe('draft persistence', () => {
  const originalFetch = globalThis.fetch
  const originalFileReader = globalThis.FileReader

  beforeEach(() => {
    class MockFileReader {
      result: string | null = null
      onloadend: (() => void) | null = null
      onerror: ((error: unknown) => void) | null = null

      readAsDataURL(blob: Blob) {
        blob.arrayBuffer()
          .then((buffer) => {
            this.result = `data:${blob.type};base64,${Buffer.from(buffer).toString('base64')}`
            this.onloadend?.()
          })
          .catch((error) => {
            this.onerror?.(error)
          })
      }
    }

    globalThis.FileReader = MockFileReader as typeof FileReader
  })

  afterEach(() => {
    globalThis.fetch = originalFetch
    globalThis.FileReader = originalFileReader
    vi.restoreAllMocks()
  })

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

  it('converts legacy uploads avatar urls to base64 when exporting a portable draft', async () => {
    const publication = structuredClone(samplePublication) as PublicationData
    publication.people.p1.avatarUrl = 'http://localhost:8080/uploads/legacy-person.png'

    globalThis.fetch = vi.fn().mockResolvedValue(
      new Response(new Blob(['legacy-image'], { type: 'image/png' }), { status: 200 }),
    )

    const portablePublication = await createPortablePublication(publication)

    expect(globalThis.fetch).toHaveBeenCalledWith('http://localhost:8080/uploads/legacy-person.png')
    expect(portablePublication.people.p1.avatarUrl).toBe('data:image/png;base64,bGVnYWN5LWltYWdl')
  })
})
