import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import CommandKPalette from './CommandKPalette.vue'

const mockPush = vi.fn()
vi.mock('vue-router', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
  useRoute: () => ({
    name: 'dashboard',
    meta: {},
  }),
}))

vi.mock('../stores/ui', () => ({
  useUiStore: () => ({
    theme: 'slate',
    setTheme: vi.fn(),
  }),
}))

vi.mock('../composables/usePublicationState', () => ({
  usePublicationState: () => ({
    publications: {
      value: [
        {
          id: 10,
          title: '陈氏宗谱',
          subtitle: '卷一',
          revision: 1,
          updatedAt: '2026-05-10T12:00:00Z',
          info: { hallName: '崇本堂', ancestralOrigin: '颍川' },
        },
      ],
    },
  }),
}))

describe('CommandKPalette', () => {
  beforeEach(() => {
    mockPush.mockReset()
  })

  function mountComponent() {
    return mount(CommandKPalette, { attachTo: document.body })
  }

  it('opens palette when Ctrl+K is pressed', async () => {
    mountComponent()

    window.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'k', ctrlKey: true, bubbles: true })
    )
    await flushPromises()

    const input = document.querySelector('.command-input') as HTMLInputElement
    expect(input).not.toBeNull()
    expect(input.placeholder).toContain('输入指令、搜索宗谱、切换主题')
    expect(document.body.textContent).toContain('新建宗谱存档')
    expect(document.body.textContent).toContain('陈氏宗谱')
  })

  it('filters commands when query is typed', async () => {
    mountComponent()

    window.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'k', ctrlKey: true, bubbles: true })
    )
    await flushPromises()

    const input = document.querySelector('.command-input') as HTMLInputElement
    expect(input).not.toBeNull()

    input.value = '古籍'
    input.dispatchEvent(new Event('input'))
    await flushPromises()

    expect(document.body.textContent).toContain('古籍活字排版编辑器')
  })

  it('executes command action on click', async () => {
    mountComponent()

    window.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'k', ctrlKey: true, bubbles: true })
    )
    await flushPromises()

    const items = document.querySelectorAll('.command-item')
    expect(items.length).toBeGreaterThan(0)

    const firstItem = items[0] as HTMLElement
    firstItem.click()
    await flushPromises()

    expect(mockPush).toHaveBeenCalledWith('/dashboard/publications')
  })
})
