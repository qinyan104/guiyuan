<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'

import {
  batchDeleteAccounts,
  cleanupOrphanedAccounts,
  deleteAccount,
  deriveAccounts,
  disableAccount,
  enableAccount,
  listAccounts,
  resetAccountPassword,
  type DerivedAccount,
  type PersonAccountRow,
} from '../api/account'
import { getUserErrorMessage } from '../api/http'
import { useToast } from '../composables/useToast'
import AccountDialogs from './AccountDialogs.vue'
import AccountTable from './AccountTable.vue'
import DerivedAccountsResult from './DerivedAccountsResult.vue'

const props = defineProps<{
  publicationId: number
}>()

const { showToast } = useToast()

function copyText(text: string, message = '已复制到剪贴板') {
  navigator.clipboard.writeText(text).then(
    () => showToast(message),
    () => {
      const el = document.createElement('textarea')
      el.value = text
      document.body.appendChild(el)
      el.select()
      document.execCommand('copy')
      document.body.removeChild(el)
      showToast(message)
    },
  )
}

// 账号派生
const accounts = ref<PersonAccountRow[]>([])
const accountsLoading = ref(false)
const derivingAccounts = ref(false)
const accountsError = ref<string | null>(null)
const aliveAccounts = ref(0)
const derivedResult = ref<DerivedAccount[]>([])
const showDerivedResult = ref(false)
const pendingResetPerson = ref<PersonAccountRow | null>(null)
const resetPasswordResult = ref<string | null>(null)
const showResetDialog = ref(false)
const resetPersonName = ref('')

// --- Account management ---
async function loadAccounts() {
  accountsLoading.value = true
  accountsError.value = null
  try {
    accounts.value = await listAccounts(props.publicationId)
    aliveAccounts.value = accounts.value.filter(p => !p.deceased).length
    const selectableIds = new Set(accounts.value.filter(canSelectAccount).map(p => p.personDbId))
    selectedAccountIds.value = new Set([...selectedAccountIds.value].filter(id => selectableIds.has(id)))
  } catch (err: unknown) {
    accounts.value = []
    accountsError.value = getUserErrorMessage(err, '加载族人账号失败')
    showToast(accountsError.value, 'error')
  } finally {
    accountsLoading.value = false
  }
}

async function handleDeriveAccounts() {
  derivingAccounts.value = true
  accountsError.value = null
  try {
    derivedResult.value = await deriveAccounts(props.publicationId)
    showDerivedResult.value = true
    if (derivedResult.value.length > 0) {
      const copyAll = derivedResult.value
        .map(a => `${a.personName}: ${a.username} / ${a.password}`)
        .join('\n')
      copyText(copyAll, `已创建 ${derivedResult.value.length} 个账号，凭证已复制`)
    } else {
      showToast('没有需要派生的账号')
    }
    await loadAccounts()
  } catch (err: unknown) {
    accountsError.value = getUserErrorMessage(err, '派生账号失败')
    showToast(accountsError.value, 'error')
  } finally {
    derivingAccounts.value = false
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
  link.download = `派生账号-${props.publicationId}.csv`
  link.click()
  URL.revokeObjectURL(url)
  showToast('已导出账号表')
}

async function handleToggleAccount(person: PersonAccountRow) {
  accountsError.value = null
  try {
    if (person.accountStatus === 'active') {
      await disableAccount(props.publicationId, person.personDbId)
      showToast(`${person.personName} 账号已停用`)
    } else {
      await enableAccount(props.publicationId, person.personDbId)
      showToast(`${person.personName} 账号已启用`)
    }
    await loadAccounts()
  } catch (err: unknown) {
    accountsError.value = getUserErrorMessage(err, '操作失败')
    showToast(accountsError.value, 'error')
  }
}

async function handleResetPassword(person: PersonAccountRow) {
  accountsError.value = null
  try {
    const pwd = await resetAccountPassword(props.publicationId, person.personDbId)
    resetPasswordResult.value = pwd
    resetPersonName.value = person.personName
    showResetDialog.value = true
    showToast('密码已重置，请保存新密码')
  } catch (err: unknown) {
    accountsError.value = getUserErrorMessage(err, '重置失败')
    showToast(accountsError.value, 'error')
  }
}

function requestResetPassword(person: PersonAccountRow) {
  pendingResetPerson.value = person
}

async function confirmResetPassword() {
  const person = pendingResetPerson.value
  if (!person) return
  pendingResetPerson.value = null
  await handleResetPassword(person)
}

const pendingDeletePerson = ref<PersonAccountRow | null>(null)
const selectedAccountIds = ref<Set<number>>(new Set())
const batchDeleting = ref(false)

function canSelectAccount(person: PersonAccountRow) {
  return !person.deceased && !!person.accountStatus
}

const selectableAccounts = computed(() => accounts.value.filter(canSelectAccount))

const isAllSelected = computed(() =>
  selectableAccounts.value.length > 0 && selectedAccountIds.value.size === selectableAccounts.value.length
)

function toggleSelectAll() {
  if (isAllSelected.value) {
    selectedAccountIds.value = new Set()
  } else {
    selectedAccountIds.value = new Set(selectableAccounts.value.map(p => p.personDbId))
  }
}

function toggleSelectAccount(person: PersonAccountRow) {
  if (!canSelectAccount(person)) return
  const next = new Set(selectedAccountIds.value)
  if (next.has(person.personDbId)) {
    next.delete(person.personDbId)
  } else {
    next.add(person.personDbId)
  }
  selectedAccountIds.value = next
}

async function handleBatchDelete() {
  const ids = [...selectedAccountIds.value]
  if (ids.length === 0) return
  batchDeleting.value = true
  accountsError.value = null
  try {
    const count = await batchDeleteAccounts(props.publicationId, ids)
    showToast(`已批量删除 ${count} 个账号`)
    selectedAccountIds.value = new Set()
    await loadAccounts()
  } catch (err: unknown) {
    accountsError.value = getUserErrorMessage(err, '批量删除失败')
    showToast(accountsError.value, 'error')
  } finally {
    batchDeleting.value = false
  }
}

async function handleDeleteAccount(person: PersonAccountRow) {
  pendingDeletePerson.value = person
}

async function confirmDeleteAccount() {
  const person = pendingDeletePerson.value
  if (!person) return
  accountsError.value = null
  try {
    await deleteAccount(props.publicationId, person.personDbId)
    showToast(`${person.personName} 的账号记录已清除`)
    await loadAccounts()
  } catch (err: unknown) {
    accountsError.value = getUserErrorMessage(err, '删除失败')
    showToast(accountsError.value, 'error')
  } finally {
    pendingDeletePerson.value = null
  }
}

function cancelDeleteAccount() {
  pendingDeletePerson.value = null
}

const cleaningOrphans = ref(false)

onMounted(() => {
  loadAccounts()
})

async function handleCleanupOrphans() {
  cleaningOrphans.value = true
  accountsError.value = null
  try {
    const count = await cleanupOrphanedAccounts(props.publicationId)
    if (count > 0) {
      showToast(`已清理 ${count} 个空悬账号`)
    } else {
      showToast('没有需要清理的空悬账号')
    }
    await loadAccounts()
  } catch (err: unknown) {
    accountsError.value = getUserErrorMessage(err, '清理失败')
    showToast(accountsError.value, 'error')
  } finally {
    cleaningOrphans.value = false
  }
}

</script>

<template>
  <div class="person-accounts-manager">
    <!-- 族人账号 -->
    <section class="list-section accounts-section">
      <div class="section-header-row">
        <h4 class="section-title">族人账号</h4>
        <span v-if="accounts.length > 0" class="accounts-summary">{{ accounts.length }} 人 / <strong>{{ aliveAccounts }}</strong> 人在世</span>
      </div>
      <p class="section-desc">为在世族人创建登录账号，他们即可自行维护个人信息。</p>

      <Transition name="slide">
        <div v-if="accountsError" class="error-strip">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>
          <span>{{ accountsError }}</span>
          <button class="error-dismiss" @click="accountsError = null">&times;</button>
        </div>
      </Transition>

      <div class="derive-bar">
        <button class="btn btn--primary btn-derive" :disabled="accountsLoading || derivingAccounts" @click="handleDeriveAccounts">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" /><line x1="8.59" y1="13.51" x2="15.42" y2="17.49" /><line x1="15.41" y1="6.51" x2="8.59" y2="10.49" /></svg>
          {{ derivingAccounts ? '派生中...' : '派生账号' }}
        </button>
        <button class="btn btn--ghost btn-derive" :disabled="accountsLoading || cleaningOrphans" @click="handleCleanupOrphans">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></svg>
          {{ cleaningOrphans ? '清理中...' : '清理空悬账号' }}
        </button>
      </div>

      <DerivedAccountsResult
        :show="showDerivedResult"
        :deriving="derivingAccounts"
        :accounts="derivedResult"
        @export="exportDerivedAccounts"
        @dismiss="showDerivedResult = false"
        @copy="copyText"
      />

      <div v-if="accountsLoading" class="loading-state">
        <div class="spinner"></div>
        <span>加载账号列表...</span>
      </div>

      <AccountTable
        :accounts="accounts"
        :selectedIds="selectedAccountIds"
        :isAllSelected="isAllSelected"
        :selectableCount="selectableAccounts.length"
        :batchDeleting="batchDeleting"
        @toggle-all="toggleSelectAll"
        @toggle-account="toggleSelectAccount"
        @batch-delete="handleBatchDelete"
        @clear-selection="selectedAccountIds = new Set()"
        @reset-password="requestResetPassword"
        @toggle-status="handleToggleAccount"
        @delete-account="handleDeleteAccount"
      />

      <div v-if="!accountsLoading && !accountsError && accounts.length === 0" class="empty-state-sm">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" opacity="0.25"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
        <span>还没有账号，点击"派生账号"为在世族人创建。</span>
      </div>
    </section>

    <AccountDialogs
      :showResetDialog="showResetDialog"
      :resetPersonName="resetPersonName"
      :resetPasswordResult="resetPasswordResult"
      :pendingResetPerson="pendingResetPerson"
      :pendingDeletePerson="pendingDeletePerson"
      @update:show-reset-dialog="showResetDialog = $event"
      @copy-password="copyText(resetPasswordResult ?? '')"
      @confirm-reset="confirmResetPassword"
      @cancel-reset="pendingResetPerson = null"
      @confirm-delete="confirmDeleteAccount"
      @cancel-delete="cancelDeleteAccount"
    />
  </div>
</template>

<style scoped>
/* ── Layout ── */
.collab-manager {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

/* ── Transitions ── */
.slide-enter-active, .slide-leave-active { transition: all 0.25s ease; overflow: hidden; }
.slide-enter-from, .slide-leave-to { opacity: 0; max-height: 0; margin-bottom: 0; }
.slide-enter-to, .slide-leave-from { opacity: 1; max-height: 200px; }

.expand-enter-active, .expand-leave-active { transition: all 0.2s ease; overflow: hidden; }
.expand-enter-from, .expand-leave-to { opacity: 0; max-height: 0; padding-top: 0; padding-bottom: 0; }

.fade-enter-active, .fade-leave-active { transition: opacity 0.2s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; }

.dropdown-enter-active, .dropdown-leave-active { transition: all 0.15s ease; }
.dropdown-enter-from, .dropdown-leave-to { opacity: 0; transform: translateY(-4px); }


.invite-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}

.invite-title-row {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  font-weight: 500;
  color: var(--color-neutral-9);
}

/* ── Role cards ── */
.role-card {
  padding: 10px 12px;
  background: var(--color-neutral-1);
  border: 1px solid var(--color-neutral-4);
  border-radius: 10px;
  font-size: 12px;
  color: var(--color-neutral-6);
  line-height: 1.5;
}
.role-card p { margin: 4px 0 0; }

.role-card-header {
  display: flex;
  align-items: center;
  gap: 6px;
  color: var(--color-neutral-9);
  font-size: 13px;
}

.role-badge-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}
.role-badge-dot.editor { background: var(--color-accent); }
.role-badge-dot.viewer { background: var(--color-success); }
.role-card {
  padding: 10px 12px;
  background: var(--color-neutral-1);
  border: 1px solid var(--color-neutral-4);
  border-radius: 10px;
  font-size: 12px;
  color: var(--color-neutral-6);
  line-height: 1.5;
}
.role-card p { margin: 4px 0 0; }

.role-card-header {
  display: flex;
  align-items: center;
  gap: 6px;
  color: var(--color-neutral-9);
  font-size: 13px;
}

.role-badge-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}
.role-badge-dot.editor { background: var(--color-accent); }
.role-badge-dot.viewer { background: var(--color-success); }

/* ── Search results ── */
.search-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  cursor: pointer;
  transition: background 0.15s;
}
.search-item:hover { background: var(--color-neutral-1); }
.search-item:not(:last-child) { border-bottom: 1px solid var(--color-neutral-4); }

.search-item-avatar {
  width: 30px;
  height: 30px;
  border-radius: 50%;
  background: var(--color-accent);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 500;
  flex-shrink: 0;
}

.search-item-detail {
  display: flex;
  flex-direction: column;
}

.search-item-name {
  font-size: 13px;
  font-weight: 500;
  color: var(--color-neutral-9);
}

.search-item-username {
  font-size: 11px;
  color: var(--color-neutral-6);
}

.search-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  cursor: pointer;
  transition: background 0.15s;
}
.search-item:hover { background: var(--color-neutral-1); }
.search-item:not(:last-child) { border-bottom: 1px solid var(--color-neutral-4); }

.search-item-avatar {
  width: 30px;
  height: 30px;
  border-radius: 50%;
  background: var(--color-accent);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 500;
  flex-shrink: 0;
}

.search-item-detail {
  display: flex;
  flex-direction: column;
}

.search-item-name {
  font-size: 13px;
  font-weight: 500;
  color: var(--color-neutral-9);
}

.search-item-username {
  font-size: 11px;
  color: var(--color-neutral-6);
}


/* ── Sections ── */
.invite-section,
.list-section {
  background: var(--color-panel-bg);
  border: 1px solid var(--color-card-stroke);
  border-radius: var(--radius-xl);
  padding: 24px;
  box-shadow: var(--shadow-whisper);
}

.section-header-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
}

.section-title {
  font-family: var(--font-serif);
  font-size: var(--text-title-18);
  font-weight: 500;
  color: var(--color-neutral-10);
  margin: 0;
}

.section-desc {
  font-size: 13px;
  color: var(--color-neutral-6);
  margin: 0 0 16px;
}

.accounts-summary {
  font-size: 13px;
  color: var(--color-neutral-6);
}

.accounts-summary strong {
  color: var(--color-neutral-9);
}

/* ── Search area ── */
.search-area {
  position: relative;
}

.search-row {
  display: flex;
  align-items: center;
  gap: 10px;
}

.search-wrapper {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 14px;
  background: var(--color-neutral-1);
  border: 1px solid var(--color-neutral-4);
  border-radius: var(--radius-lg);
  transition: border-color 0.2s;
}

.search-wrapper:focus-within {
  border-color: var(--color-accent);
  box-shadow: 0 0 0 3px var(--color-accent-muted);
}

.search-wrapper.has-selected {
  border-color: var(--color-accent);
  background: var(--color-accent-muted);
}

.search-input {
  flex: 1;
  border: none;
  background: transparent;
  font-size: 14px;
  color: var(--color-neutral-9);
  outline: none;
}

.search-input::placeholder {
  color: var(--color-neutral-5);
}

.search-icon {
  color: var(--color-neutral-5);
  flex-shrink: 0;
}

.search-spinner-sm {
  width: 16px;
  height: 16px;
  border: 2px solid var(--color-neutral-3);
  border-top-color: var(--color-accent);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

/* ── Selected chip ── */
.selected-user-chip {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1;
}

.chip-avatar {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: var(--color-accent);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 500;
  flex-shrink: 0;
}

.chip-name {
  font-size: 14px;
  font-weight: 500;
  color: var(--color-neutral-9);
}

.chip-username {
  font-size: 12px;
  color: var(--color-neutral-6);
}

.chip-remove {
  margin-left: auto;
  width: 22px;
  height: 22px;
  border: none;
  background: var(--color-neutral-3);
  color: var(--color-neutral-7);
  border-radius: 50%;
  font-size: 14px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.15s;
}

.chip-remove:hover {
  background: var(--color-error);
  color: #fff;
}

/* ── Role select group ── */
.role-select-group {
  display: flex;
  align-items: center;
  gap: 8px;
}

/* ── Search dropdown ── */
.search-dropdown {
  position: absolute;
  top: calc(100% + 6px);
  left: 0;
  right: 0;
  z-index: 50;
  background: var(--color-panel-bg);
  border: 1px solid var(--color-card-stroke);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-whisper);
  overflow: hidden;
  max-height: 240px;
  overflow-y: auto;
}

/* ── Role guide toggle ── */
.role-guide-toggle {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 5px 12px;
  border: 1px solid var(--color-neutral-4);
  border-radius: 999px;
  background: var(--color-neutral-1);
  color: var(--color-neutral-6);
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s;
}

.role-guide-toggle:hover {
  border-color: var(--color-accent);
  color: var(--color-accent);
}

.role-guidance {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  margin-bottom: 16px;
}

/* ── User cards (collaborator list) ── */
.user-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.user-card {
  background: var(--color-neutral-1);
  border: 1px solid var(--color-neutral-4);
  border-radius: var(--radius-lg);
  padding: 14px 18px;
  transition: all 0.2s ease;
}

.user-card:hover {
  border-color: var(--color-neutral-5);
  box-shadow: 0 2px 8px rgba(0,0,0,0.04);
  transform: translateY(-1px);
}

.user-card-main {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.user-card-left {
  display: flex;
  align-items: center;
  gap: 14px;
  min-width: 0;
}

.user-avatar {
  width: 42px;
  height: 42px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  font-weight: 500;
  flex-shrink: 0;
  color: #fff;
}

.user-avatar.owner {
  background: var(--color-accent-gradient);
  box-shadow: 0 2px 8px rgba(196, 58, 49, 0.1);
}

.user-avatar.editor {
  background: linear-gradient(135deg, #3d6896, #2d5178);
  box-shadow: 0 2px 8px rgba(61, 104, 150, 0.1);
}

.user-avatar.viewer {
  background: linear-gradient(135deg, #787670, #5c5a55);
  box-shadow: var(--shadow-whisper);
}

.user-meta {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.user-name {
  font-size: 14px;
  font-weight: 500;
  color: var(--color-neutral-9);
}

.user-username {
  font-size: 12px;
  color: var(--color-neutral-6);
}

.user-card-right {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-shrink: 0;
}

.role-label {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 5px 12px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 500;
}

.owner-badge {
  background: rgba(196, 58, 49, 0.08);
  color: var(--color-accent);
}

/* ── Privacy section ── */
.privacy-section {
  margin-top: 14px;
  padding: 14px 16px;
  background: var(--color-neutral-1);
  border: 1px solid var(--color-neutral-4);
  border-radius: var(--radius-md);
}

.privacy-header {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  font-weight: 500;
  color: var(--color-neutral-7);
  margin-bottom: 12px;
}

.privacy-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
}

.privacy-field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.privacy-field > span {
  font-size: 11px;
  font-weight: 500;
  color: var(--color-neutral-6);
}

@media (max-width: 760px) {
  .account-table {
    border: none;
    background: transparent;
  }

  .account-table-head {
    display: none;
  }

  .account-table-row {
    grid-template-columns: 28px minmax(0, 1fr);
    grid-template-areas:
      "check name"
      "check gender"
      "check status"
      "actions actions";
    gap: 8px 10px;
    padding: 12px;
    margin-bottom: 8px;
    border: 1px solid var(--color-card-stroke);
    border-radius: var(--radius-md);
    background: var(--color-panel-bg);
  }

  .account-table-row:last-child {
    margin-bottom: 0;
    border-bottom: 1px solid var(--color-card-stroke);
  }

  .ac-check {
    grid-area: check;
    align-self: start;
    padding-top: 2px;
  }

  .ac-name {
    grid-area: name;
  }

  .ac-gender {
    grid-area: gender;
  }

  .ac-status {
    grid-area: status;
  }

  .ac-gender,
  .ac-status {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .ac-gender::before,
  .ac-status::before {
    content: attr(data-label);
    width: 56px;
    flex: 0 0 auto;
    font-size: 11px;
    color: var(--color-neutral-5);
  }

  .ac-actions {
    grid-area: actions;
    justify-content: flex-start;
    padding-top: 8px;
    border-top: 1px solid var(--color-neutral-3);
  }

  .action-sep {
    display: none;
  }

  .derive-result-header,
  .derive-row {
    align-items: flex-start;
    flex-direction: column;
  }

  .derive-result-actions {
    width: 100%;
    justify-content: space-between;
  }
}

/* ── Batch bar ── */

</style>
