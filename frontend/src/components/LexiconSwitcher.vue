<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { useLexiconStore, type LexiconId } from '../stores/lexicon'

const lexiconStore = useLexiconStore()
const currentLexiconId = computed(() => lexiconStore.currentLexiconId)
const lexicons = computed(() => lexiconStore.lexicons)

const open = ref(false)
const root = ref<HTMLElement | null>(null)

function selectLexicon(id: LexiconId) {
  lexiconStore.setLexicon(id)
  open.value = false
}

function toggle() {
  open.value = !open.value
}

function onClickOutside(e: MouseEvent) {
  if (open.value && root.value && !root.value.contains(e.target as Node)) {
    open.value = false
  }
}

onMounted(() => {
  document.addEventListener('click', onClickOutside, { capture: true })
})

onBeforeUnmount(() => {
  document.removeEventListener('click', onClickOutside, { capture: true })
})
</script>

<template>
  <div ref="root" class="theme-switcher">
    <button class="action-btn" type="button" title="切换语境风格" @click="toggle">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
        <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20" />
      </svg>
    </button>

    <Transition name="glass-pop">
      <div v-if="open" class="theme-dropdown">
        <div class="dropdown-header">
          <span class="dropdown-title">切换语境</span>
        </div>
        <div class="theme-list">
          <button
            v-for="l in lexicons"
            :key="l.id"
            class="theme-item"
            :class="{ 'is-active': currentLexiconId === l.id }"
            type="button"
            @click="selectLexicon(l.id)"
          >
            <div class="theme-info">
              <div class="theme-title-group">
                <span class="seal-tag">{{ l.logo.seal }}</span>
                <span class="theme-name">{{ l.name }}</span>
              </div>
              <span class="theme-desc">{{ l.dashboard.label }} · {{ l.publications.label }} · {{ l.users.label }} · {{ l.logs.label }}</span>
            </div>
            <span v-if="currentLexiconId === l.id" class="check-icon">✓</span>
          </button>
        </div>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.theme-switcher {
  position: relative;
  display: inline-block;
}

.action-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  color: var(--color-neutral-7);
  background: transparent;
  border: none;
  cursor: pointer;
  transition: all var(--duration-fast) var(--ease-breath);
}

.action-btn:hover {
  color: var(--color-neutral-9);
  background: var(--color-neutral-3);
}

.action-btn:focus-visible {
  outline: 2px solid var(--color-accent);
  outline-offset: 2px;
}

.action-btn svg {
  transition: transform var(--duration-normal) var(--ease-breath);
}

.action-btn:hover svg {
  transform: scale(1.08);
}

.theme-dropdown {
  position: absolute;
  top: calc(100% + 12px);
  right: 0;
  width: 260px;
  padding: 8px;
  border-radius: 20px;
  background: var(--glass-panel-bg, rgba(255, 255, 255, 0.85));
  backdrop-filter: blur(24px) saturate(180%);
  -webkit-backdrop-filter: blur(24px) saturate(180%);
  border: 1px solid var(--glass-border-highlight, rgba(255, 255, 255, 0.8));
  box-shadow: var(--shadow-whisper), var(--shadow-ring);
  z-index: 9999;
  transform-origin: top right;
}

[data-theme="dark"] .theme-dropdown {
  background: var(--color-panel-glass-bg);
  border-color: var(--color-panel-glass-border);
  box-shadow: var(--shadow-whisper), var(--shadow-ring);
}

.dropdown-header {
  padding: 6px 12px 6px;
}

.dropdown-title {
  font-size: var(--text-label-12, 12px);
  color: var(--color-neutral-6);
  font-weight: 600;
}

.theme-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.theme-item {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  padding: 8px 12px;
  border: 1px solid transparent;
  border-radius: 12px;
  background: transparent;
  cursor: pointer;
  text-align: left;
  transition: all var(--duration-fast) var(--ease-breath);
}

.theme-item:hover {
  background: var(--color-neutral-3);
}

.theme-item:focus-visible {
  outline: 2px solid var(--color-accent);
  outline-offset: -1px;
}

.theme-item.is-active {
  background: var(--color-accent-subtle, rgba(198, 60, 46, 0.08));
  border-color: var(--color-accent);
}

.theme-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
}

.theme-title-group {
  display: flex;
  gap: 7px;
  align-items: center;
}

.seal-tag {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 600;
  background: var(--color-neutral-3);
  color: var(--color-neutral-8);
  font-family: var(--font-serif);
  line-height: 1;
  flex-shrink: 0;
}

.theme-item.is-active .seal-tag {
  background: var(--color-accent);
  color: #fff;
}

.theme-name {
  font-size: var(--text-copy-13, 13px);
  font-weight: 500;
  color: var(--color-neutral-9);
  line-height: 1.4;
}

.theme-item.is-active .theme-name {
  font-weight: 600;
  color: var(--color-accent);
}

.theme-desc {
  font-size: var(--text-label-12, 12px);
  color: var(--color-neutral-6);
  line-height: 1.4;
  letter-spacing: 0.01em;
  white-space: nowrap;
}

.theme-item.is-active .theme-desc {
  color: var(--color-neutral-7);
}

.check-icon {
  font-size: 13px;
  font-weight: 700;
  color: var(--color-accent);
  margin-left: 8px;
  flex-shrink: 0;
}

.glass-pop-enter-active,
.glass-pop-leave-active {
  transition: opacity var(--duration-fast) var(--ease-breath), transform var(--duration-fast) var(--ease-breath);
}

.glass-pop-enter-from,
.glass-pop-leave-to {
  opacity: 0;
  transform: translateY(-4px) scale(0.96);
}
</style>
