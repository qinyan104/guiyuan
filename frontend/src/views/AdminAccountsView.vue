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
import { getUserErrorMessage } from '../api/http'
import BaseDialog from '../components/BaseDialog.vue'
import ConfirmDialog from '../components/ConfirmDialog.vue'
import PoeticHeader from '../components/PoeticHeader.vue'
import { useToast } from '../composables/useToast'

const props = defineProps<{ pubId: number }>()
const { showToast } = useToast()

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
const showBatchDeleteConfirm = ref(false)
const batchDeleting = ref(false)
const showCleanupConfirm = ref(false)
const cleaningOrphans = ref(false)

const isAllSelected = computed(() =>
  accounts.value.length > 0 && selectedAccountIds.value.size === accounts.value.length
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
  } catch (error) {
    accounts.value = []
    showToast(getUserErrorMessage(error, '加载族人账号失败'), 'error')
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
    showToast(derivedResult.value.length > 0 ? `已派生 ${derivedResult.value.length} 个账号` : '没有需要派生的账号')
    await loadAccounts()
  } catch (error) {
    showToast(getUserErrorMessage(error, '派生账号失败'), 'error')
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
    showToast(action === 'disable' ? '账号已停用' : '账号已启用')
    await loadAccounts()
  } catch (error) {
    showToast(getUserErrorMessage(error, '操作失败'), 'error')
  }
}

function csvCell(value: string | number) {
  return `"${String(value).replace(/"/g, '""')}"`
}

function exportDerivedAccounts() {
  if (derivedResult.value.length === 0) return
  const rows = [
    ['姓名', '用户名', '初始密码'],
    ...derivedResult.value.map(account => [account.personName, account.username, account.password]),
  ]
  const csv = '\uFEFF' + rows.map(row => row.map(csvCell).join(',')).join('\r\n')
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }))
  const link = document.createElement('a')
  link.href = url
  link.download = `派生账号-${props.pubId}.csv`
  link.click()
  URL.revokeObjectURL(url)
}

async function handleResetPassword(person: PersonAccountRow) {
  try {
    const newPassword = await resetAccountPassword(props.pubId, person.personDbId)
    resetResult.value = newPassword
    showResetResult.value = true
  } catch (error) {
    showToast(getUserErrorMessage(error, '重置密码失败'), 'error')
  }
}

function requestResetPassword(person: PersonAccountRow) {
  resetTarget.value = person
}

async function confirmResetPassword() {
  const person = resetTarget.value
  if (!person) return
  resetTarget.value = null
  await handleResetPassword(person)
}

async function handleBatchDelete() {
  const ids = [...selectedAccountIds.value]
  if (ids.length === 0) return
  showBatchDeleteConfirm.value = false
  batchDeleting.value = true
  try {
    const count = await batchDeleteAccounts(props.pubId, ids)
    selectedAccountIds.value = new Set()
    showToast(`已删除 ${count} 个账号`)
    await loadAccounts()
  } catch (error) {
    showToast(getUserErrorMessage(error, '批量删除失败'), 'error')
  } finally {
    batchDeleting.value = false
  }
}

async function handleCleanupOrphans() {
  showCleanupConfirm.value = false
  cleaningOrphans.value = true
  try {
    const count = await cleanupOrphanedAccounts(props.pubId)
    showToast(count > 0 ? `已清理 ${count} 个空悬账号` : '没有需要清理的空悬账号')
    await loadAccounts()
  } catch (error) {
    showToast(getUserErrorMessage(error, '清理空悬账号失败'), 'error')
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
    showToast(`${person.personName} 的账号记录已删除`)
    await loadAccounts()
  } catch (error) {
    showToast(getUserErrorMessage(error, '删除账号失败'), 'error')
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
      <PoeticHeader eyebrow="族谱管理" title="族人账号">
        <template #extra>
          <button class="btn" :disabled="cleaningOrphans" @click="showCleanupConfirm = true">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
            {{ cleaningOrphans ? '清理中...' : '清理空悬' }}
          </button>
          <button class="btn btn--primary" :disabled="deriving" @click="handleDerive">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
            {{ deriving ? '派生中...' : '派生账号' }}
          </button>
        </template>
      </PoeticHeader>

      <!-- Derived Result -->
      <transition name="glass-pop">
        <div v-if="showDerivedResult && derivedResult.length > 0" class="bento-card derived-result">
          <div class="form-header">
            <h3>已派生 {{ derivedResult.length }} 个账号</h3>
            <div class="derived-actions">
              <button class="btn btn--sm" type="button" @click="exportDerivedAccounts">导出 Excel</button>
              <button class="icon-btn" type="button" @click="showDerivedResult = false">关闭</button>
            </div>
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
            <button class="btn btn--sm btn--danger" :disabled="batchDeleting" @click="showBatchDeleteConfirm = true">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
              删除所选
            </button>
            <button class="btn btn--sm" @click="selectedAccountIds = new Set()">取消</button>
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
              <button class="btn btn--sm btn--warning" @click="requestToggle(row, 'disable')">停用</button>
              <button class="btn btn--sm" @click="requestResetPassword(row)">重置密码</button>
              <button class="btn btn--sm btn--danger" @click="requestDelete(row)">删除</button>
            </template>
            <template v-else-if="!row.deceased && row.accountStatus === 'disabled'">
              <button class="btn btn--sm btn--success" @click="requestToggle(row, 'enable')">启用</button>
              <button class="btn btn--sm btn--danger" @click="requestDelete(row)">删除</button>
            </template>
            <template v-else-if="row.accountStatus === 'orphaned'">
              <button class="btn btn--sm btn--danger" @click="requestDelete(row)">删除记录</button>
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
        :modelValue="showCleanupConfirm"
        title="确认清理空悬账号"
        message="将删除无法关联族人记录的异常账号，此操作不可撤销。"
        confirmLabel="确认清理"
        cancelLabel="保留"
        tone="danger"
        @confirm="handleCleanupOrphans"
        @cancel="showCleanupConfirm = false"
        @update:model-value="(v: boolean) => { showCleanupConfirm = v }"
      />

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
        :modelValue="resetTarget !== null"
        :title="resetTarget ? `重置 ${resetTarget.personName} 的密码` : '确认重置密码'"
        message="重置后旧密码将立即失效，请确认已经准备好保存新密码。"
        confirmLabel="确认重置"
        tone="warning"
        @confirm="confirmResetPassword"
        @cancel="resetTarget = null"
        @update:model-value="(v: boolean) => { if (!v) resetTarget = null }"
      />

      <BaseDialog
        :visible="showResetResult"
        title="密码已重置"
        max-width="420px"
        @update:visible="(v: boolean) => { if (!v) { showResetResult = false; resetTarget = null } }"
      >
        <div class="reset-result">
          <span class="reset-result__label">新密码</span>
          <strong class="reset-result__password">{{ resetResult }}</strong>
          <p>请妥善保存，密码仅显示一次。</p>
        </div>
        <template #footer>
          <button class="btn btn--primary" type="button" @click="showResetResult = false; resetTarget = null">我已保存</button>
        </template>
      </BaseDialog>

      <!-- Delete Confirm Dialog -->
      <ConfirmDialog
        :modelValue="showBatchDeleteConfirm"
        title="确认批量删除账号"
        :message="`确定删除已选的 ${selectedAccountIds.size} 个账号记录？关联的登录账号和协作权限将一并清除，此操作不可撤销。`"
        :confirmLabel="`确认删除 ${selectedAccountIds.size} 个账号`"
        cancelLabel="保留"
        tone="danger"
        @confirm="handleBatchDelete"
        @cancel="showBatchDeleteConfirm = false"
        @update:model-value="(v: boolean) => { showBatchDeleteConfirm = v }"
      />

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

.bento-card,
.accounts-table {
  background: var(--color-panel-bg);
  border: 1px solid var(--color-card-stroke);
  border-radius: var(--radius-xl);
  box-shadow: var(--shadow-whisper);
}

.derived-result {
  padding: 24px;
}

.form-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.form-header h3 {
  margin: 0;
  font-family: var(--font-serif);
  font-size: var(--text-title-18);
  color: var(--color-neutral-9);
}

.derived-actions,
.actions-cell {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
}

.hint {
  margin: 12px 0 16px;
  font-size: var(--text-copy-14);
  color: var(--color-neutral-6);
}

.credentials-table {
  border: 1px solid var(--color-neutral-4);
  border-radius: var(--radius-lg);
  overflow: hidden;
}

.cred-header,
.cred-row {
  display: grid;
  grid-template-columns: 1fr 1.2fr 1.2fr;
  gap: 12px;
  padding: 10px 14px;
}

.cred-header {
  background: var(--color-neutral-1);
  font-size: var(--text-label-12);
  color: var(--color-neutral-6);
}

.cred-row {
  border-top: 1px solid var(--color-neutral-3);
  font-size: var(--text-copy-14);
}

.accounts-table {
  overflow-x: auto;
}

.table-header,
.table-row {
  display: grid;
  grid-template-columns: 40px minmax(96px, 1fr) 64px 80px 96px minmax(130px, 1.2fr) minmax(220px, auto);
  gap: 12px;
  align-items: center;
  min-width: 860px;
}

.table-header {
  padding: 14px 20px;
  background: var(--color-neutral-1);
  border-bottom: 1px solid var(--color-neutral-4);
  font-size: var(--text-label-12);
  font-weight: 500;
  color: var(--color-neutral-6);
}

.table-row {
  padding: 14px 20px;
  border-bottom: 1px solid var(--color-neutral-3);
  font-size: var(--text-copy-14);
}

.table-row:last-child {
  border-bottom: none;
}

.table-row:hover {
  background: var(--color-neutral-1);
}

.table-row.is-selected {
  background: var(--color-accent-muted);
}

.table-row.is-deceased {
  opacity: 0.56;
}

.check-col input[type="checkbox"] {
  accent-color: var(--color-accent);
}

.name {
  font-weight: 500;
  color: var(--color-neutral-9);
}

.mono {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  font-family: ui-monospace, SFMono-Regular, Consolas, monospace;
}

.badge {
  display: inline-flex;
  align-items: center;
  padding: 4px 10px;
  border-radius: 999px;
  font-size: var(--text-label-12);
  white-space: nowrap;
}

.badge.active,
.badge.alive {
  background: rgba(60, 125, 91, 0.10);
  color: var(--color-success);
}

.badge.disabled,
.badge.none {
  background: var(--color-neutral-3);
  color: var(--color-neutral-7);
}

.badge.deceased {
  background: var(--color-neutral-2);
  color: var(--color-neutral-6);
}

.badge.orphaned {
  background: var(--color-warning-muted);
  color: var(--color-warning);
}

.muted {
  color: var(--color-neutral-5);
}

.icon-btn {
  border: none;
  background: transparent;
  color: var(--color-neutral-6);
  cursor: pointer;
}

.loading-state,
.empty-state {
  display: flex;
  justify-content: center;
  padding: 48px;
  color: var(--color-neutral-6);
}

.spinner {
  width: 32px;
  height: 32px;
  border: 3px solid var(--color-neutral-3);
  border-top-color: var(--color-accent);
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

.reset-result {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.reset-result__label {
  font-size: var(--text-label-12);
  color: var(--color-neutral-6);
}

.reset-result__password {
  padding: 12px 14px;
  border: 1px solid var(--color-neutral-4);
  border-radius: var(--radius-md);
  background: var(--color-neutral-1);
  font-family: ui-monospace, SFMono-Regular, Consolas, monospace;
  color: var(--color-neutral-10);
}

.reset-result p {
  margin: 0;
  font-size: var(--text-copy-14);
  color: var(--color-neutral-6);
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

@keyframes spin { to { transform: rotate(360deg); } }

</style>
