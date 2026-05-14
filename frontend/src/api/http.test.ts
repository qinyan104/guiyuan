import { describe, expect, it, vi } from 'vitest'
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

describe('http interceptors', () => {
  it('dispatches concurrency-conflict event on 409 error', async () => {
    const { default: http } = await import('./http')
    const axiosMock = (http as any)
    
    // We need to trigger the interceptor. 
    // Since http is the actual axios instance, we might need to mock the response.
    // However, vitest might have already loaded it.
    
    const dispatchSpy = vi.spyOn(window, 'dispatchEvent')
    
    // Simulate a 409 error from axios
    const error = {
      response: {
        status: 409,
        data: { message: 'Conflict detected' }
      },
      config: { url: '/test' }
    }
    
    // Accessing private interceptors is tricky, 
    // but we can try to find the one we added if we know its position.
    // Alternatively, we can just trigger the function we'll add.
    
    // Let's assume we add it to the response interceptors.
    const responseInterceptor = axiosMock.interceptors.response.handlers[0].rejected
    await responseInterceptor(error).catch(() => {})
    
    expect(dispatchSpy).toHaveBeenCalledWith(expect.objectContaining({
      type: 'concurrency-conflict'
    }))
  })

  it('does not dispatch the global concurrency event for publication save conflicts', async () => {
    const { default: http } = await import('./http')
    const axiosMock = (http as any)
    const dispatchSpy = vi.spyOn(window, 'dispatchEvent')

    const error = {
      response: {
        status: 409,
        data: { message: 'Publication is stale. Reload before saving.' }
      },
      config: { url: '/publications/7' }
    }

    const responseInterceptor = axiosMock.interceptors.response.handlers[0].rejected
    await responseInterceptor(error).catch(() => {})

    expect(dispatchSpy).not.toHaveBeenCalled()
  })
})
