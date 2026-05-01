<script setup lang="ts">
import { onMounted, ref } from 'vue'
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
  return d.toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })
}
</script>

<template>
  <div class="dashboard">
    <h1 class="dashboard__title">工作台</h1>
    <p class="dashboard__desc">系统概览与快捷操作</p>

    <!-- Stat Cards -->
    <div class="stat-grid">
      <div class="stat-card" @click="router.push({ name: 'publications' })">
        <div class="stat-card__icon stat-card__icon--pub">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>
        </div>
        <div class="stat-card__info">
          <span class="stat-card__number">{{ pubCount }}</span>
          <span class="stat-card__label">族谱总数</span>
        </div>
      </div>

      <div v-if="isAdmin()" class="stat-card" @click="router.push({ name: 'admin-users' })">
        <div class="stat-card__icon stat-card__icon--user">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
        </div>
        <div class="stat-card__info">
          <span class="stat-card__number">{{ userCount }}</span>
          <span class="stat-card__label">用户数量</span>
        </div>
      </div>

      <div class="stat-card stat-card--accent" @click="router.push({ name: 'publications' })">
        <div class="stat-card__icon stat-card__icon--quick">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
        </div>
        <div class="stat-card__info">
          <span class="stat-card__number">快捷</span>
          <span class="stat-card__label">新建族谱</span>
        </div>
      </div>

      <div v-if="isSuperAdmin()" class="stat-card stat-card--backup" @click="handleBackup">
        <div class="stat-card__icon stat-card__icon--backup">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
        </div>
        <div class="stat-card__info">
          <span class="stat-card__number">{{ backupLoading ? '备份中...' : '备份' }}</span>
          <span class="stat-card__label">数据库备份</span>
        </div>
      </div>
    </div>

    <!-- Recent Publications -->
    <section class="dashboard__section">
      <div class="section-header">
        <h2 class="section-title">最近编辑的族谱</h2>
        <button class="section-link" @click="router.push({ name: 'publications' })">查看全部</button>
      </div>

      <div v-if="loading" class="loading-text">加载中...</div>

      <div v-else-if="recentPubs.length === 0" class="empty-text">
        暂无族谱，去<a href="#" @click.prevent="router.push({ name: 'publications' })">族谱管理</a>创建一份吧
      </div>

      <div v-else class="recent-list">
        <div
          v-for="pub in recentPubs"
          :key="pub.id"
          class="recent-item"
          @click="openPublication(pub.id)"
        >
          <div class="recent-item__info">
            <h3 class="recent-item__title">{{ pub.title || '未命名族谱' }}</h3>
            <p class="recent-item__subtitle">{{ pub.subtitle || '暂无副标题' }}</p>
          </div>
          <span class="recent-item__date">{{ formatDate(pub.updatedAt) }}</span>
        </div>
      </div>
    </section>
  </div>
</template>

<style scoped>
.dashboard__title {
  font-size: 1.5rem;
  font-family: 'Noto Serif SC', serif;
  font-weight: 700;
  color: var(--text-main, #1a1a1a);
  margin: 0 0 0.25rem;
}

.dashboard__desc {
  color: var(--text-soft, #888);
  font-size: 0.85rem;
  margin: 0 0 1.5rem;
}

/* ── Stat Cards ── */
.stat-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 1rem;
  margin-bottom: 2rem;
}

.stat-card {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1.25rem;
  background: var(--bg-panel, #fff);
  border: 1px solid var(--border-color, rgba(0,0,0,0.08));
  border-radius: 14px;
  cursor: pointer;
  transition: transform 0.15s, box-shadow 0.15s;
}

.stat-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(0,0,0,0.06);
}

.stat-card--accent {
  background: linear-gradient(135deg, var(--accent-ink, #6a4b2f), var(--accent-amber, #a96e35));
  border-color: transparent;
  color: #fff;
}

.stat-card__icon {
  width: 44px;
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 12px;
  flex-shrink: 0;
}

.stat-card__icon--pub {
  background: rgba(168, 110, 53, 0.12);
  color: var(--accent-amber, #a96e35);
}

.stat-card__icon--user {
  background: rgba(59, 130, 246, 0.1);
  color: #3b82f6;
}

.stat-card__icon--quick {
  background: rgba(255,255,255,0.2);
  color: #fff;
}

.stat-card--backup {
  background: linear-gradient(135deg, #059669, #34d399);
  border-color: transparent;
  color: #fff;
}

.stat-card__icon--backup {
  background: rgba(255,255,255,0.2);
  color: #fff;
}

.stat-card__info {
  display: flex;
  flex-direction: column;
}

.stat-card__number {
  font-size: 1.5rem;
  font-weight: 800;
  line-height: 1.2;
}

.stat-card__label {
  font-size: 0.75rem;
  opacity: 0.65;
  font-weight: 500;
}

/* ── Section ── */
.dashboard__section {
  margin-bottom: 2rem;
}

.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 0.75rem;
}

.section-title {
  font-size: 1rem;
  font-weight: 700;
  color: var(--text-main, #1a1a1a);
  margin: 0;
  font-family: 'Noto Serif SC', serif;
}

.section-link {
  background: none;
  border: none;
  color: var(--accent-amber, #a96e35);
  font-size: 0.8rem;
  font-weight: 600;
  cursor: pointer;
}

.section-link:hover {
  text-decoration: underline;
}

.loading-text,
.empty-text {
  color: var(--text-soft, #888);
  font-size: 0.85rem;
  padding: 1.5rem 0;
}

.empty-text a {
  color: var(--accent-amber, #a96e35);
  font-weight: 600;
}

/* ── Recent List ── */
.recent-list {
  background: var(--bg-panel, #fff);
  border: 1px solid var(--border-color, rgba(0,0,0,0.08));
  border-radius: 14px;
  overflow: hidden;
}

.recent-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.85rem 1.25rem;
  cursor: pointer;
  transition: background 0.15s;
  border-bottom: 1px solid var(--border-color, rgba(0,0,0,0.04));
}

.recent-item:last-child {
  border-bottom: none;
}

.recent-item:hover {
  background: var(--bg-hover, rgba(0,0,0,0.02));
}

.recent-item__title {
  margin: 0;
  font-size: 0.9rem;
  font-weight: 600;
  color: var(--text-main, #1a1a1a);
}

.recent-item__subtitle {
  margin: 0.15rem 0 0;
  font-size: 0.75rem;
  color: var(--text-soft, #888);
}

.recent-item__date {
  font-size: 0.75rem;
  color: var(--text-soft, #888);
  flex-shrink: 0;
}
</style>
