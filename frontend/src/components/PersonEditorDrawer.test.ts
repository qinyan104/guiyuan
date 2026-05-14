import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'

import PersonEditorDrawer from './PersonEditorDrawer.vue'
import type { Person } from '../types/family'

const person: Person = {
  id: 'p1',
  name: 'Alice',
  gender: 'female',
}

describe('PersonEditorDrawer', () => {
  it('does not render the removed person-detail entrypoint', () => {
    const wrapper = mount(PersonEditorDrawer, {
      props: {
        open: true,
        person,
        publicationId: 7,
        suggestion: '',
        lineageSuggestion: '',
        details: [],
        spouse: null,
        parents: [],
        children: [],
        childItems: [],
        canAddSpouse: true,
        hasCompleteParents: false,
        canSwapAdults: false,
        isSelectedBranchFocused: false,
        canSetBranchMode: false,
        branchMode: '',
        parentActionLabel: '新增父母',
        branchActionLabel: '设为当前宗支',
      },
      global: {
        stubs: {
          BranchMountManager: true,
          Transition: false,
        },
      },
    })

    expect(wrapper.find('.detail-link-zone').exists()).toBe(false)
  })
})
