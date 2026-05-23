<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { listReviews, approveReview, rejectReview, batchReview, type ReviewItem } from '../api/review'
import ConfirmDialog from '../components/ConfirmDialog.vue'

const props = defineProps<{ pubId: number }>()

const reviews = ref<ReviewItem[]>([])
const loading = ref(true)
const activeTab = ref<'all' | 'pending' | 'approved' | 'rejected'>('pending')
const expandedId = ref<number | null>(null)

const showApproveConfirm = ref(false)
const approveTargetId = ref<number | null>(null)

const showRejectDialog = ref(false)
const rejectTargetId = ref<number | null>(null)
const rejectReason = ref('')

const selectedIds = ref<Set<number>>(new Set())

async function loadReviews() {
  loading.value = true
  try {
    const statusParam = activeTab.value === 'all' ? undefined : activeTab.value
    reviews.value = await listReviews(props.pubId, statusParam)
  } catch {
    reviews.value = []
  } finally {
    loading.value = false
  }
}

onMounted(loadReviews)

watch(activeTab, () => {
  expandedId.value = null
  selectedIds.value.clear()
  loadReviews()
})

const tabCounts = computed(() => ({
  all: reviews.value.length,
  pending: reviews.value.filter(r => r.status === 'pending').length,
  approved: reviews.value.filter(r => r.status === 'approved').length,
  rejected: reviews.value.filter(r => r.status === 'rejected').length,
}))

function toggleExpand(id: number) {
  expandedId.value = expandedId.value === id ? null : id
}

function requestApprove(id: number) {
  approveTargetId.value = id
  showApproveConfirm.value = true
}

function requestReject(id: number) {
  rejectTargetId.value = id
  rejectReason.value = ''
  showRejectDialog.value = true
}

async function confirmApprove() {
  if (approveTargetId.value === null) return
  try {
    await approveReview(props.pubId, approveTargetId.value)
    showApproveConfirm.value = false
    approveTargetId.value = null
    await loadReviews()
  } catch {
    // error
  }
}

async function confirmReject() {
  if (rejectTargetId.value === null || !rejectReason.value.trim()) return
  try {
    await rejectReview(props.pubId, rejectTargetId.value, rejectReason.value.trim())
    showRejectDialog.value = false
    rejectTargetId.value = null
    rejectReason.value = ''
    await loadReviews()
  } catch {
    // error
  }
}

function toggleSelect(id: number) {
  const s = new Set(selectedIds.value)
  if (s.has(id)) s.delete(id)
  else s.add(id)
  selectedIds.value = s
}

function selectAll() {
  const pending = reviews.value.filter(r => r.status === 'pending')
  if (selectedIds.value.size === pending.length) {
    selectedIds.value.clear()
  } else {
    selectedIds.value = new Set(pending.map(r => r.id))
  }
}

async function handleBatch(action: 'approve' | 'reject') {
  const ids = Array.from(selectedIds.value)
  if (ids.length === 0) return
  try {
    const reason = action === 'reject' ? '批量拒绝' : undefined
    await batchReview(props.pubId, ids, action, reason)
    selectedIds.value.clear()
    await loadReviews()
  } catch {
    // error
  }
}

function statusLabel(s: string) {
  if (s === 'pending') return '待审批'
  if (s === 'approved') return '已通过'
  if (s === 'rejected') return '已拒绝'
  return s
}

function fieldLabel(f: string) {
  const map: Record<string, string> = {
    name: '姓名', gender: '性别', birth: '出生', death: '逝世',
    deceased: '在世状态', note: '注记', avatar: '头像',
  }
  return map[f] || f
}

function formatTime(t: string | null) {
  if (!t) return ''
  const d = new Date(t)
  return d.toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })
}
</script>

<template>
  <div class="admin-reviews-root">
    <div class="admin-reviews-view">
      <header class="poetic-header">
        <div class="poetic-header__main">
          <div class="poetic-eyebrow">族谱管理</div>
          <h1 class="poetic-title">审批中心</h1>
        </div>
        <div v-if="selectedIds.size > 0" class="batch-actions">
          <span class="selected-count">已选 {{ selectedIds.size }} 条</span>
          <button class="bento-btn small success" @click="handleBatch('approve')">批量通过</button>
          <button class="bento-btn small warning" @click="handleBatch('reject')">批量拒绝</button>
        </div>
      </header>

      <!-- Tabs -->
      <div class="glass-tabs">
        <button
          v-for="tab in (['all', 'pending', 'approved', 'rejected'] as const)"
          :key="tab"
          class="glass-tab"
          :class="{ 'is-active': activeTab === tab }"
          @click="activeTab = tab"
        >
          {{ statusLabel(tab === 'all' ? 'all' : tab) }}
          <span class="tab-count">{{ tabCounts[tab] }}</span>
        </button>
      </div>

      <!-- Loading -->
      <div v-if="loading" class="loading-state">
        <div class="spinner"></div>
      </div>

      <!-- Empty -->
      <div v-else-if="reviews.length === 0" class="empty-state">
        <p>{{ activeTab === 'pending' ? '暂无待审批的修改' : '暂无记录' }}</p>
      </div>

      <!-- Review List -->
      <div v-else class="review-list">
        <div
          v-for="item in reviews"
          :key="item.id"
          class="review-item"
          :class="{ 'is-expanded': expandedId === item.id, 'is-pending': item.status === 'pending' }"
        >
          <!-- Row header -->
          <div class="review-row" @click="toggleExpand(item.id)">
            <div class="review-checkbox" v-if="item.status === 'pending'" @click.stop>
              <input
                type="checkbox"
                :checked="selectedIds.has(item.id)"
                @change="toggleSelect(item.id)"
              />
            </div>
            <div class="review-info">
              <span class="person-name">{{ item.personName }}</span>
              <span class="field-tag">{{ fieldLabel(item.fieldName) }}</span>
              <span class="submitter">由 {{ item.submitterName }} 提交</span>
            </div>
            <div class="review-meta">
              <span class="badge" :class="item.status">{{ statusLabel(item.status) }}</span>
              <span class="time">{{ formatTime(item.createdAt) }}</span>
            </div>
          </div>

          <!-- Expanded detail -->
          <transition name="expand">
            <div v-if="expandedId === item.id" class="review-detail">
              <div class="diff-view">
                <div class="diff-old">
                  <div class="diff-label">旧值</div>
                  <div class="diff-value">{{ item.oldValue || '(空)' }}</div>
                </div>
                <div class="diff-arrow">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
                </div>
                <div class="diff-new">
                  <div class="diff-label">新值</div>
                  <div class="diff-value">{{ item.newValue || '(空)' }}</div>
                </div>
              </div>

              <div v-if="item.status === 'rejected' && item.rejectReason" class="reject-reason">
                <strong>拒绝原因：</strong>{{ item.rejectReason }}
              </div>

              <div v-if="item.status === 'pending'" class="detail-actions">
                <button class="bento-btn success" @click="requestApprove(item.id)">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><polyline points="20 6 9 17 4 12"/></svg>
                  通过
                </button>
                <button class="bento-btn warning" @click="requestReject(item.id)">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                  拒绝
                </button>
              </div>
            </div>
          </transition>
        </div>

        <!-- Select all (pending tab only) -->
        <div v-if="activeTab === 'pending' || activeTab === 'all'" class="select-all-row">
          <button class="bento-btn small" @click="selectAll">
            {{ selectedIds.size === reviews.filter(r => r.status === 'pending').length && selectedIds.size > 0 ? '取消全选' : '全选待审批' }}
          </button>
        </div>
      </div>

      <!-- Approve Confirm -->
      <ConfirmDialog
        :modelValue="showApproveConfirm"
        title="确认通过"
        message="通过后修改将立即生效，写入人物数据。"
        confirmLabel="确认通过"
        tone="default"
        @confirm="confirmApprove"
        @cancel="showApproveConfirm = false"
        @update:model-value="(v: boolean) => { if (!v) showApproveConfirm = false }"
      />

      <!-- Reject Dialog -->
      <ConfirmDialog
        :modelValue="showRejectDialog"
        title="拒绝修改"
        :message="rejectReason.trim() ? `拒绝原因：${rejectReason}` : '请填写拒绝原因（必填）'"
        confirmLabel="确认拒绝"
        tone="danger"
        @confirm="confirmReject"
        @cancel="showRejectDialog = false"
        @update:model-value="(v: boolean) => { if (!v) showRejectDialog = false }"
      />
      <div v-if="showRejectDialog" class="reject-input-overlay" @click.self="showRejectDialog = false">
        <div class="reject-input-card">
          <h3>填写拒绝原因</h3>
          <textarea v-model="rejectReason" rows="3" placeholder="请说明拒绝理由，将反馈给提交人..." autofocus></textarea>
          <div class="reject-input-actions">
            <button class="bento-btn" @click="showRejectDialog = false">取消</button>
            <button class="bento-btn warning" :disabled="!rejectReason.trim()" @click="confirmReject">确认拒绝</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.admin-reviews-root {
  width: 100%;
  min-height: 100%;
  padding: 2rem;
  box-sizing: border-box;
}
.admin-reviews-view {
  max-width: 900px;
  margin: 0 auto;
}
.batch-actions {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}
.selected-count {
  font-size: 0.85rem;
  opacity: 0.6;
  margin-right: 0.25rem;
}
.glass-tabs {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 1.5rem;
  flex-wrap: wrap;
}
.glass-tab {
  padding: 0.5rem 1rem;
  border: 1px solid var(--border, rgba(0,0,0,0.08));
  border-radius: 9999px;
  background: var(--surface, #fff);
  color: var(--text, #1a1a1a);
  font-size: 0.85rem;
  font-weight: 500;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.4rem;
  transition: all 0.15s;
}
.glass-tab:hover {
  background: var(--surface-hover, #f5f5f5);
}
.glass-tab.is-active {
  background: var(--accent, #6366f1);
  color: #fff;
  border-color: transparent;
}
.tab-count {
  font-size: 0.75rem;
  opacity: 0.7;
}
.review-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}
.review-item {
  background: var(--surface, #fff);
  border: 1px solid var(--border, rgba(0,0,0,0.08));
  border-radius: 12px;
  overflow: hidden;
  transition: all 0.15s;
}
.review-item:hover {
  border-color: var(--border-hover, rgba(0,0,0,0.15));
}
.review-row {
  display: flex;
  align-items: center;
  padding: 0.75rem 1rem;
  cursor: pointer;
  gap: 0.75rem;
}
.review-checkbox {
  flex-shrink: 0;
}
.review-checkbox input {
  width: 16px;
  height: 16px;
}
.review-info {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 0.6rem;
  flex-wrap: wrap;
}
.person-name {
  font-weight: 500;
  font-size: 0.9rem;
}
.field-tag {
  font-size: 0.75rem;
  padding: 0.1rem 0.5rem;
  background: var(--surface-alt, rgba(0,0,0,0.04));
  border-radius: 9999px;
  opacity: 0.7;
}
.submitter {
  font-size: 0.8rem;
  opacity: 0.5;
}
.review-meta {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex-shrink: 0;
}
.badge {
  font-size: 0.75rem;
  padding: 0.15rem 0.5rem;
  border-radius: 9999px;
  font-weight: 500;
}
.badge.pending {
  background: #fef3c7;
  color: #92400e;
}
.badge.approved {
  background: #dcfce7;
  color: #166534;
}
.badge.rejected {
  background: #fee2e2;
  color: #991b1b;
}
.time {
  font-size: 0.8rem;
  opacity: 0.5;
}
.review-detail {
  padding: 0 1rem 1rem;
  border-top: 1px solid var(--border, rgba(0,0,0,0.06));
}
.diff-view {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 0.75rem 0;
}
.diff-old, .diff-new {
  flex: 1;
  padding: 0.75rem;
  border-radius: 8px;
  font-size: 0.85rem;
}
.diff-old {
  background: #fee2e2;
  border: 1px solid #fca5a5;
}
.diff-new {
  background: #dcfce7;
  border: 1px solid #86efac;
}
.diff-label {
  font-size: 0.7rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  opacity: 0.6;
  margin-bottom: 0.25rem;
}
.diff-value {
  word-break: break-all;
}
.diff-arrow {
  flex-shrink: 0;
  opacity: 0.4;
}
.reject-reason {
  margin-top: 0.5rem;
  padding: 0.5rem 0.75rem;
  background: #fef2f2;
  border-radius: 8px;
  font-size: 0.85rem;
  color: #991b1b;
}
.detail-actions {
  display: flex;
  gap: 0.5rem;
  margin-top: 0.75rem;
}
.select-all-row {
  padding: 0.75rem 0;
  display: flex;
  justify-content: center;
}
.bento-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.6rem 1.2rem;
  border: 1px solid var(--border, rgba(0,0,0,0.1));
  border-radius: 10px;
  background: var(--surface, #fff);
  color: var(--text, #1a1a1a);
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s;
}
.bento-btn:hover { background: var(--surface-hover, #f5f5f5); }
.bento-btn:disabled { opacity: 0.4; cursor: not-allowed; }
.bento-btn.small {
  padding: 0.35rem 0.75rem;
  font-size: 0.8rem;
}
.bento-btn.success {
  color: #15803d;
  border-color: #4ade80;
  background: #dcfce7;
}
.bento-btn.warning {
  color: #b45309;
  border-color: #fbbf24;
  background: #fef3c7;
}
.reject-input-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}
.reject-input-card {
  background: var(--surface, #fff);
  border-radius: 16px;
  padding: 1.5rem;
  width: 90%;
  max-width: 420px;
  box-shadow: var(--shadow-whisper);
}
.reject-input-card h3 {
  margin: 0 0 1rem;
  font-size: 1.1rem;
}
.reject-input-card textarea {
  width: 100%;
  padding: 0.75rem;
  border: 1px solid var(--border, rgba(0,0,0,0.12));
  border-radius: 8px;
  font-family: inherit;
  font-size: 0.9rem;
  resize: vertical;
  box-sizing: border-box;
}
.reject-input-actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
  margin-top: 1rem;
}
.empty-state {
  text-align: center;
  padding: 3rem;
  opacity: 0.5;
}
.loading-state {
  display: flex;
  justify-content: center;
  padding: 3rem;
}
.spinner {
  width: 24px;
  height: 24px;
  border: 3px solid var(--border, rgba(0,0,0,0.1));
  border-top-color: var(--accent, #6366f1);
  border-radius: 50%;
  animation: spin 0.6s linear infinite;
}
@keyframes spin {
  to { transform: rotate(360deg); }
}
.expand-enter-active,
.expand-leave-active {
  transition: all 0.2s ease;
}
.expand-enter-from,
.expand-leave-to {
  opacity: 0;
  max-height: 0;
  overflow: hidden;
}
</style>

