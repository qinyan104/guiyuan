<script setup lang="ts">
import { computed } from "vue"
import type { LineageEntry, LineagePage } from "../../types/publishing"

export interface EntryOverride {
  fontSize?: number
  lineHeight?: number
}

const props = defineProps<{
  selectedElementId: string | null
  pageData?: LineagePage | null
  overrides: Record<string, EntryOverride>
}>()

const emit = defineEmits<{
  close: []
  updateEntry: [personId: string, override: EntryOverride]
  applyToPage: [overrides: Record<string, EntryOverride>]
  applyToAll: [overrides: Record<string, EntryOverride>]
}>()

const selectedEntry = computed<LineageEntry | null>(() => {
  if (!props.selectedElementId || !props.pageData) return null
  return props.pageData.entries.find(e => e.personId === props.selectedElementId) ?? null
})

const currentOverride = computed<EntryOverride>(() => {
  if (!props.selectedElementId) return {}
  return props.overrides[props.selectedElementId] ?? {}
})

function changeFontSize(d: number) {
  if (!props.selectedElementId) return
  const cur = currentOverride.value.fontSize ?? 12
  const next = Math.max(10, Math.min(16, cur + d))
  emit("updateEntry", props.selectedElementId, { ...currentOverride.value, fontSize: next })
}

function changeLineHeight(d: number) {
  if (!props.selectedElementId) return
  const cur = currentOverride.value.lineHeight ?? 1.9
  const next = Math.round(Math.max(1.5, Math.min(2.5, cur + d)) * 10) / 10
  emit("updateEntry", props.selectedElementId, { ...currentOverride.value, lineHeight: next })
}

function handleApplyToPage() {
  if (!props.selectedElementId) return
  emit("applyToPage", { [props.selectedElementId]: { ...currentOverride.value } })
}

function handleApplyToAll() {
  if (!props.selectedElementId) return
  emit("applyToAll", { [props.selectedElementId]: { ...currentOverride.value } })
}
</script>

<template>
  <Transition name="inspector-slide">
    <div v-if="selectedElementId" class="element-inspector">
      <div class="inspector-header">
        <h4 class="inspector-title">条目属性</h4>
        <button class="inspector-close" @click="$emit('close')">&times;</button>
      </div>
      <div class="inspector-body">
        <p class="inspector-name" v-if="selectedEntry">{{ selectedEntry.personName }}</p>
        <p class="inspector-id">ID: {{ selectedElementId }}</p>

        <div class="inspector-fields">
          <div class="field-row">
            <label class="field-label">字号</label>
            <div class="field-control">
              <button class="field-btn" @click="changeFontSize(-1)">−</button>
              <span class="field-value">{{ currentOverride.fontSize ?? 12 }}pt</span>
              <button class="field-btn" @click="changeFontSize(1)">+</button>
            </div>
          </div>
          <div class="field-row">
            <label class="field-label">行距</label>
            <div class="field-control">
              <button class="field-btn" @click="changeLineHeight(-0.1)">−</button>
              <span class="field-value">{{ (currentOverride.lineHeight ?? 1.9).toFixed(1) }}</span>
              <button class="field-btn" @click="changeLineHeight(0.1)">+</button>
            </div>
          </div>
        </div>

        <div class="inspector-actions">
          <button class="action-btn action-btn--page" @click="handleApplyToPage">应用到本页</button>
          <button class="action-btn action-btn--all" @click="handleApplyToAll">应用到全部</button>
        </div>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.element-inspector {
  position: absolute;
  top: 12px;
  right: 12px;
  width: 220px;
  background: var(--color-neutral-1);
  border: 1px solid var(--color-neutral-3);
  border-radius: 10px;
  box-shadow: var(--shadow-whisper);
  z-index: 20;
  overflow: hidden;
}

.inspector-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px 0;
}

.inspector-title {
  font-size: 13px;
  font-weight: 500;
  color: var(--color-neutral-9);
  margin: 0;
}

.inspector-close {
  width: 24px;
  height: 24px;
  border: none;
  background: transparent;
  color: var(--color-neutral-5);
  font-size: 18px;
  cursor: pointer;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
}
.inspector-close:hover {
  background: var(--color-neutral-2);
  color: var(--color-neutral-9);
}

.inspector-body {
  padding: 8px 16px 16px;
}

.inspector-name {
  font-size: 14px;
  font-weight: 500;
  color: var(--color-neutral-9);
  margin: 0 0 2px;
}

.inspector-id {
  font-size: 10px;
  color: var(--color-accent);
  font-family: monospace;
  margin: 0 0 14px;
  word-break: break-all;
  opacity: 0.6;
}

.inspector-fields {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-bottom: 14px;
}

.field-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.field-label {
  font-size: 12px;
  color: var(--color-neutral-6);
}

.field-control {
  display: flex;
  align-items: center;
  gap: 4px;
}

.field-btn {
  width: 24px;
  height: 24px;
  border: 1px solid var(--color-neutral-3);
  background: var(--color-neutral-1);
  color: var(--color-neutral-6);
  border-radius: 4px;
  font-size: 14px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  transition: all 0.15s;
}
.field-btn:hover {
  background: var(--color-neutral-2);
  color: var(--color-neutral-9);
  border-color: var(--color-neutral-4);
}

.field-value {
  font-size: 12px;
  color: var(--color-neutral-8);
  min-width: 32px;
  text-align: center;
  font-variant-numeric: tabular-nums;
}

.inspector-actions {
  display: flex;
  gap: 6px;
}

.action-btn {
  flex: 1;
  padding: 6px 0;
  border-radius: 5px;
  font-size: 11px;
  cursor: pointer;
  border: none;
  transition: all 0.15s;
}
.action-btn--page {
  background: var(--color-accent-muted);
  color: var(--color-accent);
}
.action-btn--page:hover {
  background: var(--color-accent);
  color: #fff;
}
.action-btn--all {
  background: var(--color-neutral-2);
  color: var(--color-neutral-7);
}
.action-btn--all:hover {
  background: var(--color-neutral-4);
  color: var(--color-neutral-9);
}

/* ── Transition ── */
.inspector-slide-enter-active,
.inspector-slide-leave-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
}
.inspector-slide-enter-from,
.inspector-slide-leave-to {
  opacity: 0;
  transform: translateX(12px);
}
</style>
