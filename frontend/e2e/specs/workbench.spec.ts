import { test, expect, type Page } from '@playwright/test'
import { authenticatedRequest, loginPage, loginViaApi } from '../helpers/auth'

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

async function openPersonEditor(page: Page) {
  const personCard = page.locator('.person-card').first()
  const editor = page.locator('.ak-overlay')
  await expect(personCard).toBeVisible({ timeout: 15000 })

  // The workbench selects the focus person during load. Depending on the
  // route/bootstrap timing, the drawer may already be open or one click may
  // select/open it. Keep the helper aligned with both valid UI states.
  if (!(await editor.isVisible().catch(() => false))) {
    await personCard.click()
  }
  if (!(await editor.isVisible().catch(() => false))) {
    await personCard.click()
  }
  await expect(editor).toBeVisible({ timeout: 5000 })
  return { personCard, editor }
}

test.describe('Workbench / Person Editing', () => {
  let publicationId: number
  let authToken = ''

  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      try { localStorage.setItem('genealogy_onboarding_done', '1') } catch {}
    })
    authToken = await loginPage(page, TEST_USER, TEST_PASS)
    await page.goto('/dashboard')
    await page.waitForURL('/dashboard')
  })

  test.beforeAll(async ({ request }) => {
    // Create a test publication with a root person
    const token = await loginViaApi(request, TEST_USER, TEST_PASS)
    const resp = await authenticatedRequest(request, token, '/api/publications', {
      method: 'POST',
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
      const token = await loginViaApi(request, TEST_USER, TEST_PASS)
      await authenticatedRequest(request, token, `/api/publications/${publicationId}`, { method: 'DELETE' }).catch(() => {})
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
    await openPersonEditor(page)
    await expect(page.locator('.ak-card')).toBeVisible()
  })

  test('should edit person name and see change reflected', async ({ page }) => {
    await page.goto(`/publication/${publicationId}`)
    await expect(page.locator('.app-shell')).toBeVisible()
    const { personCard } = await openPersonEditor(page)

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
    await openPersonEditor(page)
    await page.locator('.ak-inp--hero').fill(ROOT_PERSON_NAME)
    await page.locator('.ak-bar__btn.ak-bar__done').click()
  })

  test('should add a spouse and verify spouse appears', async ({ page }) => {
    await page.goto(`/publication/${publicationId}`)
    await expect(page.locator('.app-shell')).toBeVisible()
    // Open editor for the root person
    await openPersonEditor(page)

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
    // Open editor for the root person
    await openPersonEditor(page)

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
    const resp = await authenticatedRequest(page.request, authToken, '/api/publications', {
      method: 'POST',
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
      // Open editor
      await openPersonEditor(page)

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
      await authenticatedRequest(page.request, authToken, `/api/publications/${deletePubId}`, { method: 'DELETE' }).catch(() => {})
    }
  })
})
