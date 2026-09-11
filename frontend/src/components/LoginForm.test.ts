import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const { login } = vi.hoisted(() => ({ login: vi.fn() }))

vi.mock('../api/auth', () => ({ login }))

import LoginForm from './LoginForm.vue'

describe('LoginForm', () => {
  beforeEach(() => {
    login.mockReset()
  })

  it('submits credentials and emits success with the server username', async () => {
    login.mockResolvedValue({ token: 'token-1', username: 'alice' })
    const wrapper = mount(LoginForm)

    const inputs = wrapper.findAll('input')
    await inputs[0].setValue('alice')
    await inputs[1].setValue('secret-password')
    await wrapper.get('form').trigger('submit')
    await flushPromises()

    expect(login).toHaveBeenCalledWith({ username: 'alice', password: 'secret-password' })
    expect(wrapper.emitted('success')?.[0]).toEqual(['alice'])
    expect(wrapper.find('.error-banner').exists()).toBe(false)
  })

  it('surfaces the classified server message and does not emit success', async () => {
    login.mockRejectedValue({ response: { status: 401, data: { message: '账号或密码错误' } } })
    const wrapper = mount(LoginForm)

    await wrapper.get('form').trigger('submit')
    await flushPromises()

    expect(wrapper.get('.error-banner').text()).toContain('账号或密码错误')
    expect(wrapper.emitted('success')).toBeUndefined()
  })

  it('falls back to a Chinese message for network failures', async () => {
    // axios 网络错误没有 response 属性，只有 config/code —— 之前会被误判成普通 Error。
    login.mockRejectedValue({ config: { url: '/auth/login' }, code: 'ERR_NETWORK', message: 'Network Error' })
    const wrapper = mount(LoginForm)

    await wrapper.get('form').trigger('submit')
    await flushPromises()

    expect(wrapper.get('.error-banner').text()).toContain('网络连接异常')
  })

  it('disables the submit button while the request is in flight', async () => {
    let resolveLogin!: (value: { token: string; username: string }) => void
    login.mockReturnValue(
      new Promise(resolve => {
        resolveLogin = resolve
      }),
    )
    const wrapper = mount(LoginForm)

    await wrapper.get('form').trigger('submit')
    await flushPromises()

    expect(wrapper.get('button[type="submit"]').attributes('disabled')).toBeDefined()

    resolveLogin({ token: 'token-1', username: 'alice' })
    await flushPromises()

    expect(wrapper.get('button[type="submit"]').attributes('disabled')).toBeUndefined()
  })
})
