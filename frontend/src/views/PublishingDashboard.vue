<script setup lang="ts">
import { ref, onMounted, computed } from "vue"
import { useRouter } from "vue-router"
import { listDrafts, createDraft, deleteDraft } from "../api/publishing"
import { getPublication } from "../api/publication"
import type { BookDraft } from "../types/publishing"
import { useFeedback } from '../composables/useFeedback'
import FeedbackStrip from '../components/FeedbackStrip.vue'

const props = defineProps<{
  publicationId?: number
}>()

const router = useRouter()
const feedback = useFeedback()
const drafts = ref<BookDraft[]>([])
const loading = ref(false)
const showCreateDialog = ref(false)
const newDraftTitle = ref("")
const pubTitle = ref("")

const effectivePublicationId = computed(() => props.publicationId ?? null)

// --- search & sort ---
const searchQuery = ref("")
const sortBy = ref<"newest" | "oldest" | "name">("newest")

const filteredDrafts = computed(() => {
  let list = [...drafts.value]
  if (searchQuery.value.trim()) {
    const q = searchQuery.value.trim().toLowerCase()
    list = list.filter(d => d.title.toLowerCase().includes(q))
  }
  switch (sortBy.value) {
    case "oldest":
      list.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
      break
    case "name":
      list.sort((a, b) => a.title.localeCompare(b.title, "zh-CN"))
      break
    case "newest":
    default:
      list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      break
  }
  return list
})

async function loadDrafts() {
  const pid = effectivePublicationId.value
  if (pid == null) return
  loading.value = true
  try {
    drafts.value = await listDrafts(pid)
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "加载草稿列表失败"
    feedback.errorMessage.value = msg
  } finally {
    loading.value = false
  }
}

async function handleCreate() {
  const title = newDraftTitle.value.trim()
  const pid = effectivePublicationId.value
  if (!title || pid == null) return
  try {
    const draft = await createDraft({
      publicationId: pid,
      title,
      subtitle: "",
    })
    showCreateDialog.value = false
    newDraftTitle.value = ""
    router.push('/publishing/' + draft.id)
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "创建草稿失败"
    feedback.errorMessage.value = msg
  }
}

async function handleDelete(draft: BookDraft) {
  if (!confirm('确定要删除草稿「' + draft.title + '」吗？此操作不可撤销。')) return
  try {
    await deleteDraft(draft.id)
    await loadDrafts()
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "删除草稿失败"
    feedback.errorMessage.value = msg
  }
}

function handleBack() {
  const pid = effectivePublicationId.value
  if (pid != null) {
    router.push('/publication/' + pid)
  } else {
    router.push('/dashboard/publications')
  }
}

onMounted(async () => {
  const pid = effectivePublicationId.value
  if (pid == null) {
    router.push('/dashboard/publications')
    return
  }
  try {
    const pub = await getPublication(pid)
    pubTitle.value = pub.publication?.title || '族谱 #' + pid
  } catch {}
  await loadDrafts()
})
</script>

<script lang="ts">
export function statusLabel(status: string): string {
  const map: Record<string, string> = { draft: '草稿', review: '审校', final: '定稿' }
  return map[status] || status
}

export function formatTime(iso: string): string {
  if (!iso) return ""
  const d = new Date(iso)
  const now = new Date()
  const diff = now.getTime() - d.getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return '刚刚'
  if (mins < 60) return mins + ' 分钟前'
  const hours = Math.floor(mins / 60)
  if (hours < 24) return hours + ' 小时前'
  const days = Math.floor(hours / 24)
  if (days < 7) return days + ' 天前'
  return d.toLocaleDateString("zh-CN")
}
</script>

<template>
  <FeedbackStrip :errorMessage="feedback.errorMessage.value" :statusMessage="feedback.statusMessage.value" @dismiss="feedback.dismiss" />
  <div class="publishing-dashboard">
    <header class="dashboard-header">
      <div class="header-top">
        <button class="btn-back-dashboard" @click="handleBack">← 返回画布</button>
        <h1 class="dashboard-title">出版工作室 · {{ pubTitle || '加载中...' }}</h1>
      </div>
      <div class="header-actions">
        <div class="search-box">
          <svg class="search-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <input
            v-model="searchQuery"
            type="text"
            class="search-input"
            placeholder="搜索草稿..."
          />
        </div>
        <select v-model="sortBy" class="sort-select">
          <option value="newest">最新优先</option>
          <option value="oldest">最旧优先</option>
          <option value="name">按名称</option>
        </select>
        <button class="btn-create" :disabled="effectivePublicationId == null" @click="showCreateDialog = true">+ 新建草稿</button>
      </div>
    </header>

    <div v-if="loading" class="dashboard-state">
      <p>加载中...</p>
    </div>

    <div v-else-if="effectivePublicationId == null" class="dashboard-state dashboard-empty">
      <p>未指定族谱</p>
      <p class="empty-hint">请从族谱管理页面进入</p>
    </div>

    <div v-else-if="drafts.length === 0" class="dashboard-state dashboard-empty">
      <div class="empty-icon">📜</div>
      <p class="empty-title">还没有出版草稿</p>
      <p class="empty-hint">创建您的第一本草稿，开始编排家族世系录</p>
      <button class="btn-create btn-create--large" @click="showCreateDialog = true">+ 新建第一本草稿</button>
    </div>

    <div v-else-if="filteredDrafts.length === 0 && searchQuery.trim()" class="dashboard-state dashboard-empty">
      <p>没有匹配「{{ searchQuery }}」的草稿</p>
      <button class="btn-back-dashboard" style="margin-top:12px" @click="searchQuery = ''">清除搜索</button>
    </div>

    <div v-else class="draft-grid">
      <div
        v-for="draft in filteredDrafts"
        :key="draft.id"
        class="draft-card"
        @click="router.push('/publishing/' + draft.id)"
      >
        <div class="card-head">
          <span :class="['meta-badge', 'meta-badge--' + draft.status]">{{ statusLabel(draft.status) }}</span>
          <span class="card-version">v{{ draft.version }}</span>
        </div>
        <div class="card-body">
          <h3 class="card-title">{{ draft.title }}</h3>
          <p v-if="draft.subtitle" class="card-subtitle">{{ draft.subtitle }}</p>
          <div class="card-meta">
            <span>{{ draft.sheetCount }} 页</span>
            <span class="meta-dot">·</span>
            <span>{{ formatTime(draft.updatedAt) }}编辑</span>
          </div>
        </div>
        <div class="card-actions" @click.stop>
          <button class="btn-edit" @click="router.push('/publishing/' + draft.id)">编辑</button>
          <button class="btn-delete" @click="handleDelete(draft)">删除</button>
        </div>
      </div>
    </div>
  </div>

  <div v-if="showCreateDialog" class="dialog-overlay" @click.self="showCreateDialog = false">
    <div class="dialog-box">
      <h3 class="dialog-title">新建草稿</h3>
      <label class="dialog-label">标题</label>
      <input
        v-model="newDraftTitle"
        class="dialog-input"
        placeholder="如：《归源堂族谱·第一卷》"
        @keyup.enter="handleCreate"
      />
      <div class="dialog-actions">
        <button class="btn-cancel" @click="showCreateDialog = false">取消</button>
        <button class="btn-confirm" @click="handleCreate">创建</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.publishing-dashboard {
  max-width: 1120px;
  margin: 0 auto;
  padding: 32px 36px 36px;
}

.dashboard-header {
  padding: 20px 24px;
  margin-bottom: 28px;
  background: var(--color-neutral-1);
  border: 1px solid var(--color-card-stroke);
  border-radius: var(--radius-xl);
  box-shadow: var(--shadow-whisper);
  backdrop-filter: blur(18px) saturate(120%);
  -webkit-backdrop-filter: blur(18px) saturate(120%);
}

.header-top {
  display: flex;
  align-items: baseline;
  gap: 16px;
  margin-bottom: 14px;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.dashboard-title {
  font-size: var(--text-title-20);
  font-weight: 500;
  color: var(--color-neutral-10);
}

.btn-back-dashboard {
  background: transparent;
  border: none;
  color: var(--color-accent);
  font-size: var(--text-label-12);
  cursor: pointer;
  padding: 4px 0;
  white-space: nowrap;
  transition: opacity var(--duration-fast) var(--ease-breath);
}

.btn-back-dashboard:hover {
  opacity: 0.8;
}

/* search */
.search-box {
  position: relative;
  flex: 1;
  min-width: 180px;
  max-width: 280px;
}

.search-icon {
  position: absolute;
  left: 12px;
  top: 50%;
  transform: translateY(-50%);
  color: var(--color-neutral-5);
  pointer-events: none;
}

.search-input {
  width: 100%;
  padding: 9px 12px 9px 34px;
  border: 1px solid var(--color-card-stroke);
  border-radius: var(--radius-md);
  background: var(--color-neutral-1);
  color: var(--color-neutral-9);
  font-size: var(--text-label-12);
  outline: none;
  transition: border-color var(--duration-fast) var(--ease-breath),
              box-shadow var(--duration-fast) var(--ease-breath);
}

.search-input:focus {
  border-color: var(--color-accent);
  box-shadow: 0 0 0 3px var(--color-accent-muted);
}

.search-input::placeholder {
  color: var(--color-neutral-5);
}

/* sort */
.sort-select {
  padding: 9px 12px;
  border: 1px solid var(--color-card-stroke);
  border-radius: var(--radius-md);
  background: var(--color-neutral-1);
  color: var(--color-neutral-7);
  font-size: var(--text-label-12);
  outline: none;
  cursor: pointer;
  appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6'%3E%3Cpath d='M0 0l5 6 5-6z' fill='%23787670'/%3E%3C%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 10px center;
  padding-right: 28px;
}

.sort-select:focus {
  border-color: var(--color-accent);
  box-shadow: 0 0 0 3px var(--color-accent-muted);
}

.btn-create {
  padding: 10px 20px;
  background: var(--color-accent);
  color: #fff;
  border: none;
  border-radius: var(--radius-lg);
  font-size: var(--text-label-12);
  font-weight: 500;
  cursor: pointer;
  box-shadow: var(--shadow-whisper);
  transition: transform var(--duration-fast) var(--ease-breath),
              box-shadow var(--duration-fast) var(--ease-breath);
  white-space: nowrap;
}

.btn-create:hover {
  transform: translateY(-1px);
  box-shadow: 0 12px 28px rgba(196, 58, 49, 0.18);
}

.btn-create:disabled {
  opacity: 0.4;
  cursor: not-allowed;
  transform: none;
  box-shadow: none;
}

.btn-create--large {
  margin-top: 20px;
  padding: 12px 28px;
  font-size: 14px;
}

/* states */
.dashboard-state {
  text-align: center;
  padding: 88px 0;
  color: var(--color-neutral-7);
}

.dashboard-empty .empty-icon {
  font-size: 48px;
  margin-bottom: 12px;
  opacity: 0.86;
}

.empty-title {
  font-size: var(--text-title-18);
  color: var(--color-neutral-9);
  margin-bottom: 6px;
}

.empty-hint {
  font-size: 13px;
  color: var(--color-neutral-5);
  margin-top: 6px;
}

/* grid & cards */
.draft-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 14px;
}

.draft-card {
  display: flex;
  flex-direction: column;
  gap: 14px;
  background: var(--color-neutral-1);
  border: 1px solid var(--color-card-stroke);
  border-radius: var(--radius-xl);
  padding: 18px 18px 16px;
  box-shadow: var(--shadow-whisper);
  cursor: pointer;
  transition: transform var(--duration-fast) var(--ease-breath),
              box-shadow var(--duration-fast) var(--ease-breath),
              border-color var(--duration-fast) var(--ease-breath);
}

.draft-card:hover {
  transform: translateY(-2px);
  border-color: rgba(196, 58, 49, 0.18);
  box-shadow: 0 14px 32px rgba(36, 35, 31, 0.08);
}

.card-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 4px;
}

.card-body {
  flex: 1;
}

.card-title {
  font-size: 16px;
  font-weight: 500;
  color: var(--color-neutral-9);
  margin: 0 0 4px;
}

.card-subtitle {
  font-size: 13px;
  color: var(--color-neutral-6);
  margin: 0 0 10px;
}

.card-version {
  font-size: 11px;
  color: var(--color-neutral-5);
}

.card-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  align-items: center;
  font-size: 12px;
  color: var(--color-neutral-6);
}

.meta-dot {
  color: var(--color-neutral-5);
}

.meta-badge {
  display: inline-flex;
  align-items: center;
  padding: 3px 8px;
  border-radius: 999px;
  font-size: 11px;
  background: var(--color-warning-muted, rgba(168,122,61,0.1));
  color: var(--color-warning);
}

.meta-badge--draft {
  background: rgba(168, 122, 61, 0.1);
  color: var(--color-warning);
}

.meta-badge--review {
  background: var(--color-accent-muted);
  color: var(--color-accent);
}

.meta-badge--final {
  background: var(--color-accent);
  color: #fff;
}

.card-actions {
  display: flex;
  gap: 8px;
  justify-content: flex-end;
  flex-shrink: 0;
}

.btn-edit {
  padding: 8px 14px;
  background: var(--color-accent);
  color: #fff;
  border: none;
  border-radius: var(--radius-md);
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: opacity var(--duration-fast) var(--ease-breath);
}

.btn-edit:hover {
  opacity: 0.9;
}

.btn-delete {
  padding: 8px 14px;
  background: transparent;
  color: var(--color-neutral-7);
  border: 1px solid var(--color-card-stroke);
  border-radius: var(--radius-md);
  font-size: 13px;
  cursor: pointer;
  transition: all var(--duration-fast) var(--ease-breath);
}

.btn-delete:hover {
  color: var(--color-accent);
  border-color: var(--color-accent);
  background: var(--color-accent-muted);
}

/* dialog */
.dialog-overlay {
  position: fixed;
  inset: 0;
  background: rgba(36, 35, 31, 0.25);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
  backdrop-filter: blur(8px) saturate(120%);
  -webkit-backdrop-filter: blur(8px) saturate(120%);
}

.dialog-box {
  background: var(--color-neutral-1);
  border: 1px solid var(--color-card-stroke);
  border-radius: var(--radius-xl);
  padding: 26px 28px;
  width: min(420px, calc(100vw - 32px));
  box-shadow: 0 24px 48px rgba(36, 35, 31, 0.12);
  backdrop-filter: blur(24px) saturate(140%);
  -webkit-backdrop-filter: blur(24px) saturate(140%);
}

.dialog-title {
  font-size: 18px;
  font-weight: 500;
  color: var(--color-neutral-10);
  margin: 0 0 18px;
}

.dialog-label {
  display: block;
  font-size: 13px;
  color: var(--color-neutral-6);
  margin-bottom: 6px;
}

.dialog-input {
  width: 100%;
  padding: 11px 12px;
  border: 1px solid var(--color-card-stroke);
  border-radius: var(--radius-lg);
  font-size: 14px;
  outline: none;
  box-sizing: border-box;
  background: var(--color-neutral-1);
  color: var(--color-neutral-9);
}

.dialog-input:focus {
  border-color: var(--color-accent);
  box-shadow: 0 0 0 3px var(--color-accent-muted);
}

.dialog-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 22px;
}

.btn-cancel {
  padding: 8px 16px;
  background: transparent;
  color: var(--color-neutral-7);
  border: 1px solid var(--color-card-stroke);
  border-radius: var(--radius-md);
  font-size: 14px;
  cursor: pointer;
}

.btn-confirm {
  padding: 8px 16px;
  background: var(--color-accent);
  color: #fff;
  border: none;
  border-radius: var(--radius-md);
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
}

.btn-confirm:hover,
.btn-cancel:hover {
  transform: translateY(-1px);
}

@media (max-width: 720px) {
  .publishing-dashboard {
    padding: 20px 16px 28px;
  }

  .header-top {
    flex-direction: column;
    gap: 8px;
  }

  .header-actions {
    flex-direction: column;
    align-items: stretch;
  }

  .search-box {
    max-width: none;
  }

  .sort-select {
    width: 100%;
  }

  .btn-create,
  .btn-create--large {
    width: 100%;
  }

  .btn-back-dashboard {
    align-self: flex-start;
  }

  .draft-card {
    gap: 14px;
  }

  .card-actions {
    justify-content: stretch;
  }

  .card-actions > button {
    flex: 1;
  }
}
</style>
