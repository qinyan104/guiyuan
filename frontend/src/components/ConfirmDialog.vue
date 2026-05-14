<script setup lang="ts">
defineProps<{
  modelValue: boolean
  title: string
  message: string
  confirmLabel?: string
  tone?: 'danger' | 'warning' | 'default'
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  confirm: []
  cancel: []
}>()

function onConfirm() {
  emit('confirm')
  emit('update:modelValue', false)
}

function onCancel() {
  emit('cancel')
  emit('update:modelValue', false)
}
</script>

<template>
  <Teleport to="body">
    <div v-if="modelValue" class="confirm-overlay" @click.self="onCancel">
      <div class="confirm-dialog" :class="`tone-${tone || 'default'}`">
        <h3 class="confirm-title">{{ title }}</h3>
        <p class="confirm-message">{{ message }}</p>
        <div class="confirm-actions">
          <button class="confirm-btn confirm-btn--secondary" data-role="cancel" type="button" @click="onCancel">
            取消
          </button>
          <button class="confirm-btn confirm-btn--primary" :class="`tone-${tone || 'default'}`" data-role="confirm" type="button" @click="onConfirm">
            {{ confirmLabel || '确认' }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.confirm-overlay {
  position: fixed;
  inset: 0;
  z-index: 9999;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.4);
}
.confirm-dialog {
  background: var(--bg-panel-strong, #fff);
  color: var(--text-main);
  border: 1px solid var(--line-soft, rgba(0,0,0,0.1));
  border-radius: 12px;
  padding: 24px;
  max-width: 420px;
  width: 90%;
  box-shadow: 0 8px 32px rgba(0,0,0,0.18);
}
.confirm-title {
  margin: 0 0 8px;
  font-size: 1.1rem;
  font-weight: 700;
  color: var(--text-main);
}
.confirm-message {
  margin: 0 0 20px;
  color: var(--text-sub, #666);
  line-height: 1.5;
}
.confirm-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}
.confirm-btn {
  padding: 8px 20px;
  border-radius: 6px;
  border: 1px solid var(--line-soft, #ddd);
  background: var(--bg-paper, #fff);
  color: var(--text-main);
  cursor: pointer;
  font-weight: 500;
  font-size: 0.9rem;
  transition: all 0.2s ease;
}
.confirm-btn--primary.tone-danger {
  background: var(--danger-btn-color, #dc3545);
  color: #fff;
  border-color: var(--danger-border, #dc3545);
}
.confirm-btn--primary.tone-warning {
  background: var(--task-warm, #ffc107);
  color: #333;
  border-color: var(--task-warm, #ffc107);
}
.confirm-btn--primary.tone-default {
  background: var(--btn-primary-bg, #0d6efd);
  color: var(--btn-primary-color, #fff);
  border-color: var(--btn-primary-bg, #0d6efd);
}
.confirm-btn--secondary:hover {
  background: var(--bg-panel, #f5f5f5);
}
</style>
