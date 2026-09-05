<script setup lang="ts">
import { ref, toRef, watch } from 'vue'
import { useFocusTrap } from '../composables/useFocusTrap'

const props = withDefaults(defineProps<{
  visible: boolean
  title?: string
  /** 点击遮罩层关闭 */
  closeOnOverlay?: boolean
  /** 最大宽度 */
  maxWidth?: string
  /** z-index 层级 token 名 */
  zIndex?: string
}>(), {
  closeOnOverlay: true,
  maxWidth: '520px',
  zIndex: 'var(--z-modal)',
})

const emit = defineEmits<{
  (event: 'update:visible', value: boolean): void
  (event: 'close'): void
}>()

const dialogRef = ref<HTMLElement | null>(null)
const visibleRef = toRef(props, 'visible')

useFocusTrap(dialogRef, visibleRef, () => close())

function close() {
  emit('update:visible', false)
  emit('close')
}

function handleOverlayClick() {
  if (props.closeOnOverlay) close()
}

// 阻止背景滚动
watch(() => props.visible, (v) => {
  document.body.style.overflow = v ? 'hidden' : ''
})
</script>

<template>
  <Teleport to="body">
    <Transition name="base-dialog">
      <div
        v-if="visible"
        class="base-dialog-overlay"
        :style="{ zIndex }"
        @click.self="handleOverlayClick"
      >
        <div
          ref="dialogRef"
          class="base-dialog"
          role="dialog"
          aria-modal="true"
          :aria-label="title || undefined"
          :style="{ maxWidth }"
          tabindex="-1"
        >
          <header v-if="title || $slots.header" class="base-dialog__header">
            <slot name="header">
              <h3 class="base-dialog__title">{{ title }}</h3>
            </slot>
            <button
              class="base-dialog__close"
              aria-label="关闭"
              @click="close"
            >
              &times;
            </button>
          </header>

          <div class="base-dialog__body">
            <slot />
          </div>

          <footer v-if="$slots.footer" class="base-dialog__footer">
            <slot name="footer" />
          </footer>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.base-dialog-overlay {
  position: fixed;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  background: var(--color-overlay);
  backdrop-filter: blur(4px);
  -webkit-backdrop-filter: blur(4px);
}

.base-dialog {
  position: relative;
  width: 100%;
  max-height: calc(100vh - 48px);
  overflow-y: auto;
  background: var(--color-panel-bg);
  border: 1px solid var(--color-card-stroke);
  border-radius: var(--radius-2xl);
  box-shadow: var(--shadow-whisper);
  outline: none;
}

.base-dialog__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 24px 0;
  gap: 12px;
}

.base-dialog__title {
  font-family: var(--font-serif);
  font-size: var(--text-title-20);
  font-weight: 500;
  color: var(--color-neutral-10);
  margin: 0;
}

.base-dialog__close {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border: none;
  background: none;
  color: var(--color-neutral-6);
  font-size: 20px;
  cursor: pointer;
  border-radius: var(--radius-sm);
  transition: background var(--duration-fast) var(--ease-breath),
              color var(--duration-fast) var(--ease-breath);
  flex-shrink: 0;
}

.base-dialog__close:hover {
  background: var(--color-neutral-3);
  color: var(--color-neutral-9);
}

.base-dialog__close:focus-visible {
  outline: 2px solid var(--color-accent);
  outline-offset: 2px;
}

.base-dialog__body {
  padding: 16px 24px 24px;
}

.base-dialog__footer {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;
  padding: 0 24px 20px;
}

/* ═══════════════════════════════════════════════════════════════
   过渡动画
   ═══════════════════════════════════════════════════════════════ */

.base-dialog-enter-active {
  transition: opacity var(--duration-panel) var(--ease-breath);
}

.base-dialog-enter-active .base-dialog {
  transition: transform var(--duration-panel) var(--ease-breath),
              opacity var(--duration-panel) var(--ease-breath);
}

.base-dialog-leave-active {
  transition: opacity var(--duration-fast) var(--ease-breath);
}

.base-dialog-leave-active .base-dialog {
  transition: transform var(--duration-fast) var(--ease-breath),
              opacity var(--duration-fast) var(--ease-breath);
}

.base-dialog-enter-from {
  opacity: 0;
}

.base-dialog-enter-from .base-dialog {
  opacity: 0;
  transform: translateY(12px) scale(0.96);
}

.base-dialog-leave-to {
  opacity: 0;
}

.base-dialog-leave-to .base-dialog {
  opacity: 0;
  transform: translateY(8px) scale(0.98);
}

@media (prefers-reduced-motion: reduce) {
  .base-dialog-enter-active,
  .base-dialog-leave-active,
  .base-dialog-enter-active .base-dialog,
  .base-dialog-leave-active .base-dialog {
    transition: none;
  }
}
</style>
