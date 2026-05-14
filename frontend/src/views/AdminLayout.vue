<script setup lang="ts">
import { computed, ref, onMounted, onBeforeUnmount } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useTheme } from '../composables/useTheme'
import { useLexicon } from '../composables/useLexicon'
import { logout, getUsername, isAdmin } from '../api/auth'
import ThemeSwitcher from '../components/ThemeSwitcher.vue'
import LexiconSwitcher from '../components/LexiconSwitcher.vue'
import GlobalSearch from '../components/GlobalSearch.vue'

const router = useRouter()
const route = useRoute()
const theme = useTheme()
const { lexicon } = useLexicon()
const currentUsername = computed(() => getUsername() ?? '')
const userInitials = computed(() => currentUsername.value ? currentUsername.value.charAt(0).toUpperCase() : '总')

interface NavItem {
  key: string
  label: string
  routeName: string
  icon: string
  adminOnly?: boolean
}

const navItems = computed<NavItem[]>(() => [
  { key: 'dashboard', label: lexicon.value.dashboard.label, routeName: 'dashboard', icon: 'home' },
  { key: 'publications', label: lexicon.value.publications.label, routeName: 'publications', icon: 'book' },
  { key: 'users', label: lexicon.value.users.label, routeName: 'admin-users', icon: 'users', adminOnly: true },
  { key: 'logs', label: lexicon.value.logs.label, routeName: 'admin-logs', icon: 'log', adminOnly: true },
])

const visibleNavItems = computed(() => navItems.value.filter((item) => !item.adminOnly || isAdmin()))
const activeRouteName = computed(() => route.name as string)

// 灵魂水印逻辑
const soulMap = computed<Record<string, string>>(() => ({
  'dashboard': lexicon.value.dashboard.soul,
  'publications': lexicon.value.publications.soul,
  'admin-users': lexicon.value.users.soul,
  'admin-logs': lexicon.value.logs.soul,
  'settings': lexicon.value.settings.soul
}))
const currentSoul = computed(() => soulMap.value[activeRouteName.value] || lexicon.value.dashboard.soul)

function navigateTo(routeName: string) {
  router.push({ name: routeName })
}

async function handleLogout() {
  await logout()
  userDropdownOpen.value = false
  await router.push({ name: 'login' })
}

function goToSettings() {
  router.push({ name: 'settings' })
}

// User Dropdown State
const userDropdownOpen = ref(false)
const userDropdownRoot = ref<HTMLElement | null>(null)

function toggleUserDropdown() {
  userDropdownOpen.value = !userDropdownOpen.value
}

function onUserClickOutside(e: MouseEvent) {
  if (userDropdownOpen.value && userDropdownRoot.value && !userDropdownRoot.value.contains(e.target as Node)) {
    userDropdownOpen.value = false
  }
}

onMounted(() => {
  document.addEventListener('click', onUserClickOutside, { capture: true })
})

onBeforeUnmount(() => {
  document.removeEventListener('click', onUserClickOutside, { capture: true })
})
</script>

<template>
  <div class="spatial-workspace">
    <!-- Ambient Background -->
    <div class="ambient-bg">
      <div class="brand-glow-sphere"></div>
      <div class="brand-glow-sphere secondary"></div>
    </div>

    <!-- 灵魂水印 -->
    <transition name="soul-fade" mode="out-in">
      <div :key="currentSoul" class="page-soul-watermark">
        {{ currentSoul }}
      </div>
    </transition>

    <!-- Floating Island Dock -->
    <aside class="floating-dock">
      <div class="dock-header">
        <div class="logo-mark">
          <div class="logo-seal">{{ lexicon.logo.seal }}</div>
          <div class="logo-text-group">
            <span class="logo-title">{{ lexicon.logo.title }}</span>
            <span class="logo-subtitle">{{ lexicon.logo.subtitle }}</span>
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
          <div class="nav-seal-icon">{{ soulMap[item.routeName] || item.label.charAt(0) }}</div>
          <span class="nav-label">{{ item.label }}</span>
          <div v-if="activeRouteName === item.routeName" class="nav-active-glow"></div>
        </button>
      </nav>

      <!-- Sidebar Poetic Footer -->
      <div class="dock-footer">
        <p class="dock-poetic-quote">万物逆旅，百代过客</p>
      </div>
    </aside>

    <!-- Main Spatial Content Area -->
    <main class="spatial-content">
      <!-- Top Action Bar -->
      <header class="top-action-bar">
        <GlobalSearch />
        <div class="top-actions-group">
          
          <!-- Theme Switcher Component -->
          <ThemeSwitcher :current-theme="theme.currentTheme.value" @change-theme="theme.setTheme" />
          <LexiconSwitcher />
          
          <div class="action-divider"></div>

          <!-- User Profile Dropdown -->
          <div class="user-dropdown-container" ref="userDropdownRoot">
            <button class="user-profile-pill" @click="toggleUserDropdown" :class="{'is-open': userDropdownOpen}">
              <div class="avatar-ring">
                <span class="avatar-text">{{ userInitials }}</span>
              </div>
              <span class="username">{{ currentUsername || '总编' }}</span>
              <svg class="dropdown-chevron" :class="{'rotated': userDropdownOpen}" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>
            </button>

            <!-- Dropdown Popover -->
            <transition name="glass-pop">
              <div v-if="userDropdownOpen" class="user-popover">
                <div class="popover-header">
                  <span class="popover-title">当前账号</span>
                  <div class="popover-account">{{ currentUsername || '总编' }}</div>
                </div>
                <div class="popover-menu">
                  <button class="menu-item" @click="goToSettings">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06-.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
                    偏好设置
                  </button>
                  <div class="menu-divider"></div>
                  <button class="menu-item danger" @click="handleLogout">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
                    安全退出
                  </button>
                </div>
              </div>
            </transition>
          </div>

        </div>
      </header>

      <!-- Scrollable Router View -->
      <div class="scrollable-container">
        <router-view v-slot="{ Component }">
          <component
            :is="Component"
            v-if="Component"
            :key="route.fullPath"
          />
          <div v-else key="route-loading" class="route-loading-state">
            <div class="spinner"></div>
            <span>Loading page for {{ route.fullPath }}...</span>
          </div>
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
  height: 100vh;
  box-sizing: border-box;
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

.dock-footer {
  margin-top: auto;
  padding: 20px 8px 0;
  border-top: 1px solid var(--glass-border-shadow);
  display: flex;
  justify-content: center;
}

.dock-poetic-quote {
  font-size: 0.7rem;
  line-height: 1.6;
  color: var(--text-soft);
  opacity: 0.5;
  letter-spacing: 0.2em;
  font-family: 'Noto Serif SC', serif;
  writing-mode: vertical-rl;
  height: 120px;
  margin: 0;
  text-align: center;
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
  gap: 16px;
  padding: 14px 18px;
  border: none;
  background: transparent;
  border-radius: 16px;
  color: var(--text-sub, #555);
  font-family: 'Noto Serif SC', serif;
  font-size: 1.05rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
  overflow: hidden;
  text-align: left;
}

.nav-item:hover {
  background: var(--glass-pill-bg);
  color: var(--text-main, #1a1a1a);
  transform: translateX(6px);
}

.nav-item.is-active {
  color: #fff;
  background: linear-gradient(135deg, var(--accent-ink, #6a4b2f), var(--accent-amber, #a96e35));
  box-shadow: 0 8px 24px rgba(0,0,0,0.15);
  transform: translateX(6px);
}

.nav-seal-icon {
  flex-shrink: 0;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.85rem;
  border: 1px solid currentColor;
  border-radius: 6px;
  opacity: 0.6;
  transition: all 0.3s ease;
}

.nav-item:hover .nav-seal-icon {
  opacity: 0.9;
}

.nav-item.is-active .nav-seal-icon {
  opacity: 1;
  background: rgba(255, 255, 255, 0.2);
  border-color: rgba(255, 255, 255, 0.6);
  transform: scale(1.05);
}

.nav-label {
  position: relative;
  z-index: 2;
  letter-spacing: 0.15em;
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
  padding: 24px 40px 12px 40px;
  flex-shrink: 0;
}
.top-actions-group {
  display: flex;
  align-items: center;
  background: var(--glass-pill-bg);
  padding: 6px;
  border-radius: 999px;
  border: 1px solid var(--glass-border-highlight);
  box-shadow: 0 4px 12px rgba(0,0,0,0.03);
  gap: 8px;
}

.action-divider {
  width: 1px;
  height: 20px;
  background: var(--glass-border-shadow);
  margin: 0 4px;
}

/* ── User Dropdown ── */
.user-dropdown-container {
  position: relative;
}

.user-profile-pill {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 4px 14px 4px 4px;
  border: none;
  background: transparent;
  border-radius: 999px;
  cursor: pointer;
  transition: all 0.2s ease;
}
.user-profile-pill:hover,
.user-profile-pill.is-open {
  background: rgba(0,0,0,0.04);
}
:global([data-theme="ink-wash"]) .user-profile-pill:hover,
:global([data-theme="rosewood"]) .user-profile-pill:hover,
:global([data-theme="star-sea"]) .user-profile-pill:hover,
:global([data-theme="ink-wash"]) .user-profile-pill.is-open,
:global([data-theme="rosewood"]) .user-profile-pill.is-open,
:global([data-theme="star-sea"]) .user-profile-pill.is-open {
  background: rgba(255,255,255,0.08);
}

.avatar-ring {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: linear-gradient(135deg, var(--glass-border-highlight), var(--glass-border-shadow));
  padding: 2px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.avatar-text {
  width: 100%;
  height: 100%;
  background: var(--bg-panel, #fff);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.8rem;
  font-weight: 800;
  font-family: 'Noto Serif SC', serif;
  color: var(--text-main);
}
:global([data-theme="ink-wash"]) .avatar-text,
:global([data-theme="rosewood"]) .avatar-text,
:global([data-theme="star-sea"]) .avatar-text {
  background: rgba(40,40,40,1);
  color: #fff;
}

.username {
  font-weight: 700;
  font-size: 0.85rem;
  color: var(--text-main);
  letter-spacing: 0.05em;
}

.dropdown-chevron {
  color: var(--text-soft);
  transition: transform 0.2s ease;
}
.dropdown-chevron.rotated {
  transform: rotate(180deg);
}

.user-popover {
  position: absolute;
  top: calc(100% + 12px);
  right: 0;
  width: 220px;
  border-radius: 20px;
  background: var(--glass-panel-bg, rgba(255, 255, 255, 0.85));
  backdrop-filter: blur(24px) saturate(180%);
  -webkit-backdrop-filter: blur(24px) saturate(180%);
  border: 1px solid var(--glass-border-highlight, rgba(255, 255, 255, 0.8));
  box-shadow: 0 24px 48px rgba(0, 0, 0, 0.1), 0 0 0 1px var(--glass-border-shadow, rgba(0,0,0,0.05));
  padding: 8px;
  z-index: 9999;
  transform-origin: top right;
}

:global([data-theme="ink-wash"]) .user-popover,
:global([data-theme="rosewood"]) .user-popover,
:global([data-theme="star-sea"]) .user-popover {
  background: rgba(20, 20, 20, 0.85);
  border-color: rgba(255,255,255,0.1);
  box-shadow: 0 24px 48px rgba(0,0,0,0.4);
}

.popover-header {
  padding: 12px 12px 8px;
  margin-bottom: 4px;
}
.popover-title {
  font-family: monospace;
  font-size: 0.65rem;
  letter-spacing: 0.15em;
  color: var(--text-soft);
  text-transform: uppercase;
}
.popover-account {
  font-size: 0.95rem;
  font-weight: 700;
  color: var(--text-main);
  margin-top: 4px;
}

.popover-menu {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.menu-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 12px;
  border-radius: 12px;
  border: none;
  background: transparent;
  cursor: pointer;
  transition: all 0.2s ease;
  text-align: left;
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--text-main);
}
.menu-item:hover {
  background: rgba(0,0,0,0.04);
}
.menu-item.danger {
  color: #ef4444;
}
.menu-item.danger:hover {
  background: rgba(239, 68, 68, 0.1);
}

:global([data-theme="ink-wash"]) .menu-item:hover,
:global([data-theme="rosewood"]) .menu-item:hover,
:global([data-theme="star-sea"]) .menu-item:hover {
  background: rgba(255,255,255,0.06);
}
:global([data-theme="ink-wash"]) .menu-item.danger:hover,
:global([data-theme="rosewood"]) .menu-item.danger:hover,
:global([data-theme="star-sea"]) .menu-item.danger:hover {
  background: rgba(239, 68, 68, 0.15);
}

.menu-divider {
  height: 1px;
  background: var(--glass-border-shadow);
  margin: 4px;
}

/* ── Scrollable Area ── */
.scrollable-container {
  flex: 1;
  overflow-y: auto;
  padding: 40px;
}

.route-loading-state {
  min-height: 320px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;
  color: var(--text-soft, #6b7280);
}

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

/* Transitions */
.glass-pop-enter-active,
.glass-pop-leave-active {
  transition: opacity 0.2s ease, transform 0.2s cubic-bezier(0.16, 1, 0.3, 1);
}
.glass-pop-enter-from,
.glass-pop-leave-to {
  opacity: 0;
  transform: scale(0.95) translateY(-8px);
}

/* 灵魂水印动画 */
.soul-fade-enter-active,
.soul-fade-leave-active {
  transition: all 0.8s cubic-bezier(0.22, 1, 0.36, 1);
}
.soul-fade-enter-from {
  opacity: 0;
  transform: translateY(-40%) scale(0.8);
  filter: blur(10px);
}
.soul-fade-leave-to {
  opacity: 0;
  transform: translateY(-60%) scale(1.1);
  filter: blur(20px);
}

.page-soul-watermark {
  position: fixed;
  right: 8%;
  top: 50%;
  transform: translateY(-50%);
  font-family: 'Noto Serif SC', serif;
  font-size: 38vh;
  font-weight: 900;
  color: var(--text-main);
  opacity: 0.04;
  pointer-events: none;
  z-index: 1; /* 提升到 Ambient 背景之上 */
  user-select: none;
  writing-mode: vertical-rl;
  letter-spacing: -0.05em;
  filter: drop-shadow(0 0 20px rgba(0,0,0,0.05));
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
    display: none;
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
    display: none;
  }
  .user-profile-pill {
    padding-right: 8px;
  }
}
</style>
