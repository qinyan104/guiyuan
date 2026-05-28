<script setup lang="ts">
import { useFeedback } from '../composables/useFeedback'
import FeedbackStrip from '../components/FeedbackStrip.vue'
import { ref, computed } from 'vue'
import { getUsername, isSuperAdmin } from '../api/auth'
import { changePassword, changeNickname, uploadAvatar } from '../api/profile'
import { downloadBackup, adminRestoreDatabase, adminCheckConsistency, type ConsistencyIssue } from '../api/admin'
import ConfirmDialog from '../components/ConfirmDialog.vue'

const feedback = useFeedback()

const section = ref<'profile' | 'account' | 'system'>('profile')

// ── Avatar ──
const avatarUrl = ref('')
const avatarUploading = ref(false)
const fileInputRef = ref<HTMLInputElement | null>(null)

async function handleAvatarUpload(event: Event) {
  const input = event.target as HTMLInputElement
  if (!input.files?.length) return
  const file = input.files[0]
  if (!file.type.startsWith('image/')) { feedback.errorMessage.value = '仅支持图片文件'; return }
  if (file.size > 5 * 1024 * 1024) { feedback.errorMessage.value = '图片大小不能超过 5MB'; return }
  avatarUploading.value = true
  try { avatarUrl.value = await uploadAvatar(file) }
  catch (err: any) { feedback.errorMessage.value = '头像上传失败: ' + (err.message || '未知错误') }
  finally { avatarUploading.value = false; input.value = '' }
}

const currentUsername = ref(getUsername() ?? '')
const userInitials = computed(() => currentUsername.value.charAt(0).toUpperCase())

// ── Nickname ──
const nickname = ref('')
const nicknameMsg = ref('')
const nicknameLoading = ref(false)

async function handleChangeNickname() {
  nicknameMsg.value = ''
  if (!nickname.value.trim()) return
  nicknameLoading.value = true
  try { await changeNickname(nickname.value.trim()); nicknameMsg.value = '已更新' }
  catch { nicknameMsg.value = '更新失败' }
  finally { nicknameLoading.value = false }
}

// ── Password ──
const oldPassword = ref('')
const newPassword = ref('')
const confirmPassword = ref('')
const passwordMsg = ref('')
const passwordError = ref('')
const passwordLoading = ref(false)

async function handleChangePassword() {
  passwordMsg.value = ''; passwordError.value = ''
  if (!oldPassword.value.trim()) { passwordError.value = '请输入当前密码'; return }
  if (newPassword.value.length < 4) { passwordError.value = '新密码至少4个字符'; return }
  if (newPassword.value !== confirmPassword.value) { passwordError.value = '两次输入不一致'; return }
  passwordLoading.value = true
  try {
    await changePassword(oldPassword.value, newPassword.value)
    passwordMsg.value = '已更新'
    oldPassword.value = ''; newPassword.value = ''; confirmPassword.value = ''
  } catch (err: any) { passwordError.value = err.response?.data?.message || '修改失败' }
  finally { passwordLoading.value = false }
}

// ── Backup ──
const backupLoading = ref(false)
const backupError = ref('')

async function handleBackup() {
  backupError.value = ''; backupLoading.value = true
  try { await downloadBackup() }
  catch (err: any) { backupError.value = err.message || '备份失败' }
  finally { backupLoading.value = false }
}

// ── Restore ──
const restoreFile = ref<File | null>(null)
const restorePending = ref(false)
const showRestoreConfirm = ref(false)

function onFileSelected(e: Event) { const t = e.target as HTMLInputElement; if (t.files?.length) restoreFile.value = t.files[0] }

async function handleRestore() {
  if (!restoreFile.value) return
  restorePending.value = true
  try { const msg = await adminRestoreDatabase(restoreFile.value); feedback.errorMessage.value = msg; window.location.reload() }
  catch (e: any) { feedback.errorMessage.value = e.message || '数据库还原失败' }
  finally { restorePending.value = false }
}

// ── Consistency ──
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
  orphan: '孤立人物', date_conflict: '生卒日期矛盾', status_conflict: '在世状态矛盾', empty_family: '空家族',
}

async function handleConsistencyCheck() {
  consistencyRunning.value = true
  try { const report = await adminCheckConsistency(); consistencyResult.value = report.issues }
  catch (e: any) { feedback.errorMessage.value = e.message || '检查失败' }
  finally { consistencyRunning.value = false }
}

const navItems = [
  { key: 'profile' as const, label: '个人资料' },
  { key: 'account' as const, label: '账户' },
  ...(isSuperAdmin() ? [{ key: 'system' as const, label: '系统' }] : []),
]
</script>

<template>
  <div class="root">
    <FeedbackStrip :errorMessage="feedback.errorMessage.value" :statusMessage="feedback.statusMessage.value" @dismiss="feedback.dismiss" />

    <header class="hero">
      <h1>设置</h1>
    </header>

    <div class="layout">
      <nav class="nav">
        <button
          v-for="item in navItems"
          :key="item.key"
          class="nav-item"
          :class="{ active: section === item.key }"
          @click="section = item.key"
        >
          {{ item.label }}
        </button>
      </nav>

      <main class="content">
        <!-- Profile -->
        <div v-if="section === 'profile'">
          <div class="card">
            <div class="avatar-row">
              <div class="avatar" @click="fileInputRef?.click()">
                <img v-if="avatarUrl" :src="avatarUrl" />
                <span v-else>{{ userInitials }}</span>
              </div>
              <input ref="fileInputRef" type="file" accept="image/*" hidden @change="handleAvatarUpload" />
              <div>
                <strong>{{ currentUsername }}</strong>
                <span>编委</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Account -->
        <div v-if="section === 'account'">
          <div class="card">
            <div class="field">
              <label>身份标识</label>
              <p>对外展示的名称，留空则使用登录账号。</p>
            </div>
            <div class="row">
              <input v-model="nickname" type="text" placeholder="输入身份标识…" @keyup.enter="handleChangeNickname" />
              <button class="btn" :disabled="nicknameLoading" @click="handleChangeNickname">{{ nicknameLoading ? '…' : '保存' }}</button>
            </div>
            <p v-if="nicknameMsg" class="ok">{{ nicknameMsg }}</p>
          </div>

          <div class="card">
            <div class="field">
              <label>通行密钥</label>
              <p>修改登录密码。</p>
            </div>
            <div class="col">
              <input v-model="oldPassword" type="password" placeholder="当前密码" />
              <div class="row">
                <input v-model="newPassword" type="password" placeholder="新密码（至少4位）" />
                <input v-model="confirmPassword" type="password" placeholder="确认新密码" @keyup.enter="handleChangePassword" />
              </div>
              <button class="btn" :disabled="passwordLoading" @click="handleChangePassword">{{ passwordLoading ? '…' : '更新密码' }}</button>
            </div>
            <p v-if="passwordError" class="err">{{ passwordError }}</p>
            <p v-if="passwordMsg" class="ok">{{ passwordMsg }}</p>
          </div>
        </div>

        <!-- System -->
        <div v-if="section === 'system'">
          <div class="card">
            <div class="field">
              <label>数据备份</label>
              <p>导出完整数据库备份。</p>
            </div>
            <button class="btn" :disabled="backupLoading" @click="handleBackup">{{ backupLoading ? '生成中…' : '下载备份' }}</button>
            <p v-if="backupError" class="err">{{ backupError }}</p>
          </div>

          <div class="card">
            <div class="field">
              <label>数据库还原</label>
              <p>从 SQL 备份文件还原。不可逆。</p>
            </div>
            <div class="row">
              <input type="file" accept=".sql" @change="onFileSelected" />
              <button class="btn btn--danger" :disabled="!restoreFile || restorePending" @click="showRestoreConfirm = true">{{ restorePending ? '还原中…' : '还原' }}</button>
            </div>
          </div>

          <div class="card">
            <div class="field">
              <label>一致性检查</label>
              <p>扫描孤立人物、日期矛盾等问题。</p>
            </div>
            <button class="btn" :disabled="consistencyRunning" @click="handleConsistencyCheck">{{ consistencyRunning ? '检查中…' : '开始检查' }}</button>
            <div v-if="consistencyResult.length > 0" class="issues">
              <details v-for="(group, type) in groupedIssues" :key="type">
                <summary>{{ typeLabels[type] || type }}（{{ group.length }}）</summary>
                <ul><li v-for="i in group" :key="i.personId + i.detail">{{ i.personName || i.personId }} — {{ i.detail }}</li></ul>
              </details>
            </div>
            <p v-else-if="consistencyResult.length === 0 && !consistencyRunning" class="ok">未发现问题。</p>
          </div>
        </div>
      </main>
    </div>

    <ConfirmDialog
      :modelValue="showRestoreConfirm"
      title="确认还原数据库"
      message="此操作不可逆。"
      confirmLabel="确认还原"
      tone="danger"
      @confirm="showRestoreConfirm = false; handleRestore()"
      @cancel="showRestoreConfirm = false"
      @update:model-value="(v: boolean) => { if (!v) showRestoreConfirm = false }"
    />
  </div>
</template>

<style scoped>
.root {
  max-width: 780px;
  margin: 0 auto;
  padding: 60px clamp(20px, 4vw, 48px) 80px;
}

.hero { margin-bottom: 32px; }
.hero h1 {
  font-size: var(--text-copy-14);
  font-weight: 600;
  color: var(--color-neutral-8);
  margin: 0;
  letter-spacing: 0.02em;
}

/* ── Layout ── */
.layout { display: flex; gap: 48px; }

/* ── Nav ── */
.nav {
  width: 140px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.nav-item {
  text-align: left;
  padding: 6px 12px;
  border: none;
  border-radius: var(--radius-sm);
  background: transparent;
  font-size: var(--text-copy-14);
  color: var(--color-neutral-6);
  cursor: pointer;
  transition: all var(--duration-fast);
}
.nav-item:hover { color: var(--color-neutral-9); background: var(--color-neutral-2); }
.nav-item.active { color: var(--color-neutral-10); background: var(--color-neutral-3); font-weight: 500; }

/* ── Content ── */
.content { flex: 1; min-width: 0; }

/* ── Card ── */
.card {
  background: var(--color-neutral-2);
  border: 1px solid var(--color-card-stroke);
  border-radius: var(--radius-md);
  padding: 20px;
  margin-bottom: 10px;
}

/* ── Avatar ── */
.avatar-row {
  display: flex;
  align-items: center;
  gap: 16px;
}
.avatar {
  width: 48px; height: 48px;
  border-radius: var(--radius-sm);
  background: var(--color-neutral-3);
  cursor: pointer;
  overflow: hidden;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: opacity var(--duration-fast);
}
.avatar:hover { opacity: 0.75; }
.avatar img { width: 100%; height: 100%; object-fit: cover; }
.avatar span {
  font-size: var(--text-title-20);
  font-weight: 500;
  color: var(--color-neutral-6);
}
.avatar-row strong { font-size: var(--text-copy-14); color: var(--color-neutral-9); display: block; }
.avatar-row span { font-size: var(--text-label-12); color: var(--color-neutral-6); }

/* ── Field ── */
.field { margin-bottom: 14px; }
.field label {
  font-size: var(--text-copy-14);
  font-weight: 500;
  color: var(--color-neutral-9);
}
.field p {
  font-size: var(--text-copy-13);
  color: var(--color-neutral-6);
  margin: 2px 0 0;
}

/* ── Layout ── */
.row { display: flex; gap: 8px; }
.col { display: flex; flex-direction: column; gap: 8px; }

/* ── Input ── */
input[type="text"],
input[type="password"] {
  flex: 1;
  padding: 6px 10px;
  border: 1px solid var(--color-neutral-4);
  border-radius: var(--radius-sm);
  background: var(--color-neutral-1);
  font-size: var(--text-copy-13);
  color: var(--color-neutral-9);
  outline: none;
  font-family: inherit;
  transition: border-color var(--duration-fast);
}
input:focus { border-color: var(--color-neutral-7); }
input[type="file"] {
  flex: 1;
  padding: 6px 10px;
  border: 1px solid var(--color-neutral-4);
  border-radius: var(--radius-sm);
  background: var(--color-neutral-1);
  font-size: var(--text-copy-13);
  color: var(--color-neutral-7);
}

/* ── Button ── */
.btn {
  padding: 6px 14px;
  border: 1px solid var(--color-neutral-4);
  border-radius: var(--radius-sm);
  background: var(--color-neutral-1);
  font-size: var(--text-copy-13);
  font-weight: 500;
  color: var(--color-neutral-8);
  cursor: pointer;
  white-space: nowrap;
  transition: all var(--duration-fast);
}
.btn:hover { background: var(--color-neutral-9); color: var(--color-neutral-1); border-color: var(--color-neutral-9); }
.btn:disabled { opacity: 0.5; cursor: default; }
.btn--danger:hover { background: var(--color-error); color: #fff; border-color: var(--color-error); }

/* ── Feedback ── */
.ok { font-size: var(--text-copy-13); color: var(--color-success); margin: 10px 0 0; }
.err { font-size: var(--text-copy-13); color: var(--color-error); margin: 10px 0 0; }

.issues { margin-top: 12px; }
.issues details { margin-bottom: 2px; }
.issues summary { font-size: var(--text-copy-13); color: var(--color-neutral-8); cursor: pointer; }
.issues ul { margin: 4px 0 0 16px; font-size: var(--text-copy-13); color: var(--color-neutral-7); }
</style>
