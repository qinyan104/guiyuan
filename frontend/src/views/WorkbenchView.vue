<script setup lang="ts">
import { computed, inject, nextTick, ref, toRef, watch } from 'vue'
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
import { getUsername } from '../api/auth'
import ConfirmDialog from '../components/ConfirmDialog.vue'
import KinshipCalculatorDialog from '../components/KinshipCalculatorDialog.vue'

import { PUBLICATION_CONTEXT_KEY, type PublicationSettings } from '../types/family'

const props = defineProps<{
  publicationId: number
}>()

const route = useRoute()
const router = useRouter()

const currentUsername = ref(getUsername() ?? '')

// ─── Confirm Dialog State ─────────────────────────────────────
const showKinshipDialog = ref(false)
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

defineExpose({ confirmAsync })

// ─── Shared Context ─────────────────────────────────────────────

const context = inject(PUBLICATION_CONTEXT_KEY)!

// ─── Core Composables ───────────────────────────────────────────
const panels = usePanelState()
const feedback = useFeedback()
const canvasRef = ref<InstanceType<typeof PublicationCanvas> | null>(null)

// ─── Canvas Controls ────────────────────────────────────────────
function revealPersonInCanvas(personId: string) {
  nextTick(() => {
    const leftInset = panels.historyOpen.value ? 388 : panels.layoutPanelOpen.value ? 360 : 24
    const rightInset = 24

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
  context.pub.settings.zoom = Math.min(1.35, Math.max(0.10, nextValue))
  fileOps.hasUnsavedFileChanges.value = true
}

let egoScrolled = false
watch(
  () => context.pub.viewerPersonId?.value,
  (egoId) => {
    if (egoId && !egoScrolled) {
      egoScrolled = true
      setTimeout(() => revealPersonInCanvas(egoId), 600)
    }
  },
  { immediate: true },
)

// ─── Editor Anchor (card screen position for floating editor) ──

const editorAnchor = computed(() => {
  const personId = context.pub.selectedPersonId.value
  if (!personId || !canvasRef.value) return null
  const pos = canvasRef.value.getCardScreenPosition?.(personId)
  return pos
})

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
    // 在已有族谱中导入 JSON 时保留服务器 ID，确保数据持久化到数据库
    if (context.serverPublicationId.value) {
      setTimeout(context.saveToServer, 100)
    }
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

const personEditor = usePersonEditor(context.pub, () => {
  fileOps.hasUnsavedFileChanges.value = true
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
  fileOps.hasUnsavedFileChanges.value = true
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

// ─── Watchers ───────────────────────────────────────────────────
watch(
  () => context.pub.selectedPerson.value,
  (person) => {
    if (!person) {
      panels.editorOpen.value = false
    }
  },
)
</script>

<template>
  <div class="app-shell">
    <WorkbenchHeader
      :fileName="fileOps.draftFileName.value"
      :dirty="fileOps.hasUnsavedFileChanges.value"
      :nativeFileAccess="fileOps.nativeFileAccessSupported"
      :currentUsername="currentUsername"
      :syncStatus="context.syncStatus.value"
      @import-json="fileOps.importDraftFromFileEvent"
      @open-file="fileOps.openDraftFile"
      @create-blank="relActions.createBlankDraft"
      @save-file="fileOps.saveDraftFile()"
      @save-file-as="fileOps.saveDraftFile(true)"
      @download-svg="fileOps.downloadSvg"
      @export-json="fileOps.exportJson"
      @export-share-html="fileOps.exportShareHtml"
      @logout="goBackToList"
      @go-back="goBackToList"
      @view-stats="router.push({ name: 'publication-stats' })"
      @view-timeline="router.push({ name: 'publication-timeline' })"
    />

    <FeedbackStrip
      :errorMessage="feedback.errorMessage.value"
      :statusMessage="feedback.statusMessage.value"
      @dismiss="feedback.dismiss"
    />

    <main class="workspace">
      <section class="editor-workspace">
        <WorkbenchPanels
          :layoutPanelOpen="panels.layoutPanelOpen.value"
          :historyOpen="panels.historyOpen.value"
          :focusFamilyLabel="context.pub.focusFamilyLabel.value"
          :canReturnToMainBranch="!context.pub.isRootFamilyFocused.value"
          :canUndo="context.history.canUndo.value"
          :canRedo="context.history.canRedo.value"
          :zoom="context.pub.settings.zoom"
          :hasSelectedPerson="Boolean(context.pub.selectedPerson.value)"
          :selectedPersonName="context.pub.selectedPerson.value?.name || ''"
          :selectedPersonMeta="context.pub.selectedPersonMeta.value"
          :relationshipToSelected="context.pub.relationshipToSelected.value"
          :canFocusSelectedBranch="Boolean(context.pub.selectedPerson.value && !context.pub.isSelectedBranchFocused.value)"
          :settings="context.pub.settings"
          :historyPastCount="context.history.historyPast.value.length"
          :historyFutureCount="context.history.historyFuture.value.length"
          :visibleHistoryEntries="context.history.visibleHistoryEntries.value"
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
          @close-layout="panels.layoutPanelOpen.value = false" @open-kinship="showKinshipDialog = true"
          @close-history="panels.historyOpen.value = false"
        />

        <PublicationCanvas
          ref="canvasRef"
          v-model:panX="context.viewportPan.value.x"
          v-model:panY="context.viewportPan.value.y"
          :publication="context.pub.publication"
          :settings="context.pub.settings"
          :layout="context.pub.layout.value"
          :selectedPersonId="context.pub.selectedPersonId.value"
          :hoveredPersonId="context.pub.hoveredPersonId.value"
          :relationshipToSelected="context.pub.relationshipToSelected.value"
          :kinshipNotes="context.pub.kinshipNotes?.value ?? null"
          @update-zoom="context.pub.settings.zoom = $event"
          @select-person="handleSelectPerson"
          @hover-person="context.pub.setHoveredPerson"
        />


        <PersonEditorDrawer
          v-if="context.pub.selectedPerson.value"
          :open="panels.editorOpen.value"
          :person="context.pub.selectedPerson.value"
          :publicationId="context.serverPublicationId.value"
          :suggestion="personEditor.editorSelectedPersonSuggestion.value"
          :lineageSuggestion="context.pub.selectedPersonLineageSuggestion.value"
          :details="personEditor.editorSelectedPersonDetails.value"
          :spouse="context.pub.selectedSpouse.value"
          :parents="context.pub.selectedParents.value"
          :children="context.pub.selectedChildren.value"
          :childItems="context.pub.selectedChildItems.value"
          :canAddSpouse="context.pub.canAddSpouse.value"
          :hasCompleteParents="context.pub.hasCompleteParents.value"
          :canSwapAdults="context.pub.canSwapAdults.value"
          :isSelectedBranchFocused="context.pub.isSelectedBranchFocused.value"
          :canSetBranchMode="context.pub.canSetSelectedBranchMode.value"
          :branchMode="context.pub.selectedBranchMode.value"
          :parentActionLabel="context.pub.parentActionLabel.value"
          :branchActionLabel="personEditor.editorBranchActionLabel.value"
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
      :modelValue="confirmMessage !== null"
      title="确认操作"
      :message="confirmMessage || ''"
      confirmLabel="确认"
      tone="danger"
      @confirm="onConfirmDialogResult(true)"
      @cancel="onConfirmDialogResult(false)"
      @update:model-value="(v: boolean) => { if (!v) onConfirmDialogResult(false) }"
    />

    <KinshipCalculatorDialog
      v-if="showKinshipDialog"
      :publication="context.pub.publication"
      :egoPersonId="context.pub.selectedPersonId.value ?? undefined"
      @close="showKinshipDialog = false"
    />
  </div>
</template>

<style scoped>

</style>
