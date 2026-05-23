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
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  background: var(--color-neutral-1);
}

.auth-top-bar {
  position: absolute;
  top: 18px;
  right: 18px;
  z-index: 100;
  display: flex;
  justify-content: flex-end;
  padding: 8px 14px;
  border-radius: 999px;
  background: var(--color-neutral-2);
  border: 1px solid var(--color-neutral-4);
  backdrop-filter: blur(22px);
  -webkit-backdrop-filter: blur(22px);
  box-shadow: var(--shadow-whisper);
}

/* 入场动画 */
.page-fade-enter-active,
.page-fade-leave-active {
  transition: opacity var(--duration-normal) var(--ease-breath),
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
  }
}
</style>
