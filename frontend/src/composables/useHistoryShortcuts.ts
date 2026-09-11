import { onBeforeUnmount, onMounted } from 'vue'

interface HistoryActions {
  undoChange: () => void
  redoChange: () => void
}

function isEditableTarget(target: EventTarget | null) {
  return target instanceof HTMLElement && Boolean(target.closest('input, textarea, select, [contenteditable="true"]'))
}

export function useHistoryShortcuts(history: HistoryActions) {
  const onKeydown = (event: KeyboardEvent) => {
    if (isEditableTarget(event.target) || !(event.ctrlKey || event.metaKey)) return
    const key = event.key.toLowerCase()
    if (key === 'z' && !event.shiftKey) {
      event.preventDefault()
      history.undoChange()
    } else if (key === 'y' || (key === 'z' && event.shiftKey)) {
      event.preventDefault()
      history.redoChange()
    }
  }

  onMounted(() => window.addEventListener('keydown', onKeydown))
  onBeforeUnmount(() => window.removeEventListener('keydown', onKeydown))
}
