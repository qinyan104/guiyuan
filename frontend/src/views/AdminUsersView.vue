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

const roleConfig: Record<string, { label: string; color: string; bg: string }> = {
  SUPER_ADMIN: { label: '超级管理员', color: '#b45309', bg: 'rgba(180, 83, 9, 0.12)' },
  ADMIN: { label: '管理员', color: '#6a4b2f', bg: 'rgba(106, 75, 47, 0.12)' },
  USER: { label: '普通用户', color: '#666', bg: 'rgba(100, 100, 100, 0.08)' },
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
  <div>
    <div class="page-header">
      <div>
        <h1 class="page-title">用户管理</h1>
        <p class="page-desc">管理家族成员账号与权限</p>
      </div>
      <button class="btn-create" @click="showCreateForm = true">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
        创建用户
      </button>
    </div>

    <!-- Role Tabs -->
    <div class="role-tabs">
      <button
        v-for="tab in (['all', 'SUPER_ADMIN', 'ADMIN', 'USER'] as const)"
        :key="tab"
        class="role-tab"
        :class="{ 'role-tab--active': activeTab === tab }"
        @click="activeTab = tab"
      >
        {{ tab === 'all' ? '全部' : roleConfig[tab].label }}
        <span class="role-tab__count">{{ tabCounts[tab] }}</span>
      </button>
    </div>

    <!-- Create User Form -->
    <div v-if="showCreateForm" class="create-form">
      <div class="create-form__row">
        <input v-model="newUsername" type="text" placeholder="用户名" class="form-input" />
        <input v-model="newPassword" type="password" placeholder="密码" class="form-input" />
        <input v-model="newNickname" type="text" placeholder="昵称（可选）" class="form-input" />
      </div>
      <div class="create-form__bottom">
        <div class="role-select">
          <span class="role-select__label">角色：</span>
          <label class="role-radio">
            <input v-model="newRole" type="radio" value="USER" />
            <span class="role-radio__mark" style="--rcolor: #666">普通用户</span>
          </label>
          <label class="role-radio">
            <input v-model="newRole" type="radio" value="ADMIN" />
            <span class="role-radio__mark" style="--rcolor: #6a4b2f">管理员</span>
          </label>
        </div>
        <div class="create-form__actions">
          <button class="btn-confirm" @click="handleCreate">确认创建</button>
          <button class="btn-cancel" @click="showCreateForm = false">取消</button>
        </div>
      </div>
    </div>

    <div v-if="loading" class="loading-state">加载中...</div>

    <div v-else class="user-table">
      <div class="user-table__header">
        <span class="col-id">ID</span>
        <span class="col-user">用户名</span>
        <span class="col-nick">昵称</span>
        <span class="col-role">角色</span>
        <span class="col-date">创建时间</span>
        <span class="col-ops">操作</span>
      </div>
      <div v-for="user in filteredUsers" :key="user.id" class="user-table__row" :class="{ 'user-table__row--protected': isProtected(user) }">
        <span class="col-id">{{ user.id }}</span>
        <span class="col-user">
          {{ user.username }}
          <span v-if="isProtected(user)" class="protected-badge" title="超级管理员不可删除">&#x1F512;</span>
        </span>
        <span class="col-nick">{{ user.nickname || '-' }}</span>
        <span class="col-role">
          <select
            v-if="canManageRoles && !isProtected(user)"
            :value="user.role"
            class="role-select-inline"
            @change="handleRoleChange(user.id, ($event.target as HTMLSelectElement).value)"
          >
            <option value="USER">普通用户</option>
            <option value="ADMIN">管理员</option>
          </select>
          <span
            v-else
            class="role-badge"
            :style="{ background: roleConfig[user.role]?.bg || '#eee', color: roleConfig[user.role]?.color || '#333' }"
          >
            {{ roleConfig[user.role]?.label || user.role }}
          </span>
        </span>
        <span class="col-date">{{ formatDate(user.createdAt) }}</span>
        <span class="col-ops">
          <button class="action-btn action-btn--reset" @click="resetUserId = user.id; resetNewPassword = ''">重置密码</button>
          <button
            v-if="!isProtected(user)"
            class="action-btn action-btn--delete"
            @click="deleteUserId = user.id"
          >删除</button>
        </span>
      </div>
    </div>

    <!-- Reset Password Dialog -->
    <Teleport to="body">
      <div v-if="resetUserId !== null" class="dialog-overlay" @click.self="resetUserId = null">
        <div class="dialog">
          <h2 class="dialog__title">重置密码</h2>
          <div class="dialog__field">
            <label>新密码</label>
            <input v-model="resetNewPassword" type="password" placeholder="输入新密码" @keyup.enter="handleResetPassword" />
          </div>
          <div class="dialog__actions">
            <button class="btn-cancel" @click="resetUserId = null">取消</button>
            <button class="btn-confirm" @click="handleResetPassword">确认</button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- Delete Confirm Dialog -->
    <Teleport to="body">
      <div v-if="deleteUserId !== null" class="dialog-overlay" @click.self="deleteUserId = null">
        <div class="dialog">
          <h2 class="dialog__title">确认删除</h2>
          <p class="dialog__desc">此操作不可撤销，确认要删除该用户吗？</p>
          <div class="dialog__actions">
            <button class="btn-cancel" @click="deleteUserId = null">取消</button>
            <button class="btn-danger" @click="handleDelete(deleteUserId!)">删除</button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<style scoped>
.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 1.25rem;
}

.page-title {
  font-size: 1.5rem;
  font-family: 'Noto Serif SC', serif;
  font-weight: 700;
  color: var(--text-main, #1a1a1a);
  margin: 0;
}

.page-desc {
  color: var(--text-soft, #888);
  font-size: 0.85rem;
  margin: 0.25rem 0 0;
}

.btn-create {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.55rem 1rem;
  background: linear-gradient(135deg, var(--accent-ink, #6a4b2f), var(--accent-amber, #a96e35));
  color: #fff;
  border: none;
  border-radius: 10px;
  font-size: 0.85rem;
  font-weight: 700;
  cursor: pointer;
}

/* ── Role Tabs ── */
.role-tabs {
  display: flex;
  gap: 0.35rem;
  margin-bottom: 1.25rem;
  border-bottom: 1px solid var(--border-color, rgba(0,0,0,0.06));
  padding-bottom: 0;
}

.role-tab {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.55rem 1rem;
  background: none;
  border: none;
  border-bottom: 2px solid transparent;
  color: var(--text-soft, #888);
  font-size: 0.82rem;
  font-weight: 600;
  cursor: pointer;
  transition: color 0.15s, border-color 0.15s;
}

.role-tab:hover {
  color: var(--text-main, #1a1a1a);
}

.role-tab--active {
  color: var(--accent-ink, #6a4b2f);
  border-bottom-color: var(--accent-ink, #6a4b2f);
}

.role-tab__count {
  display: inline-block;
  padding: 0.1rem 0.4rem;
  background: var(--bg-shell, #f0ebe3);
  border-radius: 999px;
  font-size: 0.68rem;
  font-weight: 700;
  color: var(--text-soft, #888);
}

.role-tab--active .role-tab__count {
  background: rgba(106, 75, 47, 0.12);
  color: var(--accent-ink, #6a4b2f);
}

/* ── Create Form ── */
.create-form {
  background: var(--bg-panel, #fff);
  border: 1px solid var(--border-color, rgba(0,0,0,0.08));
  border-radius: 12px;
  padding: 1rem;
  margin-bottom: 1.25rem;
}

.create-form__row {
  display: flex;
  gap: 0.6rem;
  margin-bottom: 0.75rem;
}

.form-input {
  flex: 1;
  padding: 0.45rem 0.65rem;
  border: 1px solid var(--border-color, rgba(0,0,0,0.12));
  border-radius: 8px;
  background: var(--bg-shell, #f5f0e8);
  color: var(--text-main, #1a1a1a);
  font-size: 0.82rem;
  outline: none;
}

.form-input:focus {
  border-color: var(--accent-amber, #a96e35);
}

.create-form__bottom {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.role-select {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.role-select__label {
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--text-sub, #555);
}

.role-radio {
  cursor: pointer;
}

.role-radio input {
  display: none;
}

.role-radio__mark {
  display: inline-block;
  padding: 0.3rem 0.7rem;
  border: 1px solid var(--border-color, rgba(0,0,0,0.12));
  border-radius: 8px;
  font-size: 0.78rem;
  font-weight: 600;
  color: var(--text-soft, #888);
  transition: all 0.15s;
}

.role-radio input:checked + .role-radio__mark {
  border-color: var(--rcolor, #6a4b2f);
  color: var(--rcolor, #6a4b2f);
  background: rgba(106, 75, 47, 0.06);
}

.create-form__actions {
  display: flex;
  gap: 0.5rem;
}

.btn-confirm {
  padding: 0.4rem 0.9rem;
  background: var(--accent-ink, #6a4b2f);
  color: #fff;
  border: none;
  border-radius: 8px;
  font-weight: 600;
  font-size: 0.8rem;
  cursor: pointer;
}

.btn-cancel {
  padding: 0.4rem 0.9rem;
  background: transparent;
  border: 1px solid var(--border-color, rgba(0,0,0,0.12));
  border-radius: 8px;
  color: var(--text-main, #1a1a1a);
  font-weight: 600;
  font-size: 0.8rem;
  cursor: pointer;
}

.btn-danger {
  padding: 0.4rem 0.9rem;
  background: #ef4444;
  color: #fff;
  border: none;
  border-radius: 8px;
  font-weight: 600;
  font-size: 0.8rem;
  cursor: pointer;
}

/* ── User Table ── */
.user-table {
  background: var(--bg-panel, #fff);
  border: 1px solid var(--border-color, rgba(0,0,0,0.08));
  border-radius: 12px;
  overflow: hidden;
}

.user-table__header {
  display: grid;
  grid-template-columns: 50px 1.2fr 1fr 120px 110px 140px;
  gap: 0.5rem;
  padding: 0.65rem 1rem;
  background: var(--bg-shell, #f5f0e8);
  font-size: 0.7rem;
  font-weight: 700;
  color: var(--text-soft, #888);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.user-table__row {
  display: grid;
  grid-template-columns: 50px 1.2fr 1fr 120px 110px 140px;
  gap: 0.5rem;
  padding: 0.6rem 1rem;
  align-items: center;
  font-size: 0.82rem;
  color: var(--text-main, #1a1a1a);
  border-top: 1px solid var(--border-color, rgba(0,0,0,0.04));
  transition: background 0.1s;
}

.user-table__row--protected {
  background: rgba(180, 83, 9, 0.03);
}

.col-id { font-weight: 600; }

.col-user {
  display: flex;
  align-items: center;
  gap: 0.35rem;
}

.protected-badge {
  font-size: 0.72rem;
}

.col-ops {
  display: flex;
  gap: 0.4rem;
}

.action-btn {
  padding: 0.25rem 0.55rem;
  border: none;
  border-radius: 6px;
  font-size: 0.7rem;
  font-weight: 600;
  cursor: pointer;
}

.action-btn--reset {
  background: rgba(59, 130, 246, 0.1);
  color: #3b82f6;
}

.action-btn--reset:hover {
  background: rgba(59, 130, 246, 0.2);
}

.action-btn--delete {
  background: rgba(239, 68, 68, 0.1);
  color: #ef4444;
}

.action-btn--delete:hover {
  background: rgba(239, 68, 68, 0.2);
}

.role-badge {
  display: inline-block;
  padding: 0.15rem 0.5rem;
  border-radius: 999px;
  font-size: 0.68rem;
  font-weight: 700;
}

.role-select-inline {
  padding: 0.2rem 0.4rem;
  border: 1px solid var(--border-color, rgba(0,0,0,0.12));
  border-radius: 6px;
  background: var(--bg-shell, #f5f0e8);
  color: var(--text-main, #1a1a1a);
  font-size: 0.75rem;
  font-weight: 600;
  cursor: pointer;
  outline: none;
}

.role-select-inline:focus {
  border-color: var(--accent-amber, #a96e35);
}

.loading-state {
  text-align: center;
  padding: 2rem;
  color: var(--text-soft, #888);
}

/* ── Dialogs ── */
.dialog-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.4);
  backdrop-filter: blur(6px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.dialog {
  background: var(--bg-panel, #fff);
  border: 1px solid var(--border-color, rgba(0,0,0,0.08));
  border-radius: 16px;
  padding: 1.5rem;
  width: 100%;
  max-width: 360px;
  box-shadow: 0 24px 64px rgba(0,0,0,0.15);
}

.dialog__title {
  margin: 0 0 0.75rem;
  font-size: 1.05rem;
  font-weight: 700;
  color: var(--text-main, #1a1a1a);
}

.dialog__desc {
  margin: 0 0 0.75rem;
  color: var(--text-soft, #888);
  font-size: 0.85rem;
}

.dialog__field {
  margin-bottom: 0.75rem;
}

.dialog__field label {
  display: block;
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--text-sub, #555);
  margin-bottom: 0.25rem;
}

.dialog__field input {
  width: 100%;
  padding: 0.45rem 0.65rem;
  border: 1px solid var(--border-color, rgba(0,0,0,0.12));
  border-radius: 8px;
  background: var(--bg-shell, #f5f0e8);
  color: var(--text-main, #1a1a1a);
  font-size: 0.82rem;
  outline: none;
  box-sizing: border-box;
}

.dialog__field input:focus {
  border-color: var(--accent-amber, #a96e35);
}

.dialog__actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
  margin-top: 0.75rem;
}
</style>
