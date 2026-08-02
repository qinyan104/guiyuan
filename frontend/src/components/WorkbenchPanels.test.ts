import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'

import { defaultSettings } from '../data/sampleFamily'
import WorkbenchPanels from './WorkbenchPanels.vue'

function mountPanels() {
  return mount(WorkbenchPanels, {
    props: {
      layoutPanelOpen: false,
      historyOpen: false,
      validationOpen: false,
      pubId: 1,
      focusFamilyLabel: '朱氏主谱',
      canReturnToMainBranch: false,
      canUndo: false,
      canRedo: false,
      zoom: 1,
      hasSelectedPerson: false,
      selectedPersonName: '',
      selectedPersonMeta: '',
      relationshipToSelected: null,
      canFocusSelectedBranch: false,
      settings: { ...defaultSettings },
      historyPastCount: 0,
      historyFutureCount: 0,
      visibleHistoryEntries: [],
    },
    global: {
      stubs: {
        AppSelect: true,
        ValidationPanel: true,
        Teleport: true,
      },
    },
  })
}

describe('WorkbenchPanels', () => {
  it('updates the card corner radius from the layout panel', async () => {
    const wrapper = mountPanels()
    await wrapper.setProps({ layoutPanelOpen: true })

    const field = wrapper.findAll('.lp-field').find((item) => item.text().includes('卡片圆角'))
    expect(field).toBeDefined()

    await field!.get('input[type="range"]').setValue(12)
    expect(wrapper.emitted('update-settings')).toContainEqual([{ cardRadius: 12 }])
  })

  it('exposes one canvas toolbar and shows validation feedback in a dialog', async () => {
    const wrapper = mountPanels()

    const toolbar = wrapper.get('[role="toolbar"][aria-label="画布工具"]')
    await toolbar.get('button[aria-pressed="false"]:nth-of-type(3)').trigger('click')

    expect(wrapper.emitted('toggle-validation')).toHaveLength(1)

    await wrapper.setProps({ validationOpen: true })

    const dialog = wrapper.get('.validation-dialog-window')
    expect(wrapper.find('.validation-panel-section').exists()).toBe(false)
    expect(wrapper.find('.validation-dialog-overlay').exists()).toBe(true)
    expect(dialog.attributes('role')).toBe('dialog')
    expect(dialog.attributes('aria-modal')).toBe('true')
  })

  it('closes the validation dialog before locating a finding on the canvas', async () => {
    const wrapper = mountPanels()

    await wrapper.setProps({ validationOpen: true })
    await wrapper.getComponent({ name: 'ValidationPanel' }).vm.$emit('locate-person', 'p2')

    expect(wrapper.emitted('close-validation')).toHaveLength(1)
    expect(wrapper.emitted('locate-person')).toEqual([['p2']])
  })
})
