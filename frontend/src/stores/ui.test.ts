import { beforeEach, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { nextTick } from 'vue'
import { THEME_PRESETS, useUiStore } from './ui'

describe('theme preferences', () => {
  beforeEach(() => {
    localStorage.clear()
    document.documentElement.removeAttribute('data-theme')
    document.documentElement.classList.remove('dark')
  })

  it.each(THEME_PRESETS)('applies and restores $id after recreating the store', async ({ id }) => {
    const ui = useUiStore()
    ui.setTheme(id)
    await nextTick()
    expect(document.documentElement.getAttribute('data-theme')).toBe(id)
    expect(document.documentElement.classList.contains('dark')).toBe(id === 'dark')
    expect(localStorage.getItem('guiyuan:theme')).toBe(id)
    ui.$dispose()
    setActivePinia(createPinia())
    expect(useUiStore().currentTheme).toBe(id)
  })

  it('restores the legacy dark preference when the saved theme is invalid', () => {
    localStorage.setItem('guiyuan:theme', 'unknown')
    localStorage.setItem('guiyuan:dark-mode', 'true')
    expect(useUiStore().currentTheme).toBe('dark')
  })
})
