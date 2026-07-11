<script setup lang="ts">
/**
 * ConfirmDialog — 统一确认弹窗组件
 *
 * 使用：
 *   <ConfirmDialog v-model="show" title="确认删除" message="此操作不可撤销"
 *     tone="danger" confirm-label="删除" @confirm="handleDelete" />
 *
 * Props:
 *   - size: "sm" | "md" (default) | "lg"
 *   - tone: "default" | "danger" | "warning"
 *   - confirmLabel: 确认按钮文字（默认 "确认"）
 *   - cancelLabel: 取消按钮文字（默认 "取消"）
 */
import { ref, toRef, watch } from 'vue'
import { useFocusTrap } from '../composables/useFocusTrap'

const props = defineProps<{
  modelValue: boolean
  title: string
  message: string
  confirmLabel?: string
  cancelLabel?: string
  tone?: "danger" | "warning" | "default"
  size?: "sm" | "md" | "lg"
}>()

const emit = defineEmits<{
  "update:modelValue": [value: boolean]
  confirm: []
  cancel: []
}>()

const dialogRef = ref<HTMLElement | null>(null)
const active = toRef(props, 'modelValue')

useFocusTrap(dialogRef, active, () => onCancel())

function onConfirm() {
  emit("confirm")
  emit("update:modelValue", false)
}

function onCancel() {
  emit("cancel")
  emit("update:modelValue", false)
}

watch(() => props.modelValue, (v) => {
  document.body.style.overflow = v ? 'hidden' : ''
})
</script>

<template>
  <Teleport to="body">
    <Transition name="confirm-dialog">
      <div v-if="modelValue" class="confirm-overlay" @click.self="onCancel">
        <div
          ref="dialogRef"
          class="confirm-dialog"
          role="dialog"
          aria-modal="true"
          :aria-label="title"
          tabindex="-1"
          :class="{
            [`tone-${tone || 'default'}`]: true,
            'dialog-sm': size === 'sm',
            'dialog-lg': size === 'lg',
          }"
        >
          <div v-if="tone === 'danger'" class="confirm-icon confirm-icon--danger">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round">
              <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
          </div>
          <div v-else-if="tone === 'warning'" class="confirm-icon confirm-icon--warning">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round">
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
          </div>
          <h3 class="confirm-title">{{ title }}</h3>
          <p class="confirm-message">{{ message }}</p>
          <div class="confirm-actions">
            <button
              class="btn btn--ghost"
              data-role="cancel"
              type="button"
              @click="onCancel"
            >
              {{ cancelLabel || "取消" }}
            </button>
            <button
              class="btn"
              :class="tone === 'danger' ? 'btn--danger' : tone === 'warning' ? 'btn--secondary' : 'btn--primary'"
              data-role="confirm"
              type="button"
              @click="onConfirm"
            >
              {{ confirmLabel || "确认" }}
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
/* ── Overlay ── */
.confirm-overlay {
  position: fixed;
  inset: 0;
  z-index: var(--z-critical);
  background: var(--color-overlay);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
}

/* ── Dialog ── */
.confirm-dialog {
  width: 100%;
  max-width: 400px;
  background: var(--color-panel-bg);
  border: 1px solid var(--color-card-stroke);
  border-radius: var(--radius-2xl);
  padding: 32px;
  box-shadow: var(--shadow-whisper);
  margin: 16px;
  outline: none;
}

.confirm-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 56px;
  height: 56px;
  border-radius: 50%;
  margin: 0 auto 16px;
}

.confirm-icon--danger {
  background: var(--color-error-muted);
  color: var(--color-error);
}

.confirm-icon--warning {
  background: var(--color-warning-muted);
  color: var(--color-warning);
}

.confirm-title {
  margin: 0 0 12px;
  font-family: var(--font-serif);
  font-size: var(--text-title-20);
  font-weight: 500;
  color: var(--color-neutral-10);
  text-align: center;
}

.confirm-message {
  margin: 0 0 24px;
  font-size: var(--text-copy-14);
  color: var(--color-neutral-7);
  text-align: center;
  line-height: 1.6;
}

.confirm-actions {
  display: flex;
  gap: 10px;
}

.confirm-actions > * {
  flex: 1;
  justify-content: center;
}

/* ── Tone variants ── */
.tone-danger .confirm-title {
  color: var(--color-error);
}

.tone-warning .confirm-title {
  color: var(--color-warning);
}

/* ── Size variants ── */
.dialog-sm {
  max-width: 320px;
  padding: 24px;
}

.dialog-lg {
  max-width: 520px;
  padding: 40px;
}

/* ── Transition ── */
.confirm-dialog-enter-active {
  transition: opacity var(--duration-panel) var(--ease-breath);
}

.confirm-dialog-enter-active .confirm-dialog {
  transition: transform var(--duration-panel) var(--ease-breath),
              opacity var(--duration-panel) var(--ease-breath);
}

.confirm-dialog-leave-active {
  transition: opacity var(--duration-fast) var(--ease-breath);
}

.confirm-dialog-leave-active .confirm-dialog {
  transition: transform var(--duration-fast) var(--ease-breath),
              opacity var(--duration-fast) var(--ease-breath);
}

.confirm-dialog-enter-from { opacity: 0; }
.confirm-dialog-enter-from .confirm-dialog { opacity: 0; transform: translateY(12px) scale(0.96); }
.confirm-dialog-leave-to { opacity: 0; }
.confirm-dialog-leave-to .confirm-dialog { opacity: 0; transform: translateY(8px) scale(0.98); }

@media (prefers-reduced-motion: reduce) {
  .confirm-dialog-enter-active,
  .confirm-dialog-leave-active,
  .confirm-dialog-enter-active .confirm-dialog,
  .confirm-dialog-leave-active .confirm-dialog {
    transition: none;
  }
}
</style>
