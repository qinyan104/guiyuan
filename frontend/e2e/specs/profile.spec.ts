import { test, expect } from '@playwright/test'

const ADMIN_USER = 'root'
const ADMIN_PASS = '123456'
const NEW_NICKNAME = 'E2E 测试昵称'
const NEW_PASSWORD = 'e2e_new_pass_456'

test.describe('Profile / Settings', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      try { localStorage.setItem('genealogy_onboarding_done', '1') } catch {}
    })
    await page.request.post('/api/auth/login', {
      data: { username: ADMIN_USER, password: ADMIN_PASS },
    })
    await page.goto('/')
    await page.waitForURL(/\/$|\/dashboard/)
  })

  test('should navigate to settings page', async ({ page }) => {
    await page.goto('/dashboard/settings')

    // Should see the settings hero header
    await expect(page.getByText('偏好设置')).toBeVisible()
    await expect(page.getByText('管理账户与系统配置')).toBeVisible()

    // Should see the nickname section
    await expect(page.getByText('身份标识')).toBeVisible()

    // Should see the password section
    await expect(page.getByText('通行密钥')).toBeVisible()
  })

  test('should change nickname and see success message', async ({ page }) => {
    await page.goto('/dashboard/settings')
    await expect(page.getByText('偏好设置')).toBeVisible()

    // Find the nickname card section
    const nicknameSection = page.locator('.card').filter({ hasText: '身份标识' })
    await expect(nicknameSection).toBeVisible()

    // Fill in new nickname
    const nicknameInput = nicknameSection.locator('input[type="text"]')
    await nicknameInput.fill(NEW_NICKNAME)

    // Click "保存" button
    await nicknameSection.locator('button:has-text("保存")').click()

    // Should see success message "已更新"
    await expect(nicknameSection.locator('.msg.ok')).toBeVisible({ timeout: 5000 })
    await expect(nicknameSection.locator('.msg.ok')).toContainText('已更新')

    // Cleanup: reset nickname to empty (restore default)
    await nicknameInput.fill('')
    await nicknameSection.locator('button:has-text("保存")').click()
    await expect(nicknameSection.locator('.msg.ok')).toBeVisible({ timeout: 5000 })
  })

  test('should change password and verify login with new password', async ({ page }) => {
    await page.goto('/dashboard/settings')
    await expect(page.getByText('偏好设置')).toBeVisible()

    // Find the password card section
    const passwordSection = page.locator('.card').filter({ hasText: '通行密钥' })
    await expect(passwordSection).toBeVisible()

    // Fill in password change form
    await passwordSection.locator('input[placeholder="当前密码"]').fill(ADMIN_PASS)
    await passwordSection.locator('input[placeholder="新密码"]').fill(NEW_PASSWORD)
    await passwordSection.locator('input[placeholder="确认新密码"]').fill(NEW_PASSWORD)

    // Click "更新密码" button
    await passwordSection.locator('button:has-text("更新密码")').click()

    // Should see success message "已更新"
    await expect(passwordSection.locator('.msg.ok')).toBeVisible({ timeout: 5000 })
    await expect(passwordSection.locator('.msg.ok')).toContainText('已更新')

    // Now logout and verify we can login with the new password
    await page.goto('/login')
    await page.evaluate(() => localStorage.clear())
    await page.context().clearCookies()

    // Re-navigate to login (will be redirected since auth cleared)
    await page.goto('/login')
    await expect(page.locator('form.auth-form')).toBeVisible()

    // Login with new password
    const usernameInput = page.locator('form .input-group').filter({ hasText: '账号' }).locator('input')
    const passwordInput = page.locator('form .input-group').filter({ hasText: '密码' }).locator('input')
    await usernameInput.fill(ADMIN_USER)
    await passwordInput.fill(NEW_PASSWORD)
    await page.locator('button.submit-btn').click()

    // Should redirect to dashboard after login
    await page.waitForURL(/\/$|\/dashboard/)
    await expect(page.locator('.spatial-workspace')).toBeVisible()

    // Reset password back to original
    await page.goto('/dashboard/settings')
    await expect(page.getByText('偏好设置')).toBeVisible()

    const resetPasswordSection = page.locator('.card').filter({ hasText: '通行密钥' })
    await resetPasswordSection.locator('input[placeholder="当前密码"]').fill(NEW_PASSWORD)
    await resetPasswordSection.locator('input[placeholder="新密码"]').fill(ADMIN_PASS)
    await resetPasswordSection.locator('input[placeholder="确认新密码"]').fill(ADMIN_PASS)
    await resetPasswordSection.locator('button:has-text("更新密码")').click()

    // Verify password was reset
    await expect(resetPasswordSection.locator('.msg.ok')).toBeVisible({ timeout: 5000 })
    await expect(resetPasswordSection.locator('.msg.ok')).toContainText('已更新')
  })

  test('should show error when password fields do not match', async ({ page }) => {
    await page.goto('/dashboard/settings')
    await expect(page.getByText('偏好设置')).toBeVisible()

    const passwordSection = page.locator('.card').filter({ hasText: '通行密钥' })

    // Fill mismatched passwords
    await passwordSection.locator('input[placeholder="当前密码"]').fill(ADMIN_PASS)
    await passwordSection.locator('input[placeholder="新密码"]').fill('new_pass_1')
    await passwordSection.locator('input[placeholder="确认新密码"]').fill('new_pass_2')

    await passwordSection.locator('button:has-text("更新密码")').click()

    // Should see error message about mismatch
    await expect(passwordSection.locator('.msg.err')).toBeVisible({ timeout: 5000 })
    await expect(passwordSection.locator('.msg.err')).toContainText('不一致')
  })
})
