<script setup lang="ts">
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

withDefaults(
  defineProps<{
    fileName?: string
    dirty?: boolean
    nativeFileAccess?: boolean
    sampleGroups?: SampleGroup[]
    currentTheme?: ThemeId
    currentUsername?: string
  }>(),
  {
    fileName: '',
    dirty: false,
    nativeFileAccess: false,
    sampleGroups: () => [],
    currentTheme: 'parchment' as ThemeId,
    currentUsername: '',
  },
)

const emit = defineEmits<{
  (event: 'import-json', payload: Event): void
  (event: 'open-file'): void
  (event: 'create-blank'): void
  (event: 'load-sample', sampleId: string): void
  (event: 'save-file'): void
  (event: 'save-file-as'): void
  (event: 'restore-sample'): void
  (event: 'download-svg'): void
  (event: 'print-publication'): void
  (event: 'change-theme', themeId: ThemeId): void
  (event: 'logout'): void
  (event: 'go-back'): void
  (event: 'view-stats'): void
  (event: 'view-timeline'): void
}>()
</script>

<template>
  <header class="topbar">
    <div class="topbar__intro">
      <button class="topbar__back-btn" @click="emit('go-back')">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polyline points="15 18 9 12 15 6"/></svg>
        族谱列表
      </button>
      <h1>族谱无限画布</h1>
    </div>

    <div class="topbar__actions" aria-label="工作台操作">
      <div class="topbar__action-strip">
        <div class="dropdown">
          <button class="btn btn--secondary dropdown-trigger" type="button">族谱 <span class="caret">&#x25BE;</span></button>
          <div class="dropdown-menu">
            <button class="dropdown-item" type="button" @click="emit('go-back')">返回族谱列表</button>
            <div class="dropdown-divider"></div>
            <button class="dropdown-item" type="button" @click="emit('create-blank')">新建空白族谱</button>
            <button class="dropdown-item" type="button" @click="emit('restore-sample')">恢复默认示例</button>
            <div class="dropdown-divider"></div>
            <button class="dropdown-item" type="button" @click="emit('view-stats')">统计分析</button>
            <button class="dropdown-item" type="button" @click="emit('view-timeline')">家族时间线</button>
          </div>
        </div>

        <div v-if="sampleGroups.length" class="dropdown">
          <button class="btn btn--secondary dropdown-trigger" type="button">王朝示例 <span class="caret">&#x25BE;</span></button>
          <div class="dropdown-menu dropdown-menu--samples">
            <template v-for="(group, groupIndex) in sampleGroups" :key="group.label">
              <p class="dropdown-section-title">{{ group.label }}</p>
              <button
                v-for="sample in group.samples"
                :key="sample.id"
                class="dropdown-item"
                type="button"
                @click="emit('load-sample', sample.id)"
              >
                {{ sample.label }}
              </button>
              <div v-if="groupIndex < sampleGroups.length - 1" class="dropdown-divider"></div>
            </template>
          </div>
        </div>

        <div class="dropdown">
          <button class="btn btn--secondary dropdown-trigger" type="button">导出 <span class="caret">&#x25BE;</span></button>
          <div class="dropdown-menu">
            <button class="dropdown-item" type="button" @click="emit('download-svg')">导出高清 SVG</button>
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
</style>
