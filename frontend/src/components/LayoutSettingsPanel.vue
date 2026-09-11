<script setup lang="ts">
import type { PublicationSettings } from '../types/family'

defineProps<{
  open: boolean
  settings: PublicationSettings
}>()

const displayToggles = [
  ['showPhoto', '照片'],
  ['showNote', '注记'],
  ['showBirth', '生辰'],
  ['showDeath', '卒年'],
  ['showAge', '年龄'],
  ['showStatus', '状态'],
] as const

const emit = defineEmits<{
  (event: 'close'): void
  (event: 'update-settings', patch: Partial<PublicationSettings>): void
}>()

function resetLayoutSettings() {
  emit('update-settings', {
    cardWidth: 158,
    cardRadius: 24,
    cardShadowOpacity: 18,
    cardBackgroundColor: '#F3F1EB',
    generationGap: 170,
    siblingGap: 88,
    fontScale: 1,
    showCard: true,
    showBirth: true,
    showDeath: true,
    showAge: true,
    showNote: true,
    showStatus: true,
    showLineage: true,
    showPhoto: true,
  })
}

function updateSetting<K extends keyof PublicationSettings>(key: K, value: PublicationSettings[K]) {
  emit('update-settings', { [key]: value } as Partial<PublicationSettings>)
}

function readNumericValue(event: Event): number {
  return Number((event.target as HTMLInputElement).value)
}

function readCheckedValue(event: Event): boolean {
  return (event.target as HTMLInputElement).checked
}

function readStringValue(event: Event): string {
  return (event.target as HTMLInputElement).value
}

function sliderFill(value: number, min: number, max: number): string {
  const pct = ((value - min) / (max - min)) * 100
  return `${Math.round(pct)}%`
}
</script>

<template>
  <Transition name="float-panel">
    <section v-if="open" class="layout-panel floating-panel--left" @mousedown.stop @wheel.stop>
      <div class="floating-panel__header">
        <h2 class="lp-panel-title">版式设置</h2>
        <div class="lp-header-actions">
          <button class="lp-reset-btn" type="button" title="恢复为推荐的标准版式参数" @click="resetLayoutSettings">
            恢复默认
          </button>
          <button class="floating-panel__close" type="button" aria-label="关闭" @click="$emit('close')">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
      </div>

      <div class="lp-stack">
        <div class="lp-section">
          <div class="lp-section-head">
            <div class="lp-section-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                <rect width="18" height="18" x="3" y="3" rx="2" />
                <path d="M9 3v18" />
              </svg>
            </div>
            <div><p class="lp-section-title">尺寸与间距</p></div>
          </div>

          <div class="lp-surface">
            <label class="lp-field">
              <span class="lp-label">卡片宽度</span>
              <span class="lp-value">{{ settings.cardWidth }}<small>px</small></span>
              <input class="lp-slider" :value="settings.cardWidth" type="range" min="120" max="200" step="2" :style="{ '--lp-fill': sliderFill(settings.cardWidth, 120, 200) }" @input="updateSetting('cardWidth', readNumericValue($event))" />
            </label>

            <label class="lp-field">
              <span class="lp-label">代际间距</span>
              <span class="lp-value">{{ settings.generationGap }}<small>px</small></span>
              <input class="lp-slider lp-slider--accent" :value="settings.generationGap" type="range" min="80" max="280" step="10" :style="{ '--lp-fill': sliderFill(settings.generationGap, 80, 280) }" @input="updateSetting('generationGap', readNumericValue($event))" />
            </label>

            <label class="lp-field">
              <span class="lp-label">兄弟间距</span>
              <span class="lp-value">{{ settings.siblingGap }}<small>px</small></span>
              <input class="lp-slider lp-slider--warm" :value="settings.siblingGap" type="range" min="40" max="180" step="4" :style="{ '--lp-fill': sliderFill(settings.siblingGap, 40, 180) }" @input="updateSetting('siblingGap', readNumericValue($event))" />
            </label>

            <label class="lp-field">
              <span class="lp-label">字体倍率</span>
              <span class="lp-value">{{ settings.fontScale.toFixed(2) }}<small>x</small></span>
              <input class="lp-slider" :value="settings.fontScale" type="range" min="0.72" max="1.40" step="0.02" :style="{ '--lp-fill': sliderFill(settings.fontScale, 0.72, 1.40) }" @input="updateSetting('fontScale', readNumericValue($event))" />
            </label>
          </div>
        </div>

        <div class="lp-section">
          <div class="lp-section-head">
            <div class="lp-section-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="12" cy="12" r="10" />
                <path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20" />
              </svg>
            </div>
            <div><p class="lp-section-title">卡片外观</p></div>
          </div>

          <div class="lp-surface">
            <label class="lp-field">
              <span class="lp-label">卡片圆角</span>
              <span class="lp-value">{{ settings.cardRadius }}<small>px</small></span>
              <input class="lp-slider" :value="settings.cardRadius" type="range" min="0" max="32" step="2" :style="{ '--lp-fill': sliderFill(settings.cardRadius, 0, 32) }" @input="updateSetting('cardRadius', readNumericValue($event))" />
            </label>

            <label class="lp-field">
              <span class="lp-label">卡片阴影</span>
              <span class="lp-value">{{ settings.cardShadowOpacity }}<small>%</small></span>
              <input class="lp-slider" :value="settings.cardShadowOpacity" type="range" min="0" max="40" step="2" :style="{ '--lp-fill': sliderFill(settings.cardShadowOpacity, 0, 40) }" @input="updateSetting('cardShadowOpacity', readNumericValue($event))" />
            </label>

            <label class="lp-field lp-field--color">
              <span class="lp-label">卡片底色</span>
              <div class="lp-color-row">
                <span class="lp-value">{{ settings.cardBackgroundColor.toUpperCase() }}</span>
                <input class="lp-color-dot" :value="settings.cardBackgroundColor" type="color" @input="updateSetting('cardBackgroundColor', readStringValue($event))" />
              </div>
            </label>
          </div>
        </div>

        <div class="lp-section lp-section--last">
          <div class="lp-section-head">
            <div class="lp-section-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
            </div>
            <div><p class="lp-section-title">内容显示</p></div>
          </div>

          <div class="lp-surface lp-surface--toggle-grid">
            <label class="lp-toggle lp-toggle--master">
              <span class="lp-toggle-name">显示卡片框体</span>
              <span class="lp-switch" :class="{ 'lp-switch--active': settings.showCard }">
                <input :checked="settings.showCard" type="checkbox" @change="updateSetting('showCard', readCheckedValue($event))" />
                <span class="lp-switch__track"><span class="lp-switch__thumb" /></span>
              </span>
            </label>

            <div class="lp-toggles-grid" :class="{ 'lp-toggles-grid--disabled': !settings.showCard }">
              <label
                v-for="item in displayToggles"
                :key="item[0]"
                class="lp-toggle lp-toggle--chip"
              >
                <span>{{ item[1] }}</span>
                <span class="lp-switch lp-switch--sm" :class="{ 'lp-switch--active': settings[item[0]] }">
                  <input :checked="settings[item[0]]" type="checkbox" :disabled="!settings.showCard" @change="updateSetting(item[0], readCheckedValue($event))" />
                  <span class="lp-switch__track"><span class="lp-switch__thumb" /></span>
                </span>
              </label>
            </div>

            <div class="lp-toggle-divider" aria-hidden="true" />

            <label class="lp-toggle lp-toggle--standalone">
              <span class="lp-toggle-name">显示世系标记</span>
              <span class="lp-switch" :class="{ 'lp-switch--active': settings.showLineage }">
                <input :checked="settings.showLineage" type="checkbox" @change="updateSetting('showLineage', readCheckedValue($event))" />
                <span class="lp-switch__track"><span class="lp-switch__thumb" /></span>
              </span>
            </label>
          </div>
        </div>
      </div>
    </section>
  </Transition>
</template>

<style scoped>
.layout-panel {
  position: absolute;
  top: 74px;
  bottom: 16px;
  left: 16px;
  z-index: 24;
  width: 336px;
  box-sizing: border-box;
  padding: 16px 16px 18px;
  background: var(--color-panel-bg);
  background-clip: padding-box;
  backdrop-filter: blur(16px) saturate(1.4);
  -webkit-backdrop-filter: blur(16px) saturate(1.4);
  border: 1px solid var(--color-neutral-4);
  border-radius: 22px;
  box-shadow: var(--shadow-whisper), var(--shadow-ring);
  overflow-y: auto;
  overscroll-behavior: contain;
  scrollbar-gutter: stable;
}

.floating-panel__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 14px;
}

.lp-panel-title { margin: 0; font-size: 16px; font-weight: 600; color: var(--color-neutral-10); line-height: 1.3; }
.lp-header-actions { display: flex; align-items: center; gap: 8px; }
.lp-reset-btn { font-size: 11.5px; font-weight: 500; color: var(--color-accent); background: transparent; border: none; cursor: pointer; padding: 3px 8px; border-radius: 6px; transition: all var(--duration-fast, 150ms); }
.lp-reset-btn:hover { background: var(--color-accent-muted); }
.floating-panel__close { padding: 6px; border-radius: var(--radius-md); background: transparent; border: none; color: var(--color-neutral-6); cursor: pointer; transition: background var(--duration-fast) var(--ease-breath), color var(--duration-fast) var(--ease-breath); }
.floating-panel__close:hover { background: var(--color-neutral-3); color: var(--color-neutral-9); }
.floating-panel__close:active { transform: scale(0.92); }
.lp-stack { display: grid; gap: 12px; }
.lp-section { display: grid; gap: 8px; }
.lp-section--last { padding-bottom: 4px; }
.lp-section-head { display: grid; grid-template-columns: 32px 1fr; gap: 9px; align-items: center; }
.lp-section-icon { display: inline-flex; align-items: center; justify-content: center; width: 32px; height: 32px; border-radius: 11px; background: rgba(196, 58, 49, 0.08); color: var(--color-accent); box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.45); }
.lp-section-icon svg { width: 16px; height: 16px; }
.lp-section-title { font-family: var(--font-sans); font-size: var(--text-label-12); font-weight: 600; letter-spacing: 0.1em; text-transform: uppercase; color: var(--color-neutral-6); margin: 0; }
.lp-surface { display: grid; gap: 12px; padding: 12px; border-radius: 16px; background: rgba(250, 247, 242, 0.86); border: 1px solid var(--color-card-stroke); box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.55); }
.lp-surface--toggle-grid { gap: 8px; }
.lp-field { display: grid; grid-template-columns: 1fr auto; gap: 0 12px; margin-bottom: 0; cursor: default; }
.lp-label { grid-column: 1; font-size: var(--text-copy-13); font-weight: 500; color: var(--color-neutral-8); line-height: 1; align-self: end; margin-bottom: 4px; }
.lp-value { grid-column: 2; grid-row: 1; font-size: var(--text-label-12); font-weight: 700; color: var(--color-neutral-6); font-variant-numeric: tabular-nums; text-align: right; align-self: center; line-height: 1; }
.lp-value small { font-weight: 500; font-size: 10px; margin-left: 1px; opacity: 0.7; }
.lp-field--color { display: flex; align-items: center; justify-content: space-between; }
.lp-color-row { display: flex; align-items: center; gap: 8px; }
.lp-color-dot { width: 26px; height: 26px; padding: 1px; border-radius: 6px; border: 1px solid var(--color-card-stroke); cursor: pointer; background: transparent; }
.lp-slider { grid-column: 1 / -1; -webkit-appearance: none; appearance: none; width: 100%; height: 4px; border-radius: 2px; background: linear-gradient(to right, var(--color-accent) 0%, var(--color-accent) var(--lp-fill, 50%), var(--color-neutral-3) var(--lp-fill, 50%), var(--color-neutral-3) 100%); outline: none; margin: 0; cursor: pointer; transition: opacity var(--duration-fast) var(--ease-breath); }
.lp-slider--accent { background: linear-gradient(to right, var(--color-accent) 0%, var(--color-accent) var(--lp-fill, 50%), var(--color-neutral-3) var(--lp-fill, 50%), var(--color-neutral-3) 100%); }
.lp-slider--warm { background: linear-gradient(to right, var(--color-warning) 0%, var(--color-warning) var(--lp-fill, 50%), var(--color-neutral-3) var(--lp-fill, 50%), var(--color-neutral-3) 100%); }
.lp-slider:hover { opacity: 0.9; }
.lp-slider::-webkit-slider-thumb { -webkit-appearance: none; appearance: none; width: 14px; height: 14px; border-radius: 50%; background: var(--color-neutral-1); border: 2px solid var(--color-accent); cursor: grab; transition: transform var(--duration-fast) var(--ease-breath), box-shadow var(--duration-fast) var(--ease-breath); }
.lp-slider--warm::-webkit-slider-thumb { border-color: var(--color-warning); }
.lp-slider::-webkit-slider-thumb:hover { transform: scale(1.25); box-shadow: 0 0 0 4px var(--color-accent-muted); }
.lp-slider--warm::-webkit-slider-thumb:hover { box-shadow: 0 0 0 4px rgba(168, 122, 61, 0.15); }
.lp-slider::-webkit-slider-thumb:active { cursor: grabbing; transform: scale(1.15); }
.lp-slider::-moz-range-thumb { width: 14px; height: 14px; border-radius: 50%; background: var(--color-neutral-1); border: 2px solid var(--color-accent); cursor: grab; }
.lp-slider--warm::-moz-range-thumb { border-color: var(--color-warning); }
.lp-slider::-moz-range-track { height: 4px; border-radius: 2px; background: var(--color-neutral-3); }
.lp-slider::-moz-range-progress { height: 4px; border-radius: 2px; background: var(--color-accent); }
.lp-slider--warm::-moz-range-progress { background: var(--color-warning); }
.lp-toggle { display: flex; align-items: center; justify-content: space-between; gap: 12px; min-height: 38px; padding: 8px 10px; border-radius: 12px; border: 1px solid var(--color-card-stroke); background: rgba(255, 255, 255, 0.62); font-size: var(--text-copy-13); color: var(--color-neutral-8); cursor: pointer; transition: background var(--duration-fast) var(--ease-breath), border-color var(--duration-fast) var(--ease-breath), transform var(--duration-fast) var(--ease-breath); user-select: none; }
.lp-toggle:hover { background: rgba(255, 255, 255, 0.84); border-color: rgba(168, 122, 61, 0.24); transform: translateY(-1px); }
.lp-toggle--master { padding-bottom: 8px; border-bottom: 1px dashed var(--color-card-stroke); font-weight: 600; font-size: 12.5px; color: var(--color-neutral-9); }
.lp-toggles-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 6px 8px; transition: opacity var(--duration-fast, 150ms); }
.lp-toggles-grid--disabled { opacity: 0.45; pointer-events: none; }
.lp-toggle--chip { padding: 4px 8px; background: var(--color-panel-bg); border-radius: 7px; font-size: 11.5px; }
.lp-switch--sm { transform: scale(0.85); transform-origin: right center; }
.lp-toggle-divider { height: 1px; background: var(--color-card-stroke); margin: 4px 0; }
.lp-toggle--standalone { font-weight: 600; font-size: 12.5px; color: var(--color-neutral-9); padding-top: 2px; }
.lp-switch { position: relative; display: inline-flex; align-items: center; flex-shrink: 0; }
.lp-switch input { position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0, 0, 0, 0); border: 0; }
.lp-switch__track { display: block; width: 32px; height: 18px; border-radius: 9px; background: var(--color-neutral-4); transition: background var(--duration-fast) var(--ease-breath); position: relative; }
.lp-switch--active .lp-switch__track { background: var(--color-accent); }
.lp-switch__thumb { position: absolute; top: 3px; left: 3px; width: 12px; height: 12px; border-radius: 50%; background: var(--color-neutral-1); box-shadow: 0 1px 3px rgba(0, 0, 0, 0.12); transition: transform var(--duration-fast) var(--ease-breath); }
.lp-switch--active .lp-switch__thumb { transform: translateX(14px); }
.layout-panel::-webkit-scrollbar { width: 5px; }
.layout-panel::-webkit-scrollbar-track { background: transparent; }
.layout-panel::-webkit-scrollbar-thumb { background: var(--color-neutral-4); border-radius: 3px; }
.layout-panel::-webkit-scrollbar-thumb:hover { background: var(--color-neutral-5); }
.float-panel-enter-active, .float-panel-leave-active { transition: opacity var(--duration-panel) var(--ease-breath), transform var(--duration-panel) var(--ease-breath); }
.float-panel-enter-from, .float-panel-leave-to { opacity: 0; transform: translateY(-12px) scale(0.97); }
@media (max-width: 980px) { .layout-panel { top: 68px; bottom: 12px; left: 12px; width: min(336px, calc(100vw - 24px)); } }
@media (max-width: 980px) { .lp-toggles-grid { grid-template-columns: 1fr; } }
[data-theme="dark"] .layout-panel { background: var(--color-panel-bg); border-color: var(--color-card-stroke); }
[data-theme="dark"] .lp-surface, [data-theme="dark"] .lp-toggle { background: var(--color-neutral-2); border-color: var(--color-card-stroke); box-shadow: inset 0 1px 0 var(--color-panel-glass-inset-shadow); }
[data-theme="dark"] .lp-section-icon { background: var(--color-accent-muted); border-color: var(--color-accent-muted); }
[data-theme="dark"] .lp-toggle:hover { background: var(--color-neutral-3); border-color: var(--color-neutral-5); }
[data-theme="dark"] .lp-slider::-webkit-slider-thumb { background: var(--color-neutral-2); }
[data-theme="dark"] .lp-switch__thumb { background: var(--color-neutral-3); box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3); }
</style>
