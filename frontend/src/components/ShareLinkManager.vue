<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import ConfirmDialog from './ConfirmDialog.vue'
import {
  createShareLink,
  listShareLinks,
  revokeShareLink,
  type ShareLinkSummary,
} from '../api/shareManage'

const props = defineProps<{
  publicationId: number
}>()

const links = ref<ShareLinkSummary[]>([])
const loading = ref(false)
const creating = ref(false)
const error = ref<string | null>(null)

// Create form
const showCreateForm = ref(false)
const allowExport = ref(false)
const expiresInDays = ref(30)
const pendingRevokeLinkId = ref<number | null>(null)

// Newly created token (shown once)
const newToken = ref<string | null>(null)
const newTokenCopied = ref(false)
const newShareUrl = computed(() => newToken.value ? `${window.location.origin}/share/${newToken.value}` : '')

async function load() {
  loading.value = true
  error.value = null
  try {
    links.value = await listShareLinks(props.publicationId)
  } catch (err: any) {
    error.value = err.message || '加载失败'
  } finally {
    loading.value = false
  }
}

async function handleCreate() {
  creating.value = true
  error.value = null
  try {
    const result = await createShareLink(props.publicationId, {
      allowExport: allowExport.value,
      expiresInDays: expiresInDays.value,
    })
    newToken.value = result.token
    showCreateForm.value = false
    await load()
  } catch (err: any) {
    error.value = err.message || '创建失败'
  } finally {
    creating.value = false
  }
}

async function handleRevoke(linkId: number) {
  pendingRevokeLinkId.value = linkId
}

async function confirmRevoke() {
  const linkId = pendingRevokeLinkId.value
  if (linkId === null) return
  error.value = null
  try {
    await revokeShareLink(props.publicationId, linkId)
    await load()
  } catch (err: any) {
    error.value = err.message || '撤销失败'
  } finally {
    pendingRevokeLinkId.value = null
  }
}

function cancelRevoke() {
  pendingRevokeLinkId.value = null
}

function copyShareUrl() {
  if (!newToken.value) return
  const url = `${window.location.origin}/share/${newToken.value}`
  navigator.clipboard.writeText(url).then(() => {
    newTokenCopied.value = true
    setTimeout(() => { newTokenCopied.value = false }, 2000)
  })
}

function dismissNewToken() {
  newToken.value = null
  newTokenCopied.value = false
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '-'
  return new Date(dateStr).toLocaleString()
}

function statusLabel(link: ShareLinkSummary): string {
  if (link.status === 'REVOKED') return '已撤销'
  if (link.status === 'EXPIRED' || link.expired) return '已过期'
  return '有效'
}

function statusClass(link: ShareLinkSummary): string {
  if (link.status === 'REVOKED') return 'status-revoked'
  if (link.status === 'EXPIRED' || link.expired) return 'status-expired'
  return 'status-active'
}

onMounted(load)
</script>

<template>
  <div class="share-link-manager">
    <div class="manager-header">
      <h3>分享链接</h3>
      <button class="btn btn--sm btn--primary" @click="showCreateForm = !showCreateForm">
        {{ showCreateForm ? '取消' : '创建链接' }}
      </button>
    </div>

    <div v-if="error" class="error-msg">{{ error }}</div>

    <!-- New token display -->
    <div v-if="newToken" class="new-token-card">
      <div class="token-warning">此令牌仅显示一次，请立即复制保存。</div>
      <div class="token-url">
        <code>{{ newShareUrl }}</code>
      </div>
      <div class="token-actions">
        <button class="btn btn--sm btn--primary" @click="copyShareUrl">
          {{ newTokenCopied ? '已复制' : '复制链接' }}
        </button>
        <button class="btn btn--sm" @click="dismissNewToken">关闭</button>
      </div>
    </div>

    <!-- Create form -->
    <div v-if="showCreateForm" class="create-form">
      <label class="form-field">
        <input type="checkbox" v-model="allowExport" />
        <span>允许导出</span>
      </label>
      <label class="form-field">
        <span>有效期（天）</span>
        <input type="number" v-model.number="expiresInDays" min="1" max="365" />
      </label>
      <button class="btn btn--sm btn--primary" @click="handleCreate" :disabled="creating">
        {{ creating ? '创建中...' : '确认创建' }}
      </button>
    </div>

    <!-- Links list -->
    <div v-if="loading" class="loading">加载中...</div>
    <div v-else-if="links.length === 0" class="empty">暂无分享链接</div>
    <div v-else class="links-list">
      <div v-for="link in links" :key="link.id" class="link-item">
        <div class="link-info">
          <span :class="['status-badge', statusClass(link)]">{{ statusLabel(link) }}</span>
          <span class="link-meta">
            {{ link.allowExport ? '可导出' : '仅查看' }}
            · 创建于 {{ formatDate(link.createdAt) }}
            <template v-if="link.expiresAt"> · 有效期至 {{ formatDate(link.expiresAt) }}</template>
          </span>
        </div>
        <button
          v-if="link.status === 'ACTIVE' && !link.expired"
          class="btn btn--sm btn--danger"
          @click="handleRevoke(link.id)"
        >
          撤销
        </button>
      </div>
    </div>
    <ConfirmDialog
      :modelValue="pendingRevokeLinkId !== null"
      title="确定要撤销此分享链接吗"
      message="撤销后将无法恢复，原链接会立即失效。"
      confirmLabel="确认撤销"
      tone="danger"
      @confirm="confirmRevoke"
      @cancel="cancelRevoke"
      @update:modelValue="(v: boolean) => { if (!v) cancelRevoke() }"
    />
  </div>
</template>

<style scoped>
.share-link-manager {
  padding: 16px;
}

.manager-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
}

.manager-header h3 {
  margin: 0;
  font-size: 1rem;
}

.error-msg {
  padding: 8px 12px;
  margin-bottom: 12px;
  background: #fef2f2;
  color: #dc2626;
  border-radius: 8px;
  font-size: 0.875rem;
}

.new-token-card {
  padding: 16px;
  margin-bottom: 16px;
  background: #fffbeb;
  border: 1px solid #fbbf24;
  border-radius: 12px;
}

.token-warning {
  font-size: 0.875rem;
  font-weight: 600;
  color: #92400e;
  margin-bottom: 8px;
}

.token-url {
  padding: 8px 12px;
  background: rgba(0,0,0,0.04);
  border-radius: 8px;
  margin-bottom: 12px;
  word-break: break-all;
}

.token-url code {
  font-size: 0.8rem;
}

.token-actions {
  display: flex;
  gap: 8px;
}

.create-form {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  align-items: center;
  padding: 12px;
  margin-bottom: 16px;
  background: rgba(0,0,0,0.02);
  border-radius: 12px;
}

.form-field {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 0.875rem;
}

.form-field input[type="number"] {
  width: 60px;
  padding: 4px 8px;
  border: 1px solid #ddd;
  border-radius: 6px;
}

.loading, .empty {
  text-align: center;
  padding: 16px;
  color: #999;
  font-size: 0.875rem;
}

.links-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.link-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 12px;
  background: rgba(0,0,0,0.02);
  border-radius: 10px;
}

.link-info {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.status-badge {
  padding: 2px 8px;
  border-radius: 10px;
  font-size: 0.75rem;
  font-weight: 500;
}

.status-active {
  background: #dcfce7;
  color: #166534;
}

.status-revoked {
  background: #f3f4f6;
  color: #6b7280;
}

.status-expired {
  background: #fef3c7;
  color: #92400e;
}

.link-meta {
  font-size: 0.8rem;
  color: #666;
}

.btn {
  padding: 6px 14px;
  border: 1px solid #ddd;
  border-radius: 8px;
  background: #fff;
  cursor: pointer;
  font-size: 0.8rem;
}

.btn--sm {
  padding: 4px 10px;
  font-size: 0.75rem;
}

.btn--primary {
  background: #3b82f6;
  color: #fff;
  border-color: #3b82f6;
}

.btn--primary:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn--danger {
  background: #fff;
  color: #dc2626;
  border-color: #fca5a5;
}

.btn--danger:hover {
  background: #fef2f2;
}
</style>
