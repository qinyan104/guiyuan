import { beforeEach, describe, expect, it, vi } from 'vitest'

import http from './http'
import { mergeBranch } from './accessManage'

vi.mock('./http', () => ({
  default: {
    post: vi.fn(),
    get: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}))

describe('mergeBranch', () => {
  beforeEach(() => {
    vi.mocked(http.post).mockReset()
    vi.mocked(http.post).mockResolvedValue({ data: { data: undefined } } as never)
  })

  it('posts to the branch merge endpoint', async () => {
    await mergeBranch(7, 'person-9')

    expect(http.post).toHaveBeenCalledWith('/publications/7/access/person-9/merge')
  })
})
