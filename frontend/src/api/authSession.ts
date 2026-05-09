import http from './http'
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
  const resp = await http.post<ApiResponse<AuthPayload>>('/auth/refresh')
  const payload = resp.data.data

  if (resp.data.code !== 200 || !payload?.token || !payload?.username) {
    throw new Error(resp.data.message || 'No refresh session')
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
