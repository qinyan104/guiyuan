import { request, type FullConfig } from '@playwright/test'
import { ensureTestUser, TEST_PASSWORD, TEST_USERNAME } from './helpers/auth'

export default async function globalSetup(config: FullConfig): Promise<void> {
  const baseURL = config.projects[0]?.use.baseURL ?? process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:5173'
  const requestContext = await request.newContext({ baseURL })

  try {
    await ensureTestUser(requestContext, TEST_USERNAME, TEST_PASSWORD)
  } finally {
    await requestContext.dispose()
  }
}
