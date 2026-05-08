<script setup lang="ts">
import { ref, onMounted, provide } from 'vue'
import { useTheme } from './composables/useTheme'
import OnboardingGuide from './components/OnboardingGuide.vue'
import http from './api/http'
import { setAccessToken, setUsername, setRole, clearSession } from './api/tokenStore'

const theme = useTheme()

const onboardingRef = ref<InstanceType<typeof OnboardingGuide> | null>(null)
provide('show-onboarding', () => onboardingRef.value?.show())

onMounted(async () => {
  try {
    const resp = await http.post<{ data: { token: string; username: string; role?: string } }>('/auth/refresh')
    const { token, username, role } = resp.data.data
    setAccessToken(token)
    setUsername(username)
    if (role) setRole(role)
  } catch {
    // No valid refresh token — user is not logged in. That's fine.
    clearSession()
  }
})
</script>

<template>
  <router-view />

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
