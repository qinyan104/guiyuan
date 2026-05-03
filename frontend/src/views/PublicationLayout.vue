<script setup lang="ts">
import { computed, provide, ref, watch, onMounted, onBeforeUnmount } from 'vue'
import { useRoute } from 'vue-router'
import { usePublicationState } from '../composables/usePublicationState'
import { useEditorHistory } from '../features/history/useEditorHistory'
import { useFeedback } from '../composables/useFeedback'
import { getPublication, updatePublication, createPublication } from '../api/publication'
import { defaultSettings, samplePublication } from '../data/sampleFamily'
import type { EditorSnapshot } from '../features/history/historyCore'
import type { PublicationData, PublicationSettings } from '../types/family'

const route = useRoute()
const publicationId = computed(() => Number(route.params.id))

const loading = ref(true)
const serverPublicationId = ref<number | null>(null)
const syncStatus = ref<'saved' | 'pending' | 'syncing' | 'error'>('saved')

// Viewport state to persist camera across views
const viewportPan = ref({ x: 0, y: 0 })

const feedback = useFeedback()

// Initialize with sample data, will be replaced by loadPublication
// NOTE: We use empty data for initial state to avoid showing Ming data before real load
const pub = usePublicationState({ title: '', people: {}, families: {}, focusFamilyId: '' } as any, defaultSettings)

// History setup
function createEditorSnapshot(): EditorSnapshot {
  return {
    publication: structuredClone(pub.publication) as PublicationData,
    settings: structuredClone(pub.settings) as PublicationSettings,
    selectedPersonId: pub.selectedPersonId.value,
  }
}

function restoreEditorSnapshot(snapshot: EditorSnapshot) {
  pub.replaceReactiveObject(pub.publication, snapshot.publication)
  pub.replaceReactiveObject(pub.settings, snapshot.settings)
  if (pub.publication.people[snapshot.selectedPersonId]) {
    pub.selectedPersonId.value = snapshot.selectedPersonId
  }
}

const history = useEditorHistory({
  createSnapshot: createEditorSnapshot,
  restoreSnapshot: restoreEditorSnapshot,
})

// Sync logic
async function saveToServer() {
  if (syncStatus.value === 'syncing' || !serverPublicationId.value) return
  syncStatus.value = 'syncing'
  try {
    await updatePublication(serverPublicationId.value, pub.publication, pub.settings)
    syncStatus.value = 'saved'
    feedback.errorMessage.value = ''
  } catch (err) {
    syncStatus.value = 'error'
    feedback.setError('同步到服务器失败')
  }
}

let serverSaveTimeout: any = null
watch(
  () => [pub.publication, pub.settings, pub.selectedPersonId.value],
  () => {
    // Only trigger sync if we actually have a loaded publication
    if (!serverPublicationId.value || loading.value) return

    syncStatus.value = 'pending'
    if (serverSaveTimeout) clearTimeout(serverSaveTimeout)
    serverSaveTimeout = setTimeout(saveToServer, 3000)
    history.scheduleHistoryCommit()
  },
  { deep: true }
)

async function load() {
  const targetId = publicationId.value
  if (!targetId) {
    loading.value = false
    return
  }

  // Only skip loading if the IDs truly match and we have data
  if (serverPublicationId.value === targetId && Object.keys(pub.publication.people).length > 0) {
    loading.value = false
    return
  }
  
  loading.value = true
  try {
    const result = await getPublication(targetId)
    pub.replaceReactiveObject(pub.publication, result.publication)
    pub.replaceReactiveObject(pub.settings, result.settings)
    
    if (!pub.selectedPersonId.value || !result.publication.people[pub.selectedPersonId.value]) {
      pub.selectedPersonId.value = Object.keys(result.publication.people)[0] ?? ''
    }
    
    serverPublicationId.value = result.id
    history.initializeHistoryBaseline()
  } catch (err) {
    feedback.setError('加载族谱失败')
  } finally {
    loading.value = false
  }
}

// Watch for publication ID changes (e.g. switching between different publications)
watch(publicationId, (newId) => {
  if (newId && newId !== serverPublicationId.value) {
    load()
  }
})

provide('publication-context', {
  pub,
  history,
  syncStatus,
  saveToServer,
  serverPublicationId,
  viewportPan,
})

function handleHistoryShortcut(event: KeyboardEvent) {
  const target = event.target as HTMLElement | null
  if (target?.closest('input, textarea, select, [contenteditable="true"]')) return
  if (!(event.ctrlKey || event.metaKey)) return

  const key = event.key.toLowerCase()
  if (key === 'z' && !event.shiftKey) {
    event.preventDefault()
    history.undoChange()
    return
  }
  if (key === 'y' || (key === 'z' && event.shiftKey)) {
    event.preventDefault()
    history.redoChange()
  }
}

onMounted(() => {
  load()
  window.addEventListener('keydown', handleHistoryShortcut)
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', handleHistoryShortcut)
  history.disposeHistory()
  if (serverSaveTimeout) clearTimeout(serverSaveTimeout)
})
</script>

<template>
  <div v-if="loading" class="loading-overlay">
    <div class="loading-spinner"></div>
    <span>正在加载族谱数据...</span>
  </div>
  <router-view v-else />
</template>

<style scoped>
.loading-overlay {
  position: fixed;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: var(--bg-shell, #f5f0e8);
  z-index: 1000;
  gap: 1rem;
  color: var(--text-soft, #888);
  font-weight: 600;
}

.loading-spinner {
  width: 40px;
  height: 40px;
  border: 3px solid var(--border-color, rgba(0,0,0,0.06));
  border-top-color: var(--accent-amber, #a96e35);
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}
</style>
