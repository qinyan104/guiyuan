import { mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it } from 'vitest'

import WorkbenchOnboarding, { WORKBENCH_ONBOARDING_STORAGE_KEY } from './WorkbenchOnboarding.vue'

describe('WorkbenchOnboarding', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('shows the three essential canvas actions on a first visit', async () => {
    const wrapper = mount(WorkbenchOnboarding)
    await wrapper.vm.$nextTick()

    expect(wrapper.get('[data-testid="workbench-onboarding"]').text()).toContain('拖动画布')
    expect(wrapper.text()).toContain('选择一位族人')
    expect(wrapper.text()).toContain('编辑人物')
  })

  it('dismisses the guide and remembers the choice', async () => {
    const wrapper = mount(WorkbenchOnboarding)
    await wrapper.vm.$nextTick()

    await wrapper.get('button').trigger('click')

    expect(wrapper.find('[data-testid="workbench-onboarding"]').exists()).toBe(false)
    expect(localStorage.getItem(WORKBENCH_ONBOARDING_STORAGE_KEY)).toBe('1')
  })

  it('stays hidden after the guide was dismissed previously', async () => {
    localStorage.setItem(WORKBENCH_ONBOARDING_STORAGE_KEY, '1')

    const wrapper = mount(WorkbenchOnboarding)
    await wrapper.vm.$nextTick()

    expect(wrapper.find('[data-testid="workbench-onboarding"]').exists()).toBe(false)
  })
})
