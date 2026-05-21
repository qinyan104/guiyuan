import { ref, computed, type Ref } from "vue"
import { getDraft, getSyncStatus } from "../api/publishing"
import type { BookDraft, DraftSyncStatus } from "../types/publishing"

export function usePublishingStudio(draftId: Ref<number>) {
  const draft = ref<BookDraft | null>(null)
  const activeSheetIndex = ref(0)
  const selectedElementId = ref<string | null>(null)
  const syncStatus = ref<DraftSyncStatus | null>(null)
  const loading = ref(false)

  async function loadDraft() {
    loading.value = true
    try {
      draft.value = await getDraft(draftId.value)
      syncStatus.value = await getSyncStatus(draftId.value)
    } finally {
      loading.value = false
    }
  }

  const hasPendingSync = computed(() => syncStatus.value?.hasPendingSync ?? false)

  function selectElement(id: string | null) {
    selectedElementId.value = id
  }

  return {
    draft,
    activeSheetIndex,
    selectedElementId,
    syncStatus,
    loading,
    hasPendingSync,
    loadDraft,
    selectElement,
  }
}