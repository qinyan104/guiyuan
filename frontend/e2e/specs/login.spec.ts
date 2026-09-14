import { test, expect } from '@playwright/test'
import { TEST_PASSWORD, TEST_USERNAME } from '../helpers/auth'

// Dismiss the onboarding guide overlay that blocks clicks
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    try { localStorage.setItem('genealogy_onboarding_done', '1') } catch {}
  })
})

test.describe('Login Flow', () => {
  test('should show login page and log in with valid credentials', async ({ page }) => {
    await page.goto('/login')

    // Should see login form
    await expect(page.locator('form.auth-form')).toBeVisible()
    await expect(page.getByText('欢迎回来')).toBeVisible()

    // Fill credentials and submit
    const usernameInput = page.locator('form .input-group').filter({ hasText: '账号' }).locator('input')
    const passwordInput = page.locator('form .input-group').filter({ hasText: '密码' }).locator('input')

    await usernameInput.fill(TEST_USERNAME)
    await passwordInput.fill(TEST_PASSWORD)
    await page.locator('button.submit-btn').click()

    // Should redirect to dashboard after login
    await page.waitForURL(/\/$|\/dashboard/)
    await expect(page.locator('.spatial-workspace')).toBeVisible()
  })

  test('should reject invalid credentials', async ({ page }) => {
    await page.goto('/login')
    await expect(page.locator('form.auth-form')).toBeVisible()

    const usernameInput = page.locator('form .input-group').filter({ hasText: '账号' }).locator('input')
    const passwordInput = page.locator('form .input-group').filter({ hasText: '密码' }).locator('input')

    await usernameInput.fill('wrong_user')
    await passwordInput.fill('wrong_pass')
    await page.locator('button.submit-btn').click()

    // Should see error message
    await expect(page.locator('.error-banner')).toBeVisible()
    // Should still be on login page
    await expect(page).toHaveURL(/\/login/)
  })

  test('should allow logout from user dropdown', async ({ page }) => {
    // Login first
    await page.goto('/login')
    const usernameInput = page.locator('form .input-group').filter({ hasText: '账号' }).locator('input')
    const passwordInput = page.locator('form .input-group').filter({ hasText: '密码' }).locator('input')
    await usernameInput.fill(TEST_USERNAME)
    await passwordInput.fill(TEST_PASSWORD)
    await page.locator('button.submit-btn').click()
    await page.waitForURL(/\/$|\/dashboard/)

    // Click user dropdown to open
    await page.locator('.user-profile-pill').click()
    await expect(page.locator('.user-popover')).toBeVisible()

    // Click logout
    await page.locator('.menu-item.danger').click()

    // Should redirect to login page
    await page.waitForURL(/\/login/)
    await expect(page.locator('form.auth-form')).toBeVisible()
  })

  test('should redirect to login when accessing protected page unauthenticated', async ({ page }) => {
    // Clear any existing auth state — both localStorage and cookies
    await page.goto('/login')
    await page.evaluate(() => localStorage.clear())
    await page.context().clearCookies()

    // Try accessing protected page
    await page.goto('/dashboard/publications')
    await page.waitForURL(/\/login/)
    await expect(page.locator('form.auth-form')).toBeVisible()
  })
})
