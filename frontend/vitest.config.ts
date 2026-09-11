import { defineConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  test: {
    environment: 'jsdom',
    include: ['src/**/*.test.ts'],
    setupFiles: ['src/test-setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text-summary', 'lcov'],
      reportsDirectory: 'coverage',
      include: ['src/**/*.{ts,vue}'],
      exclude: [
        'src/**/*.test.ts',
        'src/test-setup.ts',
        'src/**/*.d.ts',
        'src/types/**',
        'src/data/**',
        'src/main.ts',
      ],
      thresholds: {
        // 以 2026-09-11 实测基线（stmt/branch/line ≈ 72.5%，func ≈ 52.7%）下调约 1.5pt 作为回归门禁：
        // 覆盖率只允许升，不允许降。真正提高门槛时请同步更新这里的数字。
        statements: 71,
        branches: 71,
        functions: 50,
        lines: 71,
      },
    },
  },
})
