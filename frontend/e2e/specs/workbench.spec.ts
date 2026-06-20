import { test, expect } from '@playwright/test'

const TEST_USER = process.env.E2E_USERNAME || 'e2e_test'
const TEST_PASS = process.env.E2E_PASSWORD || 'test1234'
const PUB_TITLE = 'E2E 工作台测试谱'
const DEF_SETTINGS = { paper: 'A3', layoutMode: 'modern', cardWidth: 160, generationGap: 100, siblingGap: 40, partnerGap: 20, fontScale: 1, zoom: 1, showCard: true, showDeath: true, showAge: true, showNote: true, showPhoto: true, paddingX: 40, paddingY: 40 }

// A publication with one root person and one family
const PERSON_ID = 'p_root'
const FAMILY_ID = 'f_root'
const ROOT_PERSON_NAME = '始祖公'

const PUB_WITH_PERSON = {
  title: PUB_TITLE,
  subtitle: '工作台测试版',
  focusFamilyId: FAMILY_ID,
  people: {
    [PERSON_ID]: { id: PERSON_ID, name: ROOT_PERSON_NAME, gender: 'male' },
  },
  families: {
    [FAMILY_ID]: { id: FAMILY_ID, adults: [PERSON_ID], children: [] },
  },
}

test.describe('Workbench / Person Editing', () => {
  let publicationId: number

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

  test.beforeAll(async ({ request }) => {
    // Create a test publication with a root person
    await request.post('/api/auth/login', {
      data: { username: TEST_USER, password: TEST_PASS },
    })
    const resp = await request.post('/api/publications', {
      data: {
        title: PUB_TITLE,
        subtitle: '工作台测试版',
        publication: PUB_WITH_PERSON,
        settings: DEF_SETTINGS,
      },
    })
    const body = await resp.json()
    publicationId = body.data.id
  })

  test.afterAll(async ({ request }) => {
    // Cleanup: delete the test publication
    if (publicationId) {
      await request.post('/api/auth/login', {
        data: { username: TEST_USER, password: TEST_PASS },
      })
      await request.delete(`/api/publications/${publicationId}`).catch(() => {})
    }
  })

  test('should open workbench and see person card on canvas', async ({ page }) => {
    await page.goto(`/publication/${publicationId}`)
    await expect(page.locator('.app-shell')).toBeVisible()

    // The person card should be rendered in the SVG canvas
    await expect(page.locator('.person-card').first()).toBeVisible({ timeout: 15000 })
  })

  test('should click person card and open editor panel', async ({ page }) => {
    await page.goto(`/publication/${publicationId}`)
    await expect(page.locator('.app-shell')).toBeVisible()
    await expect(page.locator('.person-card').first()).toBeVisible({ timeout: 15000 })

    // First click selects the person
    const personCard = page.locator('.person-card').first()
    await personCard.click()
    await page.waitForTimeout(300)

    // Second click on the same card opens the editor drawer
    await personCard.click()
    await expect(page.locator('.ak-overlay')).toBeVisible({ timeout: 5000 })
    await expect(page.locator('.ak-card')).toBeVisible()
  })

  test('should edit person name and see change reflected', async ({ page }) => {
    await page.goto(`/publication/${publicationId}`)
    await expect(page.locator('.app-shell')).toBeVisible()
    await expect(page.locator('.person-card').first()).toBeVisible({ timeout: 15000 })

    // Select and open editor
    const personCard = page.locator('.person-card').first()
    await personCard.click()
    await page.waitForTimeout(300)
    await personCard.click()
    await expect(page.locator('.ak-overlay')).toBeVisible({ timeout: 5000 })

    // Edit the name in the editor
    const nameInput = page.locator('.ak-inp--hero')
    await expect(nameInput).toBeVisible()
    await nameInput.fill('始祖公-已编辑')

    // Close editor
    await page.locator('.ak-bar__btn.ak-bar__done').click()
    await expect(page.locator('.ak-overlay')).not.toBeVisible()

    // Verify the name is reflected in the person card on canvas
    await expect(page.locator('.person-card__name').filter({ hasText: '始祖公-已编辑' })).toBeVisible({ timeout: 5000 })

    // Restore original name for subsequent tests
    await personCard.click()
    await page.waitForTimeout(300)
    await personCard.click()
    await expect(page.locator('.ak-overlay')).toBeVisible({ timeout: 5000 })
    await page.locator('.ak-inp--hero').fill(ROOT_PERSON_NAME)
    await page.locator('.ak-bar__btn.ak-bar__done').click()
  })

  test('should add a spouse and verify spouse appears', async ({ page }) => {
    await page.goto(`/publication/${publicationId}`)
    await expect(page.locator('.app-shell')).toBeVisible()
    await expect(page.locator('.person-card').first()).toBeVisible({ timeout: 15000 })

    // Open editor for the root person
    const personCard = page.locator('.person-card').first()
    await personCard.click()
    await page.waitForTimeout(300)
    await personCard.click()
    await expect(page.locator('.ak-overlay')).toBeVisible({ timeout: 5000 })

    // Click "+ 添加配偶" button
    const addSpouseBtn = page.locator('.ak-rel__add').filter({ hasText: '添加配偶' })
    await expect(addSpouseBtn).toBeVisible()
    await addSpouseBtn.click()

    // A spouse chip should appear in the spouse row
    // The spouse row is the first .ak-rel__row
    const spouseRow = page.locator('.ak-rel__row').first()
    await expect(spouseRow.locator('.ak-pchp')).toBeVisible({ timeout: 5000 })

    // Close editor
    await page.locator('.ak-bar__btn.ak-bar__done').click()
  })

  test('should add a child and verify child appears in the list', async ({ page }) => {
    await page.goto(`/publication/${publicationId}`)
    await expect(page.locator('.app-shell')).toBeVisible()
    await expect(page.locator('.person-card').first()).toBeVisible({ timeout: 15000 })

    // Open editor for the root person
    const personCard = page.locator('.person-card').first()
    await personCard.click()
    await page.waitForTimeout(300)
    await personCard.click()
    await expect(page.locator('.ak-overlay')).toBeVisible({ timeout: 5000 })

    // Click "+ 添子" button to add a male child
    const addChildBtn = page.locator('.ak-rel__add').filter({ hasText: '添子' })
    await expect(addChildBtn).toBeVisible()
    await addChildBtn.click()

    // The children row (3rd .ak-rel__row) should now have a child chip
    const childrenRow = page.locator('.ak-rel__row').nth(2)
    await expect(childrenRow.locator('.ak-pchp')).toBeVisible({ timeout: 5000 })

    // Close editor
    await page.locator('.ak-bar__btn.ak-bar__done').click()
  })

  test('should delete a person with confirmation dialog', async ({ page }) => {
    // Create a separate publication for deletion test to avoid side effects
    const resp = await page.request.post('/api/publications', {
      data: {
        title: 'E2E 删除测试谱',
        subtitle: '删除测试',
        publication: {
          title: 'E2E 删除测试谱',
          subtitle: '删除测试',
          focusFamilyId: 'f_del',
          people: {
            p_del: { id: 'p_del', name: '待删人物', gender: 'male' },
          },
          families: {
            f_del: { id: 'f_del', adults: ['p_del'], children: [] },
          },
        },
        settings: DEF_SETTINGS,
      },
    })
    const body = await resp.json()
    const deletePubId = body.data.id

    try {
      await page.goto(`/publication/${deletePubId}`)
      await expect(page.locator('.app-shell')).toBeVisible()
      await expect(page.locator('.person-card').first()).toBeVisible({ timeout: 15000 })

      // Open editor
      const personCard = page.locator('.person-card').first()
      await personCard.click()
      await page.waitForTimeout(300)
      await personCard.click()
      await expect(page.locator('.ak-overlay')).toBeVisible({ timeout: 5000 })

      // Click "删除此人" button
      const deleteBtn = page.locator('.ak-del').filter({ hasText: '删除此人' })
      await expect(deleteBtn).toBeVisible()
      await deleteBtn.click()

      // Confirm dialog should appear
      await expect(page.locator('.confirm-overlay')).toBeVisible({ timeout: 5000 })
      await expect(page.locator('.confirm-dialog')).toBeVisible()

      // Confirm the deletion
      await page.locator('.confirm-dialog .bento-btn.danger').click()

      // Editor should close and the person card should be removed
      await expect(page.locator('.ak-overlay')).not.toBeVisible({ timeout: 5000 })
    } finally {
      await page.request.delete(`/api/publications/${deletePubId}`).catch(() => {})
    }
  })
})
