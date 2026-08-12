<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import { getRole, getUsername, isAdmin, logout } from '../api/auth'
import DarkModeToggle from '../components/DarkModeToggle.vue'
import GlobalSearch from '../components/GlobalSearch.vue'
import LexiconSwitcher from '../components/LexiconSwitcher.vue'
import UserAvatar from '../components/UserAvatar.vue'

const router = useRouter()
const route = useRoute()

const currentUsername = computed(() => getUsername() ?? '')
const avatarTone = computed(() => (getRole() ?? 'USER').toLowerCase())

interface NavItem {
  key: string
  label: string
  routeName: string
  icon: 'home' | 'book' | 'users' | 'log'
  adminOnly?: boolean
}

const navItems: NavItem[] = [
  { key: 'dashboard', label: '总览', routeName: 'dashboard', icon: 'home' },
  { key: 'publications', label: '我的家谱', routeName: 'publications', icon: 'book' },
  { key: 'users', label: '成员', routeName: 'admin-users', icon: 'users', adminOnly: true },
  { key: 'logs', label: '变更记录', routeName: 'admin-logs', icon: 'log', adminOnly: true },
]

const visibleNavItems = computed(() => navItems.filter((item) => !item.adminOnly || isAdmin()))
const activeRouteName = computed(() => route.name as string)
const userDropdownOpen = ref(false)
const userDropdownRoot = ref<HTMLElement | null>(null)

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

function toggleUserDropdown() {
  userDropdownOpen.value = !userDropdownOpen.value
}

function onUserClickOutside(event: MouseEvent) {
  if (userDropdownOpen.value && userDropdownRoot.value && !userDropdownRoot.value.contains(event.target as Node)) {
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
  <div class="app-shell">
    <aside class="app-sidebar">
      <button class="app-brand" aria-label="返回归源总览" @click="navigateTo('dashboard')">
        <span class="app-brand__mark" aria-hidden="true">归</span>
        <span class="app-brand__copy">
          <strong>归源</strong>
          <small>家族数字档案</small>
        </span>
      </button>

      <nav class="app-navigation" aria-label="归源主导航">
        <button
          v-for="item in visibleNavItems"
          :key="item.key"
          class="app-navigation__item"
          :class="{ 'is-active': activeRouteName === item.routeName }"
          :aria-current="activeRouteName === item.routeName ? 'page' : undefined"
          @click="navigateTo(item.routeName)"
        >
          <svg aria-hidden="true" viewBox="0 0 24 24" fill="none">
            <template v-if="item.icon === 'home'">
              <path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V10Z" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round" />
              <path d="M9 21v-7h6v7" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round" />
            </template>
            <template v-else-if="item.icon === 'book'">
              <path d="M5 4.5A2.5 2.5 0 0 1 7.5 2H20v18H7.5A2.5 2.5 0 0 0 5 22V4.5Z" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round" />
              <path d="M5 4.5V20" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" />
            </template>
            <template v-else-if="item.icon === 'users'">
              <circle cx="9" cy="8" r="3" stroke="currentColor" stroke-width="1.7" />
              <path d="M3.5 20a5.5 5.5 0 0 1 11 0M16 4.6a3 3 0 0 1 0 5.8M19.5 20a5.5 5.5 0 0 0-3.3-5" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" />
            </template>
            <template v-else>
              <path d="M5 3h10l4 4v14H5V3Z" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round" />
              <path d="M15 3v5h4M8 12h8M8 16h8" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" />
            </template>
          </svg>
          <span>{{ item.label }}</span>
        </button>
      </nav>

      <p class="app-sidebar__note">每一次补充，都让家谱更完整。</p>
    </aside>

    <main class="app-main">
      <header class="app-topbar">
        <div class="app-topbar__search"><GlobalSearch /></div>
        <div class="app-topbar__tools">
          <DarkModeToggle />
          <LexiconSwitcher />
          <span class="topbar-divider" aria-hidden="true"></span>
          <div ref="userDropdownRoot" class="user-dropdown-container">
            <button class="user-profile-pill" :class="{ 'is-open': userDropdownOpen }" :aria-expanded="userDropdownOpen" @click="toggleUserDropdown">
              <UserAvatar :name="currentUsername || '我的账户'" :tone="avatarTone" />
              <span class="username">{{ currentUsername || '我的账户' }}</span>
              <svg class="dropdown-chevron" :class="{ rotated: userDropdownOpen }" aria-hidden="true" viewBox="0 0 20 20" fill="none">
                <path d="m5 7.5 5 5 5-5" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" />
              </svg>
            </button>

            <Transition name="account-menu">
              <div v-if="userDropdownOpen" class="user-popover">
                <div class="popover-header">
                  <span>当前账号</span>
                  <strong>{{ currentUsername || '我的账户' }}</strong>
                </div>
                <div class="popover-menu">
                  <button class="menu-item" @click="goToSettings">
                    <svg aria-hidden="true" viewBox="0 0 20 20" fill="none">
                      <circle cx="10" cy="10" r="3" stroke="currentColor" stroke-width="1.7" />
                      <path d="M16.2 11.4a1.5 1.5 0 0 0 .3 1.65l.04.05a1.8 1.8 0 0 1-2.55 2.55l-.05-.04a1.5 1.5 0 0 0-1.65-.3 1.5 1.5 0 0 0-.9 1.37v.07a1.8 1.8 0 0 1-3.6 0v-.07a1.5 1.5 0 0 0-.9-1.37 1.5 1.5 0 0 0-1.65.3l-.05.04a1.8 1.8 0 0 1-2.55-2.55l.04-.05a1.5 1.5 0 0 0 .3-1.65 1.5 1.5 0 0 0-1.37-.9h-.07a1.8 1.8 0 0 1 0-3.6h.07a1.5 1.5 0 0 0 1.37-.9 1.5 1.5 0 0 0-.3-1.65l-.04-.05a1.8 1.8 0 0 1 2.55-2.55l.05.04a1.5 1.5 0 0 0 1.65.3 1.5 1.5 0 0 0 .9-1.37v-.07a1.8 1.8 0 0 1 3.6 0v.07a1.5 1.5 0 0 0 .9 1.37 1.5 1.5 0 0 0 1.65-.3l.05-.04a1.8 1.8 0 0 1 2.55 2.55l-.04.05a1.5 1.5 0 0 0-.3 1.65 1.5 1.5 0 0 0 1.37.9h.07a1.8 1.8 0 0 1 0 3.6h-.07a1.5 1.5 0 0 0-1.37.9Z" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round" />
                    </svg>
                    账户设置
                  </button>
                  <div class="menu-divider"></div>
                  <button class="menu-item danger" @click="handleLogout">
                    <svg aria-hidden="true" viewBox="0 0 20 20" fill="none">
                      <path d="M8 4H4v12h4M12 6l4 4-4 4M16 10H8" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" />
                    </svg>
                    安全退出
                  </button>
                </div>
              </div>
            </Transition>
          </div>
        </div>
      </header>

      <div class="app-content">
        <router-view v-slot="{ Component }">
          <component :is="Component" v-if="Component" :key="route.fullPath" />
          <div v-else key="route-loading" class="route-loading-state">
            <span class="route-loading-state__spinner" aria-hidden="true"></span>
            <span>Loading page for {{ route.fullPath }}...</span>
          </div>
        </router-view>
      </div>
    </main>
  </div>
</template>

<style scoped>
.app-shell {
  display: flex;
  width: 100%;
  min-height: 100vh;
  color: var(--color-neutral-9);
  background: var(--color-neutral-1);
}

.app-sidebar {
  display: flex;
  flex: 0 0 230px;
  flex-direction: column;
  min-height: 100vh;
  padding: 26px 16px 20px;
  background: var(--color-neutral-2);
  border-right: 1px solid var(--color-neutral-4);
}

.app-brand {
  display: flex;
  align-items: center;
  gap: 10px;
  width: fit-content;
  padding: 0 8px;
  color: var(--color-neutral-10);
  text-align: left;
}

.app-brand__mark {
  display: grid;
  place-items: center;
  width: 32px;
  height: 32px;
  color: var(--color-accent-deep);
  border: 1px solid color-mix(in srgb, var(--color-accent) 56%, var(--color-neutral-4));
  border-radius: 9px;
  font-family: var(--font-serif);
  font-size: 17px;
}

.app-brand__copy {
  display: grid;
  gap: 2px;
}

.app-brand__copy strong {
  font-family: var(--font-serif);
  font-size: var(--text-copy-16);
  font-weight: 500;
  letter-spacing: 0.12em;
}

.app-brand__copy small,
.app-sidebar__note {
  color: var(--color-neutral-6);
  font-size: var(--text-caption-10);
}

.app-navigation {
  display: grid;
  gap: 5px;
  margin-top: 54px;
}

.app-navigation__item {
  display: flex;
  align-items: center;
  gap: 11px;
  min-height: 43px;
  padding: 0 11px;
  color: var(--color-neutral-7);
  border: 1px solid transparent;
  border-radius: var(--radius-md);
  font-size: var(--text-copy-14);
  font-weight: 500;
  text-align: left;
  transition: background-color var(--duration-fast) var(--ease-breath), color var(--duration-fast) var(--ease-breath), border-color var(--duration-fast) var(--ease-breath);
}

.app-navigation__item svg {
  flex: 0 0 auto;
  width: 19px;
  height: 19px;
}

.app-navigation__item:hover {
  color: var(--color-neutral-10);
  background: var(--color-neutral-3);
}

.app-navigation__item.is-active {
  color: var(--color-accent-deep);
  background: color-mix(in srgb, var(--color-accent) 7%, var(--color-neutral-1));
  border-color: color-mix(in srgb, var(--color-accent) 22%, var(--color-neutral-4));
}

.app-sidebar__note {
  max-width: 14ch;
  margin-top: auto;
  padding: 16px 8px 0;
  line-height: 1.7;
  border-top: 1px solid var(--color-neutral-4);
}

.app-main {
  display: flex;
  flex: 1;
  flex-direction: column;
  min-width: 0;
  min-height: 100vh;
}

.app-topbar {
  position: sticky;
  top: 0;
  z-index: var(--z-popover);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 24px;
  min-height: 78px;
  padding: 16px clamp(20px, 3vw, 42px);
  background: color-mix(in srgb, var(--color-neutral-1) 92%, transparent);
  border-bottom: 1px solid var(--color-neutral-4);
  backdrop-filter: blur(16px);
}

.app-topbar__search {
  min-width: 0;
  max-width: 520px;
  flex: 1;
}

.app-topbar__tools {
  display: flex;
  flex: 0 0 auto;
  align-items: center;
  gap: 9px;
}

.topbar-divider {
  width: 1px;
  height: 22px;
  margin: 0 2px;
  background: var(--color-neutral-4);
}

.user-dropdown-container { position: relative; }

.user-profile-pill {
  display: flex;
  align-items: center;
  gap: 9px;
  min-height: 38px;
  padding: 3px 9px 3px 4px;
  color: var(--color-neutral-9);
  border: 1px solid transparent;
  border-radius: 999px;
  transition: background-color var(--duration-fast) var(--ease-breath), border-color var(--duration-fast) var(--ease-breath);
}

.user-profile-pill:hover,
.user-profile-pill.is-open {
  background: var(--color-neutral-2);
  border-color: var(--color-neutral-4);
}

.username { max-width: 15ch; overflow: hidden; font-size: var(--text-copy-13); font-weight: 500; text-overflow: ellipsis; white-space: nowrap; }
.dropdown-chevron { width: 16px; height: 16px; color: var(--color-neutral-6); transition: transform var(--duration-fast) var(--ease-spring-gentle); }
.dropdown-chevron.rotated { transform: rotate(180deg); }

.user-popover {
  position: absolute;
  top: calc(100% + 10px);
  right: 0;
  width: 220px;
  padding: 7px;
  background: var(--color-neutral-1);
  border: 1px solid var(--color-neutral-4);
  border-radius: var(--radius-lg);
  box-shadow: 0 18px 42px rgba(28, 26, 23, 0.13);
}

.popover-header { display: grid; gap: 4px; padding: 11px 12px; }
.popover-header span { color: var(--color-neutral-6); font-size: var(--text-caption-10); }
.popover-header strong { color: var(--color-neutral-10); font-size: var(--text-copy-14); font-weight: 500; }
.popover-menu { display: grid; gap: 3px; }
.menu-item { display: flex; align-items: center; gap: 10px; min-height: 38px; padding: 0 11px; color: var(--color-neutral-8); border-radius: var(--radius-md); font-size: var(--text-copy-13); font-weight: 500; text-align: left; transition: background-color var(--duration-fast) var(--ease-breath); }
.menu-item svg { width: 17px; height: 17px; }
.menu-item:hover { background: var(--color-neutral-3); }
.menu-item.danger { color: var(--color-error); }
.menu-item.danger:hover { background: var(--color-error-muted); }
.menu-divider { height: 1px; margin: 4px 3px; background: var(--color-neutral-4); }

.account-menu-enter-active,
.account-menu-leave-active { transition: opacity var(--duration-fast) var(--ease-breath), transform var(--duration-fast) var(--ease-spring-gentle); }
.account-menu-enter-from,
.account-menu-leave-to { opacity: 0; transform: translateY(-5px); }

.app-content { flex: 1; min-width: 0; }
.route-loading-state { display: grid; place-items: center; gap: 13px; min-height: 320px; color: var(--color-neutral-7); font-size: var(--text-copy-14); }
.route-loading-state__spinner { width: 24px; height: 24px; border: 2px solid var(--color-neutral-4); border-top-color: var(--color-accent); border-radius: 50%; animation: route-spin 750ms linear infinite; }
@keyframes route-spin { to { transform: rotate(360deg); } }

:global([data-theme='dark'] .app-sidebar) { background: var(--color-neutral-2); }
:global([data-theme='dark'] .app-topbar) { background: color-mix(in srgb, var(--color-neutral-1) 92%, transparent); }

@media (max-width: 820px) {
  .app-shell { flex-direction: column; }
  .app-sidebar { flex: 0 0 auto; min-height: 0; padding: 15px 16px 12px; border-right: 0; border-bottom: 1px solid var(--color-neutral-4); }
  .app-brand { padding: 0 4px; }
  .app-brand__copy small,
  .app-sidebar__note { display: none; }
  .app-navigation { display: flex; gap: 5px; margin-top: 16px; overflow-x: auto; }
  .app-navigation__item { flex: 0 0 auto; min-height: 38px; }
  .app-main { min-height: 0; }
}

@media (max-width: 580px) {
  .app-topbar { flex-wrap: wrap; gap: 12px; min-height: 0; padding: 12px 16px; }
  .app-topbar__search { flex-basis: 100%; order: 2; max-width: none; }
  .app-topbar__tools { margin-left: auto; }
  .username { display: none; }
  .topbar-divider { display: none; }
  .app-navigation__item { gap: 7px; padding: 0 9px; font-size: var(--text-label-12); }
}

@media (prefers-reduced-motion: reduce) {
  .route-loading-state__spinner { animation: none; }
  .app-navigation__item, .user-profile-pill, .dropdown-chevron, .menu-item { transition: none; }
}
</style>
