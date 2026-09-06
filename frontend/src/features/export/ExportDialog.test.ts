import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'

import ExportDialog from './ExportDialog.vue'

describe('ExportDialog', () => {
  it('keeps png, svg and share tabs and emits their actions', async () => {
    const wrapper = mount(ExportDialog, {
      props: {
        modelValue: true,
      },
    })

    const tabLabels = wrapper.findAll('.tab-btn').map((button) => button.text())
    expect(tabLabels).toEqual(['PNG 图片', '矢量 SVG', '分享网页'])

    const text = wrapper.text()
    expect(text).not.toContain('单页矢量 PDF')
    expect(text).not.toContain('谱书 PDF')

    await wrapper.get('.btn.btn--primary').trigger('click')
    expect(wrapper.emitted('export-png')).toEqual([[{ theme: 'paper', quality: 'hd' }]])

    // Switch to standard quality
    const standardBtn = wrapper.findAll('.quality-card').find(b => b.text().includes('便携传输'))
    await standardBtn?.trigger('click')
    await wrapper.get('.btn.btn--primary').trigger('click')
    expect(wrapper.emitted('export-png')?.[1]).toEqual([{ theme: 'paper', quality: 'standard' }])

    await wrapper.get('.tab-btn:nth-child(2)').trigger('click')
    // Select pine theme in svg tab
    const pineBtn = wrapper.findAll('.theme-pill-btn').find(b => b.text().includes('松绿'))
    await pineBtn?.trigger('click')
    await wrapper.get('.btn.btn--primary').trigger('click')
    expect(wrapper.emitted('export-svg')).toEqual([[{ theme: 'pine' }]])

    await wrapper.get('.tab-btn:nth-child(3)').trigger('click')
    await wrapper.get('.share-password-input').setValue('secret123')
    await wrapper.get('.btn.btn--primary').trigger('click')

    expect(wrapper.emitted('export-share-html')).toEqual([[{ password: 'secret123', theme: 'pine' }]])
  })

  it('shows large genealogy alert when personCount or dimensions are high', () => {
    const wrapper = mount(ExportDialog, {
      props: {
        modelValue: true,
        personCount: 68,
        layoutWidth: 8000,
        layoutHeight: 2000,
      },
    })

    expect(wrapper.find('.scale-warning-card').exists()).toBe(true)
    expect(wrapper.text()).toContain('当前族谱规模较大（共 68 人）')
    expect(wrapper.text()).toContain('矢量 SVG')
  })
})
