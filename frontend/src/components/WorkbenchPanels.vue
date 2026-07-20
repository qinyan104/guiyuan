<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, toRef, watch } from 'vue'
import type { KinshipTerm } from '../lib/kinship'
import { useFocusTrap } from '../composables/useFocusTrap'
import type { PublicationSettings } from '../types/family'
import ValidationPanel from '../features/validation/ValidationPanel.vue'

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

const validationDialogRef = ref<HTMLElement | null>(null)
const validationOpenRef = toRef(props, 'validationOpen')

function closeValidationDialog() {
  emit('close-validation')
}

function handleValidationLocate(personId: string) {
  closeValidationDialog()
  emit('locate-person', personId)
}

useFocusTrap(validationDialogRef, validationOpenRef, closeValidationDialog)

function updateSetting<K extends keyof PublicationSettings>(key: K, value: PublicationSettings[K]) {
  emit('update-settings', { [key]: value } as Partial<PublicationSettings>)
}

function readNumericValue(event: Event): number {
  return Number((event.target as HTMLInputElement).value)
}

function readCheckedValue(event: Event): boolean {
  return (event.target as HTMLInputElement).checked
}

function sliderFill(value: number, min: number, max: number): string {
  const pct = ((value - min) / (max - min)) * 100
  return `${Math.round(pct)}%`
}

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
  <div class="floating-toolbar floating-toolbar--left" role="toolbar" aria-label="画布工具">
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
      <button
        class="tool-btn tool-btn--panel"
        :class="{ 'tool-btn--active': validationOpen }"
        type="button"
        :aria-pressed="validationOpen"
        @click="$emit('toggle-validation')"
      >
        <svg class="tool-icon" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"><path d="M9 11l2 2 4-6" /><circle cx="10" cy="10" r="7" /></svg>
        校验
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
      <span class="status-chip__label">当前宗支</span>
      <strong class="status-chip__value">{{ focusFamilyLabel }}</strong>
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
      <span class="zoom-control__value">缩放 {{ Math.round(zoom * 100) }}%</span>
      <button class="zoom-control__btn" type="button" @click="$emit('adjust-zoom', 0.05)">+</button>
    </div>
  </div>

  <Transition name="float-panel">
    <section v-if="layoutPanelOpen" class="layout-panel floating-panel--left" @mousedown.stop @wheel.stop>
      <div class="floating-panel__header">
        <div>
          <p class="floating-panel__eyebrow">排版</p>
          <h2>版式设置</h2>
        </div>
        <button class="floating-panel__close" type="button" @click="$emit('close-layout')" aria-label="关闭">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><line x1="3" y1="3" x2="11" y2="11" /><line x1="11" y1="3" x2="3" y2="11" /></svg>
        </button>
      </div>

      <div class="lp-overview">
        <span class="lp-mode-pill" :class="{ 'lp-mode-pill--compact': !settings.showCard }">
          {{ settings.showCard ? '卡片模式' : '简式模式' }}
        </span>
        <strong>{{ settings.paper }} · {{ Math.round(zoom * 100) }}%</strong>
      </div>

      <div class="lp-stack">
        <div class="lp-section">
          <div class="lp-section-head">
            <div class="lp-section-icon">
              <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"><rect x="2.5" y="3" width="11" height="10" rx="2" /><line x1="5" y1="6" x2="11" y2="6" /><line x1="5" y1="10" x2="9" y2="10" /></svg>
            </div>
            <div>
              <p class="lp-section-title">画布基础</p>
            </div>
          </div>

          <div class="lp-surface">
            <label class="lp-field">
              <span class="lp-label">纸张尺寸</span>
              <div class="lp-select-wrap">
                <AppSelect :model-value="settings.paper" :options="[{value:'A3',label:'A3 横向'},{value:'A4',label:'A4 横向'}]" @change="(v: string) => updateSetting('paper', v as PublicationSettings['paper'])" />
              </div>
            </label>
          </div>
        </div>

        <div class="lp-section">
          <div class="lp-section-head">
            <div class="lp-section-icon">
              <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"><path d="M3 12.5h10" /><path d="M5 12.5V7.5" /><path d="M8 12.5V4.5" /><path d="M11 12.5V9.5" /></svg>
            </div>
            <div>
              <p class="lp-section-title">间距与尺寸</p>
            </div>
          </div>

          <div class="lp-surface">
            <label class="lp-field">
              <span class="lp-label">卡片宽度</span>
              <span class="lp-value">{{ settings.cardWidth }}<small>px</small></span>
              <input
                class="lp-slider"
                :value="settings.cardWidth"
                type="range" min="120" max="200" step="2"
                :style="{ '--lp-fill': sliderFill(settings.cardWidth, 120, 200) }"
                @input="updateSetting('cardWidth', readNumericValue($event))"
              />
            </label>

            <label class="lp-field">
              <span class="lp-label">代际间距</span>
              <span class="lp-value">{{ settings.generationGap }}<small>px</small></span>
              <input
                class="lp-slider lp-slider--accent"
                :value="settings.generationGap"
                type="range" min="80" max="280" step="10"
                :style="{ '--lp-fill': sliderFill(settings.generationGap, 80, 280) }"
                @input="updateSetting('generationGap', readNumericValue($event))"
              />
            </label>

            <label class="lp-field">
              <span class="lp-label">兄弟间距</span>
              <span class="lp-value">{{ settings.siblingGap }}<small>px</small></span>
              <input
                class="lp-slider lp-slider--warm"
                :value="settings.siblingGap"
                type="range" min="40" max="180" step="4"
                :style="{ '--lp-fill': sliderFill(settings.siblingGap, 40, 180) }"
                @input="updateSetting('siblingGap', readNumericValue($event))"
              />
            </label>

            <label class="lp-field">
              <span class="lp-label">字体倍率</span>
              <span class="lp-value">{{ settings.fontScale.toFixed(2) }}<small>x</small></span>
              <input
                class="lp-slider"
                :value="settings.fontScale"
                type="range" min="0.72" max="1.40" step="0.02"
                :style="{ '--lp-fill': sliderFill(settings.fontScale, 0.72, 1.40) }"
                @input="updateSetting('fontScale', readNumericValue($event))"
              />
            </label>
          </div>
        </div>

        <div class="lp-section">
          <div class="lp-section-head">
            <div class="lp-section-icon">
              <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"><rect x="2.5" y="2.5" width="11" height="11" rx="2" /><path d="M5.5 6.5h5" /><path d="M5.5 9.5h3" /></svg>
            </div>
            <div>
              <p class="lp-section-title">卡片信息</p>
            </div>
          </div>

          <div class="lp-surface lp-surface--toggle-grid">
            <div class="lp-toggles lp-toggles--grid">
              <label class="lp-toggle lp-toggle--emphasis">
                <span>显示卡片</span>
                <span class="lp-switch" :class="{ 'lp-switch--active': settings.showCard }">
                  <input :checked="settings.showCard" type="checkbox" @change="updateSetting('showCard', readCheckedValue($event))" />
                  <span class="lp-switch__track"><span class="lp-switch__thumb" /></span>
                </span>
              </label>
              <label class="lp-toggle" :class="{ 'lp-toggle--disabled': !settings.showCard }">
                <span>显示照片</span>
                <span class="lp-switch" :class="{ 'lp-switch--active': settings.showPhoto }">
                  <input :checked="settings.showPhoto" type="checkbox" :disabled="!settings.showCard" @change="updateSetting('showPhoto', readCheckedValue($event))" />
                  <span class="lp-switch__track"><span class="lp-switch__thumb" /></span>
                </span>
              </label>
              <label class="lp-toggle" :class="{ 'lp-toggle--disabled': !settings.showCard }">
                <span>显示状态</span>
                <span class="lp-switch" :class="{ 'lp-switch--active': settings.showStatus }">
                  <input :checked="settings.showStatus" type="checkbox" :disabled="!settings.showCard" @change="updateSetting('showStatus', readCheckedValue($event))" />
                  <span class="lp-switch__track"><span class="lp-switch__thumb" /></span>
                </span>
              </label>
              <label class="lp-toggle" :class="{ 'lp-toggle--disabled': !settings.showCard }">
                <span>显示注记</span>
                <span class="lp-switch" :class="{ 'lp-switch--active': settings.showNote }">
                  <input :checked="settings.showNote" type="checkbox" :disabled="!settings.showCard" @change="updateSetting('showNote', readCheckedValue($event))" />
                  <span class="lp-switch__track"><span class="lp-switch__thumb" /></span>
                </span>
              </label>
            </div>
          </div>
        </div>

        <div class="lp-section">
          <div class="lp-section-head">
            <div class="lp-section-icon">
              <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"><path d="M3 4.5h10" /><path d="M3 8h10" /><path d="M3 11.5h6" /></svg>
            </div>
            <div>
              <p class="lp-section-title">生卒信息</p>
            </div>
          </div>

          <div class="lp-surface lp-surface--toggle-grid">
            <div class="lp-toggles lp-toggles--grid">
              <label class="lp-toggle" :class="{ 'lp-toggle--disabled': !settings.showCard }">
                <span>显示生辰</span>
                <span class="lp-switch" :class="{ 'lp-switch--active': settings.showBirth }">
                  <input :checked="settings.showBirth" type="checkbox" :disabled="!settings.showCard" @change="updateSetting('showBirth', readCheckedValue($event))" />
                  <span class="lp-switch__track"><span class="lp-switch__thumb" /></span>
                </span>
              </label>
              <label class="lp-toggle" :class="{ 'lp-toggle--disabled': !settings.showCard }">
                <span>显示卒年</span>
                <span class="lp-switch" :class="{ 'lp-switch--active': settings.showDeath }">
                  <input :checked="settings.showDeath" type="checkbox" :disabled="!settings.showCard" @change="updateSetting('showDeath', readCheckedValue($event))" />
                  <span class="lp-switch__track"><span class="lp-switch__thumb" /></span>
                </span>
              </label>
              <label class="lp-toggle" :class="{ 'lp-toggle--disabled': !settings.showCard }">
                <span>显示年龄</span>
                <span class="lp-switch" :class="{ 'lp-switch--active': settings.showAge }">
                  <input :checked="settings.showAge" type="checkbox" :disabled="!settings.showCard" @change="updateSetting('showAge', readCheckedValue($event))" />
                  <span class="lp-switch__track"><span class="lp-switch__thumb" /></span>
                </span>
              </label>
            </div>
          </div>
        </div>

        <div class="lp-section lp-section--last">
          <div class="lp-section-head">
            <div class="lp-section-icon">
              <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"><path d="M8 3v10" /><path d="M4 5.5h8" /><path d="M5.5 9h5" /></svg>
            </div>
            <div>
              <p class="lp-section-title">世系标记</p>
            </div>
          </div>

          <div class="lp-surface lp-surface--toggle-grid">
            <div class="lp-toggles">
              <label class="lp-toggle">
                <span>显示世系</span>
                <span class="lp-switch" :class="{ 'lp-switch--active': settings.showLineage }">
                  <input :checked="settings.showLineage" type="checkbox" @change="updateSetting('showLineage', readCheckedValue($event))" />
                  <span class="lp-switch__track"><span class="lp-switch__thumb" /></span>
                </span>
              </label>
            </div>
          </div>
        </div>
      </div>
    </section>
  </Transition>

  <Transition name="float-panel">
    <section v-if="historyOpen" class="history-panel floating-panel--left" @mousedown.stop>
      <div class="floating-panel__header">
        <div>
          <p class="floating-panel__eyebrow">记录</p>
          <h2>操作历史</h2>
        </div>
        <button class="floating-panel__close" type="button" @click="$emit('close-history')" aria-label="关闭">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><line x1="3" y1="3" x2="11" y2="11" /><line x1="11" y1="3" x2="3" y2="11" /></svg>
        </button>
      </div>

      <div class="hp-summary">
        <span class="hp-summary__item">
          <strong>{{ historyPastCount }}</strong>
          <small>可撤销</small>
        </span>
        <span class="hp-summary__divider" aria-hidden="true" />
        <span class="hp-summary__item">
          <strong>{{ historyFutureCount }}</strong>
          <small>可重做</small>
        </span>
      </div>

      <div class="hp-actions">
        <button class="hp-action-btn" type="button" :disabled="!canUndo" @click="$emit('undo')">
          <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M4 6h7a3 3 0 0 1 0 6H9" /><path d="M7 3L4 6l3 3" /></svg>
          <span>撤销</span>
        </button>
        <button class="hp-action-btn" type="button" :disabled="!canRedo" @click="$emit('redo')">
          <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M12 6H5a3 3 0 0 0 0 6h2" /><path d="M9 3l3 3-3 3" /></svg>
          <span>重做</span>
        </button>
      </div>

      <p class="hp-hint">Ctrl/Command + Z 撤销 · Ctrl/Command + Y 重做</p>

      <div v-if="visibleHistoryEntries.length" class="hp-list">
        <article v-for="(entry, index) in visibleHistoryEntries" :key="entry.id" class="hp-entry" :class="{ 'hp-entry--latest': index === 0 }">
          <div class="hp-entry__meta">
            <span>{{ entry.time }}</span>
            <em v-if="index === 0">最近</em>
          </div>
          <strong>{{ entry.label }}</strong>
        </article>
      </div>

      <p v-else class="hp-empty">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"><path d="M3 1h10a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1z"/><line x1="5" y1="5" x2="11" y2="5"/><line x1="5" y1="8" x2="9" y2="8"/></svg>
        <span>开始编辑画布后会在这里记录每一步操作</span>
      </p>
    </section>
  </Transition>

  <Teleport to="body">
    <Transition name="validation-dialog">
      <div v-if="validationOpen" class="validation-dialog-overlay" @click.self="closeValidationDialog">
        <section
          ref="validationDialogRef"
          class="validation-dialog-window"
          role="dialog"
          aria-modal="true"
          aria-labelledby="validation-dialog-title"
          tabindex="-1"
          @click.stop
          @mousedown.stop
        >
          <div class="validation-dialog-header">
            <div>
              <p class="validation-dialog-eyebrow">质量</p>
              <h2 id="validation-dialog-title">数据校验</h2>
            </div>
            <button class="validation-dialog-close" type="button" @click="closeValidationDialog" aria-label="关闭">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><line x1="3" y1="3" x2="11" y2="11" /><line x1="11" y1="3" x2="3" y2="11" /></svg>
            </button>
          </div>
          <div class="validation-dialog-body">
            <ValidationPanel
              :pubId="pubId"
              @locate-person="handleValidationLocate"
            />
          </div>
        </section>
      </div>
    </Transition>
  </Teleport>

</template>

<style scoped>
.tool-icon {
  width: 16px;
  height: 16px;
  flex-shrink: 0;
  opacity: 0.85;
  transition: opacity 150ms ease;
}

.btn-icon {
  width: 14px;
  height: 14px;
  flex-shrink: 0;
  opacity: 0.8;
  transition: opacity 150ms ease;
}

.floating-toolbar {
  position: absolute;
  z-index: 25;
  display: flex;
  gap: 10px;
  align-items: center;
  flex-wrap: wrap;
}

.floating-toolbar--left {
  top: 16px;
  left: 16px;
  gap: 6px;
  padding: 4px;
  border: 1px solid var(--color-card-stroke);
  border-radius: var(--radius-xl);
  background: var(--color-panel-bg);
  box-shadow: var(--shadow-whisper);
}

.floating-toolbar--right {
  top: 16px;
  right: 16px;
  max-width: min(calc(100% - 32px), 760px);
  justify-content: flex-end;
}

.tool-btn,
.status-chip,
.zoom-control {
  border-radius: var(--radius-lg);
  background: var(--color-panel-bg);
  border: 1px solid var(--color-card-stroke);
  box-shadow: var(--shadow-whisper);
}

.tool-btn {
  display: inline-flex;
  gap: 5px;
  align-items: center;
  min-height: 34px;
  padding: 7px 11px;
  border: 1px solid transparent;
  border-radius: var(--radius-md);
  background: transparent;
  box-shadow: none;
  color: var(--color-neutral-7);
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
  transition:
    transform var(--duration-normal) var(--ease-bounce),
    box-shadow var(--duration-fast) var(--ease-breath),
    border-color var(--duration-fast) var(--ease-breath),
    background var(--duration-fast) var(--ease-breath);
}

.tool-btn:hover {
  border-color: color-mix(in srgb, var(--color-accent) 18%, transparent);
  background: var(--color-accent-muted);
  color: var(--color-accent);
  transform: translateY(-1px);
}

.tool-btn:hover .tool-icon {
  opacity: 1;
}

.tool-btn:active {
  transform: scale(0.96);
  transition-duration: 50ms;
}

.tool-btn:active .tool-icon {
  opacity: 1;
  transition-duration: 50ms;
}

.tool-switcher {
  display: inline-flex;
  gap: 2px;
  align-items: center;
  padding: 0;
  border: 0;
  border-radius: inherit;
  background: transparent;
  box-shadow: none;
}

.tool-btn--panel {
  min-width: 58px;
}

.tool-btn--panel:hover {
  background: var(--color-accent-muted);
  box-shadow: none;
}

.tool-btn--active,
.tool-btn--active:hover {
  background: #c43a31;
  border-color: #c43a31;
  color: var(--color-text-on-accent);
  box-shadow: 0 8px 18px rgba(196, 58, 49, 0.22);
}

.tool-btn--accent {
  background: var(--color-accent);
  color: var(--color-text-on-accent);
}

.tool-btn--quiet {
  padding-inline: 11px;
}

.status-chip {
  display: inline-flex;
  flex-direction: column;
  gap: 2px;
  padding: 6px 10px;
}

.status-chip--compact {
  min-width: 100px;
}

.status-chip__label {
  color: var(--color-neutral-6);
  font-size: 10px;
  letter-spacing: 0.14em;
  text-transform: uppercase;
}

.status-chip__value {
  color: var(--color-neutral-9);
  font-size: 13px;
  line-height: 1.4;
}

.selection-chip {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  padding: 6px 8px;
  border-radius: var(--radius-xl);
  background: var(--color-panel-bg);
  border: 1px solid var(--color-card-stroke);
  box-shadow: var(--shadow-float);
}

.selection-chip__content {
  display: flex;
  min-width: 220px;
  max-width: 320px;
  flex-direction: column;
  justify-content: center;
  gap: 4px;
  padding: 2px 4px 2px 6px;
}

.selection-chip__header {
  display: flex;
  gap: 8px;
  align-items: center;
  flex-wrap: wrap;
}

.selection-chip__family {
  display: inline-flex;
  align-items: center;
  padding: 4px 10px;
  border-radius: 999px;
  background: var(--color-neutral-2);
  border: 1px solid var(--color-card-stroke);
  color: var(--color-neutral-6);
  font-size: 11px;
  font-weight: 700;
}

.selection-chip__content strong {
  color: var(--color-neutral-9);
  font-family: var(--font-serif);
  font-size: 15px;
  font-weight: 700;
}

.selection-chip__content em {
  max-width: 320px;
  overflow: hidden;
  color: var(--color-neutral-6);
  font-size: 12px;
  font-style: normal;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.selection-chip__kinship {
  display: flex;
  gap: 8px;
  align-items: center;
  flex-wrap: wrap;
}

.selection-chip__kinship-tag {
  display: inline-flex;
  align-items: center;
  padding: 4px 10px;
  border-radius: 999px;
  background: var(--color-accent-muted);
  border: 1px solid var(--color-accent-muted);
  color: var(--color-accent);
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.04em;
}

.selection-chip__kinship-desc {
  color: var(--color-neutral-6);
  font-size: 12px;
  line-height: 1.5;
}

.selection-chip__actions {
  display: flex;
  gap: 6px;
  align-items: center;
  flex-wrap: wrap;
}

.selection-chip__btn {
  display: inline-flex;
  gap: 4px;
  align-items: center;
  min-width: 56px;
  border-radius: var(--radius-md);
  padding: 6px 10px;
  background: var(--color-panel-bg);
  border: 1px solid var(--color-card-stroke);
  color: var(--color-neutral-6);
  font-size: 12px;
  font-weight: 800;
  cursor: pointer;
  transition:
    transform var(--duration-fast) var(--ease-breath),
    background var(--duration-fast) var(--ease-breath),
    box-shadow var(--duration-fast) var(--ease-breath);
}

.selection-chip__btn:hover:not(:disabled) {
  background: var(--color-neutral-2);
}

.selection-chip__btn:active:not(:disabled) {
  transform: scale(0.97);
  transition-duration: 50ms;
}

.selection-chip__btn:disabled {
  cursor: not-allowed;
  opacity: var(--opacity-disabled);
}

.selection-chip__btn--accent {
  background: var(--color-accent);
  color: var(--color-text-on-accent);
  border-color: var(--color-accent);
}

.selection-chip__btn--accent:hover:not(:disabled) {
  background: var(--color-accent);
  color: var(--color-text-on-accent);
  border-color: var(--color-accent);
  box-shadow: 0 7px 16px color-mix(in srgb, var(--color-accent) 24%, transparent);
  filter: brightness(1.08);
  transform: translateY(-1px);
}

.selection-chip__btn--danger {
  background: #c43a31;
  color: var(--color-text-on-accent);
  border-color: #c43a31;
}

.selection-chip__btn--danger:hover:not(:disabled) {
  background: #c43a31;
  color: var(--color-text-on-accent);
  border-color: #c43a31;
  box-shadow: 0 7px 16px rgba(196, 58, 49, 0.24);
  filter: brightness(1.08);
  transform: translateY(-1px);
}

.tool-btn:focus-visible,
.selection-chip__btn:focus-visible,
.zoom-control__btn:focus-visible {
  outline: 3px solid var(--color-accent-muted);
  outline-offset: 2px;
}

.zoom-control {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px;
}

.zoom-control__value {
  min-width: 44px;
  text-align: center;
  color: var(--color-neutral-9);
  font-size: 13px;
  font-weight: 700;
}

.zoom-control__btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: var(--radius-md);
  background: var(--color-panel-bg);
  color: var(--color-neutral-6);
  font-size: 16px;
  font-weight: 700;
  cursor: pointer;
  transition:
    transform var(--duration-fast) var(--ease-breath),
    background var(--duration-fast) var(--ease-breath);
}

.zoom-control__btn:hover {
  background: var(--color-neutral-2);
}

.zoom-control__btn:active {
  transform: scale(0.95);
  transition-duration: 50ms;
}

.floating-panel {
  position: absolute;
  top: 74px;
  z-index: var(--z-overlay);
  width: 330px;
  max-height: calc(100% - 150px);
  overflow: auto;
  border-radius: var(--radius-2xl);
  background: var(--color-panel-bg);
  border: 1px solid var(--color-card-stroke);
  box-shadow: var(--shadow-float);
  padding: 16px;
}

.floating-panel--left {
  left: 16px;
}

.floating-panel--right {
  right: 16px;
}

.floating-panel__header {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  align-items: flex-start;
  margin-bottom: 14px;
}

.floating-panel__eyebrow {
  margin: 0 0 6px;
  color: var(--text-soft);
  font-size: 12px;
  letter-spacing: 0.2em;
  text-transform: uppercase;
}

.floating-panel__header h2 {
  margin: 0;
  font-family: var(--font-serif);
  font-size: 24px;
  font-weight: 600;
}

.floating-panel__close {
  display: inline-flex;
  gap: 5px;
  align-items: center;
  border-radius: 999px;
  padding: 9px 12px;
  background: var(--bg-panel, rgba(255, 255, 255, 0.66));
  border: 1px solid var(--line-soft, rgba(121, 96, 63, 0.16));
  color: var(--text-sub);
  font-weight: 700;
  cursor: pointer;
  transition:
    transform 150ms cubic-bezier(0.2, 0, 0, 1),
    background 150ms ease;
}

.floating-panel__close:hover {
  background: var(--bg-panel-strong, rgba(255, 255, 255, 0.88));
}

.floating-panel__close:active {
  transform: scale(0.96);
  transition-duration: 50ms;
}

.validation-dialog-overlay {
  position: fixed;
  inset: 0;
  z-index: var(--z-modal);
  display: grid;
  place-items: center;
  padding: 24px;
  background: var(--color-overlay);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
}

.validation-dialog-window {
  width: min(640px, calc(100vw - 32px));
  max-height: min(720px, calc(100dvh - 32px));
  display: flex;
  flex-direction: column;
  overflow: hidden;
  border: 1px solid var(--color-card-stroke);
  border-radius: var(--radius-2xl);
  background: var(--color-panel-bg);
  box-shadow: var(--shadow-whisper), var(--shadow-ring);
  outline: none;
}

.validation-dialog-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  padding: 20px 24px 14px;
  border-bottom: 1px solid var(--color-card-stroke);
  flex-shrink: 0;
}

.validation-dialog-eyebrow {
  margin: 0 0 4px;
  color: var(--color-accent);
  font-size: var(--text-label-12);
  font-weight: 600;
  letter-spacing: 0.14em;
  line-height: var(--leading-label);
}

.validation-dialog-header h2 {
  margin: 0;
  color: var(--color-neutral-10);
  font-family: var(--font-serif);
  font-size: var(--text-title-20);
  font-weight: 600;
  line-height: var(--leading-title);
}

.validation-dialog-close {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border: none;
  border-radius: var(--radius-md);
  background: transparent;
  color: var(--color-neutral-6);
  cursor: pointer;
  transition:
    background var(--duration-fast) var(--ease-breath),
    color var(--duration-fast) var(--ease-breath),
    transform var(--duration-fast) var(--ease-breath);
}

.validation-dialog-close:hover {
  background: var(--color-neutral-3);
  color: var(--color-neutral-9);
}

.validation-dialog-close:active {
  transform: scale(0.94);
}

.validation-dialog-body {
  min-height: 0;
  overflow: auto;
}

.validation-dialog-body :deep(.validation-panel) {
  padding: 18px 20px 20px;
}

.validation-dialog-body :deep(.vp-findings) {
  max-height: min(52vh, 420px);
  padding-right: 4px;
}

/* ══════════════════════════════════════════════════════════════
   Layout Panel (版式设置) — Yohaku Design Tokens
   ══════════════════════════════════════════════════════════════ */

.layout-panel {
  position: absolute;
  top: 74px;
  left: 16px;
  z-index: 24;
  width: 336px;
  padding: 18px;
  background: var(--color-panel-bg);
  backdrop-filter: blur(16px) saturate(1.4);
  -webkit-backdrop-filter: blur(16px) saturate(1.4);
  border: 1px solid var(--color-neutral-4);
  border-radius: 24px;
  box-shadow: var(--shadow-whisper), var(--shadow-ring);
  max-height: calc(100vh - 200px);
  overflow-y: auto;
  overscroll-behavior: contain;
}

/* ── Panel header overrides ── */

.layout-panel :deep(.floating-panel__header) {
  margin-bottom: 16px;
}

.layout-panel :deep(.floating-panel__eyebrow) {
  font-family: var(--font-sans);
  font-size: var(--text-label-12);
  font-weight: 600;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--color-accent);
  margin: 0 0 2px;
}

.layout-panel :deep(.floating-panel__header h2) {
  font-family: var(--font-serif);
  font-size: 22px;
  font-weight: 600;
  color: var(--color-neutral-10);
  line-height: var(--leading-title);
}

.lp-overview {
  display: grid;
  gap: 12px;
  margin-bottom: 14px;
  padding: 14px;
  border-radius: 20px;
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.86), rgba(255, 255, 255, 0.7)),
    var(--color-neutral-1);
  border: 1px solid var(--color-card-stroke);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.65);
}

.lp-overview__lead {
  display: grid;
  gap: 7px;
}

.lp-overview__lead strong {
  font-size: 16px;
  font-weight: 700;
  color: var(--color-neutral-10);
}

.lp-overview__lead p {
  margin: 0;
  font-size: 12px;
  line-height: 1.65;
  color: var(--color-neutral-7);
}

.lp-mode-pill {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: fit-content;
  padding: 4px 10px;
  border-radius: 999px;
  background: rgba(196, 58, 49, 0.1);
  color: var(--color-accent);
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.08em;
}

.lp-mode-pill--compact {
  background: rgba(117, 90, 55, 0.1);
  color: var(--color-neutral-7);
}

.lp-overview__stats {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8px;
}

.lp-stat {
  display: grid;
  gap: 3px;
  padding: 10px 10px 9px;
  border-radius: 14px;
  background: rgba(247, 242, 235, 0.86);
  border: 1px solid var(--color-card-stroke);
}

.lp-stat small {
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--color-neutral-6);
}

.lp-stat strong {
  font-size: 13px;
  font-weight: 700;
  color: var(--color-neutral-9);
}

.lp-stack {
  display: grid;
  gap: 14px;
}

.layout-panel :deep(.floating-panel__close) {
  padding: 6px;
  border-radius: var(--radius-md);
  background: transparent;
  border: none;
  color: var(--color-neutral-6);
  transition: background var(--duration-fast) var(--ease-breath),
              color var(--duration-fast) var(--ease-breath);
}

.layout-panel :deep(.floating-panel__close:hover) {
  background: var(--color-neutral-3);
  color: var(--color-neutral-9);
}

.layout-panel :deep(.floating-panel__close:active) {
  transform: scale(0.92);
}

/* ── Sections ── */

.lp-section {
  display: grid;
  gap: 10px;
}

.lp-section--last {
  margin-bottom: 0;
}

.lp-section-head {
  display: grid;
  grid-template-columns: 36px 1fr;
  gap: 10px;
  align-items: start;
}

.lp-section-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border-radius: 12px;
  background: rgba(196, 58, 49, 0.08);
  color: var(--color-accent);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.45);
}

.lp-section-icon svg {
  width: 16px;
  height: 16px;
}

.lp-section-title {
  font-family: var(--font-sans);
  font-size: var(--text-label-12);
  font-weight: 600;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--color-neutral-6);
  margin: 0 0 8px;
}

.lp-caption {
  margin: 0 0 10px;
  font-size: 12px;
  color: var(--color-neutral-6);
}

.lp-section-desc {
  margin: 4px 0 0;
  font-size: 12px;
  line-height: 1.6;
  color: var(--color-neutral-6);
}

.lp-surface {
  display: grid;
  gap: 10px;
  padding: 14px;
  border-radius: 18px;
  background: rgba(250, 247, 242, 0.86);
  border: 1px solid var(--color-card-stroke);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.55);
}

.lp-surface--toggle-grid {
  gap: 8px;
}

/* ── Slider fields ── */

.lp-field {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 0 12px;
  margin-bottom: 0;
  cursor: default;
}

.lp-field:last-child {
  margin-bottom: 0;
}

.lp-field--disabled {
  opacity: 0.56;
}

.lp-label {
  grid-column: 1;
  font-size: var(--text-copy-13);
  font-weight: 500;
  color: var(--color-neutral-8);
  line-height: 1;
  align-self: end;
  margin-bottom: 4px;
}

.lp-value {
  grid-column: 2;
  grid-row: 1;
  font-size: var(--text-label-12);
  font-weight: 700;
  color: var(--color-neutral-6);
  font-variant-numeric: tabular-nums;
  text-align: right;
  align-self: center;
  line-height: 1;
}

.lp-value small {
  font-weight: 500;
  font-size: 10px;
  margin-left: 1px;
  opacity: 0.7;
}

.lp-value--hex {
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.lp-select-wrap {
  grid-column: 1 / -1;
}

/* ── Custom range slider with filled track ── */

.lp-slider {
  grid-column: 1 / -1;
  -webkit-appearance: none;
  appearance: none;
  width: 100%;
  height: 4px;
  border-radius: 2px;
  background: linear-gradient(
    to right,
    var(--color-accent) 0%,
    var(--color-accent) var(--lp-fill, 50%),
    var(--color-neutral-3) var(--lp-fill, 50%),
    var(--color-neutral-3) 100%
  );
  outline: none;
  margin: 0;
  cursor: pointer;
  transition: opacity var(--duration-fast) var(--ease-breath);
}

.lp-slider--accent {
  background: linear-gradient(
    to right,
    var(--color-accent) 0%,
    var(--color-accent) var(--lp-fill, 50%),
    var(--color-neutral-3) var(--lp-fill, 50%),
    var(--color-neutral-3) 100%
  );
}

.lp-slider--warm {
  background: linear-gradient(
    to right,
    var(--color-warning) 0%,
    var(--color-warning) var(--lp-fill, 50%),
    var(--color-neutral-3) var(--lp-fill, 50%),
    var(--color-neutral-3) 100%
  );
}

.lp-slider:hover {
  opacity: 0.9;
}

.lp-slider:disabled,
.lp-color:disabled {
  cursor: not-allowed;
  opacity: 0.7;
}

.lp-slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: var(--color-neutral-1);
  border: 2px solid var(--color-accent);
  cursor: grab;
  transition: transform var(--duration-fast) var(--ease-breath),
              box-shadow var(--duration-fast) var(--ease-breath);
}

.lp-slider--warm::-webkit-slider-thumb {
  border-color: var(--color-warning);
}

.lp-slider::-webkit-slider-thumb:hover {
  transform: scale(1.25);
  box-shadow: 0 0 0 4px var(--color-accent-muted);
}

.lp-slider--warm::-webkit-slider-thumb:hover {
  box-shadow: 0 0 0 4px rgba(168, 122, 61, 0.15);
}

.lp-slider::-webkit-slider-thumb:active {
  cursor: grabbing;
  transform: scale(1.15);
}

.lp-slider::-moz-range-thumb {
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: var(--color-neutral-1);
  border: 2px solid var(--color-accent);
  cursor: grab;
}

.lp-slider--warm::-moz-range-thumb {
  border-color: var(--color-warning);
}

.lp-slider::-moz-range-track {
  height: 4px;
  border-radius: 2px;
  background: var(--color-neutral-3);
}

.lp-slider::-moz-range-progress {
  height: 4px;
  border-radius: 2px;
  background: var(--color-accent);
}

.lp-slider--warm::-moz-range-progress {
  background: var(--color-warning);
}

.lp-color {
  width: 40px;
  min-width: 40px;
  height: 32px;
  padding: 3px;
  border: 1px solid var(--color-card-stroke);
  border-radius: 10px;
  background: var(--color-neutral-1);
  cursor: pointer;
}

.lp-color-field {
  gap: 8px 12px;
}

.lp-color-row {
  grid-column: 1 / -1;
  display: grid;
  grid-template-columns: 18px 1fr auto;
  gap: 10px;
  align-items: center;
  padding: 10px 12px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.64);
  border: 1px solid var(--color-card-stroke);
}

.lp-color-preview {
  width: 18px;
  height: 18px;
  border-radius: 999px;
  border: 1px solid rgba(106, 82, 61, 0.24);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.42);
}

/* ── Toggle rows ── */

.lp-toggles {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.lp-toggles--grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
}

.lp-toggle {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 10px 12px;
  border-radius: 14px;
  border: 1px solid var(--color-card-stroke);
  background: rgba(255, 255, 255, 0.62);
  font-size: var(--text-copy-13);
  color: var(--color-neutral-8);
  cursor: pointer;
  transition:
    background var(--duration-fast) var(--ease-breath),
    border-color var(--duration-fast) var(--ease-breath),
    transform var(--duration-fast) var(--ease-breath);
  user-select: none;
}

.lp-toggle:hover {
  background: rgba(255, 255, 255, 0.84);
  border-color: rgba(168, 122, 61, 0.24);
  transform: translateY(-1px);
}

.lp-toggle--emphasis {
  background: rgba(196, 58, 49, 0.08);
  border-color: rgba(196, 58, 49, 0.16);
}

.lp-toggle--disabled {
  opacity: 0.4;
  pointer-events: none;
}

/* ── Switch toggle ── */

.lp-switch {
  position: relative;
  display: inline-flex;
  align-items: center;
  flex-shrink: 0;
}

.lp-switch input {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  border: 0;
}

.lp-switch__track {
  display: block;
  width: 32px;
  height: 18px;
  border-radius: 9px;
  background: var(--color-neutral-4);
  transition: background var(--duration-fast) var(--ease-breath);
  position: relative;
}

.lp-switch--active .lp-switch__track {
  background: var(--color-accent);
}

.lp-switch__thumb {
  position: absolute;
  top: 3px;
  left: 3px;
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: var(--color-neutral-1);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.12);
  transition: transform var(--duration-fast) var(--ease-breath);
}

.lp-switch--active .lp-switch__thumb {
  transform: translateX(14px);
}

/* ── History Panel ── */

.history-panel {
  position: absolute;
  top: 74px;
  left: 16px;
  z-index: 24;
  width: 296px;
  padding: 20px;
  background: var(--color-panel-bg);
  backdrop-filter: blur(16px) saturate(1.4);
  -webkit-backdrop-filter: blur(16px) saturate(1.4);
  border: 1px solid var(--color-neutral-4);
  border-radius: var(--radius-xl);
  box-shadow: var(--shadow-whisper), var(--shadow-ring);
  display: flex;
  flex-direction: column;
  max-height: calc(100vh - 100px);
  overflow: hidden;
}

.history-panel :deep(.floating-panel__header) {
  margin-bottom: 16px;
  flex-shrink: 0;
}

.history-panel :deep(.floating-panel__eyebrow) {
  font-family: var(--font-sans);
  font-size: var(--text-label-12);
  font-weight: 600;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--color-accent);
  margin: 0 0 2px;
}

.history-panel :deep(.floating-panel__header h2) {
  font-family: var(--font-serif);
  font-size: var(--text-title-20);
  font-weight: 600;
  color: var(--color-neutral-10);
  line-height: var(--leading-title);
}

.history-panel :deep(.floating-panel__close) {
  padding: 6px;
  border-radius: var(--radius-md);
  background: transparent;
  border: none;
  color: var(--color-neutral-6);
  transition: background var(--duration-fast) var(--ease-breath),
              color var(--duration-fast) var(--ease-breath);
}

.history-panel :deep(.floating-panel__close:hover) {
  background: var(--color-neutral-3);
  color: var(--color-neutral-9);
}

.history-panel :deep(.floating-panel__close:active) {
  transform: scale(0.92);
}

/* ── Summary bar ── */

.hp-summary {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16px;
  padding: 10px;
  margin-bottom: 12px;
  border-radius: var(--radius-lg);
  background: var(--color-neutral-2);
  border: 1px solid var(--color-neutral-3);
  flex-shrink: 0;
}

.hp-summary__item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1px;
}

.hp-summary__item strong {
  font-size: var(--text-title-20);
  font-weight: 700;
  color: var(--color-neutral-9);
  font-variant-numeric: tabular-nums;
  line-height: 1.2;
}

.hp-summary__item small {
  font-size: 10px;
  font-weight: 600;
  color: var(--color-neutral-6);
  letter-spacing: 0.06em;
}

.hp-summary__divider {
  width: 1px;
  height: 28px;
  background: var(--color-neutral-4);
}

/* ── Action buttons ── */

.hp-actions {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
  margin-bottom: 10px;
  flex-shrink: 0;
}

.hp-action-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 8px 0;
  border-radius: var(--radius-md);
  border: 1px solid var(--color-neutral-4);
  background: var(--color-neutral-1);
  color: var(--color-neutral-8);
  font-family: var(--font-sans);
  font-size: var(--text-copy-13);
  font-weight: 600;
  cursor: pointer;
  transition: background var(--duration-fast) var(--ease-breath),
              border-color var(--duration-fast) var(--ease-breath),
              opacity var(--duration-fast) var(--ease-breath);
}

.hp-action-btn svg {
  width: 14px;
  height: 14px;
  flex-shrink: 0;
}

.hp-action-btn:hover:not(:disabled) {
  background: var(--color-neutral-2);
  border-color: var(--color-neutral-5);
}

.hp-action-btn:active:not(:disabled) {
  transform: scale(0.97);
}

.hp-action-btn:disabled {
  opacity: 0.35;
  cursor: not-allowed;
}

/* ── Hint text ── */

.hp-hint {
  margin: 0 0 10px;
  font-size: 11px;
  color: var(--color-neutral-6);
  line-height: 1.6;
  flex-shrink: 0;
}

/* ── History list scrollable ── */

.hp-list {
  display: flex;
  flex-direction: column;
  gap: 3px;
  overflow-y: auto;
  flex: 1;
  min-height: 0;
  margin: 0 -20px -20px;
  padding: 0 20px 20px;
}

/* ── History entry ── */

.hp-entry {
  padding: 6px 8px;
  border-radius: var(--radius-md);
  transition: background var(--duration-fast) var(--ease-breath);
  position: relative;
}

.hp-entry:hover {
  background: var(--color-neutral-2);
}

.hp-entry--latest {
  background: var(--color-accent-muted);
}

.hp-entry--latest:hover {
  background: rgba(196, 58, 49, 0.14);
}

.hp-entry strong {
  display: block;
  font-size: var(--text-copy-13);
  font-weight: 600;
  color: var(--color-neutral-9);
  line-height: 1.4;
}

.hp-entry__meta {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 3px;
}

.hp-entry__meta span {
  font-size: 11px;
  color: var(--color-neutral-6);
  font-weight: 500;
}

.hp-entry__meta em {
  font-style: normal;
  font-size: 9px;
  font-weight: 700;
  color: var(--color-accent);
  background: var(--color-accent-muted);
  padding: 1px 6px;
  border-radius: 999px;
}

/* ── Empty state ── */

.hp-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  margin: 0;
  padding: 24px 16px;
  border-radius: var(--radius-lg);
  border: 1px dashed var(--color-neutral-4);
  color: var(--color-neutral-6);
  font-size: var(--text-copy-13);
  line-height: 1.6;
  text-align: center;
  flex-shrink: 0;
}

.hp-empty svg {
  opacity: 0.35;
}

/* ── AppSelect override inside layout panel ── */

.lp-section :deep(.app-select) {
  font-size: var(--text-copy-13);
  border-radius: var(--radius-md);
  border-color: var(--color-neutral-4);
  background: var(--color-neutral-1);
}

.lp-section :deep(.app-select:focus) {
  border-color: var(--color-accent);
  box-shadow: 0 0 0 3px var(--color-accent-muted);
}

/* ── Custom scrollbars ── */

.layout-panel::-webkit-scrollbar,
.hp-list::-webkit-scrollbar {
  width: 5px;
}

.layout-panel::-webkit-scrollbar-track,
.hp-list::-webkit-scrollbar-track {
  background: transparent;
}

.layout-panel::-webkit-scrollbar-thumb,
.hp-list::-webkit-scrollbar-thumb {
  background: var(--color-neutral-4);
  border-radius: 3px;
}

.layout-panel::-webkit-scrollbar-thumb:hover,
.hp-list::-webkit-scrollbar-thumb:hover {
  background: var(--color-neutral-5);
}

@media (max-width: 980px) {
  .floating-toolbar--left,
  .floating-toolbar--right {
    left: 12px;
    right: 12px;
    max-width: none;
  }

  .floating-toolbar--right {
    top: auto;
    bottom: 12px;
    justify-content: flex-start;
  }

  .selection-chip {
    width: 100%;
    justify-content: space-between;
  }

  .selection-chip__content {
    min-width: 0;
    max-width: none;
  }

  .zoom-control {
    margin-left: auto;
  }

  .layout-panel,
  .history-panel {
    top: 68px;
    left: 12px;
    width: min(336px, calc(100vw - 24px));
  }

  .validation-dialog-overlay {
    padding: 12px;
  }

  .validation-dialog-window {
    width: calc(100vw - 24px);
    max-height: calc(100dvh - 24px);
  }

  .validation-dialog-header {
    padding: 18px 18px 12px;
  }

  .validation-dialog-body :deep(.validation-panel) {
    padding: 16px 18px 18px;
  }

  .lp-overview__stats,
  .lp-toggles--grid {
    grid-template-columns: 1fr;
  }
}

/* ── Dark mode auto-adaptation ── */

[data-theme="dark"] .layout-panel,
[data-theme="dark"] .history-panel {
  background: var(--color-panel-bg);
  border-color: var(--color-card-stroke);
}

[data-theme="dark"] .lp-overview,
[data-theme="dark"] .lp-surface,
[data-theme="dark"] .lp-stat,
[data-theme="dark"] .lp-color-row,
[data-theme="dark"] .lp-toggle {
  background: var(--color-neutral-2);
  border-color: var(--color-card-stroke);
  box-shadow: inset 0 1px 0 var(--color-panel-glass-inset-shadow);
}

[data-theme="dark"] .lp-section-icon,
[data-theme="dark"] .lp-toggle--emphasis {
  background: var(--color-accent-muted);
  border-color: rgba(232, 93, 75, 0.18);
}

[data-theme="dark"] .lp-toggle:hover {
  background: var(--color-neutral-3);
  border-color: var(--color-neutral-5);
}

[data-theme="dark"] .hp-summary {
  background: var(--color-neutral-3);
  border-color: var(--color-neutral-4);
}

[data-theme="dark"] .hp-entry:hover {
  background: var(--color-neutral-3);
}

[data-theme="dark"] .hp-entry--latest {
  background: var(--color-error-muted);
}

[data-theme="dark"] .hp-entry--latest:hover {
  background: var(--color-error-muted);
  filter: brightness(1.2);
}

[data-theme="dark"] .hp-action-btn {
  background: var(--color-neutral-3);
  border-color: var(--color-neutral-5);
  color: var(--color-neutral-8);
}

[data-theme="dark"] .hp-action-btn:hover:not(:disabled) {
  background: var(--color-neutral-4);
}

[data-theme="dark"] .hp-empty {
  border-color: var(--color-neutral-5);
}

[data-theme="dark"] .lp-slider::-webkit-slider-thumb {
  background: var(--color-neutral-2);
}

[data-theme="dark"] .lp-switch__thumb {
  background: var(--color-neutral-3);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
}

/* Float Panel transition */
.float-panel-enter-active,
.float-panel-leave-active {
  transition:
    opacity var(--duration-panel) var(--ease-breath),
    transform var(--duration-panel) var(--ease-breath);
}

.float-panel-enter-from,
.float-panel-leave-to {
  opacity: 0;
  transform: translateY(-12px) scale(0.97);
}

.validation-dialog-enter-active,
.validation-dialog-leave-active {
  transition: opacity var(--duration-panel) var(--ease-breath);
}

.validation-dialog-enter-active .validation-dialog-window,
.validation-dialog-leave-active .validation-dialog-window {
  transition:
    opacity var(--duration-panel) var(--ease-breath),
    transform var(--duration-panel) var(--ease-breath);
}

.validation-dialog-enter-from,
.validation-dialog-leave-to {
  opacity: 0;
}

.validation-dialog-enter-from .validation-dialog-window,
.validation-dialog-leave-to .validation-dialog-window {
  opacity: 0;
  transform: translateY(8px);
}

@media (prefers-reduced-motion: reduce) {
  .validation-dialog-enter-active,
  .validation-dialog-leave-active,
  .validation-dialog-enter-active .validation-dialog-window,
  .validation-dialog-leave-active .validation-dialog-window {
    transition: none;
  }
}
</style>
