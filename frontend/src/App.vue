<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { getAccessToken } from './api/tokenStore'
import { bootstrapAuthSession } from './api/authSession'

const router = useRouter()
const route = useRoute()

const authReady = ref(false)
const conflictMessage = ref<string | null>(null)
const browserWindow = globalThis.window

function handleReload() {
  browserWindow.location.reload()
}

onMounted(async () => {
  browserWindow.addEventListener('concurrency-conflict', (e: any) => {
    conflictMessage.value = e.detail?.message || '数据已被他人修改。'
  })

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

  <!-- Concurrency Conflict Modal -->
  <div v-if="conflictMessage" class="conflict-overlay">
    <div class="conflict-modal">
      <div class="conflict-icon">⚠️</div>
      <h3>数据版本冲突</h3>
      <p>{{ conflictMessage }}</p>
      <div class="conflict-actions">
        <button class="reload-btn" @click="handleReload">立即刷新</button>
      </div>
    </div>
  </div>

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

.conflict-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.4);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
}

.conflict-modal {
  background: var(--bg-card, #fff);
  padding: 32px;
  border-radius: 12px;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
  max-width: 400px;
  width: 90%;
  text-align: center;
  border: 1px solid var(--border-color, #e5e7eb);
}

.conflict-icon {
  font-size: 48px;
  margin-bottom: 16px;
}

.conflict-modal h3 {
  margin: 0 0 12px;
  color: var(--text-main, #111827);
  font-size: 20px;
}

.conflict-modal p {
  margin: 0 0 24px;
  color: var(--text-soft, #6b7280);
  line-height: 1.5;
}

.reload-btn {
  background: var(--accent-amber, #a96e35);
  color: white;
  border: none;
  padding: 12px 24px;
  border-radius: 6px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.reload-btn:hover {
  background: var(--accent-amber-dark, #8e5c2d);
  transform: translateY(-1px);
}
</style>
