import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import ShareLinkManager from './ShareLinkManager.vue'
import { listShareLinks, revokeShareLink } from '../api/shareManage'

vi.mock('../api/shareManage', () => ({
  createShareLink: vi.fn(),
  listShareLinks: vi.fn(),
  revokeShareLink: vi.fn(),
}))

describe('ShareLinkManager', () => {
  beforeEach(() => {
    vi.mocked(listShareLinks).mockReset()
    vi.mocked(revokeShareLink).mockReset()

    vi.mocked(listShareLinks).mockResolvedValue([
      {
        id: 8,
        status: 'ACTIVE',
        allowExport: false,
        expiresAt: null,
        createdAt: '2026-05-10T12:00:00Z',
        revokedAt: null,
        expired: false,
      },
    ])
    vi.mocked(revokeShareLink).mockResolvedValue()
  })

  it('requires explicit confirmation before revoking a share link', async () => {
    const wrapper = mount(ShareLinkManager, {
      props: { publicationId: 7 },
      attachTo: document.body,
    })

    await flushPromises()

    await wrapper.get('.btn--danger').trigger('click')
    await flushPromises()

    expect(revokeShareLink).not.toHaveBeenCalled()
    expect(document.body.textContent).toContain('确定要撤销此分享链接吗')

    await (document.body.querySelector('button[data-role="confirm"]') as HTMLElement).click()
    await flushPromises()

    expect(revokeShareLink).toHaveBeenCalledWith(7, 8)
  })
})
