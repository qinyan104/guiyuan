<script setup lang="ts">
import { ref, computed } from 'vue'
import { getUsername, isSuperAdmin } from '../api/auth'
import { changePassword, changeNickname, uploadAvatar } from '../api/profile'
import { downloadBackup, adminRestoreDatabase, adminCheckConsistency, type ConsistencyIssue } from '../api/admin'
import ConfirmDialog from '../components/ConfirmDialog.vue'

const avatarUrl = ref('')
const avatarUploading = ref(false)
const fileInputRef = ref<HTMLInputElement | null>(null)

async function handleAvatarUpload(event: Event) {
  const input = event.target as HTMLInputElement
  if (!input.files?.length) return
  const file = input.files[0]
  if (!file.type.startsWith('image/')) {
    alert('仅支持图片文件')
    return
  }
  if (file.size > 5 * 1024 * 1024) {
    alert('图片大小不能超过 5MB')
    return
  }
  avatarUploading.value = true
  try {
    const url = await uploadAvatar(file)
    avatarUrl.value = url
  } catch (err: any) {
    alert('头像上传失败: ' + (err.message || '未知错误'))
  } finally {
    avatarUploading.value = false
    input.value = '' // reset
  }
}

const currentUsername = ref(getUsername() ?? '')
const userInitials = computed(() => currentUsername.value ? currentUsername.value.charAt(0).toUpperCase() : '总')

const oldPassword = ref('')
const newPassword = ref('')
const confirmPassword = ref('')
const passwordMsg = ref('')
const passwordError = ref('')
const passwordLoading = ref(false)

const nickname = ref('')
const nicknameMsg = ref('')
const nicknameLoading = ref(false)

const backupLoading = ref(false)
const backupError = ref('')

const restoreFile = ref<File | null>(null)
const restorePending = ref(false)
const showRestoreConfirm = ref(false)
const restoreFileInputRef = ref<HTMLInputElement | null>(null)

const consistencyResult = ref<ConsistencyIssue[]>([])
const consistencyRunning = ref(false)

const groupedIssues = computed(() => {
  const groups: Record<string, ConsistencyIssue[]> = {}
  for (const issue of consistencyResult.value) {
    if (!groups[issue.type]) groups[issue.type] = []
    groups[issue.type].push(issue)
  }
  return groups
})

const typeLabels: Record<string, string> = {
  orphan: '孤立人物',
  date_conflict: '生卒日期矛盾',
  status_conflict: '在世状态矛盾',
  empty_family: '空家族',
}

async function handleBackup() {
  backupError.value = ''
  backupLoading.value = true
  try {
    await downloadBackup()
  } catch (err: any) {
    backupError.value = err.message || '备份失败'
  } finally {
    backupLoading.value = false
  }
}

async function handleRestore() {
  if (!restoreFile.value) return
  restorePending.value = true
  try {
    const msg = await adminRestoreDatabase(restoreFile.value)
    alert(msg)
    window.location.reload()
  } catch (e: any) {
    alert(e.message || '数据库还原失败')
  } finally {
    restorePending.value = false
  }
}

async function handleConsistencyCheck() {
  consistencyRunning.value = true
  try {
    const report = await adminCheckConsistency()
    consistencyResult.value = report.issues
  } catch (e: any) {
    alert(e.message || '一致性检查失败')
  } finally {
    consistencyRunning.value = false
  }
}

function onFileSelected(e: Event) {
  const input = e.target as HTMLInputElement
  if (input.files?.length) {
    restoreFile.value = input.files[0]
  }
}

async function handleChangePassword() {
  passwordMsg.value = ''
  passwordError.value = ''

  if (!oldPassword.value.trim()) {
    passwordError.value = '请输入当前密码'
    return
  }
  if (newPassword.value.length < 4) {
    passwordError.value = '新密码至少4个字符'
    return
  }
  if (newPassword.value !== confirmPassword.value) {
    passwordError.value = '两次输入的新密码不一致'
    return
  }

  passwordLoading.value = true
  try {
    await changePassword(oldPassword.value, newPassword.value)
    passwordMsg.value = '通行密钥重铸成功'
    oldPassword.value = ''
    newPassword.value = ''
    confirmPassword.value = ''
  } catch (err: any) {
    passwordError.value = err.response?.data?.message || '重铸失败，请检查原密码是否正确'
  } finally {
    passwordLoading.value = false
  }
}

async function handleChangeNickname() {
  nicknameMsg.value = ''
  if (!nickname.value.trim()) return

  nicknameLoading.value = true
  try {
    await changeNickname(nickname.value.trim())
    nicknameMsg.value = '公开身份标识更新成功'
  } catch {
    nicknameMsg.value = '更新身份失败，请稍后重试'
  } finally {
    nicknameLoading.value = false
  }
}
</script>

<template>
  <div class="settings-view-root">
    <div class="settings-view">
      <header class="poetic-header">
        <div class="poetic-header__main">
          <div class="poetic-eyebrow">PREFERENCES // SETTINGS</div>
          <h1 class="poetic-title">偏好<span class="text-italic">设置</span></h1>
        </div>
        <div class="poetic-header__extra">
          <p class="poetic-quote">
            工欲善其事，必先利其器。<br/>
            于此调和规矩，方成方圆。
          </p>
        </div>
      </header>

    <div class="bento-grid">
      <!-- Big Profile Identity Card -->
      <div class="bento-card profile-card">
        <div class="avatar-glow-ring" @click="fileInputRef?.click()" style="cursor: pointer;">
          <img v-if="avatarUrl" :src="avatarUrl" class="large-avatar-img" />
          <div v-else class="large-avatar">{{ userInitials }}</div>
        </div>
        <input ref="fileInputRef" type="file" accept="image/*" style="display: none" @change="handleAvatarUpload" />
        <div class="profile-info">
          <span class="profile-status">已验证通行证</span>
          <h2 class="profile-name">{{ currentUsername }}</h2>
          <span class="profile-role">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
            档案系统注册编委
          </span>
        </div>
      </div>

      <!-- Detail Forms Grid -->
      <div class="forms-container">
        
        <!-- Nickname Card -->
        <div class="bento-card nickname-card">
          <div class="card-header">
            <h3 class="card-title">公开身份标识</h3>
            <p class="card-subtitle">系统内对外展出的别名或真实姓名，若留空则自动显示登录账号。</p>
          </div>
          <div class="glass-form-row">
            <input
              v-model="nickname"
              type="text"
              placeholder="输入全新的身份标识..."
              class="glass-input"
              @keyup.enter="handleChangeNickname"
            />
            <button class="bento-btn primary" :disabled="nicknameLoading" @click="handleChangeNickname">
              {{ nicknameLoading ? '验证中...' : '更新身份' }}
            </button>
          </div>
          <transition name="fade-slide">
            <p v-if="nicknameMsg" class="feedback-msg success">{{ nicknameMsg }}</p>
          </transition>
        </div>

        <!-- Password Card -->
        <div class="bento-card password-card">
          <div class="card-header">
            <h3 class="card-title">系统通行密钥</h3>
            <p class="card-subtitle">为保障数字档案馆资产安全，请定期进行密钥轮换更新。</p>
          </div>
          <div class="glass-form-col">
            <div class="field">
              <label>当前通行密钥</label>
              <input v-model="oldPassword" type="password" class="glass-input" placeholder="输入当前密码进行权限验证" />
            </div>
            <div class="field-group">
              <div class="field">
                <label>新设密钥</label>
                <input v-model="newPassword" type="password" class="glass-input" placeholder="新密码要求不少于 4 个字符" />
              </div>
              <div class="field">
                <label>确认密钥</label>
                <input
                  v-model="confirmPassword"
                  type="password"
                  class="glass-input"
                  placeholder="请再次输入新密码"
                  @keyup.enter="handleChangePassword"
                />
              </div>
            </div>
            
            <div class="form-actions">
              <button class="bento-btn primary" :disabled="passwordLoading" @click="handleChangePassword">
                {{ passwordLoading ? '重铸进程中...' : '重铸通行密钥' }}
              </button>
            </div>
            <transition name="fade-slide">
              <div v-if="passwordError" class="feedback-msg error">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                {{ passwordError }}
              </div>
              <div v-else-if="passwordMsg" class="feedback-msg success">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                {{ passwordMsg }}
              </div>
            </transition>
          </div>
        </div>

        <!-- Data Backup Card (SUPER_ADMIN only) -->
        <div v-if="isSuperAdmin()" class="bento-card backup-card">
          <div class="card-header">
            <h3 class="card-title">数据备份</h3>
            <p class="card-subtitle">导出数据库完整备份，包含所有族谱、人物和用户数据。</p>
          </div>
          <div class="glass-form-row">
            <button class="bento-btn primary" :disabled="backupLoading" @click="handleBackup">
              {{ backupLoading ? '备份生成中...' : '创建备份并下载' }}
            </button>
          </div>
          <transition name="fade-slide">
            <p v-if="backupError" class="feedback-msg error">{{ backupError }}</p>
          </transition>
        </div>

        <!-- Database Restore Card (SUPER_ADMIN only) -->
        <div v-if="isSuperAdmin()" class="settings-card">
          <h3>数据库还原</h3>
          <p class="settings-card__desc">
            从备份文件还原数据库。此操作<strong>不可逆</strong>，将覆盖当前全部数据。
          </p>
          <div class="restore-controls">
            <input
              ref="restoreFileInputRef"
              type="file"
              accept=".sql"
              @change="onFileSelected"
            />
            <button
              class="btn btn--danger"
              :disabled="!restoreFile || restorePending"
              @click="showRestoreConfirm = true"
            >
              {{ restorePending ? '还原中...' : '还原数据库' }}
            </button>
          </div>
        </div>

        <ConfirmDialog
          :modelValue="showRestoreConfirm"
          title="确认还原数据库"
          message="此操作不可逆，将覆盖当前全部数据。请确保已备份。"
          confirmLabel="确认还原"
          tone="danger"
          @confirm="showRestoreConfirm = false; handleRestore()"
          @cancel="showRestoreConfirm = false"
          @update:modelValue="(v: boolean) => { if (!v) showRestoreConfirm = false }"
        />

        <!-- Data Consistency Card (SUPER_ADMIN only) -->
        <div v-if="isSuperAdmin()" class="bento-card">
          <div class="card-header">
            <h3 class="card-title">数据一致性检查</h3>
            <p class="card-subtitle">扫描全库数据，检测孤立人物、日期矛盾、状态不一致等问题。</p>
          </div>
          <div class="glass-form-row">
            <button
              class="bento-btn primary"
              :disabled="consistencyRunning"
              @click="handleConsistencyCheck"
            >
              {{ consistencyRunning ? '检查中...' : '开始检查' }}
            </button>
          </div>

          <div v-if="consistencyResult.length > 0" class="consistency-report">
            <p class="consistency-summary">发现 {{ consistencyResult.length }} 个问题：</p>
            <details v-for="(group, type) in groupedIssues" :key="type" class="consistency-group">
              <summary>{{ typeLabels[type] || type }} ({{ group.length }})</summary>
              <ul>
                <li v-for="issue in group" :key="issue.personId + issue.detail">
                  <strong>{{ issue.personName || issue.personId }}</strong>
                  — {{ issue.detail }}
                </li>
              </ul>
            </details>
          </div>
          <p v-else-if="consistencyResult.length === 0 && !consistencyRunning" class="consistency-clean">
            未发现问题，数据一致性良好。
          </p>
        </div>

        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>.settings-view {
  display: flex;
  flex-direction: column;
  gap: 24px;
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

/* ── Bento Cards Core ── */
.bento-card {
  background: var(--glass-panel-bg, rgba(255, 255, 255, 0.6));
  backdrop-filter: blur(24px) saturate(180%);
  -webkit-backdrop-filter: blur(24px) saturate(180%);
  border: 1px solid var(--glass-border-highlight, rgba(255, 255, 255, 0.8));
  border-radius: 20px;
  box-shadow: 0 24px 48px rgba(0, 0, 0, 0.05), inset 0 1px 0 rgba(255,255,255,0.5);
  padding: 32px;
}
:global([data-theme="ink-wash"]) .bento-card,
:global([data-theme="rosewood"]) .bento-card,
:global([data-theme="star-sea"]) .bento-card {
  background: rgba(20, 20, 20, 0.5);
  border-color: rgba(255,255,255,0.1);
  box-shadow: 0 24px 48px rgba(0,0,0,0.2);
}

.bento-grid {
  display: grid;
  grid-template-columns: 320px 1fr;
  gap: 24px;
  align-items: start;
}

/* ── Profile Identity Card ── */
.profile-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: 48px 32px;
  position: relative;
  overflow: hidden;
}

/* Background atmospheric glow */
.profile-card::before {
  content: '';
  position: absolute;
  top: -50%;
  left: -50%;
  width: 200%;
  height: 200%;
  background: radial-gradient(circle at center, var(--accent-amber) 0%, transparent 40%);
  opacity: 0.05;
  pointer-events: none;
}

.avatar-glow-ring {
  width: 100px;
  height: 100px;
  border-radius: 50%;
  background: linear-gradient(135deg, var(--glass-border-highlight), transparent);
  padding: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 24px;
  box-shadow: 0 16px 32px rgba(0,0,0,0.1);
  position: relative;
}
.avatar-glow-ring::after {
  content: '';
  position: absolute;
  inset: -10px;
  border-radius: 50%;
  background: conic-gradient(from 0deg, transparent, var(--accent-amber), transparent);
  opacity: 0.3;
  animation: rotate 6s linear infinite;
  z-index: -1;
}

@keyframes rotate {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.large-avatar {
  width: 100%;
  height: 100%;
  background: var(--bg-panel, #fff);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 2.5rem;
  font-weight: 800;
  font-family: 'Noto Serif SC', serif;
  color: var(--text-main);
  box-shadow: inset 0 2px 4px rgba(0,0,0,0.05);
}
:global([data-theme="ink-wash"]) .large-avatar,
:global([data-theme="rosewood"]) .large-avatar,
:global([data-theme="star-sea"]) .large-avatar {
  background: rgba(30,30,30,1);
  color: #fff;
}

.profile-info {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  position: relative;
  z-index: 1;
}

.profile-status {
  font-size: 0.7rem;
  font-weight: 800;
  letter-spacing: 0.15em;
  color: var(--accent-amber);
  text-transform: uppercase;
  background: rgba(0,0,0,0.04);
  padding: 4px 10px;
  border-radius: 999px;
}
:global([data-theme="ink-wash"]) .profile-status,
:global([data-theme="rosewood"]) .profile-status,
:global([data-theme="star-sea"]) .profile-status {
  background: rgba(255,255,255,0.06);
}

.profile-name {
  font-family: 'Noto Serif SC', serif;
  font-size: 1.8rem;
  font-weight: 800;
  color: var(--text-main);
  margin: 0;
  letter-spacing: 0.05em;
}

.profile-role {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 0.85rem;
  color: var(--text-soft);
  font-family: monospace;
}

/* ── Detail Forms Grid ── */
.forms-container {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.card-header {
  margin-bottom: 24px;
}
.card-title {
  font-size: 1.1rem;
  font-weight: 700;
  color: var(--text-main);
  margin: 0 0 6px;
}
.card-subtitle {
  font-size: 0.85rem;
  color: var(--text-soft);
  margin: 0;
}

.glass-form-row {
  display: flex;
  gap: 12px;
  align-items: stretch;
}

.glass-form-col {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.field-group {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.field label {
  font-size: 0.75rem;
  font-weight: 700;
  color: var(--text-soft);
  letter-spacing: 0.05em;
}

.glass-input {
  width: 100%;
  padding: 14px 16px;
  border-radius: 14px;
  border: 1px solid var(--glass-border-shadow, rgba(0,0,0,0.1));
  background: rgba(255,255,255,0.4);
  color: var(--text-main);
  font-size: 0.95rem;
  outline: none;
  transition: all 0.2s ease;
  box-sizing: border-box;
}
:global([data-theme="ink-wash"]) .glass-input,
:global([data-theme="rosewood"]) .glass-input,
:global([data-theme="star-sea"]) .glass-input {
  background: rgba(0,0,0,0.3);
  border-color: rgba(255,255,255,0.1);
  color: #fff;
}
.glass-input:focus {
  background: var(--bg-panel, #fff);
  border-color: var(--text-main);
  box-shadow: 0 0 0 4px rgba(0,0,0,0.04);
}

.form-actions {
  display: flex;
  justify-content: flex-start;
  margin-top: 8px;
}

/* ── Buttons ── */
.bento-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 0 24px;
  height: 48px;
  border-radius: 14px;
  font-size: 0.9rem;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.2s ease;
  border: none;
  white-space: nowrap;
}
.bento-btn.primary {
  background: var(--text-main);
  color: var(--bg-panel, #fff);
  box-shadow: 0 8px 16px rgba(0,0,0,0.1);
}
.bento-btn.primary:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 12px 24px rgba(0,0,0,0.15);
}
.bento-btn.primary:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

/* ── Feedback Messages ── */
.feedback-msg {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-size: 0.8rem;
  font-weight: 600;
  margin: 16px 0 0;
  padding: 10px 16px;
  border-radius: 10px;
}
.feedback-msg.success {
  background: rgba(22, 163, 74, 0.1);
  color: #16a34a;
}
.feedback-msg.error {
  background: rgba(239, 68, 68, 0.1);
  color: #ef4444;
}

.fade-slide-enter-active,
.fade-slide-leave-active {
  transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}
.fade-slide-enter-from,
.fade-slide-leave-to {
  opacity: 0;
  transform: translateY(-5px);
}

.large-avatar-img {
  width: 100%;
  height: 100%;
  border-radius: 50%;
  object-fit: cover;
}

@media (max-width: 960px) {
  .bento-grid {
    grid-template-columns: 1fr;
  }
  .glass-form-row {
    flex-direction: column;
  }
  .bento-btn {
    width: 100%;
  }
  .field-group {
    grid-template-columns: 1fr;
  }
}
</style>
