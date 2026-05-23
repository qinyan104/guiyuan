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
    await batchDeleteAccounts(props.pubId, ids)
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
/* ═══════════════════════════════════════════════════════════
   AdminAccountsView — 派生账号管理
   表格 + 批量操作，与 AdminUsersView 统一风格
   ═══════════════════════════════════════════════════════════ */

.admin-accounts-view {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

/* ── 表头 ── */
.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.page-header h2 {
  font-family: var(--font-serif);
  font-size: var(--text-title-24);
  font-weight: 500;
  color: var(--color-neutral-10);
  margin: 0;
}

/* ── 表格 ── */
.account-table {
  padding: 0;
  overflow: hidden;
  background: var(--color-card-fill);
  border: 1px solid var(--color-card-stroke);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-whisper);
}

.account-table-head {
  display: grid;
  grid-template-columns: 36px 80px 2fr 100px 100px 120px auto;
  gap: 12px;
  padding: 14px 20px;
  font-size: var(--text-label-12);
  font-weight: 500;
  color: var(--color-neutral-6);
  letter-spacing: 0.04em;
  border-bottom: 1px solid var(--color-neutral-4);
  background: var(--color-neutral-2);
}

.account-table-row {
  display: grid;
  grid-template-columns: 36px 80px 2fr 100px 100px 120px auto;
  gap: 12px;
  padding: 14px 20px;
  align-items: center;
  border-bottom: 1px solid var(--color-neutral-4);
  transition: background var(--duration-fast);
}

.account-table-row:last-child { border-bottom: none; }
.account-table-row:hover { background: var(--color-neutral-2); }
.account-table-row.is-selected { background: var(--color-accent-muted); }
.account-table-row.is-deceased { opacity: 0.5; }

.ac-check {
  display: flex;
  align-items: center;
  justify-content: center;
}

.ac-check input[type="checkbox"] {
  width: 16px;
  height: 16px;
  accent-color: var(--color-accent);
  cursor: pointer;
}

.ac-name {
  font-size: var(--text-copy-14);
  font-weight: 500;
  color: var(--color-neutral-9);
}

.ac-gender {
  font-size: var(--text-label-12);
  color: var(--color-neutral-7);
}

.ac-status {
  font-size: var(--text-label-12);
  font-weight: 500;
  color: var(--color-neutral-6);
}

.ac-actions {
  display: flex;
  gap: 4px;
  white-space: nowrap;
  flex-shrink: 0;
}

/* ── 批量操作 ── */
.batch-bar {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 10px 20px;
  background: rgba(168, 122, 61, 0.08);
  border: 1px dashed rgba(168, 122, 61, 0.25);
  border-radius: var(--radius-lg);
}

.batch-count {
  font-size: var(--text-copy-14);
  font-weight: 500;
  color: var(--color-warning);
}

.accounts-summary {
  display: flex;
  gap: 16px;
  font-size: var(--text-label-12);
  color: var(--color-neutral-7);
  padding: 4px 0;
}

/* ── 按钮 ── */
.btn-text {
  padding: 5px 10px;
  font-size: var(--text-label-12);
  font-weight: 500;
  color: var(--color-accent);
  border: none;
  background: transparent;
  border-radius: var(--radius-sm);
  cursor: pointer;
  transition: all var(--duration-fast);
}

.btn-text:hover { background: var(--color-accent-muted); }

.btn-text--danger {
  color: var(--color-error);
}

.btn-text--danger:hover { background: rgba(196, 58, 49, 0.08); }

.action-btn {
  padding: 6px 14px;
  font-size: var(--text-label-12);
  font-weight: 500;
  border-radius: var(--radius-md);
  border: 1px solid var(--color-neutral-4);
  background: var(--color-neutral-2);
  color: var(--color-neutral-9);
  cursor: pointer;
  transition: all var(--duration-fast);
}

.action-btn:hover { background: var(--color-neutral-3); }

.action-btn.cancel {
  background: transparent;
  border-color: transparent;
  color: var(--color-neutral-7);
}

.action-btn.cancel:hover {
  background: var(--color-neutral-3);
}

.action-btn.confirm {
  background: var(--color-accent);
  color: #fff;
  border-color: var(--color-accent);
}

.action-btn.confirm:hover { filter: brightness(1.08); }

/* ── 确认弹窗 ── */
.confirm-overlay {
  position: fixed;
  inset: 0;
  z-index: 10000;
  background: var(--color-overlay);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
}

.confirm-dialog {
  width: 100%;
  max-width: 380px;
  background: var(--color-panel-bg);
  border: 1px solid var(--color-card-stroke);
  border-radius: var(--radius-xl);
  padding: 28px;
  box-shadow: var(--shadow-whisper);
}

.confirm-title {
  font-family: var(--font-serif);
  font-size: var(--text-title-20);
  font-weight: 500;
  color: var(--color-neutral-10);
  margin: 0 0 12px;
  text-align: center;
}

.confirm-message {
  font-size: var(--text-copy-14);
  color: var(--color-neutral-7);
  text-align: center;
  line-height: 1.6;
  margin: 0 0 24px;
}

.confirm-actions {
  display: flex;
  gap: 10px;
}

.confirm-actions > * { flex: 1; justify-content: center; }

@media (max-width: 960px) {
  .account-table-head { display: none; }
  .account-table-row { grid-template-columns: 1fr; gap: 8px; }
}
</style>
