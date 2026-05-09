<script setup lang="ts">
import { ref, onMounted, provide } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useTheme } from './composables/useTheme'
import OnboardingGuide from './components/OnboardingGuide.vue'
import { getAccessToken } from './api/tokenStore'
import { bootstrapAuthSession } from './api/authSession'

const theme = useTheme()
const router = useRouter()
const route = useRoute()

const onboardingRef = ref<InstanceType<typeof OnboardingGuide> | null>(null)
const authReady = ref(false)
provide('show-onboarding', () => onboardingRef.value?.show())

onMounted(async () => {
  const sessionTokenAtStart = getAccessToken()
  const restored = sessionTokenAtStart ? true : await bootstrapAuthSession()

  if (restored && route.name === 'login') {
    await router.replace({ name: 'dashboard' })
  } else if (!restored && sessionTokenAtStart && !route.meta.public && !getAccessToken()) {
    await router.replace({ name: 'login' })
  }

  authReady.value = true
})
</script>

<template>
  <div v-if="!authReady" class="app-loading-shell">
    <div class="app-loading-spinner"></div>
    <span>正在恢复登录状态...</span>
  </div>
  <router-view v-else />

  <OnboardingGuide ref="onboardingRef" />

  <!-- Material Textures -->
  <svg style="position: absolute; width: 0; height: 0;" aria-hidden="true">
    <filter id="su-paper-texture">
      <feTurbulence type="fractalNoise" baseFrequency="0.04" numOctaves="5" result="noise" />
      <feColorMatrix in="noise" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.05 0" />
      <feBlend in="SourceGraphic" mode="multiply" />
    </filter>
    <filter id="ou-silk-texture">
      <feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves="3" result="noise" />
      <feDisplacementMap in="SourceGraphic" in2="noise" scale="1" />
    </filter>
  </svg>
</template>

<style scoped>
.app-loading-shell {
  position: fixed;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  background:
    linear-gradient(135deg, rgba(255, 255, 255, 0.16), transparent 28%),
    linear-gradient(225deg, rgba(255, 255, 255, 0.12), transparent 32%),
    var(--shell-bg-image, var(--bg-shell, #f5f0e8));
  color: var(--text-soft, #6b7280);
  font-weight: 600;
  z-index: 2000;
}

.app-loading-spinner {
  width: 40px;
  height: 40px;
  border: 3px solid rgba(0, 0, 0, 0.08);
  border-top-color: var(--accent-amber, #a96e35);
  border-radius: 50%;
  animation: app-spin 1s linear infinite;
}

@keyframes app-spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
