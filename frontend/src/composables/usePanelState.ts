import { ref } from 'vue'

export function usePanelState() {
  const overviewOpen = ref(false)
  const layoutPanelOpen = ref(false)
  const editorOpen = ref(false)
  const historyOpen = ref(false)

  function toggleLayoutPanel() {
    layoutPanelOpen.value = !layoutPanelOpen.value
    if (layoutPanelOpen.value) {
      overviewOpen.value = false
      historyOpen.value = false
    }
  }

  function toggleOverviewPanel() {
    overviewOpen.value = !overviewOpen.value
    if (overviewOpen.value) {
      layoutPanelOpen.value = false
      historyOpen.value = false
    }
  }

  function toggleHistoryPanel() {
    historyOpen.value = !historyOpen.value
    if (historyOpen.value) {
      layoutPanelOpen.value = false
      overviewOpen.value = false
    }
  }

  function closeAllPanels() {
    layoutPanelOpen.value = false
    overviewOpen.value = false
    editorOpen.value = false
    historyOpen.value = false
  }

  return {
    overviewOpen,
    layoutPanelOpen,
    editorOpen,
    historyOpen,
    toggleLayoutPanel,
    toggleOverviewPanel,
    toggleHistoryPanel,
    closeAllPanels,
  }
}
