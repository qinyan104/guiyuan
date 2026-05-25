<script setup lang="ts">
import { ref, inject, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import DarkModeToggle from './DarkModeToggle.vue'
import { PUBLICATION_CONTEXT_KEY } from '../types/family'
import CollaboratorManager from './CollaboratorManager.vue'
import ExportDialog from '../features/export/ExportDialog.vue'

const fileInputRef = ref<HTMLInputElement | null>(null)
const showExportDialog = ref(false)
const showCollabDialog = ref(false)
const isExporting = ref(false)

const route = useRoute(); const router = useRouter()
const context = inject(PUBLICATION_CONTEXT_KEY) as any

const isOwner = computed(() => context?.currentAccessRole?.value === 'OWNER')

function triggerFileInput() {
  fileInputRef.value?.click()
}

function handleExportShareHtml(options: { password: string }) {
  showExportDialog.value = false
  emit('export-share-html', options.password)
}

const props = withDefaults(
  defineProps<{
    fileName?: string
    dirty?: boolean
    nativeFileAccess?: boolean
    currentUsername?: string
    syncStatus?: 'saved' | 'pending' | 'syncing' | 'error' | 'conflict'
  }>(),
  {
    fileName: '',
    dirty: false,
    nativeFileAccess: false,
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
  (event: 'export-share-html', password: string): void
  (event: 'logout'): void
  (event: 'go-back'): void
  (event: 'view-stats'): void
  (event: 'view-timeline'): void
}>()

const userDropdownOpen = ref(false)
const userInitials = computed(() => {
  const name = props.currentUsername || '总'
  return name.charAt(0).toUpperCase()
})
function toggleUserDropdown() {
  userDropdownOpen.value = !userDropdownOpen.value
}

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
      <h1 class="clickable-title" @click="emit('go-back')">无涯画布</h1>
      <span class="sync-dot" :class="`sync-dot--${syncStatus}`" :title="syncStatus === 'syncing' ? '同步中' : syncStatus === 'saved' ? '已保存' : syncStatus === 'error' ? '保存失败' : syncStatus === 'conflict' ? '数据冲突' : '未保存'"></span>
    </div>

    <div class="topbar__actions" aria-label="工作台操作">
      <div class="topbar__action-strip">
        <div class="dropdown">
          <button class="btn btn--secondary dropdown-trigger" type="button">考据 <span class="caret">&#x25BE;</span></button>
          <div class="dropdown-menu">
            <button class="dropdown-item" type="button" @click="emit('view-stats')">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M18 20V10"/><path d="M12 20V4"/><path d="M6 20v-6"/></svg>
              宗族纪略
            </button>
            <button class="dropdown-item" type="button" @click="emit('view-timeline')">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
              家族编年史
            </button>
            <div class="dropdown-divider"></div>
            <button class="dropdown-item" type="button" @click="triggerFileInput">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
              引入前朝旧卷 (JSON)
            </button>
          </div>
        </div>

        <div class="dropdown">
          <button class="btn btn--secondary dropdown-trigger" type="button">付梓 <span class="caret">&#x25BE;</span></button>
          <div class="dropdown-menu">
            <button class="dropdown-item" type="button" @click="router.push(`/publishing/publication/${context?.serverPublicationId?.value ?? ''}`)">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>
              出版工作室
            </button>
            <div class="dropdown-divider"></div>
            <button class="dropdown-item" type="button" @click="showExportDialog = true">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
              付梓发行 (高精影印/PDF)
            </button>
            <div class="dropdown-divider"></div>
            <button class="dropdown-item" type="button" @click="emit('download-svg')">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="9" y1="21" x2="9" y2="9"/></svg>
              拓印长卷 (SVG)
            </button>
            <button class="dropdown-item" type="button" @click="emit('export-json')">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
              封存卷宗草本 (JSON)
            </button>
          </div>
        </div>

        <button
          v-if="isOwner"
          class="btn btn--secondary"
          type="button"
          @click="showCollabDialog = true"
        >
          同修编委
        </button>

        <span class="topbar__action-divider" aria-hidden="true" />
        <DarkModeToggle />
        <span class="topbar__action-divider" aria-hidden="true" />

        <div class="user-dropdown-container">
          <button class="user-profile-pill" :class="{'is-open': userDropdownOpen}" @click="toggleUserDropdown">
            <div class="avatar-ring">
              <span class="avatar-text">{{ userInitials }}</span>
            </div>
            <span class="username">{{ currentUsername || '总编' }}</span>
            <svg class="dropdown-chevron" :class="{'rotated': userDropdownOpen}" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6" /></svg>
          </button>

          <!-- Dropdown Popover -->
          <transition name="glass-pop">
            <div v-if="userDropdownOpen" class="user-popover">
              <div class="popover-header">
                <span class="popover-title">当前账号</span>
                <div class="popover-account">{{ currentUsername || '总编' }}</div>
              </div>
              <div class="popover-menu">
                <div class="popover-hint">您正在编辑无限画布</div>
              </div>
            </div>
          </transition>
        </div>
      </div>
    </div>

    <!-- 导出对话框 -->
    <Teleport to="body">
      <ExportDialog
        v-model="showExportDialog"
        :isProcessing="isExporting"
        @export-svg="emit('download-svg'); showExportDialog = false"
        @export-share-html="handleExportShareHtml"
      />
    </Teleport>

    <!-- 协作者管理对话框 -->
    <Teleport defer to="body">
      <transition name="fade">
        <div v-if="showCollabDialog" class="glass-modal-overlay" @click.self="showCollabDialog = false">
          <div class="glass-sheet collab-sheet">
            <header class="sheet-header">
              <div class="header-content">
                <div class="header-icon">👥</div>
                <div class="header-text">
                  <h2 class="sheet-title">协作者管理</h2>
                  <p class="sheet-subtitle">管理谁可以查看或编辑您的族谱</p>
                </div>
              </div>
              <button class="close-btn" @click="showCollabDialog = false">&times;</button>
            </header>

            <div class="sheet-body">
              <CollaboratorManager :publicationId="Number(route.params.id)" />
            </div>
          </div>
        </div>
      </transition>
    </Teleport>
  </header>
</template>

<style scoped>
/* ── Topbar ── */
.topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 12px 20px;
  background: var(--color-panel-bg);
  border-bottom: 1px solid var(--color-card-stroke);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  position: sticky;
  top: 0;
  z-index: 100;
}

/* ── Left: Title + Sync ── */
.topbar__intro {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-shrink: 0;
}

.topbar-title {
  font-family: var(--font-serif);
  font-size: 17px;
  font-weight: 500;
  color: var(--color-neutral-10);
  background: none;
  border: none;
  cursor: pointer;
  padding: 4px 0;
  letter-spacing: 0.03em;
  transition: opacity 0.15s;
}

.topbar-title:hover {
  opacity: 0.7;
}

/* Sync dot */
.sync-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
  transition: background 0.3s;
}

.sync-dot--saved { background: #22c55e; }
.sync-dot--syncing { background: #f59e0b; animation: pulse 1.2s ease-in-out infinite; }
.sync-dot--pending { background: var(--color-neutral-4); }
.sync-dot--error { background: #ef4444; }
.sync-dot--conflict { background: #f97316; animation: pulse 0.6s ease-in-out infinite; }

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.3; }
}

/* ── Right: Actions ── */
.topbar__actions {
  display: flex;
  align-items: center;
}

.topbar__action-strip {
  display: flex;
  align-items: center;
  gap: 6px;
}

/* ── Buttons ── */
.btn {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 7px 14px;
  border-radius: 8px;
  border: 1px solid transparent;
  background: transparent;
  font-size: 13px;
  font-weight: 500;
  color: var(--color-neutral-8);
  cursor: pointer;
  transition: all 0.15s;
  white-space: nowrap;
}

.btn:hover {
  background: var(--color-neutral-2);
}

.btn--secondary {
  background: var(--color-neutral-1);
  border-color: var(--color-neutral-4);
  border-radius: 999px;
  padding: 7px 18px;
}

.btn--secondary:hover {
  background: var(--color-neutral-2);
  border-color: var(--color-neutral-5);
}

.caret {
  font-size: 10px;
  opacity: 0.4;
  margin-left: 2px;
}

/* ── Dropdown ── */
.dropdown {
  position: relative;
}

/* invisible bridge to prevent gap between trigger and menu */
.dropdown::after {
  content: '';
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  height: 8px;
}

.dropdown-menu {
  position: absolute;
  top: calc(100% + 8px);
  left: 0;
  z-index: 200;
  min-width: 200px;
  background: var(--color-panel-bg);
  border: 1px solid var(--color-card-stroke);
  border-radius: var(--radius-lg);
  box-shadow: 0 12px 32px rgba(0,0,0,0.1);
  padding: 6px;
  display: none;
  flex-direction: column;
  gap: 2px;
}

.dropdown:hover .dropdown-menu {
  display: flex;
}

.dropdown-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 9px 12px;
  border: none;
  border-radius: 8px;
  background: transparent;
  font-size: 13px;
  font-weight: 500;
  color: var(--color-neutral-8);
  cursor: pointer;
  transition: all 0.12s;
  text-align: left;
  width: 100%;
}

.dropdown-item:hover {
  background: var(--color-neutral-2);
  color: var(--color-neutral-10);
}

.dropdown-item svg {
  color: var(--color-neutral-5);
  flex-shrink: 0;
}

.dropdown-divider {
  height: 1px;
  background: var(--color-neutral-3);
  margin: 4px 8px;
}

/* ── Action Divider ── */
.topbar__action-divider {
  width: 1px;
  height: 24px;
  background: var(--color-neutral-4);
  margin: 0 4px;
  flex-shrink: 0;
}

/* ── User Profile Pill ── */
.user-dropdown-container {
  position: relative;
}

.user-profile-pill {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 4px 12px 4px 4px;
  border: 1px solid var(--color-neutral-4);
  border-radius: 999px;
  background: var(--color-neutral-1);
  cursor: pointer;
  transition: all 0.15s;
}

.user-profile-pill:hover,
.user-profile-pill.is-open {
  background: var(--color-neutral-2);
  border-color: var(--color-neutral-5);
}

.avatar-ring {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: linear-gradient(135deg, var(--glass-border-highlight, rgba(255,255,255,0.8)), var(--glass-border-shadow, rgba(0,0,0,0.05)));
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
  color: var(--color-neutral-9);
}

.username {
  font-weight: 500;
  font-size: 13px;
  color: var(--color-neutral-9);
}

.dropdown-chevron {
  color: var(--color-neutral-5);
  transition: transform 0.2s ease;
  margin-left: 2px;
}

.dropdown-chevron.rotated {
  transform: rotate(180deg);
}

/* ── User Popover ── */
.user-popover {
  position: absolute;
  top: calc(100% + 10px);
  right: 0;
  width: 220px;
  border-radius: var(--radius-xl);
  background: var(--color-panel-bg);
  border: 1px solid var(--color-card-stroke);
  box-shadow: 0 16px 40px rgba(0,0,0,0.1);
  padding: 8px;
  z-index: 9999;
  transform-origin: top right;
}

.popover-header {
  padding: 10px 12px 8px;
}

.popover-title {
  font-family: monospace;
  font-size: 10px;
  letter-spacing: 0.12em;
  color: var(--color-neutral-5);
  text-transform: uppercase;
}

.popover-account {
  font-size: 14px;
  font-weight: 500;
  color: var(--color-neutral-10);
  margin-top: 2px;
}

.popover-menu {
  display: flex;
  flex-direction: column;
}

.popover-hint {
  padding: 10px 12px;
  font-size: 12px;
  color: var(--color-neutral-6);
  text-align: center;
}

/* ── Glass Modal (Collaborator) ── */
.glass-modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.2);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2000;
  padding: 24px;
}

.glass-sheet {
  background: var(--color-panel-bg);
  border: 1px solid var(--color-card-stroke);
  border-radius: var(--radius-xl);
  width: 100%;
  max-width: 480px;
  max-height: 85vh;
  padding: 28px;
  box-shadow: var(--shadow-whisper);
  display: flex;
  flex-direction: column;
}

.glass-sheet.collab-sheet {
  max-width: 600px;
}

.sheet-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 20px;
  flex-shrink: 0;
}

.header-content {
  display: flex;
  gap: 14px;
}

.header-icon {
  width: 44px;
  height: 44px;
  background: var(--color-accent-muted);
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  color: var(--color-accent);
}

.sheet-title {
  font-family: var(--font-serif);
  font-size: 18px;
  font-weight: 500;
  color: var(--color-neutral-10);
  margin: 0;
}

.sheet-subtitle {
  font-size: 13px;
  color: var(--color-neutral-6);
  margin: 2px 0 0;
}

.close-btn {
  width: 32px;
  height: 32px;
  border: none;
  border-radius: 50%;
  background: var(--color-neutral-2);
  color: var(--color-neutral-6);
  font-size: 18px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.15s;
  flex-shrink: 0;
}

.close-btn:hover {
  background: var(--color-neutral-3);
  color: var(--color-neutral-9);
}

.sheet-body {
  overflow-y: auto;
  flex: 1;
  min-height: 0;
}

/* ── Transitions ── */
.glass-pop-enter-active,
.glass-pop-leave-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
}

.glass-pop-enter-from,
.glass-pop-leave-to {
  opacity: 0;
  transform: scale(0.95) translateY(-6px);
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.25s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>


