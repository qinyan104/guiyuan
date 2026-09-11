import { nextTick, reactive, ref } from 'vue'
import { describe, expect, it, vi } from 'vitest'

import { useWorkbenchRouteFocus } from './useWorkbenchRouteFocus'

type TestPerson = {
  id: string
  name: string
  gender: 'male' | 'female'
}

describe('useWorkbenchRouteFocus', () => {
  it('selects the queried person, opens the editor, reveals the person, and clears the query', async () => {
    const route = reactive({
      name: 'workbench',
      params: { id: '7' },
      query: {
        personId: 'p2',
        tab: 'timeline',
      },
    })
    const router = {
      replace: vi.fn(),
    }
    const publication = reactive<{ people: Record<string, TestPerson> }>({
      people: {
        p2: {
          id: 'p2',
          name: 'Bob',
          gender: 'male',
        },
      },
    })
    const selectedPersonId = ref('')
    const editorOpen = ref(false)
    const revealPersonInCanvas = vi.fn()

    useWorkbenchRouteFocus({
      route,
      router,
      publication,
      targetPublicationId: ref(7),
      loadedPublicationId: ref(7),
      selectedPersonId,
      editorOpen,
      revealPersonInCanvas,
    })

    await nextTick()

    expect(selectedPersonId.value).toBe('p2')
    expect(editorOpen.value).toBe(true)
    expect(revealPersonInCanvas).toHaveBeenCalledWith('p2')
    expect(router.replace).toHaveBeenCalledWith({
      name: 'workbench',
      params: { id: '7' },
      query: { tab: 'timeline' },
    })
  })

  it('waits for the target publication to load before applying and clearing focus, even when people-count stays the same', async () => {
    const route = reactive({
      name: 'workbench',
      params: { id: '9' },
      query: {
        personId: 'p9',
        mode: 'search',
      },
    })
    const router = {
      replace: vi.fn(),
    }
    const publication = reactive<{ people: Record<string, TestPerson> }>({
      people: {
        p9: {
          id: 'p9',
          name: 'Stale Person',
          gender: 'male',
        },
      },
    })
    const targetPublicationId = ref(9)
    const loadedPublicationId = ref<number | null>(7)
    const selectedPersonId = ref('p1')
    const editorOpen = ref(false)
    const revealPersonInCanvas = vi.fn()

    useWorkbenchRouteFocus({
      route,
      router,
      publication,
      targetPublicationId,
      loadedPublicationId,
      selectedPersonId,
      editorOpen,
      revealPersonInCanvas,
    })

    await nextTick()

    expect(selectedPersonId.value).toBe('p1')
    expect(editorOpen.value).toBe(false)
    expect(revealPersonInCanvas).not.toHaveBeenCalled()
    expect(router.replace).not.toHaveBeenCalled()
    expect(route.query.personId).toBe('p9')

    publication.people.p9 = {
      id: 'p9',
      name: 'New Person',
      gender: 'female',
    }
    loadedPublicationId.value = 9

    await nextTick()

    expect(selectedPersonId.value).toBe('p9')
    expect(editorOpen.value).toBe(true)
    expect(revealPersonInCanvas).toHaveBeenCalledWith('p9')
    expect(router.replace).toHaveBeenCalledWith({
      name: 'workbench',
      params: { id: '9' },
      query: { mode: 'search' },
    })
  })
})
