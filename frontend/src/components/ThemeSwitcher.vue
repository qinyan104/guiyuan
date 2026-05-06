<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue'
import { THEME_OPTIONS, type ThemeId } from '../composables/useTheme'

defineProps<{
  currentTheme: ThemeId
}>()

const emit = defineEmits<{
  (event: 'change-theme', themeId: ThemeId): void
}>()

const themes = THEME_OPTIONS
const open = ref(false)
const root = ref<HTMLElement | null>(null)

function selectTheme(themeId: ThemeId) {
  emit('change-theme', themeId)
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
    <button class="action-btn" type="button" @click="toggle" title="切换视觉主题">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M12 3a6.364 6.364 0 0 0 9 9 9 9 0 1 1-9-9Z"></path>
      </svg>
    </button>

    <Transition name="glass-pop">
      <div v-if="open" class="theme-dropdown">
        <div class="dropdown-header">
          <span class="dropdown-title">视觉主题 // THEME</span>
        </div>
        <div class="theme-list">
          <button
            v-for="theme in themes"
            :key="theme.id"
            class="theme-item"
            :class="{ 'is-active': currentTheme === theme.id }"
            @click="selectTheme(theme.id)"
          >
            <div class="theme-preview">
              <span v-for="(color, index) in theme.preview" :key="index" :style="{ background: color }"></span>
            </div>
            <div class="theme-info">
              <span class="theme-name">{{ theme.name }}</span>
              <span class="theme-name-en">{{ theme.nameEn }}</span>
            </div>
            <svg v-if="currentTheme === theme.id" class="check-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"></polyline></svg>
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
  width: 280px;
  border-radius: 20px;
  background: var(--glass-panel-bg, rgba(255, 255, 255, 0.85));
  backdrop-filter: blur(24px) saturate(180%);
  -webkit-backdrop-filter: blur(24px) saturate(180%);
  border: 1px solid var(--glass-border-highlight, rgba(255, 255, 255, 0.8));
  box-shadow: 0 24px 48px rgba(0, 0, 0, 0.1), 0 0 0 1px var(--glass-border-shadow, rgba(0,0,0,0.05));
  padding: 8px;
  z-index: 9999; /* Ensure it stays on top */
  transform-origin: top right;
}

:global([data-theme="ink-wash"]) .theme-dropdown,
:global([data-theme="rosewood"]) .theme-dropdown,
:global([data-theme="star-sea"]) .theme-dropdown {
  background: rgba(20, 20, 20, 0.85);
  border-color: rgba(255,255,255,0.1);
  box-shadow: 0 24px 48px rgba(0,0,0,0.4);
}

.dropdown-header {
  padding: 12px 12px 8px;
  margin-bottom: 4px;
}
.dropdown-title {
  font-family: monospace;
  font-size: 0.7rem;
  letter-spacing: 0.15em;
  color: var(--text-soft);
}

.theme-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.theme-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  border-radius: 12px;
  border: none;
  background: transparent;
  cursor: pointer;
  transition: all 0.2s ease;
  text-align: left;
}
.theme-item:hover {
  background: rgba(0,0,0,0.04);
}
:global([data-theme="ink-wash"]) .theme-item:hover,
:global([data-theme="rosewood"]) .theme-item:hover,
:global([data-theme="star-sea"]) .theme-item:hover {
  background: rgba(255,255,255,0.06);
}

.theme-item.is-active {
  background: var(--text-main);
  color: var(--bg-panel, #fff);
}

.theme-preview {
  display: flex;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  overflow: hidden;
  border: 1px solid rgba(0,0,0,0.1);
  flex-shrink: 0;
}
.theme-item.is-active .theme-preview {
  border-color: rgba(255,255,255,0.2);
}
.theme-preview span {
  flex: 1;
  height: 100%;
}

.theme-info {
  display: flex;
  flex-direction: column;
  flex: 1;
}
.theme-name {
  font-size: 0.95rem;
  font-weight: 700;
  color: var(--text-main);
}
.theme-item.is-active .theme-name {
  color: var(--bg-panel, #fff);
}
.theme-name-en {
  font-size: 0.7rem;
  color: var(--text-soft);
  margin-top: 2px;
}

.check-icon {
  color: var(--bg-panel, #fff);
}

/* Animations */
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
