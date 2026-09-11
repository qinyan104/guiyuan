import { describe, expect, it, vi } from 'vitest'

import { navigateAfterLogin } from './authNavigation'

describe('navigateAfterLogin', () => {
  it('forces a full-page transition into the authenticated shell', () => {
    const replace = vi.fn()

    navigateAfterLogin({ replace })

    expect(replace).toHaveBeenCalledWith('/dashboard')
  })
})
