<script setup lang="ts">
import { onMounted, onBeforeUnmount } from 'vue'
import type { PublicationSettings } from '../types/family'

interface HistoryDisplayEntry {
  id: string
  label: string
  time: string
}

const props = defineProps<{
  layoutPanelOpen: boolean
  historyOpen: boolean
  focusFamilyLabel: string
  canReturnToMainBranch: boolean
  canUndo: boolean
  canRedo: boolean
  zoom: number
  hasSelectedPerson: boolean
  selectedPersonName: string
  selectedPersonMeta: string
  canFocusSelectedBranch: boolean
  settings: PublicationSettings
  historyPastCount: number
  historyFutureCount: number
  visibleHistoryEntries: HistoryDisplayEntry[]
}>()

const emit = defineEmits<{
  (event: 'toggle-layout'): void
  (event: 'toggle-history'): void
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
  (event: 'update-settings', patch: Partial<PublicationSettings>): void
}>()

function updateSetting<K extends keyof PublicationSettings>(key: K, value: PublicationSettings[K]) {
  emit('update-settings', { [key]: value } as Partial<PublicationSettings>)
}

function readNumericValue(event: Event): number {
  return Number((event.target as HTMLInputElement).value)
}

function readCheckedValue(event: Event): boolean {
  return (event.target as HTMLInputElement).checked
}

function readPaperValue(event: Event): PublicationSettings['paper'] {
  return (event.target as HTMLSelectElement).value as PublicationSettings['paper']
}

function onClickOutside(e: MouseEvent) {
  const target = e.target as Element | null
  if (!target) return

  // If clicked inside any floating panel or panel toggle button, do nothing
  if (target.closest('.floating-panel') || target.closest('.tool-btn--panel')) {
    return
  }

  // Otherwise, close any open panels
  if (props.layoutPanelOpen) emit('close-layout')
  if (props.historyOpen) emit('close-history')
}

onMounted(() => {
  document.addEventListener('click', onClickOutside, { capture: true })
})

onBeforeUnmount(() => {
  document.removeEventListener('click', onClickOutside, { capture: true })
})
</script>

<template>
  <div class="floating-toolbar floating-toolbar--left" aria-label="画布工具">
    <div class="tool-switcher" role="group" aria-label="面板切换">
      <button
        class="tool-btn tool-btn--panel"
        :class="{ 'tool-btn--active': layoutPanelOpen }"
        type="button"
        :aria-pressed="layoutPanelOpen"
        @click="$emit('toggle-layout')"
      >
        <svg class="tool-icon" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"><rect x="3" y="3" width="14" height="14" rx="2" /><line x1="3" y1="8" x2="17" y2="8" /><line x1="10" y1="8" x2="10" y2="17" /></svg>
        版式
      </button>
      <button
        class="tool-btn tool-btn--panel"
        :class="{ 'tool-btn--active': historyOpen }"
        type="button"
        :aria-pressed="historyOpen"
        @click="$emit('toggle-history')"
      >
        <svg class="tool-icon" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"><path d="M4 7h5l-2-3" /><path d="M4 7a6 6 0 1 1 0 6" /><circle cx="12" cy="10" r="1" fill="currentColor" stroke="none" /></svg>
        历史
      </button>
    </div>
    <button
      v-if="canReturnToMainBranch"
      class="tool-btn tool-btn--quiet"
      type="button"
      aria-label="返回父系主谱"
      @click="$emit('return-main-branch')"
    >
      <svg class="tool-icon" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"><path d="M12 4L6 10l6 6" /><line x1="6" y1="10" x2="16" y2="10" /></svg>
      回主谱
    </button>
    <button
      class="tool-btn tool-btn--quiet"
      type="button"
      aria-label="查看当前宗支全览"
      @click="$emit('reset-canvas-view')"
    >
      <svg class="tool-icon" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"><rect x="2" y="5" width="16" height="10" rx="2" /><circle cx="10" cy="10" r="3" /><path d="M4.5 7.5l2 2" /></svg>
      全览
    </button>
  </div>

  <div class="floating-toolbar floating-toolbar--right">
    <div v-if="!hasSelectedPerson" class="status-chip status-chip--compact">
      <span>宗支</span>
      <strong>{{ focusFamilyLabel }}</strong>
    </div>

    <div v-if="hasSelectedPerson" class="selection-chip">
      <div class="selection-chip__content">
        <div class="selection-chip__header">
          <strong>{{ selectedPersonName }}</strong>
          <span class="selection-chip__family">宗支 {{ focusFamilyLabel }}</span>
        </div>
        <em>{{ selectedPersonMeta }}</em>
      </div>
      <div class="selection-chip__actions">
        <button class="selection-chip__btn" type="button" @click="$emit('reveal-selected-person')">
          <svg class="btn-icon" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"><circle cx="7" cy="7" r="4.5" /><line x1="10.2" y1="10.2" x2="14" y2="14" /></svg>
          定位
        </button>
        <button class="selection-chip__btn" type="button" :disabled="!canFocusSelectedBranch" @click="$emit('focus-selected-branch')">
          <svg class="btn-icon" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"><path d="M8 2v5" /><path d="M4 9v5" /><path d="M12 9v5" /><path d="M4 9h8" /></svg>
          切到该支
        </button>
        <button class="selection-chip__btn selection-chip__btn--accent" type="button" @click="$emit('open-editor')">
          <svg class="btn-icon" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"><path d="M11.5 2.5l2 2L5 13H3v-2L11.5 2.5z" /></svg>
          编辑
        </button>
      </div>
    </div>

    <div class="zoom-control">
      <button class="zoom-control__btn" type="button" aria-label="缩小" @click="$emit('adjust-zoom', -0.05)">
        <svg class="btn-icon" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"><line x1="4" y1="8" x2="12" y2="8" /></svg>
      </button>
      <span>{{ Math.round(zoom * 100) }}%</span>
      <button class="zoom-control__btn" type="button" aria-label="放大" @click="$emit('adjust-zoom', 0.05)">
        <svg class="btn-icon" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"><line x1="4" y1="8" x2="12" y2="8" /><line x1="8" y1="4" x2="8" y2="12" /></svg>
      </button>
    </div>
  </div>

  <Transition name="float-panel">
    <section v-if="layoutPanelOpen" class="floating-panel floating-panel--left">
      <div class="floating-panel__header">
        <div>
          <p class="floating-panel__eyebrow">Layout</p>
          <h2>版式设置</h2>
        </div>
        <button class="floating-panel__close" type="button" @click="$emit('close-layout')">
          <svg class="btn-icon" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"><line x1="4" y1="4" x2="12" y2="12" /><line x1="12" y1="4" x2="4" y2="12" /></svg>
          关闭
        </button>
      </div>

      <label class="field">
        <span>纸张尺寸</span>
        <select :value="settings.paper" @change="updateSetting('paper', readPaperValue($event))">
          <option value="A3">A3 横向</option>
          <option value="A4">A4 横向</option>
        </select>
      </label>

      <label class="field">
        <span>人物卡宽度 {{ settings.cardWidth }}px</span>
        <input :value="settings.cardWidth" type="range" min="142" max="176" step="2" @input="updateSetting('cardWidth', readNumericValue($event))" />
      </label>

      <label class="field">
        <span>代际间距 {{ settings.generationGap }}px</span>
        <input :value="settings.generationGap" type="range" min="120" max="220" step="10" @input="updateSetting('generationGap', readNumericValue($event))" />
      </label>

      <label class="field">
        <span>兄弟间距 {{ settings.siblingGap }}px</span>
        <input :value="settings.siblingGap" type="range" min="56" max="140" step="4" @input="updateSetting('siblingGap', readNumericValue($event))" />
      </label>

      <label class="field">
        <span>字体倍率 {{ settings.fontScale.toFixed(2) }}</span>
        <input :value="settings.fontScale" type="range" min="0.88" max="1.18" step="0.02" @input="updateSetting('fontScale', readNumericValue($event))" />
      </label>

      <div class="toggle-row">
        <label class="toggle">
          <input :checked="settings.showDeath" type="checkbox" @change="updateSetting('showDeath', readCheckedValue($event))" />
          <span>显示卒年</span>
        </label>

        <label class="toggle">
          <input :checked="settings.showAge" type="checkbox" @change="updateSetting('showAge', readCheckedValue($event))" />
          <span>显示年龄</span>
        </label>

        <label class="toggle">
          <input :checked="settings.showNote" type="checkbox" @change="updateSetting('showNote', readCheckedValue($event))" />
          <span>显示注记</span>
        </label>

        <label class="toggle">
          <input :checked="settings.showPhoto" type="checkbox" @change="updateSetting('showPhoto', readCheckedValue($event))" />
          <span>显示照片</span>
        </label>
      </div>
    </section>
  </Transition>

  <Transition name="float-panel">
    <section v-if="historyOpen" class="floating-panel floating-panel--left floating-panel--history">
      <div class="floating-panel__header">
        <div>
          <p class="floating-panel__eyebrow">History</p>
          <h2>操作历史</h2>
        </div>
        <button class="floating-panel__close" type="button" @click="$emit('close-history')">
          <svg class="btn-icon" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"><line x1="4" y1="4" x2="12" y2="12" /><line x1="12" y1="4" x2="4" y2="12" /></svg>
          关闭
        </button>
      </div>

      <div class="history-panel__summary">
        <strong>可撤销 {{ historyPastCount }} 步</strong>
        <span>可重做 {{ historyFutureCount }} 步</span>
      </div>

      <div class="history-panel__actions">
        <button class="relation-btn" type="button" :disabled="!canUndo" @click="$emit('undo')">
          <svg class="btn-icon" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"><path d="M4 6h7a3 3 0 0 1 0 6H9" /><path d="M7 3L4 6l3 3" /></svg>
          撤销上一步
        </button>
        <button class="relation-btn" type="button" :disabled="!canRedo" @click="$emit('redo')">
          <svg class="btn-icon" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"><path d="M12 6H5a3 3 0 0 0 0 6h2" /><path d="M9 3l3 3-3 3" /></svg>
          重做上一步
        </button>
      </div>

      <p class="history-panel__hint">快捷键支持 `Ctrl/Command + Z`，重做支持 `Ctrl/Command + Y` 或 `Shift + Z`。</p>

      <div v-if="visibleHistoryEntries.length" class="history-list">
        <article v-for="(entry, index) in visibleHistoryEntries" :key="entry.id" class="history-entry">
          <div class="history-entry__meta">
            <span>{{ entry.time }}</span>
            <em v-if="index === 0">最近</em>
          </div>
          <strong>{{ entry.label }}</strong>
        </article>
      </div>

      <p v-else class="history-empty">当前还没有可撤销的操作，开始编辑后会在这里记录。</p>
    </section>
  </Transition>
</template>