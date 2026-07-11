import { nextTick, onBeforeUnmount, type Ref, watch } from 'vue'

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(', ')

/**
 * 焦点陷阱 composable — 将焦点锁定在指定容器内，支持 Escape 关闭。
 *
 * @param containerRef - 指向模态容器的 ref
 * @param active - 控制焦点陷阱是否启用（通常绑定 visible/modelValue）
 * @param onEscape - 按下 Escape 时的回调
 */
export function useFocusTrap(
  containerRef: Ref<HTMLElement | null>,
  active: Ref<boolean>,
  onEscape?: () => void,
) {
  let previousActiveElement: HTMLElement | null = null

  function getFocusableElements(): HTMLElement[] {
    const el = containerRef.value
    if (!el) return []
    return Array.from(el.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR))
      .filter(item => item.offsetParent !== null) // 排除不可见元素
  }

  function handleKeydown(event: KeyboardEvent) {
    if (event.key === 'Escape' && onEscape) {
      event.stopPropagation()
      onEscape()
      return
    }

    if (event.key !== 'Tab') return

    const focusable = getFocusableElements()
    if (focusable.length === 0) {
      event.preventDefault()
      return
    }

    const first = focusable[0]
    const last = focusable[focusable.length - 1]

    if (event.shiftKey) {
      if (document.activeElement === first || document.activeElement === containerRef.value) {
        event.preventDefault()
        last.focus()
      }
    } else {
      if (document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }
  }

  async function activate() {
    previousActiveElement = document.activeElement as HTMLElement
    await nextTick()
    const focusable = getFocusableElements()
    if (focusable.length > 0) {
      focusable[0].focus()
    } else {
      containerRef.value?.focus()
    }
    document.addEventListener('keydown', handleKeydown, true)
  }

  function deactivate() {
    document.removeEventListener('keydown', handleKeydown, true)
    if (previousActiveElement && previousActiveElement.isConnected) {
      previousActiveElement.focus()
    }
  }

  watch(active, (isActive) => {
    if (isActive) {
      activate()
    } else {
      deactivate()
    }
  }, { immediate: true })

  onBeforeUnmount(() => {
    deactivate()
  })
}
