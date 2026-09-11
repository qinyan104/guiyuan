<script setup lang="ts">
import { ref, toRef } from 'vue'

import { useFocusTrap } from '../composables/useFocusTrap'
import ValidationPanel from '../features/validation/ValidationPanel.vue'

const props = defineProps<{
  open: boolean
  pubId: number | null
}>()

const emit = defineEmits<{
  (event: 'close'): void
  (event: 'locate-person', personId: string): void
}>()

const dialogRef = ref<HTMLElement | null>(null)
const openRef = toRef(props, 'open')

function closeDialog() {
  emit('close')
}

function handleLocatePerson(personId: string) {
  closeDialog()
  emit('locate-person', personId)
}

useFocusTrap(dialogRef, openRef, closeDialog)
</script>

<template>
  <Teleport to="body">
    <Transition name="validation-dialog">
      <div v-if="open" class="validation-dialog-overlay" @click.self="closeDialog">
        <section
          ref="dialogRef"
          class="validation-dialog-window"
          role="dialog"
          aria-modal="true"
          aria-labelledby="validation-dialog-title"
          tabindex="-1"
          @click.stop
          @mousedown.stop
        >
          <div class="validation-dialog-header">
            <div class="validation-dialog-header__title">
              <h2 id="validation-dialog-title">数据质量校验</h2>
              <p class="validation-dialog-subtitle">排查世系断层、生卒逻辑冲突或重名问题</p>
            </div>
            <button class="validation-dialog-close" type="button" aria-label="关闭" @click="closeDialog">
              <svg
                width="15"
                height="15"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              >
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
          <div class="validation-dialog-body">
            <ValidationPanel :pubId="pubId" @locate-person="handleLocatePerson" />
          </div>
        </section>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.validation-dialog-overlay {
  position: fixed;
  inset: 0;
  z-index: var(--z-modal);
  display: grid;
  place-items: center;
  padding: 24px;
  background: var(--color-overlay);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
}

.validation-dialog-window {
  width: min(640px, calc(100vw - 32px));
  max-height: min(720px, calc(100dvh - 32px));
  display: flex;
  flex-direction: column;
  overflow: hidden;
  border: 1px solid var(--color-card-stroke);
  border-radius: var(--radius-2xl);
  background: var(--color-panel-bg);
  box-shadow: var(--shadow-whisper), var(--shadow-ring);
  outline: none;
}

.validation-dialog-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 16px 24px;
  border-bottom: 1px solid var(--color-card-stroke);
  flex-shrink: 0;
}

.validation-dialog-header__title {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.validation-dialog-header h2 {
  margin: 0;
  color: var(--color-neutral-10);
  font-family: var(--font-sans);
  font-size: 16px;
  font-weight: 600;
  line-height: 1.3;
}

.validation-dialog-subtitle {
  margin: 0;
  color: var(--color-neutral-6);
  font-size: 12px;
  line-height: 1.4;
}

.validation-dialog-close {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border: none;
  border-radius: var(--radius-md);
  background: transparent;
  color: var(--color-neutral-6);
  cursor: pointer;
  transition:
    background var(--duration-fast) var(--ease-breath),
    color var(--duration-fast) var(--ease-breath),
    transform var(--duration-fast) var(--ease-breath);
}

.validation-dialog-close:hover {
  background: var(--color-neutral-3);
  color: var(--color-neutral-9);
}

.validation-dialog-close:active {
  transform: scale(0.94);
}

.validation-dialog-body {
  min-height: 0;
  overflow: auto;
}

.validation-dialog-body :deep(.validation-panel) {
  padding: 18px 20px 20px;
}

.validation-dialog-body :deep(.vp-findings) {
  max-height: min(52vh, 420px);
  padding-right: 4px;
}

.validation-dialog-enter-active,
.validation-dialog-leave-active {
  transition: opacity var(--duration-panel) var(--ease-breath);
}

.validation-dialog-enter-active .validation-dialog-window,
.validation-dialog-leave-active .validation-dialog-window {
  transition:
    opacity var(--duration-panel) var(--ease-breath),
    transform var(--duration-panel) var(--ease-breath);
}

.validation-dialog-enter-from,
.validation-dialog-leave-to {
  opacity: 0;
}

.validation-dialog-enter-from .validation-dialog-window,
.validation-dialog-leave-to .validation-dialog-window {
  opacity: 0;
  transform: translateY(8px);
}

@media (max-width: 720px) {
  .validation-dialog-overlay {
    padding: 12px;
  }

  .validation-dialog-window {
    width: calc(100vw - 24px);
    max-height: calc(100dvh - 24px);
  }

  .validation-dialog-header {
    padding: 18px 18px 12px;
  }

  .validation-dialog-body :deep(.validation-panel) {
    padding: 16px 18px 18px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .validation-dialog-enter-active,
  .validation-dialog-leave-active,
  .validation-dialog-enter-active .validation-dialog-window,
  .validation-dialog-leave-active .validation-dialog-window {
    transition: none;
  }
}
</style>
