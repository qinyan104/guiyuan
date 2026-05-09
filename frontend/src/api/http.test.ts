import { describe, expect, it } from 'vitest'
import { formatHttpError, shouldRetryAuthRefresh } from './http'

describe('shouldRetryAuthRefresh', () => {
  it('skips auth endpoints to avoid refresh loops', () => {
    expect(shouldRetryAuthRefresh({ url: '/auth/refresh' } as any)).toBe(false)
    expect(shouldRetryAuthRefresh({ url: '/auth/login' } as any)).toBe(false)
    expect(shouldRetryAuthRefresh({ url: '/auth/register' } as any)).toBe(false)
    expect(shouldRetryAuthRefresh({ url: '/publications' } as any)).toBe(true)
  })
})

describe('formatHttpError', () => {
  it('includes method url status and api message when present', () => {
    expect(
      formatHttpError({
        config: { method: 'get', url: '/publications' },
        response: { status: 401, data: { message: 'Unauthorized' } },
      }),
    ).toBe('GET /publications failed with 401: Unauthorized')
  })
})
