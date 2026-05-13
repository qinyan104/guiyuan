import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'

import ExportDialog from './ExportDialog.vue'

describe('ExportDialog', () => {
  it('keeps only svg and share tabs and emits their actions', async () => {
    const wrapper = mount(ExportDialog, {
      props: {
        modelValue: true,
      },
    })

    const tabLabels = wrapper.findAll('.tab-btn').map((button) => button.text())
    expect(tabLabels).toEqual(['矢量 SVG', '分享网页'])

    const text = wrapper.text()
    expect(text).not.toContain('单页矢量 PDF')
    expect(text).not.toContain('谱书 PDF')

    await wrapper.get('.btn.btn--primary').trigger('click')
    expect(wrapper.emitted('export-svg')).toHaveLength(1)

    await wrapper.get('.tab-btn:nth-child(2)').trigger('click')
    await wrapper.get('.share-password-input').setValue('secret123')
    await wrapper.get('.btn.btn--primary').trigger('click')

    expect(wrapper.emitted('export-share-html')).toEqual([[{ password: 'secret123' }]])
  })
})
