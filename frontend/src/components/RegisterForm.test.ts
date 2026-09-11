import { flushPromises, mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const { register } = vi.hoisted(() => ({ register: vi.fn() }))

vi.mock('../api/auth', () => ({ register }))

import RegisterForm from './RegisterForm.vue'

async function fillForm(
  wrapper: ReturnType<typeof mount>,
  values: { username?: string; nickname?: string; password?: string; confirmPassword?: string },
) {
  const inputs = wrapper.findAll('input')
  if (values.username !== undefined) await inputs[0].setValue(values.username)
  if (values.nickname !== undefined) await inputs[1].setValue(values.nickname)
  if (values.password !== undefined) await inputs[2].setValue(values.password)
  if (values.confirmPassword !== undefined) await inputs[3].setValue(values.confirmPassword)
}

describe('RegisterForm', () => {
  beforeEach(() => {
    register.mockReset()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('blocks submission client-side when the username is too short', async () => {
    const wrapper = mount(RegisterForm)

    await fillForm(wrapper, { username: 'ab', password: 'password123', confirmPassword: 'password123' })
    await wrapper.get('form').trigger('submit')
    await flushPromises()

    expect(register).not.toHaveBeenCalled()
    expect(wrapper.get('.error-banner').text()).toContain('账号至少需要 3 个字符')
  })

  it('blocks submission when the passwords do not match', async () => {
    const wrapper = mount(RegisterForm)

    await fillForm(wrapper, { username: 'alice', password: 'password123', confirmPassword: 'password124' })
    await wrapper.get('form').trigger('submit')
    await flushPromises()

    expect(register).not.toHaveBeenCalled()
    expect(wrapper.get('.error-banner').text()).toContain('两次输入的密码不一致')
  })

  it('registers a valid user then emits success and switch after the confirmation delay', async () => {
    vi.useFakeTimers()
    register.mockResolvedValue(undefined)
    const wrapper = mount(RegisterForm)

    await fillForm(wrapper, { username: ' alice ', password: 'password123', confirmPassword: 'password123' })
    await wrapper.get('form').trigger('submit')
    await flushPromises()

    // 用户名去空格、空昵称转成 undefined
    expect(register).toHaveBeenCalledWith({
      username: 'alice',
      password: 'password123',
      nickname: undefined,
    })
    expect(wrapper.text()).toContain('注册成功，正在返回登录页')
    expect(wrapper.emitted('success')).toBeUndefined()

    await vi.advanceTimersByTimeAsync(1200)

    expect(wrapper.emitted('success')).toHaveLength(1)
    expect(wrapper.emitted('switch')).toHaveLength(1)
  })

  it('surfaces the classified server message when registration fails', async () => {
    register.mockRejectedValue({ response: { status: 400, data: { message: '用户名已存在' } } })
    const wrapper = mount(RegisterForm)

    await fillForm(wrapper, { username: 'alice', password: 'password123', confirmPassword: 'password123' })
    await wrapper.get('form').trigger('submit')
    await flushPromises()

    expect(wrapper.get('.error-banner').text()).toContain('用户名已存在')
    expect(wrapper.emitted('success')).toBeUndefined()
  })
})
