import { afterEach, describe, expect, it, vi } from 'vitest'

import * as auth from './auth'

const originalLocalStorage = globalThis.localStorage

function createStorage(initial: Record<string, string> = {}) {
  const store = new Map(Object.entries(initial))
  return {
    getItem(key: string) {
      return store.has(key) ? store.get(key)! : null
    },
    setItem(key: string, value: string) {
      store.set(key, value)
    },
    removeItem(key: string) {
      store.delete(key)
    },
    clear() {
      store.clear()
    },
  }
}

afterEach(() => {
  vi.unstubAllGlobals()
  if (originalLocalStorage) {
    vi.stubGlobal('localStorage', originalLocalStorage)
  }
})

describe('buildAuthHeaders', () => {
  it('adds bearer token from localStorage', () => {
    vi.stubGlobal('localStorage', createStorage({ authToken: 'token-123' }))

    const buildAuthHeaders = (auth as any).buildAuthHeaders
    const headers = buildAuthHeaders({ 'Content-Type': 'application/json' })

    expect(headers).toEqual({
      'Content-Type': 'application/json',
      'Authorization': 'Bearer token-123',
    })
  })
})
