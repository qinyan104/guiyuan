<script setup lang="ts">
import { onMounted, onBeforeUnmount } from 'vue'
import type { KinshipTerm } from '../lib/kinship'
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
  (event: 'open-kinship'): void
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
  if (target.closest('.floating-panel') || target.closest('.tool-btn--panel')) {
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
    <button
      class="tool-btn tool-btn--quiet"
      type="button"
      title="推算两个成员之间的亲属称谓"
      @click="$emit('open-kinship')"
    >
      <svg class="tool-icon" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"><circle cx="6" cy="5" r="2" /><circle cx="12" cy="11" r="2" /><path d="M4 7l-1 4 4 1" /><path d="M10 9l1-4-4-1" /></svg>
      关系
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
          <span class="selection-chip__family">{{ focusFamilyLabel }}</span>
          <strong>{{ selectedPersonName }}</strong>
        </div>
        <em>{{ selectedPersonMeta }}</em>
        <div v-if="relationshipToSelected" class="selection-chip__kinship">
          <span class="selection-chip__kinship-tag">{{ relationshipToSelected.term }}</span>
          <span class="selection-chip__kinship-desc">{{ relationshipToSelected.description }}</span>
        </div>
      </div>
      <div class="selection-chip__actions">
        <button class="selection-chip__btn selection-chip__btn--danger" type="button" @click="$emit('open-editor')">
          <svg class="btn-icon" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"><path d="M11 2l3 3-9 9H2v-3l9-9z" /></svg>
          编辑
        </button>
        <button class="selection-chip__btn" type="button" @click="$emit('reveal-selected-person')">
          <svg class="btn-icon" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"><circle cx="8" cy="8" r="3" /><path d="M1 8s3-6 7-6 7 6 7 6-3 6-7 6-7-6-7-6z" /></svg>
          定位
        </button>
        <button v-if="canFocusSelectedBranch" class="selection-chip__btn selection-chip__btn--accent" type="button" @click="$emit('focus-selected-branch')">
          设为主支
        </button>
      </div>
    </div>

    <div class="zoom-control">
      <button class="zoom-control__btn" type="button" @click="$emit('adjust-zoom', -0.05)">−</button>
      <span>{{ Math.round(zoom * 100) }}%</span>
      <button class="zoom-control__btn" type="button" @click="$emit('adjust-zoom', 0.05)">+</button>
    </div>
  </div>

  <Transition name="float-panel">
    <section v-if="layoutPanelOpen" class="floating-panel floating-panel--left">
      <div class="floating-panel__header">
        <div>
          <h2>版式设置</h2>
        </div>
        <button class="floating-panel__close" type="button" @click="$emit('close-layout')">
          <svg class="btn-icon" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"><line x1="4" y1="4" x2="12" y2="12" /><line x1="12" y1="4" x2="4" y2="12" /></svg>
          关闭
        </button>
      </div>

      <label class="field">
        <span>纸张尺寸</span>
        <AppSelect :model-value="settings.paper" :options="[{value:'A3',label:'A3 横向'},{value:'A4',label:'A4 横向'}]" @change="(v: string) => updateSetting('paper', v as PublicationSettings['paper'])" />
      </label>

      <label class="field">
        <span>人物卡宽度 {{ settings.cardWidth }}px</span>
        <input :value="settings.cardWidth" type="range" min="120" max="200" step="2" @input="updateSetting('cardWidth', readNumericValue($event))" />
      </label>

      <label class="field">
        <span>代际间距 {{ settings.generationGap }}px</span>
        <input :value="settings.generationGap" type="range" min="80" max="280" step="10" @input="updateSetting('generationGap', readNumericValue($event))" />
      </label>

      <label class="field">
        <span>兄弟间距 {{ settings.siblingGap }}px</span>
        <input :value="settings.siblingGap" type="range" min="40" max="180" step="4" @input="updateSetting('siblingGap', readNumericValue($event))" />
      </label>

      <label class="field">
        <span>字体倍率 {{ settings.fontScale.toFixed(2) }}</span>
        <input :value="settings.fontScale" type="range" min="0.72" max="1.40" step="0.02" @input="updateSetting('fontScale', readNumericValue($event))" />
      </label>

      <fieldset class="toggle-group">
        <legend class="toggle-group__label">卡片信息</legend>
        <div class="toggle-row">
          <label class="toggle">
            <input :checked="settings.showCard" type="checkbox" @change="updateSetting('showCard', readCheckedValue($event))" />
            <span>显示卡片</span>
          </label>
          <label class="toggle" :class="{ 'toggle--disabled': !settings.showCard }">
            <input :checked="settings.showPhoto" type="checkbox" :disabled="!settings.showCard" @change="updateSetting('showPhoto', readCheckedValue($event))" />
            <span>显示照片</span>
          </label>
          <label class="toggle" :class="{ 'toggle--disabled': !settings.showCard }">
            <input :checked="settings.showStatus" type="checkbox" :disabled="!settings.showCard" @change="updateSetting('showStatus', readCheckedValue($event))" />
            <span>显示状态</span>
          </label>
          <label class="toggle" :class="{ 'toggle--disabled': !settings.showCard }">
            <input :checked="settings.showNote" type="checkbox" :disabled="!settings.showCard" @change="updateSetting('showNote', readCheckedValue($event))" />
            <span>显示注记</span>
          </label>
        </div>
      </fieldset>

      <fieldset class="toggle-group">
        <legend class="toggle-group__label">生卒信息</legend>
        <div class="toggle-row">
          <label class="toggle" :class="{ 'toggle--disabled': !settings.showCard }">
            <input :checked="settings.showBirth" type="checkbox" :disabled="!settings.showCard" @change="updateSetting('showBirth', readCheckedValue($event))" />
            <span>显示生辰</span>
          </label>
          <label class="toggle" :class="{ 'toggle--disabled': !settings.showCard }">
            <input :checked="settings.showDeath" type="checkbox" :disabled="!settings.showCard" @change="updateSetting('showDeath', readCheckedValue($event))" />
            <span>显示卒年</span>
          </label>
          <label class="toggle" :class="{ 'toggle--disabled': !settings.showCard }">
            <input :checked="settings.showAge" type="checkbox" :disabled="!settings.showCard" @change="updateSetting('showAge', readCheckedValue($event))" />
            <span>显示年龄</span>
          </label>
        </div>
      </fieldset>

      <fieldset class="toggle-group">
        <legend class="toggle-group__label">世系</legend>
        <div class="toggle-row">
          <label class="toggle">
            <input :checked="settings.showLineage" type="checkbox" @change="updateSetting('showLineage', readCheckedValue($event))" />
            <span>显示世系</span>
          </label>
        </div>
      </fieldset>
    </section>
  </Transition>

  <Transition name="float-panel">
    <section v-if="historyOpen" class="floating-panel floating-panel--left floating-panel--history">
      <div class="floating-panel__header">
        <div>
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
        <button class="history-action-btn" type="button" :disabled="!canUndo" @click="$emit('undo')">
          <svg class="btn-icon" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M4 6h7a3 3 0 0 1 0 6H9" /><path d="M7 3L4 6l3 3" /></svg>
          <span>撤销</span>
        </button>
        <button class="history-action-btn" type="button" :disabled="!canRedo" @click="$emit('redo')">
          <svg class="btn-icon" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M12 6H5a3 3 0 0 0 0 6h2" /><path d="M9 3l3 3-3 3" /></svg>
          <span>重做</span>
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