<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { listLogs, type AuditLogEntry } from '../api/audit'
import { useLexicon } from '../composables/useLexicon'

const { lexicon } = useLexicon()
const logs = ref<AuditLogEntry[]>([])
const loading = ref(true)
const errorMsg = ref('')

async function loadLogs() {
  loading.value = true
  errorMsg.value = ''
  try {
    logs.value = await listLogs()
  } catch {
    errorMsg.value = '暂无法加载操作日志（需要后端支持 /api/admin/logs 接口）'
    logs.value = []
  } finally {
    loading.value = false
  }
}

onMounted(loadLogs)

function formatChronicleDate(dateStr: string) {
  const d = new Date(dateStr)
  return `${d.getMonth() + 1}月${d.getDate()}日`
}

function formatChronicleTime(dateStr: string) {
  const d = new Date(dateStr)
  const h = d.getHours().toString().padStart(2, '0')
  const min = d.getMinutes().toString().padStart(2, '0')
  return `${h}:${min}`
}

function actionToNarrative(action: string): string {
  const map: Record<string, string> = {
    LOGIN: '步入阁中',
    LOGOUT: '离阁',
    CREATE_PUB: '提笔新撰了',
    DELETE_PUB: '将旧档付之一炬：',
    UPDATE_PUB: '修缮并封存了',
    CREATE_USER: '引荐了新同道：',
    DELETE_USER: '将此人除名：',
    RESET_PASSWORD: '重铸了密钥：',
    BACKUP: '将全部卷宗妥善归档',
  }
  return map[action] || action
}
</script>

<template>
  <div class="audit-log-view-root">
    <div class="audit-log-view">
      <header class="poetic-header">
        <div class="poetic-header__main">
          <div class="poetic-eyebrow">{{ lexicon.logs.headerEyebrow }}</div>
          <h1 class="poetic-title">{{ lexicon.logs.headerTitle }}<span class="text-italic">{{ lexicon.logs.headerTitleItalic }}</span></h1>
        </div>
        <div class="poetic-header__extra" style="display: flex; justify-content: space-between; align-items: center; gap: 2rem;">
          <p class="poetic-quote" v-html="lexicon.logs.quote.replace(/\\n/g, '<br/>')"></p>
          <button class="bento-btn ghost" title="刷新日志" @click="loadLogs">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" /><path d="M3 3v5h5" /></svg>
            刷新记录
          </button>
        </div>
      </header>

      <div v-if="errorMsg" class="audit-notice bento-card">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>
        {{ errorMsg }}
      </div>

      <div v-if="loading" class="loading-state">
        <div class="spinner"></div>
        <span>追溯纪事中...</span>
      </div>

      <div v-else-if="logs.length === 0 && !errorMsg" class="bento-card empty-state">
        <div class="empty-icon">⚬</div>
        <span>暂无操作记录</span>
      </div>

      <div v-else-if="logs.length > 0" class="bento-card chronicle-card">
        <div class="chronicle-body">
          <div v-for="log in logs" :key="log.id" class="chronicle-row">
            <div class="chronicle-time">
              <div class="c-date">{{ formatChronicleDate(log.createdAt) }}</div>
              <div class="c-hour">{{ formatChronicleTime(log.createdAt) }}</div>
            </div>
            <div class="chronicle-node"></div>
            <div class="chronicle-content">
              <span class="c-user">{{ log.username }}</span>
              <span class="c-action">{{ actionToNarrative(log.action) }}</span>
              <span v-if="log.detail" class="c-detail">《{{ log.detail }}》</span>
            </div>
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

.bento-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  border-radius: 999px;
  font-size: 0.85rem;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.2s ease;
  border: none;
}
.bento-btn.ghost {
  background: var(--glass-panel-bg, rgba(255,255,255,0.4));
  color: var(--text-main);
  border: 1px solid var(--glass-border-highlight, rgba(0,0,0,0.1));
}
.bento-btn.ghost:hover {
  background: var(--bg-panel, #fff);
  box-shadow: 0 4px 12px rgba(0,0,0,0.05);
  color: var(--color-accent);
  border-color: var(--color-accent);
}


/* ── Glass Bento Cards ── */
.bento-card {
  background: var(--color-card-fill);
  backdrop-filter: blur(24px) saturate(180%);
  -webkit-backdrop-filter: blur(24px) saturate(180%);
  border: 1px solid var(--color-card-stroke);
  border-radius: 20px;
  box-shadow: var(--shadow-whisper);
  padding: 24px;
}


.audit-notice {
  display: flex;
  align-items: center;
  gap: 12px;
  background: rgba(234, 179, 8, 0.1);
  border-color: rgba(234, 179, 8, 0.3);
  color: #b45309;
  font-weight: 600;
  padding: 16px 24px;
}


.loading-state, .empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px;
  color: var(--text-soft);
  gap: 16px;
}
.empty-icon {
  font-size: 2rem;
  opacity: 0.5;
}
.spinner {
  width: 32px;
  height: 32px;
  border: 3px solid var(--glass-border-shadow, rgba(0,0,0,0.1));
  border-top-color: var(--text-main);
  border-radius: 50%;
  animation: spin 1s linear infinite;
}
@keyframes spin {
  to { transform: rotate(360deg); }
}

/* ── Chronicle Layout ── */
.chronicle-card {
  padding: 32px 48px;
}
.chronicle-body {
  position: relative;
  display: flex;
  flex-direction: column;
}
.chronicle-body::before {
  content: '';
  position: absolute;
  top: 0;
  bottom: 0;
  left: 140px;
  width: 1px;
  background: var(--color-neutral-4);
}


.chronicle-row {
  position: relative;
  display: flex;
  align-items: flex-start;
  padding: 16px 0;
  transition: all 0.3s;
}
.chronicle-row:hover {
  transform: translateX(4px);
}
.chronicle-row:hover .chronicle-node {
  transform: translate(-50%, -50%) scale(1.5);
}

.chronicle-time {
  width: 120px;
  text-align: right;
  padding-right: 32px;
  font-family: 'Noto Serif SC', serif;
  color: var(--text-soft);
  letter-spacing: 0.05em;
  padding-top: 2px;
}
.c-date {
  font-weight: 700;
  font-size: 0.95rem;
  color: var(--text-main);
  margin-bottom: 2px;
}
.c-hour {
  font-family: monospace;
  font-size: 0.75rem;
  opacity: 0.6;
}

.chronicle-node {
  position: absolute;
  left: 140px;
  top: 24px;
  transform: translate(-50%, -50%);
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--color-accent, #c43a31);
  box-shadow: 0 0 0 4px var(--color-card-fill);
  transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}


.chronicle-content {
  flex: 1;
  padding-left: 32px;
  font-family: 'Noto Serif SC', serif;
  font-size: 0.95rem;
  color: var(--text-main);
  line-height: 1.6;
}
.c-user {
  font-weight: 700;
  color: var(--color-neutral-10);
  margin-right: 6px;
}

.c-action {
  color: var(--text-main);
  opacity: 0.8;
}
.c-detail {
  font-weight: 700;
  color: var(--color-accent, #c43a31);
  margin-left: 4px;
}

@media (max-width: 960px) {
  .chronicle-body::before { left: 80px; }
  .chronicle-node { left: 80px; }
  .chronicle-time { width: 80px; padding-right: 16px; }
  .c-date { font-size: 0.9rem; }
  .chronicle-content { padding-left: 16px; font-size: 1rem; }
}
</style>
