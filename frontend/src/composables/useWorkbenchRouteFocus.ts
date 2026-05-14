import { watch } from 'vue'
import type { Ref } from 'vue'
import type { RouteLocationNormalizedLoaded, Router } from 'vue-router'

import type { PublicationData } from '../types/family'

interface UseWorkbenchRouteFocusOptions {
  route: Pick<RouteLocationNormalizedLoaded, 'name' | 'params' | 'query'>
  router: Pick<Router, 'replace'>
  publication: Pick<PublicationData, 'people'>
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
  selectedPersonId,
  editorOpen,
  revealPersonInCanvas,
}: UseWorkbenchRouteFocusOptions) {
  let handledPersonId = ''

  watch(
    () => [route.query.personId, Object.keys(publication.people).length] as const,
    async ([rawPersonId]) => {
      const personId = getQueryPersonId(rawPersonId)

      if (!personId) {
        handledPersonId = ''
        return
      }

      if (handledPersonId === personId || !publication.people[personId]) {
        return
      }

      handledPersonId = personId
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
