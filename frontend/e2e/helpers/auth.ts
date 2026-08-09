import type { APIRequestContext, Page } from '@playwright/test'

type AuthResponse = {
  data?: {
    token?: string
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
  // Start from a real browser session. Injecting an API token bypasses the
  // in-memory auth store and races the app's refresh-cookie bootstrap.
  await page.context().clearCookies()
  await page.goto('/login')

  const form = page.locator('form.auth-form')
  await form.waitFor()
  await form.locator('input[type="text"]').fill(username)
  await form.locator('input[type="password"]').fill(password)

  const loginResponse = page.waitForResponse((response) =>
    response.url().endsWith('/api/auth/login') && response.request().method() === 'POST',
  )
  await form.locator('button[type="submit"]').click()

  const response = await loginResponse
  if (!response.ok()) {
    throw new Error(`E2E browser login failed for ${username}: ${response.status()}`)
  }

  await page.waitForURL('**/dashboard')
  await page.locator('.spatial-workspace').waitFor()

  // Login navigation consumes the browser response body before Playwright can
  // read it. Fetch a separate bearer token only for test-data setup/cleanup.
  return loginViaApi(page.request, username, password)
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
