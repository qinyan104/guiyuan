<script setup lang="ts">
import { ref } from 'vue'
import type { ThemeId } from '../composables/useTheme'
import ThemeSwitcher from './ThemeSwitcher.vue'

interface SampleOption {
  id: string
  label: string
}

interface SampleGroup {
  label: string
  samples: SampleOption[]
}

const fileInputRef = ref<HTMLInputElement | null>(null)

function triggerFileInput() {
  fileInputRef.value?.click()
}

withDefaults(
  defineProps<{
    fileName?: string
    dirty?: boolean
    nativeFileAccess?: boolean
    currentTheme?: ThemeId
    currentUsername?: string
    syncStatus?: 'saved' | 'pending' | 'syncing' | 'error'
  }>(),
  {
    fileName: '',
    dirty: false,
    nativeFileAccess: false,
    currentTheme: 'parchment' as ThemeId,
    currentUsername: '',
    syncStatus: 'saved',
  },
)

const emit = defineEmits<{
  (event: 'import-json', payload: Event): void
  (event: 'open-file'): void
  (event: 'create-blank'): void
  (event: 'save-file'): void
  (event: 'save-file-as'): void
  (event: 'download-svg'): void
  (event: 'print-publication'): void
  (event: 'export-json'): void
  (event: 'change-theme', themeId: ThemeId): void
  (event: 'logout'): void
  (event: 'go-back'): void
  (event: 'view-stats'): void
  (event: 'view-timeline'): void
}>()
</script>

<template>
  <header class="topbar">
    <!-- 隐藏的文件输入框 -->
    <input
      ref="fileInputRef"
      type="file"
      accept=".json"
      style="display: none"
      @change="emit('import-json', $event)"
    />

    <div class="topbar__intro">
      <h1 class="clickable-title" @click="emit('go-back')">族谱管理系统</h1>
      <div class="sync-status" :class="[`sync-status--${syncStatus}`]">
        <span class="sync-icon">
          <svg v-if="syncStatus === 'syncing'" class="spinner" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
          <svg v-else-if="syncStatus === 'saved'" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
          <svg v-else-if="syncStatus === 'error'" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
          <svg v-else width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="1"/></svg>
        </span>
        <span class="sync-text">
          {{ syncStatus === 'syncing' ? '正在同步...' : syncStatus === 'saved' ? '已同步到云端' : syncStatus === 'error' ? '同步失败' : '等待同步...' }}
        </span>
      </div>
    </div>

    <div class="topbar__actions" aria-label="工作台操作">
      <div class="topbar__action-strip">
        <div class="dropdown">
          <button class="btn btn--secondary dropdown-trigger" type="button">分析 <span class="caret">&#x25BE;</span></button>
          <div class="dropdown-menu">
            <button class="dropdown-item" type="button" @click="emit('view-stats')">统计报告</button>
            <button class="dropdown-item" type="button" @click="emit('view-timeline')">家族时间线</button>
            <div class="dropdown-divider"></div>
            <button class="dropdown-item" type="button" @click="triggerFileInput">导入 JSON 草稿</button>
          </div>
        </div>

        <div class="dropdown">
          <button class="btn btn--secondary dropdown-trigger" type="button">导出 <span class="caret">&#x25BE;</span></button>
          <div class="dropdown-menu">
            <button class="dropdown-item" type="button" @click="emit('download-svg')">导出高清 SVG</button>
            <button class="dropdown-item" type="button" @click="emit('export-json')">导出 JSON 草稿 (含图片)</button>
            <button class="dropdown-item" type="button" @click="emit('print-publication')">进入打印排版模式</button>
          </div>
        </div>

        <span class="topbar__action-divider" aria-hidden="true" />
        <ThemeSwitcher :current-theme="currentTheme" @change-theme="emit('change-theme', $event)" />
        <span class="topbar__action-divider" aria-hidden="true" />

        <div class="dropdown dropdown--right">
          <button class="btn btn--ghost dropdown-trigger user-trigger" type="button">
            <span class="user-avatar">&#x1F464;</span>
            <span class="user-name">{{ currentUsername || '管理员' }}</span>
          </button>
          <div class="dropdown-menu">
            <button class="dropdown-item text-danger" type="button" @click="emit('logout')">安全退出</button>
          </div>
        </div>
      </div>
    </div>
  </header>
</template>

<style scoped>
.clickable-title {
  cursor: pointer;
  padding: 0.4rem 0.8rem;
  border-radius: 8px;
  transition: all 0.2s;
}

.clickable-title:hover {
  background: var(--bg-hover);
  color: var(--accent-amber);
}

.dropdown {
  position: relative;
  display: inline-block;
}

.dropdown-trigger {
  display: flex;
  align-items: center;
  gap: 0.4rem;
}

.caret {
  font-size: 0.8rem;
  opacity: 0.6;
}

.dropdown-menu {
  position: absolute;
  top: 100%;
  left: 0;
  margin-top: 0.5rem;
  background: var(--bg-panel);
  border: 1px solid var(--border-color);
  border-radius: 12px;
  box-shadow: 0 16px 40px rgba(0, 0, 0, 0.12), 0 4px 12px rgba(0, 0, 0, 0.08);
  padding: 0.5rem 0;
  min-width: 180px;
  opacity: 0;
  visibility: hidden;
  transform: translateY(-10px);
  transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
  z-index: 1000;
  backdrop-filter: blur(24px) saturate(180%);
  -webkit-backdrop-filter: blur(24px) saturate(180%);
}

.dropdown-menu--samples {
  min-width: 220px;
  max-height: 460px;
  overflow-y: auto;
}

.dropdown-section-title {
  margin: 0;
  padding: 0.45rem 1.2rem 0.35rem;
  font-size: 0.74rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  color: var(--text-secondary);
}

.dropdown--right .dropdown-menu {
  left: auto;
  right: 0;
}

.dropdown:hover .dropdown-menu {
  opacity: 1;
  visibility: visible;
  transform: translateY(0);
}

.dropdown-item {
  display: block;
  width: 100%;
  text-align: left;
  padding: 0.6rem 1.2rem;
  background: none;
  border: none;
  color: var(--text-main);
  font-size: 0.9rem;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.2s, color 0.2s;
}

.dropdown-item:hover {
  background: var(--bg-hover);
  color: var(--accent-color, var(--text-main));
}

.dropdown-divider {
  height: 1px;
  background: var(--border-color);
  margin: 0.4rem 0;
}

.text-danger {
  color: #ef4444;
}

.text-danger:hover {
  background: rgba(239, 68, 68, 0.08);
  color: #dc2626;
}

.user-trigger {
  padding: 0.4rem 0.8rem;
  border-radius: 999px;
  background: transparent;
  border: 1px solid transparent;
}

.user-trigger:hover {
  background: var(--bg-hover);
  border-color: var(--border-color);
}

.user-avatar {
  font-size: 1.1rem;
}

.user-name {
  font-weight: 600;
  font-size: 0.9rem;
  color: var(--text-main);
}

.topbar__back-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  background: none;
  border: none;
  color: var(--text-soft, #888);
  font-size: 0.8rem;
  font-weight: 600;
  cursor: pointer;
  padding: 0.25rem 0.5rem;
  border-radius: 6px;
  transition: color 0.15s, background 0.15s;
  margin-right: 0.75rem;
}

.topbar__back-btn:hover {
  color: var(--text-main, #1a1a1a);
  background: var(--bg-hover, rgba(0,0,0,0.04));
}

.topbar__intro h1 {
  font-size: 1rem;
  font-weight: 700;
  color: var(--text-main);
  margin: 0;
}

.sync-status {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.2rem 0.6rem;
  border-radius: 999px;
  background: var(--bg-hover);
  margin-left: 0.5rem;
  transition: all 0.3s ease;
}

.sync-icon {
  display: flex;
  align-items: center;
  justify-content: center;
}

.sync-text {
  font-size: 0.72rem;
  font-weight: 600;
}

.sync-status--saved {
  color: #16a34a;
  background: rgba(22, 163, 74, 0.08);
}

.sync-status--syncing, .sync-status--pending {
  color: var(--accent-amber, #a96e35);
  background: rgba(169, 110, 53, 0.08);
}

.sync-status--error {
  color: #ef4444;
  background: rgba(239, 68, 68, 0.08);
}

.spinner {
  animation: rotate 1.5s linear infinite;
}

@keyframes rotate {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
</style>
