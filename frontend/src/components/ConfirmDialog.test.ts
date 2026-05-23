import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import { afterEach, describe, expect, it, vi } from 'vitest'
import ConfirmDialog from './ConfirmDialog.vue'

describe('ConfirmDialog', () => {
  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('emits confirm and cancel separately', async () => {
    const onConfirm = vi.fn()
    const onCancel = vi.fn()
    const wrapper = mount(ConfirmDialog, {
      props: { modelValue: true, title: 'Delete', message: 'Are you sure?', onConfirm, onCancel },
      attachTo: document.body,
    })

    await nextTick()
    const confirmButton = document.body.querySelector<HTMLButtonElement>('button[data-role="confirm"]')
    expect(confirmButton).not.toBeNull()
    confirmButton?.click()
    await nextTick()
    expect(onConfirm).toHaveBeenCalledTimes(1)

    await wrapper.setProps({ modelValue: true })
    await nextTick()
    const cancelButton = document.body.querySelector<HTMLButtonElement>('button[data-role="cancel"]')
    expect(cancelButton).not.toBeNull()
    cancelButton?.click()
    await nextTick()
    expect(onCancel).toHaveBeenCalledTimes(1)
  })

  it('uses readable default Chinese action labels', () => {
    const wrapper = mount(ConfirmDialog, {
      props: { modelValue: true, title: '删除确认', message: '确定删除吗？' },
      attachTo: document.body,
    })

    expect(document.body.querySelector<HTMLButtonElement>('button[data-role="cancel"]')?.textContent?.trim()).toBe('取消')
    expect(document.body.querySelector<HTMLButtonElement>('button[data-role="confirm"]')?.textContent?.trim()).toBe('确认')
    wrapper.unmount()
  })

  it('does not render when modelValue is false', () => {
    const wrapper = mount(ConfirmDialog, {
      props: { modelValue: false, title: 'Delete', message: '' },
    })
    expect(wrapper.find('.confirm-overlay').exists()).toBe(false)
  })
})
