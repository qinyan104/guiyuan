import { ref } from 'vue'

export function usePanelState() {
  const layoutPanelOpen = ref(false)
  const editorOpen = ref(false)
  const historyOpen = ref(false)

  function toggleLayoutPanel() {
    layoutPanelOpen.value = !layoutPanelOpen.value
    if (layoutPanelOpen.value) {
      historyOpen.value = false
    }
  }

  function toggleHistoryPanel() {
    historyOpen.value = !historyOpen.value
    if (historyOpen.value) {
      layoutPanelOpen.value = false
    }
  }

  function closeAllPanels() {
    layoutPanelOpen.value = false
    editorOpen.value = false
    historyOpen.value = false
  }

  return {
    layoutPanelOpen,
    editorOpen,
    historyOpen,
    toggleLayoutPanel,
    toggleHistoryPanel,
    closeAllPanels,
  }
}
