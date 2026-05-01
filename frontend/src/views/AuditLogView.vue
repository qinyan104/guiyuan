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
  if (action.includes('DELETE')) return 'action-tag action-tag--danger'
  if (action.includes('CREATE') || action === 'BACKUP') return 'action-tag action-tag--success'
  if (action === 'LOGIN') return 'action-tag action-tag--info'
  return 'action-tag'
}
</script>

<template>
  <div>
    <h1 class="page-title">操作日志</h1>
    <p class="page-desc">记录系统中的重要操作行为</p>

    <div v-if="errorMsg" class="audit-notice">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
      {{ errorMsg }}
    </div>

    <div v-if="loading" class="loading-text">加载中...</div>

    <div v-else-if="logs.length === 0 && !errorMsg" class="empty-text">暂无操作记录</div>

    <div v-else-if="logs.length > 0" class="log-table">
      <div class="log-table__header">
        <span class="col-time">时间</span>
        <span class="col-user">用户</span>
        <span class="col-action">操作</span>
        <span class="col-detail">详情</span>
      </div>
      <div v-for="log in logs" :key="log.id" class="log-table__row">
        <span class="col-time">{{ formatDate(log.createdAt) }}</span>
        <span class="col-user">{{ log.username }}</span>
        <span class="col-action">
          <span :class="actionClass(log.action)">{{ actionLabel(log.action) }}</span>
        </span>
        <span class="col-detail">{{ log.detail || '-' }}</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.page-title {
  font-size: 1.5rem;
  font-family: 'Noto Serif SC', serif;
  font-weight: 700;
  color: var(--text-main, #1a1a1a);
  margin: 0 0 0.25rem;
}

.page-desc {
  color: var(--text-soft, #888);
  font-size: 0.85rem;
  margin: 0 0 1.5rem;
}

.audit-notice {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  background: rgba(234, 179, 8, 0.1);
  color: #b45309;
  padding: 0.75rem 1rem;
  border-radius: 10px;
  font-size: 0.8rem;
  font-weight: 600;
  margin-bottom: 1.5rem;
  border: 1px solid rgba(234, 179, 8, 0.2);
}

.loading-text,
.empty-text {
  color: var(--text-soft, #888);
  font-size: 0.85rem;
  padding: 2rem 0;
  text-align: center;
}

.log-table {
  background: var(--bg-panel, #fff);
  border: 1px solid var(--border-color, rgba(0,0,0,0.08));
  border-radius: 12px;
  overflow: hidden;
}

.log-table__header {
  display: grid;
  grid-template-columns: 160px 100px 100px 1fr;
  gap: 0.5rem;
  padding: 0.65rem 1rem;
  background: var(--bg-shell, #f5f0e8);
  font-size: 0.7rem;
  font-weight: 700;
  color: var(--text-soft, #888);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.log-table__row {
  display: grid;
  grid-template-columns: 160px 100px 100px 1fr;
  gap: 0.5rem;
  padding: 0.6rem 1rem;
  align-items: center;
  font-size: 0.82rem;
  color: var(--text-main, #1a1a1a);
  border-top: 1px solid var(--border-color, rgba(0,0,0,0.04));
}

.col-detail {
  color: var(--text-soft, #888);
  font-size: 0.8rem;
}

.action-tag {
  display: inline-block;
  padding: 0.1rem 0.5rem;
  border-radius: 999px;
  font-size: 0.68rem;
  font-weight: 700;
  background: rgba(100,100,100,0.1);
  color: var(--text-sub, #555);
}

.action-tag--danger {
  background: rgba(239, 68, 68, 0.1);
  color: #ef4444;
}

.action-tag--success {
  background: rgba(22, 163, 74, 0.1);
  color: #16a34a;
}

.action-tag--info {
  background: rgba(59, 130, 246, 0.1);
  color: #3b82f6;
}
</style>
