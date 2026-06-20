import { describe, expect, it } from 'vitest'
import { createMemoryHistory, createRouter } from 'vue-router'
import { mount } from '@vue/test-utils'

import WorkbenchDirectionDetailView from './WorkbenchDirectionDetailView.vue'

describe('WorkbenchDirectionDetailView', () => {
  it('renders the requested direction in full-screen detail mode', async () => {
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [
        {
          path: '/design/workbench-directions/:directionId',
          name: 'workbench-direction-detail',
          component: WorkbenchDirectionDetailView,
        },
        {
          path: '/design/workbench-directions',
          name: 'workbench-direction-lab',
          component: { template: '<div />' },
        },
      ],
    })

    await router.push('/design/workbench-directions/pro')
    await router.isReady()

    const wrapper = mount(WorkbenchDirectionDetailView, {
      global: {
        plugins: [router],
      },
    })

    expect(wrapper.text()).toContain('专业修谱台')
    expect(wrapper.text()).toContain('这不是主题切换')
    expect(wrapper.text()).toContain('和当前版本的差距')
  })
})
