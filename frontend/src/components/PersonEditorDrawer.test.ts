import { flushPromises, mount } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'
import http from '../api/http'
import * as photoApi from '../api/photo'

import PersonEditorDrawer from './PersonEditorDrawer.vue'
import type { Person } from '../types/family'
import { stubObjectUrl } from '../test-utils/objectUrl'

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
    expect(wrapper.findAll('button').some(button => button.text().includes('查看详情页'))).toBe(false)
  })

  it('renders contextual chips when kinship or lineage suggestion is available', async () => {
    const get = vi.spyOn(http, 'get').mockResolvedValue({ data: new Blob() })
    const upload = vi.spyOn(photoApi, 'uploadPhoto').mockResolvedValue(42)
    const objectUrl = stubObjectUrl(() => 'blob:editor')
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
    try {
      const input = wrapper.get('input[type="file"]')
      Object.defineProperty(input.element, 'files', {
        value: [new File(['photo'], 'photo.png', { type: 'image/png' })],
      })
      await input.trigger('change')
      await flushPromises()
      expect(wrapper.emitted('update-person-field')?.[0]).toEqual([{ field: 'avatarUrl', value: '/api/photos/42' }])
      await wrapper.setProps({ person: { ...person, avatarUrl: '/api/photos/42' } })
      await flushPromises()
      expect(wrapper.get('.ped-avatar-img').attributes('src')).toBe('blob:editor')
      expect(wrapper.props('person').avatarUrl).toBe('/api/photos/42')
    } finally {
      wrapper.unmount()
      get.mockRestore()
      upload.mockRestore()
      objectUrl.restore()
    }
  })
})
