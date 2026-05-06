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
  { key: 'dashboard', label: '控制台', routeName: 'dashboard', icon: 'home' },
  { key: 'publications', label: '馆藏谱目', routeName: 'publications', icon: 'book' },
  { key: 'users', label: '编委名录', routeName: 'admin-users', icon: 'users', adminOnly: true },
  { key: 'logs', label: '修谱纪事', routeName: 'admin-logs', icon: 'log', adminOnly: true },
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
  <div class="spatial-workspace">
    <!-- Ambient Background -->
    <div class="ambient-bg">
      <div class="brand-glow-sphere"></div>
      <div class="brand-glow-sphere secondary"></div>
    </div>

    <!-- Floating Island Dock -->
    <aside class="floating-dock">
      <div class="dock-header">
        <div class="logo-mark">
          <div class="logo-seal">序</div>
          <div class="logo-text-group">
            <span class="logo-title">数字档案馆</span>
            <span class="logo-subtitle">PROLOGUE ARCHIVE</span>
          </div>
        </div>
      </div>

      <nav class="dock-nav">
        <button
          v-for="item in visibleNavItems"
          :key="item.key"
          class="nav-item"
          :class="{ 'is-active': activeRouteName === item.routeName }"
          @click="navigateTo(item.routeName)"
        >
          <!-- Home icon -->
          <svg v-if="item.icon === 'home'" class="nav-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
          <!-- Book icon -->
          <svg v-else-if="item.icon === 'book'" class="nav-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>
          <!-- Users icon -->
          <svg v-else-if="item.icon === 'users'" class="nav-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
          <!-- Log icon -->
          <svg v-else-if="item.icon === 'log'" class="nav-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
          
          <span class="nav-label">{{ item.label }}</span>
          <div v-if="activeRouteName === item.routeName" class="nav-active-glow"></div>
        </button>
      </nav>
    </aside>

    <!-- Main Spatial Content Area -->
    <main class="spatial-content">
      <!-- Top Action Bar -->
      <header class="top-action-bar">
        <div class="spacer"></div>
        <div class="top-actions-group">
          <!-- User Profile -->
          <div class="user-profile-pill">
            <div class="avatar-ring">
              <span class="avatar-icon">&#x1F464;</span>
            </div>
            <span class="username">{{ currentUsername || '总编' }}</span>
          </div>

          <div class="action-divider"></div>

          <!-- Action Buttons -->
          <ThemeSwitcher :current-theme="theme.currentTheme.value" @change-theme="theme.setTheme" class="action-btn" />
          <button class="action-btn" @click="goToSettings" title="系统设置">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
          </button>
          <button class="action-btn logout" @click="handleLogout" title="安全退出">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
          </button>
        </div>
      </header>

      <!-- Scrollable Router View -->
      <div class="scrollable-container">
        <router-view v-slot="{ Component }">
          <transition name="fade-slide" mode="out-in">
            <component :is="Component" />
          </transition>
        </router-view>
      </div>
    </main>
  </div>
</template>

<style scoped>
.spatial-workspace {
  --glass-bg: rgba(255, 255, 255, 0.4);
  --glass-border-highlight: rgba(255, 255, 255, 0.6);
  --glass-border-shadow: rgba(255, 255, 255, 0.15);
  --glass-seal-bg: linear-gradient(135deg, rgba(255,255,255,0.9), rgba(255,255,255,0.3));
  --glass-pill-bg: rgba(255, 255, 255, 0.5);
  --glow-opacity: 0.2;
  
  display: flex;
  min-height: 100vh;
  width: 100vw;
  background: 
    linear-gradient(135deg, rgba(255, 255, 255, 0.16), transparent 28%),
    linear-gradient(225deg, rgba(255, 255, 255, 0.12), transparent 32%),
    var(--shell-bg-image, var(--bg-shell, #f5f0e8));
  position: relative;
  overflow: hidden;
  padding: 24px;
  gap: 24px;
}

:global([data-theme="ink-wash"]) .spatial-workspace,
:global([data-theme="rosewood"]) .spatial-workspace,
:global([data-theme="star-sea"]) .spatial-workspace {
  --glass-bg: rgba(0, 0, 0, 0.4);
  --glass-border-highlight: rgba(255, 255, 255, 0.08);
  --glass-border-shadow: rgba(0, 0, 0, 0.6);
  --glass-seal-bg: linear-gradient(135deg, rgba(0, 0, 0, 0.8), rgba(0, 0, 0, 0.4));
  --glass-pill-bg: rgba(0, 0, 0, 0.5);
  --glow-opacity: 0.03;
}

/* ── Ambient Background ── */
.ambient-bg {
  position: absolute;
  inset: 0;
  z-index: 0;
  pointer-events: none;
  overflow: hidden;
}

.brand-glow-sphere {
  position: absolute;
  width: 600px;
  height: 600px;
  background: radial-gradient(circle, var(--accent-amber, #a96e35) 0%, transparent 70%);
  opacity: var(--glow-opacity);
  filter: blur(80px);
  top: -150px;
  left: -100px;
  animation: drift 15s ease-in-out infinite alternate;
}

.brand-glow-sphere.secondary {
  background: radial-gradient(circle, var(--accent-ink, #6a4b2f) 0%, transparent 70%);
  top: auto;
  bottom: -200px;
  left: auto;
  right: 10%;
  animation-delay: -7s;
}

@keyframes drift {
  0% { transform: translate(0, 0) scale(1); }
  100% { transform: translate(40px, 60px) scale(1.1); }
}

/* ── Floating Island Dock ── */
.floating-dock {
  position: relative;
  z-index: 10;
  width: 260px;
  border-radius: 24px;
  background: var(--glass-bg);
  backdrop-filter: blur(40px) saturate(180%);
  -webkit-backdrop-filter: blur(40px) saturate(180%);
  box-shadow: 
    0 24px 48px -12px rgba(0,0,0,0.1),
    inset 0 1px 0 var(--glass-border-highlight),
    inset 0 -1px 0 var(--glass-border-shadow);
  display: flex;
  flex-direction: column;
  padding: 24px 16px;
  flex-shrink: 0;
}

.dock-header {
  margin-bottom: 40px;
  padding: 0 8px;
}

.logo-mark {
  display: flex;
  align-items: center;
  gap: 12px;
}

.logo-seal {
  width: 44px;
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--glass-seal-bg);
  border: 1px solid var(--glass-border-highlight);
  border-radius: 12px;
  font-family: 'Noto Serif SC', serif;
  font-size: 1.3rem;
  font-weight: bold;
  color: var(--text-main, #1a1a1a);
  box-shadow: 0 8px 16px rgba(0,0,0,0.08);
}

.logo-text-group {
  display: flex;
  flex-direction: column;
}

.logo-title {
  font-weight: 700;
  font-size: 1.05rem;
  color: var(--text-main, #1a1a1a);
  letter-spacing: 0.05em;
  font-family: 'Noto Serif SC', serif;
}

.logo-subtitle {
  font-size: 0.65rem;
  letter-spacing: 0.2em;
  color: var(--text-soft, #888);
  font-family: monospace;
  margin-top: 2px;
}

.dock-nav {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.nav-item {
  position: relative;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 16px;
  border: none;
  background: transparent;
  border-radius: 16px;
  color: var(--text-sub, #555);
  font-size: 0.95rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
  overflow: hidden;
  text-align: left;
}

.nav-item:hover {
  background: var(--glass-pill-bg);
  color: var(--text-main, #1a1a1a);
  transform: translateX(4px);
}

.nav-item.is-active {
  color: #fff;
  background: linear-gradient(135deg, var(--accent-ink, #6a4b2f), var(--accent-amber, #a96e35));
  box-shadow: 0 8px 24px rgba(0,0,0,0.15);
  transform: translateX(4px);
}

.nav-icon {
  flex-shrink: 0;
  opacity: 0.8;
  transition: transform 0.3s ease;
}

.nav-item.is-active .nav-icon {
  opacity: 1;
  transform: scale(1.1);
}

.nav-label {
  position: relative;
  z-index: 2;
  letter-spacing: 0.05em;
}

.nav-active-glow {
  position: absolute;
  inset: -2px;
  background: linear-gradient(135deg, var(--accent-amber), var(--accent-ink));
  filter: blur(12px);
  opacity: 0.5;
  z-index: 0;
}

/* ── Main Spatial Content ── */
.spatial-content {
  flex: 1;
  position: relative;
  z-index: 10;
  display: flex;
  flex-direction: column;
  min-width: 0;
  border-radius: 24px;
  overflow: hidden;
  background: var(--glass-bg);
  backdrop-filter: blur(20px) saturate(150%);
  -webkit-backdrop-filter: blur(20px) saturate(150%);
  box-shadow: 
    0 24px 48px -12px rgba(0,0,0,0.1),
    inset 0 1px 0 var(--glass-border-highlight),
    inset 0 -1px 0 var(--glass-border-shadow);
}

/* ── Top Action Bar ── */
.top-action-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 24px 40px 12px 40px; /* Top padding pushes everything nicely */
  flex-shrink: 0;
}

.top-actions-group {
  display: flex;
  align-items: center;
  background: var(--glass-pill-bg);
  padding: 6px 6px 6px 16px;
  border-radius: 999px;
  border: 1px solid var(--glass-border-highlight);
  box-shadow: 0 4px 12px rgba(0,0,0,0.03);
  gap: 8px;
}

.user-profile-pill {
  display: flex;
  align-items: center;
  gap: 10px;
  padding-right: 8px;
}

.avatar-ring {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: linear-gradient(135deg, var(--glass-border-highlight), transparent);
  padding: 2px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.avatar-icon {
  width: 100%;
  height: 100%;
  background: var(--bg-panel, #fff);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.7rem;
  color: var(--text-main);
}

.username {
  font-weight: 700;
  font-size: 0.85rem;
  color: var(--text-main);
  letter-spacing: 0.05em;
}

.action-divider {
  width: 1px;
  height: 20px;
  background: var(--glass-border-shadow);
  margin: 0 4px;
}

.action-btn {
  background: none;
  border: none;
  color: var(--text-soft, #888);
  width: 32px;
  height: 32px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s ease;
}

.action-btn:hover {
  background: var(--glass-bg);
  color: var(--text-main);
  transform: scale(1.05);
}

.action-btn.logout:hover {
  color: #ef4444;
  background: rgba(239, 68, 68, 0.1);
}

/* ── Scrollable Area ── */
.scrollable-container {
  flex: 1;
  overflow-y: auto;
  padding: 12px 40px 40px 40px; /* Nice breathing room on sides and bottom */
}

/* Custom Scrollbar for the container */
.scrollable-container::-webkit-scrollbar {
  width: 8px;
}
.scrollable-container::-webkit-scrollbar-track {
  background: transparent;
}
.scrollable-container::-webkit-scrollbar-thumb {
  background: var(--glass-border-shadow);
  border-radius: 4px;
}
.scrollable-container::-webkit-scrollbar-thumb:hover {
  background: var(--text-soft);
}

/* Router Transitions */
.fade-slide-enter-active,
.fade-slide-leave-active {
  transition: opacity 0.4s ease, transform 0.4s cubic-bezier(0.16, 1, 0.3, 1);
}
.fade-slide-enter-from {
  opacity: 0;
  transform: scale(0.98) translateY(10px);
}
.fade-slide-leave-to {
  opacity: 0;
  transform: scale(1.02) translateY(-10px);
}

@media (max-width: 960px) {
  .spatial-workspace {
    flex-direction: column;
    padding: 16px;
    gap: 16px;
  }
  .floating-dock {
    width: 100%;
    flex-direction: row;
    align-items: center;
    padding: 12px 20px;
    border-radius: 20px;
  }
  .dock-header {
    margin: 0;
    margin-right: 24px;
  }
  .logo-text-group {
    display: none;
  }
  .dock-nav {
    flex-direction: row;
    align-items: center;
    gap: 8px;
    flex: 1;
  }
  .nav-label {
    display: none; /* Icon only on mobile */
  }
  .nav-item {
    padding: 10px;
    border-radius: 12px;
  }
  .top-action-bar {
    padding: 16px 20px 8px 20px;
  }
  .scrollable-container {
    padding: 8px 20px 20px 20px;
  }
  .username {
    display: none; /* Hide username on small screens */
  }
  .user-profile-pill {
    padding-right: 0;
  }
}
</style>
