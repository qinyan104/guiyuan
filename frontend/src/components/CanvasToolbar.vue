<script setup lang="ts">
defineProps<{
  layoutPanelOpen: boolean
  historyOpen: boolean
  validationOpen: boolean
  canReturnToMainBranch: boolean
  canUndo: boolean
  canRedo: boolean
}>()

defineEmits<{
  (event: 'undo'): void
  (event: 'redo'): void
  (event: 'reset-canvas-view'): void
  (event: 'return-main-branch'): void
  (event: 'toggle-layout'): void
  (event: 'toggle-history'): void
  (event: 'toggle-validation'): void
  (event: 'open-kinship'): void
}>()
</script>

<template>
  <div class="floating-toolbar floating-toolbar--left" role="toolbar" aria-label="画布工具">
    <div class="tool-group" role="group" aria-label="画布操作">
      <button class="tool-btn tool-btn--icon-only" :disabled="!canUndo" type="button" title="撤销 (Ctrl+Z)" aria-label="撤销" @click="$emit('undo')">
        <svg class="tool-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 7v6h6" /><path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13" /></svg>
      </button>
      <button class="tool-btn tool-btn--icon-only" :disabled="!canRedo" type="button" title="重做 (Ctrl+Y / Ctrl+Shift+Z)" aria-label="重做" @click="$emit('redo')">
        <svg class="tool-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M21 7v6h-6" /><path d="M3 17a9 9 0 0 1 9-9 9 9 0 0 1 6 2.3L21 13" /></svg>
      </button>
      <button class="tool-btn tool-btn--quiet" type="button" title="全览 / 居中适应全谱" aria-label="全览" @click="$emit('reset-canvas-view')">
        <svg class="tool-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M8 3H5a2 2 0 0 0-2 2v3" /><path d="M21 8V5a2 2 0 0 0-2-2h-3" /><path d="M3 16v3a2 2 0 0 0 2 2h3" /><path d="M16 21h3a2 2 0 0 0 2-2v-3" /></svg>
        全览
      </button>
      <button v-if="canReturnToMainBranch" class="tool-btn tool-btn--quiet tool-btn--main-branch" type="button" title="返回父系主谱" aria-label="返回父系主谱" @click="$emit('return-main-branch')">
        <svg class="tool-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 14 4 9 9 4" /><path d="M20 20v-7a4 4 0 0 0-4-4H4" /></svg>
        回主谱
      </button>
    </div>

    <div class="toolbar-divider" aria-hidden="true"></div>

    <div class="tool-group" role="group" aria-label="设置与工具">
      <button class="tool-btn tool-btn--panel" :class="{ 'tool-btn--active': layoutPanelOpen }" type="button" title="版式设置" :aria-pressed="layoutPanelOpen" @click="$emit('toggle-layout')">
        <svg class="tool-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="18" x="3" y="3" rx="2" /><path d="M9 3v18" /><path d="M14 9h4" /><path d="M14 15h4" /></svg>
        版式
      </button>
      <button class="tool-btn tool-btn--panel" :class="{ 'tool-btn--active': historyOpen }" type="button" title="历史记录" :aria-pressed="historyOpen" @click="$emit('toggle-history')">
        <svg class="tool-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" /><path d="M3 3v5h5" /><path d="M12 7v5l4 2" /></svg>
        历史
      </button>
      <button class="tool-btn tool-btn--panel" :class="{ 'tool-btn--active': validationOpen }" type="button" title="谱图质量校验" :aria-pressed="validationOpen" @click="$emit('toggle-validation')">
        <svg class="tool-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10" /><path d="m9 12 2 2 4-4" /></svg>
        校验
      </button>
      <button class="tool-btn tool-btn--quiet" type="button" title="推算两位成员之间的亲属称谓" @click="$emit('open-kinship')">
        <svg class="tool-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>
        称谓
      </button>
    </div>
  </div>
</template>

<style scoped>
.tool-icon { width: 16px; height: 16px; flex-shrink: 0; opacity: 0.85; transition: opacity 150ms ease; }
.floating-toolbar { position: absolute; z-index: 25; display: flex; gap: 10px; align-items: center; flex-wrap: wrap; }
.floating-toolbar--left { top: 16px; left: 16px; max-width: calc(100% - 32px); }
.tool-group { display: inline-flex; align-items: center; gap: 4px; padding: 4px; border-radius: 14px; background: var(--color-panel-bg); backdrop-filter: blur(16px) saturate(1.4); -webkit-backdrop-filter: blur(16px) saturate(1.4); border: 1px solid var(--color-card-stroke); box-shadow: var(--shadow-whisper, 0 4px 20px rgba(0, 0, 0, 0.08)); }
.tool-btn { display: inline-flex; align-items: center; gap: 6px; min-height: 34px; padding: 0 10px; border-radius: 10px; border: 1px solid transparent; background: transparent; color: var(--color-neutral-7); font-family: var(--font-sans); font-size: 12px; font-weight: 600; cursor: pointer; transition: all var(--duration-fast, 150ms) var(--ease-breath); white-space: nowrap; }
.tool-btn:hover:not(:disabled) { background: var(--color-neutral-3); color: var(--color-neutral-9); transform: translateY(-1px); }
.tool-btn:active:not(:disabled) { transform: translateY(0) scale(0.98); }
.tool-btn:disabled { cursor: not-allowed; opacity: var(--opacity-disabled); }
.tool-btn--icon-only { width: 34px; padding: 0; justify-content: center; }
.tool-btn--quiet { background: transparent; }
.tool-btn--panel { background: var(--color-neutral-2); border-color: var(--color-card-stroke); }
.tool-btn--active, .tool-btn--panel.tool-btn--active { background: var(--color-accent); border-color: var(--color-accent); color: var(--color-text-on-accent, #ffffff); box-shadow: 0 2px 8px color-mix(in srgb, var(--color-accent) 28%, transparent); }
.tool-btn--active .tool-icon { opacity: 1; }
.tool-btn--main-branch { color: var(--color-warning); }
.toolbar-divider { width: 1px; height: 24px; background: var(--color-card-stroke); opacity: 0.7; }
.tool-btn:focus-visible { outline: 3px solid var(--color-accent-muted); outline-offset: 2px; }
@media (max-width: 980px) { .floating-toolbar--left { left: 12px; right: 12px; max-width: none; } }
</style>
