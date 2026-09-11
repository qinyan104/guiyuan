<script setup lang="ts">
defineProps<{
  totalAccounts: number
  aliveAccounts: number
  loading: boolean
  deriving: boolean
  cleaningOrphans: boolean
  error: string | null
}>()

defineEmits<{
  (event: 'derive'): void
  (event: 'cleanup-orphans'): void
  (event: 'dismiss-error'): void
}>()
</script>

<template>
  <div class="section-header-row">
    <h4 class="section-title">族人账号</h4>
    <span v-if="totalAccounts > 0" class="accounts-summary">{{ totalAccounts }} 人 / <strong>{{ aliveAccounts }}</strong> 人在世</span>
  </div>
  <p class="section-desc">为在世族人创建登录账号，他们即可自行维护个人信息。</p>

  <Transition name="slide">
    <div v-if="error" class="error-strip">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>
      <span>{{ error }}</span>
      <button class="error-dismiss" @click="$emit('dismiss-error')">&times;</button>
    </div>
  </Transition>

  <div class="derive-bar">
    <button class="btn btn--primary btn-derive" :disabled="loading || deriving" @click="$emit('derive')">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" /><line x1="8.59" y1="13.51" x2="15.42" y2="17.49" /><line x1="15.41" y1="6.51" x2="8.59" y2="10.49" /></svg>
      {{ deriving ? '派生中...' : '派生账号' }}
    </button>
    <button class="btn btn--ghost btn-derive" :disabled="loading || cleaningOrphans" @click="$emit('cleanup-orphans')">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></svg>
      {{ cleaningOrphans ? '清理中...' : '清理空悬账号' }}
    </button>
  </div>
</template>

<style scoped>
.slide-enter-active, .slide-leave-active { transition: all 0.25s ease; overflow: hidden; }
.slide-enter-from, .slide-leave-to { opacity: 0; max-height: 0; margin-bottom: 0; }
.slide-enter-to, .slide-leave-from { opacity: 1; max-height: 200px; }
.section-header-row { display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px; }
.section-title { font-family: var(--font-serif); font-size: var(--text-title-18); font-weight: 500; color: var(--color-neutral-10); margin: 0; }
.section-desc { font-size: 13px; color: var(--color-neutral-6); margin: 0 0 16px; }
.accounts-summary { font-size: 13px; color: var(--color-neutral-6); }
.accounts-summary strong { color: var(--color-neutral-9); }
.error-strip { display: flex; align-items: center; gap: 8px; padding: 10px 12px; background: var(--color-error-muted); color: var(--color-error); border-radius: var(--radius-md); margin-bottom: 12px; font-size: 13px; }
.error-strip span { flex: 1; }
.error-dismiss { width: 22px; height: 22px; border: none; background: transparent; color: currentColor; border-radius: 50%; cursor: pointer; font-size: 16px; line-height: 1; }
.error-dismiss:hover { background: rgba(0, 0, 0, 0.08); }
.derive-bar { display: flex; gap: 10px; margin-bottom: 16px; }
.btn { display: inline-flex; align-items: center; gap: 6px; padding: 8px 18px; border-radius: var(--radius-md); font-size: 13px; font-weight: 500; cursor: pointer; transition: all 0.15s; border: 1px solid transparent; }
.btn--primary { background: var(--color-accent); color: var(--color-text-on-accent); border-color: var(--color-accent); }
.btn--primary:hover { filter: brightness(1.08); }
.btn--ghost { background: transparent; border-color: var(--color-neutral-4); color: var(--color-neutral-7); }
.btn--ghost:hover { background: var(--color-neutral-2); border-color: var(--color-neutral-5); }
.btn:disabled { opacity: 0.45; cursor: not-allowed; }
.btn-derive { font-size: 12px; padding: 6px 12px; }
@media (max-width: 760px) { .derive-bar { flex-direction: column; } }
</style>
