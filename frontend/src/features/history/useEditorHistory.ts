import { computed, ref } from 'vue'

import {
  cloneJson,
  formatHistoryTime,
  inferHistoryLabel,
  serializeTrackedSnapshot,
  type EditorSnapshot,
  type HistoryEntry,
} from './historyCore'

const MAX_HISTORY_ENTRIES = 80

export function useEditorHistory(input: {
  createSnapshot: () => EditorSnapshot
  restoreSnapshot: (snapshot: EditorSnapshot) => void
}) {
  const historyPast = ref<HistoryEntry[]>([])
  const historyFuture = ref<HistoryEntry[]>([])
  const canUndo = computed(() => historyPast.value.length > 0)
  const canRedo = computed(() => historyFuture.value.length > 0)
  const visibleHistoryEntries = computed(() => [...historyPast.value].reverse().slice(0, 10))

  let historyTimer: number | undefined
  let historyIdSeed = 0
  let isRestoringHistory = false
  let pendingHistoryLabel = ''
  let pendingTrackedStateSerialized = ''
  let lastHistorySnapshot: EditorSnapshot | null = null
  let createBaselineSnapshot: (() => EditorSnapshot) | null = null
  let lastTrackedStateSerialized = ''

  function initializeHistoryBaseline(baseline?: {
    createSnapshot: () => EditorSnapshot
    trackedStateSerialized: string
  }) {
    createBaselineSnapshot = baseline?.createSnapshot ?? null
    lastHistorySnapshot = baseline ? null : input.createSnapshot()
    lastTrackedStateSerialized = baseline?.trackedStateSerialized ?? serializeTrackedSnapshot(lastHistorySnapshot!)
    historyPast.value = []
    historyFuture.value = []
    pendingHistoryLabel = ''
    pendingTrackedStateSerialized = ''
  }

  function materializeLastHistorySnapshot() {
    if (!lastHistorySnapshot && createBaselineSnapshot) {
      lastHistorySnapshot = createBaselineSnapshot()
      createBaselineSnapshot = null
    }
    return lastHistorySnapshot
  }

  function commitHistory(label = pendingHistoryLabel, trackedStateSerialized = '') {
    const previousSnapshot = materializeLastHistorySnapshot()
    if (isRestoringHistory || !previousSnapshot) {
      return
    }

    const currentSnapshot = input.createSnapshot()
    const currentTrackedStateSerialized = trackedStateSerialized || serializeTrackedSnapshot(currentSnapshot)
    if (currentTrackedStateSerialized === lastTrackedStateSerialized) {
      pendingHistoryLabel = ''
      pendingTrackedStateSerialized = ''
      return
    }

    const entry: HistoryEntry = {
      id: `h${Date.now()}-${historyIdSeed++}`,
      label: label || inferHistoryLabel(previousSnapshot, currentSnapshot, pendingHistoryLabel),
      time: formatHistoryTime(),
      snapshot: previousSnapshot,
    }

    historyPast.value = [...historyPast.value, entry].slice(-MAX_HISTORY_ENTRIES)
    historyFuture.value = []
    lastHistorySnapshot = currentSnapshot
    lastTrackedStateSerialized = currentTrackedStateSerialized
    pendingHistoryLabel = ''
    pendingTrackedStateSerialized = ''
  }

  function flushPendingHistory() {
    if (historyTimer !== undefined) {
      window.clearTimeout(historyTimer)
      historyTimer = undefined
    }

    commitHistory(pendingHistoryLabel, pendingTrackedStateSerialized)
  }

  function scheduleHistoryCommit(trackedStateSerialized = '') {
    if (isRestoringHistory) {
      return
    }

    if (trackedStateSerialized && trackedStateSerialized === lastTrackedStateSerialized) {
      if (historyTimer !== undefined) {
        window.clearTimeout(historyTimer)
        historyTimer = undefined
      }
      pendingHistoryLabel = ''
      pendingTrackedStateSerialized = ''
      return
    }

    if (historyTimer !== undefined) {
      window.clearTimeout(historyTimer)
    }
    pendingTrackedStateSerialized = trackedStateSerialized

    historyTimer = window.setTimeout(() => {
      historyTimer = undefined
      commitHistory(pendingHistoryLabel, pendingTrackedStateSerialized)
    }, 420)
  }

  function markHistory(label: string) {
    flushPendingHistory()
    pendingHistoryLabel = label
  }

  function restoreHistorySnapshot(snapshot: EditorSnapshot) {
    isRestoringHistory = true
    input.restoreSnapshot(cloneJson(snapshot))
    createBaselineSnapshot = null
    lastHistorySnapshot = input.createSnapshot()
    lastTrackedStateSerialized = serializeTrackedSnapshot(lastHistorySnapshot)
    window.setTimeout(() => {
      isRestoringHistory = false
    }, 0)
  }

  function undoChange() {
    flushPendingHistory()
    const entry = historyPast.value[historyPast.value.length - 1]
    if (!entry) {
      return
    }

    const currentSnapshot = input.createSnapshot()
    historyPast.value = historyPast.value.slice(0, -1)
    historyFuture.value = [{ ...entry, snapshot: currentSnapshot }, ...historyFuture.value]
    restoreHistorySnapshot(entry.snapshot)
  }

  function redoChange() {
    flushPendingHistory()
    const entry = historyFuture.value[0]
    if (!entry) {
      return
    }

    const currentSnapshot = input.createSnapshot()
    historyFuture.value = historyFuture.value.slice(1)
    historyPast.value = [...historyPast.value, { ...entry, snapshot: currentSnapshot }].slice(-MAX_HISTORY_ENTRIES)
    restoreHistorySnapshot(entry.snapshot)
  }

  function disposeHistory() {
    if (historyTimer !== undefined) {
      window.clearTimeout(historyTimer)
    }
    createBaselineSnapshot = null
  }

  return {
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
  }
}

export type EditorHistory = ReturnType<typeof useEditorHistory>
