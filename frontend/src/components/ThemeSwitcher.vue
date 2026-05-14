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
    <button class="action-btn" type="button" title="切换视觉主题" @click="toggle">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M12 3a6.364 6.364 0 0 0 9 9 9 9 0 1 1-9-9Z"></path>
      </svg>
    </button>

    <Transition name="glass-pop">
      <div v-if="open" class="theme-dropdown">
        <div class="dropdown-header">
          <span class="dropdown-title">选择主题 / THEME</span>
        </div>
        <div class="theme-list">
          <button
            v-for="theme in themes"
            :key="theme.id"
            class="theme-item"
            :class="{ 'is-active': currentTheme === theme.id }"
            type="button"
            @click="selectTheme(theme.id)"
          >
            <div class="theme-option__preview">
              <span
                v-for="(color, index) in theme.preview"
                :key="index"
                class="theme-option__swatch"
                :style="{ background: color }"
              />
            </div>
            <div class="theme-info">
              <div class="theme-title-group">
                <strong class="theme-name">{{ theme.name }}</strong>
                <em class="theme-name-en">{{ theme.nameEn }}</em>
              </div>
              <span class="theme-desc">{{ theme.description }}</span>
            </div>
            <span v-if="currentTheme === theme.id" class="check-icon">✓</span>
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
  width: 220px; /* Extremely compact */
  border-radius: 16px; /* Slightly smaller radius for smaller box */
  background: var(--glass-panel-bg, rgba(255, 255, 255, 0.85));
  backdrop-filter: blur(24px) saturate(180%);
  -webkit-backdrop-filter: blur(24px) saturate(180%);
  border: 1px solid var(--glass-border-highlight, rgba(255, 255, 255, 0.8));
  box-shadow: 0 16px 32px rgba(0, 0, 0, 0.1), 0 0 0 1px var(--glass-border-shadow, rgba(0,0,0,0.05));
  padding: 6px;
  z-index: 9999;
  transform-origin: top right;
}

:global([data-theme="ink-wash"]) .theme-dropdown,
:global([data-theme="rosewood"]) .theme-dropdown,
:global([data-theme="star-sea"]) .theme-dropdown {
  background: rgba(20, 20, 20, 0.85);
  border-color: rgba(255,255,255,0.1);
  box-shadow: 0 16px 32px rgba(0,0,0,0.4);
}

.dropdown-header {
  padding: 6px 8px 4px;
  margin-bottom: 2px;
}
.dropdown-title {
  font-family: monospace;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.1em;
  color: var(--text-soft);
  text-transform: uppercase;
}

.theme-list {
  display: grid;
  gap: 2px; /* Tighter gap */
}

.theme-item {
  position: relative;
  display: grid;
  grid-template-columns: auto 1fr;
  grid-template-rows: auto auto;
  gap: 2px 8px; /* Tighter grid gaps */
  padding: 8px; /* Less padding */
  border-radius: 10px;
  border: 1px solid transparent;
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
  box-shadow: 0 4px 12px rgba(0,0,0,0.08);
}

.theme-option__preview {
  grid-row: 1 / 3;
  grid-column: 1;
  display: flex;
  gap: 2px; /* Tighter swatches */
  align-items: center;
  padding: 2px 0;
}

.theme-option__swatch {
  width: 12px; /* Smaller swatches */
  height: 12px;
  border-radius: 50%;
  border: 1px solid rgba(128,128,128,0.2);
}
.theme-item.is-active .theme-option__swatch {
  border-color: rgba(255,255,255,0.3);
}

.theme-info {
  display: contents;
}

.theme-title-group {
  grid-row: 1;
  grid-column: 2;
  display: flex;
  gap: 6px;
  align-items: baseline;
}

.theme-name {
  font-size: 12px; /* Smaller title */
  font-weight: 700;
  color: var(--text-main);
}
.theme-item.is-active .theme-name {
  color: var(--bg-panel, #fff);
}

.theme-name-en {
  font-size: 10px; /* Smaller english name */
  color: var(--text-soft);
  font-style: normal;
  font-family: monospace;
}
.theme-item.is-active .theme-name-en {
  color: rgba(255,255,255,0.7);
}

.theme-desc {
  grid-row: 2;
  grid-column: 2;
  color: var(--text-soft);
  font-size: 10px; /* Smaller description */
  line-height: 1.2;
}
.theme-item.is-active .theme-desc {
  color: rgba(255,255,255,0.8);
}

.check-icon {
  position: absolute;
  top: 8px;
  right: 10px;
  font-size: 11px;
  color: var(--bg-panel, #fff);
  font-weight: 800;
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
