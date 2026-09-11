import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import { nextTick } from 'vue'

import type { AccessRecord } from '../api/accessManage'
import AppSelect from './AppSelect.vue'
import CollaboratorList from './CollaboratorList.vue'

const records: AccessRecord[] = [
  {
    id: 1,
    userId: 10,
    username: 'owner',
    nickname: 'Owner',
    role: 'OWNER',
    createdAt: '2026-05-10T12:00:00Z',
  },
  {
    id: 2,
    userId: 11,
    username: 'viewer',
    nickname: 'Viewer',
    role: 'VIEWER',
    redactionProfile: '{"dates":"LIVING","note":"NONE","photo":"ALL"}',
    createdAt: '2026-05-10T12:00:00Z',
  },
]

describe('CollaboratorList', () => {
  it('renders collaborators and delegates role, privacy and removal actions', async () => {
    const wrapper = mount(CollaboratorList, {
      props: { records, loading: false },
      global: {
        stubs: {
          Teleport: { template: '<div><slot /></div>' },
        },
      },
    })

    expect(wrapper.text()).toContain('协作者 (2)')
    expect(wrapper.text()).toContain('Owner')
    expect(wrapper.text()).toContain('所有者')
    expect(wrapper.text()).toContain('隐私脱敏')

    const selects = wrapper.findAllComponents(AppSelect)
    selects[0].vm.$emit('change', 'EDITOR')
    selects[1].vm.$emit('change', 'ALL')
    await nextTick()

    await wrapper.get('.btn--danger').trigger('click')

    expect(wrapper.emitted('role-change')?.[0]).toEqual([records[1], 'EDITOR'])
    expect(wrapper.emitted('profile-change')?.[0]).toEqual([records[1], 'dates', 'ALL'])
    expect(wrapper.emitted('remove')?.[0]).toEqual([records[1]])
  })

  it('shows loading and empty states', () => {
    const loadingWrapper = mount(CollaboratorList, { props: { records: [], loading: true } })
    expect(loadingWrapper.text()).toContain('加载中')

    const emptyWrapper = mount(CollaboratorList, { props: { records: [], loading: false } })
    expect(emptyWrapper.text()).toContain('暂无协作者')
  })
})
