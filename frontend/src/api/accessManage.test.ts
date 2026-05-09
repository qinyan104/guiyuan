import { beforeEach, describe, expect, it, vi } from 'vitest'

import http from './http'
import { addAccessRecord, updateAccessRole, mergeBranch } from './accessManage'

vi.mock('./http', () => ({
  default: {
    post: vi.fn(),
    get: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}))

describe('accessManage API', () => {
  beforeEach(() => {
    vi.mocked(http.post).mockReset()
    vi.mocked(http.put).mockReset()
  })

  describe('addAccessRecord', () => {
    it('sends role and redactionProfile to the server', async () => {
      vi.mocked(http.post).mockResolvedValue({ data: { data: { id: 101 } } } as never)
      
      const result = await addAccessRecord(7, 42, 'VIEWER', '{"dates":"ALL"}')

      expect(http.post).toHaveBeenCalledWith('/publications/7/access', {
        userId: 42,
        role: 'VIEWER',
        redactionProfile: '{"dates":"ALL"}'
      })
      expect(result.id).toBe(101)
    })
  })

  describe('updateAccessRole', () => {
    it('sends updated role and redactionProfile to the server', async () => {
      vi.mocked(http.put).mockResolvedValue({ data: { data: undefined } } as never)
      
      await updateAccessRole(7, 42, 'VIEWER', '{"dates":"LIVING"}')

      expect(http.put).toHaveBeenCalledWith('/publications/7/access/42', {
        role: 'VIEWER',
        redactionProfile: '{"dates":"LIVING"}'
      })
    })
  })

  describe('mergeBranch', () => {
    beforeEach(() => {
      vi.mocked(http.post).mockResolvedValue({ data: { data: undefined } } as never)
    })

    it('posts to the branch merge endpoint', async () => {
      await mergeBranch(7, 'person-9')

      expect(http.post).toHaveBeenCalledWith('/publications/7/access/person-9/merge')
    })
  })
})
