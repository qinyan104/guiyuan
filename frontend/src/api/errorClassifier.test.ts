import { describe, expect, it } from 'vitest'

import { classifyError, getUserErrorMessage } from './errorClassifier'

describe('classifyError', () => {
  it('classifies 401 as auth and keeps the server message', () => {
    const classified = classifyError({ response: { status: 401, data: { message: '登录已过期' } } })

    expect(classified.category).toBe('auth')
    expect(classified.userMessage).toBe('登录已过期')
    expect(classified.httpStatus).toBe(401)
    expect(classified.retryable).toBe(false)
  })

  it('classifies 403/404/409/500', () => {
    expect(classifyError({ response: { status: 403 } }).category).toBe('permission')
    expect(classifyError({ response: { status: 404 } }).category).toBe('not-found')
    expect(classifyError({ response: { status: 409 } }).category).toBe('conflict')
    expect(classifyError({ response: { status: 500 } }).category).toBe('server')
  })

  it('keeps the backend wording for publication conflicts so the version hint survives', () => {
    const classified = classifyError({
      response: { status: 409, data: { message: '族谱已被他人修改，当前版本 4' } },
      config: { method: 'put', url: '/publications/7' },
    })

    expect(classified.category).toBe('conflict')
    expect(classified.userMessage).toBe('族谱已被他人修改，当前版本 4')
  })

  // axios 在网络中断时不会赋值 response，这正是之前被误判成普通 Error 的场景。
  it('classifies a response-less axios network error as network with a Chinese message', () => {
    const classified = classifyError({
      config: { url: '/publications' },
      code: 'ERR_NETWORK',
      message: 'Network Error',
    })

    expect(classified.category).toBe('network')
    expect(classified.userMessage).toBe('网络连接异常，请检查网络后重试')
    expect(classified.retryable).toBe(true)
  })

  it('classifies timeouts explicitly', () => {
    const classified = classifyError({ code: 'ECONNABORTED', message: 'timeout of 10000ms exceeded' })

    expect(classified.category).toBe('network')
    expect(classified.userMessage).toBe('请求超时，请检查网络后重试')
  })

  it('falls back to unknown for plain errors, preserving their message', () => {
    const classified = classifyError(new Error('boom'))

    expect(classified.category).toBe('unknown')
    expect(classified.userMessage).toBe('boom')
    expect(classified.httpStatus).toBeUndefined()
  })
})

describe('getUserErrorMessage', () => {
  it('uses the fallback only when the server did not provide a message', () => {
    expect(getUserErrorMessage({ response: { status: 403 } }, '没有权限')).toBe('没有权限')
    expect(
      getUserErrorMessage({ response: { status: 403, data: { message: '仅超级管理员可操作' } } }, '没有权限'),
    ).toBe('仅超级管理员可操作')
  })
})
