import { mount } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'

import LoginForm from './LoginForm.vue'

vi.mock('../api/auth', () => ({
  login: vi.fn(),
}))

describe('LoginForm', () => {
  it('frames sign-in as returning to a family archive', () => {
    const wrapper = mount(LoginForm, {
      global: {
        stubs: {
          RouterLink: {
            props: ['to'],
            template: '<a :href="to"><slot /></a>',
          },
        },
      },
    })

    expect(wrapper.text()).toContain('回到你的家族档案')
    expect(wrapper.text()).toContain('继续整理你们的故事')
  })

  it('offers a clearly labelled action to enter Guiyuan', () => {
    const wrapper = mount(LoginForm, {
      global: {
        stubs: {
          RouterLink: {
            props: ['to'],
            template: '<a :href="to"><slot /></a>',
          },
        },
      },
    })

    expect(wrapper.get('[data-testid="login-submit"]').text()).toContain('进入归源')
  })
})
