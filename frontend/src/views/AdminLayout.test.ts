import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const { logoutDeferred, logout, routerPush } = vi.hoisted(() => {
  const state = {
    logoutDeferred: createDeferred<void>(),
  }

  return {
    logoutDeferred: state,
    logout: vi.fn(() => state.logoutDeferred.promise),
    routerPush: vi.fn(),
  }
})

vi.mock('vue-router', () => ({
  useRouter: () => ({
    push: routerPush,
  }),
  useRoute: () => ({
    name: 'dashboard',
    fullPath: '/',
  }),
}))

vi.mock('../composables/useTheme', () => ({
  useTheme: () => ({
    currentTheme: { value: 'light' },
    setTheme: vi.fn(),
  }),
}))

vi.mock('../api/auth', () => ({
  logout,
  getUsername: () => 'alice',
  isAdmin: () => true,
}))

import AdminLayout from './AdminLayout.vue'

beforeEach(() => {
  logoutDeferred.logoutDeferred = createDeferred<void>()
  logout.mockClear()
  routerPush.mockClear()
})

describe('AdminLayout logout flow', () => {
  it('waits for logout completion before navigating to login', async () => {
    const wrapper = mount(AdminLayout, {
      global: {
        stubs: {
          RouterView: true,
          GlobalSearch: true,
          ThemeSwitcher: true,
          Transition: false,
        },
      },
    })

    await wrapper.find('.user-profile-pill').trigger('click')
    await wrapper.find('.menu-item.danger').trigger('click')

    expect(logout).toHaveBeenCalledTimes(1)
    expect(routerPush).not.toHaveBeenCalled()

    logoutDeferred.logoutDeferred.resolve()
    await flushPromises()

    expect(routerPush).toHaveBeenCalledWith({ name: 'login' })
  })

  it('renders a visible fallback while the child route component is unresolved', () => {
    const wrapper = mount(AdminLayout, {
      global: {
        stubs: {
          RouterView: {
            template: '<slot :Component="null" />',
          },
          GlobalSearch: true,
          ThemeSwitcher: true,
          Transition: false,
        },
      },
    })

    expect(wrapper.text()).toContain('Loading page for /...')
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
