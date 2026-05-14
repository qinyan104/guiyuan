<script setup lang="ts">
import { ref, inject, computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { buildAuthHeaders } from '../api/auth'
import type { ThemeId } from '../composables/useTheme'
import ThemeSwitcher from './ThemeSwitcher.vue'
import CollaboratorManager from './CollaboratorManager.vue'
import ExportDialog from '../features/export/ExportDialog.vue'
import { buildSinglePagePdfRequest, captureCanvasAsBase64, captureCanvasAsSvgMarkup } from '../features/export/useCanvasExport'
import { useExportState } from '../features/export/useExportState'

interface SampleOption {
  id: string
  label: string
}

interface SampleGroup {
  label: string
  samples: SampleOption[]
}

const fileInputRef = ref<HTMLInputElement | null>(null)
const showExportDialog = ref(false)
const showCollabDialog = ref(false)
const isExporting = ref(false)

const router = useRouter()
const route = useRoute()
const context = inject<any>('publication-context')
const { setExportData } = useExportState()

const isOwner = computed(() => context?.currentAccessRole?.value === 'OWNER')

function triggerFileInput() {
  fileInputRef.value?.click()
}

async function handleExportPdfSingle() {
  // handleExportPdfSingle
  try {
    isExporting.value = true

    // 1. Capture SVG markup
    const layout = context.pub.layout.value
    const pub = context.pub.publication
    const infoLines: string[] = []
    if (pub.info?.ancestralOrigin) infoLines.push(`郡望/祖籍：${pub.info.ancestralOrigin}`)
    if (pub.info?.hallName) infoLines.push(`堂号：${pub.info.hallName}`)
    if (pub.info?.familyMotto) infoLines.push(`族训：${pub.info.familyMotto}`)
    if (pub.info?.revisionNotes) infoLines.push(`修订说明：${pub.info.revisionNotes}`)

    const exportHeader = {
      title: pub.title || '归源档案预览',
      subtitle: pub.subtitle || undefined,
      lines: infoLines.length > 0 ? infoLines : undefined,
    }
    const svgMarkup = await captureCanvasAsSvgMarkup(
      'publication-canvas-root',
      layout,
      pub.title,
      {
        forPdf: true,
        embedImages: false,
        exportHeader,
      },
    )
    const request = buildSinglePagePdfRequest({
      svgMarkup,
      layout,
      title: pub.title,
      prefaceText: pub.info?.description ?? '',
      exportHeader,
    })
    // 2. Send to backend
    const response = await fetch(`/api/publications/${route.params.id}/export/pdf/single-page`, {
      method: 'POST',
      headers: buildAuthHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify(request)
    })

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[Export] Backend error:', response.status, errorText);
      throw new Error(`服务器生成失败 (${response.status}): ${errorText}`);
    }

    // 3. Download
    const blob = await response.blob()
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `${context.pub.publication.title}-全尺寸世系图.pdf`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    window.URL.revokeObjectURL(url)

    showExportDialog.value = false
  } catch (error: unknown) {
    console.error('[Export] Fatal error in handleExportPdfSingle:', error);
    const message = error instanceof Error ? error.message : '网络或未知错误'
    alert(`导出单页 PDF 失败!\n\n具体错误: ${message}`);
  } finally {
    isExporting.value = false
  }
}
async function handlePreviewPdf(options: any) {
  try {
    isExporting.value = true
    // 1. 捕获用于预览显示的低分辨率图 (1x)
    const base64 = await captureCanvasAsBase64('publication-canvas-root', { scale: 1, backgroundColor: '#ffffff' })

    // 2. 捕获用于 PDF 嵌入的高保真矢量 SVG 源码
    const svgMarkup = await captureCanvasAsSvgMarkup(
      'publication-canvas-root',
      context.pub.layout.value,
      context.pub.publication.title,
      {
        forPdf: true,
        embedImages: false,
      }
    )

    setExportData(base64, options, svgMarkup)
    showExportDialog.value = false
    router.push(`/publication/${route.params.id}/print-preview`)
  } catch (error: unknown) {
    console.error('[Export] Fatal error in handlePreviewPdf:', error);
    const message = error instanceof Error ? error.message : '未知错误'
    alert(`准备预览失败!\n\n具体错误: ${message}`)
  } finally {
    isExporting.value = false
  }
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
    currentTheme?: ThemeId
    currentUsername?: string
    syncStatus?: 'saved' | 'pending' | 'syncing' | 'error' | 'conflict'
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
  (event: 'export-share-html', password: string): void
  (event: 'change-theme', themeId: ThemeId): void
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
function goToSettings() {
  userDropdownOpen.value = false
  router.push({ name: 'settings' })
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
      <div class="sync-status" :class="[`sync-status--${syncStatus}`]">
        <span class="sync-icon">
          <svg v-if="syncStatus === 'syncing'" class="spinner" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
          <svg v-else-if="syncStatus === 'saved'" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
          <svg v-else-if="syncStatus === 'error'" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
          <svg v-else-if="syncStatus === 'conflict'" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M12 9v4"/><path d="M12 17h.01"/><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/></svg>
          <svg v-else width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="1"/></svg>
        </span>
        <span class="sync-text">
          {{ syncStatus === 'syncing' ? '正在封存卷宗...' : syncStatus === 'saved' ? '卷宗已妥善归档' : syncStatus === 'error' ? '归档遇挫' : '等待封存...' }}
        </span>
        <span class="sync-text sync-text--resolved">
          {{ syncStatus === 'syncing' ? '正在封存卷宗...' : syncStatus === 'saved' ? '卷宗已妥善归档' : syncStatus === 'error' ? '归档遇挫' : syncStatus === 'conflict' ? '数据发生冲突，请刷新后继续' : '等待封存...' }}
        </span>
      </div>
    </div>

    <div class="topbar__actions" aria-label="工作台操作">
      <div class="topbar__action-strip">
        <div class="dropdown">
          <button class="btn btn--secondary dropdown-trigger" type="button">考据 <span class="caret">&#x25BE;</span></button>
          <div class="dropdown-menu">
            <button class="dropdown-item" type="button" @click="emit('view-stats')">宗族纪略</button>
            <button class="dropdown-item" type="button" @click="emit('view-timeline')">家族编年史</button>
            <div class="dropdown-divider"></div>
            <button class="dropdown-item" type="button" @click="triggerFileInput">引入前朝旧卷 (JSON)</button>
          </div>
        </div>

        <div class="dropdown">
          <button class="btn btn--secondary dropdown-trigger" type="button">付梓 <span class="caret">&#x25BE;</span></button>
          <div class="dropdown-menu">
            <button class="dropdown-item" type="button" @click="showExportDialog = true">付梓发行 (高精影印/PDF)</button>
            <div class="dropdown-divider"></div>
            <button class="dropdown-item" type="button" @click="emit('download-svg')">拓印长卷 (SVG)</button>
            <button class="dropdown-item" type="button" @click="emit('export-json')">封存卷宗草本 (JSON)</button>
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
        <ThemeSwitcher :current-theme="currentTheme" @change-theme="emit('change-theme', $event)" />
        <span class="topbar__action-divider" aria-hidden="true" />

        <div class="user-dropdown-container">
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
        :is-processing="isExporting"
        @export-pdf-single="handleExportPdfSingle"
        @export-svg="emit('download-svg'); showExportDialog = false"
        @preview-pdf="handlePreviewPdf"
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
              <CollaboratorManager :publication-id="Number(route.params.id)" />
            </div>
          </div>
        </div>
      </transition>
    </Teleport>
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

/* ── User Profile Popover ── */
.user-dropdown-container {
  position: relative;
}

.user-profile-pill {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 4px 12px 4px 6px;
  background: transparent;
  border: 1px solid transparent;
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

.popover-hint {
  padding: 10px 12px;
  font-size: 0.8rem;
  color: var(--text-soft);
  font-style: italic;
  text-align: center;
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
:global([data-theme="ink-wash"]) .menu-item:hover,
:global([data-theme="rosewood"]) .menu-item:hover,
:global([data-theme="star-sea"]) .menu-item:hover {
  background: rgba(255,255,255,0.06);
}

/* Popover Transitions */
.glass-pop-enter-active,
.glass-pop-leave-active {
  transition: opacity 0.2s ease, transform 0.2s cubic-bezier(0.16, 1, 0.3, 1);
}
.glass-pop-enter-from,
.glass-pop-leave-to {
  opacity: 0;
  transform: scale(0.95) translateY(-8px);
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

.sync-text:not(.sync-text--resolved) {
  display: none;
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

.sync-status--conflict {
  color: #b7791f;
  background: rgba(245, 158, 11, 0.14);
}

.spinner {
  animation: rotate 1.5s linear infinite;
}

@keyframes rotate {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

/* ── Glass Modals ── */
.glass-modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(255, 255, 255, 0.3);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2000;
  padding: 24px;
}
:global([data-theme="ink-wash"]) .glass-modal-overlay,
:global([data-theme="rosewood"]) .glass-modal-overlay,
:global([data-theme="star-sea"]) .glass-modal-overlay {
  background: rgba(0, 0, 0, 0.5);
}

.glass-sheet {
  background: var(--glass-panel-bg, rgba(255, 255, 255, 0.8));
  border: 1px solid var(--glass-border-highlight, rgba(255, 255, 255, 0.6));
  border-radius: 28px;
  width: 100%;
  max-width: 480px;
  padding: 32px;
  box-shadow: 0 40px 80px rgba(0, 0, 0, 0.1);
  position: relative;
  overflow: hidden;
}
.glass-sheet.collab-sheet {
  max-width: 560px;
}
:global([data-theme="ink-wash"]) .glass-sheet,
:global([data-theme="rosewood"]) .glass-sheet,
:global([data-theme="star-sea"]) .glass-sheet {
  background: rgba(20, 20, 20, 0.85);
  border-color: rgba(255,255,255,0.1);
}

.sheet-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 24px;
}

.header-content {
  display: flex;
  gap: 16px;
}

.header-icon {
  width: 48px;
  height: 48px;
  background: var(--accent-amber);
  border-radius: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  color: white;
}

.sheet-title {
  font-family: 'Noto Serif SC', serif;
  font-size: 1.4rem;
  font-weight: 700;
  color: var(--text-main);
  margin: 0;
}

.sheet-subtitle {
  font-size: 0.85rem;
  color: var(--text-soft);
  margin: 4px 0 0;
}

.close-btn {
  background: rgba(0,0,0,0.05);
  border: none;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  color: var(--text-soft);
  cursor: pointer;
  transition: all 0.2s;
}

.close-btn:hover {
  background: rgba(0,0,0,0.1);
  color: var(--text-main);
}

/* Fade Transitions */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
