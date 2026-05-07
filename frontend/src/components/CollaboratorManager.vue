<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import {
  searchUsers,
  listAccessRecords,
  addAccessRecord,
  updateAccessRole,
  removeAccessRecord,
  type UserSearchResult,
  type AccessRecord
} from '../api/accessManage'

const props = defineProps<{
  publicationId: number
}>()

const records = ref<AccessRecord[]>([])
const loading = ref(true)
const error = ref<string | null>(null)

const searchContainer = ref<HTMLElement | null>(null)
const searchQuery = ref('')
const searchResults = ref<UserSearchResult[]>([])
const selectedUserId = ref<number | null>(null)
const newRole = ref<'EDITOR' | 'VIEWER'>('EDITOR')
const searching = ref(false)
const adding = ref(false)

let searchAbortController: AbortController | null = null

async function load(silent = false) {
  if (!silent) loading.value = true
  error.value = null
  try {
    records.value = await listAccessRecords(props.publicationId)
  } catch (err: any) {
    error.value = err.message || '加载协作者失败'
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
    selectedUserId.value = null
    return
  }

  searchTimeout = setTimeout(async () => {
    searching.value = true
    searchAbortController = new AbortController()
    try {
      const results = await searchUsers(searchQuery.value, searchAbortController.signal)
      // Filter out existing users
      const existingUserIds = new Set(records.value.map(r => r.userId))
      searchResults.value = results.filter(u => !existingUserIds.has(u.id))
      if (searchResults.value.length > 0 && !searchResults.value.find(u => u.id === selectedUserId.value)) {
        selectedUserId.value = searchResults.value[0].id
      }
    } catch (err: any) {
      if (err.name === 'CanceledError' || err.name === 'AbortError') return
      console.error('Search failed', err)
    } finally {
      searching.value = false
    }
  }, 300)
}

function selectUser(user: UserSearchResult) {
  selectedUserId.value = user.id
  searchQuery.value = `${user.nickname} (@${user.username})`
  searchResults.value = []
}

const handleClickOutside = (event: MouseEvent) => {
  if (searchContainer.value && !searchContainer.value.contains(event.target as Node)) {
    searchResults.value = []
  }
}

async function handleAdd() {
  if (!selectedUserId.value) return
  adding.value = true
  error.value = null
  try {
    await addAccessRecord(props.publicationId, selectedUserId.value, newRole.value)
    searchQuery.value = ''
    selectedUserId.value = null
    searchResults.value = []
    await load(true)
  } catch (err: any) {
    error.value = err.message || '添加失败'
  } finally {
    adding.value = false
  }
}

async function handleRoleChange(userId: number, role: 'EDITOR' | 'VIEWER') {
  error.value = null
  try {
    await updateAccessRole(props.publicationId, userId, role)
    await load(true)
  } catch (err: any) {
    error.value = err.message || '修改失败'
    await load(true) // reset
  }
}

async function handleRemove(userId: number) {
  if (!confirm('确定要移除该协作者吗？')) return
  error.value = null
  try {
    await removeAccessRecord(props.publicationId, userId)
    await load(true)
  } catch (err: any) {
    error.value = err.message || '移除失败'
  }
}

onMounted(() => {
  load()
  window.addEventListener('click', handleClickOutside)
})

onUnmounted(() => {
  window.removeEventListener('click', handleClickOutside)
  if (searchTimeout) clearTimeout(searchTimeout)
  if (searchAbortController) searchAbortController.abort()
})
</script>

<template>
  <div class="collab-manager">
    <div v-if="error" class="error-strip">
      <span class="icon">⚠️</span>
      <span class="msg">{{ error }}</span>
    </div>

    <div class="invite-section">
      <div class="search-container" ref="searchContainer">
        <div class="search-box" :class="{ 'is-searching': searching }">
          <input 
            type="text" 
            class="form-input" 
            placeholder="输入用户名或昵称搜索..." 
            v-model="searchQuery" 
            @input="handleSearchInput" 
          />
          <div v-if="searching" class="search-spinner"></div>
          
          <div v-if="searchResults.length > 0" class="search-dropdown">
            <div 
              v-for="u in searchResults" 
              :key="u.id" 
              class="search-item" 
              @click="selectUser(u)"
            >
              <div class="avatar">{{ u.nickname.charAt(0).toUpperCase() }}</div>
              <div class="user-details">
                <div class="name">{{ u.nickname }}</div>
                <div class="username">@{{ u.username }}</div>
              </div>
            </div>
          </div>
        </div>
        
        <div class="invite-actions">
          <select v-model="newRole" class="form-select">
            <option value="EDITOR">编辑者 (可修改)</option>
            <option value="VIEWER">浏览者 (仅查看)</option>
          </select>
          <button class="btn btn--primary pill" @click="handleAdd" :disabled="!selectedUserId || adding">
            {{ adding ? '添加中...' : '添加' }}
          </button>
        </div>
      </div>
    </div>

    <div class="list-section">
      <h4 class="section-title">当前协作者 ({{ records.length }})</h4>
      <div v-if="loading" class="loading-state">
        <div class="spinner"></div>
        <span>正在加载协作者...</span>
      </div>
      <div v-else class="user-list">
        <div v-for="record in records" :key="record.id" class="user-row" :class="{ 'is-owner': record.role === 'OWNER' }">
          <div class="user-info">
            <div class="avatar" :class="record.role.toLowerCase()">
              {{ record.nickname.charAt(0).toUpperCase() }}
            </div>
            <div class="user-details">
              <div class="name">{{ record.nickname }}</div>
              <div class="username">@{{ record.username }}</div>
            </div>
          </div>
          <div class="user-actions">
            <template v-if="record.role === 'OWNER'">
              <span class="role-badge owner">所有者</span>
            </template>
            <template v-else>
              <select 
                class="form-select inline" 
                :value="record.role" 
                @change="e => handleRoleChange(record.userId, (e.target as HTMLSelectElement).value as any)"
              >
                <option value="EDITOR">编辑者</option>
                <option value="VIEWER">浏览者</option>
              </select>
              <button class="btn btn--ghost icon-btn remove-btn" @click="handleRemove(record.userId)" title="移除协作者">
                &times;
              </button>
            </template>
          </div>
        </div>
        
        <div v-if="records.length === 0" class="empty-state">
          暂无协作者，开始邀请他人共同编辑吧。
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.collab-manager {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.error-strip {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 14px;
  background: var(--feedback-error-bg);
  border: 1px solid var(--feedback-error-border);
  border-radius: 12px;
  color: var(--feedback-error-color);
  font-size: 13px;
  animation: slideDown 0.3s ease;
}

@keyframes slideDown {
  from { opacity: 0; transform: translateY(-10px); }
  to { opacity: 1; transform: translateY(0); }
}

.invite-section {
  padding: 16px;
  background: var(--bg-panel, rgba(255, 250, 242, 0.4));
  border: 1px solid var(--line-soft);
  border-radius: 18px;
}

.search-container {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.search-box {
  position: relative;
  width: 100%;
}

.form-input {
  width: 100%;
  padding: 12px 16px;
  background: var(--bg-paper);
  border: 1px solid var(--line-soft);
  border-radius: 14px;
  font-size: 14px;
  outline: none;
  transition: all 0.2s ease;
}

.form-input:focus {
  border-color: var(--accent-amber);
  box-shadow: 0 0 0 3px rgba(169, 110, 53, 0.1);
}

.search-spinner {
  position: absolute;
  right: 12px;
  top: 12px;
  width: 18px;
  height: 18px;
  border: 2px solid var(--line-soft);
  border-top-color: var(--accent-amber);
  border-radius: 50%;
  animation: rotate 0.8s linear infinite;
}

@keyframes rotate {
  to { transform: rotate(360deg); }
}

.search-dropdown {
  position: absolute;
  top: calc(100% + 8px);
  left: 0;
  right: 0;
  background: var(--bg-panel-strong);
  border: 1px solid var(--line-soft);
  border-radius: 16px;
  box-shadow: 0 10px 25px rgba(0,0,0,0.1);
  z-index: 100;
  max-height: 240px;
  overflow-y: auto;
}

.search-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 14px;
  cursor: pointer;
  transition: background 0.2s ease;
}

.search-item:hover {
  background: var(--bg-paper);
}

.search-item:not(:last-child) {
  border-bottom: 1px solid var(--line-soft);
}

.avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: var(--accent-amber);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: 16px;
  flex-shrink: 0;
}

.avatar.owner { background: var(--accent-ink); }
.avatar.editor { background: var(--accent-amber); }
.avatar.viewer { background: var(--accent-olive); }

.user-details {
  display: flex;
  flex-direction: column;
}

.name {
  font-weight: 600;
  color: var(--text-main);
  font-size: 14px;
}

.username {
  color: var(--text-soft);
  font-size: 12px;
}

.invite-actions {
  display: flex;
  gap: 10px;
}

.form-select {
  flex: 1;
  padding: 10px 14px;
  background: var(--bg-paper);
  border: 1px solid var(--line-soft);
  border-radius: 12px;
  font-size: 14px;
  outline: none;
}

.list-section {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.section-title {
  margin: 0;
  font-size: 14px;
  color: var(--text-soft);
  text-transform: uppercase;
  letter-spacing: 0.1em;
  font-weight: 700;
}

.user-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.user-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 14px;
  background: var(--bg-panel-strong);
  border: 1px solid var(--line-soft);
  border-radius: 16px;
  transition: all 0.2s ease;
}

.user-row:hover {
  transform: translateX(4px);
  border-color: var(--accent-amber);
}

.user-info {
  display: flex;
  align-items: center;
  gap: 12px;
}

.user-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.role-badge {
  padding: 4px 12px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 700;
}

.role-badge.owner {
  background: rgba(60, 83, 99, 0.1);
  color: var(--accent-ink);
}

.form-select.inline {
  width: auto;
  padding: 4px 8px;
  font-size: 12px;
}

.icon-btn {
  width: 28px;
  height: 28px;
  min-width: 0;
  padding: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  color: var(--text-soft);
}

.remove-btn:hover {
  color: var(--danger-title);
  background: var(--danger-bg);
  border-color: var(--danger-border);
}

.loading-state, .empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  padding: 30px;
  color: var(--text-soft);
  font-style: italic;
  text-align: center;
}

.spinner {
  width: 24px;
  height: 24px;
  border: 3px solid var(--line-soft);
  border-top-color: var(--accent-amber);
  border-radius: 50%;
  animation: rotate 0.8s linear infinite;
}
</style>
