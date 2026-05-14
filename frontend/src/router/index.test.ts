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
  it('redirects legacy person-detail paths to the workbench personId query', async () => {
    await router.push('/publication/7/person/p2')
    await router.isReady()

    expect(router.currentRoute.value.name).toBe('workbench')
    expect(router.currentRoute.value.params).toMatchObject({ id: '7' })
    expect(router.currentRoute.value.query).toMatchObject({ personId: 'p2' })
  })

  it('does not register the removed print-preview route', () => {
    expect(router.getRoutes().some((route) => route.name === 'print-preview')).toBe(false)
  })
})
