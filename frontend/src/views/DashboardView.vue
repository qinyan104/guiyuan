<script setup lang="ts">
import { onMounted, ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useLexicon } from '../composables/useLexicon'
import { listPublications, createPublication, type PublicationSummary } from '../api/publication'
import { blankPublication, defaultSettings } from '../data/sampleFamily'
import { isAdmin, isSuperAdmin } from '../api/auth'
import FeedbackStrip from '../components/FeedbackStrip.vue'
import { useFeedback } from '../composables/useFeedback'
import { adminListUsers, adminBackupDatabase } from '../api/admin'

const router = useRouter()
const { lexicon } = useLexicon()
const feedback = useFeedback()

const pubCount = ref(0)
const userCount = ref(0)
const recentPubs = ref<PublicationSummary[]>([])
const loading = ref(true)
const pageError = ref<string | null>(null)

async function loadDashboard() {
  loading.value = true
  pageError.value = null
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
  } catch (e: any) {
    pageError.value = e?.message || '加载失败，请检查后端服务是否正常运行'
    pubCount.value = 0
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
    feedback.setError('备份失败: ' + (err.message || '未知错误'))
  } finally {
    backupLoading.value = false
  }
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr)
  return `${d.getMonth() + 1}月${d.getDate()}日`
}

const latestPub = computed(() => recentPubs.value.length > 0 ? recentPubs.value[0] : null)
const otherRecentPubs = computed(() => recentPubs.value.slice(1))

const showCreateDialog = ref(false)
const newTitle = ref('')
const newSubtitle = ref('')

async function handleCreateFromDashboard() {
  const title = newTitle.value.trim() || '未命名族谱'
  try {
    const id = await createPublication({ ...blankPublication, title, subtitle: newSubtitle.value.trim() }, defaultSettings, title)
    router.push({ name: 'workbench', params: { id } })
  } catch (err: any) {
    feedback.setError('创建失败: ' + (err.message || '未知错误'))
  }
}
</script>

<template>
  <div class="dashboard-view-root">
    <div class="dashboard-stage">
    <FeedbackStrip :status-message="feedback.statusMessage.value" :error-message="feedback.errorMessage.value" @dismiss="feedback.dismiss" />
      <header class="poetic-header">
        <div class="poetic-header__main">
          <div class="poetic-eyebrow">{{ lexicon.dashboard.headerEyebrow }}</div>
          <h1 class="poetic-title">{{ lexicon.dashboard.headerTitle }}<span class="text-italic">{{ lexicon.dashboard.headerTitleItalic }}</span></h1>
        </div>
        <div class="poetic-header__extra">
          <p class="poetic-quote" v-html="lexicon.dashboard.quote.replace(/\\n/g, '<br/>')"></p>
        </div>
      </header>

      <div v-if="loading" class="loading-state">
        <div class="spinner"></div>
        <p>正在读取典藏记录...</p>
      </div>

      <div v-else-if="pageError" class="error-stage">
        <div class="error-card">
          <div class="error-icon">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>
          </div>
          <h2 class="error-title">加载失败</h2>
          <p class="error-desc">{{ pageError }}</p>
          <div class="error-actions">
            <button class="welcome-btn primary" @click="loadDashboard">重试</button>
          </div>
        </div>
      </div>

      <div v-else-if="pubCount > 0" class="bento-grid">
                <!-- Box A: Latest Publication (Hero) -->
        <div v-if="latestPub" class="bento-card card-hero" @click="openPublication(latestPub.id)">
          <div class="hero-bg-layer"></div>
          <div class="hero-accent-line"></div>
          <div class="card-glass-panel">
            <span class="card-eyebrow">最新修撰</span>
            <h2 class="hero-pub-title">{{ latestPub.title || '未命名族谱' }}</h2>
            <p class="hero-pub-subtitle">{{ latestPub.subtitle || '暂无副标题' }}</p>
            <div class="hero-footer">
              <span class="hero-date">{{ formatDate(latestPub.updatedAt) }} 更新</span>
              <button class="ghost-pill" @click.stop="openPublication(latestPub.id)">
                继续编撰 
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h14M12 5l7 7-7 7" /></svg>
              </button>
            </div>
          </div>
        </div>
        <div v-else class="bento-card card-hero empty-hero" @click="router.push({ name: 'publications' })">
          <div class="hero-bg-layer"></div>
          <div class="hero-accent-line"></div>
          <div class="card-glass-panel">
            <span class="card-eyebrow">起步</span>
            <h2 class="hero-pub-title">尚未创建族谱</h2>
            <div class="hero-footer">
              <button class="ghost-pill" @click.stop="router.push({ name: 'publications' })">立即创建</button>
            </div>
          </div>
        </div>

        <!-- Box B: Total Stats -->
        <div class="bento-card card-stat card-dark" @click="router.push({ name: 'publications' })">
          <div class="stat-content">
            <span class="stat-value">{{ pubCount }}</span>
            <span class="stat-label">馆藏总卷数</span>
          </div>
          <svg class="stat-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" /><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" /></svg>
        </div>

        <!-- Box C: Action (Quick Create) -->
        <div class="bento-card card-action" @click="showCreateDialog = true">
          <div class="action-shimmer"></div>
          <div class="action-content">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" /></svg>
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
              <div class="history-thread"></div>
              <div class="history-time">{{ formatDate(pub.updatedAt) }}</div>
              <div class="history-detail">
                <div class="history-title">{{ pub.title || '未命名' }}</div>
              </div>
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
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>
            <span class="action-title">{{ backupLoading ? '正在归档...' : '数据归档' }}</span>
          </div>
        </div>
      </div>

      <!-- Welcome empty state -->
      <div v-else class="welcome-stage">
        <div class="welcome-card">
          <div class="welcome-glow"></div>
          <div class="welcome-content">
            <div class="welcome-seal">序</div>
            <h2 class="welcome-title">欢迎来到数字档案馆</h2>
            <p class="welcome-desc">创建您的第一个族谱，开启家族编修之旅。</p>
            <div class="welcome-actions">
              <button class="welcome-btn primary" @click="showCreateDialog = true">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
                创建第一个族谱
              </button>
              <button class="welcome-btn secondary" @click="router.push({ name: 'publications' })">
                浏览示例模板
              </button>
              <button class="welcome-btn ghost" @click="router.push({ name: 'publications' })">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>
                导入族谱数据
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Create dialog -->
    <Teleport to="body">
      <div v-if="showCreateDialog" class="dialog-overlay" @click.self="showCreateDialog = false">
        <div class="dialog-panel">
          <h3>创建新族谱</h3>
          <p style="color: var(--color-neutral-6); margin: 8px 0 20px;">输入族谱名称后即可开始编撰。</p>
          <input v-model="newTitle" placeholder="族谱名称..." class="glass-input" @keyup.enter="handleCreateFromDashboard" />
          <input v-model="newSubtitle" placeholder="副标题（可选）..." class="glass-input" style="margin-top: 12px;" />
          <div class="dialog-actions" style="margin-top: 20px; display: flex; gap: 12px; justify-content: flex-end;">
            <button class="bento-btn" @click="showCreateDialog = false">取消</button>
            <button class="bento-btn primary" @click="handleCreateFromDashboard">创建</button>
          </div>
        </div>
      </div>
    </Teleport>
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
  color: var(--color-neutral-6);
  margin-bottom: 0.5rem;
}

.header-title {
  font-size: 2.2rem;
  font-family: 'Noto Serif SC', serif;
  font-weight: 500;
  color: var(--color-neutral-9);
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
  background: var(--color-card-fill));
  border: 1px solid var(--color-card-stroke));
  border-radius: 24px;
  overflow: hidden;
  box-shadow: 
    0 12px 32px -12px rgba(0,0,0,0.05),
    inset 0 0 0 1px var(--color-neutral-4));
  backdrop-filter: blur(24px) saturate(150%);
  -webkit-backdrop-filter: blur(24px) saturate(150%);
  position: relative;
  transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.3s ease;
  cursor: pointer;
  display: flex;
  flex-direction: column;
}

[data-theme="dark"] .bento-card,
[data-theme="dark"] .bento-card {
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
  color: var(--color-accent);
  font-weight: 500;
  text-transform: uppercase;
}

.card-hero {
  position: relative;
}
.hero-bg-layer {
  position: absolute;
  inset: 0;
  background: var(--color-card-fill);
  border-radius: inherit;
}

.card-glass-panel {
  position: relative;
  z-index: 1;
  background: rgba(255, 255, 255, 0.55);
  backdrop-filter: blur(12px) saturate(120%);
  -webkit-backdrop-filter: blur(12px) saturate(120%);
  border: 1px solid rgba(255, 255, 255, 0.6);
  border-radius: var(--radius-xl);
  padding: 2rem;
  display: flex;
  flex-direction: column;
  height: 100%;
}

[data-theme="dark"] .card-glass-panel {
  background: rgba(30, 30, 30, 0.6);
  border-color: rgba(255, 255, 255, 0.06);
}

.hero-accent-line {
  position: absolute;
  left: 0;
  top: 10%;
  bottom: 10%;
  width: 3px;
  background: var(--color-accent);
  border-radius: 0 4px 4px 0;
  opacity: 0.6;
}
[data-theme="dark"] .hero-bg-layer {
  background: var(--color-neutral-2);
}

.card-glass-panel {
  position: relative;
  z-index: 1;
  background: rgba(255, 255, 255, 0.55);
  backdrop-filter: blur(12px) saturate(120%);
  -webkit-backdrop-filter: blur(12px) saturate(120%);
  border: 1px solid rgba(255, 255, 255, 0.6);
  border-radius: var(--radius-xl);
  padding: 2rem;
  display: flex;
  flex-direction: column;
  height: 100%;
}

[data-theme="dark"] .card-glass-panel {
  background: rgba(30, 30, 30, 0.6);
  border-color: rgba(255, 255, 255, 0.06);
}








.hero-pub-title {
  font-family: 'Noto Serif SC', serif;
  font-size: 3rem;
  font-weight: 500;
  color: var(--color-neutral-9);
  margin: 1rem 0 0.5rem;
}

.hero-pub-subtitle {
  font-size: 1rem;
  color: var(--color-neutral-6);
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
  color: var(--color-neutral-6);
  font-size: 0.85rem;
  letter-spacing: 0.05em;
  padding-bottom: 0.5rem;
}

.ghost-pill {
  background: transparent;
  border: 1px solid var(--color-neutral-5);
  border-radius: 999px;
  padding: 0.75rem 1.5rem;
  font-size: 0.9rem;
  font-weight: 500;
  color: var(--color-neutral-9);
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  transition: all 0.2s ease;
  box-shadow: 0 4px 12px rgba(0,0,0,0.05);
}
.ghost-pill:hover {
  background: var(--color-neutral-9);
  color: var(--color-card-fill);
  border-color: transparent;
}
[data-theme="dark"] .ghost-pill {
  background: rgba(0,0,0,0.4);
  border-color: rgba(255,255,255,0.1);
  color: #fff;
}
[data-theme="dark"] .ghost-pill:hover {
  background: #fff;
  color: #000;
}

/* Stat Box */
.card-dark {
  background: var(--color-neutral-8);
  color: var(--color-card-fill);
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
  font-size: 5rem;
  line-height: 1;
  font-weight: 300;
  background: linear-gradient(135deg, #d4af37, #f3e5ab, #d4af37);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  text-shadow: 0 4px 12px rgba(0,0,0,0.2);
}
.card-users .stat-value {
  background: linear-gradient(135deg, var(--color-neutral-9), var(--color-neutral-7));
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  text-shadow: none;
}
[data-theme="dark"] .card-users .stat-value,
[data-theme="dark"] .card-users .stat-value {
  background: linear-gradient(135deg, #fff, #aaa);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}
.stat-value.small {
  font-size: 3.5rem;
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
  background: linear-gradient(135deg, #8b2c26, var(--color-accent));
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
  font-weight: 500;
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
  color: var(--color-neutral-6);
  font-size: 0.8rem;
  cursor: pointer;
  transition: color 0.2s;
  padding: 0;
}
.link-btn:hover {
  color: var(--color-neutral-9);
  text-decoration: underline;
}
.history-list {
  display: flex;
  flex-direction: column;
  gap: 0;
  position: relative;
  flex: 1;
  overflow-y: auto;
  padding-left: 8px;
}
.history-list::before {
  content: '';
  position: absolute;
  top: 10px;
  bottom: 10px;
  left: 17px;
  width: 1px;
  background: var(--color-neutral-5);
  z-index: 0;
}
[data-theme="dark"] .history-list::before,
[data-theme="dark"] .history-list::before {
  background: rgba(255,255,255,0.1);
}

.history-item {
  position: relative;
  display: flex;
  align-items: center;
  gap: 1.2rem;
  padding: 0.85rem 1rem;
  border-radius: 8px;
  transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
  cursor: pointer;
  z-index: 1;
}
.history-thread {
  position: absolute;
  left: 7px;
  top: 50%;
  transform: translateY(-50%);
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: var(--color-accent);
  box-shadow: 0 0 0 4px var(--color-card-fill);
  transition: transform 0.2s;
}
[data-theme="dark"] .history-thread,
[data-theme="dark"] .history-thread {
  box-shadow: 0 0 0 4px rgba(0,0,0,0.5);
}

.history-item:hover {
  background: var(--glass-pill-bg, rgba(0,0,0,0.03));
  transform: translateX(4px);
}
.history-item:hover .history-thread {
  transform: translateY(-50%) scale(1.5);
}
[data-theme="dark"] .history-item:hover,
[data-theme="dark"] .history-item:hover {
  background: rgba(255,255,255,0.06);
}

.history-time {
  font-family: monospace;
  color: var(--color-neutral-6);
  font-weight: 400;
  color: var(--color-neutral-6);
  width: 45px;
  flex-shrink: 0;
  text-align: right;
}
.history-detail {
  flex: 1;
  min-width: 0;
}
.history-title {
  font-weight: 500;
  font-size: 0.95rem;
  color: var(--color-neutral-9);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}


.empty-hint {
  text-align: center;
  color: var(--color-neutral-6);
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
  border: 2px solid var(--color-card-fill);
  background: linear-gradient(135deg, var(--color-neutral-4), var(--color-card-stroke));
  margin-left: -8px;
}
.avatar-circle.more {
  background: var(--color-neutral-9);
  color: var(--color-card-fill);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.8rem;
  font-weight: bold;
}

/* Backup Box */
.card-backup {
  background: transparent;
  border: 1px dashed var(--color-neutral-5);
  justify-content: center;
  align-items: center;
  color: var(--color-neutral-9);
  box-shadow: none;
}
.card-backup:hover {
  background: rgba(0,0,0,0.02);
  border-style: solid;
}
[data-theme="dark"] .card-backup {
  border-color: rgba(255,255,255,0.2);
}
[data-theme="dark"] .card-backup:hover {
  background: rgba(255,255,255,0.05);
}

/* Loading State */
.loading-state {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: var(--color-neutral-6);
  gap: 1.5rem;
}
.spinner {
  width: 40px;
  height: 40px;
  border: 3px solid rgba(0,0,0,0.1);
  border-top-color: var(--color-accent);
  border-radius: 50%;
  animation: spin 1s cubic-bezier(0.16, 1, 0.3, 1) infinite;
}
[data-theme="dark"] .spinner,
[data-theme="dark"] .spinner {
  border-color: rgba(255,255,255,0.1);
  border-top-color: var(--color-accent);
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
/* ── Error State ── */
.error-stage {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 40px;
}
.error-card {
  max-width: 420px;
  width: 100%;
  background: var(--color-card-fill));
  backdrop-filter: blur(40px) saturate(180%);
  border-radius: 32px;
  border: 1px solid rgba(255, 59, 48, 0.2);
  box-shadow: 0 32px 64px rgba(0,0,0,0.08);
  padding: 48px 40px;
  text-align: center;
}
[data-theme="dark"] .error-card,
[data-theme="dark"] .error-card {
  background: rgba(0,0,0,0.5);
  border-color: rgba(255, 59, 48, 0.3);
}
.error-icon {
  color: #ff3b30;
  margin-bottom: 16px;
  opacity: 0.7;
}
.error-title {
  font-family: 'Noto Serif SC', serif;
  font-size: 1.5rem;
  font-weight: 500;
  color: var(--color-neutral-9);
  margin: 0 0 8px;
}
.error-desc {
  color: var(--color-neutral-6);
  font-size: 0.95rem;
  margin: 0 0 24px;
  line-height: 1.6;
}
.error-actions {
  display: flex;
  justify-content: center;
}

/* ── Welcome Empty State ── */
.welcome-stage {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 40px;
}
.welcome-card {
  position: relative;
  max-width: 520px;
  width: 100%;
  background: var(--color-card-fill));
  backdrop-filter: blur(40px) saturate(180%);
  border-radius: 32px;
  border: 1px solid var(--color-neutral-2);
  box-shadow: 0 32px 64px rgba(0,0,0,0.08);
  overflow: hidden;
  text-align: center;
}
.welcome-glow {
  position: absolute;
  top: -50%;
  left: -50%;
  width: 200%;
  height: 200%;
  background: radial-gradient(circle at center, var(--color-accent) 0%, transparent 40%);
  opacity: 0.06;
  pointer-events: none;
}
.welcome-content {
  position: relative;
  padding: 64px 40px;
  display: flex;
  flex-direction: column;
  align-items: center;
}
.welcome-seal {
  width: 72px;
  height: 72px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #8b2c26, var(--color-accent));
  border-radius: 20px;
  font-family: 'Noto Serif SC', serif;
  font-size: 2rem;
  color: #fff;
  margin-bottom: 24px;
  box-shadow: var(--shadow-whisper);
}
.welcome-title {
  font-family: 'Noto Serif SC', serif;
  font-size: 1.8rem;
  font-weight: 500;
  color: var(--color-neutral-9);
  margin: 0 0 12px;
}
.welcome-desc {
  color: var(--color-neutral-6);
  font-size: 1rem;
  margin: 0 0 32px;
  line-height: 1.6;
}
.welcome-actions {
  display: flex;
  flex-direction: column;
  gap: 12px;
  width: 100%;
  max-width: 320px;
}
.welcome-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 14px 24px;
  border-radius: 14px;
  font-size: 0.95rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  border: none;
}
.welcome-btn.primary {
  background: linear-gradient(135deg, #8b2c26, var(--color-accent));
  color: #fff;
  box-shadow: var(--shadow-whisper);
}
.welcome-btn.primary:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-whisper);
}
.welcome-btn.secondary {
  background: var(--color-neutral-9);
  color: var(--color-card-fill);
}
.welcome-btn.secondary:hover {
  transform: translateY(-2px);
}
.welcome-btn.ghost {
  background: transparent;
  color: var(--color-neutral-6);
  border: 1px solid var(--color-neutral-4);
}
.welcome-btn.ghost:hover {
  background: rgba(0,0,0,0.03);
  color: var(--color-neutral-9);
}
</style>


