import type { APIRequestContext, APIResponse, Page } from '@playwright/test'

type AuthResponse = {
  data?: {
    token?: string
  }
}

type UserListResponse = {
  data?: {
    items?: Array<{ id: number; username: string }>
  }
}

type ApiOptions = {
  method?: string
  data?: Record<string, unknown>
  headers?: Record<string, string>
}

export const TEST_USERNAME = process.env.E2E_USERNAME ?? 'e2e_test'
export const TEST_PASSWORD = process.env.E2E_PASSWORD ?? 'E2e_Test_123'

const E2E_API_BASE_URL = process.env.E2E_API_BASE_URL?.replace(/\/$/, '')

function resolveApiUrl(url: string): string {
  if (!E2E_API_BASE_URL || !url.startsWith('/api')) return url
  const path = E2E_API_BASE_URL.endsWith('/api') ? url.slice('/api'.length) : url
  return `${E2E_API_BASE_URL}${path}`
}

async function readResponseJson<T>(response: APIResponse, stage: string, username: string): Promise<T> {
  const text = await response.text()
  if (!response.ok()) {
    const detail = text.trim() ? `: ${text}` : ''
    throw new Error(`E2E user provisioning failed during ${stage} for ${username}: HTTP ${response.status()}${detail}`)
  }
  try {
    return JSON.parse(text) as T
  } catch {
    throw new Error(
      `E2E user provisioning failed during ${stage} for ${username}: HTTP ${response.status()} returned invalid JSON`,
    )
  }
}

async function requireSuccessfulResponse(
  response: APIResponse,
  stage: string,
  username: string,
): Promise<void> {
  const text = await response.text()
  if (!response.ok()) {
    const detail = text.trim() ? `: ${text}` : ''
    throw new Error(`E2E user provisioning failed during ${stage} for ${username}: HTTP ${response.status()}${detail}`)
  }
}

export async function loginViaApi(
  request: APIRequestContext,
  username: string,
  password: string,
): Promise<string> {
  const response = await request.post(resolveApiUrl('/api/auth/login'), {
    data: { username, password },
  })
  const text = await response.text()
  let body: AuthResponse = {}
  try {
    body = JSON.parse(text) as AuthResponse
  } catch {
    // The status-aware error below is more useful than a raw JSON parse error.
  }
  const token = body.data?.token
  if (!response.ok() || !token) {
    throw new Error(`E2E login failed for ${username}: HTTP ${response.status()}`)
  }
  return token
}

export async function ensureTestUser(
  request: APIRequestContext,
  username: string,
  password: string,
): Promise<void> {
  if (username === 'root') {
    await loginViaApi(request, username, password)
    return
  }

  const adminToken = await loginViaApi(request, 'root', '123456')
  const listResponse = await authenticatedRequest(
    request,
    adminToken,
    `/api/admin/users?query=${encodeURIComponent(username)}&size=100`,
  )
  const listBody = await readResponseJson<UserListResponse>(listResponse, 'listing users', username)
  const existingUser = listBody.data?.items?.find((user) => user.username === username)

  if (existingUser) {
    const resetResponse = await authenticatedRequest(
      request,
      adminToken,
      `/api/admin/users/${existingUser.id}/password`,
      {
        method: 'PUT',
        data: { newPassword: password },
      },
    )
    await requireSuccessfulResponse(resetResponse, 'resetting password', username)
  } else {
    const createResponse = await authenticatedRequest(request, adminToken, '/api/admin/users', {
      method: 'POST',
      data: { username, password, nickname: username, role: 'USER' },
    })
    await requireSuccessfulResponse(createResponse, 'creating user', username)
  }

  try {
    await loginViaApi(request, username, password)
  } catch (error) {
    throw new Error(`E2E user provisioning failed during credential verification for ${username}`, { cause: error })
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
  return request.fetch(resolveApiUrl(url), {
    ...options,
    headers: {
      ...options.headers,
      Authorization: `Bearer ${token}`,
    },
  })
}
