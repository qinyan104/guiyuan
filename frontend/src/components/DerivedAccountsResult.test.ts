import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'

import type { DerivedAccount } from '../api/account'
import DerivedAccountsResult from './DerivedAccountsResult.vue'

const derivedAccounts: DerivedAccount[] = [
  {
    personDbId: 1,
    personName: '李明',
    username: 'liming',
    password: 'secret-1',
  },
]

describe('DerivedAccountsResult', () => {
  it('renders credentials and delegates copy/export/dismiss actions', async () => {
    const wrapper = mount(DerivedAccountsResult, {
      props: {
        show: true,
        deriving: false,
        accounts: derivedAccounts,
      },
    })

    expect(wrapper.text()).toContain('已创建 1 个账号')
    expect(wrapper.text()).toContain('李明')
    expect(wrapper.text()).toContain('liming')
    expect(wrapper.text()).toContain('secret-1')

    await wrapper.findAll('code').find(node => node.text() === 'liming')?.trigger('click')
    await wrapper.findAll('button').find(button => button.text() === '导出 Excel')?.trigger('click')
    await wrapper.get('.derive-dismiss').trigger('click')

    expect(wrapper.emitted('copy')?.[0]).toEqual(['liming'])
    expect(wrapper.emitted('export')).toHaveLength(1)
    expect(wrapper.emitted('dismiss')).toHaveLength(1)
  })

  it('shows an empty derived-result notice after deriving completes with no new accounts', () => {
    const wrapper = mount(DerivedAccountsResult, {
      props: {
        show: true,
        deriving: false,
        accounts: [],
      },
    })

    expect(wrapper.text()).toContain('无需派生')
  })
})
