import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'

import ExportDialog from './ExportDialog.vue'

describe('ExportDialog', () => {
  it('shows only svg and share export tabs', () => {
    const wrapper = mount(ExportDialog, {
      props: {
        modelValue: true,
      },
    })

    const text = wrapper.text()

    expect(text).not.toContain('单页矢量 PDF')
    expect(text).not.toContain('谱书 PDF')
    expect(text).toContain('矢量 SVG')
    expect(text).toContain('分享网页')
  })
})
