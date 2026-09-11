<script setup lang="ts">
import { onMounted } from 'vue'

import { useToast } from '../composables/useToast'
import { usePersonAccounts } from '../features/accounts/usePersonAccounts'
import AccountDialogs from './AccountDialogs.vue'
import AccountStatusState from './AccountStatusState.vue'
import AccountTable from './AccountTable.vue'
import DerivedAccountsResult from './DerivedAccountsResult.vue'
import PersonAccountsHeader from './PersonAccountsHeader.vue'

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

const {
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
} = usePersonAccounts({
  publicationId: props.publicationId,
  copyText,
})

onMounted(() => {
  loadAccounts()
})
</script>

<template>
  <div class="person-accounts-manager">
    <!-- 族人账号 -->
    <section class="list-section accounts-section">
      <PersonAccountsHeader
        :totalAccounts="accounts.length"
        :aliveAccounts="aliveAccounts"
        :loading="accountsLoading"
        :deriving="derivingAccounts"
        :cleaningOrphans="cleaningOrphans"
        :error="accountsError"
        @derive="handleDeriveAccounts"
        @cleanup-orphans="handleCleanupOrphans"
        @dismiss-error="accountsError = null"
      />

      <DerivedAccountsResult
        :show="showDerivedResult"
        :deriving="derivingAccounts"
        :accounts="derivedResult"
        @export="exportDerivedAccounts"
        @dismiss="showDerivedResult = false"
        @copy="copyText"
      />

      <AccountStatusState :loading="accountsLoading" :hasError="accountsError !== null" :isEmpty="accounts.length === 0" />

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
.person-accounts-manager {
  display: flex;
  flex-direction: column;
}

.list-section {
  background: var(--color-panel-bg);
  border: 1px solid var(--color-card-stroke);
  border-radius: var(--radius-xl);
  padding: 24px;
  box-shadow: var(--shadow-whisper);
}

.accounts-section {
  display: flex;
  flex-direction: column;
}
</style>
