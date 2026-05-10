import { describe, expect, it } from 'vitest'
import { asPublicationConflict } from './conflict'

describe('asPublicationConflict', () => {
  it('maps a 409 response into a typed conflict object', () => {
    const conflict = asPublicationConflict({
      response: {
        status: 409,
        data: { code: 409, message: 'Publication is stale. Reload before saving.' },
      },
      config: { method: 'put', url: '/publications/7' },
    })

    expect(conflict?.kind).toBe('publication-conflict')
    expect(conflict?.publicationId).toBe(7)
  })

  it('returns null for non-409 errors', () => {
    expect(asPublicationConflict({ response: { status: 404 } })).toBeNull()
  })

  it('returns null for non-publication URLs', () => {
    expect(asPublicationConflict({
      response: { status: 409 },
      config: { url: '/auth/login' },
    })).toBeNull()
  })

  it('returns null for malformed errors', () => {
    expect(asPublicationConflict(null)).toBeNull()
    expect(asPublicationConflict({})).toBeNull()
  })
})
