import { afterEach, describe, expect, it, vi } from 'vitest'
import { BusinessError, formatHttpError, shouldRetryAuthRefresh, unwrapApiResponse } from './http'

type ResponseRejected = (error: unknown) => Promise<unknown>
type RequestFulfilled = (config: { headers?: Record<string, unknown>; skipAuth?: boolean }) => Record<string, unknown>
type HttpWithInterceptorHandlers = {
  interceptors: {
    request: {
      handlers: Array<{ fulfilled: RequestFulfilled }>
    }
    response: {
      handlers: Array<{ rejected: ResponseRejected }>
    }
  }
}

afterEach(() => {
  vi.restoreAllMocks()
})

describe('shouldRetryAuthRefresh', () => {
  it('skips auth endpoints to avoid refresh loops', () => {
    expect(shouldRetryAuthRefresh({ url: '/auth/refresh' })).toBe(false)
    expect(shouldRetryAuthRefresh({ url: '/auth/login' })).toBe(false)
    expect(shouldRetryAuthRefresh({ url: '/auth/register' })).toBe(false)
    expect(shouldRetryAuthRefresh({ url: '/publications' })).toBe(true)
  })
})

describe('formatHttpError', () => {
  it('returns user-facing message from the error classifier', () => {
    expect(
      formatHttpError({
        config: { method: 'get', url: '/publications' },
        response: { status: 401, data: { message: 'Unauthorized' } },
      }),
    ).toBe('Unauthorized')
  })
})

describe('unwrapApiResponse', () => {
  it('returns payload when code is 200', async () => {
    const payload = { id: 1, username: 'alice' }
    await expect(unwrapApiResponse(Promise.resolve({ data: { code: 200, data: payload } }))).resolves.toEqual(payload)
  })

  it('throws BusinessError carrying the server message when code is not 200', async () => {
    const promise = Promise.resolve({ data: { code: 403, message: '权限不足', data: null } })

    await expect(unwrapApiResponse(promise)).rejects.toBeInstanceOf(BusinessError)
    await expect(unwrapApiResponse(promise)).rejects.toThrow('权限不足')
  })

  it('falls back to a generic message when the server omits one', async () => {
    const promise = Promise.resolve({ data: { code: 500, data: null } })

    await expect(unwrapApiResponse(promise)).rejects.toThrow('操作失败')
  })

  it('propagates network rejections untouched', async () => {
    const networkError = new Error('Network Error')

    await expect(unwrapApiResponse(Promise.reject(networkError))).rejects.toBe(networkError)
  })
})

describe('http interceptors', () => {
  it('dispatches concurrency-conflict event on 409 error', async () => {
    const { default: http } = await import('./http')
    const axiosMock = http as unknown as HttpWithInterceptorHandlers

    // We need to trigger the interceptor.
    // Since http is the actual axios instance, we might need to mock the response.
    // However, vitest might have already loaded it.

    const dispatchSpy = vi.spyOn(window, 'dispatchEvent')

    // Simulate a 409 error from axios
    const error = {
      response: {
        status: 409,
        data: { message: 'Conflict detected' },
      },
      config: { url: '/test' },
    }

    // Accessing private interceptors is tricky,
    // but we can try to find the one we added if we know its position.
    // Alternatively, we can just trigger the function we'll add.

    // Let's assume we add it to the response interceptors.
    const responseInterceptor = axiosMock.interceptors.response.handlers[0].rejected
    await responseInterceptor(error).catch(() => {
      // Expected rejection; this test only asserts emitted global events.
    })

    expect(dispatchSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'concurrency-conflict',
      }),
    )
  })

  it('does not dispatch concurrency-conflict for publication save conflicts', async () => {
    const { default: http } = await import('./http')
    const axiosMock = http as unknown as HttpWithInterceptorHandlers
    const dispatchSpy = vi.spyOn(window, 'dispatchEvent')

    const error = {
      response: {
        status: 409,
        data: { message: 'Publication is stale. Reload before saving.' },
      },
      config: { url: '/publications/7' },
    }

    const responseInterceptor = axiosMock.interceptors.response.handlers[0].rejected
    await responseInterceptor(error).catch(() => {
      // Expected rejection; this test only asserts emitted global events.
    })

    // api-error is always dispatched, but concurrency-conflict should not be
    const concurrencyEvents = dispatchSpy.mock.calls.filter(
      ([event]) => (event as CustomEvent).type === 'concurrency-conflict',
    )
    expect(concurrencyEvents).toHaveLength(0)
  })

  it('does not dispatch global events for public (skipAuth) requests', async () => {
    const { default: http } = await import('./http')
    const axiosMock = http as unknown as HttpWithInterceptorHandlers
    const dispatchSpy = vi.spyOn(window, 'dispatchEvent')

    const error = {
      response: {
        status: 409,
        data: { message: 'Conflict detected' },
      },
      config: { url: '/shares/tok', skipAuth: true },
    }

    const responseInterceptor = axiosMock.interceptors.response.handlers[0].rejected
    await responseInterceptor(error).catch(() => {
      // Expected rejection; public requests must stay side-effect free.
    })

    const concurrencyEvents = dispatchSpy.mock.calls.filter(
      ([event]) => (event as CustomEvent).type === 'concurrency-conflict',
    )
    expect(concurrencyEvents).toHaveLength(0)
  })

  it('injects Authorization for normal requests', async () => {
    const { default: http } = await import('./http')
    const { setAccessToken, clearAccessToken } = await import('./tokenStore')
    setAccessToken('token-abc')

    const axiosMock = http as unknown as HttpWithInterceptorHandlers
    const requestInterceptor = axiosMock.interceptors.request.handlers[0].fulfilled
    const result = requestInterceptor({ headers: {} }) as {
      headers: Record<string, unknown>
    }

    expect(result.headers.Authorization).toBe('Bearer token-abc')
    clearAccessToken()
  })

  it('does not inject Authorization for skipAuth requests', async () => {
    const { default: http } = await import('./http')
    const { setAccessToken, clearAccessToken } = await import('./tokenStore')
    setAccessToken('stale-token')

    const axiosMock = http as unknown as HttpWithInterceptorHandlers
    const requestInterceptor = axiosMock.interceptors.request.handlers[0].fulfilled
    const result = requestInterceptor({
      headers: { Authorization: 'Bearer stale-token' },
      skipAuth: true,
    }) as { headers: Record<string, unknown> }

    expect(result.headers.Authorization).toBeUndefined()
    clearAccessToken()
  })
})
