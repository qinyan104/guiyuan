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
    <div class="glass-container">
      <div class="glass-panel">
        <!-- Left: Brand / Showcase -->
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
              <div class="hero-divider"></div>
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
          <div class="brand-glow-sphere"></div>
          <div class="brand-glow-sphere secondary"></div>
        </aside>

        <!-- Right: Form -->
        <main class="form-section">
          <div class="form-wrapper">
            <div class="form-header">
              <h2 class="form-title">归源·数字档案馆</h2>
              <p class="form-desc">进入无涯画布，追溯家族源流</p>
            </div>

            <form class="auth-form" @submit.prevent="onSubmit">
              <div class="input-group" :class="{ 'is-focused': focusedField === 'username', 'has-value': form.username }">
                <div class="input-glow"></div>
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
                <div class="input-glow"></div>
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

              <transition name="fade-slide">
                <div v-if="errorMsg" class="error-banner">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>
                  {{ errorMsg }}
                </div>
              </transition>

              <button type="submit" class="submit-btn" :class="{ 'is-loading': loading }" :disabled="loading">
                <span class="btn-text">{{ loading ? '验证中...' : '进入工作台' }}</span>
                <span class="btn-shimmer"></span>
                <svg class="btn-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" /></svg>
              </button>
            </form>
          </div>
        </main>
      </div>
    </div>
  </div>
</template>

<style scoped>
.auth-stage {
  --glass-bg: rgba(255, 255, 255, 0.15);
  --glass-border-highlight: rgba(255, 255, 255, 0.6);
  --glass-border-shadow: rgba(255, 255, 255, 0.15);
  --glass-brand-bg: linear-gradient(135deg, rgba(255,255,255,0.25), rgba(255,255,255,0.05));
  --glass-form-bg: rgba(255, 255, 255, 0.08);
  --glass-seal-bg: linear-gradient(135deg, rgba(255,255,255,0.9), rgba(255,255,255,0.3));
  --glass-feature-bg: rgba(255, 255, 255, 0.4);
  --glass-pill-bg: rgba(0, 0, 0, 0.05);
  --glass-pill-active: #fff;
  --glass-input-bg: rgba(255, 255, 255, 0.5);
  --glass-input-border: rgba(255, 255, 255, 0.6);
  --glass-input-focus: rgba(255, 255, 255, 0.9);
  --glow-opacity: 0.2;

  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100%;
  width: 100%;
  padding: 2rem;
  z-index: 10;
  perspective: 1000px;
}

:global([data-theme="ink-wash"]) .auth-stage,
:global([data-theme="rosewood"]) .auth-stage,
:global([data-theme="star-sea"]) .auth-stage {
  --glass-bg: rgba(0, 0, 0, 0.75);
  --glass-border-highlight: rgba(255, 255, 255, 0.06);
  --glass-border-shadow: rgba(0, 0, 0, 0.6);
  --glass-brand-bg: linear-gradient(135deg, rgba(0, 0, 0, 0.6), rgba(0, 0, 0, 0.2));
  --glass-form-bg: rgba(0, 0, 0, 0.4);
  --glass-seal-bg: linear-gradient(135deg, rgba(0, 0, 0, 0.8), rgba(0, 0, 0, 0.4));
  --glass-feature-bg: rgba(0, 0, 0, 0.5);
  --glass-pill-bg: rgba(0, 0, 0, 0.6);
  --glass-pill-active: rgba(255, 255, 255, 0.1);
  --glass-input-bg: rgba(0, 0, 0, 0.5);
  --glass-input-border: rgba(255, 255, 255, 0.08);
  --glass-input-focus: rgba(0, 0, 0, 0.8);
  --glow-opacity: 0.02;
}

.glass-container {
  position: relative;
  width: 100%;
  max-width: 1100px;
  animation: floatUp 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards;
}

.glass-container::before {
  content: '';
  position: absolute;
  inset: -2px;
  border-radius: 34px;
  background: linear-gradient(135deg, var(--glass-border-highlight) 0%, transparent 50%, var(--glass-border-shadow) 100%);
  z-index: -1;
  mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
  -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
  -webkit-mask-composite: xor;
  mask-composite: exclude;
  padding: 1px;
}

.glass-panel {
  display: flex;
  background: var(--glass-bg);
  backdrop-filter: blur(40px) saturate(180%);
  -webkit-backdrop-filter: blur(40px) saturate(180%);
  border-radius: 32px;
  box-shadow: 
    0 40px 80px -20px rgba(0,0,0,0.15),
    inset 0 1px 0 var(--glass-border-highlight),
    inset 0 -1px 0 var(--glass-border-shadow);
  overflow: hidden;
  min-height: 640px;
}

/* BRAND SECTION */
.brand-section {
  flex: 1.2;
  position: relative;
  padding: 4rem;
  background: var(--glass-brand-bg);
  border-right: 1px solid var(--glass-border-shadow);
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  overflow: hidden;
}

.brand-glow-sphere {
  position: absolute;
  width: 500px;
  height: 500px;
  background: radial-gradient(circle, var(--accent-amber) 0%, transparent 70%);
  opacity: var(--glow-opacity);
  filter: blur(60px);
  top: -100px;
  left: -100px;
  pointer-events: none;
  animation: drift 10s ease-in-out infinite alternate;
}

.brand-glow-sphere.secondary {
  background: radial-gradient(circle, var(--accent-ink) 0%, transparent 70%);
  top: auto;
  bottom: -150px;
  left: auto;
  right: -100px;
  animation-delay: -5s;
}

@keyframes drift {
  0% { transform: translate(0, 0) scale(1); }
  100% { transform: translate(30px, 50px) scale(1.1); }
}

/* EDITORIAL LAYOUT */
.editorial-layout {
  position: relative;
  z-index: 2;
  display: flex;
  flex-direction: column;
  height: 100%;
}

.layout-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  border-bottom: 1px solid var(--glass-border-shadow);
  padding-bottom: 2.5rem;
}

.logo-mark {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.logo-seal {
  width: 42px;
  height: 42px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--glass-seal-bg);
  border: 1px solid var(--glass-border-highlight);
  border-radius: 12px;
  font-family: 'Noto Serif SC', serif;
  font-size: 1.25rem;
  font-weight: bold;
  color: var(--text-main);
  box-shadow: 0 8px 16px rgba(0,0,0,0.05);
}

.logo-text {
  font-weight: 700;
  letter-spacing: 0.3em;
  font-size: 0.75rem;
  color: var(--text-main);
}

.layout-meta {
  font-family: monospace;
  font-size: 0.75rem;
  letter-spacing: 0.2em;
  color: var(--text-soft);
  margin-top: 0.5rem;
}

.layout-body {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
  padding: 3rem 0;
}

.hero-eyebrow {
  font-size: 0.8rem;
  letter-spacing: 0.4em;
  color: var(--accent-amber);
  margin-bottom: 1.5rem;
  font-weight: 600;
}

.hero-title {
  font-size: 3.2rem;
  line-height: 1.3;
  font-family: 'Noto Serif SC', serif;
  color: var(--text-main);
  margin: 0;
  letter-spacing: 0.05em;
  font-weight: 500;
}

.text-italic {
  font-style: italic;
  font-weight: 300;
  color: var(--text-soft);
  font-family: serif;
}

.text-gradient {
  background: linear-gradient(135deg, var(--accent-amber), var(--accent-ink));
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  display: inline-block;
  font-weight: 700;
}

.hero-divider {
  width: 60px;
  height: 1px;
  background: var(--glass-border-highlight);
  margin: 3rem 0;
}

.hero-quote {
  font-size: 1.05rem;
  line-height: 2.2;
  color: var(--text-sub);
  margin: 0;
  letter-spacing: 0.05em;
  font-weight: 400;
}

.layout-footer {
  display: flex;
  justify-content: space-between;
  border-top: 1px solid var(--glass-border-shadow);
  padding-top: 2.5rem;
}

.footer-info {
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
}

.text-right {
  text-align: right;
  align-items: flex-end;
}

.info-label {
  font-size: 0.65rem;
  letter-spacing: 0.25em;
  color: var(--text-soft);
  text-transform: uppercase;
}

.info-value {
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--text-main);
  letter-spacing: 0.05em;
}

/* FORM SECTION */
.form-section {
  flex: 1;
  padding: 4rem;
  display: flex;
  flex-direction: column;
  justify-content: center;
  background: var(--glass-form-bg);
}

.form-wrapper {
  max-width: 380px;
  width: 100%;
  margin: 0 auto;
}

.form-header {
  margin-bottom: 3rem;
}

.form-title {
  font-size: 2.2rem;
  margin: 0 0 0.5rem;
  color: var(--text-main);
  font-family: 'Noto Serif SC', serif;
}

.form-desc {
  color: var(--text-soft);
  margin: 0;
  font-size: 1rem;
}

.auth-form {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.input-group {
  position: relative;
  display: flex;
  flex-direction: column;
  border-radius: 18px;
  background: var(--glass-input-bg);
  border: 1px solid var(--glass-input-border);
  padding: 0.75rem 1.25rem;
  transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}

.input-glow {
  position: absolute;
  inset: -1px;
  border-radius: 18px;
  background: linear-gradient(135deg, var(--accent-amber), var(--accent-ink));
  opacity: 0;
  z-index: -1;
  transition: opacity 0.3s ease;
  filter: blur(8px);
}

.input-group.is-focused {
  background: var(--glass-input-focus);
  border-color: transparent;
  transform: translateY(-2px);
  box-shadow: 0 12px 32px rgba(0,0,0,0.08);
}

.input-group.is-focused .input-glow {
  opacity: 0.4;
}

.input-group label {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  left: 1.25rem;
  font-size: 1rem;
  color: var(--text-soft);
  pointer-events: none;
  transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
  font-weight: 600;
}

.input-group.is-focused label,
.input-group.has-value label {
  top: 0.85rem;
  transform: translateY(0);
  font-size: 0.75rem;
  color: var(--accent-amber);
  font-weight: 800;
}

.input-group input {
  border: none;
  background: none;
  outline: none;
  font-size: 1.05rem;
  color: var(--text-main);
  padding: 1.35rem 0 0.25rem;
  width: 100%;
  font-weight: 600;
}

/* 修复浏览器自动填充的难看背景 */
.input-group input:-webkit-autofill,
.input-group input:-webkit-autofill:hover, 
.input-group input:-webkit-autofill:focus, 
.input-group input:-webkit-autofill:active {
  -webkit-box-shadow: 0 0 0 30px transparent inset !important;
  -webkit-text-fill-color: var(--text-main) !important;
  transition: background-color 5000s ease-in-out 0s;
  caret-color: var(--text-main);
}

.password-toggle {
  position: absolute;
  right: 1rem;
  top: 50%;
  transform: translateY(-50%);
  background: none;
  border: none;
  color: var(--text-soft);
  cursor: pointer;
  padding: 0.25rem;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: color 0.2s ease;
}

.password-toggle:hover {
  color: var(--text-main);
}

.form-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 0.9rem;
}

.remember-me {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: var(--text-sub);
  cursor: pointer;
  position: relative;
  font-weight: 600;
}

.remember-me input {
  position: absolute;
  opacity: 0;
  cursor: pointer;
  height: 0;
  width: 0;
}

.checkmark {
  height: 20px;
  width: 20px;
  background: var(--glass-input-bg);
  border: 1px solid var(--glass-input-border);
  border-radius: 6px;
  position: relative;
  transition: all 0.2s ease;
}

.remember-me:hover input ~ .checkmark {
  background: var(--glass-input-focus);
}

.remember-me input:checked ~ .checkmark {
  background: var(--text-main);
  border-color: var(--text-main);
}

.checkmark:after {
  content: "";
  position: absolute;
  display: none;
  left: 6px;
  top: 2px;
  width: 5px;
  height: 10px;
  border: solid white;
  border-width: 0 2px 2px 0;
  transform: rotate(45deg);
}

.remember-me input:checked ~ .checkmark:after {
  display: block;
}

.forgot-link {
  color: var(--text-soft);
  text-decoration: none;
  font-weight: 700;
  transition: color 0.2s ease;
}

.forgot-link:hover {
  color: var(--text-main);
}

.submit-btn {
  position: relative;
  background: linear-gradient(135deg, var(--accent-ink) 0%, var(--accent-amber) 100%);
  color: #fff;
  border: none;
  padding: 1.25rem;
  border-radius: 18px;
  font-size: 1.05rem;
  font-weight: 800;
  cursor: pointer;
  display: flex;
  justify-content: space-between;
  align-items: center;
  overflow: hidden;
  box-shadow: 0 12px 24px rgba(0,0,0,0.1);
  transition: transform 0.2s ease, box-shadow 0.2s ease;
  margin-top: 1rem;
}

.submit-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 16px 32px rgba(0,0,0,0.15);
}

.submit-btn:active {
  transform: translateY(0);
}

.submit-btn.is-loading {
  opacity: 0.8;
  cursor: not-allowed;
  transform: none;
}

.btn-shimmer {
  position: absolute;
  top: 0;
  left: -100%;
  width: 50%;
  height: 100%;
  background: linear-gradient(to right, rgba(255,255,255,0) 0%, rgba(255,255,255,0.3) 50%, rgba(255,255,255,0) 100%);
  transform: skewX(-20deg);
  animation: shimmer 3s infinite;
}

@keyframes shimmer {
  0% { left: -100%; }
  20% { left: 200%; }
  100% { left: 200%; }
}

.btn-icon {
  transition: transform 0.3s ease;
}

.submit-btn:hover .btn-icon {
  transform: translateX(4px);
}

.error-banner {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  background: rgba(255, 59, 48, 0.15);
  color: #ff3b30;
  padding: 1rem;
  border-radius: 14px;
  font-size: 0.95rem;
  font-weight: 700;
  border: 1px solid rgba(255, 59, 48, 0.25);
}

.fade-slide-enter-active,
.fade-slide-leave-active {
  transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}
.fade-slide-enter-from,
.fade-slide-leave-to {
  opacity: 0;
  transform: translateY(-10px);
}

@keyframes floatUp {
  0% { opacity: 0; transform: translateY(50px) scale(0.97); }
  100% { opacity: 1; transform: translateY(0) scale(1); }
}

@media (max-width: 960px) {
  .glass-panel {
    flex-direction: column;
  }
  .brand-section {
    padding: 3rem;
    border-right: none;
    border-bottom: 1px solid var(--glass-border-shadow);
  }
  .form-section {
    padding: 3rem;
  }
}

@media (max-width: 640px) {
  .auth-stage {
    padding: 1rem;
  }
  .glass-panel {
    border-radius: 24px;
  }
  .brand-section, .form-section {
    padding: 2rem;
  }
  .hero-title {
    font-size: 2.2rem;
  }
}
</style>
