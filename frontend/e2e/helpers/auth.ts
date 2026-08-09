import type { APIRequestContext, Page } from '@playwright/test'

type AuthResponse = {
  data?: {
    token?: string
  }
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
  if (!response.ok() || !token) {
    throw new Error(`E2E login failed for ${username}: ${response.status()}`)
  }
  return token
}

export async function loginPage(page: Page, username: string, password: string): Promise<string> {
  const token = await loginViaApi(page.request, username, password)
  await page.setExtraHTTPHeaders({ Authorization: `Bearer ${token}` })
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
