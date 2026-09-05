<script setup lang="ts">
import { onMounted, ref, computed } from 'vue'
import { listLogs, type AuditLogEntry } from '../api/audit'
import { useLexiconStore } from '../stores/lexicon'
import PoeticHeader from '../components/PoeticHeader.vue'
import UserAvatar from '../components/UserAvatar.vue'
import { useToast } from '../composables/useToast'

interface ActionMeta {
  category: 'publication' | 'collaboration' | 'user' | 'system'
  label: string
  narrative: string
  tone: 'primary' | 'success' | 'warning' | 'danger' | 'info' | 'neutral'
}

const ACTION_METAS: Record<string, ActionMeta> = {
  // 谱牒与世系
  CREATE_PUB: { category: 'publication', label: '起草立谱', narrative: '起草立案了新宗谱', tone: 'success' },
  UPDATE_PUB: { category: 'publication', label: '修缮谱卷', narrative: '修缮并封存了谱牒卷宗', tone: 'primary' },
  UPDATE_PUB_META: { category: 'publication', label: '勘校卷目', narrative: '勘误校正了谱目信息', tone: 'primary' },
  DELETE_PUB: { category: 'publication', label: '废除宗谱', narrative: '将谱牒档案移出馆藏并封存', tone: 'danger' },
  UPDATE_PERSON: { category: 'publication', label: '辑录人物', narrative: '修订录入了世系人物纪略', tone: 'primary' },
  GEDCOM_EXPORT: { category: 'publication', label: '传拓输出', narrative: '传拓导出了 GEDCOM 标准谱牒', tone: 'info' },
  GEDCOM_IMPORT: { category: 'publication', label: '录入外卷', narrative: '融贯导入了外部 GEDCOM 档案', tone: 'success' },
  GEDCOM_MERGE: { category: 'publication', label: '汇融世系', narrative: '校对合并了 GEDCOM 家族脉络', tone: 'info' },

  // 协修与分享
  ADD_COLLABORATOR: { category: 'collaboration', label: '延揽同修', narrative: '邀请延揽了协修成员', tone: 'success' },
  UPDATE_COLLABORATOR_ROLE: { category: 'collaboration', label: '调整职分', narrative: '调整了修谱成员的协作权限', tone: 'info' },
  REMOVE_COLLABORATOR: { category: 'collaboration', label: '解任修撰', narrative: '解任移出了修谱成员', tone: 'warning' },
  CREATE_SHARE_LINK: { category: 'collaboration', label: '颁赐符印', narrative: '铸造颁发了公开阅览符印', tone: 'info' },
  REVOKE_SHARE_LINK: { category: 'collaboration', label: '收回符印', narrative: '收回废止了公开阅览符印', tone: 'neutral' },

  // 编委与账号
  ADMIN_CREATE_USER: { category: 'user', label: '延纳编委', narrative: '引荐敕设了新编委账号', tone: 'success' },
  CREATE_USER: { category: 'user', label: '新增同道', narrative: '引荐录入了新同道账号', tone: 'success' },
  ADMIN_DELETE_USER: { category: 'user', label: '除名编委', narrative: '将编委账号除名削籍', tone: 'danger' },
  DELETE_USER: { category: 'user', label: '除名账号', narrative: '将账号除名削籍', tone: 'danger' },
  ADMIN_BATCH_DELETE_USERS: { category: 'user', label: '批量削籍', narrative: '批量除名削籍了多位编委', tone: 'danger' },
  ADMIN_RESET_PASSWORD: { category: 'user', label: '重铸密匙', narrative: '重铸了编委登录密匙', tone: 'warning' },
  RESET_PASSWORD: { category: 'user', label: '重置密码', narrative: '重铸了登录密码', tone: 'warning' },
  ADMIN_CHANGE_ROLE: { category: 'user', label: '更替职官', narrative: '更替了编委后台系统职司', tone: 'info' },

  // 系统安全与运维
  BACKUP: { category: 'system', label: '全阁归档', narrative: '将全阁卷宗数据库备份归档', tone: 'success' },
  BACKUP_FAILED: { category: 'system', label: '归档未果', narrative: '数据库归档封存失败', tone: 'danger' },
  RESTORE_DB: { category: 'system', label: '启封还元', narrative: '从归档副本还原了数据库', tone: 'warning' },
  RESTORE_DB_FAILED: { category: 'system', label: '还元未果', narrative: '数据库启封还原失败', tone: 'danger' },
  LOGIN: { category: 'system', label: '步入阁中', narrative: '步入阁中检视宗卷', tone: 'neutral' },
  LOGOUT: { category: 'system', label: '掩扉离阁', narrative: '掩扉离阁', tone: 'neutral' },
  WX_LOGIN: { category: 'system', label: '微信入阁', narrative: '通过微信授权凭据登入谱阁', tone: 'neutral' },
  WX_REGISTER: { category: 'system', label: '微信初见', narrative: '首次通过微信授权登记归源', tone: 'success' },
}

const lexiconStore = useLexiconStore()
const lexicon = computed(() => lexiconStore.lexicon)
const { showToast } = useToast()

const logs = ref<AuditLogEntry[]>([])
const loading = ref(true)
const loadingMore = ref(false)
const errorMsg = ref('')
const currentPage = ref(0)
const pageSize = 50
const hasMore = ref(true)

// Filter & Search states
const searchQuery = ref('')
const activeCategory = ref<'all' | 'publication' | 'collaboration' | 'user' | 'system'>('all')

const categoryConfig = {
  all: { label: '全部纪事' },
  publication: { label: '谱牒世系' },
  collaboration: { label: '协修分享' },
  user: { label: '编委职官' },
  system: { label: '系统安全' },
}

function getActionMeta(action: string): ActionMeta {
  if (ACTION_METAS[action]) {
    return ACTION_METAS[action]
  }
  return {
    category: 'system',
    label: action,
    narrative: action,
    tone: 'neutral',
  }
}

async function loadLogs(reset = true) {
  if (reset) {
    loading.value = true
    currentPage.value = 0
    hasMore.value = true
    errorMsg.value = ''
  } else {
    loadingMore.value = true
  }

  try {
    const data = await listLogs(currentPage.value, pageSize)
    if (reset) {
      logs.value = data
    } else {
      logs.value.push(...data)
    }
    if (data.length < pageSize) {
      hasMore.value = false
    }
  } catch {
    if (reset) {
      errorMsg.value = '暂无法加载操作日志（请确认已具备管理员权限）'
      logs.value = []
    } else {
      showToast('加载更早记录失败', 'error')
    }
  } finally {
    loading.value = false
    loadingMore.value = false
  }
}

async function handleLoadMore() {
  if (loadingMore.value || !hasMore.value) return
  currentPage.value += 1
  await loadLogs(false)
}

onMounted(() => loadLogs(true))

// Counts for tabs
const tabCounts = computed(() => {
  const all = logs.value.length
  let pubCount = 0
  let collabCount = 0
  let userCount = 0
  let sysCount = 0

  for (const log of logs.value) {
    const cat = getActionMeta(log.action).category
    if (cat === 'publication') pubCount++
    else if (cat === 'collaboration') collabCount++
    else if (cat === 'user') userCount++
    else if (cat === 'system') sysCount++
  }

  return {
    all,
    publication: pubCount,
    collaboration: collabCount,
    user: userCount,
    system: sysCount,
  }
})

// Filtered logs
const filteredLogs = computed(() => {
  let result = logs.value

  // Category filter
  if (activeCategory.value !== 'all') {
    result = result.filter((l) => getActionMeta(l.action).category === activeCategory.value)
  }

  // Keyword search
  const q = searchQuery.value.trim().toLowerCase()
  if (q) {
    result = result.filter((l) => {
      const meta = getActionMeta(l.action)
      return (
        l.username.toLowerCase().includes(q) ||
        (l.detail && l.detail.toLowerCase().includes(q)) ||
        meta.label.toLowerCase().includes(q) ||
        meta.narrative.toLowerCase().includes(q) ||
        l.action.toLowerCase().includes(q)
      )
    })
  }

  return result
})

// Group logs by day
interface DayGroup {
  dateKey: string
  dateTitle: string
  isToday: boolean
  logs: AuditLogEntry[]
}

const groupedLogs = computed<DayGroup[]>(() => {
  const groups: Record<string, DayGroup> = {}
  const now = new Date()
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
  
  const yesterday = new Date(now)
  yesterday.setDate(yesterday.getDate() - 1)
  const yesterdayStr = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, '0')}-${String(yesterday.getDate()).padStart(2, '0')}`

  for (const log of filteredLogs.value) {
    const d = new Date(log.createdAt)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    
    if (!groups[key]) {
      let title = `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`
      let isToday = false
      if (key === todayStr) {
        title = `今日 · ${d.getMonth() + 1}月${d.getDate()}日`
        isToday = true
      } else if (key === yesterdayStr) {
        title = `昨日 · ${d.getMonth() + 1}月${d.getDate()}日`
      }

      groups[key] = {
        dateKey: key,
        dateTitle: title,
        isToday,
        logs: [],
      }
    }
    groups[key].logs.push(log)
  }

  return Object.values(groups)
})

function formatChronicleTime(dateStr: string) {
  const d = new Date(dateStr)
  const h = d.getHours().toString().padStart(2, '0')
  const min = d.getMinutes().toString().padStart(2, '0')
  return `${h}:${min}`
}

function handleExportJson() {
  if (filteredLogs.value.length === 0) {
    showToast('暂无记录可供导出', 'error')
    return
  }
  const exportData = filteredLogs.value.map((l) => ({
    id: l.id,
    time: l.createdAt,
    operator: l.username,
    action: l.action,
    actionLabel: getActionMeta(l.action).label,
    narrative: getActionMeta(l.action).narrative,
    detail: l.detail || '',
  }))
  const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `guiyuan-audit-logs-${new Date().toISOString().slice(0, 10)}.json`
  a.click()
  URL.revokeObjectURL(url)
  showToast(`已导出 ${exportData.length} 条纪事`, 'success')
}
</script>

<template>
  <div class="audit-log-view-root">
    <div class="audit-log-view">
      <PoeticHeader
        :eyebrow="lexicon.logs.headerEyebrow"
        :title="lexicon.logs.headerTitle"
        :title-italic="lexicon.logs.headerTitleItalic"
      >
        <template #extra>
          <p class="poetic-quote" v-html="lexicon.logs.quote.replace(/\\n/g, '<br/>')"></p>
          <div class="header-actions">
            <button class="btn btn--ghost" title="导出当前日志" @click="handleExportJson">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
              导出纪事
            </button>
            <button class="btn btn--ghost" title="刷新记录" @click="loadLogs(true)">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" /><path d="M3 3v5h5" /></svg>
              刷新记录
            </button>
          </div>
        </template>
      </PoeticHeader>

      <!-- Control Toolbar: Search & Category Filter -->
      <div class="audit-toolbar">
        <div class="search-bar">
          <svg class="search-icon" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <input
            v-model="searchQuery"
            type="text"
            class="search-input"
            placeholder="搜索操作者、谱目、世系变动或关键词..."
          />
          <button v-if="searchQuery" class="search-clear" title="清空搜索" @click="searchQuery = ''">&times;</button>
        </div>

        <div class="glass-tabs">
          <button
            v-for="cat in (['all', 'publication', 'collaboration', 'user', 'system'] as const)"
            :key="cat"
            class="glass-tab"
            :class="{ 'is-active': activeCategory === cat }"
            @click="activeCategory = cat"
          >
            {{ categoryConfig[cat].label }}
            <span class="tab-count">{{ tabCounts[cat] }}</span>
          </button>
        </div>
      </div>

      <!-- Result Feedback Strip -->
      <div v-if="searchQuery || activeCategory !== 'all'" class="filter-status-row">
        <span>当前筛选已匹配 <strong>{{ filteredLogs.length }}</strong> 条纪事</span>
        <button v-if="searchQuery || activeCategory !== 'all'" class="reset-filter-link" @click="searchQuery = ''; activeCategory = 'all'">
          重置筛选条件
        </button>
      </div>

      <!-- Error Notice -->
      <div v-if="errorMsg" class="audit-notice bento-card panel-glass">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>
        {{ errorMsg }}
      </div>

      <!-- Loading State -->
      <div v-if="loading" class="loading-state">
        <div class="spinner"></div>
        <span>追溯纪事卷宗中...</span>
      </div>

      <!-- Empty State -->
      <div v-else-if="filteredLogs.length === 0 && !errorMsg" class="bento-card panel-glass empty-state">
        <div class="empty-icon">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
        </div>
        <p class="empty-title">{{ searchQuery || activeCategory !== 'all' ? '未找到符合条件的纪事' : '暂无任何操作纪事' }}</p>
        <p class="empty-desc">{{ searchQuery ? '请尝试更换检索关键词或切换分类' : '系统操作日志将自动留痕于此' }}</p>
        <button v-if="searchQuery || activeCategory !== 'all'" class="btn btn--sm" style="margin-top: 14px;" @click="searchQuery = ''; activeCategory = 'all'">
          清空所有检索
        </button>
      </div>

      <!-- Chronicle Layout -->
      <div v-else-if="filteredLogs.length > 0" class="bento-card panel-glass chronicle-card">
        <div class="chronicle-stream">
          <div v-for="group in groupedLogs" :key="group.dateKey" class="day-section">
            <!-- Day Header Anchor -->
            <div class="day-header" :class="{ 'is-today': group.isToday }">
              <span class="day-dot"></span>
              <span class="day-title">{{ group.dateTitle }}</span>
              <span class="day-count">{{ group.logs.length }} 桩行事</span>
            </div>

            <div class="day-timeline">
              <div v-for="log in group.logs" :key="log.id" class="chronicle-row">
                <!-- Time Column -->
                <div class="chronicle-time">
                  <span class="c-hour">{{ formatChronicleTime(log.createdAt) }}</span>
                </div>

                <!-- Timeline Node -->
                <div class="chronicle-node" :class="getActionMeta(log.action).tone"></div>

                <!-- Content Area -->
                <div class="chronicle-content">
                  <div class="c-main-line">
                    <div class="c-operator-wrap">
                      <UserAvatar :name="log.username" size="sm" :tone="getActionMeta(log.action).tone" />
                      <span class="c-user" :title="'经办编委：' + log.username">{{ log.username }}</span>
                    </div>

                    <span class="action-badge" :class="getActionMeta(log.action).tone">
                      {{ getActionMeta(log.action).label }}
                    </span>

                    <span class="c-narrative">{{ getActionMeta(log.action).narrative }}</span>
                  </div>

                  <!-- Optional Action Details -->
                  <div v-if="log.detail" class="c-detail-row">
                    <span class="c-detail-branch">↳</span>
                    <span class="c-detail-text" :title="log.detail">{{ log.detail }}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Load More / End of Stream Footer -->
        <div class="stream-footer">
          <button
            v-if="hasMore"
            class="btn btn--ghost load-more-btn"
            :disabled="loadingMore"
            @click="handleLoadMore"
          >
            <div v-if="loadingMore" class="spinner-sm"></div>
            <span>{{ loadingMore ? '正在追溯更早纪事...' : '查阅更早历史纪事' }}</span>
          </button>
          <div v-else class="stream-end-marker">
            <span class="end-line"></span>
            <span class="end-text">历史纪事至此已全数载入</span>
            <span class="end-line"></span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.audit-log-view {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

/* ── Toolbar: Search & Filter ── */
.audit-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
}

.search-bar {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 14px;
  background: var(--color-card-fill);
  border: 1px solid var(--color-card-stroke);
  border-radius: var(--radius-lg, 12px);
  box-shadow: var(--shadow-whisper);
  min-width: 280px;
  flex: 1;
  max-width: 440px;
  transition: all var(--duration-fast, 180ms) var(--ease-breath);
}

.search-bar:focus-within {
  border-color: var(--color-accent);
  box-shadow: none;
}

.search-icon {
  color: var(--color-neutral-5);
  flex-shrink: 0;
}

.search-input {
  flex: 1;
  border: none !important;
  background: transparent !important;
  font-size: var(--text-copy-14, 14px);
  color: var(--color-neutral-10);
  outline: none !important;
  box-shadow: none !important;
  height: 26px;
  line-height: 26px;
  padding: 0 4px !important;
  width: 100%;
}

.search-input:focus,
.search-input:focus-visible {
  outline: none !important;
  box-shadow: none !important;
  border: none !important;
  background: transparent !important;
}

.search-input::placeholder {
  color: var(--color-neutral-5);
}

.search-clear {
  width: 22px;
  height: 22px;
  border: none;
  background: var(--color-neutral-3);
  color: var(--color-neutral-7);
  border-radius: 50%;
  font-size: 14px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  line-height: 1;
  transition: all var(--duration-fast, 150ms);
}

.search-clear:hover {
  background: var(--color-neutral-4);
  color: var(--color-neutral-10);
}

/* ── Glass Tabs ── */
.glass-tabs {
  display: flex;
  gap: 6px;
  padding: 5px;
  background: var(--color-neutral-1);
  border-radius: var(--radius-lg, 12px);
  border: 1px solid var(--color-neutral-4);
  overflow-x: auto;
  max-width: 100%;
}

.glass-tab {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  background: transparent;
  border: none;
  border-radius: var(--radius-md, 8px);
  font-size: var(--text-copy-14, 13px);
  font-weight: 500;
  color: var(--color-neutral-7);
  cursor: pointer;
  white-space: nowrap;
  transition: all var(--duration-fast, 150ms);
}

.glass-tab:hover {
  color: var(--color-neutral-10);
}

.glass-tab.is-active {
  background: var(--color-panel-bg);
  color: var(--color-neutral-10);
  box-shadow: var(--shadow-whisper);
}

.tab-count {
  padding: 1px 7px;
  background: var(--color-neutral-3);
  border-radius: 999px;
  font-size: 11px;
  font-family: monospace;
  color: var(--color-neutral-6);
}

.glass-tab.is-active .tab-count {
  background: var(--color-accent);
  color: var(--color-text-on-accent, #fff);
}

/* ── Filter Feedback Row ── */
.filter-status-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: var(--text-label-12, 12px);
  color: var(--color-neutral-6);
  padding: 2px 4px;
}

.reset-filter-link {
  background: transparent;
  border: none;
  color: var(--color-accent);
  cursor: pointer;
  font-size: var(--text-label-12, 12px);
  padding: 0;
  text-decoration: underline;
  text-underline-offset: 2px;
}

/* ── Notice & Bento ── */
.bento-card {
  border-radius: 20px;
  background: var(--color-panel-bg);
  border: 1px solid var(--color-card-stroke);
  box-shadow: var(--shadow-whisper);
}

.audit-notice {
  display: flex;
  align-items: center;
  gap: 12px;
  background: rgba(234, 179, 8, 0.08);
  border-color: rgba(234, 179, 8, 0.25);
  color: #b45309;
  font-weight: 500;
  padding: 16px 20px;
  border-radius: var(--radius-lg, 12px);
}

/* ── Empty & Loading States ── */
.loading-state,
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 64px 24px;
  text-align: center;
  color: var(--color-neutral-6);
  gap: 12px;
}

.empty-icon {
  color: var(--color-neutral-4);
  margin-bottom: 4px;
}

.empty-title {
  font-family: var(--font-serif);
  font-size: var(--text-title-18, 18px);
  font-weight: 500;
  color: var(--color-neutral-8);
  margin: 0;
}

.empty-desc {
  font-size: var(--text-copy-14, 14px);
  color: var(--color-neutral-5);
  margin: 0;
}

.spinner {
  width: 32px;
  height: 32px;
  border: 3px solid var(--color-neutral-3);
  border-top-color: var(--color-accent);
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

.spinner-sm {
  width: 14px;
  height: 14px;
  border: 2px solid var(--color-neutral-4);
  border-top-color: var(--color-accent);
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* ── Chronicle Stream ── */
.chronicle-card {
  padding: 28px 32px;
}

.chronicle-stream {
  display: flex;
  flex-direction: column;
  gap: 28px;
}

.day-section {
  display: flex;
  flex-direction: column;
  position: relative;
}

.day-header {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 6px 12px;
  border-radius: 999px;
  background: var(--color-neutral-2);
  border: 1px solid var(--color-neutral-4);
  width: fit-content;
  margin-bottom: 16px;
  font-family: var(--font-serif);
}

.day-header.is-today {
  background: var(--color-accent-muted, rgba(184, 51, 42, 0.08));
  border-color: rgba(184, 51, 42, 0.25);
  color: var(--color-accent);
}

.day-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--color-neutral-6);
}

.day-header.is-today .day-dot {
  background: var(--color-accent);
}

.day-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--color-neutral-9);
}

.day-header.is-today .day-title {
  color: var(--color-accent);
}

.day-count {
  font-size: 11px;
  color: var(--color-neutral-5);
}

/* Day timeline connecting line */
.day-timeline {
  position: relative;
  display: flex;
  flex-direction: column;
  padding-left: 20px;
}

.day-timeline::before {
  content: '';
  position: absolute;
  top: 10px;
  bottom: 10px;
  left: 79px;
  width: 1px;
  background: var(--color-neutral-4);
}

/* Chronicle Row */
.chronicle-row {
  position: relative;
  display: flex;
  align-items: flex-start;
  padding: 10px 0;
  transition: transform var(--duration-fast, 150ms) var(--ease-breath);
}

.chronicle-row:hover {
  transform: translateX(3px);
}

.chronicle-time {
  width: 50px;
  text-align: right;
  padding-right: 18px;
  padding-top: 2px;
  flex-shrink: 0;
}

.c-hour {
  font-family: monospace;
  font-size: 12px;
  color: var(--color-neutral-6);
}

/* Timeline Node */
.chronicle-node {
  position: absolute;
  left: 59px;
  top: 17px;
  transform: translate(-50%, -50%);
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: var(--color-neutral-6);
  box-shadow: 0 0 0 3px var(--color-panel-bg);
  z-index: 1;
  transition: transform var(--duration-fast, 150ms) var(--ease-breath);
}

.chronicle-row:hover .chronicle-node {
  transform: translate(-50%, -50%) scale(1.4);
}

.chronicle-node.primary { background: var(--color-accent); }
.chronicle-node.success { background: #059669; }
.chronicle-node.warning { background: #d97706; }
.chronicle-node.danger  { background: #dc2626; }
.chronicle-node.info    { background: #2563eb; }
.chronicle-node.neutral { background: var(--color-neutral-5); }

/* Chronicle Content */
.chronicle-content {
  flex: 1;
  padding-left: 24px;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.c-main-line {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.c-operator-wrap {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.c-user {
  font-size: 13.5px;
  font-weight: 600;
  color: var(--color-neutral-10);
}

/* Action Badges */
.action-badge {
  display: inline-flex;
  align-items: center;
  padding: 2px 8px;
  border-radius: 999px;
  font-size: 11.5px;
  font-weight: 500;
  letter-spacing: 0.02em;
  white-space: nowrap;
}

.action-badge.primary {
  background: var(--color-accent-muted, rgba(184, 51, 42, 0.08));
  color: var(--color-accent);
}
.action-badge.success {
  background: rgba(16, 185, 129, 0.1);
  color: #059669;
}
.action-badge.warning {
  background: rgba(245, 158, 11, 0.1);
  color: #b45309;
}
.action-badge.danger {
  background: rgba(239, 68, 68, 0.1);
  color: #dc2626;
}
.action-badge.info {
  background: rgba(59, 130, 246, 0.1);
  color: #2563eb;
}
.action-badge.neutral {
  background: var(--color-neutral-3);
  color: var(--color-neutral-7);
}

.c-narrative {
  font-family: var(--font-serif);
  font-size: 13.5px;
  color: var(--color-neutral-8);
}

/* Detail Line */
.c-detail-row {
  display: flex;
  align-items: flex-start;
  gap: 6px;
  padding: 4px 10px;
  background: var(--color-neutral-2, rgba(0, 0, 0, 0.02));
  border-radius: 6px;
  border: 1px dashed var(--color-neutral-4);
  width: fit-content;
  max-width: 100%;
}

.c-detail-branch {
  color: var(--color-neutral-5);
  font-size: 12px;
  line-height: 1.4;
  flex-shrink: 0;
}

.c-detail-text {
  font-size: 12px;
  color: var(--color-neutral-7);
  line-height: 1.4;
  word-break: break-all;
}

/* ── Stream Footer ── */
.stream-footer {
  display: flex;
  justify-content: center;
  padding-top: 24px;
  margin-top: 12px;
  border-top: 1px solid var(--color-card-stroke, rgba(0, 0, 0, 0.06));
}

.load-more-btn {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 8px 24px;
}

.stream-end-marker {
  display: flex;
  align-items: center;
  gap: 12px;
  color: var(--color-neutral-5);
  font-size: 12px;
  font-family: var(--font-serif);
}

.end-line {
  width: 40px;
  height: 1px;
  background: var(--color-neutral-4);
}

/* Responsive */
@media (max-width: 768px) {
  .chronicle-card {
    padding: 20px 16px;
  }
  .audit-toolbar {
    flex-direction: column;
    align-items: stretch;
  }
  .search-bar {
    max-width: 100%;
  }
  .day-timeline {
    padding-left: 0;
  }
  .day-timeline::before {
    left: 49px;
  }
  .chronicle-time {
    width: 42px;
    padding-right: 12px;
  }
  .chronicle-node {
    left: 49px;
  }
  .chronicle-content {
    padding-left: 16px;
  }
}
</style>
