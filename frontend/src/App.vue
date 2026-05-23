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
  <!-- 加载画面 -->
  <div v-if="!authReady" class="app-loading-shell">
    <div class="app-loading-spinner"></div>
    <span class="app-loading-text">正在恢复登录状态...</span>
  </div>

  <router-view v-else />

  <!-- 并发冲突弹窗 -->
  <div v-if="conflictMessage" class="conflict-overlay" @click.self="conflictMessage = null">
    <div class="conflict-modal">
      <span class="conflict-icon">⚠️</span>
      <h3>数据版本冲突</h3>
      <p>{{ conflictMessage }}</p>
      <button class="btn btn--primary" @click="handleReload">立即刷新</button>
    </div>
  </div>
</template>

<style scoped>
/* ── 全屏加载 ── */
.app-loading-shell {
  position: fixed;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;
  background: var(--color-neutral-1);
  z-index: 2000;
}

.app-loading-spinner {
  width: 40px;
  height: 40px;
  border: 3px solid var(--color-neutral-4);
  border-top-color: var(--color-accent);
  border-radius: 50%;
  animation: app-spin 1s linear infinite;
}

.app-loading-text {
  font-size: var(--text-copy-14);
  color: var(--color-neutral-7);
}

@keyframes app-spin {
  to { transform: rotate(360deg); }
}

/* ── 冲突弹窗 ── */
.conflict-overlay {
  position: fixed;
  inset: 0;
  background: var(--color-overlay);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
}

.conflict-modal {
  background: var(--color-panel-bg);
  padding: 32px;
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-whisper);
  max-width: 420px;
  width: 90%;
  text-align: center;
  border: 1px solid var(--color-card-stroke);
}

.conflict-icon {
  font-size: 40px;
  display: block;
  margin-bottom: 12px;
}

.conflict-modal h3 {
  margin: 0 0 8px;
  color: var(--color-neutral-10);
  font-family: var(--font-serif);
  font-size: var(--text-title-20);
  font-weight: 500;
}

.conflict-modal p {
  margin: 0 0 24px;
  color: var(--color-neutral-7);
  font-size: var(--text-copy-14);
}
</style>
