import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { defaultSettings, samplePublication } from '../../data/sampleFamily'
import type { PublicationData } from '../../types/family'
import { DRAFT_PACKAGE_VERSION } from '../../types/family'
import { fetchBinaryResource } from '../../api/http'
import {
  createDraftPackage,
  createPortablePublication,
  parseDraftJson,
  parseLocalDraftState,
  serializeDraftPackage,
  serializeLocalDraftState,
} from './draftPersistence'

// 草稿导出改用带鉴权的 http 客户端（裸 fetch 会 401），因此这里 mock 该客户端。
vi.mock('../../api/http', () => ({
  fetchBinaryResource: vi.fn(),
}))

describe('draft persistence', () => {
  const originalFileReader = globalThis.FileReader

  beforeEach(() => {
    class MockFileReader {
      result: string | null = null
      onloadend: (() => void) | null = null
      onerror: ((error: unknown) => void) | null = null

      readAsDataURL(blob: Blob) {
        blob
          .arrayBuffer()
          .then(buffer => {
            this.result = `data:${blob.type};base64,${Buffer.from(buffer).toString('base64')}`
            this.onloadend?.()
          })
          .catch(error => {
            this.onerror?.(error)
          })
      }
    }

    globalThis.FileReader = MockFileReader as typeof FileReader
  })

  afterEach(() => {
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

    vi.mocked(fetchBinaryResource).mockResolvedValue(new Blob(['legacy-image'], { type: 'image/png' }))

    const portablePublication = await createPortablePublication(publication)

    expect(fetchBinaryResource).toHaveBeenCalledWith('http://localhost:8080/uploads/legacy-person.png')
    expect(portablePublication.people.p1.avatarUrl).toMatch(/^data:.+;base64,.+$/)
  })

  it('keeps the original avatar url when fetching the binary resource fails', async () => {
    const publication = structuredClone(samplePublication) as PublicationData
    publication.people.p1.avatarUrl = '/api/photos/42'

    vi.mocked(fetchBinaryResource).mockRejectedValue(new Error('401 Unauthorized'))

    const portablePublication = await createPortablePublication(publication)

    expect(portablePublication.people.p1.avatarUrl).toBe('/api/photos/42')
  })
})
