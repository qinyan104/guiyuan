<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import ConfirmDialog from './ConfirmDialog.vue'
import CollaboratorInvitePanel from './CollaboratorInvitePanel.vue'
import CollaboratorList from './CollaboratorList.vue'
import PersonAccountsManager from './PersonAccountsManager.vue'
import { getUserErrorMessage } from '../api/http'
import {
  searchUsers,
  listAccessRecords,
  addAccessRecord,
  updateAccessRole,
  removeAccessRecord,
  type UserSearchResult,
  type AccessRecord
} from '../api/accessManage'
import { useToast } from '../composables/useToast'

const props = defineProps<{
  publicationId: number
}>()

const { showToast } = useToast()

const records = ref<AccessRecord[]>([])
const loading = ref(true)
const error = ref<string | null>(null)

const searchQuery = ref('')
const searchResults = ref<UserSearchResult[]>([])
const selectedUser = ref<UserSearchResult | null>(null)
const newRole = ref<'EDITOR' | 'VIEWER'>('EDITOR')
const searching = ref(false)
const adding = ref(false)
const pendingRemovalUserId = ref<{ userId: number; name: string } | null>(null)
const pendingRoleChange = ref<{ userId: number; role: 'EDITOR' | 'VIEWER'; name: string } | null>(null)

let searchAbortController: AbortController | null = null

// --- Access records ---
async function load(silent = false) {
  if (!silent) loading.value = true
  error.value = null
  try {
    records.value = await listAccessRecords(props.publicationId)
  } catch (err: unknown) {
    error.value = getUserErrorMessage(err, '加载协作者失败')
    showToast(error.value, 'error')
  } finally {
    if (!silent) loading.value = false
  }
}

let searchTimeout: ReturnType<typeof setTimeout> | null = null
function handleSearchInput() {
  if (searchTimeout) clearTimeout(searchTimeout)
  if (searchAbortController) {
    searchAbortController.abort()
    searchAbortController = null
  }

  if (!searchQuery.value.trim()) {
    searchResults.value = []
    selectedUser.value = null
    return
  }

  searchTimeout = setTimeout(async () => {
    searching.value = true
    searchAbortController = new AbortController()
    try {
      const results = await searchUsers(searchQuery.value, searchAbortController.signal)
      const existingUserIds = new Set(records.value.map(r => r.userId))
      searchResults.value = results.filter(u => !existingUserIds.has(u.id))
    } catch (err: unknown) {
      const errorName = err instanceof Error ? err.name : ''
      if (errorName === 'CanceledError' || errorName === 'AbortError') return
    } finally {
      searching.value = false
    }
  }, 300)
}

function selectUser(user: UserSearchResult) {
  selectedUser.value = user
  searchQuery.value = ''
  searchResults.value = []
}

function clearSelectedUser() {
  selectedUser.value = null
  searchQuery.value = ''
  searchResults.value = []
}

const DEFAULT_PROFILE = {
  dates: 'LIVING',
  note: 'LIVING',
  photo: 'LIVING'
}

function parseProfile(profileStr?: string) {
  try {
    return profileStr ? JSON.parse(profileStr) : { ...DEFAULT_PROFILE }
  } catch {
    return { ...DEFAULT_PROFILE }
  }
}

async function handleAdd() {
  if (!selectedUser.value) return
  adding.value = true
  error.value = null
  try {
    const profile = newRole.value === 'VIEWER' ? JSON.stringify(DEFAULT_PROFILE) : undefined
    await addAccessRecord(props.publicationId, selectedUser.value.id, newRole.value, profile)
    showToast(`已添加 ${selectedUser.value.nickname} 为${newRole.value === 'EDITOR' ? '编辑者' : '浏览者'}`)
    clearSelectedUser()
    await load(true)
  } catch (err: unknown) {
    error.value = getUserErrorMessage(err, '添加失败')
    showToast(error.value, 'error')
  } finally {
    adding.value = false
  }
}

function requestInlineRoleChange(record: AccessRecord, role: 'EDITOR' | 'VIEWER') {
  pendingRoleChange.value = { userId: record.userId, role, name: record.nickname }
}

async function confirmRoleChange() {
  const pending = pendingRoleChange.value
  if (!pending) return
  error.value = null
  try {
    const profile = pending.role === 'VIEWER' ? JSON.stringify(DEFAULT_PROFILE) : undefined
    await updateAccessRole(props.publicationId, pending.userId, pending.role, profile)
    showToast(`已调整 ${pending.name} 的权限`)
    await load(true)
  } catch (err: unknown) {
    error.value = getUserErrorMessage(err, '权限修改失败')
    showToast(error.value, 'error')
    await load(true)
  } finally {
    pendingRoleChange.value = null
  }
}

function cancelRoleChange() {
  pendingRoleChange.value = null
}

async function handleProfileChange(record: AccessRecord, field: string, value: string) {
  error.value = null
  try {
    const profile = parseProfile(record.redactionProfile)
    profile[field] = value
    await updateAccessRole(props.publicationId, record.userId, record.role, JSON.stringify(profile))
    showToast('隐私脱敏设置已更新')
    await load(true)
  } catch (err: unknown) {
    error.value = getUserErrorMessage(err, '修改隐私设置失败')
    showToast(error.value, 'error')
    await load(true)
  }
}

function handleRemove(record: AccessRecord) {
  pendingRemovalUserId.value = { userId: record.userId, name: record.nickname }
}

async function confirmRemove() {
  const pending = pendingRemovalUserId.value
  if (!pending) return
  error.value = null
  try {
    await removeAccessRecord(props.publicationId, pending.userId)
    showToast(`已移除 ${pending.name}`)
    await load(true)
  } catch (err: unknown) {
    error.value = getUserErrorMessage(err, '移除失败')
    showToast(error.value, 'error')
  } finally {
    pendingRemovalUserId.value = null
  }
}

function cancelRemove() {
  pendingRemovalUserId.value = null
}

onMounted(() => {
  load()
})

onUnmounted(() => {
  if (searchTimeout) clearTimeout(searchTimeout)
  if (searchAbortController) searchAbortController.abort()
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
