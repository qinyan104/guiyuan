import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { nextTick } from 'vue'

import PublicationListView from './PublicationListView.vue'
import { deletePublication, listPublications, createPublication } from '../api/publication'
import { useLexiconStore } from '../stores/lexicon'

const push = vi.fn()

vi.mock('vue-router', () => ({
  useRouter: () => ({
    push,
  }),
}))

vi.mock('../api/publication', () => ({
  listPublications: vi.fn(),
  createPublication: vi.fn(),
  deletePublication: vi.fn(),
  updatePublicationMetadata: vi.fn(),
}))

function mountView() {
  return mount(PublicationListView, {
    global: {
      stubs: {
        Teleport: {
          template: '<div><slot /></div>',
        },
        ShareLinkManager: true,
        CollaboratorManager: true,
      },
    },
  })
}

describe('PublicationListView', () => {
  beforeEach(() => {
    localStorage.clear()
    setActivePinia(createPinia())
    push.mockReset()
    vi.mocked(listPublications).mockReset()
    vi.mocked(deletePublication).mockReset()
    vi.mocked(createPublication).mockReset()

    vi.mocked(listPublications).mockResolvedValue([
      {
        id: 7,
        revision: 1,
        title: '陈氏宗谱',
        subtitle: '测试卷',
        accessRole: 'OWNER',
        createdAt: '2026-05-10T12:00:00Z',
        updatedAt: '2026-05-15T12:00:00Z',
        lastUpdatedBy: 'alice',
        lastActivityAction: 'UPDATE_PUB',
        info: { hallName: '崇本堂', ancestralOrigin: '颍川' },
      },
      {
        id: 8,
        revision: 5,
        title: '李氏世家',
        subtitle: '陇西堂谱',
        accessRole: 'EDITOR',
        createdAt: '2026-05-11T12:00:00Z',
        updatedAt: '2026-05-12T12:00:00Z',
        lastUpdatedBy: 'bob',
        lastActivityAction: 'UPDATE_PUB',
        info: { hallName: '陇西堂', ancestralOrigin: '陇西' },
      },
    ])
    vi.mocked(deletePublication).mockResolvedValue()
    vi.mocked(createPublication).mockResolvedValue(99)
  })

  it('renders publication title, subtitle and tags', async () => {
    const wrapper = mountView()
    await flushPromises()

    expect(wrapper.text()).toContain('陈氏宗谱')
    expect(wrapper.text()).toContain('测试卷')
    expect(wrapper.text()).toContain('崇本堂')
    expect(wrapper.text()).toContain('颍川')
    expect(wrapper.text()).toContain('谱主')
    expect(wrapper.text()).toContain('协修')
  })

  it('filters publications by search query', async () => {
    const wrapper = mountView()
    await flushPromises()

    const searchInput = wrapper.find('.search-input')
    await searchInput.setValue('陇西')
    await flushPromises()

    expect(wrapper.text()).toContain('李氏世家')
    expect(wrapper.text()).not.toContain('陈氏宗谱')

    // Search query with no match
    await searchInput.setValue('不存在的堂号')
    await flushPromises()

    expect(wrapper.find('.search-empty-state').exists()).toBe(true)
    expect(wrapper.text()).toContain('未找到与 “不存在的堂号” 相关的族谱')

    // Clear search
    await wrapper.find('.clear-search-btn').trigger('click')
    await flushPromises()
    expect(wrapper.text()).toContain('陈氏宗谱')
    expect(wrapper.text()).toContain('李氏世家')
  })

  it('sorts publications correctly', async () => {
    const wrapper = mountView()
    await flushPromises()

    // Open AppSelect and pick "谱名拼音"
    await wrapper.find('.sort-select-wrapper .app-select__trigger').trigger('click')
    const options = wrapper.findAll('.app-select__option')
    const titleOption = options.find((opt) => opt.text().includes('谱名拼音'))
    expect(titleOption).toBeDefined()
    await titleOption!.trigger('click')
    await flushPromises()

    const titles = wrapper.findAll('.archive-title').map((el) => el.text())
    expect(titles).toEqual(['陈氏宗谱', '李氏世家'])

    // Open AppSelect and pick "修缮次数"
    await wrapper.find('.sort-select-wrapper .app-select__trigger').trigger('click')
    const optionsAfter = wrapper.findAll('.app-select__option')
    const revOption = optionsAfter.find((opt) => opt.text().includes('修缮次数'))
    expect(revOption).toBeDefined()
    await revOption!.trigger('click')
    await flushPromises()

    const revTitles = wrapper.findAll('.archive-title').map((el) => el.text())
    expect(revTitles).toEqual(['李氏世家', '陈氏宗谱'])
  })

  it('supports quick action shortcuts to book editor, stats, and activity', async () => {
    const wrapper = mountView()
    await flushPromises()

    const actionButtons = wrapper.findAll('.action-btn')
    // Find book editor button
    const bookBtn = actionButtons.find((btn) => btn.attributes('title') === '古籍印制排版')
    expect(bookBtn).toBeDefined()
    await bookBtn!.trigger('click')
    expect(push).toHaveBeenCalledWith({ name: 'book-editor-publication', params: { publicationId: 7 } })

    // Find activity button
    const actBtn = actionButtons.find((btn) => btn.attributes('title') === '编修历程')
    expect(actBtn).toBeDefined()
    await actBtn!.trigger('click')
    expect(push).toHaveBeenCalledWith({ name: 'publication-activity', params: { id: 7 } })

    // Find stats button
    const statsBtn = actionButtons.find((btn) => btn.attributes('title') === '世系统计')
    expect(statsBtn).toBeDefined()
    await statsBtn!.trigger('click')
    expect(push).toHaveBeenCalledWith({ name: 'publication-stats', params: { id: 7 } })
  })

  it('supports sample template preview and clone', async () => {
    const wrapper = mountView()
    await flushPromises()

    const previewBtn = wrapper.find('.template-sub-btn.preview-btn')
    expect(previewBtn.exists()).toBe(true)
    await previewBtn.trigger('click')
    expect(push).toHaveBeenCalledWith(expect.objectContaining({ name: 'sample-preview' }))

    const cloneBtn = wrapper.find('.template-sub-btn.clone-btn')
    expect(cloneBtn.exists()).toBe(true)
    await cloneBtn.trigger('click')
    await flushPromises()
    expect(createPublication).toHaveBeenCalled()
  })

  it('reactively adapts copy when lexicon switches', async () => {
    const lexiconStore = useLexiconStore()
    const wrapper = mountView()
    await flushPromises()

    // Default is standard
    expect(wrapper.text()).toContain('新建族谱')
    expect(wrapper.text()).toContain('经典世系范例')
    expect(wrapper.text()).toContain('我的族谱档案')

    // Switch to archive
    lexiconStore.setLexicon('archive')
    await flushPromises()
    await nextTick()

    expect(wrapper.text()).toContain('新建宗谱存档')
    expect(wrapper.text()).toContain('经典王朝世系模板')
    expect(wrapper.text()).toContain('私人研究档案')

    // Switch to shrine
    lexiconStore.setLexicon('shrine')
    await flushPromises()
    await nextTick()

    expect(wrapper.text()).toContain('开宗建牒')
    expect(wrapper.text()).toContain('先贤垂世世系')
    expect(wrapper.text()).toContain('宗祠谱牒名录')
  })

  it('requires explicit confirmation before deleting a publication', async () => {
    const wrapper = mountView()
    await flushPromises()

    // Click delete button
    await wrapper.get('.action-btn--danger').trigger('click')

    expect(deletePublication).not.toHaveBeenCalled()
    expect(wrapper.text()).toContain('确认删除')

    await wrapper.get('.delete-overlay .btn--danger').trigger('click')
    expect(deletePublication).toHaveBeenCalledWith(7)
  })

  it('shows visual loading indicator on the card and top progress bar when opening a publication', async () => {
    const wrapper = mountView()
    await flushPromises()

    const firstCard = wrapper.find('.archive-card')
    expect(firstCard.exists()).toBe(true)
    expect(wrapper.find('.view-top-progress').exists()).toBe(false)
    expect(firstCard.find('.card-loading-bar').exists()).toBe(false)

    // Click "进入编撰" button on the first card
    const enterBtn = firstCard.find('.action-btn--primary')
    await enterBtn.trigger('click')

    expect(push).toHaveBeenCalledWith({ name: 'workbench', params: { id: 7 } })
    expect(firstCard.classes()).toContain('archive-card--opening')
    expect(firstCard.find('.card-loading-bar').exists()).toBe(true)
    expect(wrapper.find('.view-top-progress').exists()).toBe(true)
    expect(firstCard.find('.action-btn--primary').text()).toContain('载入中...')
  })
})
