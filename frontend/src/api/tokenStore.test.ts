import { beforeEach, describe, expect, it, vi } from 'vitest'

async function loadTokenStore() {
  vi.resetModules()
  return import('./tokenStore')
}

beforeEach(() => {
  localStorage.clear()
  vi.resetModules()
})

describe('tokenStore', () => {
  it('keeps access tokens in memory only', async () => {
    const { getAccessToken, setAccessToken } = await loadTokenStore()

    setAccessToken('access-token-123')

    expect(getAccessToken()).toBe('access-token-123')
    expect(localStorage.getItem('authToken')).toBeNull()
  })

  it('removes legacy localStorage access tokens on module load', async () => {
    localStorage.setItem('authToken', 'legacy-token')

    const { getAccessToken } = await loadTokenStore()

    expect(getAccessToken()).toBeNull()
    expect(localStorage.getItem('authToken')).toBeNull()
  })

  it('continues to persist non-secret display session fields', async () => {
    const { getRole, getUsername, setRole, setUsername } = await loadTokenStore()

    setUsername('alice')
    setRole('ADMIN')

    expect(getUsername()).toBe('alice')
    expect(getRole()).toBe('ADMIN')
    expect(localStorage.getItem('authUsername')).toBe('alice')
    expect(localStorage.getItem('authRole')).toBe('ADMIN')
  })

  it('clears all session fields without restoring stale access tokens', async () => {
    const { clearSession, getAccessToken, getRole, getUsername, setAccessToken, setRole, setUsername } =
      await loadTokenStore()

    setAccessToken('access-token-123')
    setUsername('alice')
    setRole('ADMIN')
    localStorage.setItem('authToken', 'legacy-token')

    clearSession()

    expect(getAccessToken()).toBeNull()
    expect(getUsername()).toBeNull()
    expect(getRole()).toBeNull()
    expect(localStorage.getItem('authToken')).toBeNull()
    expect(localStorage.getItem('authUsername')).toBeNull()
    expect(localStorage.getItem('authRole')).toBeNull()
  })

  it('isolates throwing session listeners and still completes session cleanup', async () => {
    const { clearSession, getAccessToken, onSessionCleared, setAccessToken, setUsername } = await loadTokenStore()

    const reached: string[] = []
    const offThrowing = onSessionCleared(() => {
      reached.push('throwing')
      throw new Error('listener failed')
    })
    const offHealthy = onSessionCleared(() => reached.push('healthy'))
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    try {
      setAccessToken('access-token-123')
      setUsername('alice')

      expect(() => clearSession()).not.toThrow()

      expect(reached).toEqual(['throwing', 'healthy'])
      expect(getAccessToken()).toBeNull()
      expect(localStorage.getItem('authUsername')).toBeNull()
    } finally {
      errorSpy.mockRestore()
      offThrowing()
      offHealthy()
    }
  })
})
