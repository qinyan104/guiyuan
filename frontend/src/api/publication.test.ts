import { describe, expect, it, vi } from 'vitest'

vi.mock('./http', () => ({
  default: { get: vi.fn() },
}))

import http from './http'
import { getPublication } from './publication'

describe('getPublication', () => {
  it('forwards response download progress to the caller', async () => {
    vi.mocked(http.get).mockResolvedValue({
      data: {
        code: 200,
        data: { id: 7, revision: 1, publication: {}, settings: {} },
      },
    })
    const onDownloadProgress = vi.fn()

    await (getPublication as unknown as (
      id: number,
      onProgress: typeof onDownloadProgress,
    ) => Promise<unknown>)(7, onDownloadProgress)

    expect(http.get).toHaveBeenCalledWith('/publications/7', { onDownloadProgress })
  })
})
