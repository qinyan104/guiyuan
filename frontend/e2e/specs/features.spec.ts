import { test, expect } from '@playwright/test'

const TEST_USER = process.env.E2E_USERNAME || 'e2e_test'
const TEST_PASS = process.env.E2E_PASSWORD || 'test1234'
const PUB_TITLE = 'E2E 搜索测试谱'
const BLANK_PUB = { people: {}, families: {}, focusFamilyId: '' }
const DEF_SETTINGS = { paper: 'A3', layoutMode: 'modern', cardWidth: 160, generationGap: 100, siblingGap: 40, partnerGap: 20, fontScale: 1, zoom: 1, showDeath: true, showAge: true, showNote: true, showPhoto: true, paddingX: 40, paddingY: 40 }

test.describe('Search & Share', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      try { localStorage.setItem('genealogy_onboarding_done', '1') } catch {}
    })
    await page.request.post('/api/auth/login', {
      data: { username: TEST_USER, password: TEST_PASS },
    })
    await page.goto('/')
    await page.waitForURL(/\/$|\/dashboard/)
  })

  test('should find publication via global search', async ({ page }) => {
    // Create a publication via API
    const resp = await page.request.post('/api/publications', {
      data: { title: PUB_TITLE, subtitle: '搜索测试', publication: { ...BLANK_PUB, title: PUB_TITLE }, settings: DEF_SETTINGS },
    })
    const { id } = (await resp.json()).data

    try {
      // Navigate to dashboard to access the search bar
      await page.goto('/')
      await page.waitForURL(/\/$|\/dashboard/)

      // Global search is in the top action bar
      const searchInput = page.locator('.search-input')
      await expect(searchInput).toBeVisible()
      await searchInput.fill(PUB_TITLE)

      // Wait for debounced search results (300ms debounce + network)
      await expect(page.locator('.search-dropdown')).toBeVisible({ timeout: 8000 })

      // Should find the publication in results
      await expect(page.locator('.result-item-title').filter({ hasText: PUB_TITLE })).toBeVisible()
    } finally {
      await page.request.delete(`/api/publications/${id}`).catch(() => {})
    }
  })

  test('should create a share link and access shared publication', async ({ page }) => {
    // Create a publication via API for sharing
    const resp = await page.request.post('/api/publications', {
      data: { title: 'E2E 分享测试谱', subtitle: '分享测试', publication: { ...BLANK_PUB, title: 'E2E 分享测试谱' }, settings: DEF_SETTINGS },
    })
    const { id } = (await resp.json()).data

    try {
      // Navigate to publications list
      await page.goto('/publications')
      await expect(page.locator('.publication-list-view-root')).toBeVisible()

      // Open share dialog for the publication
      const pubCard = page.locator('.archive-card').filter({ hasText: 'E2E 分享测试谱' })
      await expect(pubCard).toBeVisible()
      await pubCard.locator('button[title="分享链接"]').click()
      await expect(page.locator('.glass-sheet')).toBeVisible()
      await expect(page.getByText('分享链接管理')).toBeVisible()

      // Create a share link
      await page.locator('.share-link-manager button:has-text("创建链接")').click()
      await page.locator('button:has-text("确认创建")').click()

      // The new token card appears with the share URL
      await expect(page.locator('.new-token-card')).toBeVisible({ timeout: 10000 })
      const shareUrl = (await page.locator('.token-url code').textContent())?.trim() || ''
      expect(shareUrl).toContain('/share/')

      // Close the share dialog
      await page.locator('.sheet-close').click()
      await expect(page.locator('.glass-sheet')).not.toBeVisible()

      // Open the share URL in a new incognito-like context (no auth cookies)
      const cleanContext = await page.context().browser()!.newContext({ storageState: undefined })
      const sharePage = await cleanContext.newPage()
      await sharePage.goto(shareUrl)

      // The share view should load the publication
      await expect(sharePage.locator('.share-view')).toBeVisible({ timeout: 15000 })
      await expect(sharePage.locator('.share-header')).toBeVisible()

      await cleanContext.close()
    } finally {
      await page.request.delete(`/api/publications/${id}`).catch(() => {})
    }
  })
})
