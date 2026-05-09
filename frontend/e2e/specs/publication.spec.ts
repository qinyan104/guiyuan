import { test, expect } from '@playwright/test'

const TEST_USER = process.env.E2E_USERNAME || 'e2e_test'
const TEST_PASS = process.env.E2E_PASSWORD || 'test1234'

const PUB_TITLE = 'E2E 测试族谱'
const PUB_SUBTITLE = '丙午年自动化测试版'
const PUB_EDITED_TITLE = 'E2E 测试族谱 - 已编辑'

test.describe('Publication CRUD', () => {
  test.beforeEach(async ({ page }) => {
    // Dismiss onboarding overlay and authenticate via API in one init script
    await page.addInitScript(() => {
      try { localStorage.setItem('genealogy_onboarding_done', '1') } catch {}
    })

    // Log in via API — cookies (refresh_token, XSRF-TOKEN) are set in browser context
    await page.request.post('/api/auth/login', {
      data: { username: TEST_USER, password: TEST_PASS },
    })

    // Navigate to app — the router's bootstrapAuthSession picks up the refresh_token cookie
    await page.goto('/')
    // Should land on dashboard (authenticated)
    await page.waitForURL(/\/$|\/dashboard/)
  })

  test('should create a new publication and redirect to workbench', async ({ page }) => {
    await page.goto('/publications')
    await expect(page.locator('.publication-list-view-root')).toBeVisible()

    // Click "新建宗谱存档" button
    await page.locator('button:has-text("新建宗谱存档")').click()
    await expect(page.locator('.glass-sheet')).toBeVisible()
    await expect(page.getByText('开宗立派')).toBeVisible()

    // Fill in title and subtitle
    await page.locator('input[placeholder="例: 陇西李氏世系图"]').fill(PUB_TITLE)
    await page.locator('input[placeholder="例: 丙午年重修版"]').fill(PUB_SUBTITLE)

    // Click "建档立案"
    await page.locator('button:has-text("建档立案")').click()

    // Should redirect to workbench
    await page.waitForURL(/\/publication\/\d+$/)
    await expect(page.locator('.app-shell')).toBeVisible()
  })

  test('should show created publication in the list', async ({ page }) => {
    // First, ensure we have a publication to see
    await page.goto('/publications')
    await expect(page.locator('.publication-list-view-root')).toBeVisible()

    // Check if our test publication exists, create it if not
    const existing = page.locator('.archive-title')
    const count = await existing.count()
    let found = false
    for (let i = 0; i < count; i++) {
      const text = await existing.nth(i).textContent()
      if (text?.includes(PUB_TITLE)) {
        found = true
        break
      }
    }

    if (!found) {
      // Create publication
      await page.locator('button:has-text("新建宗谱存档")').click()
      await page.locator('input[placeholder="例: 陇西李氏世系图"]').fill(PUB_TITLE)
      await page.locator('input[placeholder="例: 丙午年重修版"]').fill(PUB_SUBTITLE)
      await page.locator('button:has-text("建档立案")').click()
      await page.waitForURL(/\/publication\/\d+$/)

      // Navigate back to publications list via sidebar
      await page.locator('button.nav-item').filter({ hasText: '馆藏谱目' }).click()
      await page.waitForURL('/publications')
    }

    // Should see the publication in the list
    const titleCard = page.locator('.archive-title').filter({ hasText: PUB_TITLE })
    await expect(titleCard).toBeVisible()
  })

  test('should edit publication metadata', async ({ page }) => {
    await page.goto('/publications')
    await expect(page.locator('.publication-list-view-root')).toBeVisible()

    // Create publication if needed
    const existingBefore = page.locator('.archive-title').filter({ hasText: PUB_TITLE })
    if (await existingBefore.count() === 0) {
      await page.locator('button:has-text("新建宗谱存档")').click()
      await page.locator('input[placeholder="例: 陇西李氏世系图"]').fill(PUB_TITLE)
      await page.locator('input[placeholder="例: 丙午年重修版"]').fill(PUB_SUBTITLE)
      await page.locator('button:has-text("建档立案")').click()
      await page.waitForURL(/\/publication\/\d+$/)
      await page.locator('button.nav-item').filter({ hasText: '馆藏谱目' }).click()
      await page.waitForURL('/publications')
    }

    // Click the edit button (pencil icon) on the archive card
    const pubCard = page.locator('.archive-card').filter({ hasText: PUB_TITLE })
    await pubCard.locator('button[title="编辑属性"]').click()
    await expect(page.locator('.glass-sheet')).toBeVisible()
    await expect(page.getByText('修缮档案属性')).toBeVisible()

    // Edit the title
    const titleInput = page.locator('.glass-sheet input').first()
    await titleInput.fill(PUB_EDITED_TITLE)

    // Save
    await page.locator('button:has-text("封装保存")').click()

    // Dialog should close and list refreshes
    await expect(page.locator('.glass-sheet')).not.toBeVisible()
    await expect(page.locator('.archive-title').filter({ hasText: PUB_EDITED_TITLE })).toBeVisible()
  })

  test('should open workbench for a publication', async ({ page }) => {
    await page.goto('/publications')

    // Find the publication card and click it
    const pubCard = page.locator('.archive-card').filter({ hasText: PUB_EDITED_TITLE })
    const exists = await pubCard.count()

    // Use whichever title exists
    const targetCard = exists > 0
      ? pubCard
      : page.locator('.archive-card').filter({ hasText: PUB_TITLE })

    if (await targetCard.count() === 0) {
      test.skip('No test publication found — create one manually first')
      return
    }

    // Click the card body (not the action buttons) to open workbench
    await targetCard.click()
    await page.waitForURL(/\/publication\/\d+$/)
    await expect(page.locator('.app-shell')).toBeVisible()
  })

  test('should delete a publication', async ({ page }) => {
    await page.goto('/publications')

    // Find the publication card
    const pubCard = page.locator('.archive-card').filter({ hasText: PUB_EDITED_TITLE })
    const exists = await pubCard.count()

    const targetCard = exists > 0
      ? pubCard
      : page.locator('.archive-card').filter({ hasText: PUB_TITLE })

    if (await targetCard.count() === 0) {
      test.skip('No test publication found to delete')
      return
    }

    // Click delete button
    await targetCard.locator('button[title="焚毁档案"]').click()
    await expect(targetCard.locator('.delete-overlay')).toBeVisible()

    // Confirm deletion
    await targetCard.locator('button:has-text("确认焚毁")').click()

    // Wait for card to disappear
    await expect(targetCard).not.toBeVisible()
  })
})
