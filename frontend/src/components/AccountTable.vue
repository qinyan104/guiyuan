<script setup lang="ts">
import type { PersonAccountRow } from '../api/account'

defineProps<{
  accounts: PersonAccountRow[]
  selectedIds: Set<number>
  isAllSelected: boolean
  selectableCount: number
  batchDeleting: boolean
}>()

defineEmits<{
  (event: 'toggle-all'): void
  (event: 'toggle-account', person: PersonAccountRow): void
  (event: 'batch-delete'): void
  (event: 'clear-selection'): void
  (event: 'reset-password', person: PersonAccountRow): void
  (event: 'toggle-status', person: PersonAccountRow): void
  (event: 'delete-account', person: PersonAccountRow): void
}>()

function canSelectAccount(person: PersonAccountRow) {
  return !person.deceased && !!person.accountStatus
}
</script>

<template>
  <Transition name="fade" mode="out-in">
    <div v-if="accounts.length > 0" key="table" class="account-table">
      <Transition name="slide">
        <div v-if="selectedIds.size > 0" class="batch-bar">
          <span class="batch-count">已选 {{ selectedIds.size }} 项</span>
          <button class="btn btn--text btn--danger" :disabled="batchDeleting" @click="$emit('batch-delete')">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></svg>
            删除所选
          </button>
          <button class="btn btn--text" @click="$emit('clear-selection')">取消选择</button>
        </div>
      </Transition>
      <div class="account-table-head">
        <label class="ac-check">
          <input type="checkbox" :checked="isAllSelected" :disabled="selectableCount === 0" @change="$emit('toggle-all')" />
        </label>
        <span class="ac-name">姓名</span>
        <span class="ac-gender">性别</span>
        <span class="ac-status">账号状态</span>
        <span class="ac-actions">操作</span>
      </div>
      <div v-for="person in accounts" :key="person.personDbId" class="account-table-row" :class="{ 'is-selected': selectedIds.has(person.personDbId) }">
        <label class="ac-check">
          <input type="checkbox" :checked="selectedIds.has(person.personDbId)" :disabled="!canSelectAccount(person)" @change="$emit('toggle-account', person)" />
        </label>
        <span class="ac-name">{{ person.personName }}</span>
        <span class="ac-gender" data-label="性别">
          <span :class="['gender-badge', person.gender]">
            {{ person.gender === 'male' ? '男' : person.gender === 'female' ? '女' : '未知' }}
          </span>
        </span>
        <span class="ac-status" data-label="账号状态">
          <template v-if="person.deceased">
            <span class="status-pill deceased"><span class="dot"></span>已故</span>
          </template>
          <template v-else-if="person.accountStatus === 'orphaned'">
            <span class="status-pill orphaned"><span class="dot"></span>账号异常</span>
          </template>
          <template v-else-if="!person.accountStatus">
            <span class="status-pill pending"><span class="dot"></span>未派生</span>
          </template>
          <template v-else-if="person.accountStatus === 'active'">
            <span class="status-pill active"><span class="dot"></span>{{ person.username }}</span>
          </template>
          <template v-else>
            <span class="status-pill disabled"><span class="dot"></span>已停用</span>
          </template>
        </span>
        <span class="ac-actions">
          <template v-if="person.deceased">
            <span class="action-na">&mdash;</span>
          </template>
          <template v-else-if="person.accountStatus === 'orphaned'">
            <button class="btn btn--text btn--danger" @click="$emit('delete-account', person)">删除记录</button>
          </template>
          <template v-else-if="!person.accountStatus">
            <span class="action-na">待派生</span>
          </template>
          <template v-else-if="person.accountStatus === 'active'">
            <button class="btn btn--text" @click="$emit('reset-password', person)">重置密码</button>
            <span class="action-sep"></span>
            <button class="btn btn--text btn--danger" @click="$emit('toggle-status', person)">停用</button>
            <span class="action-sep"></span>
            <button class="btn btn--text btn--danger" @click="$emit('delete-account', person)">删除</button>
          </template>
          <template v-else>
            <button class="btn btn--text" @click="$emit('toggle-status', person)">启用</button>
            <span class="action-sep"></span>
            <button class="btn btn--text btn--danger" @click="$emit('delete-account', person)">删除</button>
          </template>
        </span>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.account-table { border: 1px solid var(--color-card-stroke); border-radius: var(--radius-lg); overflow: hidden; background: var(--color-panel-bg); }
.account-table-head { display: grid; grid-template-columns: 28px minmax(56px, 0.55fr) 40px minmax(96px, 0.8fr) minmax(190px, 1fr); gap: 8px; padding: 12px 14px; background: var(--color-neutral-1); border-bottom: 1px solid var(--color-neutral-4); font-size: 12px; font-weight: 500; color: var(--color-neutral-6); letter-spacing: 0.03em; align-items: center; }
.account-table-row { display: grid; grid-template-columns: 28px minmax(56px, 0.55fr) 40px minmax(96px, 0.8fr) minmax(190px, 1fr); gap: 8px; padding: 14px; align-items: center; border-bottom: 1px solid var(--color-neutral-3); transition: background 0.15s; }
.account-table-row:last-child { border-bottom: none; }
.account-table-row:hover { background: var(--color-neutral-1); }
.account-table-row.is-selected { background: var(--color-accent-muted); }
.ac-check input[type="checkbox"] { accent-color: var(--color-accent); cursor: pointer; }
.ac-name { font-size: 13px; font-weight: 500; color: var(--color-neutral-9); min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.ac-gender, .ac-status, .ac-actions { font-size: 12px; }
.gender-badge { display: inline-flex; align-items: center; justify-content: center; padding: 2px 8px; border-radius: 999px; background: var(--color-neutral-2); color: var(--color-neutral-7); font-size: 11px; }
.gender-badge.male { background: rgba(59, 130, 246, 0.08); color: #2563eb; }
.gender-badge.female { background: rgba(236, 72, 153, 0.08); color: #db2777; }
.status-pill { display: inline-flex; align-items: center; gap: 5px; color: var(--color-neutral-7); max-width: 100%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.status-pill .dot { width: 6px; height: 6px; border-radius: 50%; background: currentColor; flex-shrink: 0; }
.status-pill.active .dot { background: var(--color-success); }
.status-pill.active { color: var(--color-success); }
.status-pill.disabled .dot { background: var(--color-neutral-5); }
.status-pill.orphaned .dot { background: var(--color-warning); }
.status-pill.orphaned { color: #92400e; }
.status-pill.pending .dot, .status-pill.deceased .dot { background: var(--color-neutral-4); }
.status-pill.deceased { opacity: 0.5; }
.ac-actions { display: flex; align-items: center; justify-content: flex-end; flex-wrap: wrap; gap: 6px; min-width: 0; }
.ac-actions .btn { padding: 6px 8px; font-size: 12px; }
.action-sep { width: 1px; height: 14px; background: var(--color-neutral-4); }
.action-na { font-size: 12px; color: var(--color-neutral-5); }
.batch-bar { display: flex; align-items: center; gap: 12px; padding: 10px 16px; margin-bottom: 12px; background: var(--color-accent-muted); border: 1px dashed rgba(196, 58, 49, 0.25); border-radius: var(--radius-md); }
.batch-count { font-size: 13px; font-weight: 500; color: var(--color-accent); }
.btn { display: inline-flex; align-items: center; gap: 6px; padding: 8px 18px; border-radius: var(--radius-md); font-size: 13px; font-weight: 500; cursor: pointer; transition: all 0.15s; border: 1px solid transparent; }
.btn--text { padding: 4px 8px; background: transparent; color: var(--color-neutral-7); }
.btn--text:hover { background: var(--color-neutral-2); color: var(--color-neutral-9); }
.btn--danger { color: var(--color-danger); }
.btn:disabled { opacity: 0.45; cursor: not-allowed; }
@media (max-width: 760px) {
  .account-table { border: none; background: transparent; }
  .account-table-head { display: none; }
  .account-table-row { grid-template-columns: 28px minmax(0, 1fr); grid-template-areas: "check name" "check gender" "check status" "check actions"; gap: 8px 12px; padding: 14px; margin-bottom: 10px; border: 1px solid var(--color-card-stroke); border-radius: var(--radius-lg); background: var(--color-panel-bg); }
  .account-table-row:last-child { margin-bottom: 0; border-bottom: 1px solid var(--color-card-stroke); }
  .ac-check { grid-area: check; align-self: start; }
  .ac-name { grid-area: name; }
  .ac-gender { grid-area: gender; }
  .ac-status { grid-area: status; }
  .ac-actions { grid-area: actions; justify-content: flex-start; }
}
</style>
