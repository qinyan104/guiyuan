import http, { unwrapApiResponse } from './http'
import type { ApiResponse } from '../types/api'
import { clearSession, getAccessToken, setAccessToken, setRole, setUsername } from './tokenStore'

interface AuthPayload {
  token: string
  username: string
  role?: string
}

let bootstrapPromise: Promise<boolean> | null = null
let hasBootstrapped = false

export function applyAuthenticatedSession(payload: AuthPayload): void {
  setAccessToken(payload.token)
  setUsername(payload.username)
  if (payload.role) {
    setRole(payload.role)
  }
  hasBootstrapped = true
}

export async function refreshAuthenticatedSession(): Promise<boolean> {
  const payload = await unwrapApiResponse(http.post<ApiResponse<AuthPayload>>('/auth/refresh'))
  if (!payload?.token || !payload?.username) {
    throw new Error('刷新登录状态失败')
  }

  applyAuthenticatedSession(payload)
  return true
}

export function bootstrapAuthSession(): Promise<boolean> {
  if (hasBootstrapped) {
    return Promise.resolve(!!getAccessToken())
  }

  if (bootstrapPromise) {
    return bootstrapPromise
  }

  const tokenAtStart = getAccessToken()
  bootstrapPromise = refreshAuthenticatedSession()
    .catch(() => {
      if (getAccessToken() === tokenAtStart) {
        clearSession()
      }
      return false
    })
    .finally(() => {
      hasBootstrapped = true
      bootstrapPromise = null
    })

  return bootstrapPromise
}

export function resetAuthBootstrapForTests(): void {
  bootstrapPromise = null
  hasBootstrapped = false
}
