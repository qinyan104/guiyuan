import { watch } from 'vue'
import type { Ref } from 'vue'
import type { RouteLocationNormalizedLoaded, Router } from 'vue-router'

import type { PublicationData } from '../types/family'

interface UseWorkbenchRouteFocusOptions {
  route: Pick<RouteLocationNormalizedLoaded, 'name' | 'params' | 'query'>
  router: Pick<Router, 'replace'>
  publication: Pick<PublicationData, 'people'>
  targetPublicationId: Ref<number | null>
  loadedPublicationId: Ref<number | null>
  selectedPersonId: Ref<string>
  editorOpen: Ref<boolean>
  revealPersonInCanvas: (personId: string) => void
}

function getQueryPersonId(value: unknown): string {
  if (typeof value === 'string') {
    return value
  }
  if (Array.isArray(value)) {
    return typeof value[0] === 'string' ? value[0] : ''
  }
  return ''
}

export function useWorkbenchRouteFocus({
  route,
  router,
  publication,
  targetPublicationId,
  loadedPublicationId,
  selectedPersonId,
  editorOpen,
  revealPersonInCanvas,
}: UseWorkbenchRouteFocusOptions) {
  let handledFocusKey = ''

  watch(
    () => {
      const personId = getQueryPersonId(route.query.personId)
      return {
        personId,
        targetPublicationId: targetPublicationId.value,
        loadedPublicationId: loadedPublicationId.value,
        personPresent: personId ? Boolean(publication.people[personId]) : false,
      }
    },
    async ({ personId, targetPublicationId: targetId, loadedPublicationId: loadedId, personPresent }) => {
      if (!personId) {
        handledFocusKey = ''
        return
      }

      if (!targetId || loadedId !== targetId || !personPresent) {
        return
      }

      const focusKey = `${targetId}:${personId}`
      if (handledFocusKey === focusKey) {
        return
      }

      handledFocusKey = focusKey
      selectedPersonId.value = personId
      editorOpen.value = true
      revealPersonInCanvas(personId)

      const nextQuery = { ...route.query }
      delete nextQuery.personId

      await router.replace({
        name: route.name ?? 'workbench',
        params: route.params,
        query: nextQuery,
      })
    },
    { immediate: true },
  )
}
