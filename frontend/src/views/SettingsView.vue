<script setup lang="ts">
import { useFeedback } from '../composables/useFeedback'
import FeedbackStrip from '../components/FeedbackStrip.vue'
import { ref, computed, onMounted } from 'vue'
import { getRole, getUsername, isSuperAdmin } from '../api/auth'
import { getUserErrorMessage } from '../api/http'
import { changePassword, uploadAvatar, getMyProfile, updateMyProfileName } from '../api/profile'
import { downloadBackup, adminRestoreDatabase } from '../api/admin'
import ConfirmDialog from '../components/ConfirmDialog.vue'
import UserAvatar from '../components/UserAvatar.vue'

const feedback = useFeedback()

// ── Avatar ──
const avatarUrl = ref('')
const avatarUploading = ref(false)
const fileInputRef = ref<HTMLInputElement | null>(null)
const currentUsername = ref(getUsername() ?? '')
const currentRole = ref(getRole() ?? '')
const profileNameDraft = ref('')
const originalProfileName = ref('')

onMounted(async () => {
  try {
    const profile = await getMyProfile()
    originalProfileName.value = profile.person?.name ?? ''
    profileNameDraft.value = originalProfileName.value
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
  catch (err: unknown) { feedback.errorMessage.value = getUserErrorMessage(err, '头像上传失败') }
  finally { avatarUploading.value = false; input.value = '' }
}

const avatarName = computed(() => profileNameDraft.value.trim() || originalProfileName.value.trim() || currentUsername.value)
const avatarSrc = computed(() => avatarUrl.value ? avatarUrl.value + (avatarTimestamp.value ? '?t=' + avatarTimestamp.value : '') : '')
const roleTone = computed(() => currentRole.value.toLowerCase())
const roleLabel = computed(() => currentRole.value === 'SUPER_ADMIN' ? '超级管理员' : '编委')

// ── Name ──
const nameMsg = ref('')
const nameError = ref(false)
const nameLoading = ref(false)

async function handleChangeName() {
  nameMsg.value = ''
  nameError.value = false
  const nextName = profileNameDraft.value.trim()
  if (!nextName) { nameMsg.value = '姓名不能为空'; nameError.value = true; return }
  if (nextName === originalProfileName.value) { nameMsg.value = '姓名未修改'; return }
  nameLoading.value = true
  try {
    await updateMyProfileName(nextName)
    originalProfileName.value = nextName
    nameMsg.value = '已更新'
  }
  catch (err: unknown) {
    nameError.value = true
    nameMsg.value = getUserErrorMessage(err, '提交失败')
  }
  finally { nameLoading.value = false }
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
  if (newPassword.value.length < 8) { passwordError.value = '新密码至少8个字符'; return }
  if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+$/.test(newPassword.value)) {
    passwordError.value = '新密码须包含大小写字母和数字'
    return
  }
  if (newPassword.value !== confirmPassword.value) { passwordError.value = '两次输入不一致'; return }
  passwordLoading.value = true
  try {
    await changePassword(oldPassword.value, newPassword.value)
    passwordMsg.value = '已更新'
    oldPassword.value = ''; newPassword.value = ''; confirmPassword.value = ''
  } catch (err: unknown) { passwordError.value = getUserErrorMessage(err, '修改失败') }
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
  try { await downloadBackup() } catch (err: unknown) { backupError.value = getUserErrorMessage(err, '备份失败') }
  finally { backupLoading.value = false }
}

function onFileSelected(e: Event) { const t = e.target as HTMLInputElement; if (t.files?.length) restoreFile.value = t.files[0] }

async function handleRestore() {
  if (!restoreFile.value) return
  restorePending.value = true
  try { const msg = await adminRestoreDatabase(restoreFile.value); feedback.statusMessage.value = msg; window.location.reload() }
  catch (e: unknown) { feedback.errorMessage.value = getUserErrorMessage(e, '数据库还原失败') }
  finally { restorePending.value = false }
}
</script>

<template>
  <div class="root">
    <FeedbackStrip :errorMessage="feedback.errorMessage.value" :statusMessage="feedback.statusMessage.value" @dismiss="feedback.dismiss" />

    <section class="page-head">
      <div class="account-summary__main">
        <h1>账户设置</h1>
        <p>账号固定不变；姓名可直接修改。</p>
      </div>
    </section>

    <div class="account-layout">
      <section class="settings-card profile-card">
        <div class="profile-card__avatar">
          <button class="avatar" type="button" :disabled="avatarUploading" @click="fileInputRef?.click()">
            <UserAvatar :src="avatarSrc" :name="avatarName" :tone="roleTone" size="lg" />
            <em>{{ avatarUploading ? '上传中' : '更换头像' }}</em>
          </button>
          <input ref="fileInputRef" type="file" accept="image/*" hidden @change="handleAvatarUpload" />
          <button class="btn" type="button" :disabled="avatarUploading" @click="fileInputRef?.click()">
            {{ avatarUploading ? '上传中…' : '上传头像' }}
          </button>
        </div>

        <div class="profile-card__body">
          <div class="card-head">
            <div>
              <h2>个人资料</h2>
            </div>
            <span class="role-badge">{{ roleLabel }}</span>
          </div>

          <dl class="account-facts">
            <div>
              <dt>登录账号</dt>
              <dd>{{ currentUsername || '未命名用户' }}</dd>
            </div>
            <div v-if="originalProfileName">
              <dt>关联人物</dt>
              <dd>{{ originalProfileName }}</dd>
            </div>
          </dl>

          <label class="field">
            <span>姓名</span>
            <input v-model="profileNameDraft" type="text" placeholder="请输入姓名" @keyup.enter="handleChangeName" />
          </label>

          <div class="actions">
            <button class="btn btn--primary" :disabled="nameLoading || profileNameDraft.trim() === originalProfileName" @click="handleChangeName">
              {{ nameLoading ? '保存中…' : '保存姓名' }}
            </button>
          </div>
          <p v-if="nameMsg" class="msg" :class="nameError ? 'err' : 'ok'">{{ nameMsg }}</p>
        </div>
      </section>

      <section class="settings-card">
        <div class="card-head">
          <div>
            <span class="eyebrow">Security</span>
            <h2>登录密码</h2>
          </div>
        </div>

        <label class="field">
          <span>当前密码</span>
          <input v-model="oldPassword" type="password" placeholder="输入当前密码" />
        </label>
        <label class="field">
          <span>新密码</span>
          <input v-model="newPassword" type="password" placeholder="至少 8 个字符，含大小写和数字" />
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
        <h2>管理员工具</h2>
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
  width: 100%;
  box-sizing: border-box;
  padding: 20px clamp(18px, 3vw, 34px) 48px;
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

.settings-card {
  border: 1px solid var(--color-card-stroke);
  background: color-mix(in srgb, var(--color-panel-bg) 88%, var(--color-neutral-1));
  box-shadow: var(--shadow-whisper);
}

.page-head {
  margin-bottom: 18px;
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

.account-layout {
  display: grid;
  width: 100%;
  grid-template-columns: minmax(420px, 1.15fr) minmax(340px, 0.85fr);
  gap: 16px;
}

.profile-card {
  display: grid;
  grid-template-columns: 132px 1fr;
  gap: 20px;
}

.profile-card__avatar {
  display: grid;
  align-content: start;
  gap: 10px;
}

.avatar {
  position: relative;
  display: block;
  width: max-content;
  height: max-content;
  padding: 0;
  overflow: hidden;
  border: 0;
  border-radius: 50%;
  background: transparent;
  cursor: pointer;
}

.avatar em {
  position: absolute;
  inset-inline: 0;
  bottom: 0;
  padding: 6px 2px;
  background: color-mix(in srgb, var(--color-neutral-10) 70%, transparent);
  color: var(--color-neutral-1);
  font-size: var(--text-label-12);
  font-style: normal;
  text-align: center;
  opacity: 0;
  transition: opacity var(--duration-fast) var(--ease-breath);
}

.avatar:hover em,
.avatar:focus-visible em {
  opacity: 1;
}

.maintenance-grid {
  display: grid;
  width: 100%;
}

.settings-card {
  border-radius: var(--radius-lg);
  padding: 22px;
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

.role-badge {
  padding: 5px 9px;
  border: 1px solid var(--color-card-stroke);
  border-radius: 999px;
  color: var(--color-neutral-6);
  font-size: var(--text-label-12);
  font-weight: 800;
  white-space: nowrap;
}

.section-head {
  width: 100%;
  margin-top: 24px;
  margin-bottom: 12px;
}

.account-facts {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
  margin: 0 0 14px;
}

.account-facts div {
  padding: 10px 12px;
  border-radius: var(--radius-md);
  background: var(--color-neutral-2);
}

.account-facts dt {
  color: var(--color-neutral-6);
  font-size: var(--text-label-12);
  font-weight: 700;
}

.account-facts dd {
  margin: 4px 0 0;
  color: var(--color-neutral-10);
  font-size: var(--text-copy-14);
  font-weight: 700;
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

input:disabled {
  color: var(--color-neutral-6);
  background: var(--color-neutral-2);
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
  width: 100%;
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
  .account-layout,
  .profile-card,
  .account-facts,
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

  .profile-card__avatar {
    justify-items: start;
  }
}
</style>
