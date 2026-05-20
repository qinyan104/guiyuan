<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import {
  deriveAccounts,
  listAccounts,
  disableAccount,
  enableAccount,
  resetAccountPassword,
  deleteAccount,
  batchDeleteAccounts,
  cleanupOrphanedAccounts,
  type DerivedAccount,
  type PersonAccountRow,
} from '../api/account'
import ConfirmDialog from '../components/ConfirmDialog.vue'

const props = defineProps<{ pubId: number }>()

const accounts = ref<PersonAccountRow[]>([])
const loading = ref(true)
const deriving = ref(false)
const derivedResult = ref<DerivedAccount[]>([])
const showDerivedResult = ref(false)

const resetTarget = ref<PersonAccountRow | null>(null)
const resetResult = ref<string | null>(null)
const showResetResult = ref(false)

const confirmAction = ref<{ personDbId: number; action: 'disable' | 'enable' } | null>(null)
const pendingDeletePerson = ref<PersonAccountRow | null>(null)

// Selection
const selectedAccountIds = ref<Set<number>>(new Set())
const batchDeleting = ref(false)
const cleaningOrphans = ref(false)

const isAllSelected = computed(() =>
  accounts.value.length > 0 && selectedAccountIds.value.size === accounts.value.length
)

const hasOrphans = computed(() =>
  accounts.value.some(p => p.accountStatus === 'orphaned')
)

function toggleSelectAll() {
  if (isAllSelected.value) {
    selectedAccountIds.value = new Set()
  } else {
    selectedAccountIds.value = new Set(accounts.value.map(p => p.personDbId))
  }
}

function toggleSelectAccount(personDbId: number) {
  const next = new Set(selectedAccountIds.value)
  if (next.has(personDbId)) {
    next.delete(personDbId)
  } else {
    next.add(personDbId)
  }
  selectedAccountIds.value = next
}

async function loadAccounts() {
  loading.value = true
  try {
    accounts.value = await listAccounts(props.pubId)
  } catch {
    accounts.value = []
  } finally {
    loading.value = false
  }
}

onMounted(loadAccounts)

async function handleDerive() {
  deriving.value = true
  try {
    derivedResult.value = await deriveAccounts(props.pubId)
    showDerivedResult.value = true
    await loadAccounts()
  } catch {
    // error
  } finally {
    deriving.value = false
  }
}

async function handleToggle(personDbId: number, action: 'disable' | 'enable') {
  try {
    if (action === 'disable') {
      await disableAccount(props.pubId, personDbId)
    } else {
      await enableAccount(props.pubId, personDbId)
    }
    confirmAction.value = null
    await loadAccounts()
  } catch {
    // error
  }
}

async function handleResetPassword(person: PersonAccountRow) {
  try {
    const newPassword = await resetAccountPassword(props.pubId, person.personDbId)
    resetResult.value = newPassword
    showResetResult.value = true
  } catch {
    // error
  }
}

async function handleBatchDelete() {
  const ids = [...selectedAccountIds.value]
  if (ids.length === 0) return
  batchDeleting.value = true
  try {
    const count = await batchDeleteAccounts(props.pubId, ids)
    selectedAccountIds.value = new Set()
    await loadAccounts()
  } catch {
    // error
  } finally {
    batchDeleting.value = false
  }
}

async function handleCleanupOrphans() {
  cleaningOrphans.value = true
  try {
    await cleanupOrphanedAccounts(props.pubId)
    await loadAccounts()
  } catch {
    // error
  } finally {
    cleaningOrphans.value = false
  }
}

function requestToggle(person: PersonAccountRow, action: 'disable' | 'enable') {
  confirmAction.value = { personDbId: person.personDbId, action }
}

function requestDelete(person: PersonAccountRow) {
  pendingDeletePerson.value = person
}

async function confirmDelete() {
  const person = pendingDeletePerson.value
  if (!person) return
  try {
    await deleteAccount(props.pubId, person.personDbId)
    pendingDeletePerson.value = null
    await loadAccounts()
  } catch {
    // error
  }
}

function genderLabel(g: string) {
  if (g === 'male') return '男'
  if (g === 'female') return '女'
  return '未知'
}
</script>

<template>
  <div class="admin-accounts-root">
    <div class="admin-accounts-view">
      <header class="poetic-header">
        <div class="poetic-header__main">
          <div class="poetic-eyebrow">族谱管理</div>
          <h1 class="poetic-title">族人账号</h1>
        </div>
        <div class="poetic-header__extra">
          <button class="bento-btn" :disabled="cleaningOrphans || !hasOrphans" @click="handleCleanupOrphans">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
            {{ cleaningOrphans ? '清理中...' : '清理空悬' }}
          </button>
          <button class="bento-btn primary" :disabled="deriving" @click="handleDerive">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
            {{ deriving ? '派生中...' : '派生账号' }}
          </button>
        </div>
      </header>

      <!-- Derived Result -->
      <transition name="glass-pop">
        <div v-if="showDerivedResult && derivedResult.length > 0" class="bento-card derived-result">
          <div class="form-header">
            <h3>已派生 {{ derivedResult.length }} 个账号</h3>
            <button class="icon-btn" @click="showDerivedResult = false">关闭</button>
          </div>
          <p class="hint">请妥善保存以下凭据，密码仅显示一次。管理员可截图/打印后线下分发给族人。</p>
          <div class="credentials-table">
            <div class="cred-header">
              <span>姓名</span><span>用户名</span><span>初始密码</span>
            </div>
            <div v-for="cred in derivedResult" :key="cred.personDbId" class="cred-row">
              <span>{{ cred.personName }}</span>
              <span class="mono">{{ cred.username }}</span>
              <span class="mono">{{ cred.password }}</span>
            </div>
          </div>
        </div>
      </transition>

      <!-- Loading -->
      <div v-if="loading" class="loading-state">
        <div class="spinner"></div>
      </div>

      <!-- Accounts Table -->
      <div v-else class="accounts-table">
        <!-- Batch action bar -->
        <transition name="glass-pop">
          <div v-if="selectedAccountIds.size > 0" class="batch-bar">
            <span class="batch-count">已选 {{ selectedAccountIds.size }} 项</span>
            <button class="bento-btn small danger" :disabled="batchDeleting" @click="handleBatchDelete">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
              删除所选
            </button>
            <button class="bento-btn small" @click="selectedAccountIds = new Set()">取消</button>
          </div>
        </transition>

        <div class="table-header">
          <label class="check-col">
            <input type="checkbox" :checked="isAllSelected" @change="toggleSelectAll" />
          </label>
          <span>姓名</span>
          <span>性别</span>
          <span>状态</span>
          <span>账号状态</span>
          <span>用户名</span>
          <span>操作</span>
        </div>
        <div
          v-for="row in accounts"
          :key="row.personDbId"
          class="table-row"
          :class="{ 'is-selected': selectedAccountIds.has(row.personDbId), 'is-deceased': row.deceased }"
        >
          <label class="check-col">
            <input type="checkbox" :checked="selectedAccountIds.has(row.personDbId)" @change="toggleSelectAccount(row.personDbId)" />
          </label>
          <span class="name">{{ row.personName }}</span>
          <span>{{ genderLabel(row.gender) }}</span>
          <span>
            <span v-if="row.deceased" class="badge deceased">已故</span>
            <span v-else class="badge alive">在世</span>
          </span>
          <span>
            <span v-if="row.accountStatus === 'active'" class="badge active">已启用</span>
            <span v-else-if="row.accountStatus === 'disabled'" class="badge disabled">已停用</span>
            <span v-else-if="row.accountStatus === 'orphaned'" class="badge orphaned">账号异常</span>
            <span v-else class="badge none">未创建</span>
          </span>
          <span class="mono">{{ row.username || '-' }}</span>
          <span class="actions-cell">
            <template v-if="!row.deceased && row.accountStatus === 'active'">
              <button class="bento-btn small warning" @click="requestToggle(row, 'disable')">停用</button>
              <button class="bento-btn small" @click="handleResetPassword(row)">重置密码</button>
              <button class="bento-btn small danger" @click="requestDelete(row)">删除</button>
            </template>
            <template v-else-if="!row.deceased && row.accountStatus === 'disabled'">
              <button class="bento-btn small success" @click="requestToggle(row, 'enable')">启用</button>
              <button class="bento-btn small danger" @click="requestDelete(row)">删除</button>
            </template>
            <template v-else-if="row.accountStatus === 'orphaned'">
              <button class="bento-btn small danger" @click="requestDelete(row)">删除记录</button>
            </template>
            <span v-else class="muted">不可操作</span>
          </span>
        </div>
        <div v-if="accounts.length === 0" class="empty-state">
          <p>暂无族人数据</p>
        </div>
      </div>

      <!-- Confirm Toggle Dialog -->
      <ConfirmDialog
        :modelValue="confirmAction !== null"
        :title="confirmAction?.action === 'disable' ? '确认停用账号' : '确认启用账号'"
        :message="confirmAction?.action === 'disable' ? '停用后该族人将无法登录。' : '启用后该族人可正常登录。'"
        :confirmLabel="confirmAction?.action === 'disable' ? '确认停用' : '确认启用'"
        :tone="confirmAction?.action === 'disable' ? 'warning' : 'default'"
        @confirm="confirmAction && handleToggle(confirmAction.personDbId, confirmAction.action)"
        @cancel="confirmAction = null"
        @update:model-value="(v: boolean) => { if (!v) confirmAction = null }"
      />

      <!-- Reset Password Result Dialog -->
      <ConfirmDialog
        :modelValue="showResetResult"
        title="密码已重置"
        :message="`新密码：${resetResult}\n\n请妥善保存，密码仅显示一次。`"
        confirmLabel="我已保存"
        tone="default"
        @confirm="showResetResult = false; resetTarget = null"
        @cancel="showResetResult = false"
        @update:model-value="(v: boolean) => { if (!v) { showResetResult = false; resetTarget = null } }"
      />

      <!-- Delete Confirm Dialog -->
      <ConfirmDialog
        :modelValue="pendingDeletePerson !== null"
        :title="pendingDeletePerson ? `删除 ${pendingDeletePerson.personName} 的账号` : ''"
        :message="pendingDeletePerson ? `确定删除「${pendingDeletePerson.personName}」的账号记录？关联的登录账号和协作权限将一并清除，此操作不可撤销。` : ''"
        confirmLabel="确认删除"
        tone="danger"
        @confirm="confirmDelete"
        @cancel="pendingDeletePerson = null"
        @update:model-value="(v: boolean) => { if (!v) pendingDeletePerson = null }"
      />
    </div>
  </div>
</template>

<style scoped>
.admin-accounts-root {
  width: 100%;
  min-height: 100%;
  padding: 2rem;
  box-sizing: border-box;
}
.admin-accounts-view {
  max-width: 1100px;
  margin: 0 auto;
}
.poetic-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 2rem;
  gap: 1.5rem;
}
.poetic-eyebrow {
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.12em;
  opacity: 0.5;
  margin-bottom: 0.25rem;
}
.poetic-title {
  font-size: 1.75rem;
  font-weight: 700;
  margin: 0;
}
.bento-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.6rem 1.2rem;
  border: 1px solid var(--border, rgba(0,0,0,0.1));
  border-radius: 10px;
  background: var(--surface, #fff);
  color: var(--text, #1a1a1a);
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s;
}
.bento-btn:hover {
  background: var(--surface-hover, #f5f5f5);
}
.bento-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.bento-btn.primary {
  background: var(--accent, #6366f1);
  color: #fff;
  border-color: transparent;
}
.bento-btn.primary:hover:not(:disabled) { opacity: 0.9; }
.bento-btn.small {
  padding: 0.25rem 0.5rem;
  font-size: 0.75rem;
  white-space: nowrap;
}
.bento-btn.warning {
  color: #b45309;
  border-color: #fbbf24;
  background: #fef3c7;
}
.bento-btn.success {
  color: #15803d;
  border-color: #4ade80;
  background: #dcfce7;
}
.bento-btn.danger {
  color: #b91c1c;
  border-color: #fca5a5;
  background: #fee2e2;
}
.bento-btn.danger:hover:not(:disabled) { background: #fecaca; }
.icon-btn {
  background: none;
  border: none;
  cursor: pointer;
  font-size: 0.85rem;
  opacity: 0.6;
  padding: 0.25rem 0.5rem;
}
.icon-btn:hover { opacity: 1; }

.bento-card {
  background: var(--surface, #fff);
  border: 1px solid var(--border, rgba(0,0,0,0.08));
  border-radius: 16px;
  padding: 1.5rem;
  margin-bottom: 1.5rem;
  backdrop-filter: blur(12px);
}
.form-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}
.form-header h3 {
  margin: 0;
  font-size: 1.1rem;
}
.hint {
  font-size: 0.85rem;
  opacity: 0.6;
  margin-bottom: 1rem;
}
.credentials-table {
  border: 1px solid var(--border, rgba(0,0,0,0.08));
  border-radius: 10px;
  overflow: hidden;
}
.cred-header, .cred-row {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  padding: 0.6rem 1rem;
  font-size: 0.85rem;
}
.cred-header {
  background: var(--surface-alt, rgba(0,0,0,0.03));
  font-weight: 600;
  font-size: 0.8rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}
.cred-row {
  border-top: 1px solid var(--border, rgba(0,0,0,0.06));
}
.cred-row:hover {
  background: var(--surface-hover, rgba(0,0,0,0.02));
}
.mono {
  font-family: 'SF Mono', 'Cascadia Code', 'Consolas', monospace;
  font-size: 0.85em;
}
.accounts-table {
  background: var(--surface, #fff);
  border: 1px solid var(--border, rgba(0,0,0,0.08));
  border-radius: 16px;
  overflow: hidden;
}

/* Batch action bar */
.batch-bar {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  padding: 0.5rem 1rem;
  background: #eef2ff;
  border-bottom: 1px solid var(--border, rgba(0,0,0,0.06));
}
.batch-count {
  font-size: 0.8rem;
  font-weight: 600;
  margin-right: 0.5rem;
}

/* Checkbox column */
.check-col {
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}
.check-col input[type="checkbox"] {
  width: 16px;
  height: 16px;
  accent-color: var(--accent, #6366f1);
  cursor: pointer;
}

.table-header, .table-row {
  display: grid;
  grid-template-columns: 32px 1fr 0.5fr 0.6fr 0.8fr 0.8fr 2fr;
  padding: 0.7rem 1rem;
  align-items: center;
  font-size: 0.85rem;
  gap: 0.5rem;
}
.table-header {
  background: var(--surface-alt, rgba(0,0,0,0.03));
  font-weight: 600;
  font-size: 0.8rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}
.table-row {
  border-top: 1px solid var(--border, rgba(0,0,0,0.06));
}
.table-row:hover {
  background: var(--surface-hover, rgba(0,0,0,0.02));
}
.table-row.is-deceased {
  opacity: 0.45;
}
.table-row.is-selected {
  background: #eef2ff;
}
.name {
  font-weight: 500;
}
.badge {
  display: inline-block;
  padding: 0.15rem 0.5rem;
  border-radius: 9999px;
  font-size: 0.75rem;
  font-weight: 500;
}
.badge.alive {
  background: #dcfce7;
  color: #15803d;
}
.badge.deceased {
  background: #f3f4f6;
  color: #6b7280;
}
.badge.active {
  background: #dbeafe;
  color: #1d4ed8;
}
.badge.disabled {
  background: #fef3c7;
  color: #b45309;
}
.badge.orphaned {
  background: #fee2e2;
  color: #b91c1c;
}
.badge.none {
  background: #f3f4f6;
  color: #9ca3af;
}
.actions-cell {
  display: flex;
  gap: 0.3rem;
  flex-wrap: nowrap;
  white-space: nowrap;
}
.muted {
  font-size: 0.8rem;
  opacity: 0.4;
}
.empty-state {
  padding: 3rem;
  text-align: center;
  opacity: 0.5;
}
.loading-state {
  display: flex;
  justify-content: center;
  padding: 3rem;
}
.spinner {
  width: 24px;
  height: 24px;
  border: 3px solid var(--border, rgba(0,0,0,0.1));
  border-top-color: var(--accent, #6366f1);
  border-radius: 50%;
  animation: spin 0.6s linear infinite;
}
@keyframes spin {
  to { transform: rotate(360deg); }
}
.glass-pop-enter-active,
.glass-pop-leave-active {
  transition: all 0.2s ease;
}
.glass-pop-enter-from,
.glass-pop-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}
</style>
