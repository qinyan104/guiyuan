import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'

import { samplePublication } from '../data/sampleFamily'
import KinshipCalculatorDialog from './KinshipCalculatorDialog.vue'

describe('KinshipCalculatorDialog', () => {
  it('frames the calculation around the caller and the person being addressed', () => {
    const wrapper = mount(KinshipCalculatorDialog, {
      props: { publication: samplePublication },
      global: {
        stubs: {
          Teleport: true,
        },
      },
    })

    expect(wrapper.get('h2').text()).toBe('亲属关系')
    expect(wrapper.text()).toContain('称呼者')
    expect(wrapper.text()).toContain('被称呼者')
  })
})
