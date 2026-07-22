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
import { isSuperAdmin } from '../api/auth'
import { useLexiconStore } from '../stores/lexicon'
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
const newUsername = ref('')
const newPassword = ref('')
const newNickname = ref('')
const newRole = ref<'ADMIN' | 'USER'>('USER')
const creatingUser = ref(false)

const resetUserId = ref<number | null>(null)
const resetNewPassword = ref('')

const deleteUserId = ref<number | null>(null)
const pendingRoleChange = ref<{ userId: number; role: string } | null>(null)

// Search / filter
const searchQuery = ref('')
// Role popover state
const roleMenuUserId = ref<number | null>(null)
function toggleRoleMenu(userId: number) {
  roleMenuUserId.value = roleMenuUserId.value === userId ? null : userId
}
function closeRoleMenu() {
  roleMenuUserId.value = null
}

function onDocumentClick(e: MouseEvent) {
  const target = e.target as HTMLElement
  if (!target.closest('.role-switcher')) {
    closeRoleMenu()
  }
}

// 批量选择
const selectedUserIds = ref<Set<number>>(new Set())
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

const displayedUsers = computed(() => {
  const q = searchQuery.value.trim().toLowerCase()
  if (!q) return filteredUsers.value
  return filteredUsers.value.filter(u =>
    u.username.toLowerCase().includes(q) ||
    (u.nickname && u.nickname.toLowerCase().includes(q))
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
  document.addEventListener('click', onDocumentClick)
})

async function handleCreate() {
  if (creatingUser.value) return
  if (!newUsername.value.trim() || !newPassword.value.trim()) {
    showToast('请填写用户名和初始密码', 'error')
    return
  }
  creatingUser.value = true
  try {
    await adminCreateUser(newUsername.value.trim(), newPassword.value.trim(), newNickname.value.trim() || undefined, newRole.value)
    newUsername.value = ''
    newPassword.value = ''
    newNickname.value = ''
    newRole.value = 'USER'
    showCreateForm.value = false
    showToast('账号创建成功', 'success')
    await loadUsers()
  } catch {
    showToast('创建账号失败', 'error')
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
  } catch {
    showToast('删除失败', 'error')
  }
}

async function handleResetPassword() {
  if (resetUserId.value === null || !resetNewPassword.value.trim()) return
  try {
    await adminResetPassword(resetUserId.value, resetNewPassword.value.trim())
    resetUserId.value = null
    resetNewPassword.value = ''
    showToast('密码已重置', 'success')
  } catch {
    showToast('重置密码失败', 'error')
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
  } catch {
    showToast('角色修改失败', 'error')
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
  batchDeleting.value = true
  try {
    await adminBatchDeleteUsers(ids)
    selectedUserIds.value = new Set()
    await loadUsers()
    showToast('批量删除完成', 'success')
  } catch {
    showToast('批量删除失败', 'error')
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

      <!-- Search -->
      <div class="search-bar">
<input v-model="searchQuery" type="text" class="search-input" placeholder="搜索用户名或昵称..." />
        <button v-if="searchQuery" class="search-clear" @click="searchQuery = ''">&times;</button>
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
          <button class="btn btn--sm btn--danger" :disabled="batchDeleting" @click="handleBatchDelete">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
            {{ batchDeleting ? '删除中...' : '批量删除' }}
          </button>
          <button class="btn btn--sm" @click="selectedUserIds = new Set()">取消选择</button>
        </div>
      </transition>

      <!-- Create Form -->
      <transition name="glass-pop">
        <div v-if="showCreateForm" class="bento-card create-form">
          <div class="form-header">
            <h3>新增编委账号</h3>
          </div>
          <div class="form-grid">
            <div class="field">
              <label>用户名</label>
              <input v-model="newUsername" type="text" placeholder="输入登录账号" />
            </div>
            <div class="field">
              <label>初始密码</label>
              <input v-model="newPassword" type="password" placeholder="设置初始密码" />
            </div>
            <div class="field">
              <label>真实姓名/昵称</label>
              <input v-model="newNickname" type="text" placeholder="选填" />
            </div>
          </div>
          <div class="form-footer">
            <div class="role-selector">
              <span class="label">分配角色：</span>
              <label class="role-radio" :class="{ 'is-active': newRole === 'USER' }">
                <input v-model="newRole" type="radio" value="USER" />
                <span>编委</span>
              </label>
              <label class="role-radio admin" :class="{ 'is-active': newRole === 'ADMIN' }">
                <input v-model="newRole" type="radio" value="ADMIN" />
                <span>协修</span>
              </label>
            </div>
            <div class="actions">
              <button class="btn btn--ghost" @click="showCreateForm = false">取消</button>
              <button class="btn btn--primary" :disabled="creatingUser" @click="handleCreate">
                {{ creatingUser ? '创建中...' : '确认创建' }}
              </button>
            </div>
          </div>
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
              <UserAvatar :name="user.nickname || user.username" :tone="user.role.toLowerCase()" size="md" />
              <div class="user-info">
                <span class="uname">
                  {{ user.username }}
                  <svg v-if="isProtected(user)" class="lock-icon" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>
                </span>
                <span class="unick">{{ user.nickname || '未设置昵称' }}</span>
              </div>
            </div>
            <span class="col-role">
              <div v-if="canManageRoles && !isProtected(user)" class="role-switcher">
                <button
                  class="role-badge role-badge--clickable"
                  :class="user.role.toLowerCase()"
                  @click.stop="toggleRoleMenu(user.id)"
                >
                  {{ roleConfig[user.role]?.label || user.role }}
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><polyline points="6 9 12 15 18 9"/></svg>
                </button>
                <transition name="role-pop">
                  <div v-if="roleMenuUserId === user.id" class="role-popover">
                    <button
                      class="role-option"
                      :class="{ 'is-current': user.role === 'USER' }"
                      @click.stop="requestRoleChange(user.id, 'USER'); closeRoleMenu()"
                    >
                      <span class="role-option-dot user"></span>
                      编委
                      <svg v-if="user.role === 'USER'" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><polyline points="20 6 9 17 4 12"/></svg>
                    </button>
                    <button
                      class="role-option"
                      :class="{ 'is-current': user.role === 'ADMIN' }"
                      @click.stop="requestRoleChange(user.id, 'ADMIN'); closeRoleMenu()"
                    >
                      <span class="role-option-dot admin"></span>
                      协修
                      <svg v-if="user.role === 'ADMIN'" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><polyline points="20 6 9 17 4 12"/></svg>
                    </button>
                  </div>
                </transition>
              </div>
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
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
        </div>
        <p class="empty-title">{{ searchQuery ? "未找到匹配账号" : "暂无此类账号" }}</p>
        <p class="empty-desc">{{ searchQuery ? "尝试其他关键词" : "该角色下还没有编委账号" }}</p>
      </div>

      <BaseDialog
        :visible="resetUserId !== null"
        title="重置密码"
        max-width="400px"
        @update:visible="(v: boolean) => { if (!v) resetUserId = null }"
      >
        <div class="dialog-field">
          <label>为该编委设置新密码</label>
          <input v-model="resetNewPassword" type="password" placeholder="输入新密码" @keyup.enter="handleResetPassword" />
        </div>
        <template #footer>
          <button class="btn btn--ghost" @click="resetUserId = null">取消</button>
          <button class="btn btn--primary" @click="handleResetPassword">确认重置</button>
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

/* ── Create Form ── */
.create-form {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.form-header h3 {
  margin: 0;
  font-size: var(--text-title-18);
  font-family: var(--font-serif);
  color: var(--color-neutral-9);
}

.form-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 16px;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.field label {
  font-size: var(--text-label-12);
  font-weight: 500;
  color: var(--color-neutral-6);
}

.field input {
  padding: 10px 14px;
  border: 1px solid var(--color-neutral-5);
  border-radius: var(--radius-md);
  background: var(--color-neutral-1);
  font-size: var(--text-copy-14);
  color: var(--color-neutral-9);
  outline: none;
  transition: border-color var(--duration-fast);
}

.field input:focus {
  border-color: var(--color-accent);
  box-shadow: 0 0 0 3px var(--color-accent-muted);
}

.form-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.role-selector {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 10px;
  font-size: var(--text-copy-14);
  color: var(--color-neutral-8);
}

.role-selector .label {
  color: var(--color-neutral-6);
}

.role-radio {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  line-height: 1;
  cursor: pointer;
}

.role-radio input {
  width: 14px;
  height: 14px;
  margin: 0;
  accent-color: var(--color-accent);
}

.role-radio span {
  line-height: 1;
}

.actions {
  display: flex;
  gap: 10px;
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

.role-badge--clickable {
  cursor: pointer;
  border: 1px solid transparent;
  transition: all 0.15s ease;
  user-select: none;
  padding-right: 8px;
}

.role-badge--clickable:hover {
  border-color: var(--color-neutral-4);
  background: var(--color-neutral-2);
}

.role-badge--clickable:active {
  transform: scale(0.97);
}

/* ── Role Switcher ── */
.role-switcher {
  position: relative;
  display: inline-flex;
}

.role-popover {
  position: absolute;
  top: calc(100% + 6px);
  left: 0;
  z-index: var(--z-popover);
  min-width: 140px;
  background: var(--color-panel-bg);
  border: 1px solid var(--color-card-stroke);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-whisper);
  padding: 6px;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.role-option {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 9px 12px;
  border: none;
  border-radius: var(--radius-md);
  background: transparent;
  font-size: 13px;
  font-weight: 500;
  color: var(--color-neutral-8);
  cursor: pointer;
  transition: background 0.12s ease;
  text-align: left;
  width: 100%;
}

.role-option:hover {
  background: var(--color-neutral-2);
}

.role-option.is-current {
  color: var(--color-neutral-10);
  font-weight: 500;
  background: var(--color-neutral-2);
}

.role-option svg:last-child {
  margin-left: auto;
  color: var(--color-accent);
}

.role-option-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}

.role-option-dot.user { background: var(--color-neutral-6); }
.role-option-dot.admin { background: var(--color-info); }

.role-pop-enter-active,
.role-pop-leave-active {
  transition: opacity 0.18s ease, transform 0.18s ease;
}

.role-pop-enter-from,
.role-pop-leave-to {
  opacity: 0;
  transform: translateY(-4px) scale(0.96);
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
  padding: 10px 16px;
  background: var(--color-card-fill);
  border: 1px solid var(--color-card-stroke);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-whisper);
}

.search-icon {
  color: var(--color-neutral-5);
  flex-shrink: 0;
}

.search-input {
  flex: 1;
  border: none;
  background: transparent;
  font-size: var(--text-copy-14);
  color: var(--color-neutral-9);
  outline: none;
}

.search-input::placeholder {
  color: var(--color-neutral-5);
}

.search-clear {
  width: 24px;
  height: 24px;
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
  transition: all var(--duration-fast);
}

.search-clear:hover {
  background: var(--color-neutral-4);
  color: var(--color-neutral-9);
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
  .form-grid { grid-template-columns: 1fr; }
  .form-footer { flex-direction: column; gap: 14px; align-items: stretch; }
  .actions { flex-direction: column; }
}
</style>

