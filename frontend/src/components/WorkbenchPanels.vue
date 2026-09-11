<script setup lang="ts">
import { onBeforeUnmount, onMounted, watch } from 'vue'
import type { KinshipTerm } from '../lib/kinship'
import type { PublicationSettings } from '../types/family'
import CanvasToolbar from './CanvasToolbar.vue'
import HistoryPanel from './HistoryPanel.vue'
import LayoutSettingsPanel from './LayoutSettingsPanel.vue'
import SelectionZoomBar from './SelectionZoomBar.vue'
import ValidationDialog from './ValidationDialog.vue'

interface HistoryDisplayEntry {
  id: string
  label: string
  time: string
}

const props = defineProps<{
  layoutPanelOpen: boolean
  historyOpen: boolean
  validationOpen: boolean
  pubId: number | null
  focusFamilyLabel: string
  canReturnToMainBranch: boolean
  canUndo: boolean
  canRedo: boolean
  zoom: number
  hasSelectedPerson: boolean
  selectedPersonName: string
  selectedPersonMeta: string
  relationshipToSelected: KinshipTerm | null
  canFocusSelectedBranch: boolean
  settings: PublicationSettings
  historyPastCount: number
  historyFutureCount: number
  visibleHistoryEntries: HistoryDisplayEntry[]
}>()

const emit = defineEmits<{
  (event: 'toggle-layout'): void
  (event: 'toggle-history'): void
  (event: 'toggle-validation'): void
  (event: 'return-main-branch'): void
  (event: 'reset-canvas-view'): void
  (event: 'undo'): void
  (event: 'redo'): void
  (event: 'adjust-zoom', delta: number): void
  (event: 'open-editor'): void
  (event: 'reveal-selected-person'): void
  (event: 'focus-selected-branch'): void
  (event: 'close-layout'): void
  (event: 'close-history'): void
  (event: 'close-validation'): void
  (event: 'locate-person', personId: string): void
  (event: 'open-kinship'): void
  (event: 'update-settings', patch: Partial<PublicationSettings>): void
}>()

function onClickOutside(e: MouseEvent) {
  const target = e.target as Element | null
  if (!target) return
  if (target.closest('.layout-panel') || target.closest('.history-panel') || target.closest('.validation-dialog-window') || target.closest('.tool-btn--panel')) {
    return
  }
  if (props.layoutPanelOpen) emit('close-layout')
  if (props.historyOpen) emit('close-history')
}

onMounted(() => {
  document.addEventListener('click', onClickOutside, { capture: true })
})

onBeforeUnmount(() => {
  document.removeEventListener('click', onClickOutside, { capture: true })
  document.body.style.overflow = ''
})

watch(
  () => props.validationOpen,
  (open) => {
    document.body.style.overflow = open ? 'hidden' : ''
  },
  { immediate: true },
)
</script>

<template>
  <CanvasToolbar
    :layoutPanelOpen="layoutPanelOpen"
    :historyOpen="historyOpen"
    :validationOpen="validationOpen"
    :canReturnToMainBranch="canReturnToMainBranch"
    :canUndo="canUndo"
    :canRedo="canRedo"
    @undo="$emit('undo')"
    @redo="$emit('redo')"
    @reset-canvas-view="$emit('reset-canvas-view')"
    @return-main-branch="$emit('return-main-branch')"
    @toggle-layout="$emit('toggle-layout')"
    @toggle-history="$emit('toggle-history')"
    @toggle-validation="$emit('toggle-validation')"
    @open-kinship="$emit('open-kinship')"
  />

  <SelectionZoomBar
    :focusFamilyLabel="focusFamilyLabel"
    :zoom="zoom"
    :hasSelectedPerson="hasSelectedPerson"
    :selectedPersonName="selectedPersonName"
    :selectedPersonMeta="selectedPersonMeta"
    :relationshipToSelected="relationshipToSelected"
    :canFocusSelectedBranch="canFocusSelectedBranch"
    @open-editor="$emit('open-editor')"
    @reveal-selected-person="$emit('reveal-selected-person')"
    @focus-selected-branch="$emit('focus-selected-branch')"
    @adjust-zoom="$emit('adjust-zoom', $event)"
  />

  <LayoutSettingsPanel
    :open="layoutPanelOpen"
    :settings="settings"
    @close="$emit('close-layout')"
    @update-settings="$emit('update-settings', $event)"
  />

  <HistoryPanel
    :open="historyOpen"
    :canUndo="canUndo"
    :canRedo="canRedo"
    :historyPastCount="historyPastCount"
    :historyFutureCount="historyFutureCount"
    :visibleHistoryEntries="visibleHistoryEntries"
    @close="$emit('close-history')"
    @undo="$emit('undo')"
    @redo="$emit('redo')"
  />

  <ValidationDialog
    :open="validationOpen"
    :pubId="pubId"
    @close="$emit('close-validation')"
    @locate-person="$emit('locate-person', $event)"
  />
</template>

