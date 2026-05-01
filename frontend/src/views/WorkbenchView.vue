<script setup lang="ts">
import { nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'

import FeedbackStrip from '../components/FeedbackStrip.vue'
import PersonEditorDrawer from '../components/PersonEditorDrawer.vue'
import PublicationCanvas from '../components/PublicationCanvas.vue'
import WorkbenchHeader from '../components/WorkbenchHeader.vue'
import WorkbenchPanels from '../components/WorkbenchPanels.vue'
import { defaultSettings, samplePublication } from '../data/sampleFamily'
import { builtinSampleGroups } from '../data/builtinDynastySamples'
import { useEditorHistory } from '../features/history/useEditorHistory'
import type { EditorSnapshot } from '../features/history/historyCore'
import {
  parseLocalDraftState,
  serializeLocalDraftState,
} from '../features/persistence/draftPersistence'
import { formatValidationIssues } from '../features/validation/draftSchema'

import { usePanelState } from '../composables/usePanelState'
import { useFeedback } from '../composables/useFeedback'
import { usePublicationState } from '../composables/usePublicationState'
import { usePersonEditor } from '../composables/usePersonEditor'
import { usePublicationMetrics } from '../composables/usePublicationMetrics'
import { useFileOperations } from '../composables/useFileOperations'
import { useRelationshipActions } from '../composables/useRelationshipActions'
import { useTheme } from '../composables/useTheme'
import { getUsername } from '../api/auth'
import { createPublication, updatePublication, getPublication } from '../api/publication'

import type { FamilyBranchMode, Gender, PublicationData, PublicationInfo, PublicationSettings } from '../types/family'

const props = defineProps<{
  publicationId: number
}>()

const router = useRouter()

const STORAGE_KEY = 'genealogy-publication-studio:v1'

const currentUsername = ref(getUsername() ?? '')
const serverPublicationId = ref<number | null>(props.publicationId)

// ─── Core Composables ───────────────────────────────────────────
const panels = usePanelState()
const feedback = useFeedback()
const pub = usePublicationState(samplePublication, defaultSettings)
const metrics = usePublicationMetrics(pub)
const personEditor = usePersonEditor(pub)
const theme = useTheme()

const canvasRef = ref<InstanceType<typeof PublicationCanvas> | null>(null)

// ─── History ────────────────────────────────────────────────────
function createEditorSnapshot(): EditorSnapshot {
  return {
    publication: structuredClone(pub.publication) as PublicationData,
    settings: structuredClone(pub.settings) as PublicationSettings,
    selectedPersonId: pub.selectedPersonId.value,
  }
}

function restoreEditorSnapshot(snapshot: EditorSnapshot) {
  const currentZoom = pub.settings.zoom
  const currentSelectedPersonId = pub.selectedPersonId.value

  pub.replaceReactiveObject(pub.publication, snapshot.publication)
  pub.replaceReactiveObject(pub.settings, snapshot.settings)
  pub.settings.zoom = currentZoom

  if (pub.publication.people[snapshot.selectedPersonId]) {
    pub.selectedPersonId.value = snapshot.selectedPersonId
  } else if (pub.publication.people[currentSelectedPersonId]) {
    pub.selectedPersonId.value = currentSelectedPersonId
  } else {
    pub.selectedPersonId.value = Object.keys(pub.publication.people)[0] ?? ''
  }

  if (!pub.publication.families[pub.publication.focusFamilyId]) {
    pub.publication.focusFamilyId = Object.keys(pub.publication.families)[0] ?? ''
  }

  if (!pub.selectedPersonId.value) {
    panels.editorOpen.value = false
  }
}

const {
  historyPast,
  historyFuture,
  canUndo,
  canRedo,
  visibleHistoryEntries,
  initializeHistoryBaseline,
  scheduleHistoryCommit,
  markHistory,
  undoChange,
  redoChange,
  disposeHistory,
} = useEditorHistory({
  createSnapshot: createEditorSnapshot,
  restoreSnapshot: restoreEditorSnapshot,
})

// ─── Canvas Controls ────────────────────────────────────────────
function revealPersonInCanvas(personId: string) {
  nextTick(() => {
    const leftInset = panels.historyOpen.value ? 388 : panels.layoutPanelOpen.value || panels.overviewOpen.value ? 360 : 24
    const rightInset = panels.editorOpen.value ? 444 : 24

    canvasRef.value?.revealPerson?.(personId, {
      padding: 40,
      leftInset,
      rightInset,
      topInset: 84,
      bottomInset: 48,
    })
  })
}

function resetCanvasView() {
  canvasRef.value?.resetView?.()
}

function adjustZoom(delta: number) {
  const nextValue = Number((pub.settings.zoom + delta).toFixed(2))
  pub.settings.zoom = Math.min(1.35, Math.max(0.55, nextValue))
}

// ─── File Operations ────────────────────────────────────────────
const fileOps = useFileOperations({
  pub,
  statusMessage: feedback.statusMessage,
  errorMessage: feedback.errorMessage,
  getErrorMessage: feedback.getErrorMessage,
  initializeHistoryBaseline,
  canvasRef,
  layout: pub.layout,
  onImport() {
    serverPublicationId.value = null
    setTimeout(saveToServer, 100)
  },
})

// ─── Relationship Actions ───────────────────────────────────────
const relActions = useRelationshipActions({
  pub,
  statusMessage: feedback.statusMessage,
  errorMessage: feedback.errorMessage,
  editorOpen: panels.editorOpen,
  layoutPanelOpen: panels.layoutPanelOpen,
  overviewOpen: panels.overviewOpen,
  historyOpen: panels.historyOpen,
  markHistory,
  initializeHistoryBaseline,
  canvasRef,
  revealPersonInCanvas,
  shouldReplaceCurrentDraft: fileOps.shouldReplaceCurrentDraft,
  draftFileHandle: fileOps.draftFileHandle,
  draftFileName: fileOps.draftFileName,
  hasUnsavedFileChanges: fileOps.hasUnsavedFileChanges,
})

// ─── UI Action Handlers ─────────────────────────────────────────
function handleSelectPerson(personId: string) {
  if (pub.selectedPersonId.value === personId) {
    panels.editorOpen.value = true
  } else {
    pub.selectedPersonId.value = personId
    revealPersonInCanvas(personId)
  }
}

function openEditor() {
  if (!pub.selectedPerson.value) return
  panels.editorOpen.value = true
}

function closeEditor() {
  panels.editorOpen.value = false
}

function updateSettings(patch: Partial<PublicationSettings>) {
  Object.assign(pub.settings, patch)
}

function handleUpdateInfo(patch: Partial<PublicationInfo>) {
  if (!pub.publication.info) {
    pub.publication.info = {}
  }
  Object.assign(pub.publication.info, patch)
}

function revealSelectedPerson() {
  if (pub.selectedPerson.value) {
    revealPersonInCanvas(pub.selectedPerson.value.id)
  }
}

// ─── Navigation ─────────────────────────────────────────────────
function goBackToList() {
  router.push({ name: 'publications' })
}

// ─── Keyboard Shortcuts ─────────────────────────────────────────
function handleHistoryShortcut(event: KeyboardEvent) {
  const target = event.target as HTMLElement | null
  if (target?.closest('input, textarea, select, [contenteditable="true"]')) return
  if (!(event.ctrlKey || event.metaKey)) return

  const key = event.key.toLowerCase()
  if (key === 'z' && !event.shiftKey) {
    event.preventDefault()
    undoChange()
    return
  }
  if (key === 'y' || (key === 'z' && event.shiftKey)) {
    event.preventDefault()
    redoChange()
  }
}

// ─── Load Publication from Server ───────────────────────────────
async function loadPublication() {
  if (!props.publicationId) return
  try {
    const result = await getPublication(props.publicationId)
    if (result) {
      pub.replaceReactiveObject(pub.publication, result.publication)
      pub.replaceReactiveObject(pub.settings, result.settings)
      pub.selectedPersonId.value = Object.keys(result.publication.people)[0] ?? ''
      serverPublicationId.value = result.id
      initializeHistoryBaseline()
    }
  } catch (err) {
    feedback.errorMessage.value = '加载族谱失败'
    console.error('加载族谱失败:', err)
  }
}

loadPublication()

onMounted(() => {
  window.addEventListener('keydown', handleHistoryShortcut)
})

onBeforeUnmount(() => {
  disposeHistory()
  window.removeEventListener('keydown', handleHistoryShortcut)
})

// ─── Watchers ───────────────────────────────────────────────────
watch(
  () => pub.selectedPerson.value,
  (person) => {
    if (!person) {
      panels.editorOpen.value = false
    }
  },
)

watch(
  () => [pub.publication, pub.settings],
  () => {
    scheduleHistoryCommit()
    if (!fileOps.getIsApplyingFileDraft()) {
      fileOps.hasUnsavedFileChanges.value = true
    }
  },
  { deep: true },
)

let serverSaveTimeout: ReturnType<typeof setTimeout> | null = null

function saveLocalDraft() {
  try {
    localStorage.setItem(
      STORAGE_KEY,
      serializeLocalDraftState(pub.publication, pub.settings, pub.selectedPersonId.value),
    )
  } catch (err) {
    console.error('保存本地草稿失败:', err)
  }
}

async function saveToServer() {
  try {
    if (serverPublicationId.value) {
      await updatePublication(serverPublicationId.value, pub.publication, pub.settings)
    } else {
      const id = await createPublication(pub.publication, pub.settings)
      serverPublicationId.value = id
    }
  } catch (err) {
    console.error('自动保存到服务器失败:', err)
  }
}

watch(
  () => [pub.publication, pub.settings, pub.selectedPersonId.value],
  () => {
    saveLocalDraft()

    // Debounced server save (3 seconds after last change)
    if (serverSaveTimeout) clearTimeout(serverSaveTimeout)
    serverSaveTimeout = setTimeout(saveToServer, 3000)
  },
  { deep: true },
)
</script>

<template>
  <div class="app-shell">
    <WorkbenchHeader
      :file-name="fileOps.draftFileName.value"
      :dirty="fileOps.hasUnsavedFileChanges.value"
      :native-file-access="fileOps.nativeFileAccessSupported"
      :sample-groups="builtinSampleGroups"
      :current-theme="theme.currentTheme.value"
      :current-username="currentUsername"
      @import-json="fileOps.importDraftFromFileEvent"
      @open-file="fileOps.openDraftFile"
      @create-blank="relActions.createBlankDraft"
      @load-sample="relActions.loadBuiltinSample"
      @save-file="fileOps.saveDraftFile()"
      @save-file-as="fileOps.saveDraftFile(true)"
      @restore-sample="relActions.restoreSample"
      @download-svg="fileOps.downloadSvg"
      @print-publication="fileOps.printPublication"
      @change-theme="theme.setTheme"
      @logout="goBackToList"
      @go-back="goBackToList"
      @view-stats="router.push({ name: 'publication-stats', params: { pubId: props.publicationId } })"
      @view-timeline="router.push({ name: 'publication-timeline', params: { pubId: props.publicationId } })"
    />

    <FeedbackStrip
      :error-message="feedback.errorMessage.value"
      :status-message="feedback.statusMessage.value"
      @dismiss="feedback.dismiss"
    />

    <main class="workspace">
      <section class="editor-workspace">
        <WorkbenchPanels
          :layout-panel-open="panels.layoutPanelOpen.value"
          :overview-open="panels.overviewOpen.value"
          :history-open="panels.historyOpen.value"
          :info-panel-open="panels.infoPanelOpen.value"
          :focus-family-label="pub.focusFamilyLabel.value"
          :can-return-to-main-branch="!pub.isRootFamilyFocused.value"
          :can-undo="canUndo"
          :can-redo="canRedo"
          :zoom="pub.settings.zoom"
          :has-selected-person="Boolean(pub.selectedPerson.value)"
          :selected-person-name="pub.selectedPerson.value?.name || ''"
          :selected-person-meta="pub.selectedPersonMeta.value"
          :can-focus-selected-branch="Boolean(pub.selectedPerson.value && !pub.isSelectedBranchFocused.value)"
          :settings="pub.settings"
          :publication-info="pub.publication.info ?? {}"
          :metric-cards="metrics.metricCards.value"
          :task-cards="metrics.taskCards.value"
          :history-past-count="historyPast.length"
          :history-future-count="historyFuture.length"
          :visible-history-entries="visibleHistoryEntries"
          @toggle-layout="panels.toggleLayoutPanel"
          @toggle-overview="panels.toggleOverviewPanel"
          @toggle-history="panels.toggleHistoryPanel"
          @toggle-info="panels.toggleInfoPanel"
          @return-main-branch="relActions.returnToMainBranch"
          @reset-canvas-view="resetCanvasView"
          @undo="undoChange"
          @redo="redoChange"
          @adjust-zoom="adjustZoom"
          @update-settings="updateSettings"
          @update-info="handleUpdateInfo"
          @open-editor="openEditor"
          @reveal-selected-person="revealSelectedPerson"
          @focus-selected-branch="relActions.focusSelectedBranch"
          @close-layout="panels.layoutPanelOpen.value = false"
          @close-overview="panels.overviewOpen.value = false"
          @close-history="panels.historyOpen.value = false"
          @close-info="panels.infoPanelOpen.value = false"
        />

        <PublicationCanvas
          ref="canvasRef"
          :publication="pub.publication"
          :settings="pub.settings"
          :layout="pub.layout.value"
          :selected-person-id="pub.selectedPersonId.value"
          @update-zoom="pub.settings.zoom = $event"
          @select-person="handleSelectPerson"
        />

        <PersonEditorDrawer
          v-if="pub.selectedPerson.value"
          :open="panels.editorOpen.value"
          :person="pub.selectedPerson.value"
          :publication-id="serverPublicationId"
          :suggestion="personEditor.editorSelectedPersonSuggestion.value"
          :lineage-suggestion="pub.selectedPersonLineageSuggestion.value"
          :details="personEditor.editorSelectedPersonDetails.value"
          :spouse="pub.selectedSpouse.value"
          :parents="pub.selectedParents.value"
          :children="pub.selectedChildren.value"
          :child-items="pub.selectedChildItems.value"
          :can-add-spouse="pub.canAddSpouse.value"
          :has-complete-parents="pub.hasCompleteParents.value"
          :can-swap-adults="pub.canSwapAdults.value"
          :is-selected-branch-focused="pub.isSelectedBranchFocused.value"
          :can-set-branch-mode="pub.canSetSelectedBranchMode.value"
          :branch-mode="pub.selectedBranchMode.value"
          :parent-action-label="pub.parentActionLabel.value"
          :branch-action-label="personEditor.editorBranchActionLabel.value"
          @close="closeEditor"
          @select-person="handleSelectPerson"
          @add-spouse="relActions.addSpouse"
          @add-child="relActions.addChild"
          @add-parents="relActions.addParents"
          @remove-spouse="relActions.removeSpouseRelation"
          @remove-parents="relActions.removeParentsRelation"
          @focus-branch="relActions.focusSelectedBranch"
          @update-branch-mode="relActions.updateSelectedBranchMode"
          @swap-partners="relActions.swapPartnerOrder"
          @move-child="relActions.moveChild($event.childId, $event.direction)"
          @update-person-field="personEditor.updateSelectedPersonField"
          @update-person-gender="personEditor.updateSelectedPersonGender"
          @apply-note-suggestion="personEditor.updateSelectedPersonField({ field: 'note', value: $event })"
          @delete-person="relActions.deleteSelectedPerson"
          @view-detail="router.push({ name: 'person-detail', params: { pubId: props.publicationId, personId: pub.selectedPersonId.value } })"
        />
      </section>
    </main>
  </div>
</template>
