<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue'
import ConfirmDialog from './ConfirmDialog.vue'
import CollaboratorInvitePanel from './CollaboratorInvitePanel.vue'
import CollaboratorList from './CollaboratorList.vue'
import PersonAccountsManager from './PersonAccountsManager.vue'
import { useCollaborators } from '../features/collaboration/useCollaborators'

const props = defineProps<{
  publicationId: number
}>()

const {
  records,
  loading,
  error,
  searchQuery,
  searchResults,
  selectedUser,
  newRole,
  searching,
  adding,
  pendingRemovalUserId,
  pendingRoleChange,
  load,
  handleSearchInput,
  selectUser,
  clearSelectedUser,
  handleAdd,
  requestInlineRoleChange,
  confirmRoleChange,
  cancelRoleChange,
  handleProfileChange,
  handleRemove,
  confirmRemove,
  cancelRemove,
  dispose,
} = useCollaborators(props.publicationId)

onMounted(() => {
  load()
})

onUnmounted(() => {
  dispose()
})
</script>

<template>
  <div class="collab-manager">
    <!-- Error strip -->
    <Transition name="slide">
      <div v-if="error" class="error-strip">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>
        <span>{{ error }}</span>
        <button class="error-dismiss" @click="error = null">&times;</button>
      </div>
    </Transition>

    <CollaboratorInvitePanel
      v-model:searchQuery="searchQuery"
      v-model:newRole="newRole"
      :searchResults="searchResults"
      :selectedUser="selectedUser"
      :searching="searching"
      :adding="adding"
      @search-input="handleSearchInput"
      @select-user="selectUser"
      @clear-selected-user="clearSelectedUser"
      @close-results="searchResults = []"
      @add="handleAdd"
    />

    <CollaboratorList
      :records="records"
      :loading="loading"
      @role-change="requestInlineRoleChange"
      @profile-change="handleProfileChange"
      @remove="handleRemove"
    />

    <PersonAccountsManager :publicationId="publicationId" />

    <!-- Confirm remove dialog -->
    <ConfirmDialog
      :modelValue="pendingRemovalUserId !== null"
      :title="pendingRemovalUserId ? `移除 ${pendingRemovalUserId.name}` : ''"
      :message="`确定将 ${pendingRemovalUserId?.name ?? ''} 从协作者中移除？此操作不会删除该用户的平台账号。`"
      confirmLabel="确认移除"
      tone="danger"
      @confirm="confirmRemove"
      @cancel="cancelRemove"
      @update:model-value="(v: boolean) => { if (!v) cancelRemove() }"
    />

    <!-- Confirm role change dialog -->
    <ConfirmDialog
      :modelValue="pendingRoleChange !== null"
      :title="pendingRoleChange ? `调整 ${pendingRoleChange.name} 的权限` : ''"
      :message="pendingRoleChange ? `确定将 ${pendingRoleChange.name} 的角色变更为「${pendingRoleChange.role === 'EDITOR' ? '编辑者' : '浏览者'}」？编辑者可修改族谱，浏览者仅可查看。` : ''"
      confirmLabel="确认调整"
      tone="warning"
      @confirm="confirmRoleChange"
      @cancel="cancelRoleChange"
      @update:model-value="(v: boolean) => { if (!v) cancelRoleChange() }"
    />
  </div>
</template>

<style scoped>
.collab-manager {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.slide-enter-active,
.slide-leave-active {
  transition: all 0.25s ease;
  overflow: hidden;
}

.slide-enter-from,
.slide-leave-to {
  opacity: 0;
  max-height: 0;
  margin-bottom: 0;
}

.slide-enter-to,
.slide-leave-from {
  opacity: 1;
  max-height: 200px;
}

.error-strip {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
  border: 1px solid var(--color-error-muted);
  border-radius: var(--radius-md);
  background: var(--color-error-muted);
  color: var(--color-error);
  font-size: 13px;
}

.error-strip span {
  flex: 1;
}

.error-dismiss {
  width: 22px;
  height: 22px;
  border: none;
  border-radius: 50%;
  background: transparent;
  color: currentColor;
  cursor: pointer;
  font-size: 16px;
  line-height: 1;
}

.error-dismiss:hover {
  background: rgba(0, 0, 0, 0.08);
}
</style>
