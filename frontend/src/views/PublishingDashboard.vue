<script setup lang="ts">
import { ref, onMounted } from "vue"
import { useRouter } from "vue-router"
import { listDrafts, createDraft, deleteDraft } from "../api/publishing"
import type { BookDraft } from "../types/publishing"
import { useFeedback } from '../composables/useFeedback'
import FeedbackStrip from '../components/FeedbackStrip.vue'

const router = useRouter()
const feedback = useFeedback()
const drafts = ref<BookDraft[]>([])
const loading = ref(false)
const showCreateDialog = ref(false)
const newDraftTitle = ref("")
const selectedPublicationId = ref(1)

async function loadDrafts() {
  loading.value = true
  try {
    drafts.value = await listDrafts(selectedPublicationId.value)
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "加载草稿列表失败"
    feedback.errorMessage.value = msg
  } finally {
    loading.value = false
  }
}

async function handleCreate() {
  const title = newDraftTitle.value.trim()
  if (!title) return
  try {
    const draft = await createDraft({
      publicationId: selectedPublicationId.value,
      title,
      subtitle: "",
    })
    showCreateDialog.value = false
    newDraftTitle.value = ""
    router.push(`/publishing/${draft.id}`)
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "创建草稿失败"
    feedback.errorMessage.value = msg
  }
}

async function handleDelete(draft: BookDraft) {
  if (!confirm(`确定要删除草稿「${draft.title}」吗？此操作不可撤销。`)) return
  try {
    await deleteDraft(draft.id)
    await loadDrafts()
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "删除草稿失败"
    feedback.errorMessage.value = msg
  }
}

onMounted(() => {
  loadDrafts()
})
</script>

<script lang="ts">
export function statusLabel(status: string): string {
  const map: Record<string, string> = { draft: "草稿", review: "审校", final: "定稿" }
  return map[status] || status
}

export function formatTime(iso: string): string {
  if (!iso) return ""
  const d = new Date(iso)
  const now = new Date()
  const diff = now.getTime() - d.getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return "刚刚"
  if (mins < 60) return `${mins} 分钟前`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours} 小时前`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days} 天前`
  return d.toLocaleDateString("zh-CN")
}
</script>

<template>
  <FeedbackStrip :errorMessage="feedback.errorMessage.value" :statusMessage="feedback.statusMessage.value" @dismiss="feedback.dismiss" />
  <div class="publishing-dashboard">
    <header class="dashboard-header">
      <h1 class="dashboard-title">出版工作室</h1>
      <button class="btn-create" @click="showCreateDialog = true">+ 新建草稿</button>
    </header>

    <div v-if="loading" class="dashboard-state">
      <p>加载中…</p>
    </div>

    <div v-else-if="drafts.length === 0" class="dashboard-state dashboard-empty">
      <div class="empty-icon">📖</div>
      <p>还没有出版草稿</p>
      <p class="empty-hint">点击「新建草稿」开始编排您的第一本族谱</p>
    </div>

    <div v-else class="draft-grid">
      <div
        v-for="draft in drafts"
        :key="draft.id"
        class="draft-card"
      >
        <div class="card-body">
          <h3 class="card-title">{{ draft.title }}</h3>
          <p v-if="draft.subtitle" class="card-subtitle">{{ draft.subtitle }}</p>
          <div class="card-meta">
            <span class="meta-badge">{{ statusLabel(draft.status) }}</span>
            <span>{{ draft.sheetCount }} 页</span>
            <span>v{{ draft.version }}</span>
          </div>
          <p class="card-time">{{ formatTime(draft.updatedAt) }}</p>
        </div>
        <div class="card-actions">
          <button
            class="btn-edit"
            @click="router.push(`/publishing/${draft.id}`)"
          >
            继续编辑
          </button>
          <button class="btn-delete" @click="handleDelete(draft)">删除</button>
        </div>
      </div>
    </div>

    <!-- Create Dialog -->
    <div v-if="showCreateDialog" class="dialog-overlay" @click.self="showCreateDialog = false">
      <div class="dialog-box">
        <h3 class="dialog-title">新建出版草稿</h3>
        <label class="dialog-label">草稿标题</label>
        <input
          v-model="newDraftTitle"
          type="text"
          class="dialog-input"
          placeholder="输入草稿标题…"
          @keyup.enter="handleCreate"
        />
        <div class="dialog-actions">
          <button class="btn-cancel" @click="showCreateDialog = false">取消</button>
          <button class="btn-confirm" @click="handleCreate">创建</button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.publishing-dashboard {
  max-width: 900px;
  margin: 0 auto;
  padding: 32px 24px;
  min-height: 100vh;
  background: #faf7f2;
}

.dashboard-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 32px;
}

.dashboard-title {
  font-size: 24px;
  font-weight: 500;
  color: #c43a31;
  margin: 0;
}

.btn-create {
  padding: 10px 24px;
  background: #c43a31;
  color: #fff;
  border: none;
  border-radius: 6px;
  font-size: 14px;
  cursor: pointer;
  transition: background 0.2s;
}
.btn-create:hover {
  background: #a8322a;
}

.dashboard-state {
  text-align: center;
  padding: 80px 0;
  color: #999;
}

.dashboard-empty .empty-icon {
  font-size: 48px;
  margin-bottom: 12px;
}
.empty-hint {
  font-size: 13px;
  color: #bbb;
  margin-top: 4px;
}

.draft-grid {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.draft-card {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: #fffdf8;
  border: 1px solid #e8e0d5;
  border-radius: 8px;
  padding: 16px 20px;
  transition: box-shadow 0.2s;
}
.draft-card:hover {
  box-shadow: 0 2px 8px rgba(196, 58, 49, 0.08);
}

.card-title {
  font-size: 16px;
  font-weight: 500;
  color: #333;
  margin: 0 0 4px;
}

.card-subtitle {
  font-size: 13px;
  color: #888;
  margin: 0 0 8px;
}

.card-meta {
  display: flex;
  gap: 12px;
  align-items: center;
  font-size: 12px;
  color: #999;
}

.meta-badge {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 11px;
  background: #fef3c7;
  color: #b45309;
}

.card-time {
  font-size: 11px;
  color: #bbb;
  margin: 8px 0 0;
}

.card-actions {
  display: flex;
  gap: 8px;
  flex-shrink: 0;
}

.btn-edit {
  padding: 6px 16px;
  background: #c43a31;
  color: #fff;
  border: none;
  border-radius: 4px;
  font-size: 13px;
  cursor: pointer;
}
.btn-edit:hover {
  background: #a8322a;
}

.btn-delete {
  padding: 6px 16px;
  background: transparent;
  color: #999;
  border: 1px solid #e0d8cc;
  border-radius: 4px;
  font-size: 13px;
  cursor: pointer;
}
.btn-delete:hover {
  color: #c43a31;
  border-color: #c43a31;
}

/* Dialog */
.dialog-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.3);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
}

.dialog-box {
  background: #fffdf8;
  border-radius: 10px;
  padding: 28px 32px;
  width: 400px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.12);
}

.dialog-title {
  font-size: 18px;
  font-weight: 500;
  color: #333;
  margin: 0 0 20px;
}

.dialog-label {
  display: block;
  font-size: 13px;
  color: #666;
  margin-bottom: 6px;
}

.dialog-input {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid #e8e0d5;
  border-radius: 6px;
  font-size: 14px;
  outline: none;
  box-sizing: border-box;
}
.dialog-input:focus {
  border-color: #c43a31;
}

.dialog-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 24px;
}

.btn-cancel {
  padding: 8px 20px;
  background: transparent;
  color: #666;
  border: 1px solid #e0d8cc;
  border-radius: 6px;
  font-size: 14px;
  cursor: pointer;
}

.btn-confirm {
  padding: 8px 20px;
  background: #c43a31;
  color: #fff;
  border: none;
  border-radius: 6px;
  font-size: 14px;
  cursor: pointer;
}
.btn-confirm:hover {
  background: #a8322a;
}
</style>

