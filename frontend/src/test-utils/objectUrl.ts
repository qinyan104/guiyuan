import { vi } from 'vitest'

export interface ObjectUrlStub {
  createObjectURL: ReturnType<typeof vi.fn>
  revokeObjectURL: ReturnType<typeof vi.fn>
  restore: () => void
}

/**
 * jsdom 不实现 `URL.createObjectURL` / `URL.revokeObjectURL`。
 *
 * 这里临时挂载这两个静态方法，并在 `restore()` 时删除（或还原原值）。
 * 不要用 `Object.assign(URL, …)`：那会永久修改共享的全局构造函数，
 * 而且 `vi.unstubAllGlobals()` 也恢复不了（描述符仍指向被改过的同一对象）。
 */
export function stubObjectUrl(create: () => string): ObjectUrlStub {
  const target = URL as unknown as Record<string, unknown>
  const previousCreate = target.createObjectURL
  const previousRevoke = target.revokeObjectURL
  const createObjectURL = vi.fn(create)
  const revokeObjectURL = vi.fn()

  target.createObjectURL = createObjectURL
  target.revokeObjectURL = revokeObjectURL

  return {
    createObjectURL,
    revokeObjectURL,
    restore: () => {
      if (previousCreate === undefined) delete target.createObjectURL
      else target.createObjectURL = previousCreate
      if (previousRevoke === undefined) delete target.revokeObjectURL
      else target.revokeObjectURL = previousRevoke
    },
  }
}
