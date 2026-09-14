import { expect, test } from '@playwright/test'
import { loginPage, TEST_PASSWORD, TEST_USERNAME } from '../helpers/auth'
import type { PublicationData } from '../../src/types/family'

function gedcom(surname: string) {
  return {
    name: `${surname}.ged`,
    mimeType: 'text/plain',
    buffer: Buffer.from(`0 HEAD
1 CHAR UTF-8
0 @I1@ INDI
1 NAME ${surname}父
1 SEX M
0 @I2@ INDI
1 NAME ${surname}母
1 SEX F
0 @I3@ INDI
1 NAME ${surname}子
1 SEX M
0 @F1@ FAM
1 HUSB @I1@
1 WIFE @I2@
1 CHIL @I3@
0 TRLR
`),
  }
}

test('imports, merges, edits, saves and reopens both GEDCOM families without losing relationships', async ({ page }) => {
  test.setTimeout(90_000)
  await page.addInitScript(() => localStorage.setItem('genealogy_onboarding_done', '1'))
  const token = await loginPage(page, TEST_USERNAME, TEST_PASSWORD)
  const headers = { Authorization: `Bearer ${token}` }
  let publicationId: number | undefined

  try {
    const imported = await page.request.post('/api/publications/import', {
      headers,
      multipart: { file: gedcom('张') },
    })
    expect(imported.ok()).toBeTruthy()
    publicationId = (await imported.json()).data.pubId
    const path = `/publication/${publicationId}`
    const apiPath = `/api/publications/${publicationId}`
    await page.goto(path)
    await expect(page.locator('.person-card').first()).toBeVisible()

    await page.locator('.dropdown-trigger').filter({ hasText: '导入' }).click()
    await page.getByRole('button', { name: '导入 GEDCOM', exact: true }).click()
    const dialog = page.getByRole('dialog', { name: 'GEDCOM 导入' })
    await dialog.locator('input[type="file"]').setInputFiles(gedcom('李'))
    await dialog.locator('input[value="merge"]').check()
    await dialog.getByRole('button', { name: '开始导入' }).click()
    await expect(dialog.getByText('导入成功', { exact: true })).toBeVisible()
    await expect(dialog.locator('.stat__value').first()).toHaveText('3')
    await dialog.getByRole('button', { name: '查看族谱' }).click()
    await expect(dialog).not.toBeVisible()

    const nameInput = page.locator('.ped-inp--hero')
    if (!(await nameInput.isVisible())) await page.locator('.person-card').first().click()
    await expect(nameInput).toHaveValue('张父')
    const saved = page.waitForResponse(response =>
      response.url().includes(apiPath) && response.request().method() === 'PUT',
    )
    await nameInput.fill('张父已校对')
    await page.getByRole('button', { name: '完成', exact: true }).click()
    expect((await saved).ok()).toBeTruthy()
    await expect(page.locator('.topbar__status-text')).toHaveText('已落卷')
    await page.reload()
    await expect(page.locator('.person-card__name').filter({ hasText: '张父已校对' })).toBeVisible()

    const response = await page.request.get(apiPath, { headers })
    expect(response.ok()).toBeTruthy()
    const publication: PublicationData = (await response.json()).data.publication
    expect(publication.subtitle).toBe('')
    expect(Object.values(publication.people).map(person => person.name).sort()).toEqual(
      ['张父已校对', '张母', '张子', '李父', '李母', '李子'].sort(),
    )
    expect(Object.values(publication.families).map(family => ({
      adults: family.adults.map(id => publication.people[id].name),
      children: family.children.map(id => publication.people[id].name),
    }))).toEqual(expect.arrayContaining([
      { adults: ['张父已校对', '张母'], children: ['张子'] },
      { adults: ['李父', '李母'], children: ['李子'] },
    ]))
    expect(Object.keys(publication.families)).toHaveLength(2)

    const exported = await page.request.get(`${apiPath}/gedcom`, { headers })
    expect(exported.ok()).toBeTruthy()
    const text = await exported.text()
    expect(text.match(/^0 @.+@ INDI$/gm)).toHaveLength(6)
    expect(text.match(/^0 @.+@ FAM$/gm)).toHaveLength(2)
    expect(text).toContain('张父已校对')
  } finally {
    if (publicationId !== undefined) {
      await page.request.delete(`/api/publications/${publicationId}`, { headers, timeout: 5_000 }).catch(() => undefined)
    }
  }
})
