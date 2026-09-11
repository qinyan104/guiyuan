import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'

import PersonAccountsHeader from './PersonAccountsHeader.vue'

describe('PersonAccountsHeader', () => {
  it('renders summary, action states and delegates actions', async () => {
    const wrapper = mount(PersonAccountsHeader, {
      props: {
        totalAccounts: 12,
        aliveAccounts: 9,
        loading: false,
        deriving: false,
        cleaningOrphans: false,
        error: '加载失败',
      },
    })

    expect(wrapper.text()).toContain('族人账号')
    expect(wrapper.text()).toContain('12 人')
    expect(wrapper.text()).toContain('9')
    expect(wrapper.text()).toContain('加载失败')

    await wrapper.findAll('button').find(button => button.text().includes('派生账号'))?.trigger('click')
    await wrapper.findAll('button').find(button => button.text().includes('清理空悬账号'))?.trigger('click')
    await wrapper.get('.error-dismiss').trigger('click')

    expect(wrapper.emitted('derive')).toHaveLength(1)
    expect(wrapper.emitted('cleanup-orphans')).toHaveLength(1)
    expect(wrapper.emitted('dismiss-error')).toHaveLength(1)
  })

  it('disables actions while busy and hides summary when no accounts exist', () => {
    const wrapper = mount(PersonAccountsHeader, {
      props: {
        totalAccounts: 0,
        aliveAccounts: 0,
        loading: false,
        deriving: true,
        cleaningOrphans: true,
        error: null,
      },
    })

    expect(wrapper.text()).not.toContain('人在世')
    expect(wrapper.text()).toContain('派生中')
    expect(wrapper.text()).toContain('清理中')
    expect(wrapper.findAll('button').filter(button => button.attributes('disabled') !== undefined)).toHaveLength(2)
  })
})
