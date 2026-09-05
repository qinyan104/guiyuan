import { defineStore } from 'pinia'
import { ref, computed, watchEffect } from 'vue'

export type ThemeMode = 'paper' | 'slate' | 'pure' | 'pine' | 'dark'

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
    name: '经典 · 宣纸',
    desc: '典雅温润古风宣纸，朱砂沉香',
    bgPreview: '#FAF9F6',
    cardPreview: '#F3F1EB',
    accentColor: '#C63C2E',
    textColor: '#1C1A17',
  },
  {
    id: 'slate',
    name: '素白 · 黛蓝',
    desc: '冷白与黛蓝，清晰沉静的档案工作台',
    bgPreview: '#F5F7FA',
    cardPreview: '#FFFFFF',
    accentColor: '#405E85',
    textColor: '#252D3A',
  },
  {
    id: 'pure',
    name: '纸白 · 徽墨',
    desc: '清透纸白与沉凝徽墨，水墨留白文人素雅',
    bgPreview: '#F8F9FA',
    cardPreview: '#FFFFFF',
    accentColor: '#2C3238',
    textColor: '#1F2327',
  },
  {
    id: 'pine',
    name: '宣白 · 松绿',
    desc: '柔和宣白与松绿，安静整理家族记忆',
    bgPreview: '#F6F7F3',
    cardPreview: '#FFFFFF',
    accentColor: '#356451',
    textColor: '#26332D',
  },
  {
    id: 'dark',
    name: '玄墨 · 月魄',
    desc: '深墨底色与冰霜月华，清冷出尘夜读护眼',
    bgPreview: '#0C0C0B',
    cardPreview: '#161513',
    accentColor: '#C8D6E5',
    textColor: '#E3E1DB',
  },
]

const THEME_STORAGE_KEY = 'guiyuan:theme'
const OLD_DARK_STORAGE_KEY = 'guiyuan:dark-mode'
const DARK_CLASS = 'dark'

function loadPreference(): ThemeMode {
  try {
    const themeStored = localStorage.getItem(THEME_STORAGE_KEY)
    const preset = THEME_PRESETS.find(({ id }) => id === themeStored)
    if (preset) return preset.id
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
