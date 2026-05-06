<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { listLogs, type AuditLogEntry } from '../api/audit'

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

function formatDate(dateStr: string) {
  const d = new Date(dateStr)
  return d.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
}

function actionLabel(action: string): string {
  const map: Record<string, string> = {
    LOGIN: '登录',
    LOGOUT: '退出',
    CREATE_PUB: '创建族谱',
    DELETE_PUB: '删除族谱',
    UPDATE_PUB: '保存族谱',
    CREATE_USER: '创建用户',
    DELETE_USER: '删除用户',
    RESET_PASSWORD: '重置密码',
    BACKUP: '数据库备份',
  }
  return map[action] || action
}

function actionClass(action: string): string {
  if (action.includes('DELETE')) return 'action-tag danger'
  if (action.includes('CREATE') || action === 'BACKUP') return 'action-tag success'
  if (action === 'LOGIN') return 'action-tag info'
  return 'action-tag'
}
</script>

<template>
  <div class="audit-log-view">
    <div class="bento-header">
      <div class="header-content">
        <h1 class="page-title">修谱纪事 // AUDIT LOGS</h1>
        <p class="page-desc">系统全局重要操作与数据流转追踪</p>
      </div>
      <button class="bento-btn ghost" @click="loadLogs" title="刷新日志">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>
        刷新记录
      </button>
    </div>

    <div v-if="errorMsg" class="audit-notice bento-card">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
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

    <div v-else-if="logs.length > 0" class="bento-card table-card">
      <div class="table-header">
        <span class="col-time">发生时间</span>
        <span class="col-user">操作人</span>
        <span class="col-action">动作类型</span>
        <span class="col-detail">操作详情与系统快照</span>
      </div>
      <div class="table-body">
        <div v-for="log in logs" :key="log.id" class="table-row">
          <span class="col-time">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
            {{ formatDate(log.createdAt) }}
          </span>
          <span class="col-user">
            <div class="mini-avatar">
              {{ log.username.charAt(0).toUpperCase() }}
            </div>
            {{ log.username }}
          </span>
          <span class="col-action">
            <span :class="actionClass(log.action)">{{ actionLabel(log.action) }}</span>
          </span>
          <span class="col-detail">{{ log.detail || '未记录详细信息' }}</span>
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

/* ── Header ── */
.bento-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.page-title {
  font-family: monospace;
  font-size: 1.1rem;
  font-weight: 700;
  letter-spacing: 0.1em;
  color: var(--text-main);
  margin: 0 0 6px;
}

.page-desc {
  font-size: 0.85rem;
  color: var(--text-soft);
  margin: 0;
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
}
:global([data-theme="ink-wash"]) .bento-btn.ghost:hover,
:global([data-theme="rosewood"]) .bento-btn.ghost:hover,
:global([data-theme="star-sea"]) .bento-btn.ghost:hover {
  background: rgba(255,255,255,0.15);
}

/* ── Glass Bento Cards ── */
.bento-card {
  background: var(--glass-panel-bg, rgba(255, 255, 255, 0.6));
  backdrop-filter: blur(24px) saturate(180%);
  -webkit-backdrop-filter: blur(24px) saturate(180%);
  border: 1px solid var(--glass-border-highlight, rgba(255, 255, 255, 0.8));
  border-radius: 20px;
  box-shadow: 0 24px 48px rgba(0, 0, 0, 0.05), inset 0 1px 0 rgba(255,255,255,0.5);
  padding: 24px;
}
:global([data-theme="ink-wash"]) .bento-card,
:global([data-theme="rosewood"]) .bento-card,
:global([data-theme="star-sea"]) .bento-card {
  background: rgba(20, 20, 20, 0.5);
  border-color: rgba(255,255,255,0.1);
  box-shadow: 0 24px 48px rgba(0,0,0,0.2);
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
:global([data-theme="ink-wash"]) .audit-notice,
:global([data-theme="rosewood"]) .audit-notice,
:global([data-theme="star-sea"]) .audit-notice {
  background: rgba(234, 179, 8, 0.15);
  color: #fde047;
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

/* ── Table Layout ── */
.table-card {
  padding: 0;
  overflow: hidden;
}
.table-header {
  display: grid;
  grid-template-columns: 180px 140px 120px 1fr;
  gap: 16px;
  padding: 16px 24px;
  background: rgba(0,0,0,0.02);
  border-bottom: 1px solid var(--glass-border-shadow, rgba(0,0,0,0.05));
  font-size: 0.7rem;
  font-weight: 800;
  color: var(--text-soft);
  text-transform: uppercase;
  letter-spacing: 0.1em;
}
:global([data-theme="ink-wash"]) .table-header,
:global([data-theme="rosewood"]) .table-header,
:global([data-theme="star-sea"]) .table-header {
  background: rgba(255,255,255,0.02);
  border-color: rgba(255,255,255,0.05);
}

.table-row {
  display: grid;
  grid-template-columns: 180px 140px 120px 1fr;
  gap: 16px;
  padding: 16px 24px;
  align-items: center;
  border-bottom: 1px solid var(--glass-border-shadow, rgba(0,0,0,0.03));
  transition: background 0.2s ease;
}
.table-row:hover {
  background: rgba(255,255,255,0.4);
}
:global([data-theme="ink-wash"]) .table-row:hover,
:global([data-theme="rosewood"]) .table-row:hover,
:global([data-theme="star-sea"]) .table-row:hover {
  background: rgba(255,255,255,0.03);
}

.col-time {
  font-family: monospace;
  font-size: 0.8rem;
  color: var(--text-soft);
  display: flex;
  align-items: center;
  gap: 6px;
}

.col-user {
  font-size: 0.85rem;
  font-weight: 700;
  color: var(--text-main);
  display: flex;
  align-items: center;
  gap: 8px;
}
.mini-avatar {
  width: 24px;
  height: 24px;
  border-radius: 6px;
  background: var(--glass-border-shadow, rgba(0,0,0,0.1));
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.7rem;
  font-weight: 800;
  font-family: 'Noto Serif SC', serif;
  color: var(--text-main);
}
:global([data-theme="ink-wash"]) .mini-avatar,
:global([data-theme="rosewood"]) .mini-avatar,
:global([data-theme="star-sea"]) .mini-avatar {
  background: rgba(255,255,255,0.1);
  color: #fff;
}

.col-action {
  display: flex;
  align-items: center;
}
.action-tag {
  display: inline-block;
  padding: 4px 10px;
  border-radius: 6px;
  font-size: 0.7rem;
  font-weight: 700;
  background: rgba(100,100,100,0.1);
  color: var(--text-sub);
}
.action-tag.danger {
  background: rgba(239, 68, 68, 0.1);
  color: #ef4444;
}
.action-tag.success {
  background: rgba(22, 163, 74, 0.1);
  color: #16a34a;
}
.action-tag.info {
  background: rgba(59, 130, 246, 0.1);
  color: #3b82f6;
}
:global([data-theme="ink-wash"]) .action-tag.danger,
:global([data-theme="rosewood"]) .action-tag.danger,
:global([data-theme="star-sea"]) .action-tag.danger {
  background: rgba(239, 68, 68, 0.2);
  color: #fca5a5;
}
:global([data-theme="ink-wash"]) .action-tag.success,
:global([data-theme="rosewood"]) .action-tag.success,
:global([data-theme="star-sea"]) .action-tag.success {
  background: rgba(22, 163, 74, 0.2);
  color: #86efac;
}
:global([data-theme="ink-wash"]) .action-tag.info,
:global([data-theme="rosewood"]) .action-tag.info,
:global([data-theme="star-sea"]) .action-tag.info {
  background: rgba(59, 130, 246, 0.2);
  color: #93c5fd;
}

.col-detail {
  color: var(--text-soft);
  font-size: 0.8rem;
  line-height: 1.4;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

@media (max-width: 960px) {
  .table-header {
    display: none;
  }
  .table-row {
    grid-template-columns: 1fr;
    gap: 8px;
    padding: 16px;
  }
  .col-time { font-size: 0.75rem; }
  .col-detail { white-space: normal; }
}
</style>
