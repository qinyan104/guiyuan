<script setup lang="ts">
interface HistoryDisplayEntry {
  id: string
  label: string
  time: string
}

defineProps<{
  open: boolean
  canUndo: boolean
  canRedo: boolean
  historyPastCount: number
  historyFutureCount: number
  visibleHistoryEntries: HistoryDisplayEntry[]
}>()

defineEmits<{
  (event: 'close'): void
  (event: 'undo'): void
  (event: 'redo'): void
}>()
</script>

<template>
  <Transition name="float-panel">
    <section v-if="open" class="history-panel floating-panel--left" @mousedown.stop>
      <div class="floating-panel__header">
        <h2 class="hp-panel-title">操作历史</h2>
        <button class="floating-panel__close" type="button" aria-label="关闭" @click="$emit('close')">
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>

      <div class="hp-toolbar">
        <div class="hp-counts">
          <span class="hp-count-pill" :class="{ 'hp-count-pill--active': historyPastCount > 0 }" title="当前可撤销步数">
            撤销 <strong>{{ historyPastCount }}</strong>
          </span>
          <span class="hp-count-pill" :class="{ 'hp-count-pill--active': historyFutureCount > 0 }" title="当前可重做步数">
            重做 <strong>{{ historyFutureCount }}</strong>
          </span>
        </div>
        <div class="hp-quick-btns">
          <button
            class="hp-icon-btn"
            :disabled="!canUndo"
            type="button"
            title="撤销 (Ctrl+Z)"
            aria-label="撤销"
            @click="$emit('undo')"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M3 7v6h6" />
              <path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13" />
            </svg>
          </button>
          <button
            class="hp-icon-btn"
            :disabled="!canRedo"
            type="button"
            title="重做 (Ctrl+Y)"
            aria-label="重做"
            @click="$emit('redo')"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M21 7v6h-6" />
              <path d="M3 17a9 9 0 0 1 9-9 9 9 0 0 1 6 2.3L21 13" />
            </svg>
          </button>
        </div>
      </div>

      <div v-if="visibleHistoryEntries.length" class="hp-timeline-wrap">
        <div class="hp-list">
          <article
            v-for="(entry, index) in visibleHistoryEntries"
            :key="entry.id"
            class="hp-entry"
            :class="{ 'hp-entry--latest': index === 0 }"
          >
            <div class="hp-entry__marker">
              <span class="hp-dot" :class="{ 'hp-dot--latest': index === 0 }" />
              <div v-if="index < visibleHistoryEntries.length - 1" class="hp-line" />
            </div>
            <div class="hp-entry__body">
              <div class="hp-entry__meta">
                <span class="hp-entry__time">{{ entry.time }}</span>
                <span v-if="index === 0" class="hp-badge--latest">最新</span>
              </div>
              <strong class="hp-entry__label">{{ entry.label }}</strong>
            </div>
          </article>
        </div>
      </div>

      <div v-else class="hp-empty">
        <div class="hp-empty-icon">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="10" />
            <polyline points="12 6 12 12 16 14" />
          </svg>
        </div>
        <p>暂无操作记录</p>
        <span>在画布中修改或编修后将在此记录</span>
      </div>
    </section>
  </Transition>
</template>

<style scoped>
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

.history-panel .floating-panel__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
  flex-shrink: 0;
}

.hp-panel-title {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: var(--color-neutral-10);
  line-height: 1.3;
}

.history-panel .floating-panel__close {
  padding: 6px;
  border-radius: var(--radius-md);
  background: transparent;
  border: none;
  color: var(--color-neutral-6);
  cursor: pointer;
  transition:
    background var(--duration-fast) var(--ease-breath),
    color var(--duration-fast) var(--ease-breath);
}

.history-panel .floating-panel__close:hover {
  background: var(--color-neutral-3);
  color: var(--color-neutral-9);
}

.history-panel .floating-panel__close:active {
  transform: scale(0.92);
}

.hp-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 10px;
  margin-bottom: 12px;
  border-radius: 10px;
  background: rgba(250, 247, 242, 0.86);
  border: 1px solid var(--color-card-stroke);
  flex-shrink: 0;
}

.hp-counts {
  display: flex;
  align-items: center;
  gap: 6px;
}

.hp-count-pill {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 11px;
  color: var(--color-neutral-6);
  padding: 2px 7px;
  border-radius: 6px;
  background: var(--color-panel-bg);
  border: 1px solid var(--color-card-stroke);
}

.hp-count-pill strong {
  font-size: 12px;
  font-weight: 700;
  color: var(--color-neutral-8);
  font-variant-numeric: tabular-nums;
}

.hp-count-pill--active strong {
  color: var(--color-accent);
}

.hp-quick-btns {
  display: flex;
  align-items: center;
  gap: 4px;
}

.hp-icon-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  padding: 0;
  border-radius: 6px;
  border: 1px solid var(--color-card-stroke);
  background: var(--color-panel-bg);
  color: var(--color-neutral-7);
  cursor: pointer;
  transition: all var(--duration-fast, 150ms);
}

.hp-icon-btn svg {
  width: 14px;
  height: 14px;
}

.hp-icon-btn:hover:not(:disabled) {
  background: var(--color-accent-muted);
  border-color: color-mix(in srgb, var(--color-accent) 25%, transparent);
  color: var(--color-accent);
}

.hp-icon-btn:disabled {
  opacity: 0.35;
  cursor: not-allowed;
}

.hp-timeline-wrap {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  scrollbar-gutter: stable;
  margin: 0 -12px -12px;
  padding: 0 12px 12px;
}

.hp-list {
  display: flex;
  flex-direction: column;
}

.hp-entry {
  display: flex;
  gap: 10px;
  padding: 4px 6px;
  border-radius: 8px;
  transition: background var(--duration-fast, 150ms);
}

.hp-entry:hover {
  background: var(--color-neutral-2);
}

.hp-entry--latest {
  background: rgba(184, 51, 42, 0.05);
}

.hp-entry--latest:hover {
  background: rgba(184, 51, 42, 0.08);
}

.hp-entry__marker {
  display: flex;
  flex-direction: column;
  align-items: center;
  flex-shrink: 0;
  width: 12px;
  padding-top: 5px;
}

.hp-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: var(--color-neutral-5);
  border: 1.5px solid var(--color-panel-bg);
  box-shadow: 0 0 0 1px var(--color-neutral-4);
  flex-shrink: 0;
}

.hp-dot--latest {
  background: var(--color-accent);
  box-shadow: 0 0 0 1px var(--color-accent);
}

.hp-line {
  width: 1.5px;
  flex: 1;
  min-height: 16px;
  background: var(--color-card-stroke);
  margin-top: 3px;
}

.hp-entry__body {
  flex: 1;
  min-width: 0;
}

.hp-entry__meta {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 2px;
}

.hp-entry__time {
  font-size: 11px;
  color: var(--color-neutral-6);
  font-variant-numeric: tabular-nums;
}

.hp-badge--latest {
  font-size: 9.5px;
  font-weight: 600;
  color: var(--color-accent);
  background: var(--color-accent-muted);
  padding: 0.5px 5px;
  border-radius: 4px;
}

.hp-entry__label {
  display: block;
  font-size: 12.5px;
  font-weight: 500;
  color: var(--color-neutral-9);
  line-height: 1.4;
}

.hp-empty {
  text-align: center;
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
  flex-shrink: 0;
}

.hp-empty-icon {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  background: var(--color-neutral-2);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 10px;
  color: var(--color-neutral-5);
}

.hp-empty p {
  margin: 0 0 4px;
  font-size: 13px;
  font-weight: 600;
  color: var(--color-neutral-8);
}

.hp-empty span {
  font-size: 11.5px;
  line-height: 1.4;
}

.hp-empty svg {
  opacity: 0.35;
}

.hp-list::-webkit-scrollbar {
  width: 5px;
}

.hp-list::-webkit-scrollbar-track {
  background: transparent;
}

.hp-list::-webkit-scrollbar-thumb {
  background: var(--color-neutral-4);
  border-radius: 3px;
}

.hp-list::-webkit-scrollbar-thumb:hover {
  background: var(--color-neutral-5);
}

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

@media (max-width: 980px) {
  .history-panel {
    top: 68px;
    bottom: 12px;
    left: 12px;
    width: min(336px, calc(100vw - 24px));
  }
}

[data-theme="dark"] .history-panel {
  background: var(--color-panel-bg);
  border-color: var(--color-card-stroke);
}

[data-theme="dark"] .hp-toolbar {
  background: var(--color-neutral-2);
  border-color: var(--color-card-stroke);
}

[data-theme="dark"] .hp-count-pill,
[data-theme="dark"] .hp-icon-btn {
  background: var(--color-neutral-3);
  border-color: var(--color-neutral-4);
}

[data-theme="dark"] .hp-entry:hover {
  background: var(--color-neutral-3);
}

[data-theme="dark"] .hp-entry--latest {
  background: rgba(224, 65, 56, 0.12);
}

[data-theme="dark"] .hp-icon-btn:hover:not(:disabled) {
  background: var(--color-accent-muted);
  border-color: var(--color-accent);
}

[data-theme="dark"] .hp-empty-icon {
  background: var(--color-neutral-3);
}
</style>
