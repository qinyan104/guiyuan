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
  } catch (error: any) {
    errorMsg.value = error?.message || '登录失败，请稍后重试'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="auth-stage">
    <div class="login-panel">
      <!-- 左侧：品牌展示 -->
      <aside class="brand-section">
        <div class="editorial-layout">
          <div class="layout-header">
            <div class="logo-mark">
              <div class="logo-seal">溯</div>
              <span class="logo-text">GUIYUAN</span>
            </div>
            <div class="layout-meta">01 // VISIONS</div>
          </div>

          <div class="layout-body">
            <div class="hero-eyebrow">CHAPTER I</div>
            <h1 class="hero-title">
              万物<span class="text-italic">逆旅</span><br />
              百代<span class="text-gradient">过客</span>
            </h1>
            <hr class="hero-divider" />
            <p class="hero-quote">
              我们在时间的缝隙中寻找来处，<br />
              在浩瀚的星海里标记归途。<br />
              每一段记忆，都是抵抗遗忘的史诗。
            </p>
          </div>

          <div class="layout-footer">
            <div class="footer-info">
              <span class="info-label">AESTHETICS</span>
              <span class="info-value">Timeless Design</span>
            </div>
            <div class="footer-info text-right">
              <span class="info-label">EDITION</span>
              <span class="info-value">Volume. I</span>
            </div>
          </div>
        </div>
      </aside>

      <!-- 右侧：登录表单 -->
      <main class="form-section">
        <div class="form-wrapper">
          <div class="form-header">
            <h2 class="form-title">欢迎回来</h2>
            <p class="form-desc">念念不忘，必有回响</p>
          </div>

          <form class="auth-form" @submit.prevent="onSubmit">
            <div class="input-group" :class="{ 'is-focused': focusedField === 'username', 'has-value': form.username }">
              <label>账号 / 邮箱</label>
              <input
                v-model="form.username"
                type="text"
                required
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
                @focus="focusedField = 'password'"
                @blur="focusedField = null"
              />
              <button type="button" class="password-toggle" @click="showPassword = !showPassword">
                <svg v-if="showPassword" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24M1 1l22 22" /></svg>
                <svg v-else width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg>
              </button>
            </div>

            <div class="form-actions">
              <label class="remember-me">
                <input type="checkbox" checked />
                <span class="checkmark"></span>
                保持登录
              </label>
              <a href="#" class="forgot-link">忘记密码？</a>
            </div>

            <button type="submit" class="submit-btn" :class="{ 'is-loading': loading }" :disabled="loading">
              <span v-if="loading">正在登录...</span>
              <template v-else>
                <span>登 录</span>
                <span class="btn-arrow">→</span>
              </template>
            </button>

            <p v-if="errorMsg" class="error-banner">{{ errorMsg }}</p>
          </form>

          <p class="form-footer">
            还没有账号？
            <router-link to="/register">立即注册</router-link>
          </p>
        </div>
      </main>
    </div>
  </div>
</template>

<style scoped>
/* ═══════════════════════════════════════════════════════════
   LoginForm — 归源登录表单
   基于 Yohaku 设计体系，纸面质感 + 留白美学
   ═══════════════════════════════════════════════════════════ */

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
  to   { opacity: 1; transform: translateY(0); }
}

/* ── 主面板：左右分栏 ── */
.login-panel {
  display: flex;
  max-width: 960px;
  width: 100%;
  min-height: 540px;
  background: var(--color-card-fill);
  border-radius: var(--radius-2xl);
  box-shadow: 0 8px 48px rgba(0,0,0,0.06), 0 2px 8px rgba(0,0,0,0.03);
  border: 1px solid var(--color-card-stroke);
  overflow: hidden;
}

/* ── 左侧品牌区 ── */
.brand-section {
  flex: 1;
  position: relative;
  padding: 48px 40px;
  background: var(--color-neutral-2);
  border-right: 1px solid var(--color-neutral-4);
  display: flex;
  align-items: center;
  overflow: hidden;
}
/* 径向光晕 */
.brand-section::before {
  content: "";
  position: absolute;
  top: -30%; left: -20%;
  width: 140%; height: 160%;
  background: radial-gradient(ellipse at 60% 40%, var(--color-accent-muted) 0%, transparent 60%),
              radial-gradient(ellipse at 30% 70%, rgba(168,166,159,0.06) 0%, transparent 50%);
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

.layout-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
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
  background: linear-gradient(135deg, #8b2c26, var(--color-accent));
  color: #fff;
  font-family: var(--font-serif);
  font-size: var(--text-title-24);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-whisper);
}

.logo-text {
  font-size: var(--text-label-12);
  font-weight: 600;
  letter-spacing: 0.12em;
  color: var(--color-neutral-7);
}

.layout-meta {
  font-size: var(--text-caption-10);
  letter-spacing: 0.08em;
  color: var(--color-neutral-6);
  font-weight: 500;
}

.layout-body {
  margin: auto 0;
  padding: 24px 0;
}

.hero-eyebrow {
  font-size: var(--text-caption-10);
  letter-spacing: 0.16em;
  color: var(--color-accent);
  font-weight: 600;
  margin-bottom: 8px;
}

.hero-title {
  font-family: var(--font-serif);
  font-size: clamp(30px, 4.5vw, 42px);
  font-weight: 700;
  color: var(--color-neutral-10);
  line-height: 1.15;
  margin: 0; letter-spacing: 0.03em;
}

.text-italic {
  font-style: oblique 10deg;
}

.text-gradient {
  background: var(--color-accent);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.hero-divider {
  width: 56px;
  height: 2px;
  background: var(--color-accent);
  border: none;
  margin: 20px 0;
  opacity: 0.4;
}

.hero-quote {
  font-size: var(--text-copy-14);
  color: var(--color-neutral-7);
  line-height: 1.8;
  max-width: 320px;
  font-style: oblique 10deg;
}

.layout-footer {
  display: flex;
  justify-content: space-between;
}

.footer-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.info-label {
  font-size: var(--text-caption-10);
  letter-spacing: 0.1em;
  color: var(--color-neutral-6);
  font-weight: 600;
}

.info-value {
  font-size: var(--text-label-12);
  color: var(--color-neutral-8);
  font-weight: 500;
}

.text-right {
  text-align: right;
}

/* ── 右侧表单区 ── */
.form-section {
  flex: 1;
  padding: 56px 52px;
  display: flex;
  align-items: center;
  background: var(--color-neutral-1);
  background-image:
    radial-gradient(ellipse at 80% 20%, rgba(196,58,49,0.03) 0%, transparent 50%);
}

.form-wrapper {
  width: 100%;
  max-width: 380px;
  margin: 0 auto;
}

.form-header {
  margin-bottom: 48px;
}

.form-title {
  font-family: var(--font-serif);
  font-size: var(--text-title-24);
  font-weight: 500;
  color: var(--color-neutral-10);
  margin: 0 0 8px;
}
.form-title::before {
  content: "";
  display: block;
  width: 24px; height: 2px;
  background: var(--color-accent);
  opacity: 0.35; border-radius: 1px;
  margin-bottom: 16px;
}
.form-desc {
  font-size: var(--text-copy-14);
  color: var(--color-neutral-7);
  margin: 0;
  font-style: oblique 10deg;
}

/* ── 输入框 ── */
.input-group {
  position: relative;
  margin-bottom: 24px;
}

.input-group.is-focused {
  }

.input-group label {
  display: block;
  font-size: 12px;
  color: var(--color-neutral-6);
  font-weight: 600;
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
  transition: border-color var(--duration-fast) var(--ease-breath),
              box-shadow var(--duration-fast) var(--ease-breath);
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
  transition: color var(--duration-fast);
}

.password-toggle:hover {
  color: var(--color-neutral-9);
}

/* ── 表单操作行 ── */
.form-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.remember-me {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: var(--text-label-12);
  color: var(--color-neutral-7);
  cursor: pointer;
  font-weight: 500;
}

.remember-me input {
  position: absolute;
  opacity: 0;
  width: 0;
  height: 0;
}

.checkmark {
  width: 18px;
  height: 18px;
  background: var(--color-neutral-3);
  border: 1px solid var(--color-neutral-5);
  border-radius: var(--radius-sm);
  position: relative;
  transition: all var(--duration-fast);
}

.remember-me input:checked ~ .checkmark {
  background: var(--color-accent);
  border-color: var(--color-accent);
}

.checkmark::after {
  content: "";
  position: absolute;
  display: none;
  left: 5px;
  top: 1px;
  width: 5px;
  height: 10px;
  border: solid #fff;
  border-width: 0 2px 2px 0;
  transform: rotate(45deg);
}

.remember-me input:checked ~ .checkmark::after {
  display: block;
}

.forgot-link {
  font-size: var(--text-label-12);
  color: var(--color-neutral-7);
  text-decoration: none;
  font-weight: 500;
  transition: color var(--duration-fast);
}

.forgot-link:hover {
  color: var(--color-accent);
}

/* ── 提交按钮 ── */
.submit-btn {
  width: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 8px;
  padding: 14px;
  background: linear-gradient(135deg, #8b2c26, var(--color-accent));
  color: #fff;
  border: none;
  border-radius: var(--radius-lg);
  font-size: var(--text-copy-15);
  font-weight: 600;
  cursor: pointer;
  box-shadow: 0 4px 16px rgba(196, 58, 49, 0.15);
  transition: filter var(--duration-fast) var(--ease-breath),
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

/* ── 错误提示 ── */
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

/* ── 表单底部 ── */
.form-footer {
  margin-top: 32px;
  text-align: center;
  font-size: var(--text-copy-14);
  color: var(--color-neutral-7);
}

.form-footer a {
  color: var(--color-accent);
  text-decoration: none;
  font-weight: 600;
}

.form-footer a:hover {
  text-decoration: underline;
}

/* ── 响应式 ── */
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

  .hero-title {
    font-size: var(--text-title-28);
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
}
</style>
