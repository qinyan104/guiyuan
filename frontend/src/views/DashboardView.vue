<script setup lang="ts">
import { onMounted, ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { listPublications, type PublicationSummary } from '../api/publication'
import { adminListUsers, isAdmin, isSuperAdmin, adminBackupDatabase } from '../api/auth'

const router = useRouter()

const pubCount = ref(0)
const userCount = ref(0)
const recentPubs = ref<PublicationSummary[]>([])
const loading = ref(true)

async function loadDashboard() {
  loading.value = true
  try {
    const pubs = await listPublications()
    pubCount.value = pubs.length
    recentPubs.value = pubs.slice(0, 5)

    if (isAdmin()) {
      try {
        const users = await adminListUsers()
        userCount.value = users.length
      } catch {
        userCount.value = 0
      }
    }
  } catch {
    // ignore
  } finally {
    loading.value = false
  }
}

onMounted(loadDashboard)

function openPublication(id: number) {
  router.push({ name: 'workbench', params: { id } })
}

const backupLoading = ref(false)
async function handleBackup() {
  backupLoading.value = true
  try {
    await adminBackupDatabase()
  } catch (err: any) {
    alert('备份失败: ' + (err.message || '未知错误'))
  } finally {
    backupLoading.value = false
  }
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr)
  return d.toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit' })
}

const latestPub = computed(() => recentPubs.value.length > 0 ? recentPubs.value[0] : null)
const otherRecentPubs = computed(() => recentPubs.value.slice(1))
</script>

<template>
  <div class="dashboard-stage">
    <header class="dashboard-header">
      <div class="header-meta">DASHBOARD // 01</div>
      <h1 class="header-title">宗族全景</h1>
    </header>

    <div v-if="loading" class="loading-state">
      <div class="spinner"></div>
      <p>正在读取典藏记录...</p>
    </div>

    <div v-else class="bento-grid">
      
      <!-- Box A: Latest Publication (Hero) -->
      <div v-if="latestPub" class="bento-card card-hero" @click="openPublication(latestPub.id)">
        <div class="hero-bg-layer"></div>
        <div class="card-glass-panel">
          <span class="card-eyebrow">最新修撰</span>
          <h2 class="hero-pub-title">{{ latestPub.title || '未命名族谱' }}</h2>
          <p class="hero-pub-subtitle">{{ latestPub.subtitle || '暂无副标题' }}</p>
          <div class="hero-footer">
            <span class="hero-date">{{ formatDate(latestPub.updatedAt) }} 更新</span>
            <button class="ghost-pill" @click.stop="openPublication(latestPub.id)">
              继续编撰 
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
            </button>
          </div>
        </div>
      </div>
      <div v-else class="bento-card card-hero empty-hero">
        <div class="card-glass-panel">
          <span class="card-eyebrow">起步</span>
          <h2 class="hero-pub-title">尚未创建族谱</h2>
          <div class="hero-footer">
            <button class="ghost-pill" @click="router.push({ name: 'publications' })">立即创建</button>
          </div>
        </div>
      </div>

      <!-- Box B: Total Stats -->
      <div class="bento-card card-stat card-dark" @click="router.push({ name: 'publications' })">
        <div class="stat-content">
          <span class="stat-value">{{ pubCount }}</span>
          <span class="stat-label">馆藏总卷数</span>
        </div>
        <svg class="stat-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>
      </div>

      <!-- Box C: Action (Quick Create) -->
      <div class="bento-card card-action" @click="router.push({ name: 'publications' })">
        <div class="action-shimmer"></div>
        <div class="action-content">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
          <span class="action-title">起草新谱</span>
        </div>
      </div>

      <!-- Box D: Recent History -->
      <div class="bento-card card-history">
        <div class="history-header">
          <span class="card-eyebrow">近期活跃</span>
          <button class="link-btn" @click="router.push({ name: 'publications' })">查看全部</button>
        </div>
        
        <div class="history-list">
          <div v-for="pub in otherRecentPubs" :key="pub.id" class="history-item" @click="openPublication(pub.id)">
            <div class="history-time">{{ formatDate(pub.updatedAt) }}</div>
            <div class="history-detail">
              <div class="history-title">{{ pub.title || '未命名' }}</div>
            </div>
            <svg class="history-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg>
          </div>
          <div v-if="otherRecentPubs.length === 0" class="empty-hint">暂无更多记录</div>
        </div>
      </div>

      <!-- Box E: Users (If Admin) -->
      <div v-if="isAdmin()" class="bento-card card-users" @click="router.push({ name: 'admin-users' })">
        <div class="stat-content">
          <span class="stat-value small">{{ userCount }}</span>
          <span class="stat-label">编委人数</span>
        </div>
        <div class="users-avatars">
          <div class="avatar-circle"></div>
          <div class="avatar-circle"></div>
          <div class="avatar-circle"></div>
          <div class="avatar-circle more">+</div>
        </div>
      </div>

      <!-- Box F: Backup (If SuperAdmin) -->
      <div v-if="isSuperAdmin()" class="bento-card card-backup" @click="handleBackup">
        <div class="action-content">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
          <span class="action-title">{{ backupLoading ? '正在归档...' : '数据归档' }}</span>
        </div>
      </div>

    </div>
  </div>
</template>

<style scoped>
.dashboard-stage {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.dashboard-header {
  margin-bottom: 2rem;
  padding: 0 8px;
}

.header-meta {
  font-family: monospace;
  font-size: 0.75rem;
  letter-spacing: 0.2em;
  color: var(--text-soft, #888);
  margin-bottom: 0.5rem;
}

.header-title {
  font-size: 2.2rem;
  font-family: 'Noto Serif SC', serif;
  font-weight: 700;
  color: var(--text-main, #1a1a1a);
  margin: 0;
  letter-spacing: 0.05em;
}

.bento-grid {
  display: grid;
  grid-template-columns: repeat(12, 1fr);
  grid-auto-rows: minmax(150px, auto);
  gap: 24px;
}

.bento-card {
  background: var(--glass-panel-bg, rgba(255, 255, 255, 0.4));
  border: 1px solid var(--glass-border-highlight, rgba(255, 255, 255, 0.6));
  border-radius: 24px;
  overflow: hidden;
  box-shadow: 
    0 12px 32px -12px rgba(0,0,0,0.05),
    inset 0 0 0 1px var(--glass-border-shadow, rgba(255,255,255,0.2));
  backdrop-filter: blur(24px) saturate(150%);
  -webkit-backdrop-filter: blur(24px) saturate(150%);
  position: relative;
  transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.3s ease;
  cursor: pointer;
  display: flex;
  flex-direction: column;
}

:global([data-theme="ink-wash"]) .bento-card,
:global([data-theme="rosewood"]) .bento-card,
:global([data-theme="star-sea"]) .bento-card {
  background: rgba(0, 0, 0, 0.2);
  border-color: rgba(255, 255, 255, 0.06);
  box-shadow: inset 0 0 0 1px rgba(0,0,0,0.4);
}

.bento-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 24px 48px -12px rgba(0,0,0,0.1);
}

/* Grid Spanning */
.card-hero {
  grid-column: span 8;
  grid-row: span 2;
  border: none;
}
.card-stat {
  grid-column: span 4;
  grid-row: span 1;
}
.card-action {
  grid-column: span 4;
  grid-row: span 1;
}
.card-history {
  grid-column: span 6;
  grid-row: span 2;
  cursor: default;
}
.card-users {
  grid-column: span 3;
  grid-row: span 1;
}
.card-backup {
  grid-column: span 3;
  grid-row: span 1;
}

/* ── Specific Card Styles ── */
.card-eyebrow {
  font-size: 0.7rem;
  letter-spacing: 0.25em;
  color: var(--accent-amber, #a96e35);
  font-weight: 700;
  text-transform: uppercase;
}

.card-hero {
  position: relative;
}
.hero-bg-layer {
  position: absolute;
  inset: 0;
  background: 
    linear-gradient(135deg, rgba(255, 255, 255, 0.4), transparent),
    url('data:image/svg+xml;utf8,<svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg"><defs><pattern id="dots" width="20" height="20" patternUnits="userSpaceOnUse"><circle cx="2" cy="2" r="1" fill="rgba(0,0,0,0.05)"/></pattern></defs><rect width="100%" height="100%" fill="url(#dots)"/></svg>');
  z-index: 0;
}
:global([data-theme="ink-wash"]) .hero-bg-layer,
:global([data-theme="rosewood"]) .hero-bg-layer,
:global([data-theme="star-sea"]) .hero-bg-layer {
  background: 
    linear-gradient(135deg, rgba(0, 0, 0, 0.4), transparent),
    url('data:image/svg+xml;utf8,<svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg"><defs><pattern id="dots" width="20" height="20" patternUnits="userSpaceOnUse"><circle cx="2" cy="2" r="1" fill="rgba(255,255,255,0.05)"/></pattern></defs><rect width="100%" height="100%" fill="url(#dots)"/></svg>');
}

.card-glass-panel {
  position: relative;
  z-index: 1;
  padding: 2.5rem;
  display: flex;
  flex-direction: column;
  height: 100%;
}

.hero-pub-title {
  font-family: 'Noto Serif SC', serif;
  font-size: 3rem;
  font-weight: 700;
  color: var(--text-main);
  margin: 1rem 0 0.5rem;
}

.hero-pub-subtitle {
  font-size: 1rem;
  color: var(--text-soft);
  margin: 0 0 2rem;
}

.hero-footer {
  margin-top: auto;
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
}

.hero-date {
  font-family: monospace;
  color: var(--text-soft);
  font-size: 0.85rem;
  letter-spacing: 0.05em;
  padding-bottom: 0.5rem;
}

.ghost-pill {
  background: var(--bg-panel, #fff);
  border: 1px solid var(--border-color, rgba(0,0,0,0.1));
  border-radius: 999px;
  padding: 0.75rem 1.5rem;
  font-size: 0.9rem;
  font-weight: 600;
  color: var(--text-main);
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  transition: all 0.2s ease;
  box-shadow: 0 4px 12px rgba(0,0,0,0.05);
}
.ghost-pill:hover {
  background: var(--text-main);
  color: var(--bg-panel, #fff);
  border-color: transparent;
}
:global([data-theme="ink-wash"]) .ghost-pill,
:global([data-theme="rosewood"]) .ghost-pill,
:global([data-theme="star-sea"]) .ghost-pill {
  background: rgba(0,0,0,0.4);
  border-color: rgba(255,255,255,0.1);
  color: #fff;
}
:global([data-theme="ink-wash"]) .ghost-pill:hover,
:global([data-theme="rosewood"]) .ghost-pill:hover,
:global([data-theme="star-sea"]) .ghost-pill:hover {
  background: #fff;
  color: #000;
}

/* Stat Box */
.card-dark {
  background: var(--text-main, #1a1a1a);
  color: var(--bg-panel, #fff);
  padding: 2rem;
  justify-content: space-between;
  border: none;
}
.stat-content {
  display: flex;
  flex-direction: column;
}
.stat-value {
  font-family: 'Noto Serif SC', serif;
  font-size: 4rem;
  line-height: 1;
  font-weight: 300;
}
.stat-value.small {
  font-size: 3rem;
}
.stat-label {
  font-size: 0.85rem;
  letter-spacing: 0.1em;
  opacity: 0.6;
  margin-top: 0.5rem;
}
.stat-icon {
  width: 48px;
  height: 48px;
  opacity: 0.1;
  position: absolute;
  bottom: -10px;
  right: -10px;
}

/* Action Box */
.card-action {
  background: linear-gradient(135deg, var(--accent-ink, #6a4b2f), var(--accent-amber, #a96e35));
  color: #fff;
  border: none;
  justify-content: center;
  align-items: center;
}
.action-shimmer {
  position: absolute;
  inset: 0;
  background: linear-gradient(to right, transparent, rgba(255,255,255,0.2), transparent);
  transform: skewX(-20deg) translateX(-150%);
  animation: shimmer 4s infinite;
}
@keyframes shimmer {
  0% { transform: skewX(-20deg) translateX(-150%); }
  50%, 100% { transform: skewX(-20deg) translateX(150%); }
}
.action-content {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.75rem;
}
.action-title {
  font-weight: 600;
  letter-spacing: 0.1em;
  font-size: 1rem;
}

/* History Box */
.card-history {
  padding: 1.5rem;
}
.history-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}
.link-btn {
  background: none;
  border: none;
  color: var(--text-soft);
  font-size: 0.8rem;
  cursor: pointer;
  transition: color 0.2s;
  padding: 0;
}
.link-btn:hover {
  color: var(--text-main);
  text-decoration: underline;
}
.history-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  flex: 1;
  overflow-y: auto;
}
.history-item {
  display: flex;
  align-items: center;
  gap: 1.2rem;
  padding: 0.85rem 1rem;
  border-radius: 12px;
  transition: background 0.2s;
  cursor: pointer;
}
.history-item:hover {
  background: rgba(0,0,0,0.04);
}
:global([data-theme="ink-wash"]) .history-item:hover,
:global([data-theme="rosewood"]) .history-item:hover,
:global([data-theme="star-sea"]) .history-item:hover {
  background: rgba(255,255,255,0.06);
}

.history-time {
  font-family: monospace;
  font-size: 0.75rem;
  color: var(--text-soft);
  width: 45px;
  flex-shrink: 0;
  text-align: right;
}
.history-detail {
  flex: 1;
  min-width: 0;
}
.history-title {
  font-weight: 600;
  font-size: 0.95rem;
  color: var(--text-main);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.history-arrow {
  width: 18px;
  height: 18px;
  color: var(--text-soft);
  opacity: 0;
  transition: opacity 0.2s, transform 0.2s;
  transform: translateX(-4px);
}
.history-item:hover .history-arrow {
  opacity: 1;
  transform: translateX(0);
}

.empty-hint {
  text-align: center;
  color: var(--text-soft);
  font-size: 0.85rem;
  padding: 2rem 0;
}

/* Users Box */
.card-users {
  padding: 1.5rem;
  justify-content: space-between;
}
.users-avatars {
  display: flex;
  margin-left: 8px;
}
.avatar-circle {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  border: 2px solid var(--bg-panel, #fff);
  background: linear-gradient(135deg, var(--glass-border-shadow, #ccc), var(--glass-border-highlight, #eee));
  margin-left: -8px;
}
.avatar-circle.more {
  background: var(--text-main);
  color: var(--bg-panel, #fff);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.8rem;
  font-weight: bold;
}

/* Backup Box */
.card-backup {
  background: transparent;
  border: 1px dashed var(--border-color, rgba(0,0,0,0.2));
  justify-content: center;
  align-items: center;
  color: var(--text-main);
  box-shadow: none;
}
.card-backup:hover {
  background: rgba(0,0,0,0.02);
  border-style: solid;
}
:global([data-theme="ink-wash"]) .card-backup,
:global([data-theme="rosewood"]) .card-backup,
:global([data-theme="star-sea"]) .card-backup {
  border-color: rgba(255,255,255,0.2);
}
:global([data-theme="ink-wash"]) .card-backup:hover,
:global([data-theme="rosewood"]) .card-backup:hover,
:global([data-theme="star-sea"]) .card-backup:hover {
  background: rgba(255,255,255,0.05);
}

/* Loading State */
.loading-state {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: var(--text-soft);
  gap: 1.5rem;
}
.spinner {
  width: 40px;
  height: 40px;
  border: 3px solid rgba(0,0,0,0.1);
  border-top-color: var(--accent-amber, #a96e35);
  border-radius: 50%;
  animation: spin 1s cubic-bezier(0.16, 1, 0.3, 1) infinite;
}
:global([data-theme="ink-wash"]) .spinner,
:global([data-theme="rosewood"]) .spinner,
:global([data-theme="star-sea"]) .spinner {
  border-color: rgba(255,255,255,0.1);
  border-top-color: var(--accent-amber);
}
@keyframes spin {
  to { transform: rotate(360deg); }
}

/* Responsive Grid */
@media (max-width: 1200px) {
  .card-history { grid-column: span 12; grid-row: span 2; }
  .card-users { grid-column: span 6; }
  .card-backup { grid-column: span 6; }
}

@media (max-width: 960px) {
  .card-hero { grid-column: span 12; grid-row: span 2; }
  .card-stat { grid-column: span 6; }
  .card-action { grid-column: span 6; }
}

@media (max-width: 640px) {
  .bento-grid { display: flex; flex-direction: column; }
  .card-hero, .card-history { min-height: 280px; }
  .card-stat, .card-action, .card-users, .card-backup { min-height: 140px; }
}
</style>
