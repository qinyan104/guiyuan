import { defineConfig } from '@playwright/test'

// 完全模拟服务，不启动后端，也不访问真实资料。
// 通过 npm run test:e2e:photos 运行；默认 e2e 配置会忽略这些用例，
// 避免它们在后端联调任务里以错误的 baseURL 运行。
export default defineConfig({
  testDir: './specs',
  testMatch: 'person-photos*.spec.ts',
  use: { baseURL: 'http://localhost:5179' },
  webServer: {
    command: 'npm run dev -- --host localhost --port 5179 --strictPort',
    url: 'http://localhost:5179',
    reuseExistingServer: false,
  },
})
