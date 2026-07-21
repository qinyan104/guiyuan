<script setup lang="ts">
import { useFeedback } from '../composables/useFeedback'
import FeedbackStrip from '../components/FeedbackStrip.vue'
import { ref, computed, onMounted } from 'vue'
import { getUsername, isSuperAdmin } from '../api/auth'
import { changePassword, changeNickname, uploadAvatar, getMyProfile } from '../api/profile'
import { downloadBackup, adminRestoreDatabase } from '../api/admin'
import ConfirmDialog from '../components/ConfirmDialog.vue'

const feedback = useFeedback()

// ── Avatar ──
const avatarUrl = ref('')
const avatarUploading = ref(false)
const fileInputRef = ref<HTMLInputElement | null>(null)

onMounted(async () => {
  try {
    const profile = await getMyProfile()
    if (profile.person?.avatarUrl) {
      avatarUrl.value = profile.person.avatarUrl
    }
  } catch { /* ignore */ }
})

const avatarTimestamp = ref(0)

async function handleAvatarUpload(event: Event) {
  const input = event.target as HTMLInputElement
  if (!input.files?.length) return
  const file = input.files[0]
  if (!file.type.startsWith('image/')) { feedback.errorMessage.value = '仅支持图片文件'; return }
  if (file.size > 5 * 1024 * 1024) { feedback.errorMessage.value = '图片大小不能超过 5MB'; return }
  avatarUploading.value = true
  try {
    const url = await uploadAvatar(file)
    avatarUrl.value = url
    avatarTimestamp.value = Date.now()
    feedback.statusMessage.value = '头像已更新'
  }
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

async function handleBackup() {
  backupError.value = ''; backupLoading.value = true
  try { await downloadBackup() } catch (err: any) { backupError.value = err.message || '备份失败' }
  finally { backupLoading.value = false }
}

function onFileSelected(e: Event) { const t = e.target as HTMLInputElement; if (t.files?.length) restoreFile.value = t.files[0] }

async function handleRestore() {
  if (!restoreFile.value) return
  restorePending.value = true
  try { const msg = await adminRestoreDatabase(restoreFile.value); feedback.statusMessage.value = msg; window.location.reload() }
  catch (e: any) { feedback.errorMessage.value = e.message || '数据库还原失败' }
  finally { restorePending.value = false }
}
</script>

<template>
  <div class="root">
    <FeedbackStrip :errorMessage="feedback.errorMessage.value" :statusMessage="feedback.statusMessage.value" @dismiss="feedback.dismiss" />

    <section class="account-summary">
      <button class="avatar" type="button" :disabled="avatarUploading" @click="fileInputRef?.click()">
        <img v-if="avatarUrl" :src="avatarUrl + (avatarTimestamp ? '?t=' + avatarTimestamp : '')" alt="" />
        <span v-else>{{ userInitials }}</span>
        <em>{{ avatarUploading ? '上传中' : '更换头像' }}</em>
      </button>
      <div class="account-summary__main">
        <span class="eyebrow">当前账户</span>
        <h1>{{ currentUsername || '未命名用户' }}</h1>
        <p>{{ isSuperAdmin() ? '超级管理员' : '编委' }}</p>
      </div>
      <input ref="fileInputRef" type="file" accept="image/*" hidden @change="handleAvatarUpload" />
    </section>

    <div class="settings-grid">
      <section class="settings-card">
        <div class="card-head">
          <div>
            <span class="eyebrow">Profile</span>
            <h2>个人账户</h2>
          </div>
        </div>

        <label class="field">
          <span>显示名称</span>
          <input v-model="nickname" type="text" placeholder="留空则使用登录账号" @keyup.enter="handleChangeNickname" />
        </label>

        <div class="actions">
          <button class="btn btn--primary" :disabled="nicknameLoading" @click="handleChangeNickname">
            {{ nicknameLoading ? '保存中…' : '保存显示名称' }}
          </button>
        </div>
        <p v-if="nicknameMsg" class="msg ok">{{ nicknameMsg }}</p>
      </section>

      <section class="settings-card">
        <div class="card-head">
          <div>
            <span class="eyebrow">Security</span>
            <h2>修改密码</h2>
          </div>
        </div>

        <label class="field">
          <span>当前密码</span>
          <input v-model="oldPassword" type="password" placeholder="输入当前密码" />
        </label>
        <label class="field">
          <span>新密码</span>
          <input v-model="newPassword" type="password" placeholder="至少 4 个字符" />
        </label>
        <label class="field">
          <span>确认新密码</span>
          <input v-model="confirmPassword" type="password" placeholder="再次输入新密码" @keyup.enter="handleChangePassword" />
        </label>

        <div class="actions">
          <button class="btn btn--primary" :disabled="passwordLoading" @click="handleChangePassword">
            {{ passwordLoading ? '更新中…' : '更新密码' }}
          </button>
        </div>
        <p v-if="passwordError" class="msg err">{{ passwordError }}</p>
        <p v-if="passwordMsg" class="msg ok">{{ passwordMsg }}</p>
      </section>
    </div>

    <section v-if="isSuperAdmin()" class="admin-panel">
      <div class="section-head">
        <span class="eyebrow">Admin</span>
        <h2>系统维护</h2>
      </div>

      <div class="maintenance-grid">
        <section class="settings-card settings-card--compact database-card">
          <div class="database-action">
            <div>
              <h3>数据备份</h3>
              <p>导出完整数据库备份文件，建议在还原前先下载一份最新备份。</p>
            </div>
            <button class="btn" :disabled="backupLoading" @click="handleBackup">
              {{ backupLoading ? '生成中…' : '下载备份' }}
            </button>
          </div>
          <p v-if="backupError" class="msg err">{{ backupError }}</p>

          <div class="database-action database-action--danger">
            <div>
              <h3>数据库还原</h3>
              <p>从 SQL 备份文件还原数据库。此操作不可逆。</p>
            </div>
            <div class="restore-row">
              <input type="file" accept=".sql" @change="onFileSelected" />
              <button class="btn btn--danger" :disabled="!restoreFile || restorePending" @click="showRestoreConfirm = true">
                {{ restorePending ? '还原中…' : '还原数据库' }}
              </button>
            </div>
          </div>
        </section>
      </div>
    </section>

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
  padding: 34px clamp(24px, 4vw, 48px) 56px;
}

.eyebrow {
  display: block;
  margin-bottom: 5px;
  color: var(--color-accent);
  font-size: var(--text-label-12);
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

.account-summary,
.settings-card {
  border: 1px solid var(--color-card-stroke);
  background: color-mix(in srgb, var(--color-panel-bg) 88%, var(--color-neutral-1));
  box-shadow: var(--shadow-whisper);
}

.account-summary {
  display: flex;
  align-items: center;
  gap: 18px;
  max-width: 980px;
  padding: 18px;
  border-radius: var(--radius-xl);
  margin-bottom: 16px;
}

.account-summary__main h1 {
  margin: 0;
  color: var(--color-neutral-10);
  font-size: var(--text-title-24);
  font-weight: 700;
  line-height: var(--leading-title);
}

.account-summary__main p {
  margin: 5px 0 0;
  color: var(--color-neutral-6);
  font-size: var(--text-copy-14);
}

.avatar {
  position: relative;
  display: grid;
  place-items: center;
  width: 72px;
  height: 72px;
  flex-shrink: 0;
  overflow: hidden;
  border: 1px solid var(--color-card-stroke);
  border-radius: 18px;
  background: var(--color-neutral-2);
  color: var(--color-neutral-7);
  cursor: pointer;
}

.avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.avatar span {
  font-size: var(--text-title-24);
  font-weight: 800;
}

.avatar em {
  position: absolute;
  inset-inline: 0;
  bottom: 0;
  padding: 4px 2px;
  background: color-mix(in srgb, var(--color-neutral-10) 70%, transparent);
  color: var(--color-neutral-1);
  font-size: 10px;
  font-style: normal;
  text-align: center;
  opacity: 0;
  transition: opacity var(--duration-fast) var(--ease-breath);
}

.avatar:hover em,
.avatar:focus-visible em {
  opacity: 1;
}

.settings-grid {
  display: grid;
  max-width: 980px;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
}

.maintenance-grid {
  display: grid;
  max-width: 980px;
}

.settings-card {
  border-radius: var(--radius-lg);
  padding: 20px;
}

.settings-card--compact {
  padding: 18px;
}

.card-head,
.section-head {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  align-items: flex-start;
  margin-bottom: 18px;
}

.section-head {
  max-width: 980px;
  margin-top: 24px;
  margin-bottom: 12px;
}

.card-head h2,
.section-head h2,
.settings-card h3 {
  margin: 0;
  color: var(--color-neutral-10);
  font-size: var(--text-title-20);
  font-weight: 700;
  line-height: var(--leading-title);
}

.settings-card h3 {
  font-size: var(--text-copy-16);
}

.settings-card p {
  margin: 0;
  color: var(--color-neutral-6);
  font-size: var(--text-copy-13);
  line-height: 1.6;
}

.field {
  display: grid;
  gap: 7px;
  margin-bottom: 12px;
  color: var(--color-neutral-7);
  font-size: var(--text-label-12);
  font-weight: 700;
}

input[type="text"],
input[type="password"],
input[type="file"] {
  min-width: 0;
  width: 100%;
  box-sizing: border-box;
  padding: 10px 12px;
  border: 1px solid var(--color-neutral-4);
  border-radius: var(--radius-md);
  background: var(--color-neutral-1);
  color: var(--color-neutral-9);
  font-family: inherit;
  font-size: var(--text-copy-14);
  outline: none;
  transition:
    border-color var(--duration-fast) var(--ease-breath),
    box-shadow var(--duration-fast) var(--ease-breath);
}

input:focus {
  border-color: var(--color-accent);
  box-shadow: 0 0 0 3px var(--color-accent-muted);
}

.actions {
  display: flex;
  justify-content: flex-end;
  margin-top: 14px;
}

.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 36px;
  padding: 8px 14px;
  border: 1px solid var(--color-card-stroke);
  border-radius: var(--radius-md);
  font-size: var(--text-copy-13);
  font-weight: 800;
  background: var(--color-panel-bg);
  color: var(--color-neutral-7);
  cursor: pointer;
  transition:
    background var(--duration-fast) var(--ease-breath),
    border-color var(--duration-fast) var(--ease-breath),
    color var(--duration-fast) var(--ease-breath);
}

.btn:hover:not(:disabled) {
  border-color: var(--color-neutral-6);
  background: var(--color-neutral-2);
  color: var(--color-neutral-10);
}

.btn:disabled {
  cursor: not-allowed;
  opacity: 0.5;
}

.btn--primary {
  background: var(--color-neutral-10);
  border-color: var(--color-neutral-10);
  color: var(--color-neutral-1);
}

.btn--primary:hover:not(:disabled) {
  background: var(--color-accent);
  border-color: var(--color-accent);
  color: var(--color-text-on-accent);
}

.btn--danger {
  background: var(--color-error);
  border-color: var(--color-error);
  color: #fff;
}

.admin-panel {
  max-width: 980px;
}

.database-card {
  display: grid;
  gap: 16px;
}

.database-action {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 18px;
  align-items: center;
}

.database-action--danger {
  padding-top: 16px;
  border-top: 1px solid color-mix(in srgb, var(--color-error) 24%, var(--color-card-stroke));
}

.restore-row {
  display: flex;
  gap: 10px;
  align-items: center;
}

.msg {
  margin: 12px 0 0;
  font-size: var(--text-copy-13);
}

.msg.ok { color: var(--color-success); }
.msg.err { color: var(--color-error); }

@media (max-width: 820px) {
  .settings-grid,
  .database-action {
    grid-template-columns: 1fr;
  }

  .restore-row {
    align-items: stretch;
    flex-direction: column;
  }
}

@media (max-width: 560px) {
  .root {
    padding-inline: 16px;
  }

  .account-summary {
    align-items: flex-start;
  }
}
</style>
