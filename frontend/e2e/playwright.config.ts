import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './specs',
  // 这组用例自带隔离服务与端口，由 e2e/person-photos.config.ts 运行。
  testIgnore: 'person-photos*.spec.ts',
  globalSetup: './global-setup.ts',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: process.env.CI ? 'github' : 'list',
  timeout: 30_000,
  expect: {
    timeout: 10_000,
  },
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:5173',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
})
