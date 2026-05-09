import { beforeEach, describe, expect, it, vi } from 'vitest'

const { httpPost, tokenStore } = vi.hoisted(() => ({
  httpPost: vi.fn(),
  tokenStore: {
    token: null as string | null,
    username: null as string | null,
    role: null as string | null,
    cleared: 0,
  },
}))

vi.mock('./http', () => ({
  default: {
    post: httpPost,
  },
}))

vi.mock('./tokenStore', () => ({
  getAccessToken: vi.fn(() => tokenStore.token),
  setAccessToken: vi.fn((token: string) => {
    tokenStore.token = token
  }),
  setUsername: vi.fn((username: string) => {
    tokenStore.username = username
  }),
  setRole: vi.fn((role: string) => {
    tokenStore.role = role
  }),
  clearSession: vi.fn(() => {
    tokenStore.token = null
    tokenStore.username = null
    tokenStore.role = null
    tokenStore.cleared += 1
  }),
}))

import { bootstrapAuthSession, applyAuthenticatedSession, resetAuthBootstrapForTests } from './authSession'

beforeEach(() => {
  httpPost.mockReset()
  tokenStore.token = null
  tokenStore.username = null
  tokenStore.role = null
  tokenStore.cleared = 0
  resetAuthBootstrapForTests()
})

describe('auth session bootstrap', () => {
  it('restores a refresh-cookie session before protected route content renders', async () => {
    httpPost.mockResolvedValueOnce({
      data: {
        code: 200,
        data: {
          token: 'restored-token',
          username: 'alice',
          role: 'ADMIN',
        },
      },
    })

    await expect(bootstrapAuthSession()).resolves.toBe(true)

    expect(tokenStore.token).toBe('restored-token')
    expect(tokenStore.username).toBe('alice')
    expect(tokenStore.role).toBe('ADMIN')
    expect(tokenStore.cleared).toBe(0)
  })

  it('does not clear a token written by a successful login while startup refresh is still settling', async () => {
    let rejectRefresh!: (reason?: unknown) => void
    httpPost.mockReturnValueOnce(new Promise((_resolve, reject) => {
      rejectRefresh = reject
    }))

    const bootstrap = bootstrapAuthSession()
    applyAuthenticatedSession({
      token: 'fresh-login-token',
      username: 'alice',
      role: 'USER',
    })
    rejectRefresh(new Error('refresh expired'))

    await expect(bootstrap).resolves.toBe(false)

    expect(tokenStore.token).toBe('fresh-login-token')
    expect(tokenStore.username).toBe('alice')
    expect(tokenStore.cleared).toBe(0)
  })

  it('does not rotate the refresh token twice after bootstrap already completed', async () => {
    httpPost.mockResolvedValueOnce({
      data: {
        code: 200,
        data: {
          token: 'restored-token',
          username: 'alice',
          role: 'ADMIN',
        },
      },
    })

    await expect(bootstrapAuthSession()).resolves.toBe(true)
    await expect(bootstrapAuthSession()).resolves.toBe(true)

    expect(httpPost).toHaveBeenCalledTimes(1)
  })
})
