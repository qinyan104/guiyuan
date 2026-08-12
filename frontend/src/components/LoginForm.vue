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
    errorMsg.value = error?.message || '登录失败，请检查账号和密码后重试。'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="auth-stage">
    <section class="login-panel" aria-label="归源登录">
      <aside class="brand-section">
        <div class="brand-lockup">
          <span class="brand-mark" aria-hidden="true">归</span>
          <span>归源</span>
        </div>

        <div class="brand-story">
          <h1>一份家谱，<br />从今天继续。</h1>
          <p>把记得的人、发生过的事和彼此之间的关系，慢慢留在一张可以共同维护的谱里。</p>
        </div>

        <ul class="brand-promises">
          <li><span aria-hidden="true"></span>关系留在一张清楚的画布里</li>
          <li><span aria-hidden="true"></span>家人可以一起补完记忆</li>
          <li><span aria-hidden="true"></span>故事能够被分享，也能被出版</li>
        </ul>
      </aside>

      <main class="form-section">
        <div class="form-wrapper">
          <div class="form-header">
            <h2>回到你的家族档案</h2>
            <p>继续整理你们的故事。</p>
          </div>

          <form class="auth-form" @submit.prevent="onSubmit">
            <div class="input-group" :class="{ 'is-focused': focusedField === 'username' }">
              <label for="login-username">账号或邮箱</label>
              <input
                id="login-username"
                v-model="form.username"
                type="text"
                autocomplete="username"
                required
                @focus="focusedField = 'username'"
                @blur="focusedField = null"
              />
            </div>

            <div class="input-group" :class="{ 'is-focused': focusedField === 'password' }">
              <label for="login-password">登录密码</label>
              <input
                id="login-password"
                v-model="form.password"
                :type="showPassword ? 'text' : 'password'"
                autocomplete="current-password"
                required
                @focus="focusedField = 'password'"
                @blur="focusedField = null"
              />
              <button
                type="button"
                class="password-toggle"
                :aria-label="showPassword ? '隐藏密码' : '显示密码'"
                @click="showPassword = !showPassword"
              >
                <svg v-if="showPassword" aria-hidden="true" viewBox="0 0 24 24" fill="none">
                  <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24M1 1l22 22" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" />
                </svg>
                <svg v-else aria-hidden="true" viewBox="0 0 24 24" fill="none">
                  <path d="M1.5 12s3.8-7 10.5-7 10.5 7 10.5 7-3.8 7-10.5 7S1.5 12 1.5 12Z" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" />
                  <circle cx="12" cy="12" r="2.7" stroke="currentColor" stroke-width="1.7" />
                </svg>
              </button>
            </div>

            <button type="submit" class="submit-btn" data-testid="login-submit" :disabled="loading">
              <span>{{ loading ? '正在进入…' : '进入归源' }}</span>
              <svg v-if="!loading" aria-hidden="true" viewBox="0 0 20 20" fill="none">
                <path d="M4 10h11M11 5l5 5-5 5" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" />
              </svg>
            </button>

            <p v-if="errorMsg" class="error-banner" role="alert">{{ errorMsg }}</p>
          </form>

          <p class="form-footer">登录后可继续维护已授权给你的家谱。</p>
        </div>
      </main>
    </section>
  </div>
</template>

<style scoped>
.auth-stage {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  min-height: min(720px, calc(100vh - 48px));
}

.login-panel {
  display: grid;
  grid-template-columns: minmax(0, 0.94fr) minmax(380px, 0.76fr);
  width: min(100%, 1030px);
  min-height: 600px;
  overflow: hidden;
  background: var(--color-neutral-1);
  border: 1px solid var(--color-neutral-4);
  border-radius: var(--radius-2xl);
  box-shadow: 0 28px 66px rgba(28, 26, 23, 0.12);
}

.brand-section {
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  padding: clamp(32px, 5vw, 64px);
  color: #f9f5ec;
  background:
    radial-gradient(circle at 82% 18%, rgba(217, 85, 69, 0.22), transparent 19rem),
    #171512;
}

.brand-lockup {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  font-family: var(--font-serif);
  font-size: var(--text-copy-16);
  font-weight: 500;
  letter-spacing: 0.14em;
}

.brand-mark {
  display: grid;
  place-items: center;
  width: 31px;
  height: 31px;
  border: 1px solid rgba(249, 245, 236, 0.46);
  border-radius: 9px;
  color: #f9f5ec;
  font-size: 17px;
  line-height: 1;
}

.brand-story {
  max-width: 420px;
  margin: 76px 0;
}

.brand-story h1 {
  margin-bottom: 22px;
  color: #f9f5ec;
  font-family: var(--font-serif);
  font-size: clamp(36px, 4vw, 54px);
  font-weight: 500;
  line-height: 1.2;
  letter-spacing: -0.02em;
}

.brand-story p {
  max-width: 31ch;
  margin: 0;
  color: rgba(249, 245, 236, 0.67);
  font-size: var(--text-copy-15);
  line-height: 1.85;
}

.brand-promises {
  display: grid;
  gap: 12px;
  padding-top: 23px;
  border-top: 1px solid rgba(249, 245, 236, 0.16);
  color: rgba(249, 245, 236, 0.7);
  font-size: var(--text-label-12);
}

.brand-promises li {
  display: flex;
  align-items: center;
  gap: 10px;
}

.brand-promises span {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #d95545;
}

.form-section {
  display: flex;
  align-items: center;
  padding: clamp(32px, 5vw, 64px);
  background: var(--color-neutral-1);
}

.form-wrapper {
  width: min(100%, 364px);
  margin-inline: auto;
}

.form-header {
  margin-bottom: 42px;
}

.form-header h2 {
  margin-bottom: 9px;
  color: var(--color-neutral-10);
  font-family: var(--font-serif);
  font-size: clamp(var(--text-title-24), 2.4vw, var(--text-title-28));
  font-weight: 500;
}

.form-header p,
.form-footer {
  color: var(--color-neutral-7);
  font-size: var(--text-copy-14);
  line-height: 1.7;
}

.input-group {
  position: relative;
  margin-bottom: 22px;
}

.input-group label {
  display: block;
  margin-bottom: 8px;
  color: var(--color-neutral-7);
  font-size: var(--text-label-12);
  font-weight: 500;
  transition: color var(--duration-fast) var(--ease-breath);
}

.input-group.is-focused label { color: var(--color-accent-deep); }

.input-group input {
  min-height: 48px;
  padding: 10px 44px 10px 13px;
  background: var(--color-neutral-2);
  border-color: var(--color-neutral-4);
}

.input-group input:focus {
  background: var(--color-neutral-1);
}

.input-group input:-webkit-autofill {
  -webkit-box-shadow: 0 0 0 30px var(--color-neutral-2) inset !important;
  -webkit-text-fill-color: var(--color-neutral-9) !important;
}

.password-toggle {
  position: absolute;
  right: 8px;
  bottom: 7px;
  display: grid;
  place-items: center;
  width: 34px;
  height: 34px;
  color: var(--color-neutral-6);
  border-radius: var(--radius-sm);
  transition: color var(--duration-fast) var(--ease-breath), background-color var(--duration-fast) var(--ease-breath);
}

.password-toggle:hover {
  color: var(--color-neutral-10);
  background: var(--color-neutral-3);
}

.password-toggle svg,
.submit-btn svg {
  width: 18px;
  height: 18px;
}

.submit-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 9px;
  width: 100%;
  min-height: 50px;
  margin-top: 10px;
  color: var(--color-text-on-accent);
  background: var(--color-accent-gradient);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-accent);
  font-size: var(--text-copy-14);
  font-weight: 500;
  transition: transform var(--duration-fast) var(--ease-spring-gentle), box-shadow var(--duration-fast) var(--ease-breath);
}

.submit-btn:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 16px 36px color-mix(in srgb, var(--color-accent) 25%, transparent);
}

.submit-btn svg {
  transition: transform var(--duration-fast) var(--ease-spring-gentle);
}

.submit-btn:hover:not(:disabled) svg { transform: translateX(3px); }

.submit-btn:disabled {
  opacity: var(--opacity-disabled);
  cursor: not-allowed;
}

.error-banner {
  margin-top: 16px;
  padding: 11px 13px;
  color: var(--color-error);
  background: var(--color-error-muted);
  border: 1px solid color-mix(in srgb, var(--color-error) 35%, transparent);
  border-radius: var(--radius-md);
  font-size: var(--text-copy-13);
  line-height: 1.6;
}

.form-footer {
  margin-top: 24px;
  margin-bottom: 0;
  text-align: center;
}

:global([data-theme='dark'] .login-panel),
:global([data-theme='dark'] .form-section) {
  background: var(--color-neutral-1);
}

:global([data-theme='dark'] .brand-section) {
  background: radial-gradient(circle at 82% 18%, rgba(217, 85, 69, 0.16), transparent 19rem), #080807;
}

@media (max-width: 820px) {
  .login-panel { grid-template-columns: 1fr; min-height: 0; }
  .brand-section { min-height: 310px; }
  .brand-story { margin: 48px 0; }
}

@media (max-width: 560px) {
  .auth-stage { min-height: 100%; }
  .login-panel { border-radius: var(--radius-xl); }
  .brand-section,
  .form-section { padding: 30px 24px; }
  .brand-section { min-height: 280px; }
  .brand-story { margin: 42px 0; }
  .brand-story h1 { font-size: 36px; }
  .brand-promises { gap: 9px; }
}
</style>
