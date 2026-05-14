<script setup lang="ts">
import LoginForm from '../components/LoginForm.vue'
import ThemeSwitcher from '../components/ThemeSwitcher.vue'
import { useTheme } from '../composables/useTheme'
import { navigateAfterLogin } from '../api/authNavigation'

const theme = useTheme()

function onLoginSuccess() {
  navigateAfterLogin()
}
</script>

<template>
  <div class="auth-page">
    <div class="auth-top-bar">
      <ThemeSwitcher :currentTheme="theme.currentTheme.value" @change-theme="theme.setTheme" />
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
  background:
    linear-gradient(135deg, rgba(255, 255, 255, 0.16), transparent 28%),
    linear-gradient(225deg, rgba(255, 255, 255, 0.12), transparent 32%),
    var(--shell-bg-image, var(--bg-shell));
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
}

.auth-top-bar {
  display: flex;
  justify-content: flex-end;
  padding: 10px 12px;
  position: absolute;
  top: 18px;
  right: 18px;
  z-index: 100;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.2);
  border: 1px solid rgba(255, 255, 255, 0.24);
  backdrop-filter: blur(22px) saturate(160%);
  -webkit-backdrop-filter: blur(22px) saturate(160%);
  box-shadow: 0 14px 34px rgba(30, 41, 59, 0.08);
}

.page-fade-enter-active,
.page-fade-leave-active {
  transition: opacity 0.28s ease, transform 0.28s ease;
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
    padding: 10px;
  }

  .auth-top-bar {
    top: 8px;
    right: 8px;
    padding: 10px 12px;
  }
}
</style>
