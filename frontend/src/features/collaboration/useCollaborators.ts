import { ref } from 'vue'

import {
  addAccessRecord,
  listAccessRecords,
  removeAccessRecord,
  searchUsers,
  updateAccessRole,
  type AccessRecord,
  type UserSearchResult,
} from '../../api/accessManage'
import { getUserErrorMessage } from '../../api/http'
import { useToast } from '../../composables/useToast'

export type CollaboratorRole = 'EDITOR' | 'VIEWER'

export interface PendingCollaboratorRemoval {
  userId: number
  name: string
}

export interface PendingCollaboratorRoleChange {
  userId: number
  role: CollaboratorRole
  name: string
}

export const DEFAULT_REDACTION_PROFILE = {
  dates: 'LIVING',
  note: 'LIVING',
  photo: 'LIVING',
}

export function parseRedactionProfile(profileStr?: string) {
  try {
    return profileStr ? JSON.parse(profileStr) : { ...DEFAULT_REDACTION_PROFILE }
  } catch {
    return { ...DEFAULT_REDACTION_PROFILE }
  }
}

export function useCollaborators(publicationId: number) {
  const { showToast } = useToast()

  const records = ref<AccessRecord[]>([])
  const loading = ref(true)
  const error = ref<string | null>(null)

  const searchQuery = ref('')
  const searchResults = ref<UserSearchResult[]>([])
  const selectedUser = ref<UserSearchResult | null>(null)
  const newRole = ref<CollaboratorRole>('EDITOR')
  const searching = ref(false)
  const adding = ref(false)
  const pendingRemovalUserId = ref<PendingCollaboratorRemoval | null>(null)
  const pendingRoleChange = ref<PendingCollaboratorRoleChange | null>(null)

  let searchAbortController: AbortController | null = null
  let searchTimeout: ReturnType<typeof setTimeout> | null = null

  async function load(silent = false) {
    if (!silent) loading.value = true
    error.value = null
    try {
      records.value = await listAccessRecords(publicationId)
    } catch (err: unknown) {
      error.value = getUserErrorMessage(err, '加载协作者失败')
      showToast(error.value, 'error')
    } finally {
      if (!silent) loading.value = false
    }
  }

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

  async function handleAdd() {
    if (!selectedUser.value) return
    adding.value = true
    error.value = null
    try {
      const profile = newRole.value === 'VIEWER' ? JSON.stringify(DEFAULT_REDACTION_PROFILE) : undefined
      await addAccessRecord(publicationId, selectedUser.value.id, newRole.value, profile)
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

  function requestInlineRoleChange(record: AccessRecord, role: CollaboratorRole) {
    pendingRoleChange.value = { userId: record.userId, role, name: record.nickname }
  }

  async function confirmRoleChange() {
    const pending = pendingRoleChange.value
    if (!pending) return
    error.value = null
    try {
      const profile = pending.role === 'VIEWER' ? JSON.stringify(DEFAULT_REDACTION_PROFILE) : undefined
      await updateAccessRole(publicationId, pending.userId, pending.role, profile)
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
      const profile = parseRedactionProfile(record.redactionProfile)
      profile[field] = value
      await updateAccessRole(publicationId, record.userId, record.role, JSON.stringify(profile))
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
      await removeAccessRecord(publicationId, pending.userId)
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

  function dispose() {
    if (searchTimeout) clearTimeout(searchTimeout)
    if (searchAbortController) searchAbortController.abort()
  }

  return {
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
  }
}
