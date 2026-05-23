import { describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import FeedbackStrip from './FeedbackStrip.vue'

describe('FeedbackStrip', () => {
  it('renders nothing when both messages are empty', () => {
    const wrapper = mount(FeedbackStrip, {
      props: { errorMessage: '', statusMessage: '' },
    })
    expect(wrapper.find('.feedback-strip').exists()).toBe(false)
  })

  it('shows error message with readable error label and error styling', () => {
    const wrapper = mount(FeedbackStrip, {
      props: { errorMessage: '保存失败', statusMessage: '' },
    })
    expect(wrapper.text()).toContain('保存失败')
    expect(wrapper.text()).toContain('需要处理')
    expect(wrapper.classes()).toContain('feedback-strip--error')
  })

  it('shows status message with readable success label without error styling', () => {
    const wrapper = mount(FeedbackStrip, {
      props: { errorMessage: '', statusMessage: '保存成功' },
    })
    expect(wrapper.text()).toContain('保存成功')
    expect(wrapper.text()).toContain('操作完成')
    expect(wrapper.classes()).not.toContain('feedback-strip--error')
  })

  it('shows error when both messages provided (error takes precedence)', () => {
    const wrapper = mount(FeedbackStrip, {
      props: { errorMessage: '错误优先', statusMessage: '状态消息' },
    })
    expect(wrapper.text()).toContain('错误优先')
    expect(wrapper.text()).not.toContain('状态消息')
    expect(wrapper.classes()).toContain('feedback-strip--error')
  })

  it('emits dismiss when close button is clicked', async () => {
    const onDismiss = vi.fn()
    const wrapper = mount(FeedbackStrip, {
      props: { errorMessage: '保存失败', statusMessage: '', onDismiss },
    })
    await wrapper.find('button').trigger('click')
    expect(onDismiss).toHaveBeenCalledTimes(1)
  })
})
