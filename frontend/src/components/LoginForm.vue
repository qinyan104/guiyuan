<script setup lang="ts">
import { reactive, ref } from 'vue'

import { login, type LoginRequest } from '../api/auth'

const emit = defineEmits<{
  (e: 'success', username: string): void
}>()

const form = reactive<LoginRequest>({ username: '', password: '' })
const errorMsg = ref('')
const loading = ref(false)
const showPassword = ref(false)
const focusedField = ref<string | null>(null)

async function onSubmit() {
  errorMsg.value = ''
  loading.value = true

  try {
    const data = await login(form)
    emit('success', data.username)
  } catch (error: unknown) {
    errorMsg.value = error instanceof Error ? error.message : '登录失败，请稍后重试'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="auth-stage">
    <div class="login-panel">
      <aside class="brand-section">
        <div class="editorial-layout">
          <div class="layout-header">
            <div class="logo-mark">
              <div class="logo-seal">归</div>
              <span class="logo-text">GUIYUAN</span>
            </div>
            <div class="layout-meta">RELATION ARCHIVE</div>
          </div>

          <div class="layout-body">
            <div class="hero-eyebrow">继续整理</div>
            <h1 class="hero-title">
              把还没说完的名字，
              <br />
              慢慢补回来
            </h1>
            <hr class="hero-divider" />
            <p class="hero-quote">
              照片会散，聊天会沉，
              <br />
              但重要的人和关系，
              <br />
              值得被好好放在一起。
            </p>
          </div>

          <div class="layout-footer">
            <div class="footer-info">
              <span class="info-label">先看一眼</span>
              <router-link to="/sample/ming" class="info-link">打开示例</router-link>
            </div>
            <div class="footer-info text-right">
              <span class="info-label">回到首页</span>
              <router-link to="/" class="info-link">看看它能做什么</router-link>
            </div>
          </div>
        </div>
      </aside>

      <main class="form-section">
        <div class="form-wrapper">
          <div class="form-header">
            <h2 class="form-title">欢迎回来</h2>
            <p class="form-desc">从这里继续整理家人关系与记忆。</p>
          </div>

          <form class="auth-form" @submit.prevent="onSubmit">
            <div class="input-group" :class="{ 'is-focused': focusedField === 'username', 'has-value': form.username }">
              <label>账号</label>
              <input
                v-model="form.username"
                type="text"
                required
                autocomplete="username"
                @focus="focusedField = 'username'"
                @blur="focusedField = null"
              />
            </div>

            <div class="input-group" :class="{ 'is-focused': focusedField === 'password', 'has-value': form.password }">
              <label>登录密码</label>
              <input
                v-model="form.password"
                :type="showPassword ? 'text' : 'password'"
                required
                autocomplete="current-password"
                @focus="focusedField = 'password'"
                @blur="focusedField = null"
              />
              <button type="button" class="password-toggle" :aria-label="showPassword ? '隐藏密码' : '显示密码'" @click="showPassword = !showPassword">
                <svg v-if="showPassword" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24M1 1l22 22" /></svg>
                <svg v-else width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg>
              </button>
            </div>

            <div class="form-note">
              <span>先从你最熟悉的几个人开始，后面的内容都可以慢慢补。</span>
            </div>

            <button type="submit" class="submit-btn" :class="{ 'is-loading': loading }" :disabled="loading">
              <span v-if="loading">正在进入...</span>
              <template v-else>
                <span>进入归源</span>
                <span class="btn-arrow">→</span>
              </template>
            </button>

            <p v-if="errorMsg" class="error-banner">{{ errorMsg }}</p>
          </form>

          <p class="form-footer">
            还想先熟悉一下？
            <router-link to="/sample/ming">先看看示例</router-link>
          </p>
        </div>
      </main>
    </div>
  </div>
</template>

<style scoped>
.auth-stage {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  padding: 24px;
  animation: floatUp 0.7s var(--ease-breath);
}

@keyframes floatUp {
  from { opacity: 0; transform: translateY(32px); }
  to { opacity: 1; transform: translateY(0); }
}

.login-panel {
  display: flex;
  max-width: 980px;
  width: 100%;
  min-height: 560px;
  background: var(--color-card-fill);
  border-radius: var(--radius-2xl);
  box-shadow: 0 8px 48px rgba(0, 0, 0, 0.06), 0 2px 8px rgba(0, 0, 0, 0.03);
  border: 1px solid var(--color-card-stroke);
  overflow: hidden;
}

.brand-section {
  flex: 1;
  position: relative;
  padding: 48px 40px;
  background:
    radial-gradient(circle at 18% 22%, rgba(196, 58, 49, 0.12), transparent 38%),
    linear-gradient(180deg, rgba(240, 239, 235, 0.96), rgba(249, 248, 245, 0.9));
  border-right: 1px solid var(--color-neutral-4);
  display: flex;
  align-items: center;
  overflow: hidden;
}

.brand-section::before {
  content: '';
  position: absolute;
  inset: 18px;
  border: 1px solid rgba(20, 19, 18, 0.06);
  border-radius: 28px;
  pointer-events: none;
}

.editorial-layout {
  position: relative;
  z-index: 1;
  width: 100%;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  min-height: 100%;
}

.layout-header,
.layout-footer {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 16px;
}

.logo-mark {
  display: flex;
  align-items: center;
  gap: 10px;
}

.logo-seal {
  width: 44px;
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--color-accent-gradient);
  color: #fff;
  font-family: var(--font-serif);
  font-size: var(--text-title-24);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-whisper);
}

.logo-text,
.layout-meta,
.hero-eyebrow,
.info-label {
  font-size: var(--text-label-12);
  font-weight: 500;
  letter-spacing: 0.12em;
  color: var(--color-neutral-7);
  text-transform: uppercase;
}

.layout-meta,
.hero-eyebrow {
  color: var(--color-accent);
}

.layout-body {
  margin: auto 0;
  padding: 28px 0;
}

.hero-title {
  font-family: var(--font-serif);
  font-size: clamp(30px, 4.2vw, 42px);
  font-weight: 500;
  color: var(--color-neutral-10);
  line-height: 1.18;
  margin: 0;
  letter-spacing: 0.02em;
  text-wrap: balance;
}

.hero-divider {
  width: 56px;
  height: 2px;
  background: var(--color-accent);
  border: none;
  margin: 22px 0 18px;
  opacity: 0.35;
}

.hero-quote {
  font-size: var(--text-copy-15);
  color: var(--color-neutral-7);
  line-height: 1.9;
  max-width: 320px;
  margin: 0;
}

.footer-info {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.text-right {
  text-align: right;
}

.info-link {
  color: var(--color-neutral-9);
  font-size: var(--text-copy-14);
  font-weight: 500;
}

.info-link:hover {
  color: var(--color-accent);
}

.form-section {
  flex: 1;
  padding: 56px 52px;
  display: flex;
  align-items: center;
  background:
    radial-gradient(ellipse at 80% 20%, rgba(196, 58, 49, 0.04) 0%, transparent 50%),
    var(--color-neutral-1);
}

.form-wrapper {
  width: 100%;
  max-width: 380px;
  margin: 0 auto;
}

.form-header {
  margin-bottom: 42px;
}

.form-title {
  font-family: var(--font-serif);
  font-size: var(--text-title-24);
  font-weight: 500;
  color: var(--color-neutral-10);
  margin: 0 0 10px;
}

.form-title::before {
  content: '';
  display: block;
  width: 24px;
  height: 2px;
  background: var(--color-accent);
  opacity: 0.35;
  border-radius: 1px;
  margin-bottom: 16px;
}

.form-desc,
.form-note,
.form-footer {
  font-size: var(--text-copy-14);
  color: var(--color-neutral-7);
  line-height: 1.8;
}

.input-group {
  position: relative;
  margin-bottom: 24px;
}

.input-group label {
  display: block;
  font-size: 12px;
  color: var(--color-neutral-6);
  font-weight: 500;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  transition: color var(--duration-fast) var(--ease-breath);
}

.input-group.is-focused label {
  color: var(--color-accent);
}

.input-group input {
  width: 100%;
  padding: 12px 16px;
  font-size: 15px;
  color: var(--color-neutral-9);
  background: var(--color-neutral-2);
  border: 1px solid var(--color-neutral-3);
  outline: none;
  font-weight: 500;
  border-radius: 10px;
  margin-top: 6px;
  transition:
    border-color var(--duration-fast) var(--ease-breath),
    box-shadow var(--duration-fast) var(--ease-breath),
    background var(--duration-fast) var(--ease-breath);
}

.input-group input:focus {
  border-color: var(--color-accent);
  box-shadow: 0 0 0 3px var(--color-accent-muted);
  background: var(--color-neutral-1);
}

.input-group input:-webkit-autofill {
  -webkit-box-shadow: 0 0 0 30px var(--color-neutral-2) inset !important;
  -webkit-text-fill-color: var(--color-neutral-9) !important;
}

.password-toggle {
  position: absolute;
  right: 14px;
  top: 38px;
  color: var(--color-neutral-6);
  padding: 4px;
  background: transparent;
  transition: color var(--duration-fast);
}

.password-toggle:hover {
  color: var(--color-neutral-9);
}

.form-note {
  margin: 4px 0 20px;
  padding: 12px 14px;
  border-radius: 12px;
  background: rgba(196, 58, 49, 0.06);
  color: var(--color-neutral-8);
}

.submit-btn {
  width: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 8px;
  padding: 14px;
  background: var(--color-accent-gradient);
  color: #fff;
  border: none;
  border-radius: var(--radius-lg);
  font-size: var(--text-copy-15);
  font-weight: 500;
  cursor: pointer;
  box-shadow: 0 4px 16px rgba(196, 58, 49, 0.1);
  transition:
    filter var(--duration-fast) var(--ease-breath),
    transform var(--duration-fast) var(--ease-breath);
}

.submit-btn:hover {
  filter: brightness(1.08);
  transform: translateY(-1px);
}

.submit-btn:active {
  transform: translateY(0);
}

.submit-btn.is-loading {
  opacity: 0.7;
  cursor: not-allowed;
  filter: none;
  transform: none;
}

.btn-arrow {
  transition: transform var(--duration-fast) var(--ease-breath);
}

.submit-btn:hover .btn-arrow {
  transform: translateX(3px);
}

.error-banner {
  margin-top: 16px;
  padding: 12px 16px;
  background: rgba(166, 73, 83, 0.1);
  border: 1px solid rgba(166, 73, 83, 0.2);
  border-radius: var(--radius-md);
  color: var(--color-error);
  font-size: var(--text-copy-14);
  font-weight: 500;
}

.form-footer {
  margin-top: 28px;
  text-align: center;
}

.form-footer a {
  color: var(--color-accent);
  text-decoration: none;
  font-weight: 500;
}

.form-footer a:hover {
  text-decoration: underline;
}

@media (max-width: 960px) {
  .login-panel {
    flex-direction: column;
    min-height: auto;
  }

  .brand-section {
    padding: 36px 32px;
    border-right: none;
    border-bottom: 1px solid var(--color-neutral-4);
  }

  .form-section {
    padding: 36px 32px;
  }
}

@media (max-width: 640px) {
  .auth-stage {
    padding: 12px;
  }

  .login-panel {
    border-radius: var(--radius-xl);
  }

  .brand-section,
  .form-section {
    padding: 28px 24px;
  }

  .layout-footer {
    display: grid;
  }

  .text-right {
    text-align: left;
  }
}
</style>
