import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import { nextTick } from 'vue'

import AppSelect from './AppSelect.vue'
import CollaboratorInvitePanel from './CollaboratorInvitePanel.vue'
import type { UserSearchResult } from '../api/accessManage'

const users: UserSearchResult[] = [{ id: 2, username: 'editor', nickname: 'Editor' }]

describe('CollaboratorInvitePanel', () => {
  it('delegates search, selection, role and add interactions to its parent', async () => {
    const wrapper = mount(CollaboratorInvitePanel, {
      props: {
        searchQuery: '',
        searchResults: users,
        selectedUser: null,
        newRole: 'EDITOR',
        searching: false,
        adding: false,
      },
      global: {
        stubs: {
          Teleport: { template: '<div><slot /></div>' },
        },
      },
    })

    await wrapper.get('.role-guide-toggle').trigger('click')
    expect(wrapper.text()).toContain('编辑者可修改族谱内容')

    await wrapper.get('.search-input').setValue('edit')
    expect(wrapper.emitted('update:searchQuery')?.[0]).toEqual(['edit'])
    expect(wrapper.emitted('search-input')).toHaveLength(1)

    await wrapper.get('.search-item').trigger('click')
    expect(wrapper.emitted('select-user')?.[0]).toEqual([users[0]])

    wrapper.findComponent(AppSelect).vm.$emit('update:modelValue', 'VIEWER')
    await nextTick()
    expect(wrapper.emitted('update:newRole')?.[0]).toEqual(['VIEWER'])
  })

  it('renders a selected user chip and emits clear/add events', async () => {
    const wrapper = mount(CollaboratorInvitePanel, {
      props: {
        searchQuery: '',
        searchResults: [],
        selectedUser: users[0],
        newRole: 'VIEWER',
        searching: false,
        adding: false,
      },
    })

    expect(wrapper.text()).toContain('Editor')
    expect(wrapper.text()).toContain('@editor')

    await wrapper.get('.chip-remove').trigger('click')
    await wrapper.get('.btn--primary').trigger('click')

    expect(wrapper.emitted('clear-selected-user')).toHaveLength(1)
    expect(wrapper.emitted('add')).toHaveLength(1)
  })
})
