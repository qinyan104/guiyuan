import { ref } from 'vue'

export type ThemeId =
  | 'parchment'
  | 'su-style'
  | 'ou-style'
  | 'celadon'
  | 'frosted-glass'
  | 'aurora'
  | 'eggshell'

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
    description: '暖色古卷基调，保留原始谱牒气息。',
    preview: ['#efe3cf', '#a96e35', '#6a4b2f', '#67724f'],
  },
  {
    id: 'su-style',
    name: '苏派',
    nameEn: 'Su Style',
    description: '园林留白与垂珠墨韵，气质清逸。',
    preview: ['#f2ebdc', '#fff9ef', '#3a3226', '#a96e35'],
  },
  {
    id: 'ou-style',
    name: '欧派',
    nameEn: 'Ou Style',
    description: '朱砂章法与严整中轴，风格端肃。',
    preview: ['#e8d5b5', '#fcf8f0', '#1a1a1a', '#b22222'],
  },
  {
    id: 'celadon',
    name: '青瓷',
    nameEn: 'Celadon',
    description: '温润青瓷色系，清雅而安静。',
    preview: ['#f0f5f2', '#5a9e7c', '#3d7a6b', '#8b6e4e'],
  },
  {
    id: 'frosted-glass',
    name: '琉璃',
    nameEn: 'Frosted Glass',
    description: '通透毛玻璃层次，偏现代轻盈。',
    preview: ['#e8edf5', '#6c7baa', '#8b6db0', '#4a9a8a'],
  },
  {
    id: 'aurora',
    name: '晶透',
    nameEn: 'Aqua',
    description: 'Apple 风格的纯净通透与柔和高光。',
    preview: ['#f5f5f7', '#1d1d1f', '#0071e3', '#86868b'],
  },
  {
    id: 'eggshell',
    name: '蛋壳',
    nameEn: 'Eggshell',
    description: '极简学术风，近白纸面与高对比排版。',
    preview: ['#fdfcfc', '#000000', '#777169', '#e5e5e5'],
  },
]

const STORAGE_KEY = 'genealogy-publication-studio:theme'

function safeStorageGet(key: string): string | null {
  try {
    return localStorage.getItem(key)
  } catch {
    return null
  }
}

function safeStorageSet(key: string, value: string) {
  try {
    localStorage.setItem(key, value)
  } catch {
    // ignore storage failures
  }
}

export function useTheme() {
  const currentTheme = ref<ThemeId>(loadTheme())

  function loadTheme(): ThemeId {
    const stored = safeStorageGet(STORAGE_KEY)
    if (stored && THEME_OPTIONS.some((theme) => theme.id === stored)) {
      return stored as ThemeId
    }
    return 'parchment'
  }

  function setTheme(themeId: ThemeId) {
    currentTheme.value = themeId
    document.documentElement.setAttribute('data-theme', themeId)
    safeStorageSet(STORAGE_KEY, themeId)
  }

  document.documentElement.setAttribute('data-theme', currentTheme.value)

  return {
    currentTheme,
    themes: THEME_OPTIONS,
    setTheme,
  }
}
