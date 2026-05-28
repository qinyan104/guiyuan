<script setup lang="ts">
import { useFeedback } from '../composables/useFeedback'
import FeedbackStrip from '../components/FeedbackStrip.vue'
import { ref, computed } from 'vue'
import { getUsername, isSuperAdmin } from '../api/auth'
import { changePassword, changeNickname, uploadAvatar } from '../api/profile'
import { downloadBackup, adminRestoreDatabase, adminCheckConsistency, type ConsistencyIssue } from '../api/admin'
import ConfirmDialog from '../components/ConfirmDialog.vue'

const feedback = useFeedback()

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

// ── Admin ──
const backupLoading = ref(false)
const backupError = ref('')
const restoreFile = ref<File | null>(null)
const restorePending = ref(false)
const showRestoreConfirm = ref(false)
const consistencyResult = ref<ConsistencyIssue[]>([])
const consistencyRunning = ref(false)

async function handleBackup() {
  backupError.value = ''; backupLoading.value = true
  try { await downloadBackup() } catch (err: any) { backupError.value = err.message || '备份失败' }
  finally { backupLoading.value = false }
}

function onFileSelected(e: Event) { const t = e.target as HTMLInputElement; if (t.files?.length) restoreFile.value = t.files[0] }

async function handleRestore() {
  if (!restoreFile.value) return
  restorePending.value = true
  try { const msg = await adminRestoreDatabase(restoreFile.value); feedback.errorMessage.value = msg; window.location.reload() }
  catch (e: any) { feedback.errorMessage.value = e.message || '数据库还原失败' }
  finally { restorePending.value = false }
}

const groupedIssues = computed(() => {
  const g: Record<string, ConsistencyIssue[]> = {}
  for (const i of consistencyResult.value) { if (!g[i.type]) g[i.type] = []; g[i.type].push(i) }
  return g
})
const typeLabels: Record<string, string> = { orphan: '孤立人物', date_conflict: '生卒日期矛盾', status_conflict: '在世状态矛盾', empty_family: '空家族' }

async function handleConsistencyCheck() {
  consistencyRunning.value = true
  try { const r = await adminCheckConsistency(); consistencyResult.value = r.issues }
  catch (e: any) { feedback.errorMessage.value = e.message || '检查失败' }
  finally { consistencyRunning.value = false }
}
</script>

<template>
  <div class="root">
    <FeedbackStrip :errorMessage="feedback.errorMessage.value" :statusMessage="feedback.statusMessage.value" @dismiss="feedback.dismiss" />

    <header class="hero">
      <h1>偏好设置</h1>
      <p class="hero-sub">管理账户与系统配置。</p>
    </header>

    <!-- Profile -->
    <section class="card card--profile">
      <div class="avatar" @click="fileInputRef?.click()">
        <img v-if="avatarUrl" :src="avatarUrl" />
        <span v-else>{{ userInitials }}</span>
      </div>
      <input ref="fileInputRef" type="file" accept="image/*" hidden @change="handleAvatarUpload" />
      <div>
        <h2>{{ currentUsername }}</h2>
        <span>编委</span>
      </div>
    </section>

    <!-- Account -->
    <section class="card">
      <h3>身份标识</h3>
      <p>对外展示的名称，留空则使用登录账号。</p>
      <div class="row">
        <input v-model="nickname" type="text" placeholder="输入身份标识…" @keyup.enter="handleChangeNickname" />
        <button class="btn" :disabled="nicknameLoading" @click="handleChangeNickname">{{ nicknameLoading ? '…' : '保存' }}</button>
      </div>
      <p v-if="nicknameMsg" class="msg ok">{{ nicknameMsg }}</p>
    </section>

    <section class="card">
      <h3>通行密钥</h3>
      <p>修改登录密码。新密码至少 4 个字符。</p>
      <div class="col">
        <input v-model="oldPassword" type="password" placeholder="当前密码" />
        <div class="row">
          <input v-model="newPassword" type="password" placeholder="新密码" />
          <input v-model="confirmPassword" type="password" placeholder="确认新密码" @keyup.enter="handleChangePassword" />
        </div>
        <button class="btn" :disabled="passwordLoading" @click="handleChangePassword">{{ passwordLoading ? '…' : '更新密码' }}</button>
      </div>
      <p v-if="passwordError" class="msg err">{{ passwordError }}</p>
      <p v-if="passwordMsg" class="msg ok">{{ passwordMsg }}</p>
    </section>

    <!-- Admin -->
    <template v-if="isSuperAdmin()">
      <section class="card">
        <h3>数据备份</h3>
        <p>导出完整数据库备份。</p>
        <button class="btn" :disabled="backupLoading" @click="handleBackup">{{ backupLoading ? '生成中…' : '下载备份' }}</button>
        <p v-if="backupError" class="msg err">{{ backupError }}</p>
      </section>

      <section class="card">
        <h3>数据库还原</h3>
        <p>从 SQL 备份文件还原。<strong>不可逆。</strong></p>
        <div class="row">
          <input type="file" accept=".sql" @change="onFileSelected" />
          <button class="btn btn--danger" :disabled="!restoreFile || restorePending" @click="showRestoreConfirm = true">{{ restorePending ? '还原中…' : '还原' }}</button>
        </div>
      </section>

      <section class="card">
        <h3>一致性检查</h3>
        <p>扫描孤立人物、日期矛盾等问题。</p>
        <button class="btn" :disabled="consistencyRunning" @click="handleConsistencyCheck">{{ consistencyRunning ? '检查中…' : '开始检查' }}</button>
        <div v-if="consistencyResult.length > 0" class="issues">
          <details v-for="(group, type) in groupedIssues" :key="type">
            <summary>{{ typeLabels[type] || type }}（{{ group.length }}）</summary>
            <ul><li v-for="i in group" :key="i.personId + i.detail">{{ i.personName || i.personId }} — {{ i.detail }}</li></ul>
          </details>
        </div>
        <p v-else-if="consistencyResult.length === 0 && !consistencyRunning" class="msg ok">未发现问题。</p>
      </section>
    </template>

    <ConfirmDialog
      :modelValue="showRestoreConfirm" title="确认还原数据库" message="此操作不可逆。"
      confirmLabel="确认还原" tone="danger"
      @confirm="showRestoreConfirm = false; handleRestore()"
      @cancel="showRestoreConfirm = false"
      @update:model-value="(v: boolean) => { if (!v) showRestoreConfirm = false }"
    />
  </div>
</template>

<style scoped>
.root {
  max-width: 880px;
  margin: 0 auto;
  padding: 60px clamp(20px, 4vw, 48px) 80px;
}

/* ── Hero ── */
.hero { margin-bottom: 40px; }
.hero h1 {
  font-family: var(--font-serif);
  font-size: var(--text-display-36);
  font-weight: 400;
  color: var(--color-neutral-10);
  margin: 0 0 8px;
  letter-spacing: 0.04em;
}
.hero-sub {
  font-size: var(--text-copy-14);
  color: var(--color-neutral-6);
  margin: 0;
}

/* ── Cards ── */
.card {
  background: var(--color-neutral-2);
  border: 1px solid var(--color-card-stroke);
  border-radius: var(--radius-xl);
  padding: 24px;
  margin-bottom: 12px;
}
.card h3 {
  font-family: var(--font-serif);
  font-size: var(--text-copy-16);
  font-weight: 400;
  color: var(--color-neutral-10);
  margin: 0 0 4px;
}
.card p {
  font-size: var(--text-copy-13);
  color: var(--color-neutral-6);
  margin: 0 0 16px;
  line-height: 1.6;
}

/* ── Profile card ── */
.card--profile {
  display: flex;
  align-items: center;
  gap: 20px;
  border-left: 3px solid var(--color-accent);
}
.avatar {
  width: 64px; height: 64px;
  border-radius: 50%;
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
  font-family: var(--font-serif);
  font-size: var(--text-title-24);
  color: var(--color-neutral-6);
}
.card--profile h2 {
  font-family: var(--font-serif);
  font-size: var(--text-title-20);
  font-weight: 400;
  color: var(--color-neutral-10);
  margin: 0 0 2px;
}
.card--profile span {
  font-size: var(--text-label-12);
  color: var(--color-neutral-6);
}

/* ── Form ── */
.row { display: flex; gap: 8px; }
.col { display: flex; flex-direction: column; gap: 10px; }

input[type="text"], input[type="password"] {
  flex: 1;
  padding: 9px 12px;
  border: 1px solid var(--color-neutral-4);
  border-radius: var(--radius-md);
  background: var(--color-neutral-1);
  font-size: var(--text-copy-14);
  color: var(--color-neutral-9);
  outline: none;
  font-family: inherit;
  transition: border-color var(--duration-fast) var(--ease-breath);
}
input:focus { border-color: var(--color-neutral-7); }
input[type="file"] {
  flex: 1;
  padding: 8px 12px;
  border: 1px solid var(--color-neutral-4);
  border-radius: var(--radius-md);
  background: var(--color-neutral-1);
  font-size: var(--text-copy-13);
  color: var(--color-neutral-7);
}

.btn {
  padding: 9px 18px;
  border: 1px solid var(--color-neutral-4);
  border-radius: 999px;
  background: var(--color-neutral-1);
  font-size: var(--text-copy-13);
  font-weight: 500;
  color: var(--color-neutral-8);
  cursor: pointer;
  white-space: nowrap;
  transition: all var(--duration-fast) var(--ease-breath);
}
.btn:hover { background: var(--color-neutral-9); color: var(--color-neutral-1); border-color: var(--color-neutral-9); }
.btn:disabled { opacity: 0.5; cursor: default; }
.btn--danger:hover { background: var(--color-error); color: #fff; border-color: var(--color-error); }

.msg { font-size: var(--text-copy-13); margin: 12px 0 0; }
.msg.ok { color: var(--color-success); }
.msg.err { color: var(--color-error); }

.issues { margin-top: 14px; }
.issues details { margin-bottom: 4px; }
.issues summary { font-size: var(--text-copy-13); color: var(--color-neutral-8); cursor: pointer; }
.issues ul { margin: 4px 0 0 16px; font-size: var(--text-copy-13); color: var(--color-neutral-7); }
</style>
