<script setup lang="ts">
import type { KinshipTerm } from '../lib/kinship'

defineProps<{
  focusFamilyLabel: string
  zoom: number
  hasSelectedPerson: boolean
  selectedPersonName: string
  selectedPersonMeta: string
  relationshipToSelected: KinshipTerm | null
  canFocusSelectedBranch: boolean
}>()

defineEmits<{
  (event: 'open-editor'): void
  (event: 'reveal-selected-person'): void
  (event: 'focus-selected-branch'): void
  (event: 'adjust-zoom', delta: number): void
}>()
</script>

<template>
  <div class="floating-toolbar floating-toolbar--right">
    <div v-if="!hasSelectedPerson" class="status-chip status-chip--compact">
      <svg class="status-chip__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
        <line x1="6" y1="3" x2="6" y2="15" />
        <circle cx="18" cy="6" r="3" />
        <circle cx="6" cy="18" r="3" />
        <path d="M18 9a9 9 0 0 1-9 9" />
      </svg>
      <span class="status-chip__label">宗支</span>
      <strong class="status-chip__value">{{ focusFamilyLabel }}</strong>
    </div>

    <div v-if="hasSelectedPerson" class="selection-chip">
      <div class="selection-chip__content">
        <div class="selection-chip__header">
          <strong class="selection-chip__name">{{ selectedPersonName }}</strong>
          <span class="selection-chip__family">{{ focusFamilyLabel }}</span>
        </div>
        <em v-if="selectedPersonMeta" class="selection-chip__meta">{{ selectedPersonMeta }}</em>
        <div v-if="relationshipToSelected" class="selection-chip__kinship">
          <span class="selection-chip__kinship-tag">{{ relationshipToSelected.term }}</span>
          <span class="selection-chip__kinship-desc">{{ relationshipToSelected.description }}</span>
        </div>
      </div>
      <div class="selection-chip__actions">
        <button class="selection-chip__btn selection-chip__btn--primary" type="button" @click="$emit('open-editor')">
          <svg class="btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9" /><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" /></svg>
          编辑
        </button>
        <button class="selection-chip__btn" type="button" @click="$emit('reveal-selected-person')">
          <svg class="btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3" /><path d="M3 12h3m12 0h3M12 3v3m0 12v3" /></svg>
          定位
        </button>
        <button v-if="canFocusSelectedBranch" class="selection-chip__btn selection-chip__btn--accent" type="button" @click="$emit('focus-selected-branch')">
          <svg class="btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10" /><path d="m9 12 2 2 4-4" /></svg>
          设为主支
        </button>
      </div>
    </div>

    <div class="zoom-control">
      <button class="zoom-control__btn" type="button" title="缩小画布" aria-label="缩小" @click="$emit('adjust-zoom', -0.05)">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><line x1="5" y1="12" x2="19" y2="12" /></svg>
      </button>
      <span class="zoom-control__value">{{ Math.round(zoom * 100) }}%</span>
      <button class="zoom-control__btn" type="button" title="放大画布" aria-label="放大" @click="$emit('adjust-zoom', 0.05)">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
      </button>
    </div>
  </div>
</template>

<style scoped>
.btn-icon { width: 14px; height: 14px; flex-shrink: 0; opacity: 0.8; transition: opacity 150ms ease; }
.floating-toolbar { position: absolute; z-index: 25; display: flex; gap: 10px; align-items: center; flex-wrap: wrap; }
.floating-toolbar--right { top: 16px; right: 16px; justify-content: flex-end; max-width: min(720px, calc(100% - 32px)); }
.status-chip, .selection-chip { display: inline-flex; align-items: center; gap: 8px; min-height: 40px; padding: 6px 10px; border-radius: 14px; background: var(--color-panel-bg); backdrop-filter: blur(16px) saturate(1.4); -webkit-backdrop-filter: blur(16px) saturate(1.4); border: 1px solid var(--color-card-stroke); box-shadow: var(--shadow-whisper, 0 4px 20px rgba(0, 0, 0, 0.08)); }
.status-chip--compact { max-width: 260px; }
.status-chip__icon { width: 16px; height: 16px; color: var(--color-accent); flex-shrink: 0; }
.status-chip__label { color: var(--color-neutral-6); font-size: 11px; font-weight: 600; letter-spacing: 0.06em; }
.status-chip__value { color: var(--color-neutral-9); font-size: 12.5px; font-weight: 700; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.selection-chip { max-width: min(560px, calc(100vw - 220px)); align-items: stretch; padding: 6px; gap: 6px; }
.selection-chip__content { display: flex; flex-direction: column; justify-content: center; gap: 2px; min-width: 140px; max-width: 320px; padding: 2px 6px 2px 4px; }
.selection-chip__header { display: flex; align-items: baseline; gap: 8px; min-width: 0; }
.selection-chip__name { color: var(--color-neutral-10); font-size: 13px; font-weight: 700; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.selection-chip__family { color: var(--color-neutral-5); font-size: 11px; white-space: nowrap; }
.selection-chip__meta { color: var(--color-neutral-6); font-size: 11px; font-style: normal; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.selection-chip__kinship { display: flex; align-items: center; gap: 5px; min-width: 0; margin-top: 1px; }
.selection-chip__kinship-tag { flex-shrink: 0; color: var(--color-accent); background: var(--color-accent-muted); border-radius: 999px; padding: 1px 6px; font-size: 10.5px; font-weight: 700; }
.selection-chip__kinship-desc { color: var(--color-neutral-6); font-size: 10.5px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.selection-chip__actions { display: flex; align-items: center; gap: 4px; }
.selection-chip__btn { display: inline-flex; align-items: center; gap: 4px; min-height: 32px; padding: 0 9px; border-radius: 9px; border: 1px solid var(--color-card-stroke); background: transparent; color: var(--color-neutral-7); font-size: 12px; font-weight: 600; cursor: pointer; transition: all var(--duration-fast, 150ms) var(--ease-breath); }
.selection-chip__btn:hover:not(:disabled) { background: var(--color-neutral-2); border-color: var(--color-neutral-5); color: var(--color-neutral-9); }
.selection-chip__btn:active:not(:disabled) { transform: scale(0.97); }
.selection-chip__btn--primary { background: var(--color-accent); color: var(--color-text-on-accent, #ffffff); border-color: var(--color-accent); }
.selection-chip__btn--primary:hover:not(:disabled) { background: color-mix(in srgb, var(--color-accent) 88%, black); border-color: color-mix(in srgb, var(--color-accent) 88%, black); color: #ffffff; box-shadow: 0 2px 8px color-mix(in srgb, var(--color-accent) 28%, transparent); }
.selection-chip__btn--accent { background: var(--color-accent-muted); color: var(--color-accent); border-color: color-mix(in srgb, var(--color-accent) 28%, transparent); }
.selection-chip__btn--accent:hover:not(:disabled) { background: color-mix(in srgb, var(--color-accent) 20%, transparent); border-color: var(--color-accent); color: var(--color-accent); }
.selection-chip__btn:focus-visible, .zoom-control__btn:focus-visible { outline: 3px solid var(--color-accent-muted); outline-offset: 2px; }
.zoom-control { display: inline-flex; align-items: center; gap: 2px; padding: 3px 4px; border-radius: 10px; background: var(--color-panel-bg); border: 1px solid var(--color-card-stroke); box-shadow: var(--shadow-whisper, 0 4px 20px rgba(0, 0, 0, 0.08)); min-height: 34px; }
.zoom-control__value { min-width: 44px; text-align: center; color: var(--color-neutral-8); font-size: 11.5px; font-weight: 600; font-variant-numeric: tabular-nums; padding: 0 4px; user-select: none; }
.zoom-control__btn { display: inline-flex; align-items: center; justify-content: center; width: 26px; height: 26px; border-radius: 6px; background: transparent; color: var(--color-neutral-6); cursor: pointer; border: 1px solid transparent; transition: all var(--duration-fast, 150ms); }
.zoom-control__btn:hover { background: var(--color-neutral-3); color: var(--color-neutral-9); border-color: var(--color-card-stroke); }
@media (max-width: 980px) { .floating-toolbar--right { left: 12px; right: 12px; max-width: none; top: auto; bottom: 12px; justify-content: flex-start; } .selection-chip { width: 100%; justify-content: space-between; } .selection-chip__content { min-width: 0; max-width: none; } .zoom-control { margin-left: auto; } }
</style>
