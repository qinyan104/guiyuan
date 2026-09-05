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

    expect(wrapper.text()).not.toContain('查看详情页')
    expect(wrapper.find('.detail-link-zone').exists()).toBe(false)
    expect(
      wrapper.findAll('button').some((button) => button.text().includes('查看详情页')),
    ).toBe(false)
  })

  it('renders contextual chips when kinship or lineage suggestion is available', () => {
    const wrapper = mount(PersonEditorDrawer, {
      props: {
        open: true,
        person,
        publicationId: 7,
        kinshipLabel: '第十五世',
        suggestion: '建议补录卒年',
        lineageSuggestion: '长房',
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
          Teleport: {
            template: '<div><slot /></div>',
          },
        },
      },
    })

    expect(wrapper.text()).toContain('第十五世')
    expect(wrapper.text()).toContain('长房')
    expect(wrapper.text()).not.toContain('当前人物')
    expect(wrapper.text()).not.toContain('建议补录卒年')
  })
})
