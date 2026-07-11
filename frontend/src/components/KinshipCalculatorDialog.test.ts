import { mount } from '@vue/test-utils'
import type { VueWrapper } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'

import { samplePublication } from '../data/sampleFamily'
import KinshipCalculatorDialog from './KinshipCalculatorDialog.vue'

async function selectFirstSearchResult(wrapper: VueWrapper, query: string) {
  const input = wrapper.get('input.kinship-selector__input')
  await input.trigger('focus')
  await input.setValue(query)
  await wrapper.get('.kinship-dropdown__item').trigger('mousedown')
}

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

  it('prefills the caller from the selected canvas person', () => {
    const wrapper = mount(KinshipCalculatorDialog, {
      props: { publication: samplePublication, egoPersonId: 'p7' },
      global: {
        stubs: {
          Teleport: true,
        },
      },
    })

    expect(wrapper.text()).toContain('朱允炆')
    expect(wrapper.findAll('input.kinship-selector__input')).toHaveLength(1)
  })

  it('labels in-law relationships without falling back to maternal bloodline text', async () => {
    const wrapper = mount(KinshipCalculatorDialog, {
      props: { publication: samplePublication, egoPersonId: 'p7' },
      global: {
        stubs: {
          Teleport: true,
        },
      },
    })

    await selectFirstSearchResult(wrapper, '徐皇后')

    expect(wrapper.get('.kinship-result__term').text()).toBe('婶婶')
    expect(wrapper.text()).toContain('姻亲关系')
    expect(wrapper.text()).not.toContain('母系亲属')
    expect(wrapper.find('.kinship-path-node--spouse').exists()).toBe(true)
  })

  it('shows the supported kinship term coverage in the dialog', () => {
    const wrapper = mount(KinshipCalculatorDialog, {
      props: { publication: samplePublication },
      global: {
        stubs: {
          Teleport: true,
        },
      },
    })

    expect(wrapper.text()).toContain('称谓覆盖')
    expect(wrapper.text()).toContain('外甥女')
    expect(wrapper.text()).toContain('婶婶')
  })
})
