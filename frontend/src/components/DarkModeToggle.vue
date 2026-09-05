<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue'
import { useUiStore, type ThemeMode } from '../stores/ui'

const uiStore = useUiStore()
const isOpen = ref(false)
const dropdownRoot = ref<HTMLElement | null>(null)

function toggleMenu() {
  isOpen.value = !isOpen.value
}

function selectTheme(theme: ThemeMode) {
  uiStore.setTheme(theme)
  isOpen.value = false
}

function onClickOutside(e: MouseEvent) {
  if (isOpen.value && dropdownRoot.value && !dropdownRoot.value.contains(e.target as Node)) {
    isOpen.value = false
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
  <div ref="dropdownRoot" class="theme-toggle-container" @keydown.esc="isOpen = false">
    <button
      class="dark-toggle"
      type="button"
      aria-label="切换界面主题"
      :aria-expanded="isOpen"
      :title="'界面主题: ' + uiStore.THEME_PRESETS.find(p => p.id === uiStore.currentTheme)?.name"
      @click="toggleMenu"
    >
      <svg
        v-if="uiStore.currentTheme === 'dark'"
        width="18" height="18" viewBox="0 0 24 24"
        fill="none" stroke="currentColor" stroke-width="2"
        stroke-linecap="round" stroke-linejoin="round"
      >
        <circle cx="12" cy="12" r="5" />
        <line x1="12" y1="1" x2="12" y2="3" />
        <line x1="12" y1="21" x2="12" y2="23" />
        <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
        <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
        <line x1="1" y1="12" x2="3" y2="12" />
        <line x1="21" y1="12" x2="23" y2="12" />
        <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
        <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
      </svg>
      <svg
        v-else-if="uiStore.currentTheme === 'slate'"
        width="18" height="18" viewBox="0 0 24 24"
        fill="none" stroke="currentColor" stroke-width="2"
        stroke-linecap="round" stroke-linejoin="round"
      >
        <rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect>
        <line x1="8" y1="21" x2="16" y2="21"></line>
        <line x1="12" y1="17" x2="12" y2="21"></line>
      </svg>
      <svg
        v-else-if="uiStore.currentTheme === 'pure'"
        width="18" height="18" viewBox="0 0 24 24"
        fill="none" stroke="currentColor" stroke-width="2"
        stroke-linecap="round" stroke-linejoin="round"
      >
        <circle cx="12" cy="12" r="10" />
        <path d="M12 2a10 10 0 0 0 0 20z" fill="currentColor" />
      </svg>
      <svg
        v-else
        width="18" height="18" viewBox="0 0 24 24"
        fill="none" stroke="currentColor" stroke-width="2"
        stroke-linecap="round" stroke-linejoin="round"
      >
        <path d="M12 3v18M3 12h18" />
        <circle cx="12" cy="12" r="9" />
      </svg>
    </button>

    <transition name="glass-pop">
      <div v-if="isOpen" class="theme-popover">
        <div class="popover-title">切换背景主题</div>
        <div class="popover-list">
          <button
            v-for="preset in uiStore.THEME_PRESETS"
            :key="preset.id"
            class="theme-popover-item"
            type="button"
            :aria-pressed="uiStore.currentTheme === preset.id"
            :class="{ 'is-active': uiStore.currentTheme === preset.id }"
            @click="selectTheme(preset.id)"
          >
            <span
              class="color-dot"
              :style="{ backgroundColor: preset.bgPreview, borderColor: preset.accentColor }"
            ></span>
            <span class="theme-label">{{ preset.name }}</span>
            <span v-if="uiStore.currentTheme === preset.id" class="check-mark">✓</span>
          </button>
        </div>
      </div>
    </transition>
  </div>
</template>

<style scoped>
.theme-toggle-container {
  position: relative;
  display: inline-block;
}

.dark-toggle {
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

.dark-toggle:hover {
  color: var(--color-neutral-9);
  background: var(--color-neutral-3);
}

.dark-toggle:focus-visible {
  outline: 2px solid var(--color-accent);
  outline-offset: 2px;
}

.dark-toggle svg {
  transition: transform var(--duration-normal) var(--ease-breath);
}

.dark-toggle:hover svg {
  transform: scale(1.1);
}

.theme-popover {
  position: absolute;
  top: calc(100% + 8px);
  right: 0;
  width: 170px;
  padding: 8px;
  background: var(--color-panel-bg);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border: 1px solid var(--color-card-stroke);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-whisper);
  z-index: var(--z-popover);
}

.popover-title {
  font-size: var(--text-label-12, 12px);
  color: var(--color-neutral-6);
  padding: 4px 8px 6px;
  font-weight: 600;
}

.popover-list {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.theme-popover-item {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  padding: 6px 8px;
  border: none;
  background: transparent;
  border-radius: var(--radius-sm, 4px);
  cursor: pointer;
  color: var(--color-neutral-9);
  font-size: var(--text-copy-13, 13px);
  text-align: left;
  transition: background var(--duration-fast) var(--ease-breath);
}

.theme-popover-item:hover {
  background: var(--color-neutral-3);
}

.theme-popover-item:focus-visible {
  outline: 2px solid var(--color-accent);
  outline-offset: -1px;
}

.theme-popover-item.is-active {
  font-weight: 600;
  color: var(--color-accent);
}

.color-dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  border: 1.5px solid;
  flex-shrink: 0;
}

.check-mark {
  margin-left: auto;
  font-size: 12px;
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
