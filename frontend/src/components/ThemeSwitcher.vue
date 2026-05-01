<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue'
import { THEME_OPTIONS, type ThemeId } from '../composables/useTheme'

defineProps<{
  currentTheme: ThemeId
}>()

const emit = defineEmits<{
  (event: 'change-theme', themeId: ThemeId): void
}>()

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
  // Use click instead of pointerdown to avoid interrupting user interactions
  document.addEventListener('click', onClickOutside, { capture: true })
})

onBeforeUnmount(() => {
  document.removeEventListener('click', onClickOutside, { capture: true })
})
</script>

<template>
  <div ref="root" class="theme-switcher">
    <button class="theme-switcher__trigger" type="button" @click="toggle" aria-label="切换主题">
      <span class="theme-switcher__icon">◐</span>
      <span class="theme-switcher__label">主题</span>
    </button>

    <Transition name="float-panel">
      <div v-if="open" class="theme-switcher__dropdown">
        <p class="theme-switcher__title">选择主题 / Theme</p>
        <div class="theme-switcher__grid">
          <button
            v-for="theme in THEME_OPTIONS"
            :key="theme.id"
            class="theme-option"
            :class="{ 'theme-option--active': currentTheme === theme.id }"
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
            <div class="theme-option__info">
              <strong>{{ theme.name }}</strong>
              <em>{{ theme.nameEn }}</em>
            </div>
            <span class="theme-option__desc">{{ theme.description }}</span>
            <span v-if="currentTheme === theme.id" class="theme-option__check">✓</span>
          </button>
        </div>
      </div>
    </Transition>
  </div>
</template>
