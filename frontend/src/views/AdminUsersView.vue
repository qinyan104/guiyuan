<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import {
  adminListUsers,
  adminCreateUser,
  adminDeleteUser,
  adminResetPassword,
  adminChangeRole,
  adminBatchDeleteUsers,
  type AdminUser,
} from '../api/admin'
import { getUserErrorMessage } from '../api/http'
import { isSuperAdmin } from '../api/auth'
import { useLexiconStore } from '../stores/lexicon'
import AdminUserCreateForm from '../components/AdminUserCreateForm.vue'
import AppSelect from '../components/AppSelect.vue'
import BaseDialog from '../components/BaseDialog.vue'
import ConfirmDialog from '../components/ConfirmDialog.vue'
import PoeticHeader from '../components/PoeticHeader.vue'
import UserAvatar from '../components/UserAvatar.vue'
import { useToast } from '../composables/useToast'

const { lexicon } = useLexiconStore()
const { showToast } = useToast()
const usersQuote = computed(() => lexicon.users.quote.replace(/\\n/g, '<br/>'))
const users = ref<AdminUser[]>([])
const loading = ref(true)

const activeTab = ref<'all' | 'SUPER_ADMIN' | 'ADMIN' | 'USER'>('all')

const showCreateForm = ref(false)
const creatingUser = ref(false)

const resetUserId = ref<number | null>(null)
const resetNewPassword = ref('')

const deleteUserId = ref<number | null>(null)
const pendingRoleChange = ref<{ userId: number; role: string } | null>(null)

// Search / filter
const searchQuery = ref('')

// 批量选择
const selectedUserIds = ref<Set<number>>(new Set())
const showBatchDeleteConfirm = ref(false)
const batchDeleting = ref(false)

const canManageRoles = computed(() => isSuperAdmin())

const selectableUsers = computed(() =>
  filteredUsers.value.filter(u => !isProtected(u))
)

const isAllSelected = computed(() =>
  selectableUsers.value.length > 0 && selectableUsers.value.every(u => selectedUserIds.value.has(u.id))
)

const roleConfig: Record<string, { label: string }> = {
  SUPER_ADMIN: { label: '主修' },
  ADMIN: { label: '协修' },
  USER: { label: '编委' },
}

const roleOptions = [
  { value: 'USER', label: '编委' },
  { value: 'ADMIN', label: '协修' },
]

type CreateUserPayload = {
  username: string
  password: string
  nickname?: string
  role: 'ADMIN' | 'USER'
}

const tabCounts = computed(() => ({
  all: users.value.length,
  SUPER_ADMIN: users.value.filter((u) => u.role === 'SUPER_ADMIN').length,
  ADMIN: users.value.filter((u) => u.role === 'ADMIN').length,
  USER: users.value.filter((u) => u.role === 'USER').length,
}))

const filteredUsers = computed(() => {
  if (activeTab.value === 'all') return users.value
  return users.value.filter((u) => u.role === activeTab.value)
})

const showPasswordPlain = ref(false)

function generateRandomPassword() {
  const chars = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789!@#$'
  let pwd = 'Gy'
  for (let i = 0; i < 8; i++) {
    pwd += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  resetNewPassword.value = pwd
  showPasswordPlain.value = true
}

const displayedUsers = computed(() => {
  const q = searchQuery.value.trim().toLowerCase()
  if (!q) return filteredUsers.value
  return filteredUsers.value.filter(u =>
    u.username.toLowerCase().includes(q) ||
    (u.nickname && u.nickname.toLowerCase().includes(q)) ||
    String(u.id).includes(q) ||
    String(u.id).padStart(4, '0').includes(q) ||
    (roleConfig[u.role]?.label && roleConfig[u.role].label.toLowerCase().includes(q))
  )
})

async function loadUsers() {
  loading.value = true
  try {
    users.value = await adminListUsers()
  } catch {
    users.value = []
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  loadUsers()
})

async function handleCreate(payload: CreateUserPayload) {
  if (creatingUser.value) return
  if (!payload.username || !payload.password) {
    showToast('请填写用户名和初始密码', 'error')
    return
  }
  creatingUser.value = true
  try {
    await adminCreateUser(payload.username, payload.password, payload.nickname, payload.role)
    showCreateForm.value = false
    showToast('账号创建成功', 'success')
    await loadUsers()
  } catch (error) {
    showToast(getUserErrorMessage(error, '创建账号失败'), 'error')
  } finally {
    creatingUser.value = false
  }
}

async function handleDelete(id: number) {
  try {
    await adminDeleteUser(id)
    deleteUserId.value = null
    showToast('账号已删除', 'success')
    await loadUsers()
  } catch (error) {
    showToast(getUserErrorMessage(error, '删除失败'), 'error')
  }
}

async function handleResetPassword() {
  if (resetUserId.value === null || !resetNewPassword.value.trim()) return
  try {
    await adminResetPassword(resetUserId.value, resetNewPassword.value.trim())
    resetUserId.value = null
    resetNewPassword.value = ''
    showToast('密码已重置', 'success')
  } catch (error) {
    showToast(getUserErrorMessage(error, '重置密码失败'), 'error')
  }
}

function requestRoleChange(userId: number, newRoleVal: string) {
  pendingRoleChange.value = { userId, role: newRoleVal }
}

async function confirmRoleChange() {
  if (!pendingRoleChange.value) return
  const { userId, role } = pendingRoleChange.value
  pendingRoleChange.value = null
  await handleRoleChange(userId, role)
}

function cancelRoleChange() {
  pendingRoleChange.value = null
}

async function handleRoleChange(userId: number, newRoleVal: string) {
  try {
    await adminChangeRole(userId, newRoleVal)
    await loadUsers()
    showToast('角色已更新', 'success')
  } catch (error) {
    showToast(getUserErrorMessage(error, '角色修改失败'), 'error')
  }
}

function toggleSelectAll() {
  if (isAllSelected.value) {
    selectedUserIds.value = new Set()
  } else {
    selectedUserIds.value = new Set(selectableUsers.value.map(u => u.id))
  }
}

function toggleSelectUser(id: number) {
  const next = new Set(selectedUserIds.value)
  if (next.has(id)) {
    next.delete(id)
  } else {
    next.add(id)
  }
  selectedUserIds.value = next
}

async function handleBatchDelete() {
  const ids = [...selectedUserIds.value]
  if (ids.length === 0) return
  showBatchDeleteConfirm.value = false
  batchDeleting.value = true
  try {
    await adminBatchDeleteUsers(ids)
    selectedUserIds.value = new Set()
    await loadUsers()
    showToast('批量删除完成', 'success')
  } catch (error) {
    showToast(getUserErrorMessage(error, '批量删除失败'), 'error')
  } finally {
    batchDeleting.value = false
  }
}

function isProtected(user: AdminUser): boolean {
  return user.role === 'SUPER_ADMIN'
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr)
  return d.toLocaleDateString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit' })
}
</script>

<template>
  <div class="admin-users-view-root">
    <div class="admin-users-view">
      <PoeticHeader
        :eyebrow="lexicon.users.headerEyebrow"
        :title="lexicon.users.headerTitle"
        :title-italic="lexicon.users.headerTitleItalic"
      >
        <template #extra>
          <p class="poetic-quote" v-html="usersQuote"></p>
          <button class="btn btn--primary" @click="showCreateForm = true">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
            添加编委
          </button>
        </template>
      </PoeticHeader>

      <!-- Search & Quick Filter -->
      <div class="search-bar">
        <svg class="search-icon" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
        <input
          v-model="searchQuery"
          type="text"
          class="search-input"
          placeholder="搜索用户名、字号昵称、卷号ID或职官..."
        />
        <button v-if="searchQuery" class="search-clear" title="清空搜索" @click="searchQuery = ''">&times;</button>
      </div>

      <!-- Filter feedback row -->
      <div v-if="searchQuery" class="filter-status-row">
        <span>检索已匹配 <strong>{{ displayedUsers.length }}</strong> 位编委</span>
        <button class="reset-filter-link" @click="searchQuery = ''">清空搜索条件</button>
      </div>

      <!-- Role Tabs -->
      <div class="glass-tabs">
        <button
          v-for="tab in (['all', 'SUPER_ADMIN', 'ADMIN', 'USER'] as const)"
          :key="tab"
          class="glass-tab"
          :class="{ 'is-active': activeTab === tab }"
          @click="activeTab = tab"
        >
          {{ tab === 'all' ? '全部账号' : roleConfig[tab].label }}
          <span class="tab-count">{{ tabCounts[tab] }}</span>
        </button>
      </div>

      <!-- Batch action bar -->
      <transition name="glass-pop">
        <div v-if="selectedUserIds.size > 0" class="batch-bar">
          <span class="batch-count">已选 {{ selectedUserIds.size }} 人</span>
          <button class="btn btn--sm btn--danger" :disabled="batchDeleting" @click="showBatchDeleteConfirm = true">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></svg>
            {{ batchDeleting ? '删除中...' : '批量删除' }}
          </button>
          <button class="btn btn--sm" @click="selectedUserIds = new Set()">取消选择</button>
        </div>
      </transition>

      <!-- Data Table -->
      <div v-if="loading" class="loading-state">
        <div class="spinner"></div>
        <span>加载名录中...</span>
      </div>

      <div v-else-if="displayedUsers.length > 0" class="bento-card table-card">
        <div class="table-header">
          <label class="check-col">
            <input type="checkbox" :checked="isAllSelected" @change="toggleSelectAll" />
          </label>
          <span class="col-id">卷号</span>
          <span class="col-user">名讳 / 字号</span>
          <span class="col-role">职官</span>
          <span class="col-date">入录时日</span>
          <span class="col-ops">行事</span>
        </div>
        <div class="table-body">
          <div v-for="user in displayedUsers" :key="user.id" class="table-row" :class="{ 'is-protected': isProtected(user), 'is-selected': selectedUserIds.has(user.id) }">
            <label class="check-col" @click.stop>
              <input type="checkbox" :checked="selectedUserIds.has(user.id)" :disabled="isProtected(user)" @change="toggleSelectUser(user.id)" />
            </label>
            <span class="col-id">{{ String(user.id).padStart(4, '0') }}</span>
            <div class="col-user">
              <UserAvatar :src="user.avatarUrl" :name="user.nickname || user.username" :tone="user.role.toLowerCase()" size="md" />
              <div class="user-info">
                <span class="uname">
                  {{ user.username }}
                  <svg v-if="isProtected(user)" class="lock-icon" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>
                </span>
                <span class="unick">{{ user.nickname || '未设置昵称' }}</span>
              </div>
            </div>
            <span class="col-role">
              <AppSelect
                v-if="canManageRoles && !isProtected(user)"
                :model-value="user.role"
                :options="roleOptions"
                variant="inline"
                class="role-select"
                :class="user.role.toLowerCase()"
                @change="(role: string) => { if (role !== user.role) requestRoleChange(user.id, role) }"
              />
              <span
                v-else
                class="role-badge"
                :class="user.role.toLowerCase()"
              >
                {{ roleConfig[user.role]?.label || user.role }}
              </span>
            </span>
            <span class="col-date">{{ formatDate(user.createdAt) }}</span>
            <div class="col-ops">
              <button class="icon-btn reset" title="重置密码" @click="resetUserId = user.id; resetNewPassword = ''">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 2v6h-6" /><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" /></svg>
              </button>
              <button
                v-if="!isProtected(user)"
                class="icon-btn danger"
                title="删除编委"
                @click="deleteUserId = user.id"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /><line x1="10" y1="11" x2="10" y2="17" /><line x1="14" y1="11" x2="14" y2="17" /></svg>
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Empty State -->
      <div v-else-if="!loading" class="empty-state">
        <div class="empty-icon">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
        </div>
        <p class="empty-title">{{ searchQuery ? "未找到匹配账号" : "暂无此类账号" }}</p>
        <p class="empty-desc">{{ searchQuery ? "尝试其他用户名、字号或卷号" : "该角色下还没有编委账号" }}</p>
        <button v-if="searchQuery" class="btn btn--sm" style="margin-top: 14px;" @click="searchQuery = ''">
          清空搜索条件
        </button>
      </div>

      <BaseDialog
        :visible="showCreateForm"
        title="新增编委账号"
        max-width="720px"
        @update:visible="(v: boolean) => { showCreateForm = v }"
      >
        <AdminUserCreateForm
          :creating="creatingUser"
          @submit="handleCreate"
          @cancel="showCreateForm = false"
        />
      </BaseDialog>

      <BaseDialog
        :visible="resetUserId !== null"
        title="重铸编委登录密匙"
        max-width="440px"
        @update:visible="(v: boolean) => { if (!v) resetUserId = null }"
      >
        <div class="dialog-field">
          <div class="field-label-row">
            <label>为该编委设置新密码</label>
            <button type="button" class="quick-gen-btn" @click="generateRandomPassword">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></svg>
              随机生成强密码
            </button>
          </div>
          <div class="password-input-wrap">
            <input
              v-model="resetNewPassword"
              :type="showPasswordPlain ? 'text' : 'password'"
              placeholder="输入新密码（至少 6 位）"
              class="reset-input"
              @keyup.enter="handleResetPassword"
            />
            <button
              type="button"
              class="pwd-toggle-btn"
              :title="showPasswordPlain ? '隐藏明文' : '显示明文'"
              @click="showPasswordPlain = !showPasswordPlain"
            >
              <svg v-if="showPasswordPlain" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
              <svg v-else width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
            </button>
          </div>
          <span class="field-hint">重置后该编委账号需使用新密码登录，旧会话将自动失效。</span>
        </div>
        <template #footer>
          <button class="btn btn--ghost" @click="resetUserId = null">取消</button>
          <button class="btn btn--primary" :disabled="!resetNewPassword.trim()" @click="handleResetPassword">确认重置</button>
        </template>
      </BaseDialog>

      <ConfirmDialog
        :modelValue="pendingRoleChange !== null"
        title="确认调整系统角色"
        :message="'此操作会立即改变该账号的后台权限范围。请确认这是预期的角色变更。'"
        confirmLabel="确认调整"
        tone="warning"
        @confirm="confirmRoleChange"
        @cancel="cancelRoleChange"
        @update:model-value="(v: boolean) => { if (!v) cancelRoleChange() }"
      />

      <ConfirmDialog
        :modelValue="showBatchDeleteConfirm"
        title="确认批量删除"
        :message="`将永久移除已选的 ${selectedUserIds.size} 个账号访问权限，该操作不可撤销。`"
        :confirmLabel="`确认删除 ${selectedUserIds.size} 个账号`"
        cancelLabel="保留"
        tone="danger"
        @confirm="handleBatchDelete"
        @cancel="showBatchDeleteConfirm = false"
        @update:model-value="(v: boolean) => { showBatchDeleteConfirm = v }"
      />

      <ConfirmDialog
        :modelValue="deleteUserId !== null"
        title="确认删除编委"
        message="此操作将永久移除该编委的系统访问权限，该操作不可撤销。"
        confirmLabel="确认删除"
        cancelLabel="保留"
        tone="danger"
        @confirm="deleteUserId !== null && handleDelete(deleteUserId)"
        @cancel="deleteUserId = null"
        @update:model-value="(v: boolean) => { if (!v) deleteUserId = null }"
      />
    </div>
  </div>
</template>

<style scoped>
.admin-users-view {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

/* ── Tabs ── */
.glass-tabs {
  display: flex;
  gap: 8px;
  padding: 6px;
  background: var(--color-neutral-1);
  border-radius: var(--radius-lg);
  border: 1px solid var(--color-neutral-4);
  width: fit-content;
}

.glass-tab {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  background: transparent;
  border: none;
  border-radius: var(--radius-md);
  font-size: var(--text-copy-14);
  font-weight: 500;
  color: var(--color-neutral-7);
  cursor: pointer;
  transition: all var(--duration-fast);
}

.glass-tab:hover { color: var(--color-neutral-9); }

.glass-tab.is-active {
  background: var(--color-panel-bg);
  color: var(--color-neutral-9);
  box-shadow: var(--shadow-whisper);
}

.tab-count {
  padding: 2px 8px;
  background: var(--color-neutral-3);
  border-radius: 999px;
  font-size: var(--text-label-12);
  font-family: monospace;
  color: var(--color-neutral-6);
}

.glass-tab.is-active .tab-count {
  background: var(--color-accent);
  color: var(--color-text-on-accent);
}

/* ── Cards ── */
.bento-card {
  background: var(--color-panel-bg);
  border: 1px solid var(--color-card-stroke);
  border-radius: var(--radius-xl);
  box-shadow: var(--shadow-whisper);
  padding: 24px;
}

/* ── Table ── */
.table-card {
  padding: 0;
  background: var(--color-panel-bg);
  border: 1px solid var(--color-card-stroke);
  border-radius: var(--radius-xl);
  box-shadow: var(--shadow-whisper);
}

.table-header {
  display: grid;
  grid-template-columns: 40px 60px 1fr 130px 130px 100px;
  gap: 16px;
  padding: 14px 24px;
  background: var(--color-neutral-1);
  border-bottom: 1px solid var(--color-neutral-4);
  font-size: var(--text-label-12);
  font-weight: 500;
  color: var(--color-neutral-6);
  letter-spacing: 0.03em;
  text-transform: uppercase;
}

.table-body {
  background: var(--color-panel-bg);
}

.table-row {
  display: grid;
  grid-template-columns: 40px 60px 1fr 130px 130px 100px;
  gap: 16px;
  padding: 16px 24px;
  align-items: center;
  border-bottom: 1px solid var(--color-neutral-3);
  transition: background 0.15s ease;
}

.table-row:last-child {
  border-bottom: none;
}

.table-row:hover {
  background: var(--color-neutral-1);
}

.table-row.is-selected {
  background: var(--color-accent-muted);
  border-bottom-color: rgba(196, 58, 49, 0.12);
}

.table-row.is-selected + .table-row {
  border-top-color: rgba(196, 58, 49, 0.12);
}

.batch-bar {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 16px;
  background: rgba(196, 58, 49, 0.06);
  border: 1px dashed var(--color-accent);
  border-radius: var(--radius-md);
}

.batch-bar span {
  font-size: var(--text-copy-14);
  font-weight: 500;
  color: var(--color-accent);
}

.check-col input[type="checkbox"] { accent-color: var(--color-accent); }

.col-id {
  font-family: monospace;
  font-size: var(--text-label-12);
  color: var(--color-neutral-5);
}

.col-user {
  display: flex;
  align-items: center;
  gap: 12px;
}

.user-info {
  display: flex;
  flex-direction: column;
}

.uname {
  font-size: var(--text-copy-14);
  font-weight: 500;
  color: var(--color-neutral-9);
}

.unick {
  font-size: var(--text-label-12);
  color: var(--color-neutral-6);
}

.col-role {
  font-size: var(--text-copy-14);
}

.role-badge {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 5px 12px;
  border-radius: 999px;
  font-size: 13px;
  font-weight: 500;
  letter-spacing: 0.02em;
  white-space: nowrap;
}

.role-badge.super_admin {
  background: rgba(196, 58, 49, 0.08);
  color: var(--color-accent);
}

.role-badge.admin {
  background: rgba(61, 104, 150, 0.08);
  color: var(--color-info);
}

.role-badge.user {
  background: var(--color-neutral-3);
  color: var(--color-neutral-7);
}

.role-select {
  min-width: 82px;
}

.role-select :deep(.app-select__trigger) {
  border-color: transparent;
  border-radius: 999px;
  padding: 5px 8px 5px 12px;
  font-size: 13px;
  font-weight: 500;
  letter-spacing: 0.02em;
}

.role-select.admin :deep(.app-select__trigger) {
  background: rgba(61, 104, 150, 0.08);
  color: var(--color-info);
}

.role-select.user :deep(.app-select__trigger) {
  background: var(--color-neutral-3);
  color: var(--color-neutral-7);
}

.role-select :deep(.app-select__trigger:hover),
.role-select :deep(.app-select__trigger:focus-visible) {
  border-color: var(--color-neutral-4);
}

/* ── Columns ── */
.col-date {
  font-size: 13px;
  color: var(--color-neutral-6);
}

.col-ops {
  display: flex;
  gap: 4px;
  justify-content: flex-end;
}

.icon-btn {
  width: 34px;
  height: 34px;
  border-radius: var(--radius-md);
  border: 1px solid transparent;
  background: transparent;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.15s ease;
}

.icon-btn.reset {
  color: var(--color-info);
}

.icon-btn.reset:hover {
  background: rgba(61, 104, 150, 0.08);
  border-color: rgba(61, 104, 150, 0.15);
}

.icon-btn.danger {
  color: var(--color-neutral-5);
}

.icon-btn.danger:hover {
  color: var(--color-error);
  background: rgba(196, 58, 49, 0.08);
  border-color: rgba(196, 58, 49, 0.15);
}

.dialog-field {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.dialog-field label {
  font-size: var(--text-label-12);
  font-weight: 500;
  color: var(--color-neutral-6);
}

.dialog-field input {
  padding: 12px 14px;
  border-radius: var(--radius-md);
  border: 1px solid var(--color-neutral-5);
  background: var(--color-neutral-1);
  font-size: var(--text-copy-14);
  color: var(--color-neutral-9);
  outline: none;
}

.dialog-field input:focus {
  border-color: var(--color-accent);
  box-shadow: 0 0 0 3px var(--color-accent-muted);
}

.glass-pop-enter-active,
.glass-pop-leave-active {
  transition: opacity 0.25s ease, transform 0.25s var(--ease-breath);
}

.glass-pop-enter-from,
.glass-pop-leave-to {
  opacity: 0;
  transform: scale(0.96) translateY(8px);
}

/* ── Loading ── */
.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;
  padding: 64px;
  color: var(--color-neutral-7);
}

.spinner {
  width: 36px;
  height: 36px;
  border: 3px solid var(--color-neutral-3);
  border-top-color: var(--color-accent);
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

/* ── Search Bar ── */
.search-bar {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 14px;
  background: var(--color-card-fill);
  border: 1px solid var(--color-card-stroke);
  border-radius: var(--radius-lg, 12px);
  box-shadow: var(--shadow-whisper);
  transition: all var(--duration-fast, 180ms) var(--ease-breath);
}

.search-bar:focus-within {
  border-color: var(--color-accent);
  box-shadow: 0 0 0 3px var(--color-accent-muted, rgba(184, 51, 42, 0.12));
}

.search-icon {
  color: var(--color-neutral-5);
  flex-shrink: 0;
}

.search-input {
  flex: 1;
  border: none;
  background: transparent;
  font-size: var(--text-copy-14, 14px);
  color: var(--color-neutral-9);
  outline: none;
  height: 24px;
  line-height: 24px;
}

.search-input::placeholder {
  color: var(--color-neutral-5);
}

.search-clear {
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
  line-height: 1;
  transition: all var(--duration-fast, 150ms);
}

.search-clear:hover {
  background: var(--color-neutral-4);
  color: var(--color-neutral-9);
}

/* Filter status strip */
.filter-status-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: var(--text-label-12, 12px);
  color: var(--color-neutral-6);
  padding: 2px 4px;
}

.reset-filter-link {
  background: transparent;
  border: none;
  color: var(--color-accent);
  cursor: pointer;
  font-size: var(--text-label-12, 12px);
  padding: 0;
  text-decoration: underline;
  text-underline-offset: 2px;
}

/* Reset password custom fields */
.field-label-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.quick-gen-btn {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  background: transparent;
  border: none;
  color: var(--color-accent);
  font-size: var(--text-label-12, 12px);
  cursor: pointer;
  padding: 2px 4px;
  border-radius: 4px;
}
.quick-gen-btn:hover {
  background: var(--color-accent-muted);
}

.password-input-wrap {
  position: relative;
  display: flex;
  align-items: center;
}

.reset-input {
  width: 100%;
  padding-right: 38px !important;
}

.pwd-toggle-btn {
  position: absolute;
  right: 8px;
  background: transparent;
  border: none;
  color: var(--color-neutral-6);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 26px;
  height: 26px;
  border-radius: 4px;
}
.pwd-toggle-btn:hover {
  color: var(--color-neutral-9);
  background: var(--color-neutral-3);
}

.field-hint {
  font-size: var(--text-label-12, 12px);
  color: var(--color-neutral-5);
  line-height: 1.4;
}

/* ── Empty State ── */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 64px 24px;
  text-align: center;
}

.empty-icon {
  color: var(--color-neutral-4);
  margin-bottom: 16px;
  opacity: 0.6;
}

.empty-title {
  font-family: var(--font-serif);
  font-size: var(--text-title-18);
  font-weight: 500;
  color: var(--color-neutral-7);
  margin: 0 0 8px;
}

.empty-desc {
  font-size: var(--text-copy-14);
  color: var(--color-neutral-5);
  margin: 0;
}

@keyframes spin { to { transform: rotate(360deg); } }

/* ── 响应式 ── */
@media (max-width: 960px) {
  .table-header { display: none; }
  .table-row {
    grid-template-columns: 1fr;
    gap: 10px;
    padding: 14px;
  }
  .col-id, .check-col { display: none; }
  .col-ops { justify-content: flex-end; }
}
</style>

