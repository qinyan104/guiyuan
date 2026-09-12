import { ref } from 'vue'

export function useChildDragAndDrop<T extends { person: { id: string } }>(
  items: () => T[],
  moveChild: (payload: { childId: string; direction: -1 | 1 }) => void,
) {
  const draggingChildId = ref<string | null>(null)
  const dragOverChildId = ref<string | null>(null)

  const handleDragStart = (id: string, event: DragEvent) => {
    draggingChildId.value = id
    if (event.dataTransfer) event.dataTransfer.effectAllowed = 'move'
  }
  const handleDragOver = (id: string, event: DragEvent) => {
    event.preventDefault()
    dragOverChildId.value = id
  }
  const handleDragLeave = () => {
    dragOverChildId.value = null
  }
  const reset = () => {
    draggingChildId.value = null
    dragOverChildId.value = null
  }
  const handleDrop = (targetId: string, event: DragEvent) => {
    event.preventDefault()
    const sourceId = draggingChildId.value
    reset()
    if (!sourceId || sourceId === targetId) return
    const sourceIndex = items().findIndex(item => item.person.id === sourceId)
    const targetIndex = items().findIndex(item => item.person.id === targetId)
    if (sourceIndex < 0 || targetIndex < 0) return
    for (let i = 0; i < Math.abs(targetIndex - sourceIndex); i++) {
      moveChild({ childId: sourceId, direction: targetIndex > sourceIndex ? 1 : -1 })
    }
  }

  return {
    draggingChildId,
    dragOverChildId,
    handleDragStart,
    handleDragOver,
    handleDragLeave,
    handleDrop,
    handleDragEnd: reset,
  }
}
