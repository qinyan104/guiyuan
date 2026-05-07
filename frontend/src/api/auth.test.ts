import { afterEach, describe, expect, it } from 'vitest'

import { buildAuthHeaders } from './auth'
import { setAccessToken, clearAccessToken } from './tokenStore'

afterEach(() => {
  clearAccessToken()
})

describe('buildAuthHeaders', () => {
  it('adds bearer token from in-memory token store', () => {
    setAccessToken('token-123')

    const headers = buildAuthHeaders({ 'Content-Type': 'application/json' })

    expect(headers).toEqual({
      'Content-Type': 'application/json',
      'Authorization': 'Bearer token-123',
    })
  })

  it('returns headers unchanged when no token is set', () => {
    clearAccessToken()

    const headers = buildAuthHeaders({ 'Content-Type': 'application/json' })

    expect(headers).toEqual({
      'Content-Type': 'application/json',
    })
  })
})
