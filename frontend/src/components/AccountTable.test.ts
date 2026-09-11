import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'

import type { PersonAccountRow } from '../api/account'
import AccountTable from './AccountTable.vue'

const accounts: PersonAccountRow[] = [
  {
    personDbId: 1,
    personName: '李明',
    gender: 'male',
    deceased: false,
    accountStatus: 'active',
    username: 'liming',
  },
  {
    personDbId: 2,
    personName: '李华',
    gender: 'female',
    deceased: false,
    accountStatus: null,
    username: null,
  },
]

describe('AccountTable', () => {
  it('emits selection and account action events without owning account state', async () => {
    const wrapper = mount(AccountTable, {
      props: {
        accounts,
        selectedIds: new Set([1]),
        isAllSelected: false,
        selectableCount: 1,
        batchDeleting: false,
      },
    })

    expect(wrapper.text()).toContain('李明')
    expect(wrapper.text()).toContain('liming')
    expect(wrapper.text()).toContain('待派生')
    expect(wrapper.text()).toContain('已选 1 项')

    await wrapper.get('.account-table-head input[type="checkbox"]').trigger('change')
    expect(wrapper.emitted('toggle-all')).toHaveLength(1)

    await wrapper.findAll('.account-table-row input[type="checkbox"]')[0].trigger('change')
    expect(wrapper.emitted('toggle-account')?.[0]).toEqual([accounts[0]])

    await wrapper
      .findAll('button')
      .find(button => button.text() === '重置密码')
      ?.trigger('click')
    await wrapper
      .findAll('button')
      .find(button => button.text() === '停用')
      ?.trigger('click')
    await wrapper
      .findAll('button')
      .find(button => button.text() === '删除')
      ?.trigger('click')

    expect(wrapper.emitted('reset-password')?.[0]).toEqual([accounts[0]])
    expect(wrapper.emitted('toggle-status')?.[0]).toEqual([accounts[0]])
    expect(wrapper.emitted('delete-account')?.[0]).toEqual([accounts[0]])
  })
})
