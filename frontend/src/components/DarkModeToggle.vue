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
      :title="'切换主题 (' + (uiStore.THEME_PRESETS.find(p => p.id === uiStore.currentTheme)?.name || '') + ')'"
      @click="toggleMenu"
    >
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="1.8"
        stroke-linecap="round"
        stroke-linejoin="round"
        class="palette-icon"
      >
        <circle cx="13.5" cy="6.5" r=".5" fill="currentColor" />
        <circle cx="17.5" cy="10.5" r=".5" fill="currentColor" />
        <circle cx="8.5" cy="7.5" r=".5" fill="currentColor" />
        <circle cx="6.5" cy="12.5" r=".5" fill="currentColor" />
        <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.563-2.512 5.563-5.563C22 6.5 17.5 2 12 2z" />
      </svg>
    </button>

    <transition name="glass-pop">
      <div v-if="isOpen" class="theme-popover">
        <div class="popover-title">切换主题</div>
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
              :style="{
                background: `linear-gradient(135deg, ${preset.bgPreview} 50%, ${preset.accentColor} 50%)`
              }"
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

.palette-icon {
  transition: transform var(--duration-normal) var(--ease-breath);
}

.dark-toggle:hover .palette-icon {
  transform: rotate(15deg) scale(1.08);
}

.theme-popover {
  position: absolute;
  top: calc(100% + 8px);
  right: 0;
  width: 175px;
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
  gap: 9px;
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
  width: 14px;
  height: 14px;
  border-radius: 50%;
  border: 1px solid var(--color-card-stroke);
  box-shadow: inset 0 0 0 1px rgba(0, 0, 0, 0.04), 0 1px 2px rgba(0, 0, 0, 0.08);
  flex-shrink: 0;
  transition: transform var(--duration-fast) var(--ease-breath);
}

.theme-popover-item:hover .color-dot {
  transform: scale(1.15);
}

.theme-popover-item.is-active .color-dot {
  box-shadow: 0 0 0 1.5px var(--color-accent);
}

.check-mark {
  margin-left: auto;
  font-size: 12px;
  font-weight: 700;
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
