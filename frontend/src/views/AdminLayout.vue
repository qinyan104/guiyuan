<script setup lang="ts">
import { computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useTheme } from '../composables/useTheme'
import { logout, getUsername, isAdmin } from '../api/auth'
import ThemeSwitcher from '../components/ThemeSwitcher.vue'

const router = useRouter()
const route = useRoute()
const theme = useTheme()
const currentUsername = computed(() => getUsername() ?? '')

interface NavItem {
  key: string
  label: string
  routeName: string
  icon: string
  adminOnly?: boolean
}

const navItems: NavItem[] = [
  { key: 'dashboard', label: '首页', routeName: 'dashboard', icon: 'home' },
  { key: 'publications', label: '族谱管理', routeName: 'publications', icon: 'book' },
  { key: 'users', label: '用户管理', routeName: 'admin-users', icon: 'users', adminOnly: true },
  { key: 'logs', label: '操作日志', routeName: 'admin-logs', icon: 'log', adminOnly: true },
]

const visibleNavItems = computed(() => navItems.filter((item) => !item.adminOnly || isAdmin()))

const activeRouteName = computed(() => route.name as string)

function navigateTo(routeName: string) {
  router.push({ name: routeName })
}

function handleLogout() {
  logout()
  router.push({ name: 'login' })
}

function goToSettings() {
  router.push({ name: 'settings' })
}
</script>

<template>
  <div class="admin-layout">
    <!-- Sidebar -->
    <aside class="sidebar">
      <div class="sidebar__brand">
        <div class="sidebar__seal">序</div>
        <div class="sidebar__brand-text">
          <span class="sidebar__title">族谱管理</span>
          <span class="sidebar__subtitle">后台系统</span>
        </div>
      </div>

      <nav class="sidebar__nav">
        <button
          v-for="item in visibleNavItems"
          :key="item.key"
          class="sidebar__nav-item"
          :class="{ 'sidebar__nav-item--active': activeRouteName === item.routeName }"
          @click="navigateTo(item.routeName)"
        >
          <!-- Home icon -->
          <svg v-if="item.icon === 'home'" class="sidebar__nav-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
          <!-- Book icon -->
          <svg v-else-if="item.icon === 'book'" class="sidebar__nav-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>
          <!-- Users icon -->
          <svg v-else-if="item.icon === 'users'" class="sidebar__nav-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
          <!-- Log icon -->
          <svg v-else-if="item.icon === 'log'" class="sidebar__nav-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
          <span>{{ item.label }}</span>
        </button>
      </nav>

      <div class="sidebar__footer">
        <button class="sidebar__nav-item" @click="goToSettings">
          <svg class="sidebar__nav-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
          <span>系统设置</span>
        </button>
      </div>
    </aside>

    <!-- Main Area -->
    <div class="admin-main">
      <!-- Top Bar -->
      <header class="admin-topbar">
        <div class="admin-topbar__left"></div>
        <div class="admin-topbar__right">
          <ThemeSwitcher :current-theme="theme.currentTheme.value" @change-theme="theme.setTheme" />
          <div class="topbar-user">
            <span class="topbar-user__avatar">&#x1F464;</span>
            <span class="topbar-user__name">{{ currentUsername || '管理员' }}</span>
          </div>
          <button class="topbar-logout" @click="handleLogout" title="安全退出">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
          </button>
        </div>
      </header>

      <!-- Page Content -->
      <main class="admin-page-content">
        <router-view />
      </main>
    </div>
  </div>
</template>

<style scoped>
.admin-layout {
  display: flex;
  min-height: 100vh;
  background: var(--bg-shell, #f5f0e8);
}

/* ── Sidebar ── */
.sidebar {
  width: 220px;
  flex-shrink: 0;
  background: var(--bg-panel, rgba(255,255,255,0.92));
  border-right: 1px solid var(--border-color, rgba(0,0,0,0.08));
  display: flex;
  flex-direction: column;
  position: sticky;
  top: 0;
  height: 100vh;
  z-index: 50;
}

.sidebar__brand {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 1.25rem 1.25rem 1rem;
  border-bottom: 1px solid var(--border-color, rgba(0,0,0,0.06));
}

.sidebar__seal {
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, var(--accent-amber, #a96e35), var(--accent-ink, #6a4b2f));
  color: #fff;
  border-radius: 10px;
  font-family: 'Noto Serif SC', serif;
  font-size: 1.1rem;
  font-weight: bold;
  flex-shrink: 0;
}

.sidebar__brand-text {
  display: flex;
  flex-direction: column;
}

.sidebar__title {
  font-weight: 700;
  font-size: 0.9rem;
  color: var(--text-main, #1a1a1a);
  line-height: 1.2;
}

.sidebar__subtitle {
  font-size: 0.7rem;
  color: var(--text-soft, #888);
  font-weight: 500;
}

.sidebar__nav {
  flex: 1;
  padding: 0.75rem 0.75rem;
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
}

.sidebar__nav-item {
  display: flex;
  align-items: center;
  gap: 0.65rem;
  width: 100%;
  padding: 0.6rem 0.85rem;
  border: none;
  background: transparent;
  border-radius: 10px;
  color: var(--text-sub, #555);
  font-size: 0.85rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s ease;
  text-align: left;
}

.sidebar__nav-item:hover {
  background: var(--bg-hover, rgba(0,0,0,0.04));
  color: var(--text-main, #1a1a1a);
}

.sidebar__nav-item--active {
  background: linear-gradient(135deg, var(--accent-ink, #6a4b2f), var(--accent-amber, #a96e35));
  color: #fff;
  font-weight: 600;
  box-shadow: 0 2px 8px rgba(106, 75, 47, 0.25);
}

.sidebar__nav-item--active:hover {
  background: linear-gradient(135deg, var(--accent-ink, #6a4b2f), var(--accent-amber, #a96e35));
  color: #fff;
}

.sidebar__nav-icon {
  flex-shrink: 0;
  opacity: 0.7;
}

.sidebar__nav-item--active .sidebar__nav-icon {
  opacity: 1;
}

.sidebar__footer {
  padding: 0.75rem;
  border-top: 1px solid var(--border-color, rgba(0,0,0,0.06));
}

/* ── Main Area ── */
.admin-main {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.admin-topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 1.5rem;
  height: 52px;
  background: var(--bg-panel, rgba(255,255,255,0.85));
  border-bottom: 1px solid var(--border-color, rgba(0,0,0,0.06));
  backdrop-filter: blur(12px);
  position: sticky;
  top: 0;
  z-index: 40;
}

.admin-topbar__right {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.topbar-user {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--text-main, #1a1a1a);
}

.topbar-user__avatar {
  font-size: 1rem;
}

.topbar-logout {
  background: none;
  border: none;
  color: var(--text-soft, #888);
  cursor: pointer;
  padding: 0.35rem;
  border-radius: 8px;
  display: flex;
  align-items: center;
  transition: color 0.15s, background 0.15s;
}

.topbar-logout:hover {
  color: #ef4444;
  background: rgba(239, 68, 68, 0.08);
}

.admin-page-content {
  flex: 1;
  padding: 1.5rem 2rem;
  overflow-y: auto;
}
</style>
