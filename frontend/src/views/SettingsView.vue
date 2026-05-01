<script setup lang="ts">
import { ref } from 'vue'
import { getUsername } from '../api/auth'
import { changePassword, changeNickname } from '../api/profile'

const currentUsername = ref(getUsername() ?? '')

const oldPassword = ref('')
const newPassword = ref('')
const confirmPassword = ref('')
const passwordMsg = ref('')
const passwordError = ref('')
const passwordLoading = ref(false)

const nickname = ref('')
const nicknameMsg = ref('')
const nicknameLoading = ref(false)

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
    passwordMsg.value = '密码修改成功'
    oldPassword.value = ''
    newPassword.value = ''
    confirmPassword.value = ''
  } catch (err: any) {
    passwordError.value = err.response?.data?.message || '修改失败，请检查当前密码是否正确'
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
    nicknameMsg.value = '昵称修改成功'
  } catch {
    nicknameMsg.value = '修改失败'
  } finally {
    nicknameLoading.value = false
  }
}
</script>

<template>
  <div>
    <h1 class="page-title">个人设置</h1>
    <p class="page-desc">管理你的账号信息</p>

    <section class="settings-section">
      <h2 class="section-title">账号信息</h2>
      <div class="info-card">
        <div class="info-row">
          <span class="info-label">用户名</span>
          <span class="info-value">{{ currentUsername }}</span>
        </div>
      </div>
    </section>

    <section class="settings-section">
      <h2 class="section-title">修改昵称</h2>
      <div class="form-card">
        <div class="form-row">
          <input
            v-model="nickname"
            type="text"
            placeholder="输入新昵称"
            class="form-input"
            @keyup.enter="handleChangeNickname"
          />
          <button class="btn-primary" :disabled="nicknameLoading" @click="handleChangeNickname">
            {{ nicknameLoading ? '保存中...' : '保存' }}
          </button>
        </div>
        <p v-if="nicknameMsg" class="msg-success">{{ nicknameMsg }}</p>
      </div>
    </section>

    <section class="settings-section">
      <h2 class="section-title">修改密码</h2>
      <div class="form-card">
        <div class="form-field">
          <label>当前密码</label>
          <input v-model="oldPassword" type="password" placeholder="输入当前密码" class="form-input" />
        </div>
        <div class="form-field">
          <label>新密码</label>
          <input v-model="newPassword" type="password" placeholder="输入新密码（至少4个字符）" class="form-input" />
        </div>
        <div class="form-field">
          <label>确认新密码</label>
          <input
            v-model="confirmPassword"
            type="password"
            placeholder="再次输入新密码"
            class="form-input"
            @keyup.enter="handleChangePassword"
          />
        </div>
        <p v-if="passwordError" class="msg-error">{{ passwordError }}</p>
        <p v-if="passwordMsg" class="msg-success">{{ passwordMsg }}</p>
        <button class="btn-primary" :disabled="passwordLoading" @click="handleChangePassword">
          {{ passwordLoading ? '修改中...' : '修改密码' }}
        </button>
      </div>
    </section>
  </div>
</template>

<style scoped>
.page-title {
  font-size: 1.5rem;
  font-family: 'Noto Serif SC', serif;
  font-weight: 700;
  color: var(--text-main, #1a1a1a);
  margin: 0 0 0.25rem;
}

.page-desc {
  color: var(--text-soft, #888);
  font-size: 0.85rem;
  margin: 0 0 1.5rem;
}

.settings-section {
  margin-bottom: 1.75rem;
}

.section-title {
  font-size: 0.95rem;
  font-weight: 700;
  color: var(--text-main, #1a1a1a);
  margin: 0 0 0.6rem;
  font-family: 'Noto Serif SC', serif;
}

.info-card,
.form-card {
  background: var(--bg-panel, #fff);
  border: 1px solid var(--border-color, rgba(0,0,0,0.08));
  border-radius: 12px;
  padding: 1rem;
}

.info-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.info-label {
  font-size: 0.82rem;
  color: var(--text-soft, #888);
  font-weight: 600;
}

.info-value {
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--text-main, #1a1a1a);
}

.form-row {
  display: flex;
  gap: 0.6rem;
}

.form-field {
  margin-bottom: 0.6rem;
}

.form-field label {
  display: block;
  font-size: 0.78rem;
  font-weight: 600;
  color: var(--text-sub, #555);
  margin-bottom: 0.25rem;
}

.form-input {
  flex: 1;
  width: 100%;
  padding: 0.5rem 0.7rem;
  border: 1px solid var(--border-color, rgba(0,0,0,0.12));
  border-radius: 8px;
  background: var(--bg-shell, #f5f0e8);
  color: var(--text-main, #1a1a1a);
  font-size: 0.82rem;
  outline: none;
  transition: border-color 0.2s;
  box-sizing: border-box;
}

.form-input:focus {
  border-color: var(--accent-amber, #a96e35);
}

.btn-primary {
  padding: 0.5rem 1.1rem;
  background: linear-gradient(135deg, var(--accent-ink, #6a4b2f), var(--accent-amber, #a96e35));
  color: #fff;
  border: none;
  border-radius: 8px;
  font-weight: 700;
  font-size: 0.82rem;
  cursor: pointer;
  white-space: nowrap;
}

.btn-primary:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.msg-success {
  color: #16a34a;
  font-size: 0.78rem;
  font-weight: 600;
  margin: 0.4rem 0 0;
}

.msg-error {
  color: #ef4444;
  font-size: 0.78rem;
  font-weight: 600;
  margin: 0.4rem 0 0;
}
</style>
