<script setup lang="ts">
import type { PersonAccountRow } from '../api/account'
import BaseDialog from './BaseDialog.vue'
import ConfirmDialog from './ConfirmDialog.vue'

defineProps<{
  showResetDialog: boolean
  resetPersonName: string
  resetPasswordResult: string | null
  pendingResetPerson: PersonAccountRow | null
  pendingDeletePerson: PersonAccountRow | null
}>()

defineEmits<{
  (event: 'update:showResetDialog', value: boolean): void
  (event: 'copy-password'): void
  (event: 'confirm-reset'): void
  (event: 'cancel-reset'): void
  (event: 'confirm-delete'): void
  (event: 'cancel-delete'): void
}>()
</script>

<template>
  <BaseDialog
    :visible="showResetDialog"
    :title="`${resetPersonName} 的新密码`"
    maxWidth="420px"
    @update:visible="$emit('update:showResetDialog', $event)"
  >
    <div class="reset-pw-body">
      <div class="reset-pw-label">点击密码复制，然后分发给该族人</div>
      <code class="reset-pw-code" @click="$emit('copy-password')">{{ resetPasswordResult }}</code>
      <div class="reset-pw-hint">旧密码将立即失效。</div>
    </div>
    <template #footer>
      <button class="btn btn--primary" type="button" @click="$emit('update:showResetDialog', false)">我已保存</button>
    </template>
  </BaseDialog>

  <ConfirmDialog
    :modelValue="pendingResetPerson !== null"
    :title="pendingResetPerson ? `重置 ${pendingResetPerson.personName} 的密码` : '确认重置密码'"
    message="重置后旧密码将立即失效，请确认已经准备好保存新密码。"
    confirmLabel="确认重置"
    tone="warning"
    @confirm="$emit('confirm-reset')"
    @cancel="$emit('cancel-reset')"
    @update:model-value="(v: boolean) => { if (!v) $emit('cancel-reset') }"
  />

  <ConfirmDialog
    :modelValue="pendingDeletePerson !== null"
    :title="pendingDeletePerson ? `删除 ${pendingDeletePerson.personName} 的账号` : ''"
    :message="pendingDeletePerson ? `确定删除 ${pendingDeletePerson.personName} 的账号记录？关联的登录账号和协作权限将一并清除，此操作不可撤销。` : ''"
    confirmLabel="确认删除"
    tone="danger"
    @confirm="$emit('confirm-delete')"
    @cancel="$emit('cancel-delete')"
    @update:model-value="(v: boolean) => { if (!v) $emit('cancel-delete') }"
  />
</template>

<style scoped>
.reset-pw-body { display: flex; flex-direction: column; gap: 12px; }
.reset-pw-label { font-size: 13px; color: var(--color-neutral-6); }
.reset-pw-code { display: block; padding: 14px 16px; background: var(--color-neutral-2); border: 1px solid var(--color-neutral-4); border-radius: var(--radius-md); font-size: 18px; font-family: monospace; color: var(--color-accent); cursor: pointer; text-align: center; letter-spacing: 0.04em; }
.reset-pw-code:hover { border-color: var(--color-accent); background: var(--color-accent-muted); }
.reset-pw-hint { font-size: 12px; color: var(--color-danger); }
.btn { display: inline-flex; align-items: center; gap: 6px; padding: 8px 18px; border-radius: var(--radius-md); font-size: 13px; font-weight: 500; cursor: pointer; transition: all 0.15s; border: 1px solid transparent; }
.btn--primary { background: var(--color-accent); color: var(--color-text-on-accent); border-color: var(--color-accent); }
.btn--primary:hover { filter: brightness(1.08); }
</style>
