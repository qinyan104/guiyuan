<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { bootstrapAuthSession } from './api/authSession'
import { getAccessToken } from './api/tokenStore'
import CommandKPalette from './components/CommandKPalette.vue'
import BaseDialog from './components/BaseDialog.vue'
import ToastHost from './components/ToastHost.vue'

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

  <router-view v-else v-slot="{ Component }">
    <transition name="page-fade" mode="out-in">
      <!-- 路由页可能有多个根节点；过渡必须作用于单元素，且同一布局内切换不重建共享状态。 -->
      <div :key="route.matched[0]?.path">
        <component :is="Component" />
      </div>
    </transition>
  </router-view>

  <ToastHost />
  <CommandKPalette />

  <!-- 并发冲突弹窗 -->
  <BaseDialog :visible="!!conflictMessage" title="数据版本冲突" z-index="var(--z-critical)" @update:visible="conflictMessage = null">
    <p style="color: var(--color-neutral-7); margin: 0 0 16px; text-align: center;">{{ conflictMessage }}</p>
    <template #footer>
      <button class="btn btn--primary" @click="handleReload">立即刷新</button>
    </template>
  </BaseDialog>
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
</style>
