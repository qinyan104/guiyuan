import { ref, watchEffect } from 'vue'

const STORAGE_KEY = 'guiyuan:dark-mode'
const DARK_CLASS = 'dark'

function loadPreference(): boolean {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored !== null) return stored === 'true'
  } catch { /* ignore */ }
  return globalThis.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false
}

function apply(isDark: boolean) {
  const root = document.documentElement
  if (isDark) {
    root.setAttribute('data-theme', 'dark')
    root.classList.add(DARK_CLASS)
  } else {
    root.removeAttribute('data-theme')
    root.classList.remove(DARK_CLASS)
  }
}

const isDark = ref(loadPreference())

// 初始应用
apply(isDark.value)

// 响应式同步
watchEffect(() => {
  apply(isDark.value)
  try { localStorage.setItem(STORAGE_KEY, String(isDark.value)) } catch { /* ignore */ }
})

export function useDarkMode() {
  function toggle() {
    isDark.value = !isDark.value
  }

  function setDark(value: boolean) {
    isDark.value = value
  }

  return { isDark, toggle, setDark }
}
