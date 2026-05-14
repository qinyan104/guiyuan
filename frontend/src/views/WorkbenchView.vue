<script setup lang="ts">
import { inject, nextTick, ref, toRef, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import FeedbackStrip from '../components/FeedbackStrip.vue'
import PersonEditorDrawer from '../components/PersonEditorDrawer.vue'
import PublicationCanvas from '../components/PublicationCanvas.vue'
import WorkbenchHeader from '../components/WorkbenchHeader.vue'
import WorkbenchPanels from '../components/WorkbenchPanels.vue'

import { usePanelState } from '../composables/usePanelState'
import { useFeedback } from '../composables/useFeedback'
import { usePersonEditor } from '../composables/usePersonEditor'
import { useFileOperations } from '../composables/useFileOperations'
import { useRelationshipActions } from '../composables/useRelationshipActions'
import { useWorkbenchRouteFocus } from '../composables/useWorkbenchRouteFocus'
import { useTheme } from '../composables/useTheme'
import { getUsername } from '../api/auth'
import ConfirmDialog from '../components/ConfirmDialog.vue'

import type { PublicationSettings } from '../types/family'

const props = defineProps<{
  publicationId: number
}>()

const route = useRoute()
const router = useRouter()

const currentUsername = ref(getUsername() ?? '')

// ─── Confirm Dialog State ─────────────────────────────────────
const confirmMessage = ref<string | null>(null)
let confirmResolve: ((value: boolean) => void) | null = null

async function confirmAsync(message: string): Promise<boolean> {
  confirmMessage.value = message
  return new Promise((resolve) => {
    confirmResolve = resolve
  })
}

function onConfirmDialogResult(result: boolean) {
  confirmMessage.value = null
  if (confirmResolve) {
    confirmResolve(result)
    confirmResolve = null
  }
}

// ─── Shared Context ─────────────────────────────────────────────
const context = inject('publication-context') as any

// ─── Core Composables ───────────────────────────────────────────
const panels = usePanelState()
const feedback = useFeedback()
const personEditor = usePersonEditor(context.pub)
const theme = useTheme()

const canvasRef = ref<InstanceType<typeof PublicationCanvas> | null>(null)

// ─── Canvas Controls ────────────────────────────────────────────
function revealPersonInCanvas(personId: string) {
  nextTick(() => {
    const leftInset = panels.historyOpen.value ? 388 : panels.layoutPanelOpen.value ? 360 : 24
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
  const nextValue = Number((context.pub.settings.zoom + delta).toFixed(2))
  context.pub.settings.zoom = Math.min(1.35, Math.max(0.55, nextValue))
}

// ─── File Operations ────────────────────────────────────────────
const fileOps = useFileOperations({
  pub: context.pub,
  statusMessage: feedback.statusMessage,
  errorMessage: feedback.errorMessage,
  getErrorMessage: feedback.getErrorMessage,
  initializeHistoryBaseline: context.history.initializeHistoryBaseline,
  canvasRef,
  layout: context.pub.layout,
  onImport() {
    context.serverPublicationId.value = null
    setTimeout(context.saveToServer, 100)
  },
})

// ─── Relationship Actions ───────────────────────────────────────
const relActions = useRelationshipActions({
  pub: context.pub,
  statusMessage: feedback.statusMessage,
  errorMessage: feedback.errorMessage,
  editorOpen: panels.editorOpen,
  layoutPanelOpen: panels.layoutPanelOpen,
  historyOpen: panels.historyOpen,
  markHistory: context.history.markHistory,
  initializeHistoryBaseline: context.history.initializeHistoryBaseline,
  canvasRef,
  revealPersonInCanvas,
  shouldReplaceCurrentDraft: fileOps.shouldReplaceCurrentDraft,
  draftFileHandle: fileOps.draftFileHandle,
  draftFileName: fileOps.draftFileName,
  hasUnsavedFileChanges: fileOps.hasUnsavedFileChanges,
  confirmFn: confirmAsync,
})

// ─── UI Action Handlers ─────────────────────────────────────────
function handleSelectPerson(personId: string) {
  if (context.pub.selectedPersonId.value === personId) {
    panels.editorOpen.value = true
  } else {
    context.pub.selectedPersonId.value = personId
    // Removed auto-reveal here to prevent annoying viewport jumps
  }
}

function openEditor() {
  if (!context.pub.selectedPerson.value) return
  panels.editorOpen.value = true
}

function closeEditor() {
  panels.editorOpen.value = false
}

function updateSettings(patch: Partial<PublicationSettings>) {
  Object.assign(context.pub.settings, patch)
}

function revealSelectedPerson() {
  if (context.pub.selectedPerson.value) {
    revealPersonInCanvas(context.pub.selectedPerson.value.id)
  }
}

// ─── Navigation ─────────────────────────────────────────────────
function goBackToList() {
  router.push({ name: 'publications' })
}

useWorkbenchRouteFocus({
  route,
  router,
  publication: context.pub.publication,
  targetPublicationId: toRef(props, 'publicationId'),
  loadedPublicationId: context.serverPublicationId,
  selectedPersonId: context.pub.selectedPersonId,
  editorOpen: panels.editorOpen,
  revealPersonInCanvas,
})

// ─── Theme & Layout Sync ──────────────────────────────────────
watch(
  () => theme.currentTheme.value,
  (newTheme) => {
    if (newTheme === 'su-style') {
      updateSettings({ layoutMode: 'su' })
    } else if (newTheme === 'ou-style') {
      updateSettings({ layoutMode: 'ou' })
    } else {
      updateSettings({ layoutMode: 'modern' })
    }
  },
  { immediate: true },
)

// ─── Watchers ───────────────────────────────────────────────────
watch(
  () => context.pub.selectedPerson.value,
  (person) => {
    if (!person) {
      panels.editorOpen.value = false
    }
  },
)

watch(
  () => [context.pub.publication, context.pub.settings],
  () => {
    if (!fileOps.getIsApplyingFileDraft()) {
      fileOps.hasUnsavedFileChanges.value = true
    }
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
      :current-theme="theme.currentTheme.value"
      :current-username="currentUsername"
      :sync-status="context.syncStatus.value"
      @import-json="fileOps.importDraftFromFileEvent"
      @open-file="fileOps.openDraftFile"
      @create-blank="relActions.createBlankDraft"
      @save-file="fileOps.saveDraftFile()"
      @save-file-as="fileOps.saveDraftFile(true)"
      @download-svg="fileOps.downloadSvg"
      @export-json="fileOps.exportJson"
      @export-share-html="fileOps.exportShareHtml"
      @change-theme="theme.setTheme"
      @logout="goBackToList"
      @go-back="goBackToList"
      @view-stats="router.push({ name: 'publication-stats' })"
      @view-timeline="router.push({ name: 'publication-timeline' })"
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
          :history-open="panels.historyOpen.value"
          :focus-family-label="context.pub.focusFamilyLabel.value"
          :can-return-to-main-branch="!context.pub.isRootFamilyFocused.value"
          :can-undo="context.history.canUndo.value"
          :can-redo="context.history.canRedo.value"
          :zoom="context.pub.settings.zoom"
          :has-selected-person="Boolean(context.pub.selectedPerson.value)"
          :selected-person-name="context.pub.selectedPerson.value?.name || ''"
          :selected-person-meta="context.pub.selectedPersonMeta.value"
          :can-focus-selected-branch="Boolean(context.pub.selectedPerson.value && !context.pub.isSelectedBranchFocused.value)"
          :settings="context.pub.settings"
          :history-past-count="context.history.historyPast.value.length"
          :history-future-count="context.history.historyFuture.value.length"
          :visible-history-entries="context.history.visibleHistoryEntries.value"
          @toggle-layout="panels.toggleLayoutPanel"
          @toggle-history="panels.toggleHistoryPanel"
          @return-main-branch="relActions.returnToMainBranch"
          @reset-canvas-view="resetCanvasView"
          @undo="context.history.undoChange"
          @redo="context.history.redoChange"
          @adjust-zoom="adjustZoom"
          @update-settings="updateSettings"
          @open-editor="openEditor"
          @reveal-selected-person="revealSelectedPerson"
          @focus-selected-branch="relActions.focusSelectedBranch"
          @close-layout="panels.layoutPanelOpen.value = false"
          @close-history="panels.historyOpen.value = false"
        />

        <PublicationCanvas
          ref="canvasRef"
          v-model:panX="context.viewportPan.value.x"
          v-model:panY="context.viewportPan.value.y"
          :publication="context.pub.publication"
          :settings="context.pub.settings"
          :layout="context.pub.layout.value"
          :selected-person-id="context.pub.selectedPersonId.value"
          @update-zoom="context.pub.settings.zoom = $event"
          @select-person="handleSelectPerson"
        />

        <PersonEditorDrawer
          v-if="context.pub.selectedPerson.value"
          :open="panels.editorOpen.value"
          :person="context.pub.selectedPerson.value"
          :publication-id="context.serverPublicationId.value"
          :suggestion="personEditor.editorSelectedPersonSuggestion.value"
          :lineage-suggestion="context.pub.selectedPersonLineageSuggestion.value"
          :details="personEditor.editorSelectedPersonDetails.value"
          :spouse="context.pub.selectedSpouse.value"
          :parents="context.pub.selectedParents.value"
          :children="context.pub.selectedChildren.value"
          :child-items="context.pub.selectedChildItems.value"
          :can-add-spouse="context.pub.canAddSpouse.value"
          :has-complete-parents="context.pub.hasCompleteParents.value"
          :can-swap-adults="context.pub.canSwapAdults.value"
          :is-selected-branch-focused="context.pub.isSelectedBranchFocused.value"
          :can-set-branch-mode="context.pub.canSetSelectedBranchMode.value"
          :branch-mode="context.pub.selectedBranchMode.value"
          :parent-action-label="context.pub.parentActionLabel.value"
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

    <ConfirmDialog
      :model-value="confirmMessage !== null"
      title="确认操作"
      :message="confirmMessage || ''"
      confirm-label="确认"
      tone="danger"
      @confirm="onConfirmDialogResult(true)"
      @cancel="onConfirmDialogResult(false)"
      @update:model-value="(v: boolean) => { if (!v) onConfirmDialogResult(false) }"
    />
  </div>
</template>
