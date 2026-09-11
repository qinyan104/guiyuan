<script setup lang="ts">
defineProps<{
  loading: boolean
  hasError: boolean
  isEmpty: boolean
}>()
</script>

<template>
  <div v-if="loading" class="loading-state">
    <div class="spinner"></div>
    <span>加载账号列表...</span>
  </div>

  <div v-if="!loading && !hasError && isEmpty" class="empty-state-sm">
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" opacity="0.25"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
    <span>还没有账号，点击"派生账号"为在世族人创建。</span>
  </div>
</template>

<style scoped>
.loading-state, .empty-state-sm { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 12px; padding: 32px 20px; color: var(--color-neutral-6); font-size: 13px; }
.spinner { width: 24px; height: 24px; border: 2px solid var(--color-neutral-3); border-top-color: var(--color-accent); border-radius: 50%; animation: spin 0.8s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
</style>
