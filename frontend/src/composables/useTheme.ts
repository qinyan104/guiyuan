import { ref, watch } from 'vue'

export type ThemeId = 'parchment' | 'ink-wash' | 'celadon' | 'rosewood' | 'frosted-glass' | 'star-sea' | 'aurora'

export interface ThemeOption {
  id: ThemeId
  name: string
  nameEn: string
  description: string
  preview: string[]
}

export const THEME_OPTIONS: ThemeOption[] = [
  {
    id: 'parchment',
    name: '古卷',
    nameEn: 'Parchment',
    description: '暖色调古卷风格，原始主题',
    preview: ['#efe3cf', '#a96e35', '#6a4b2f', '#67724f'],
  },
  {
    id: 'ink-wash',
    name: '水墨',
    nameEn: 'Ink Wash',
    description: '深色水墨风格，夜间友好',
    preview: ['#1a1d23', '#7eb8da', '#c4a882', '#5c8a6e'],
  },
  {
    id: 'celadon',
    name: '青瓷',
    nameEn: 'Celadon',
    description: '清雅青瓷色系，温润如玉',
    preview: ['#f0f5f2', '#5a9e7c', '#3d7a6b', '#8b6e4e'],
  },
  {
    id: 'rosewood',
    name: '檀木',
    nameEn: 'Rosewood',
    description: '深沉檀木色调，庄重典雅',
    preview: ['#2a1f1a', '#c89b6e', '#8b5e3c', '#6b8f7a'],
  },
  {
    id: 'frosted-glass',
    name: '琉璃',
    nameEn: 'Frosted Glass',
    description: '毛玻璃透明质感，现代通透',
    preview: ['#e8edf5', '#6c7baa', '#8b6db0', '#4a9a8a'],
  },
  {
    id: 'star-sea',
    name: '星海',
    nameEn: 'Star Sea',
    description: '深邃暗蓝极客风，现代高对比度',
    preview: ['#0b1120', '#38bdf8', '#818cf8', '#34d399'],
  },
  {
    id: 'aurora',
    name: '晶透',
    nameEn: 'Aqua',
    description: 'macOS 果冻质感，高亮通透与多彩流光',
    preview: ['#ff7eb3', '#8b5cf6', '#3b82f6', '#14b8a6'],
  },
]

const STORAGE_KEY = 'genealogy-publication-studio:theme'

export function useTheme() {
  const currentTheme = ref<ThemeId>(loadTheme())

  function loadTheme(): ThemeId {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored && THEME_OPTIONS.some((t) => t.id === stored)) {
      return stored as ThemeId
    }
    return 'parchment'
  }

  function setTheme(themeId: ThemeId) {
    currentTheme.value = themeId
    document.documentElement.setAttribute('data-theme', themeId)
    localStorage.setItem(STORAGE_KEY, themeId)
  }

  // Apply on init
  document.documentElement.setAttribute('data-theme', currentTheme.value)

  return {
    currentTheme,
    themes: THEME_OPTIONS,
    setTheme,
  }
}
