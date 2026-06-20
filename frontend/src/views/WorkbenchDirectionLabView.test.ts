import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'

import WorkbenchDirectionLabView from './WorkbenchDirectionLabView.vue'

describe('WorkbenchDirectionLabView', () => {
  it('renders three distinct direction cards and full-screen entry links', () => {
    const wrapper = mount(WorkbenchDirectionLabView, {
      global: {
        stubs: {
          RouterLink: {
            props: ['to'],
            template: '<a><slot /></a>',
          },
        },
      },
    })

    expect(wrapper.text()).toContain('典藏长卷')
    expect(wrapper.text()).toContain('专业修谱台')
    expect(wrapper.text()).toContain('家族共修台')
    expect(wrapper.text()).toContain('推荐先做')
    expect(wrapper.text()).toContain('全屏查看')
    expect(wrapper.findAll('.direction-card')).toHaveLength(3)
  })
})
