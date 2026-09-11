import { computed, ref } from 'vue'

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
} from '../../api/account'
import { getUserErrorMessage } from '../../api/http'
import { useToast } from '../../composables/useToast'

export interface UsePersonAccountsOptions {
  publicationId: number
  copyText: (text: string, message?: string) => void
}

function csvCell(value: string | number) {
  return `"${String(value).replace(/"/g, '""')}"`
}

export function canSelectAccount(person: PersonAccountRow) {
  return !person.deceased && !!person.accountStatus
}

export function usePersonAccounts(options: UsePersonAccountsOptions) {
  const { showToast } = useToast()

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
  const pendingDeletePerson = ref<PersonAccountRow | null>(null)
  const selectedAccountIds = ref<Set<number>>(new Set())
  const batchDeleting = ref(false)
  const cleaningOrphans = ref(false)

  const selectableAccounts = computed(() => accounts.value.filter(canSelectAccount))

  const isAllSelected = computed(() =>
    selectableAccounts.value.length > 0 && selectedAccountIds.value.size === selectableAccounts.value.length
  )

  async function loadAccounts() {
    accountsLoading.value = true
    accountsError.value = null
    try {
      accounts.value = await listAccounts(options.publicationId)
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
      derivedResult.value = await deriveAccounts(options.publicationId)
      showDerivedResult.value = true
      if (derivedResult.value.length > 0) {
        const copyAll = derivedResult.value
          .map(a => `${a.personName}: ${a.username} / ${a.password}`)
          .join('\n')
        options.copyText(copyAll, `已创建 ${derivedResult.value.length} 个账号，凭证已复制`)
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

  function exportDerivedAccounts() {
    if (derivedResult.value.length === 0) return
    const rows = [
      ['姓名', '用户名', '初始密码'],
      ...derivedResult.value.map(account => [account.personName, account.username, account.password]),
    ]
    const csv = `\uFEFF${rows.map(row => row.map(csvCell).join(',')).join('\r\n')}`
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }))
    const link = document.createElement('a')
    link.href = url
    link.download = `派生账号-${options.publicationId}.csv`
    link.click()
    URL.revokeObjectURL(url)
    showToast('已导出账号表')
  }

  async function handleToggleAccount(person: PersonAccountRow) {
    accountsError.value = null
    try {
      if (person.accountStatus === 'active') {
        await disableAccount(options.publicationId, person.personDbId)
        showToast(`${person.personName} 账号已停用`)
      } else {
        await enableAccount(options.publicationId, person.personDbId)
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
      const pwd = await resetAccountPassword(options.publicationId, person.personDbId)
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
      const count = await batchDeleteAccounts(options.publicationId, ids)
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
      await deleteAccount(options.publicationId, person.personDbId)
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

  async function handleCleanupOrphans() {
    cleaningOrphans.value = true
    accountsError.value = null
    try {
      const count = await cleanupOrphanedAccounts(options.publicationId)
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

  return {
    accounts,
    accountsLoading,
    derivingAccounts,
    accountsError,
    aliveAccounts,
    derivedResult,
    showDerivedResult,
    pendingResetPerson,
    resetPasswordResult,
    showResetDialog,
    resetPersonName,
    pendingDeletePerson,
    selectedAccountIds,
    batchDeleting,
    cleaningOrphans,
    selectableAccounts,
    isAllSelected,
    loadAccounts,
    handleDeriveAccounts,
    exportDerivedAccounts,
    handleToggleAccount,
    requestResetPassword,
    confirmResetPassword,
    toggleSelectAll,
    toggleSelectAccount,
    handleBatchDelete,
    handleDeleteAccount,
    confirmDeleteAccount,
    cancelDeleteAccount,
    handleCleanupOrphans,
  }
}
