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
  it('exposes one canvas toolbar and keeps validation feedback inline', async () => {
    const wrapper = mountPanels()

    const toolbar = wrapper.get('[role="toolbar"][aria-label="画布工具"]')
    await toolbar.get('button[aria-pressed="false"]:nth-of-type(3)').trigger('click')

    expect(wrapper.emitted('toggle-validation')).toHaveLength(1)
    expect(wrapper.find('.val-dialog-overlay').exists()).toBe(false)
  })
})
