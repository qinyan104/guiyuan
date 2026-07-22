<script setup lang="ts">
import { ref, inject, computed, onMounted, onBeforeUnmount } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import DarkModeToggle from './DarkModeToggle.vue'
import UserAvatar from './UserAvatar.vue'
import { getRole } from '../api/auth'
import { PUBLICATION_CONTEXT_KEY } from '../types/family'
import CollaboratorManager from './CollaboratorManager.vue'
import ExportDialog from '../features/export/ExportDialog.vue'
import GedcomImportDialog from '../features/gedcom/GedcomImportDialog.vue'

const fileInputRef = ref<HTMLInputElement | null>(null)
const showExportDialog = ref(false)
const showGedcomImport = ref(false)
const showCollabDialog = ref(false)
const isExporting = ref(false)
const headerRoot = ref<HTMLElement | null>(null)
const activeMenu = ref<'research' | 'export' | null>(null)

const route = useRoute(); const router = useRouter()
const context = inject(PUBLICATION_CONTEXT_KEY) as any

const isOwner = computed(() => context?.currentAccessRole?.value === 'OWNER')
const publicationTitle = computed(() => {
  const title = context?.pub?.publication?.title
  return typeof title === 'string' && title.trim() ? title.trim() : '未命名族谱'
})
const roleLabel = computed(() => {
  switch (context?.currentAccessRole?.value) {
    case 'OWNER':
      return '谱主'
    case 'EDITOR':
      return '协修'
    case 'VIEWER':
      return '阅览'
    default:
      return '共编'
  }
})
const syncStatusLabel = computed(() => {
  switch (props.syncStatus) {
    case 'syncing':
      return '誊录中'
    case 'saved':
      return '已落卷'
    case 'error':
      return '落卷失败'
    case 'conflict':
      return '待校勘'
    default:
      return '待落卷'
  }
})
const draftDescriptor = computed(() => {
  const name = props.fileName.trim()
  if (name) return name
  return props.nativeFileAccess ? '未命名本地草稿' : '云端草稿'
})

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
  (event: 'download-png'): void
  (event: 'download-svg'): void
  (event: 'print-publication'): void
  (event: 'export-json'): void
  (event: 'export-share-html', password: string): void
  (event: 'import-gedcom'): void
  (event: 'export-gedcom'): void
  (event: 'logout'): void
  (event: 'go-back'): void
  (event: 'view-stats'): void
  (event: 'view-timeline'): void
}>()

const userDropdownOpen = ref(false)
const avatarTone = computed(() => (getRole() ?? 'USER').toLowerCase())
function closeTransientUi() {
  activeMenu.value = null
  userDropdownOpen.value = false
}

function toggleMenu(menu: 'research' | 'export') {
  userDropdownOpen.value = false
  activeMenu.value = activeMenu.value === menu ? null : menu
}

function toggleUserDropdown() {
  activeMenu.value = null
  userDropdownOpen.value = !userDropdownOpen.value
}

function handleImportClick() {
  activeMenu.value = null
  triggerFileInput()
}

function openPublishingStudio() {
  closeTransientUi()
  router.push(`/publishing/publication/${context?.serverPublicationId?.value ?? ''}`)
}

function openExportDialog() {
  activeMenu.value = null
  showExportDialog.value = true
}

function openCollaboratorDialog() {
  closeTransientUi()
  showCollabDialog.value = true
}

function handleGedcomImported() {
  // 导入成功后，如果是在合并模式下，刷新当前页面数据
  // 如果是新建模式，GedcomImportDialog 内部会跳转到新族谱
  // 这里什么都不做，由 dialog 内部处理
}

function handleDocumentClick(event: MouseEvent) {
  const target = event.target as Node | null
  if (!target || !headerRoot.value) return
  if (!headerRoot.value.contains(target)) {
    closeTransientUi()
  }
}

function handleDocumentKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') {
    closeTransientUi()
  }
}

onMounted(() => {
  document.addEventListener('click', handleDocumentClick, { capture: true })
  document.addEventListener('keydown', handleDocumentKeydown)
})

onBeforeUnmount(() => {
  document.removeEventListener('click', handleDocumentClick, { capture: true })
  document.removeEventListener('keydown', handleDocumentKeydown)
})

</script>

<template>
  <header ref="headerRoot" class="topbar">
    <!-- 隐藏的文件输入框 -->
    <input
      ref="fileInputRef"
      type="file"
      accept=".json"
      style="display: none"
      @change="emit('import-json', $event)"
    />

    <div class="topbar__intro">
      <div class="topbar__intro-copy">
        <p class="topbar-eyebrow">宗谱工作台 · {{ roleLabel }}</p>
        <div class="topbar__name-row">
          <button type="button" class="topbar-title" @click="emit('go-back')">无涯画布</button>
          <span class="sync-dot" :class="`sync-dot--${syncStatus}`" :title="syncStatusLabel"></span>
          <span class="topbar__status-text">{{ syncStatusLabel }}</span>
        </div>
        <p class="topbar__manuscript">《{{ publicationTitle }}》<span>{{ draftDescriptor }}</span></p>
      </div>
    </div>

    <div class="topbar__actions" aria-label="工作台操作">
      <div class="topbar__action-strip">
        <div class="topbar__primary-tools" role="group" aria-label="谱系工具">
          <button class="btn btn--secondary" type="button" @click="emit('view-stats')" title="家族统计">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M18 20V10"/><path d="M12 20V4"/><path d="M6 20v-6"/></svg>
            统计
          </button>
          <button class="btn btn--secondary" type="button" @click="emit('view-timeline')" title="家族时间线">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
            时间线
          </button>

          <div class="dropdown">
            <button
              class="btn btn--secondary dropdown-trigger"
              type="button"
              aria-haspopup="menu"
              :aria-expanded="activeMenu === 'research'"
              @click="toggleMenu('research')"
            >
              导入 <span class="caret">&#x25BE;</span>
            </button>
            <div v-if="activeMenu === 'research'" class="dropdown-menu" role="menu">
              <button class="dropdown-item" type="button" @click="handleImportClick">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                导入 JSON
              </button>
              <div class="dropdown-divider"></div>
              <button class="dropdown-item" type="button" @click="activeMenu = null; showGedcomImport = true">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="12" y1="18" x2="12" y2="12"/><polyline points="9 15 12 18 15 15"/></svg>
                导入 GEDCOM
              </button>
            </div>
          </div>

          <div class="dropdown">
            <button
              class="btn btn--secondary dropdown-trigger"
              type="button"
              aria-haspopup="menu"
              :aria-expanded="activeMenu === 'export'"
              @click="toggleMenu('export')"
            >
              导出 <span class="caret">&#x25BE;</span>
            </button>
            <div v-if="activeMenu === 'export'" class="dropdown-menu" role="menu">
              <button class="dropdown-item" type="button" @click="openPublishingStudio">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>
                出版排版
              </button>
              <div class="dropdown-divider"></div>
              <button class="dropdown-item" type="button" @click="openExportDialog">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                导出与分享
              </button>
              <div class="dropdown-divider"></div>
              <button class="dropdown-item" type="button" @click="activeMenu = null; emit('download-svg')">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="9" y1="21" x2="9" y2="9"/></svg>
                下载画布 SVG
              </button>
              <button class="dropdown-item" type="button" @click="activeMenu = null; emit('download-png')">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg>
                下载画布 PNG
              </button>
              <button class="dropdown-item" type="button" @click="activeMenu = null; emit('export-json')">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                导出 JSON
              </button>
              <div class="dropdown-divider"></div>
              <button class="dropdown-item" type="button" @click="activeMenu = null; emit('export-gedcom')">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><polyline points="8 13 12 17 16 13"/><line x1="12" y1="17" x2="12" y2="9"/></svg>
                导出 GEDCOM
              </button>
            </div>
          </div>
        </div>

        <button
          v-if="isOwner"
          class="btn btn--secondary"
          type="button"
          @click="openCollaboratorDialog"
        >
          同修编委
        </button>

        <span class="topbar__action-divider" aria-hidden="true" />
        <DarkModeToggle />
        <span class="topbar__action-divider" aria-hidden="true" />

        <div class="user-dropdown-container">
          <button type="button" class="user-profile-pill" :class="{'is-open': userDropdownOpen}" @click="toggleUserDropdown">
            <UserAvatar :name="currentUsername || '总编'" :tone="avatarTone" />
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
        @export-png="emit('download-png'); showExportDialog = false"
        @export-svg="emit('download-svg'); showExportDialog = false"
        @export-share-html="handleExportShareHtml"
      />
    </Teleport>

    <!-- 协作者管理对话框 -->
    <Teleport defer to="body">
      <transition name="fade">
        <div v-if="showCollabDialog" role="dialog" aria-modal="true" aria-label="协作者管理" class="glass-modal-overlay" @click.self="showCollabDialog = false" @keydown.escape="showCollabDialog = false">
          <div class="glass-sheet collab-sheet">
            <header class="sheet-header">
              <div class="header-content">
                <div class="header-icon" aria-hidden="true">修</div>
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

    <!-- GEDCOM 导入对话框 -->
    <GedcomImportDialog
      v-model:visible="showGedcomImport"
      :currentPubId="context?.serverPublicationId?.value ?? null"
      @imported="handleGedcomImported"
    />
  </header>
</template>

<style scoped>
/* ── Topbar ── */
.topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 14px 18px;
  background: var(--workbench-header-bg, var(--color-panel-bg));
  border: 1px solid var(--workbench-header-border, var(--color-card-stroke));
  border-radius: var(--radius-2xl);
  box-shadow: var(--workbench-header-shadow, var(--shadow-whisper));
  backdrop-filter: blur(18px) saturate(135%);
  -webkit-backdrop-filter: blur(18px) saturate(135%);
  position: sticky;
  top: 12px;
  z-index: 100;
  margin-bottom: 12px;
}

/* ── Left: Title + Sync ── */
.topbar__intro {
  display: flex;
  align-items: center;
  flex-shrink: 0;
}

.topbar__intro-copy {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.topbar-eyebrow {
  margin: 0;
  color: var(--workbench-text-soft, var(--color-neutral-6));
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.16em;
  text-transform: uppercase;
}

.topbar__name-row {
  display: flex;
  align-items: center;
  gap: 10px;
}

.topbar-title {
  display: inline-flex;
  align-items: center;
  font-family: var(--font-serif);
  font-size: 20px;
  font-weight: 500;
  color: var(--workbench-text-main, var(--color-neutral-10));
  background: none;
  border: none;
  cursor: pointer;
  padding: 0;
  letter-spacing: 0.06em;
  transition: opacity 0.15s;
}

.topbar-title:hover {
  opacity: 0.7;
}

.topbar__status-text {
  color: var(--workbench-text-soft, var(--color-neutral-6));
  font-size: 12px;
  font-weight: 600;
}

.topbar__manuscript {
  margin: 0;
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--workbench-text-sub, var(--color-neutral-8));
  font-size: 13px;
  line-height: 1.5;
}

.topbar__manuscript span {
  color: var(--workbench-text-soft, var(--color-neutral-6));
  font-size: 12px;
}

/* Sync dot */
.sync-dot {
  width: 9px;
  height: 9px;
  border-radius: 50%;
  flex-shrink: 0;
  transition: background 0.3s;
  box-shadow: 0 0 0 4px var(--color-accent-muted);
}

.sync-dot--saved { background: var(--color-success); }
.sync-dot--syncing { background: var(--color-warning); animation: pulse 1.2s ease-in-out infinite; }
.sync-dot--pending { background: var(--color-neutral-4); }
.sync-dot--error { background: var(--color-error); }
.sync-dot--conflict { background: var(--color-warning); animation: pulse 0.6s ease-in-out infinite; }

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

.topbar__primary-tools {
  display: inline-flex;
  align-items: stretch;
  gap: 2px;
  padding: 4px;
  border: 1px solid var(--workbench-line-soft, var(--color-neutral-4));
  border-radius: 999px;
  background: var(--workbench-panel-muted, var(--color-neutral-1));
  box-shadow:
    inset 0 1px 0 var(--glass-border-highlight, rgba(255, 255, 255, 0.72)),
    0 8px 18px rgba(0, 0, 0, 0.04);
}

.topbar__primary-tools > .btn,
.topbar__primary-tools > .dropdown > .btn {
  min-height: 34px;
  padding: 7px 13px;
  border: 0;
  border-radius: 999px;
  background: transparent;
  color: var(--color-neutral-7);
}

.topbar__primary-tools > :not(:first-child) {
  border-left: 0;
}

.topbar__primary-tools > .btn:hover,
.topbar__primary-tools > .dropdown > .btn:hover,
.topbar__primary-tools > .dropdown > .dropdown-trigger[aria-expanded='true'] {
  background: var(--workbench-panel-strong, var(--color-neutral-2));
  color: var(--color-accent);
  border-color: transparent;
}

.topbar__primary-tools .dropdown-menu {
  top: calc(100% + 11px);
}

/* ── Buttons ── */
.btn {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 7px 14px;
  border-radius: var(--radius-md);
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
  background: var(--workbench-panel-muted, var(--color-neutral-2));
}

.btn--secondary {
  background: var(--workbench-panel-muted, var(--color-neutral-1));
  border-color: var(--workbench-line-soft, var(--color-neutral-4));
  border-radius: 999px;
  padding: 7px 18px;
}

.btn--secondary:hover {
  background: var(--workbench-panel-strong, var(--color-neutral-2));
  border-color: var(--color-neutral-5);
}

.btn:focus-visible,
.user-profile-pill:focus-visible {
  outline: 3px solid var(--color-accent-muted);
  outline-offset: 2px;
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
  background: var(--workbench-panel-strong, var(--color-panel-bg));
  border: 1px solid var(--workbench-line-soft, var(--color-card-stroke));
  border-radius: var(--radius-lg);
  box-shadow: 0 12px 32px rgba(0,0,0,0.1);
  padding: 6px;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.dropdown-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 9px 12px;
  border: none;
  border-radius: var(--radius-md);
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
  background: var(--workbench-panel-muted, var(--color-neutral-2));
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
  background: var(--workbench-line-soft, var(--color-neutral-4));
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
  border: 1px solid var(--workbench-line-soft, var(--color-neutral-4));
  border-radius: 999px;
  background: var(--workbench-panel-muted, var(--color-neutral-1));
  cursor: pointer;
  transition: all 0.15s;
}

.user-profile-pill:hover,
.user-profile-pill.is-open {
  background: var(--workbench-panel-strong, var(--color-neutral-2));
  border-color: var(--color-neutral-5);
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
  background: var(--workbench-panel-strong, var(--color-panel-bg));
  border: 1px solid var(--workbench-line-soft, var(--color-card-stroke));
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
  background: var(--color-overlay);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: var(--z-modal);
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
  border-radius: var(--radius-lg);
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: var(--font-serif);
  font-size: 18px;
  font-weight: 700;
  letter-spacing: 0.08em;
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

@media (max-width: 1200px) {
  .topbar {
    flex-wrap: wrap;
  }

  .topbar__actions {
    width: 100%;
  }

  .topbar__action-strip {
    width: 100%;
    justify-content: flex-end;
    flex-wrap: wrap;
  }
}

@media (max-width: 860px) {
  .topbar {
    align-items: stretch;
    padding-inline: 16px;
  }

  .topbar__intro {
    justify-content: space-between;
  }

  .topbar__manuscript {
    flex-wrap: wrap;
  }

  .topbar__actions {
    overflow-x: auto;
    padding-bottom: 2px;
  }

  .topbar__action-strip {
    width: max-content;
    min-width: 100%;
    justify-content: flex-start;
    flex-wrap: nowrap;
  }
}
</style>


