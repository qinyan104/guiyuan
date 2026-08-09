import type { APIRequestContext, Page } from '@playwright/test'

type AuthResponse = {
  data?: {
    token?: string
  }
}

type MeResponse = {
  data?: {
    data?: {
      username?: string
      role?: string
    }
  }
}

type UserListResponse = {
  data?: Array<{ id: number; username: string }>
}

type ApiOptions = {
  method?: string
  data?: Record<string, unknown>
  headers?: Record<string, string>
}

export async function loginViaApi(
  request: APIRequestContext,
  username: string,
  password: string,
): Promise<string> {
  const response = await request.post('/api/auth/login', {
    data: { username, password },
  })
  const body = JSON.parse(await response.text()) as AuthResponse
  const token = body.data?.token
  if (response.status() === 404 && username !== 'root') {
    await ensureTestUser(request, username, password)
    return loginViaApi(request, username, password)
  }
  if (!response.ok() || !token) {
    throw new Error(`E2E login failed for ${username}: ${response.status()}`)
  }
  return token
}

export async function ensureTestUser(request: APIRequestContext, username: string, password: string): Promise<void> {
  const adminToken = await loginViaApi(request, 'root', '123456')
  const listResponse = await authenticatedRequest(request, adminToken, '/api/admin/users')
  const listBody = JSON.parse(await listResponse.text()) as UserListResponse
  const exists = listBody.data?.some((user) => user.username === username)
  if (exists) return

  const createResponse = await authenticatedRequest(request, adminToken, '/api/admin/users', {
    method: 'POST',
    data: { username, password, nickname: username, role: 'USER' },
  })
  if (!createResponse.ok() && createResponse.status() !== 400) {
    throw new Error(`E2E user provisioning failed for ${username}: ${createResponse.status()}`)
  }
}

export async function loginPage(page: Page, username: string, password: string): Promise<string> {
  const token = await loginViaApi(page.request, username, password)
  await page.setExtraHTTPHeaders({ Authorization: `Bearer ${token}` })

  // The router checks the cached role before the first protected navigation.
  // Seed it from the authenticated API response so admin routes do not depend
  // on refresh/bootstrap timing in the browser.
  const meResponse = await page.request.get('/api/auth/me', {
    headers: { Authorization: `Bearer ${token}` },
  })
  const meBody = JSON.parse(await meResponse.text()) as MeResponse
  await page.addInitScript(({ storedUsername, storedRole }) => {
    try {
      if (storedUsername) localStorage.setItem('authUsername', storedUsername)
      if (storedRole) localStorage.setItem('authRole', storedRole)
    } catch {}
  }, { storedUsername: meBody.data?.data?.username ?? username, storedRole: meBody.data?.data?.role ?? '' })
  return token
}

export function authenticatedRequest(
  request: APIRequestContext,
  token: string,
  url: string,
  options: ApiOptions = {},
) {
  return request.fetch(url, {
    ...options,
    headers: {
      ...options.headers,
      Authorization: `Bearer ${token}`,
    },
  })
}
