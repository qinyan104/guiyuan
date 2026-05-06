<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import {
  adminListUsers,
  adminCreateUser,
  adminDeleteUser,
  adminResetPassword,
  adminChangeRole,
  isSuperAdmin,
  type AdminUser,
} from '../api/auth'

const users = ref<AdminUser[]>([])
const loading = ref(true)

const activeTab = ref<'all' | 'SUPER_ADMIN' | 'ADMIN' | 'USER'>('all')

const showCreateForm = ref(false)
const newUsername = ref('')
const newPassword = ref('')
const newNickname = ref('')
const newRole = ref<'ADMIN' | 'USER'>('USER')

const resetUserId = ref<number | null>(null)
const resetNewPassword = ref('')

const deleteUserId = ref<number | null>(null)

const canManageRoles = computed(() => isSuperAdmin())

const roleConfig: Record<string, { label: string }> = {
  SUPER_ADMIN: { label: '超级管理员' },
  ADMIN: { label: '管理员' },
  USER: { label: '普通编委' },
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

onMounted(loadUsers)

async function handleCreate() {
  if (!newUsername.value.trim() || !newPassword.value.trim()) return
  try {
    await adminCreateUser(newUsername.value.trim(), newPassword.value.trim(), newNickname.value.trim() || undefined, newRole.value)
    newUsername.value = ''
    newPassword.value = ''
    newNickname.value = ''
    newRole.value = 'USER'
    showCreateForm.value = false
    await loadUsers()
  } catch {
    // error
  }
}

async function handleDelete(id: number) {
  try {
    await adminDeleteUser(id)
    deleteUserId.value = null
    await loadUsers()
  } catch {
    // error
  }
}

async function handleResetPassword() {
  if (resetUserId.value === null || !resetNewPassword.value.trim()) return
  try {
    await adminResetPassword(resetUserId.value, resetNewPassword.value.trim())
    resetUserId.value = null
    resetNewPassword.value = ''
  } catch {
    // error
  }
}

async function handleRoleChange(userId: number, newRoleVal: string) {
  try {
    await adminChangeRole(userId, newRoleVal)
    await loadUsers()
  } catch {
    // error
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
  <div class="admin-users-view">
    <div class="bento-header">
      <div class="header-content">
        <h1 class="page-title">编委名录 // DIRECTORY</h1>
        <p class="page-desc">管理家族成员账号与系统权限设定</p>
      </div>
      <button class="bento-btn primary" @click="showCreateForm = true">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
        添加编委
      </button>
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
              <span>普通编委</span>
            </label>
            <label class="role-radio admin" :class="{ 'is-active': newRole === 'ADMIN' }">
              <input v-model="newRole" type="radio" value="ADMIN" />
              <span>管理员</span>
            </label>
          </div>
          <div class="actions">
            <button class="bento-btn ghost" @click="showCreateForm = false">取消</button>
            <button class="bento-btn primary" @click="handleCreate">确认创建</button>
          </div>
        </div>
      </div>
    </transition>

    <!-- Data Table -->
    <div v-if="loading" class="loading-state">
      <div class="spinner"></div>
      <span>加载名录中...</span>
    </div>

    <div v-else class="bento-card table-card">
      <div class="table-header">
        <span class="col-id">UID</span>
        <span class="col-user">账号 / 昵称</span>
        <span class="col-role">权限组</span>
        <span class="col-date">注册时间</span>
        <span class="col-ops">操作</span>
      </div>
      <div class="table-body">
        <div v-for="user in filteredUsers" :key="user.id" class="table-row" :class="{ 'is-protected': isProtected(user) }">
          <span class="col-id">{{ String(user.id).padStart(4, '0') }}</span>
          <div class="col-user">
            <div class="user-avatar" :class="user.role.toLowerCase()">
              {{ user.nickname ? user.nickname.charAt(0).toUpperCase() : user.username.charAt(0).toUpperCase() }}
            </div>
            <div class="user-info">
              <span class="uname">
                {{ user.username }}
                <svg v-if="isProtected(user)" class="lock-icon" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
              </span>
              <span class="unick">{{ user.nickname || '未设置昵称' }}</span>
            </div>
          </div>
          <span class="col-role">
            <select
              v-if="canManageRoles && !isProtected(user)"
              :value="user.role"
              class="glass-select"
              @change="handleRoleChange(user.id, ($event.target as HTMLSelectElement).value)"
            >
              <option value="USER">普通编委</option>
              <option value="ADMIN">管理员</option>
            </select>
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
            <button class="icon-btn reset" @click="resetUserId = user.id; resetNewPassword = ''" title="重置密码">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 2v6h-6"/><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/></svg>
            </button>
            <button
              v-if="!isProtected(user)"
              class="icon-btn danger"
              @click="deleteUserId = user.id"
              title="删除编委"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Reset Password Dialog -->
    <Teleport to="body">
      <transition name="glass-pop">
        <div v-if="resetUserId !== null" class="glass-dialog-overlay" @click.self="resetUserId = null">
          <div class="glass-dialog">
            <h2 class="dialog-title">重置密码</h2>
            <div class="dialog-field">
              <label>为该编委设置新密码</label>
              <input v-model="resetNewPassword" type="password" placeholder="输入新密码" @keyup.enter="handleResetPassword" />
            </div>
            <div class="dialog-actions">
              <button class="bento-btn ghost" @click="resetUserId = null">取消</button>
              <button class="bento-btn primary" @click="handleResetPassword">确认重置</button>
            </div>
          </div>
        </div>
      </transition>
    </Teleport>

    <!-- Delete Confirm Dialog -->
    <Teleport to="body">
      <transition name="glass-pop">
        <div v-if="deleteUserId !== null" class="glass-dialog-overlay" @click.self="deleteUserId = null">
          <div class="glass-dialog danger-mode">
            <h2 class="dialog-title">确认删除编委</h2>
            <p class="dialog-desc">此操作将永久移除该编委的系统访问权限，该操作不可撤销。</p>
            <div class="dialog-actions">
              <button class="bento-btn ghost" @click="deleteUserId = null">保留</button>
              <button class="bento-btn danger" @click="handleDelete(deleteUserId!)">确认删除</button>
            </div>
          </div>
        </div>
      </transition>
    </Teleport>
  </div>
</template>

<style scoped>
.admin-users-view {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

/* ── Header ── */
.bento-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.page-title {
  font-family: monospace;
  font-size: 1.1rem;
  font-weight: 700;
  letter-spacing: 0.1em;
  color: var(--text-main);
  margin: 0 0 6px;
}

.page-desc {
  font-size: 0.85rem;
  color: var(--text-soft);
  margin: 0;
}

.bento-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  border-radius: 999px;
  font-size: 0.85rem;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.2s ease;
  border: none;
}
.bento-btn.primary {
  background: var(--text-main);
  color: var(--bg-panel, #fff);
  box-shadow: 0 4px 12px rgba(0,0,0,0.1);
}
.bento-btn.primary:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(0,0,0,0.15);
}
.bento-btn.ghost {
  background: transparent;
  color: var(--text-main);
  border: 1px solid var(--glass-border-highlight, rgba(0,0,0,0.1));
}
.bento-btn.ghost:hover {
  background: rgba(0,0,0,0.05);
}
:global([data-theme="ink-wash"]) .bento-btn.ghost:hover,
:global([data-theme="rosewood"]) .bento-btn.ghost:hover,
:global([data-theme="star-sea"]) .bento-btn.ghost:hover {
  background: rgba(255,255,255,0.1);
}
.bento-btn.danger {
  background: #ef4444;
  color: #fff;
}
.bento-btn.danger:hover {
  background: #dc2626;
  box-shadow: 0 8px 24px rgba(239, 68, 68, 0.3);
}

/* ── Tabs ── */
.glass-tabs {
  display: flex;
  gap: 8px;
  padding: 6px;
  background: var(--glass-panel-bg, rgba(255,255,255,0.4));
  border-radius: 16px;
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border: 1px solid var(--glass-border-highlight, rgba(255,255,255,0.5));
  width: fit-content;
}

.glass-tab {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  background: transparent;
  border: none;
  border-radius: 12px;
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--text-soft);
  cursor: pointer;
  transition: all 0.2s ease;
}
.glass-tab:hover {
  color: var(--text-main);
}
.glass-tab.is-active {
  background: var(--bg-panel, #fff);
  color: var(--text-main);
  box-shadow: 0 4px 12px rgba(0,0,0,0.05);
}
:global([data-theme="ink-wash"]) .glass-tab.is-active,
:global([data-theme="rosewood"]) .glass-tab.is-active,
:global([data-theme="star-sea"]) .glass-tab.is-active {
  background: rgba(255,255,255,0.1);
}

.tab-count {
  padding: 2px 8px;
  background: rgba(0,0,0,0.05);
  border-radius: 999px;
  font-size: 0.7rem;
  font-family: monospace;
}
.glass-tab.is-active .tab-count {
  background: var(--text-main);
  color: var(--bg-panel, #fff);
}

/* ── Glass Bento Cards ── */
.bento-card {
  background: var(--glass-panel-bg, rgba(255, 255, 255, 0.6));
  backdrop-filter: blur(24px) saturate(180%);
  -webkit-backdrop-filter: blur(24px) saturate(180%);
  border: 1px solid var(--glass-border-highlight, rgba(255, 255, 255, 0.8));
  border-radius: 20px;
  box-shadow: 0 24px 48px rgba(0, 0, 0, 0.05), inset 0 1px 0 rgba(255,255,255,0.5);
  padding: 24px;
}
:global([data-theme="ink-wash"]) .bento-card,
:global([data-theme="rosewood"]) .bento-card,
:global([data-theme="star-sea"]) .bento-card {
  background: rgba(20, 20, 20, 0.5);
  border-color: rgba(255,255,255,0.1);
  box-shadow: 0 24px 48px rgba(0,0,0,0.2);
}

/* ── Create Form ── */
.create-form {
  display: flex;
  flex-direction: column;
  gap: 20px;
}
.form-header h3 {
  margin: 0;
  font-size: 1rem;
  font-family: 'Noto Serif SC', serif;
  color: var(--text-main);
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
  font-size: 0.75rem;
  font-weight: 700;
  color: var(--text-soft);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}
.field input {
  padding: 10px 14px;
  border-radius: 12px;
  border: 1px solid var(--glass-border-shadow, rgba(0,0,0,0.1));
  background: rgba(255,255,255,0.5);
  color: var(--text-main);
  font-size: 0.9rem;
  outline: none;
  transition: all 0.2s ease;
}
:global([data-theme="ink-wash"]) .field input,
:global([data-theme="rosewood"]) .field input,
:global([data-theme="star-sea"]) .field input {
  background: rgba(0,0,0,0.3);
  border-color: rgba(255,255,255,0.1);
}
.field input:focus {
  background: var(--bg-panel, #fff);
  border-color: var(--text-main);
  box-shadow: 0 0 0 3px rgba(0,0,0,0.05);
}

.form-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-top: 16px;
  border-top: 1px dashed var(--glass-border-shadow, rgba(0,0,0,0.1));
}
.role-selector {
  display: flex;
  align-items: center;
  gap: 12px;
}
.role-selector .label {
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--text-soft);
}
.role-radio {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 14px;
  border-radius: 999px;
  border: 1px solid var(--glass-border-shadow, rgba(0,0,0,0.1));
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--text-soft);
  cursor: pointer;
  transition: all 0.2s;
}
.role-radio input {
  display: none;
}
.role-radio.is-active {
  background: var(--text-main);
  color: var(--bg-panel, #fff);
  border-color: var(--text-main);
}
.role-radio.admin.is-active {
  background: var(--accent-amber);
  border-color: var(--accent-amber);
}

.actions {
  display: flex;
  gap: 12px;
}

/* ── Table Layout ── */
.table-card {
  padding: 0;
  overflow: hidden;
}
.table-header {
  display: grid;
  grid-template-columns: 80px 1.5fr 1fr 150px 100px;
  gap: 16px;
  padding: 16px 24px;
  background: rgba(0,0,0,0.02);
  border-bottom: 1px solid var(--glass-border-shadow, rgba(0,0,0,0.05));
  font-size: 0.7rem;
  font-weight: 800;
  color: var(--text-soft);
  text-transform: uppercase;
  letter-spacing: 0.1em;
}
:global([data-theme="ink-wash"]) .table-header,
:global([data-theme="rosewood"]) .table-header,
:global([data-theme="star-sea"]) .table-header {
  background: rgba(255,255,255,0.02);
  border-color: rgba(255,255,255,0.05);
}

.table-row {
  display: grid;
  grid-template-columns: 80px 1.5fr 1fr 150px 100px;
  gap: 16px;
  padding: 16px 24px;
  align-items: center;
  border-bottom: 1px solid var(--glass-border-shadow, rgba(0,0,0,0.03));
  transition: background 0.2s ease;
}
.table-row:hover {
  background: rgba(255,255,255,0.4);
}
:global([data-theme="ink-wash"]) .table-row:hover,
:global([data-theme="rosewood"]) .table-row:hover,
:global([data-theme="star-sea"]) .table-row:hover {
  background: rgba(255,255,255,0.03);
}
.table-row.is-protected {
  background: rgba(180, 83, 9, 0.02);
}

.col-id {
  font-family: monospace;
  font-size: 0.85rem;
  color: var(--text-soft);
}

.col-user {
  display: flex;
  align-items: center;
  gap: 12px;
}
.user-avatar {
  width: 36px;
  height: 36px;
  border-radius: 12px;
  background: var(--glass-border-highlight, rgba(255,255,255,0.8));
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.1rem;
  font-weight: 800;
  font-family: 'Noto Serif SC', serif;
  color: var(--text-main);
  box-shadow: 0 4px 12px rgba(0,0,0,0.05);
}
.user-avatar.super_admin {
  background: var(--accent-amber);
  color: #fff;
}
.user-avatar.admin {
  background: var(--accent-ink);
  color: #fff;
}

.user-info {
  display: flex;
  flex-direction: column;
}
.uname {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 0.95rem;
  font-weight: 700;
  color: var(--text-main);
}
.unick {
  font-size: 0.75rem;
  color: var(--text-soft);
}
.lock-icon {
  color: var(--accent-amber);
  opacity: 0.8;
}

.col-role {
  display: flex;
  align-items: center;
}
.role-badge {
  padding: 4px 12px;
  border-radius: 999px;
  font-size: 0.75rem;
  font-weight: 700;
  background: rgba(0,0,0,0.05);
  color: var(--text-main);
}
.role-badge.super_admin {
  background: rgba(180, 83, 9, 0.1);
  color: #b45309;
}
.role-badge.admin {
  background: rgba(59, 130, 246, 0.1);
  color: #2563eb;
}
:global([data-theme="ink-wash"]) .role-badge.super_admin,
:global([data-theme="rosewood"]) .role-badge.super_admin,
:global([data-theme="star-sea"]) .role-badge.super_admin {
  background: rgba(251, 146, 60, 0.2);
  color: #fdba74;
}

.glass-select {
  appearance: none;
  -webkit-appearance: none;
  padding: 4px 26px 4px 10px;
  border-radius: 6px;
  border: 1px solid var(--glass-border-shadow, rgba(0,0,0,0.1));
  background: rgba(255,255,255,0.4) url('data:image/svg+xml;utf8,<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="%23333333" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" xmlns="http://www.w3.org/2000/svg"><polyline points="6 9 12 15 18 9"></polyline></svg>') no-repeat right 8px center;
  font-size: 0.75rem;
  font-weight: 700;
  color: var(--text-main);
  outline: none;
  cursor: pointer;
  transition: all 0.2s;
}
.glass-select:focus {
  border-color: var(--text-main);
  background-color: var(--bg-panel, #fff);
  box-shadow: 0 0 0 3px rgba(0,0,0,0.05);
}
:global([data-theme="ink-wash"]) .glass-select,
:global([data-theme="rosewood"]) .glass-select,
:global([data-theme="star-sea"]) .glass-select {
  background-color: rgba(255,255,255,0.05);
  border-color: rgba(255,255,255,0.1);
  color: #fff;
  background-image: url('data:image/svg+xml;utf8,<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="%23ffffff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" xmlns="http://www.w3.org/2000/svg"><polyline points="6 9 12 15 18 9"></polyline></svg>');
}
:global([data-theme="ink-wash"]) .glass-select:focus,
:global([data-theme="rosewood"]) .glass-select:focus,
:global([data-theme="star-sea"]) .glass-select:focus {
  background-color: rgba(255,255,255,0.15);
  border-color: var(--accent-amber);
}

.col-date {
  font-size: 0.85rem;
  font-family: monospace;
  color: var(--text-soft);
}

.col-ops {
  display: flex;
  gap: 8px;
}
.icon-btn {
  width: 32px;
  height: 32px;
  border-radius: 10px;
  border: none;
  background: transparent;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s;
}
.icon-btn.reset {
  color: #3b82f6;
  background: rgba(59, 130, 246, 0.1);
}
.icon-btn.reset:hover {
  background: rgba(59, 130, 246, 0.2);
}
.icon-btn.danger {
  color: #ef4444;
  background: rgba(239, 68, 68, 0.1);
}
.icon-btn.danger:hover {
  background: rgba(239, 68, 68, 0.2);
}

/* ── Dialogs ── */
.glass-dialog-overlay {
  position: fixed;
  inset: 0;
  z-index: 10000;
  background: rgba(0,0,0,0.2);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  display: flex;
  align-items: center;
  justify-content: center;
}
.glass-dialog {
  width: 100%;
  max-width: 400px;
  background: var(--glass-panel-bg, rgba(255, 255, 255, 0.85));
  backdrop-filter: blur(24px) saturate(180%);
  -webkit-backdrop-filter: blur(24px) saturate(180%);
  border: 1px solid var(--glass-border-highlight, rgba(255, 255, 255, 0.8));
  border-radius: 24px;
  padding: 32px;
  box-shadow: 0 24px 48px rgba(0,0,0,0.1);
}
:global([data-theme="ink-wash"]) .glass-dialog,
:global([data-theme="rosewood"]) .glass-dialog,
:global([data-theme="star-sea"]) .glass-dialog {
  background: rgba(20, 20, 20, 0.85);
  border-color: rgba(255,255,255,0.1);
}

.dialog-title {
  margin: 0 0 24px;
  font-size: 1.25rem;
  font-weight: 800;
  color: var(--text-main);
  text-align: center;
}
.dialog-desc {
  margin: 0 0 24px;
  font-size: 0.9rem;
  color: var(--text-soft);
  text-align: center;
  line-height: 1.5;
}
.dialog-field {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 32px;
}
.dialog-field label {
  font-size: 0.75rem;
  font-weight: 700;
  color: var(--text-soft);
}
.dialog-field input {
  padding: 12px 16px;
  border-radius: 12px;
  border: 1px solid var(--glass-border-shadow, rgba(0,0,0,0.1));
  background: rgba(255,255,255,0.5);
  font-size: 1rem;
  outline: none;
}
:global([data-theme="ink-wash"]) .dialog-field input,
:global([data-theme="rosewood"]) .dialog-field input,
:global([data-theme="star-sea"]) .dialog-field input {
  background: rgba(0,0,0,0.3);
  color: #fff;
}

.dialog-actions {
  display: flex;
  gap: 12px;
  justify-content: stretch;
}
.dialog-actions > * {
  flex: 1;
  justify-content: center;
}

.glass-pop-enter-active,
.glass-pop-leave-active {
  transition: opacity 0.3s ease, transform 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}
.glass-pop-enter-from,
.glass-pop-leave-to {
  opacity: 0;
  transform: scale(0.96) translateY(10px);
}

.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px;
  color: var(--text-soft);
  gap: 16px;
}
.spinner {
  width: 32px;
  height: 32px;
  border: 3px solid var(--glass-border-shadow, rgba(0,0,0,0.1));
  border-top-color: var(--text-main);
  border-radius: 50%;
  animation: spin 1s linear infinite;
}
@keyframes spin {
  to { transform: rotate(360deg); }
}

@media (max-width: 960px) {
  .table-header {
    display: none;
  }
  .table-row {
    grid-template-columns: 1fr;
    gap: 12px;
    padding: 16px;
  }
  .col-id { display: none; }
  .col-ops { justify-content: flex-end; }
  .form-grid { grid-template-columns: 1fr; }
  .form-footer { flex-direction: column; gap: 16px; align-items: stretch; }
  .actions { flex-direction: column; }
}
</style>
