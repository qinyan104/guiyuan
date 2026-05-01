<script setup lang="ts">
import { nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'

import FeedbackStrip from './components/FeedbackStrip.vue'
import PersonEditorDrawer from './components/PersonEditorDrawer.vue'
import PublicationCanvas from './components/PublicationCanvas.vue'
import WorkbenchHeader from './components/WorkbenchHeader.vue'
import WorkbenchPanels from './components/WorkbenchPanels.vue'
import LoginForm from './components/LoginForm.vue'
import ThemeSwitcher from './components/ThemeSwitcher.vue'
import { defaultSettings, samplePublication } from './data/sampleFamily'
import { builtinSampleGroups } from './data/builtinDynastySamples'
import { useEditorHistory } from './features/history/useEditorHistory'
import type { EditorSnapshot } from './features/history/historyCore'
import {
  parseLocalDraftState,
  serializeLocalDraftState,
} from './features/persistence/draftPersistence'
import { formatValidationIssues } from './features/validation/draftSchema'

import { usePanelState } from './composables/usePanelState'
import { useFeedback } from './composables/useFeedback'
import { usePublicationState } from './composables/usePublicationState'
import { usePersonEditor } from './composables/usePersonEditor'
import { usePublicationMetrics } from './composables/usePublicationMetrics'
import { useFileOperations } from './composables/useFileOperations'
import { useRelationshipActions } from './composables/useRelationshipActions'
import { useTheme } from './composables/useTheme'
import { logout, getToken, getUsername } from './api/auth'

import type { FamilyBranchMode, Gender, PublicationData, PublicationSettings } from './types/family'

const STORAGE_KEY = 'genealogy-publication-studio:v1'

// ─── Auth State ─────────────────────────────────────────────────
const authPreviewMode =
  typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('auth') === 'preview'
const isLoggedIn = ref(authPreviewMode ? false : !!getToken())
const currentUsername = ref(getUsername() ?? '')

function onLoginSuccess(username: string) {
  if (authPreviewMode) return
  currentUsername.value = username
  isLoggedIn.value = true
}

function onLogout() {
  logout()
  isLoggedIn.value = false
  currentUsername.value = ''
}

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
    publication: JSON.parse(JSON.stringify(pub.publication)) as PublicationData,
    settings: JSON.parse(JSON.stringify(pub.settings)) as PublicationSettings,
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

function revealSelectedPerson() {
  if (pub.selectedPerson.value) {
    revealPersonInCanvas(pub.selectedPerson.value.id)
  }
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

// ─── Initialization & Lifecycle ─────────────────────────────────
function applyDraft(raw: string | null) {
  if (!raw) return

  const parsed = parseLocalDraftState(raw)
  if (!parsed.ok) {
    localStorage.removeItem(STORAGE_KEY)
    feedback.errorMessage.value = formatValidationIssues(parsed.issues)
    feedback.statusMessage.value = ''
    return
  }

  pub.replaceReactiveObject(pub.publication, parsed.value.publication)
  pub.replaceReactiveObject(pub.settings, parsed.value.settings)
  pub.selectedPersonId.value = parsed.value.selectedPersonId ?? Object.keys(pub.publication.people)[0] ?? ''
}

applyDraft(localStorage.getItem(STORAGE_KEY))
initializeHistoryBaseline()

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

watch(
  () => [pub.publication, pub.settings, pub.selectedPersonId.value],
  () => {
    localStorage.setItem(
      STORAGE_KEY,
      serializeLocalDraftState(pub.publication, pub.settings, pub.selectedPersonId.value),
    )
  },
  { deep: true },
)
</script>

<template>
  <!-- ── 未登录：显示登录 / 注册页 ── -->
  <div v-if="!isLoggedIn" class="auth-page">

    <div class="auth-top-bar">
      <ThemeSwitcher :current-theme="theme.currentTheme.value" @change-theme="theme.setTheme" />
    </div>
    <transition name="page-fade" mode="out-in">
      <LoginForm key="login" @success="onLoginSuccess" />
    </transition>
  </div>

  <!-- ── 已登录：主工作台 ── -->
  <div v-else class="app-shell">
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
      @logout="onLogout"
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
          :metric-cards="metrics.metricCards.value"
          :task-cards="metrics.taskCards.value"
          :history-past-count="historyPast.length"
          :history-future-count="historyFuture.length"
          :visible-history-entries="visibleHistoryEntries"
          @toggle-layout="panels.toggleLayoutPanel"
          @toggle-overview="panels.toggleOverviewPanel"
          @toggle-history="panels.toggleHistoryPanel"
          @return-main-branch="relActions.returnToMainBranch"
          @reset-canvas-view="resetCanvasView"
          @undo="undoChange"
          @redo="redoChange"
          @adjust-zoom="adjustZoom"
          @update-settings="updateSettings"
          @open-editor="openEditor"
          @reveal-selected-person="revealSelectedPerson"
          @focus-selected-branch="relActions.focusSelectedBranch"
          @close-layout="panels.layoutPanelOpen.value = false"
          @close-overview="panels.overviewOpen.value = false"
          @close-history="panels.historyOpen.value = false"
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
        />
      </section>
    </main>
  </div>
</template>

<style scoped>
/* ── 未登录全屏容器 ── */
.auth-page {
  position: fixed;
  inset: 0;
  overflow: hidden;
  background:
    linear-gradient(135deg, rgba(255, 255, 255, 0.16), transparent 28%),
    linear-gradient(225deg, rgba(255, 255, 255, 0.12), transparent 32%),
    var(--shell-bg-image, var(--bg-shell));
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
}

/* Removed ambient bg styles */

.auth-top-bar {
  display: flex;
  justify-content: flex-end;
  padding: 10px 12px;
  position: absolute;
  top: 18px;
  right: 18px;
  z-index: 100;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.2);
  border: 1px solid rgba(255, 255, 255, 0.24);
  backdrop-filter: blur(22px) saturate(160%);
  -webkit-backdrop-filter: blur(22px) saturate(160%);
  box-shadow: 0 14px 34px rgba(30, 41, 59, 0.08);
}

/* 页面切换淡入淡出 */
.page-fade-enter-active,
.page-fade-leave-active {
  transition: opacity 0.28s ease, transform 0.28s ease;
}
.page-fade-enter-from {
  opacity: 0;
  transform: translateX(16px);
}
.page-fade-leave-to {
  opacity: 0;
  transform: translateX(-16px);
}

@media (max-width: 640px) {
  .auth-page {
    padding: 10px;
  }

  .auth-top-bar {
    top: 8px;
    right: 8px;
    padding: 10px 12px;
  }
}


</style>
