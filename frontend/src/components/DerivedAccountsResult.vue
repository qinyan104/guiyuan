<script setup lang="ts">
import type { DerivedAccount } from '../api/account'

defineProps<{
  show: boolean
  deriving: boolean
  accounts: DerivedAccount[]
}>()

defineEmits<{
  (event: 'export'): void
  (event: 'dismiss'): void
  (event: 'copy', text: string): void
}>()
</script>

<template>
  <Transition name="slide">
    <div v-if="show && accounts.length > 0" class="derive-result">
      <div class="derive-result-header">
        <span class="derive-result-title">已创建 {{ accounts.length }} 个账号</span>
        <div class="derive-result-actions">
          <button class="btn btn--text" type="button" @click="$emit('export')">导出 Excel</button>
          <button class="derive-dismiss" type="button" @click="$emit('dismiss')">&times;</button>
        </div>
      </div>
      <div class="derive-result-list">
        <div v-for="acc in accounts" :key="acc.personDbId" class="derive-row">
          <span class="derive-name">{{ acc.personName }}</span>
          <div class="derive-creds">
            <code class="creds-item" title="点击复制用户名" @click="$emit('copy', acc.username)">{{ acc.username }}</code>
            <code class="creds-item creds-pw" title="点击复制密码" @click="$emit('copy', acc.password)">{{ acc.password }}</code>
          </div>
        </div>
      </div>
      <p class="derive-hint">凭证已复制到剪切板，请分发给对应族人。</p>
    </div>
  </Transition>

  <Transition name="slide">
    <div v-if="show && accounts.length === 0 && !deriving" class="derive-result warn">
      <div class="derive-result-header">
        <span>无需派生 — 所有在世族人已有账号</span>
        <button class="derive-dismiss" @click="$emit('dismiss')">&times;</button>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.derive-result { background: var(--color-neutral-1); border: 1px solid var(--color-neutral-4); border-radius: var(--radius-lg); padding: 16px; margin-bottom: 16px; }
.derive-result.warn { background: rgba(245, 158, 11, 0.06); border-color: rgba(245, 158, 11, 0.2); }
.derive-result-header { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 12px; }
.derive-result-actions { display: flex; align-items: center; gap: 8px; }
.derive-result-title { font-size: 14px; font-weight: 500; color: var(--color-neutral-9); }
.derive-dismiss { width: 24px; height: 24px; border: none; background: var(--color-neutral-3); border-radius: 50%; font-size: 14px; cursor: pointer; display: flex; align-items: center; justify-content: center; color: var(--color-neutral-7); }
.derive-result-list { display: flex; flex-direction: column; gap: 8px; }
.derive-row { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 8px 0; }
.derive-name { font-size: 13px; font-weight: 500; color: var(--color-neutral-9); }
.derive-creds { display: flex; flex-wrap: wrap; gap: 8px; min-width: 0; }
.creds-item { max-width: 100%; padding: 3px 10px; background: var(--color-neutral-2); border: 1px solid var(--color-neutral-4); border-radius: var(--radius-sm); font-size: 12px; font-family: monospace; color: var(--color-neutral-8); cursor: pointer; transition: all 0.15s; overflow-wrap: anywhere; }
.creds-item:hover { border-color: var(--color-accent); background: var(--color-accent-muted); }
.creds-pw { color: var(--color-accent); }
.derive-hint { font-size: 11px; color: var(--color-neutral-6); margin: 10px 0 0; }
.btn { display: inline-flex; align-items: center; gap: 6px; padding: 8px 18px; border-radius: var(--radius-md); font-size: 13px; font-weight: 500; cursor: pointer; transition: all 0.15s; border: 1px solid transparent; }
.btn--text { padding: 4px 8px; background: transparent; color: var(--color-neutral-7); }
.btn--text:hover { background: var(--color-neutral-2); color: var(--color-neutral-9); }
</style>
