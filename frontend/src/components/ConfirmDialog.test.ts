import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import ConfirmDialog from './ConfirmDialog.vue'

describe('ConfirmDialog', () => {
  it('emits confirm and cancel separately', async () => {
    const wrapper = mount(ConfirmDialog, {
      props: { modelValue: true, title: 'Delete', message: 'Are you sure?' },
      global: {
        stubs: {
          Teleport: {
            template: '<div><slot /></div>',
          },
        },
      },
    })

    await wrapper.get('button[data-role="confirm"]').trigger('click')
    expect(wrapper.emitted('confirm')).toHaveLength(1)

    await wrapper.get('button[data-role="cancel"]').trigger('click')
    expect(wrapper.emitted('cancel')).toHaveLength(1)
    expect(wrapper.emitted('update:modelValue')?.[1]).toEqual([false])
  })

  it('does not render when modelValue is false', () => {
    const wrapper = mount(ConfirmDialog, {
      props: { modelValue: false, title: 'Delete', message: '' },
    })
    expect(wrapper.find('.confirm-overlay').exists()).toBe(false)
  })
})
