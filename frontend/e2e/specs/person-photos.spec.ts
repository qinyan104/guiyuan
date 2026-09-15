import { expect, test } from '@playwright/test'

test('私有照片通过 Bearer 下载、成功解码，并在会话结束清除', async ({ page }) => {
  const auth: (string | undefined)[] = []
  await page.route('**/api/photos/42*', async route => {
    const header = route.request().headers().authorization
    auth.push(header)
    await route.fulfill({
      status: header === 'Bearer isolated-photo-test' ? 200 : 401,
      contentType: 'image/png',
      body: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=', 'base64'),
    })
  })
  await page.route('**/photo-test', route => route.fulfill({ contentType: 'text/html', body: '<div id="app"></div>' }))
  await page.goto('/photo-test')
  await page.evaluate(async () => {
    // Vite 的真实模块与真实组件，在隔离页面挂载。
    const load = (path: string) => import(/* @vite-ignore */ path)
    const { createApp, h } = await load('/node_modules/.vite/deps/vue.js')
    const { setAccessToken } = await load('/src/api/tokenStore.ts')
    const { default: Card } = await load('/src/components/PersonCardSvg.vue')
    const { defaultSettings } = await load('/src/data/sampleFamily.ts')
    setAccessToken('isolated-photo-test')
    createApp({ render: () => h('svg', {}, [h(Card, {
      person: { id: 'test', name: '测试', gender: 'male', avatarUrl: '/api/photos/42?v=2' },
      card: { personId: 'test', x: 0, y: 0, width: 160, height: 300 },
      settings: { ...defaultSettings, showCard: true, showPhoto: true },
      selected: false,
    })]) }).mount('#app')
  })
  await expect(page.locator('image')).toHaveAttribute('href', /^blob:/)
  const decoded = await page.locator('image').evaluate(async element => {
    const image = new Image()
    image.src = element.getAttribute('href')!
    await image.decode()
    return image.naturalWidth
  })
  expect(decoded).toBe(1)
  expect(auth).toEqual(['Bearer isolated-photo-test'])
  await expect(page.locator('image')).toHaveAttribute('data-original-photo-url', '/api/photos/42?v=2')
  await page.evaluate(async () => {
    const path = '/src/api/tokenStore.ts'
    const { clearSession } = await import(/* @vite-ignore */ path)
    clearSession()
  })
  await expect(page.locator('image')).not.toHaveAttribute('href', /^blob:/)
})
