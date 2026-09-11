<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import ConfirmDialog from './ConfirmDialog.vue'
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

const searchContainer = ref<HTMLElement | null>(null)
const searchQuery = ref('')
const searchResults = ref<UserSearchResult[]>([])
const selectedUser = ref<UserSearchResult | null>(null)
const newRole = ref<'EDITOR' | 'VIEWER'>('EDITOR')
const searching = ref(false)
const adding = ref(false)
const pendingRemovalUserId = ref<{ userId: number; name: string } | null>(null)
const pendingRoleChange = ref<{ userId: number; role: 'EDITOR' | 'VIEWER'; name: string } | null>(null)

const showRoleGuide = ref(false)
let searchAbortController: AbortController | null = null

function avatarLetter(name: string | undefined): string {
  return name && name.length > 0 ? name.charAt(0).toUpperCase() : '?'
}

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

const handleClickOutside = (event: MouseEvent) => {
  if (searchContainer.value && !searchContainer.value.contains(event.target as Node)) {
    searchResults.value = []
  }
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
    <!-- Error strip -->
    <Transition name="slide">
      <div v-if="error" class="error-strip">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>
        <span>{{ error }}</span>
        <button class="error-dismiss" @click="error = null">&times;</button>
      </div>
    </Transition>

    <!-- Invite section -->
    <section class="invite-section">
      <div class="invite-header">
        <div class="invite-title-row">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><line x1="19" y1="8" x2="19" y2="14" /><line x1="22" y1="11" x2="16" y2="11" /></svg>
          <span>邀请协作者</span>
        </div>
        <button class="role-guide-toggle" @click="showRoleGuide = !showRoleGuide">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="10" /><line x1="12" y1="16" x2="12" y2="12" /><line x1="12" y1="8" x2="12.01" y2="8" /></svg>
          权限说明
        </button>
      </div>

      <Transition name="slide">
        <div v-if="showRoleGuide" class="role-guidance">
          <div class="role-card role-editor">
            <div class="role-card-header">
              <span class="role-badge-dot editor"></span>
              <strong>编辑者</strong>
            </div>
            <p>可修改族谱内容，但不能删除所有者或执行高风险合并操作。</p>
          </div>
          <div class="role-card role-viewer">
            <div class="role-card-header">
              <span class="role-badge-dot viewer"></span>
              <strong>浏览者</strong>
            </div>
            <p>只能查看族谱，系统会自动对在世成员的生日、照片等敏感信息进行脱敏。</p>
          </div>
        </div>
      </Transition>

      <div ref="searchContainer" class="search-area">
        <div class="search-row">
          <div class="search-wrapper" :class="{ 'has-selected': selectedUser }">
            <template v-if="selectedUser">
              <div class="selected-user-chip">
                <span class="chip-avatar">{{ avatarLetter(selectedUser.nickname) }}</span>
                <span class="chip-name">{{ selectedUser.nickname }}</span>
                <span class="chip-username">@{{ selectedUser.username }}</span>
                <button class="chip-remove" title="取消选择" @click="clearSelectedUser">&times;</button>
              </div>
            </template>
            <template v-else>
              <svg class="search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
              <input
                v-model="searchQuery"
                type="text"
                class="search-input"
                placeholder="搜索用户名或昵称..."
                @input="handleSearchInput"
              />
              <div v-if="searching" class="search-spinner-sm"></div>
            </template>
          </div>

          <div class="role-select-group">
            <AppSelect v-model="newRole" variant="inline" :options="[{value:'EDITOR',label:'编辑者'},{value:'VIEWER',label:'浏览者'}]" />
            <button
              class="btn btn--primary btn--sm"
              :disabled="!selectedUser || adding"
              @click="handleAdd"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
              {{ adding ? '添加中' : '邀请' }}
            </button>
          </div>

          <!-- Search dropdown -->
          <Transition name="dropdown">
            <div v-if="searchResults.length > 0 && !selectedUser" class="search-dropdown">
              <div
                v-for="u in searchResults"
                :key="u.id"
                class="search-item"
                @click="selectUser(u)"
              >
                <span class="search-item-avatar">{{ avatarLetter(u.nickname) }}</span>
                <div class="search-item-detail">
                  <span class="search-item-name">{{ u.nickname }}</span>
                  <span class="search-item-username">@{{ u.username }}</span>
                </div>
              </div>
            </div>
          </Transition>
        </div>
      </div>
    </section>

    <!-- Collaborators list -->
    <section class="list-section">
      <div class="section-header-row">
        <h4 class="section-title">协作者 ({{ records.length }})</h4>
      </div>

      <div v-if="loading" class="loading-state">
        <div class="spinner"></div>
        <span>加载中...</span>
      </div>

      <div v-else-if="records.length === 0" class="empty-state">
        <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" opacity="0.3"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>
        <span>暂无协作者，在上方搜索并邀请他人。</span>
      </div>

      <div v-else class="user-list">
        <div v-for="record in records" :key="record.id" class="user-card">
          <div class="user-card-main">
            <div class="user-card-left">
              <span :class="['user-avatar', record.role.toLowerCase()]">
                {{ avatarLetter(record.nickname) }}
              </span>
              <div class="user-meta">
                <span class="user-name">{{ record.nickname }}</span>
                <span class="user-username">@{{ record.username }}</span>
              </div>
            </div>

            <div class="user-card-right">
              <template v-if="record.role === 'OWNER'">
                <span class="role-label owner-badge">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" stroke="none"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" /></svg>
                  所有者
                </span>
              </template>
              <template v-else>
                <AppSelect
                  variant="inline"
                  :modelValue="record.role"
                  :options="[{value:'EDITOR',label:'编辑者'},{value:'VIEWER',label:'浏览者'}]"
                  @change="(v: string) => requestInlineRoleChange(record, v as 'EDITOR' | 'VIEWER')"
                />
                <button
                  class="btn btn--text btn--danger"
                  title="移除协作者"
                  @click="handleRemove(record)"
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></svg>
                </button>
              </template>
            </div>
          </div>

          <!-- Privacy config for VIEWER -->
          <Transition name="expand">
            <div v-if="record.role === 'VIEWER'" class="privacy-section">
              <div class="privacy-header">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>
                隐私脱敏
              </div>
              <div class="privacy-grid">
                <label class="privacy-field">
                  <span>生卒日期</span>
                  <AppSelect
                    variant="privacy"
                    :modelValue="parseProfile(record.redactionProfile).dates"
                    :options="[{value:'NONE',label:'公开'},{value:'LIVING',label:'隐藏在世'},{value:'ALL',label:'全部隐藏'}]"
                    @change="(v: string) => handleProfileChange(record, 'dates', v)"
                  />
                </label>
                <label class="privacy-field">
                  <span>个人简介</span>
                  <AppSelect
                    variant="privacy"
                    :modelValue="parseProfile(record.redactionProfile).note"
                    :options="[{value:'NONE',label:'公开'},{value:'LIVING',label:'隐藏在世'},{value:'ALL',label:'全部隐藏'}]"
                    @change="(v: string) => handleProfileChange(record, 'note', v)"
                  />
                </label>
                <label class="privacy-field">
                  <span>照片</span>
                  <AppSelect
                    variant="privacy"
                    :modelValue="parseProfile(record.redactionProfile).photo"
                    :options="[{value:'NONE',label:'公开'},{value:'LIVING',label:'隐藏在世'},{value:'ALL',label:'全部隐藏'}]"
                    @change="(v: string) => handleProfileChange(record, 'photo', v)"
                  />
                </label>
              </div>
            </div>
          </Transition>
        </div>
      </div>
    </section>

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

.btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 18px;
  border-radius: var(--radius-md);
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s;
  border: 1px solid transparent;
}

.btn--primary {
  background: var(--color-accent);
  color: var(--color-text-on-accent);
  border-color: var(--color-accent);
}

.btn--primary:hover {
  filter: brightness(1.08);
}

.btn--ghost {
  background: transparent;
  border-color: var(--color-neutral-4);
  color: var(--color-neutral-7);
}

.btn--ghost:hover {
  background: var(--color-neutral-2);
  border-color: var(--color-neutral-5);
}

.btn:disabled {
  opacity: 0.45;
  cursor: not-allowed;
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
