import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'

const {
  route,
  routerReplace,
  session,
  httpPost,
  clearSession,
  setAccessToken,
  setUsername,
  setRole,
  getAccessToken,
  state,
} = vi.hoisted(() => {
  const session = {
    token: null as string | null,
  }
  const route = {
    name: 'dashboard',
    meta: {} as Record<string, unknown>,
  }
  const state = {
    refreshDeferred: createDeferred<{
      data: { data: { token: string; username: string; role?: string } }
    }>(),
  }
  const routerReplace = vi.fn()

  return {
    route,
    routerReplace,
    state,
    session,
    httpPost: vi.fn(() => state.refreshDeferred.promise),
    clearSession: vi.fn(() => {
      session.token = null
    }),
    setAccessToken: vi.fn((token: string) => {
      session.token = token
    }),
    setUsername: vi.fn(),
    setRole: vi.fn(),
    getAccessToken: vi.fn(() => session.token),
  }
})

vi.mock('vue-router', () => ({
  useRoute: () => route,
  useRouter: () => ({
    replace: routerReplace,
  }),
}))

vi.mock('./api/http', () => ({
  default: {
    post: httpPost,
  },
}))

vi.mock('./api/tokenStore', () => ({
  setAccessToken,
  setUsername,
  setRole,
  clearSession,
  getAccessToken,
}))

vi.mock('./composables/useTheme', () => ({
  useTheme: () => ({
    currentTheme: { value: 'light' },
    setTheme: vi.fn(),
  }),
}))

import App from './App.vue'
import { resetAuthBootstrapForTests } from './api/authSession'

beforeEach(() => {
  resetAuthBootstrapForTests()
  session.token = null
  route.name = 'dashboard'
  route.meta = {}
  state.refreshDeferred = createDeferred()
  httpPost.mockClear()
  clearSession.mockClear()
  setAccessToken.mockClear()
  setUsername.mockClear()
  setRole.mockClear()
  getAccessToken.mockClear()
  routerReplace.mockClear()
})

describe('App auth bootstrap', () => {
  it('waits for startup auth refresh before rendering route content', async () => {
    const wrapper = mount(App, {
      global: {
        stubs: {
          RouterView: {
            template: '<div data-testid="route-content">route</div>',
          },
          OnboardingGuide: true,
        },
      },
    })

    expect(wrapper.find('[data-testid="route-content"]').exists()).toBe(false)

    state.refreshDeferred.resolve({
      data: {
        data: {
          token: 'restored-token',
          username: 'alice',
          role: 'ADMIN',
        },
      },
    })

    await flushPromises()

    expect(wrapper.find('[data-testid="route-content"]').exists()).toBe(true)
  })

  it('renders immediately when a fresh access token already exists locally', async () => {
    session.token = 'fresh-token'

    const wrapper = mount(App, {
      global: {
        stubs: {
          RouterView: {
            template: '<div data-testid="route-content">route</div>',
          },
          OnboardingGuide: true,
        },
      },
    })

    await flushPromises()

    expect(httpPost).not.toHaveBeenCalled()
    expect(wrapper.find('[data-testid="route-content"]').exists()).toBe(true)
  })

  it('keeps a newly logged-in session when the startup refresh fails later', async () => {
    mount(App, {
      global: {
        stubs: {
          RouterView: true,
          OnboardingGuide: true,
        },
      },
    })

    session.token = 'fresh-token'
    state.refreshDeferred.reject(new Error('refresh expired'))

    await flushPromises()

    expect(clearSession).not.toHaveBeenCalled()
  })

  it('does not proactively clear an existing session on startup when a protected route already has a token', async () => {
    session.token = 'stale-token'

    const wrapper = mount(App, {
      global: {
        stubs: {
          RouterView: {
            template: '<div data-testid="route-content">route</div>',
          },
          OnboardingGuide: true,
        },
      },
    })

    await flushPromises()

    expect(httpPost).not.toHaveBeenCalled()
    expect(clearSession).not.toHaveBeenCalled()
    expect(routerReplace).not.toHaveBeenCalled()
    expect(wrapper.find('[data-testid="route-content"]').exists()).toBe(true)
  })
})

function createDeferred<T>() {
  let resolve!: (value: T | PromiseLike<T>) => void
  let reject!: (reason?: unknown) => void
  const promise = new Promise<T>((res, rej) => {
    resolve = res
    reject = rej
  })

  return {
    promise,
    resolve,
    reject,
  }
}
