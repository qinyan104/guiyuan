import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'

import AccountStatusState from './AccountStatusState.vue'

describe('AccountStatusState', () => {
  it('shows loading state', () => {
    const wrapper = mount(AccountStatusState, {
      props: { loading: true, hasError: false, isEmpty: false },
    })

    expect(wrapper.text()).toContain('加载账号列表')
    expect(wrapper.find('.spinner').exists()).toBe(true)
  })

  it('shows empty state only when not loading and no error exists', () => {
    const wrapper = mount(AccountStatusState, {
      props: { loading: false, hasError: false, isEmpty: true },
    })

    expect(wrapper.text()).toContain('还没有账号')

    const hiddenWrapper = mount(AccountStatusState, {
      props: { loading: false, hasError: true, isEmpty: true },
    })

    expect(hiddenWrapper.text()).toBe('')
  })
})
