import { computed } from 'vue'
import { useUiStore, type ThemeMode } from '../stores/ui'

export function useDarkMode() {
  const uiStore = useUiStore()

  return {
    isDark: computed(() => uiStore.isDark),
    currentTheme: computed(() => uiStore.currentTheme),
    toggle: () => uiStore.toggle(),
    setDark: (value: boolean) => uiStore.setDark(value),
    setTheme: (theme: ThemeMode) => uiStore.setTheme(theme),
    THEME_PRESETS: uiStore.THEME_PRESETS,
  }
}
