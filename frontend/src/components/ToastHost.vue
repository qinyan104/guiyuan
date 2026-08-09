<script setup lang="ts">
import { useToast } from '../composables/useToast'

const { toast } = useToast()
</script>

<template>
  <Teleport to="body">
    <transition name="toast-fade">
      <div v-if="toast" class="toast" :class="toast.type">
        <svg v-if="toast.type === 'success'" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></svg>
        <svg v-else width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="10" /><line x1="15" y1="9" x2="9" y2="15" /><line x1="9" y1="9" x2="15" y2="15" /></svg>
        <span>{{ toast.message }}</span>
      </div>
    </transition>
  </Teleport>
</template>

<style scoped>
.toast {
  position: fixed;
  top: 24px;
  left: 50%;
  transform: translateX(-50%);
  z-index: var(--z-toast);
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 24px;
  border-radius: var(--radius-lg);
  font-size: var(--text-copy-14);
  font-weight: 500;
  box-shadow: var(--shadow-whisper);
  pointer-events: none;
}

.toast.success {
  background: var(--color-success-muted);
  color: var(--color-success-text, #065f46);
  border: 1px solid var(--color-success-border, #a7f3d0);
}

.toast.error {
  background: var(--color-error-muted);
  color: var(--color-error-text, #991b1b);
  border: 1px solid var(--color-error-border, #fecaca);
}

.toast-fade-enter-active,
.toast-fade-leave-active {
  transition: opacity 0.3s ease, transform 0.3s ease;
}

.toast-fade-enter-from,
.toast-fade-leave-to {
  opacity: 0;
  transform: translateX(-50%) translateY(-12px);
}
</style>
