import { defineStore } from 'pinia'
import { ref, computed, watchEffect } from 'vue'

export type ThemeMode = 'paper' | 'slate' | 'pure' | 'dark'

export interface ThemeOption {
  id: ThemeMode
  name: string
  desc: string
  bgPreview: string
  cardPreview: string
  accentColor: string
  textColor: string
}

export const THEME_PRESETS: ThemeOption[] = [
  {
    id: 'paper',
    name: '经典宣纸',
    desc: '典雅温润古风宣纸，朱砂沉香',
    bgPreview: '#FAF9F6',
    cardPreview: '#F3F1EB',
    accentColor: '#C63C2E',
    textColor: '#1C1A17',
  },
  {
    id: 'slate',
    name: '现代极简',
    desc: '清爽偏冷 Slate 灰，皇家蓝点缀',
    bgPreview: '#F8FAFC',
    cardPreview: '#FFFFFF',
    accentColor: '#2563EB',
    textColor: '#0F172A',
  },
  {
    id: 'pure',
    name: '纯净雪白',
    desc: '通透高对比纯白，极致明亮',
    bgPreview: '#FFFFFF',
    cardPreview: '#FAFAFA',
    accentColor: '#C63C2E',
    textColor: '#18181B',
  },
  {
    id: 'dark',
    name: '玄墨夜景',
    desc: '深色沉浸夜间模式，护眼象牙白',
    bgPreview: '#0C0C0B',
    cardPreview: '#161513',
    accentColor: '#D95545',
    textColor: '#E3E1DB',
  },
]

const THEME_STORAGE_KEY = 'guiyuan:theme'
const OLD_DARK_STORAGE_KEY = 'guiyuan:dark-mode'
const DARK_CLASS = 'dark'

function loadPreference(): ThemeMode {
  try {
    const themeStored = localStorage.getItem(THEME_STORAGE_KEY)
    if (themeStored && ['paper', 'slate', 'pure', 'dark'].includes(themeStored)) {
      return themeStored as ThemeMode
    }
    const oldDarkStored = localStorage.getItem(OLD_DARK_STORAGE_KEY)
    if (oldDarkStored !== null) {
      return oldDarkStored === 'true' ? 'dark' : 'paper'
    }
  } catch { /* ignore */ }

  return globalThis.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'paper'
}

function apply(theme: ThemeMode) {
  const root = document.documentElement
  root.setAttribute('data-theme', theme)
  if (theme === 'dark') {
    root.classList.add(DARK_CLASS)
  } else {
    root.classList.remove(DARK_CLASS)
  }
}

export const useUiStore = defineStore('ui', () => {
  const currentTheme = ref<ThemeMode>(loadPreference())
  const isDark = computed(() => currentTheme.value === 'dark')

  // 初始应用
  apply(currentTheme.value)

  // 响应式同步
  watchEffect(() => {
    apply(currentTheme.value)
    try {
      localStorage.setItem(THEME_STORAGE_KEY, currentTheme.value)
      localStorage.setItem(OLD_DARK_STORAGE_KEY, String(currentTheme.value === 'dark'))
    } catch { /* ignore */ }
  })

  function setTheme(theme: ThemeMode) {
    currentTheme.value = theme
  }

  function toggle() {
    currentTheme.value = currentTheme.value === 'dark' ? 'paper' : 'dark'
  }

  function setDark(value: boolean) {
    currentTheme.value = value ? 'dark' : 'paper'
  }

  return {
    currentTheme,
    isDark,
    setTheme,
    toggle,
    setDark,
    THEME_PRESETS,
  }
})
