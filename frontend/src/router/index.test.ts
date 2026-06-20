import { describe, expect, it, vi } from 'vitest'

vi.mock('../api/auth', () => ({
  getToken: () => 'token',
  isAdmin: () => true,
}))

vi.mock('../api/authSession', () => ({
  bootstrapAuthSession: vi.fn(async () => true),
}))

import router from './index'

describe('router legacy person-detail compatibility', () => {
  it('does not register the removed person-detail route', () => {
    expect(router.getRoutes().some((route) => route.name === 'person-detail')).toBe(false)
  })

  it('does not register the removed print-preview route', () => {
    expect(router.getRoutes().some((route) => route.name === 'print-preview')).toBe(false)
  })

  it('registers public legal and not-found routes', () => {
    const routeNames = router.getRoutes().map((route) => route.name)

    expect(routeNames).toContain('privacy')
    expect(routeNames).toContain('terms')
    expect(routeNames).toContain('not-found')
  })
})
