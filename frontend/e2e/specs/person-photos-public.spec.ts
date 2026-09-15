import { expect, test } from '@playwright/test'

test('分享及外域图片不带残留凭证，也不触发刷新', async ({ page, context }, testInfo) => {
  const origin = new URL(testInfo.project.use.baseURL as string).origin
  await context.addCookies([{ name: 'test-session', value: 'private', url: origin }])
  const requests: { url: string; authorization?: string; cookie?: string }[] = []
  await page.route('**/api/**', async route => {
    if (!new URL(route.request().url()).pathname.startsWith('/api/')) {
      await route.continue()
      return
    }
    requests.push({ url: route.request().url(), ...route.request().headers() })
    await route.fulfill({ status: 401, body: 'unauthorized', headers: { 'Access-Control-Allow-Origin': '*' } })
  })
  await page.route('**/photo-test', route => route.fulfill({ contentType: 'text/html', body: '<div></div>' }))
  await page.goto('/photo-test')
  await page.evaluate(async () => {
    const load = (path: string) => import(/* @vite-ignore */ path)
    const { setAccessToken } = await load('/src/api/tokenStore.ts')
    const { fetchBinaryResource } = await load('/src/api/http.ts')
    setAccessToken('residual-test-token')
    for (const url of ['/api/shares/demo-token/photos/1', 'https://images.example/api/photos/1']) {
      try { await fetchBinaryResource(url) } catch { /* 401 交给调用者 */ }
    }
  })
  expect(requests).toHaveLength(2)
  for (const request of requests) {
    expect(request.authorization).toBeUndefined()
    expect(request.cookie).toBeUndefined()
    expect(request.url).not.toContain('/auth/refresh')
  }
  // 带会话 Cookie 已写入：如果请求真的发出了 Cookie，上面的断言会失败。
  expect((await context.cookies()).some(cookie => cookie.name === 'test-session')).toBe(true)
  expect(page.url()).toContain('/photo-test')
})
