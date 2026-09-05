import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import AuditLogView from './AuditLogView.vue'
import { listLogs } from '../api/audit'

vi.mock('../api/audit', () => ({
  listLogs: vi.fn(),
  addLog: vi.fn(),
}))

const mockLogs = [
  {
    id: 101,
    username: 'alice',
    action: 'CREATE_PUB',
    detail: '创建族谱「李氏宗谱」',
    createdAt: new Date().toISOString(), // Today
  },
  {
    id: 102,
    username: 'admin',
    action: 'ADMIN_CREATE_USER',
    detail: '创建用户「bob」角色=USER',
    createdAt: new Date().toISOString(), // Today
  },
  {
    id: 103,
    username: 'system',
    action: 'BACKUP',
    detail: '数据库备份 成功',
    createdAt: '2026-05-01T10:00:00Z', // Past day
  },
]

describe('AuditLogView', () => {
  beforeEach(() => {
    vi.mocked(listLogs).mockReset()
    vi.mocked(listLogs).mockResolvedValue([...mockLogs])
  })

  it('loads and displays logs with classical action narrative tags', async () => {
    const wrapper = mount(AuditLogView)
    await flushPromises()

    expect(listLogs).toHaveBeenCalledWith(0, 50)

    const text = wrapper.text()
    // Should render classical action badges instead of raw English action names
    expect(text).toContain('起草立谱')
    expect(text).toContain('延纳编委')
    expect(text).toContain('全阁归档')
    expect(text).not.toContain('ADMIN_CREATE_USER')

    // Should display usernames
    expect(text).toContain('alice')
    expect(text).toContain('admin')
    expect(text).toContain('system')

    // Should display details cleanly
    expect(text).toContain('创建族谱「李氏宗谱」')
  })

  it('filters logs by search query', async () => {
    const wrapper = mount(AuditLogView)
    await flushPromises()

    const searchInput = wrapper.get('.search-input')
    await searchInput.setValue('李氏宗谱')
    await flushPromises()

    expect(wrapper.text()).toContain('起草立谱')
    expect(wrapper.text()).not.toContain('延纳编委')
    expect(wrapper.text()).not.toContain('全阁归档')
  })

  it('filters logs by category tab', async () => {
    const wrapper = mount(AuditLogView)
    await flushPromises()

    // Click on "编委职官" tab
    const tabs = wrapper.findAll('.glass-tab')
    const userTab = tabs.find((t) => t.text().includes('编委职官'))
    expect(userTab).toBeDefined()
    await userTab!.trigger('click')
    await flushPromises()

    expect(wrapper.text()).toContain('延纳编委')
    expect(wrapper.text()).not.toContain('起草立谱')
    expect(wrapper.text()).not.toContain('全阁归档')
  })

  it('groups logs by day with section headers', async () => {
    const wrapper = mount(AuditLogView)
    await flushPromises()

    const dayHeaders = wrapper.findAll('.day-header')
    expect(dayHeaders.length).toBeGreaterThanOrEqual(2)
    expect(dayHeaders[0].text()).toContain('今日')
    expect(dayHeaders[1].text()).toContain('2026年5月1日')
  })

  it('supports loading more logs', async () => {
    // Return a full page of 50 items to enable hasMore
    const fullPage = Array.from({ length: 50 }, (_, i) => ({
      id: i + 1,
      username: 'user' + i,
      action: 'LOGIN',
      detail: '',
      createdAt: '2026-05-02T10:00:00Z',
    }))
    vi.mocked(listLogs).mockResolvedValueOnce(fullPage)

    const wrapper = mount(AuditLogView)
    await flushPromises()

    const loadMoreBtn = wrapper.find('.load-more-btn')
    expect(loadMoreBtn.exists()).toBe(true)

    vi.mocked(listLogs).mockResolvedValueOnce([
      {
        id: 999,
        username: 'elder',
        action: 'LOGOUT',
        detail: '',
        createdAt: '2026-05-01T08:00:00Z',
      },
    ])

    await loadMoreBtn.trigger('click')
    await flushPromises()

    expect(listLogs).toHaveBeenCalledWith(1, 50)
    expect(wrapper.text()).toContain('elder')
  })
})
