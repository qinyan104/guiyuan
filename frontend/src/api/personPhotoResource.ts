import { fetchBinaryResource, isPrivatePersonPhotoUrl } from './http'
import { onSessionCleared } from './tokenStore'

interface Entry {
  users: number
  active: boolean
  url?: string
  result: Promise<string | undefined>
}

export interface PersonPhotoLease {
  result: Promise<string | undefined>
  release: () => void
}

const entries = new Map<string, Entry>()

function dispose(key: string, entry: Entry) {
  entry.active = false
  if (entry.url) URL.revokeObjectURL(entry.url)
  entry.url = undefined
  if (entries.get(key) === entry) entries.delete(key)
}

onSessionCleared(() => {
  for (const [key, entry] of entries) dispose(key, entry)
})

/** 显示层租用资源；原始地址始终由人物数据保存。 */
export function acquirePersonPhoto(source: string): PersonPhotoLease {
  if (!isPrivatePersonPhotoUrl(source)) {
    return { result: Promise.resolve(source), release: () => undefined }
  }
  const parsed = new URL(source, window.location.href)
  parsed.hash = ''
  const key = parsed.href
  let entry = entries.get(key)
  if (!entry) {
    const created: Entry = { users: 0, active: true, result: Promise.resolve(undefined) }
    entries.set(key, created)
    created.result = fetchBinaryResource(key).then(
      blob => {
        if (!created.active) return undefined
        created.url = URL.createObjectURL(blob)
        return created.url
      },
      () => {
        dispose(key, created)
        return undefined
      },
    )
    entry = created
  }
  entry.users++
  const leased = entry
  let released = false
  return {
    result: leased.result,
    release: () => {
      if (released) return
      released = true
      leased.users--
      if (!leased.users) dispose(key, leased)
    },
  }
}
