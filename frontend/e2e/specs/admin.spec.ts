import { test, expect } from '@playwright/test'

const ADMIN_USER = 'root'
const ADMIN_PASS = '123456'
const NEW_USERNAME = 'e2e_admin_test_user'
const NEW_PASSWORD = 'admin_test_pass'
const NEW_NICKNAME = '测试协修'

test.describe('Admin User Management', () => {
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

  /** Helper: clean up the test user via API if it exists */
  async function cleanupTestUser(request: any) {
    await request.post('/api/auth/login', {
      data: { username: ADMIN_USER, password: ADMIN_PASS },
    })
    const listResp = await request.get('/api/admin/users')
    const listBody = await listResp.json()
    if (listBody.code === 200 && Array.isArray(listBody.data)) {
      const found = listBody.data.find((u: any) => u.username === NEW_USERNAME)
      if (found) {
        await request.delete(`/api/admin/users/${found.id}`).catch(() => {})
      }
    }
  }

  test.beforeAll(async ({ request }) => {
    await cleanupTestUser(request)
  })

  test.afterAll(async ({ request }) => {
    await cleanupTestUser(request)
  })

  test('should navigate to admin users page and see user list', async ({ page }) => {
    await page.goto('/dashboard/admin/users')

    // Should see the admin users view
    await expect(page.locator('.admin-users-view-root')).toBeVisible()

    // Should see the header with user management title
    await expect(page.getByText('添加编委')).toBeVisible()

    // Should see the data table with at least one row
    await expect(page.locator('.table-card')).toBeVisible({ timeout: 10000 })
    await expect(page.locator('.table-row').first()).toBeVisible()

    // Should see role tabs
    await expect(page.locator('.glass-tab').first()).toBeVisible()
  })

  test('should create a new user and verify it appears in the list', async ({ page }) => {
    await page.goto('/dashboard/admin/users')
    await expect(page.locator('.admin-users-view-root')).toBeVisible()
    await expect(page.locator('.table-card')).toBeVisible({ timeout: 10000 })

    // Click "添加编委" button to open the create form
    await page.locator('button:has-text("添加编委")').click()
    await expect(page.locator('.create-form')).toBeVisible()

    // Fill in the create user form
    const createForm = page.locator('.create-form')
    await createForm.locator('input[placeholder="输入登录账号"]').fill(NEW_USERNAME)
    await createForm.locator('input[placeholder="设置初始密码"]').fill(NEW_PASSWORD)
    await createForm.locator('input[placeholder="选填"]').fill(NEW_NICKNAME)

    // Click "确认创建"
    await createForm.locator('button:has-text("确认创建")').click()

    // The form should close
    await expect(page.locator('.create-form')).not.toBeVisible({ timeout: 5000 })

    // Wait for the table to refresh and verify the new user appears
    await expect(page.locator('.table-row').filter({ hasText: NEW_USERNAME })).toBeVisible({ timeout: 10000 })

    // Verify nickname is also shown
    await expect(page.locator('.table-row').filter({ hasText: NEW_USERNAME }).locator('.unick')).toContainText(NEW_NICKNAME)
  })

  test('should delete a user and verify it is removed', async ({ page }) => {
    // Ensure the test user exists before attempting to delete
    const createResp = await page.request.post('/api/admin/users', {
      data: { username: NEW_USERNAME, password: NEW_PASSWORD, nickname: NEW_NICKNAME, role: 'USER' },
    }).catch(() => null)

    await page.goto('/dashboard/admin/users')
    await expect(page.locator('.admin-users-view-root')).toBeVisible()
    await expect(page.locator('.table-card')).toBeVisible({ timeout: 10000 })

    // Find the row for our test user
    const userRow = page.locator('.table-row').filter({ hasText: NEW_USERNAME })
    await expect(userRow).toBeVisible({ timeout: 10000 })

    // Click the delete button (icon-btn danger) on that row
    await userRow.locator('button.icon-btn.danger').click()

    // A confirmation dialog should appear
    await expect(page.locator('.glass-dialog-overlay')).toBeVisible({ timeout: 5000 })
    await expect(page.getByText('确认删除编委')).toBeVisible()

    // Click "确认删除"
    await page.locator('.glass-dialog button:has-text("确认删除")').click()

    // The dialog should close
    await expect(page.locator('.glass-dialog-overlay')).not.toBeVisible({ timeout: 5000 })

    // Verify the user is no longer in the list
    await expect(page.locator('.table-row').filter({ hasText: NEW_USERNAME })).not.toBeVisible({ timeout: 10000 })
  })
})
