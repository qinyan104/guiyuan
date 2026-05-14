import { nextTick, reactive, ref } from 'vue'
import { describe, expect, it, vi } from 'vitest'

import { useWorkbenchRouteFocus } from './useWorkbenchRouteFocus'

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
    const publication = reactive({
      people: {
        p2: {
          id: 'p2',
          name: 'Bob',
          gender: 'male' as const,
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
})
