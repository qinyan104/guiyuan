import { mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import LandingView from './LandingView.vue'

class IntersectionObserverStub {
  observe = vi.fn()
  unobserve = vi.fn()
  disconnect = vi.fn()
}

describe('LandingView', () => {
  beforeEach(() => {
    vi.stubGlobal('IntersectionObserver', IntersectionObserverStub)
  })

  it('gives first-time visitors a clear reason to start a family record', () => {
    const wrapper = mount(LandingView, {
      global: {
        stubs: {
          RouterLink: {
            props: ['to'],
            template: '<a :href="to"><slot /></a>',
          },
        },
      },
    })

    expect(wrapper.text()).toContain('从一个名字开始')
    expect(wrapper.text()).toContain('整理、协作与出版')
  })

  it('keeps the primary action close to the hero and sends visitors into the app', () => {
    const wrapper = mount(LandingView, {
      global: {
        stubs: {
          RouterLink: {
            props: ['to'],
            template: '<a :href="to"><slot /></a>',
          },
        },
      },
    })

    const primaryAction = wrapper.get('[data-testid="landing-primary-action"]')

    expect(primaryAction.text()).toBe('开始整理家谱')
    expect(primaryAction.attributes('href')).toBe('/dashboard')
  })
})
