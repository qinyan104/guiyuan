import { onScopeDispose, ref, toValue, watch, type MaybeRefOrGetter } from 'vue'
import { acquirePersonPhoto } from '../api/personPhotoResource'
import { isPrivatePersonPhotoUrl } from '../api/http'
import { onSessionCleared } from '../api/tokenStore'

export function usePersonPhoto(
  source: MaybeRefOrGetter<string | undefined>,
  enabled: MaybeRefOrGetter<boolean> = true,
) {
  const photoUrl = ref<string>()
  let version = 0
  let release: (() => void) | undefined
  function reset() {
    version++
    release?.()
    release = undefined
    photoUrl.value = undefined
  }
  const unsubscribe = onSessionCleared(() => {
    if (isPrivatePersonPhotoUrl(toValue(source) ?? '')) reset()
  })
  watch(
    () => [toValue(source), toValue(enabled)] as const,
    ([url, active]) => {
      reset()
      if (!url || !active) return
      if (!isPrivatePersonPhotoUrl(url)) {
        photoUrl.value = url
        return
      }
      const current = version
      const lease = acquirePersonPhoto(url)
      release = lease.release
      void lease.result.then(result => {
        if (current === version) photoUrl.value = result
      })
    },
    { immediate: true, flush: 'sync' },
  )
  onScopeDispose(() => {
    reset()
    unsubscribe()
  })
  return photoUrl
}
