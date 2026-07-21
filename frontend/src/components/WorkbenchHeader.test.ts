import { mount } from '@vue/test-utils'
import { ref } from 'vue'
import { afterEach, describe, expect, it, vi } from 'vitest'

import WorkbenchHeader from './WorkbenchHeader.vue'
import { PUBLICATION_CONTEXT_KEY } from '../types/family'

const push = vi.fn()

vi.mock('vue-router', () => ({
  useRoute: () => ({ params: { id: '7' } }),
  useRouter: () => ({ push }),
}))

function mountHeader() {
  return mount(WorkbenchHeader, {
    props: {
      currentUsername: 'root',
      syncStatus: 'saved',
    },
    global: {
      provide: {
        [PUBLICATION_CONTEXT_KEY as symbol]: {
          currentAccessRole: ref('OWNER'),
          serverPublicationId: ref(42),
        },
      },
      stubs: {
        DarkModeToggle: true,
        CollaboratorManager: true,
        ExportDialog: true,
        Teleport: {
          template: '<div><slot /></div>',
        },
      },
    },
  })
}

describe('WorkbenchHeader', () => {
  afterEach(() => {
    push.mockReset()
  })

  it('opens and closes the research menu on click and outside click', async () => {
    const wrapper = mountHeader()

    await wrapper.findAll('.dropdown-trigger')[0].trigger('click')
    expect(wrapper.text()).toContain('导入 JSON')

    document.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    await wrapper.vm.$nextTick()

    expect(wrapper.text()).not.toContain('导入 JSON')
  })

  it('closes open menus when Escape is pressed', async () => {
    const wrapper = mountHeader()

    await wrapper.findAll('.dropdown-trigger')[1].trigger('click')
    expect(wrapper.text()).toContain('出版排版')

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
    await wrapper.vm.$nextTick()

    expect(wrapper.text()).not.toContain('出版排版')
  })

  it('groups the four primary genealogy tools', () => {
    const wrapper = mountHeader()
    const group = wrapper.get('[role="group"][aria-label="谱系工具"]')

    expect(group.text()).toContain('统计')
    expect(group.text()).toContain('时间线')
    expect(group.text()).toContain('导入')
    expect(group.text()).toContain('导出')
  })
})
