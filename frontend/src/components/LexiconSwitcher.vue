<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue'
import { useLexicon, type LexiconId } from '../composables/useLexicon'

const { currentLexiconId, lexicons, setLexicon } = useLexicon()

const open = ref(false)
const root = ref<HTMLElement | null>(null)

function selectLexicon(id: LexiconId) {
  setLexicon(id)
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
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20" />
      </svg>
    </button>

    <Transition name="glass-pop">
      <div v-if="open" class="theme-dropdown">
        <div class="dropdown-header">
          <span class="dropdown-title">语境意境 / LEXICON</span>
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
                <strong class="theme-name">{{ l.name }}</strong>
              </div>
              <span class="theme-desc">{{ l.dashboard.label }} / {{ l.publications.label }} / {{ l.users.label }} / {{ l.logs.label }}</span>
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
}

.action-btn {
  background: none;
  border: none;
  color: var(--text-soft, #888);
  width: 36px;
  height: 36px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s ease;
}
.action-btn:hover {
  background: var(--glass-panel-bg, rgba(255,255,255,0.4));
  color: var(--text-main, #000);
}

.theme-dropdown {
  position: absolute;
  top: calc(100% + 12px);
  right: 0;
  width: 220px;
  border-radius: 16px;
  background: var(--glass-panel-bg, rgba(255, 255, 255, 0.85));
  backdrop-filter: blur(24px) saturate(180%);
  -webkit-backdrop-filter: blur(24px) saturate(180%);
  border: 1px solid var(--glass-border-highlight, rgba(255, 255, 255, 0.8));
  box-shadow: 0 16px 32px rgba(0, 0, 0, 0.15), 0 0 0 1px var(--glass-border-shadow, rgba(0,0,0,0.05));
  padding: 6px;
  z-index: 9999;
  transform-origin: top right;
}

.dropdown-header {
  padding: 6px 8px 4px;
  margin-bottom: 2px;
}
.dropdown-title {
  font-family: monospace;
  font-size: 10px;
  font-weight: 500;
  letter-spacing: 0.1em;
  color: var(--color-neutral-6);
  text-transform: uppercase;
}

.theme-list {
  display: grid;
  gap: 2px;
}

.theme-item {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 8px 12px;
  border-radius: 10px;
  border: 1px solid transparent;
  background: transparent;
  cursor: pointer;
  transition: all 0.2s ease;
  text-align: left;
}

.theme-item:hover {
  background: var(--glass-pill-bg, rgba(0,0,0,0.04));
}

.theme-item.is-active {
  background: var(--color-accent);
  color: var(--btn-primary-color);
  box-shadow: 0 4px 12px rgba(0,0,0,0.08);
}

.theme-title-group {
  display: flex;
  gap: 6px;
  align-items: baseline;
}

.theme-name {
  font-size: 13px;
  font-weight: 500;
  color: var(--color-neutral-9);
}
.theme-item.is-active .theme-name {
  color: inherit;
}

.theme-desc {
  color: var(--color-neutral-6);
  font-size: 11px;
  line-height: 1.4;
  margin-top: 2px;
}
.theme-item.is-active .theme-desc {
  color: rgba(255,255,255,0.82);
}

.check-icon {
  position: absolute;
  top: 10px;
  right: 12px;
  font-size: 12px;
  color: inherit;
  font-weight: 800;
}

.glass-pop-enter-active,
.glass-pop-leave-active {
  transition: opacity 0.2s ease, transform 0.2s cubic-bezier(0.16, 1, 0.3, 1);
}
.glass-pop-enter-from,
.glass-pop-leave-to {
  opacity: 0;
  transform: scale(0.95) translateY(-8px);
}
</style>

