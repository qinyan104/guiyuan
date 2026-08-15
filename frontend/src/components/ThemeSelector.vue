<script setup lang="ts">
import { useUiStore, type ThemeMode } from '../stores/ui'

const uiStore = useUiStore()

function selectTheme(themeId: ThemeMode) {
  uiStore.setTheme(themeId)
}
</script>

<template>
  <div class="theme-selector-grid">
    <button
      v-for="preset in uiStore.THEME_PRESETS"
      :key="preset.id"
      type="button"
      class="theme-card"
      :class="{ 'is-active': uiStore.currentTheme === preset.id }"
      @click="selectTheme(preset.id)"
    >
      <div
        class="theme-card__preview"
        :style="{ backgroundColor: preset.bgPreview }"
      >
        <div
          class="preview-surface"
          :style="{ backgroundColor: preset.cardPreview }"
        >
          <div class="preview-line preview-line--title" :style="{ backgroundColor: preset.textColor }"></div>
          <div class="preview-line preview-line--sub" :style="{ backgroundColor: preset.textColor }"></div>
          <div class="preview-badge" :style="{ backgroundColor: preset.accentColor }"></div>
        </div>
      </div>

      <div class="theme-card__info">
        <div class="theme-card__header">
          <span class="theme-card__name">{{ preset.name }}</span>
          <span v-if="uiStore.currentTheme === preset.id" class="theme-card__active-badge">使用中</span>
        </div>
        <p class="theme-card__desc">{{ preset.desc }}</p>
      </div>
    </button>
  </div>
</template>

<style scoped>
.theme-selector-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 16px;
  width: 100%;
}

.theme-card {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  text-align: left;
  border-radius: var(--radius-lg, 12px);
  border: 1px solid var(--color-neutral-4, #E4E4E7);
  background: var(--color-neutral-2, #FAF9F6);
  padding: 12px;
  cursor: pointer;
  transition: transform var(--duration-fast, 150ms) var(--ease-breath, ease),
              border-color var(--duration-fast, 150ms) var(--ease-breath, ease),
              box-shadow var(--duration-fast, 150ms) var(--ease-breath, ease);
  outline: none;
  font-family: inherit;
}

.theme-card:hover {
  transform: translateY(-2px);
  border-color: var(--color-neutral-5, #D4D4D8);
  box-shadow: var(--shadow-whisper, 0 4px 24px rgba(0, 0, 0, 0.04));
}

.theme-card.is-active {
  border-color: var(--color-accent, #C63C2E);
  box-shadow: 0 0 0 2px var(--color-accent-muted, rgba(198, 60, 46, 0.15)), var(--shadow-whisper);
}

.theme-card__preview {
  height: 96px;
  border-radius: var(--radius-md, 8px);
  padding: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  overflow: hidden;
  border: 1px solid rgba(0, 0, 0, 0.05);
}

.preview-surface {
  width: 100%;
  height: 100%;
  border-radius: var(--radius-sm, 6px);
  padding: 10px;
  display: flex;
  flex-direction: column;
  gap: 6px;
  position: relative;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
}

.preview-line {
  height: 6px;
  border-radius: 3px;
  opacity: 0.85;
}

.preview-line--title {
  width: 45%;
}

.preview-line--sub {
  width: 70%;
  opacity: 0.45;
}

.preview-badge {
  position: absolute;
  bottom: 8px;
  right: 8px;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.15);
}

.theme-card__info {
  margin-top: 12px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.theme-card__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.theme-card__name {
  font-size: var(--text-copy-14, 14px);
  font-weight: 600;
  color: var(--color-neutral-9, #1C1A17);
}

.theme-card__active-badge {
  font-size: var(--text-label-12, 12px);
  font-weight: 500;
  color: var(--color-accent, #C63C2E);
  background: var(--color-accent-muted, rgba(198, 60, 46, 0.08));
  padding: 2px 8px;
  border-radius: var(--radius-sm, 4px);
}

.theme-card__desc {
  font-size: var(--text-label-12, 12px);
  color: var(--color-neutral-7, #6B6252);
  margin: 0;
  line-height: 1.4;
}
</style>
