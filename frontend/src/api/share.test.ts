import { beforeEach, describe, expect, it, vi } from 'vitest'
import http from './http'
import { getShareMeta, getSharePhotoUrl, getSharePublication } from './share'

describe('api/share', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('getSharePublication returns payload when code is 200', async () => {
    const payload = { publication: { title: '测试族谱' }, settings: {} }
    vi.spyOn(http, 'get').mockResolvedValue({ data: { code: 200, data: payload } } as never)

    await expect(getSharePublication('tok-1')).resolves.toEqual(payload)
  })

  it('getSharePublication throws when code is not 200', async () => {
    vi.spyOn(http, 'get').mockResolvedValue({
      data: { code: 410, message: '分享链接已过期' },
    } as never)

    await expect(getSharePublication('tok-1')).rejects.toThrow('分享链接已过期')
  })

  it('getShareMeta returns meta payload when code is 200', async () => {
    const meta = { title: '分享标题' }
    vi.spyOn(http, 'get').mockResolvedValue({ data: { code: 200, data: meta } } as never)

    await expect(getShareMeta('tok-2')).resolves.toEqual(meta)
  })

  it('requests share endpoints under the /shares prefix with skipAuth', async () => {
    const getSpy = vi.spyOn(http, 'get').mockResolvedValue({ data: { code: 200, data: {} } } as never)

    await getSharePublication('abc')
    expect(getSpy).toHaveBeenCalledWith('/shares/abc', { skipAuth: true })

    await getShareMeta('abc')
    expect(getSpy).toHaveBeenCalledWith('/shares/abc/meta', { skipAuth: true })
  })

  it('getSharePhotoUrl builds the share photo proxy path', () => {
    expect(getSharePhotoUrl('tok-3', 42)).toBe('/api/shares/tok-3/photos/42')
  })
})
