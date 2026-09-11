import { describe, expect, it, vi } from 'vitest'

vi.mock('./http', () => ({
  default: { get: vi.fn() },
  unwrapApiResponse: async (promise: Promise<{ data: { code: number; message?: string; data: unknown } }>) => {
    const resp = await promise
    if (resp.data.code !== 200) throw new Error(resp.data.message || '操作失败')
    return resp.data.data
  },
}))

import http from './http'
import { defaultSettings, samplePublication } from '../data/sampleFamily'
import { getPublication } from './publication'

describe('getPublication', () => {
  it('forwards response download progress to the caller', async () => {
    vi.mocked(http.get).mockResolvedValue({
      data: {
        code: 200,
        data: { id: 7, revision: 1, publication: samplePublication, settings: defaultSettings },
      },
    })
    const onDownloadProgress = vi.fn()

    await (getPublication as unknown as (id: number, onProgress: typeof onDownloadProgress) => Promise<unknown>)(
      7,
      onDownloadProgress,
    )

    expect(http.get).toHaveBeenCalledWith('/publications/7', { onDownloadProgress })
  })

  it('rejects malformed publication data at the API boundary', async () => {
    vi.mocked(http.get).mockResolvedValue({
      data: {
        code: 200,
        data: { id: 7, revision: 1, publication: { people: {}, families: {} }, settings: {} },
      },
    })

    await expect(getPublication(7)).rejects.toThrow('服务器返回的族谱数据无效')
  })
})
