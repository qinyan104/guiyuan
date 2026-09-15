import { effectScope, ref } from 'vue'
import { afterAll, afterEach, describe, expect, it, vi } from 'vitest'
import { fetchBinaryResource } from '../api/http'
import { acquirePersonPhoto } from '../api/personPhotoResource'
import { clearSession, setAccessToken } from '../api/tokenStore'
import { usePersonPhoto } from './usePersonPhoto'
import { stubObjectUrl } from '../test-utils/objectUrl'

vi.mock('../api/http', async importOriginal => ({
  ...(await importOriginal<typeof import('../api/http')>()),
  fetchBinaryResource: vi.fn(),
}))

const download = vi.mocked(fetchBinaryResource)
let sequence = 0
const objectUrl = stubObjectUrl(() => `blob:photo-${++sequence}`)
const revoke = objectUrl.revokeObjectURL

afterEach(() => {
  clearSession()
  vi.clearAllMocks()
})

afterAll(() => {
  objectUrl.restore()
})

function setup(url = '/api/photos/1') {
  const source = ref(url)
  const enabled = ref(true)
  const scope = effectScope()
  const photo = scope.run(() => usePersonPhoto(source, enabled))
  if (!photo) throw new Error('测试作用域未启动')
  return { source, enabled, scope, photo }
}
const flush = async () => {
  await Promise.resolve()
  await Promise.resolve()
}

describe('人物照片资源', () => {
  it('合并相对/绝对地址，保留查询参数，最后释放才回收', async () => {
    download.mockResolvedValue(new Blob(['photo']))
    const a = acquirePersonPhoto('/api/photos/1?v=2')
    const b = acquirePersonPhoto(`${location.origin}/api/photos/1?v=2`)
    expect(await a.result).toBe(await b.result)
    expect(download).toHaveBeenCalledTimes(1)
    expect(download).toHaveBeenCalledWith(`${location.origin}/api/photos/1?v=2`)
    a.release()
    expect(revoke).not.toHaveBeenCalled()
    b.release()
    expect(revoke).toHaveBeenCalledTimes(1)
  })

  it('失败不缓存，下次租用重试', async () => {
    download.mockRejectedValueOnce(new Error('失败')).mockResolvedValue(new Blob())
    const a = acquirePersonPhoto('/api/photos/1')
    expect(await a.result).toBeUndefined()
    const b = acquirePersonPhoto('/api/photos/1')
    expect(await b.result).toMatch(/^blob:/)
    a.release()
    b.release()
  })

  it('切换、禁用和卸载丢弃在途结果', async () => {
    let resolve!: (blob: Blob) => void
    download.mockImplementationOnce(
      () =>
        new Promise(done => {
          resolve = done
        }),
    )
    const view = setup()
    view.source.value = 'data:image/png;base64,abc'
    resolve(new Blob())
    await flush()
    expect(view.photo.value).toBe('data:image/png;base64,abc')
    download.mockResolvedValue(new Blob())
    view.source.value = '/api/photos/2'
    await flush()
    expect(view.photo.value).toMatch(/^blob:/)
    view.enabled.value = false
    expect(view.photo.value).toBeUndefined()
    view.enabled.value = true
    view.scope.stop()
    await flush()
    expect(view.photo.value).toBeUndefined()
  })

  it('会话清理立即清空显示且在途结果不能恢复；续期不重载', async () => {
    download.mockResolvedValue(new Blob())
    const a = setup()
    await flush()
    const original = a.photo.value
    setAccessToken('renewed')
    expect(a.photo.value).toBe(original)
    let resolve!: (blob: Blob) => void
    download.mockImplementationOnce(
      () =>
        new Promise(done => {
          resolve = done
        }),
    )
    const b = setup('/api/photos/2')
    clearSession()
    resolve(new Blob())
    await flush()
    expect(a.photo.value).toBeUndefined()
    expect(b.photo.value).toBeUndefined()
    a.scope.stop()
    b.scope.stop()
  })

  it.each([
    '/api/share/abc/photos/1',
    'https://cdn.example/a.png',
    'blob:external',
    'data:image/png;base64,abc',
  ])('透传 %s，不下载或释放外部资源', url => {
    const view = setup(url)
    expect(view.photo.value).toBe(url)
    view.scope.stop()
    expect(download).not.toHaveBeenCalled()
    expect(revoke).not.toHaveBeenCalled()
  })
})
