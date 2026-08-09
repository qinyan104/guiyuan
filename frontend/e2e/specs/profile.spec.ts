import { test, expect } from '@playwright/test'
import { authenticatedRequest, ensureTestUser, loginPage, loginViaApi } from '../helpers/auth'

const ADMIN_USER = 'root'
const ADMIN_PASS = '123456'
const NEW_NAME = 'E2E 测试姓名'
const PROFILE_USER = 'e2e_profile'
const PROFILE_PASS = 'E2e_Profile_123'
const NEW_PASSWORD = 'E2e_Profile_456'

test.describe('Profile / Settings', () => {
  test.beforeAll(async ({ request }) => {
    await ensureTestUser(request, PROFILE_USER, PROFILE_PASS)
  })

  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      try { localStorage.setItem('genealogy_onboarding_done', '1') } catch {}
    })
    await loginPage(page, ADMIN_USER, ADMIN_PASS)
  })

  test('should navigate to settings page', async ({ page }) => {
    await page.goto('/dashboard/settings')

    await expect(page.getByText('账户设置')).toBeVisible()
    await expect(page.getByText('账号固定不变；姓名可直接修改。')).toBeVisible()

    await expect(page.getByText('个人资料')).toBeVisible()

    await expect(page.getByText('登录密码')).toBeVisible()
  })

  test('should explain when the admin account has no linked person', async ({ page }) => {
    await page.goto('/dashboard/settings')
    await expect(page.getByText('账户设置')).toBeVisible()

    const profileSection = page.locator('.settings-card').filter({ hasText: '个人资料' })
    await expect(profileSection).toBeVisible()

    const nameInput = profileSection.locator('input[type="text"]')
    await nameInput.fill(NEW_NAME)

    await profileSection.locator('button:has-text("保存姓名")').click()

    await expect(profileSection.locator('.msg.err')).toBeVisible({ timeout: 5000 })
    await expect(profileSection.locator('.msg.err')).toContainText('当前账号未关联族谱人物')
  })

  test('should change password and verify login with new password', async ({ page }) => {
    const authToken = await loginPage(page, PROFILE_USER, PROFILE_PASS)
    let passwordChanged = false

    try {
      await page.goto('/dashboard/settings')
      await expect(page.getByText('账户设置')).toBeVisible()

      const passwordSection = page.locator('.settings-card').filter({ hasText: '登录密码' })
      await expect(passwordSection).toBeVisible()

      // Fill in password change form
      await passwordSection.locator('input[placeholder="输入当前密码"]').fill(PROFILE_PASS)
      await passwordSection.locator('input[placeholder="至少 8 个字符，含大小写和数字"]').fill(NEW_PASSWORD)
      await passwordSection.locator('input[placeholder="再次输入新密码"]').fill(NEW_PASSWORD)

      // Click "更新密码" button
      await passwordSection.locator('button:has-text("更新密码")').click()

      // Should see success message "已更新"
      await expect(passwordSection.locator('.msg.ok')).toBeVisible({ timeout: 5000 })
      await expect(passwordSection.locator('.msg.ok')).toContainText('已更新')
      passwordChanged = true

      // Verify the newly issued password can authenticate without disturbing
      // the browser session needed to restore this disposable test account.
      const refreshedToken = await loginViaApi(page.request, PROFILE_USER, NEW_PASSWORD)
      expect(refreshedToken).toBeTruthy()
    } finally {
      if (passwordChanged) {
        const restoreResponse = await authenticatedRequest(page.request, authToken, '/api/user/password', {
          method: 'PUT',
          data: { oldPassword: NEW_PASSWORD, newPassword: PROFILE_PASS },
        })
        expect(restoreResponse.ok()).toBeTruthy()
      }
    }
  })

  test('should show error when password fields do not match', async ({ page }) => {
    await page.goto('/dashboard/settings')
    await expect(page.getByText('账户设置')).toBeVisible()

    const passwordSection = page.locator('.settings-card').filter({ hasText: '登录密码' })

    // Fill mismatched passwords
    await passwordSection.locator('input[placeholder="输入当前密码"]').fill(ADMIN_PASS)
    await passwordSection.locator('input[placeholder="至少 8 个字符，含大小写和数字"]').fill('E2e_Mismatch_1')
    await passwordSection.locator('input[placeholder="再次输入新密码"]').fill('E2e_Mismatch_2')

    await passwordSection.locator('button:has-text("更新密码")').click()

    // Should see error message about mismatch
    await expect(passwordSection.locator('.msg.err')).toBeVisible({ timeout: 5000 })
    await expect(passwordSection.locator('.msg.err')).toContainText('不一致')
  })
})
