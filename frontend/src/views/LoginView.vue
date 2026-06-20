<script setup lang="ts">
import LoginForm from '../components/LoginForm.vue'
import DarkModeToggle from '../components/DarkModeToggle.vue'

import { navigateAfterLogin } from '../api/authNavigation'

function onLoginSuccess() {
  navigateAfterLogin()
}
</script>

<template>
  <div class="auth-page">
    <div class="auth-top-bar">
      <router-link to="/" class="auth-top-link">回到首页</router-link>
      <DarkModeToggle />
    </div>
    <transition name="page-fade" mode="out-in">
      <LoginForm key="login" @success="onLoginSuccess" />
    </transition>
  </div>
</template>

<style scoped>
.auth-page {
  position: fixed;
  inset: 0;
  overflow: auto;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  background:
    radial-gradient(circle at 12% 18%, rgba(196, 58, 49, 0.1), transparent 24%),
    radial-gradient(circle at 88% 14%, rgba(20, 19, 18, 0.06), transparent 20%),
    linear-gradient(180deg, #fbfaf7 0%, #f3f0ea 48%, #eeebe3 100%);
}

.auth-page::before {
  content: '';
  position: fixed;
  inset: 0;
  pointer-events: none;
  background-image:
    linear-gradient(rgba(20, 19, 18, 0.02) 1px, transparent 1px),
    linear-gradient(90deg, rgba(20, 19, 18, 0.02) 1px, transparent 1px);
  background-size: 32px 32px;
  mask-image: radial-gradient(circle at center, black 30%, transparent 100%);
}

.auth-top-bar {
  position: absolute;
  top: 18px;
  right: 18px;
  z-index: 100;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 14px;
  border-radius: 999px;
  background: rgba(249, 248, 245, 0.86);
  border: 1px solid var(--color-neutral-4);
  backdrop-filter: blur(22px);
  -webkit-backdrop-filter: blur(22px);
  box-shadow: var(--shadow-whisper);
}

.auth-top-link {
  display: inline-flex;
  align-items: center;
  min-height: 34px;
  padding: 0 12px;
  border-radius: 999px;
  color: var(--color-neutral-8);
  transition: background var(--duration-fast) var(--ease-breath);
}

.auth-top-link:hover {
  background: rgba(20, 19, 18, 0.05);
}

.page-fade-enter-active,
.page-fade-leave-active {
  transition:
    opacity var(--duration-normal) var(--ease-breath),
    transform var(--duration-normal) var(--ease-breath);
}

.page-fade-enter-from {
  opacity: 0;
  transform: translateX(16px);
}

.page-fade-leave-to {
  opacity: 0;
  transform: translateX(-16px);
}

@media (max-width: 640px) {
  .auth-page {
    padding: 12px;
  }

  .auth-top-bar {
    top: 8px;
    right: 8px;
    left: 8px;
    justify-content: space-between;
  }
}
</style>
