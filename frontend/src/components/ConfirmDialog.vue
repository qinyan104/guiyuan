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
 *
 * 样式由 interaction-baseline.css 提供。
 */
defineProps<{
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

function onConfirm() {
  emit("confirm")
  emit("update:modelValue", false)
}

function onCancel() {
  emit("cancel")
  emit("update:modelValue", false)
}
</script>

<template>
  <Teleport to="body">
    <div v-if="modelValue" class="confirm-overlay" @click.self="onCancel">
      <div
        class="confirm-dialog"
        :class="{
          [`tone-${tone || 'default'}`]: true,
          'dialog-sm': size === 'sm',
          'dialog-lg': size === 'lg',
        }"
      >
        <h3 class="confirm-title">{{ title }}</h3>
        <p class="confirm-message">{{ message }}</p>
        <div class="confirm-actions">
          <button
            class="bento-btn ghost"
            data-role="cancel"
            type="button"
            @click="onCancel"
          >
            {{ cancelLabel || "取消" }}
          </button>
          <button
            class="bento-btn"
            :class="tone === 'danger' ? 'danger' : tone === 'warning' ? 'warning' : 'primary'"
            data-role="confirm"
            type="button"
            @click="onConfirm"
          >
            {{ confirmLabel || "确认" }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
/* ── Overlay ── */
.confirm-overlay {
  position: fixed;
  inset: 0;
  z-index: 10000;
  background: var(--color-overlay, rgba(0, 0, 0, 0.35));
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
}

/* ── Dialog ── */
.confirm-dialog {
  width: 100%;
  max-width: 400px;
  background: var(--color-panel-bg, #fff);
  border: 1px solid var(--color-card-stroke, #e5e7eb);
  border-radius: var(--radius-xl, 16px);
  padding: 32px;
  box-shadow: var(--shadow-whisper);
  margin: 16px;
}

.confirm-title {
  margin: 0 0 12px;
  font-family: var(--font-serif);
  font-size: var(--text-title-20, 20px);
  font-weight: 500;
  color: var(--color-neutral-10, #1a1a1a);
  text-align: center;
}

.confirm-message {
  margin: 0 0 24px;
  font-size: var(--text-copy-14, 14px);
  color: var(--color-neutral-7, #6b7280);
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
  color: var(--color-error, #dc2626);
}

.tone-warning .confirm-title {
  color: var(--color-warning, #d97706);
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
</style>

