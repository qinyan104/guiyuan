<script setup lang="ts">
import type { PublicationSummary } from '../api/publication'

defineProps<{
  publication: PublicationSummary
  openingId: number | null
  deleteConfirmId: number | null
  deletingId: number | null
}>()

defineEmits<{
  (event: 'open', id: number): void
  (event: 'open-book-editor', id: number): void
  (event: 'open-activity', id: number): void
  (event: 'open-stats', id: number): void
  (event: 'edit', publication: PublicationSummary): void
  (event: 'open-collaborators', id: number): void
  (event: 'open-share', id: number): void
  (event: 'request-delete', id: number): void
  (event: 'confirm-delete', id: number): void
  (event: 'cancel-delete'): void
}>()

function getSurnameSeal(title: string): string {
  if (!title) return '谱'
  const clean = title.trim()
  const shiIndex = clean.indexOf('氏')
  if (shiIndex > 0) return clean.charAt(shiIndex - 1)
  const match = clean.match(/[\u4e00-\u9fa5]/)
  return match ? match[0] : clean.charAt(0) || '谱'
}

function getRoleBadge(role: string) {
  const r = (role || '').toUpperCase()
  if (r === 'OWNER') return { label: '谱主', class: 'role-owner' }
  if (r === 'EDITOR') return { label: '协修', class: 'role-editor' }
  if (r === 'VIEWER') return { label: '查阅', class: 'role-viewer' }
  return { label: role || '成员', class: 'role-default' }
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr)
  return d.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function formatRelativeTime(dateStr: string) {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  const diff = Date.now() - date.getTime()
  if (diff < 0) return '刚刚'
  const seconds = Math.floor(diff / 1000)
  if (seconds < 60) return '刚刚'
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes} 分钟前`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours} 小时前`
  const days = Math.floor(hours / 24)
  if (days < 30) return `${days} 天前`
  return formatDate(dateStr)
}
</script>

<template>
  <article
    class="panel-glass archive-card"
    :class="{ 'archive-card--opening': openingId === publication.id, 'archive-card--disabled': openingId !== null && openingId !== publication.id }"
    tabindex="0"
    role="button"
    :aria-busy="openingId === publication.id"
    :aria-label="'宗谱：' + (publication.title || '未命名宗谱')"
    @click="$emit('open', publication.id)"
    @keydown.enter.self="$emit('open', publication.id)"
    @keydown.space.self.prevent="$emit('open', publication.id)"
  >
    <div v-if="openingId === publication.id" class="card-loading-bar" aria-label="正在载入族谱...">
      <div class="card-loading-bar__inner"></div>
    </div>

    <div class="archive-header-group">
      <div class="archive-title-area">
        <div class="archive-seal" :title="'姓氏印鉴：' + getSurnameSeal(publication.title)">
          {{ getSurnameSeal(publication.title) }}
        </div>
        <div class="archive-title-meta">
          <h3 class="archive-title" :title="publication.title || '未命名宗谱'">
            {{ publication.title || '未命名宗谱' }}
          </h3>
          <div class="archive-sub-meta">
            <span v-if="publication.subtitle" class="archive-subtitle" :title="publication.subtitle">
              {{ publication.subtitle }}
            </span>
            <span v-if="publication.subtitle" class="meta-dot">·</span>
            <span class="archive-time-tag" :title="formatDate(publication.updatedAt)">
              <svg class="clock-icon" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>
              <span>{{ formatRelativeTime(publication.updatedAt) }}</span>
              <span v-if="publication.lastUpdatedBy" class="archive-author">({{ publication.lastUpdatedBy }})</span>
            </span>
          </div>
        </div>
      </div>

      <div class="archive-badge-group">
        <span :class="['role-badge', getRoleBadge(publication.accessRole).class]">
          {{ getRoleBadge(publication.accessRole).label }}
        </span>
        <span class="archive-revision" :title="'修缮版本 v' + publication.revision">
          v{{ publication.revision }}
        </span>
      </div>
    </div>

    <div v-if="publication.info?.ancestralOrigin || publication.info?.hallName" class="archive-tags">
      <span v-if="publication.info?.ancestralOrigin" class="meta-tag origin-tag">
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2a8 8 0 0 0-8 8c0 5.25 8 12 8 12s8-6.75 8-12a8 8 0 0 0-8-8z" /><circle cx="12" cy="10" r="3" /></svg>
        <span>{{ publication.info.ancestralOrigin }}</span>
      </span>
      <span v-if="publication.info?.hallName" class="meta-tag hall-tag">
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 21h18M3 10h18M5 6l7-3 7 3M4 10v11M20 10v11" /></svg>
        <span>{{ publication.info.hallName }}</span>
      </span>
    </div>

    <div class="archive-desc-wrap">
      <p v-if="publication.info?.description" class="archive-desc">{{ publication.info.description }}</p>
      <p v-else-if="publication.info?.familyMotto" class="archive-desc motto-desc">「{{ publication.info.familyMotto }}」</p>
      <p v-else class="archive-desc empty-desc-hint">点击卡片进入编撰工作台整理世系谱图</p>
    </div>

    <div class="archive-foot">
      <button
        class="action-btn action-btn--primary"
        :class="{ 'action-btn--loading': openingId === publication.id }"
        :disabled="openingId !== null"
        :title="openingId === publication.id ? '正在载入...' : '进入编撰工作台'"
        @click.stop="$emit('open', publication.id)"
      >
        <svg v-if="openingId === publication.id" class="spin-icon" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
          <path d="M21 12a9 9 0 1 1-6.219-8.56" />
        </svg>
        <svg v-else width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <rect x="3" y="3" width="18" height="18" rx="2" /><line x1="9" y1="3" x2="9" y2="21" />
        </svg>
        <span>{{ openingId === publication.id ? '载入中...' : '进入编撰' }}</span>
      </button>

      <div class="archive-actions" @click.stop>
        <div class="action-btn-cluster" aria-label="典籍工具">
          <button class="action-btn" title="导出出版数据" @click.stop="$emit('open-book-editor', publication.id)">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" /><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" /></svg>
          </button>
          <button class="action-btn" title="编修历程" @click.stop="$emit('open-activity', publication.id)">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>
          </button>
          <button class="action-btn" title="世系统计" @click.stop="$emit('open-stats', publication.id)">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="6" y1="20" x2="6" y2="14" /></svg>
          </button>
        </div>

        <span class="action-cluster-separator"></span>

        <div class="action-btn-cluster" aria-label="档案管理">
          <button class="action-btn" title="编辑属性" @click.stop="$emit('edit', publication)">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
          </button>
          <button class="action-btn" title="协作者管理" @click.stop="$emit('open-collaborators', publication.id)">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>
          </button>
          <button class="action-btn" title="分享链接" @click.stop="$emit('open-share', publication.id)">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" /><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" /></svg>
          </button>
          <button class="action-btn action-btn--danger" title="删除档案" @click.stop="$emit('request-delete', publication.id)">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></svg>
          </button>
        </div>
      </div>
    </div>

    <transition name="fade">
      <div v-if="deleteConfirmId === publication.id" class="delete-overlay" @click.stop>
        <p>确定要删除「{{ publication.title }}」吗？此操作不可撤销。</p>
        <div class="delete-btns">
          <button class="btn btn--danger" :disabled="deletingId === publication.id" @click="$emit('confirm-delete', publication.id)">{{ deletingId === publication.id ? '删除中...' : '确认删除' }}</button>
          <button class="btn" @click="$emit('cancel-delete')">取消</button>
        </div>
      </div>
    </transition>
  </article>
</template>

<style scoped>
.panel-glass { border-radius: var(--radius-xl, 16px); overflow: hidden; position: relative; transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.3s ease; background: var(--color-card-fill); border: 1px solid var(--color-card-stroke); }
.panel-glass:hover { transform: translateY(-3px); box-shadow: var(--shadow-sm, 0 4px 16px rgba(0,0,0,0.06)); }
.panel-glass:focus-visible { outline: 2px solid var(--color-accent); outline-offset: 2px; box-shadow: 0 0 0 4px var(--color-accent-muted); }
.archive-card { position: relative; display: flex; flex-direction: column; padding: 20px 22px; min-height: 200px; box-sizing: border-box; justify-content: space-between; cursor: pointer; background: var(--color-panel-bg); border: 1px solid var(--color-card-stroke); border-radius: var(--radius-xl, 16px); box-shadow: var(--shadow-sm, 0 2px 10px rgba(0, 0, 0, 0.04)); transition: transform var(--duration-fast, 180ms) var(--ease-breath), box-shadow var(--duration-fast, 180ms) var(--ease-breath), border-color var(--duration-fast, 180ms) var(--ease-breath); }
.archive-card:hover { transform: translateY(-3px); border-color: var(--color-accent); box-shadow: var(--shadow-whisper, 0 8px 24px rgba(0, 0, 0, 0.08)); }
.archive-card--opening { border-color: var(--color-accent) !important; box-shadow: 0 10px 30px var(--color-accent-muted, rgba(198, 60, 46, 0.22)) !important; cursor: wait; animation: card-active-glow 1.8s infinite alternate ease-in-out; }
@keyframes card-active-glow { 0% { transform: translateY(-3px) scale(1); } 100% { transform: translateY(-3px) scale(1.008); box-shadow: 0 14px 36px rgba(198, 60, 46, 0.28); } }
.archive-card--disabled { opacity: 0.65; pointer-events: none; }
.card-loading-bar { position: absolute; top: 0; left: 0; right: 0; height: 3px; overflow: hidden; border-top-left-radius: inherit; border-top-right-radius: inherit; background: var(--color-accent-muted, rgba(198, 60, 46, 0.12)); z-index: 5; }
.card-loading-bar__inner { height: 100%; width: 50%; background: linear-gradient(90deg, transparent, var(--color-accent, #c63c2e), transparent); animation: card-scan 1.2s infinite ease-in-out; }
@keyframes card-scan { 0% { transform: translateX(-100%); } 100% { transform: translateX(200%); } }
.spin-icon { animation: spin 0.8s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
.action-btn--loading { cursor: wait; opacity: 0.9; background: var(--color-accent) !important; color: #fff !important; border-color: var(--color-accent) !important; }
.archive-header-group { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; margin-bottom: 8px; }
.archive-title-area { display: flex; align-items: flex-start; gap: 10px; min-width: 0; flex: 1; }
.archive-seal { width: 34px; height: 34px; border-radius: 7px; border: 1.5px solid var(--color-accent); color: var(--color-accent); background: var(--color-accent-muted, rgba(184, 51, 42, 0.08)); display: flex; align-items: center; justify-content: center; font-family: var(--font-serif); font-size: 16px; font-weight: 600; flex-shrink: 0; box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.4); line-height: 1; }
[data-theme="dark"] .archive-seal { box-shadow: inset 0 0 0 1px rgba(0, 0, 0, 0.3); }
.archive-title-meta { flex: 1; min-width: 0; }
.archive-title { font-family: var(--font-serif); font-size: 17.5px; font-weight: 600; color: var(--color-neutral-10); margin: 0; line-height: 1.35; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.archive-sub-meta { display: flex; align-items: center; gap: 6px; margin-top: 3px; font-size: var(--text-label-12, 12px); color: var(--color-neutral-6); flex-wrap: wrap; }
.archive-subtitle { color: var(--color-neutral-7); max-width: 140px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.meta-dot { color: var(--color-neutral-4); }
.archive-time-tag { display: inline-flex; align-items: center; gap: 4px; color: var(--color-neutral-6); white-space: nowrap; }
.clock-icon { color: var(--color-neutral-5); flex-shrink: 0; }
.archive-author { color: var(--color-neutral-5); }
.archive-badge-group { display: flex; align-items: center; gap: 6px; flex-shrink: 0; }
.role-badge { font-size: 11px; font-weight: 600; padding: 1px 7px; border-radius: 4px; line-height: 1.4; }
.role-owner { color: var(--color-accent); background: var(--color-accent-muted); border: 1px solid var(--color-accent-muted); }
.role-editor { color: var(--color-info); background: var(--color-info-muted); border: 1px solid var(--color-info-muted); }
.role-viewer { color: var(--color-neutral-6); background: var(--color-neutral-2); }
.role-default { color: var(--color-neutral-7); background: var(--color-neutral-2); }
.archive-revision { font-size: 11px; font-family: var(--font-mono, monospace); color: var(--color-neutral-6); background: var(--color-neutral-2, rgba(0, 0, 0, 0.04)); padding: 1px 6px; border-radius: 4px; border: 1px solid var(--color-card-stroke); }
.archive-tags { display: flex; gap: 6px; flex-wrap: wrap; margin-bottom: 8px; }
.meta-tag { display: inline-flex; align-items: center; gap: 5px; font-size: 11.5px; font-weight: 500; padding: 2px 8px; border-radius: 4px; background: var(--color-neutral-2, rgba(0, 0, 0, 0.04)); color: var(--color-neutral-7); border: 1px solid var(--color-card-stroke, rgba(0, 0, 0, 0.06)); max-width: 140px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.meta-tag.origin-tag { color: var(--color-info); background: var(--color-info-muted); }
.meta-tag.hall-tag { color: var(--color-accent); background: var(--color-accent-muted); }
.archive-desc-wrap { flex: 1; min-height: 38px; display: flex; align-items: flex-start; margin-bottom: 10px; }
.archive-desc { font-size: 12px; color: var(--color-neutral-6); margin: 0; line-height: 1.5; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; text-overflow: ellipsis; }
.archive-desc.motto-desc { font-style: italic; font-family: var(--font-serif); color: var(--color-neutral-7); }
.archive-desc.empty-desc-hint { font-size: 11.5px; color: var(--color-neutral-5); font-style: normal; }
.archive-foot { display: flex; align-items: center; justify-content: space-between; padding-top: 12px; border-top: 1px solid var(--color-card-stroke, rgba(0, 0, 0, 0.06)); gap: 10px; }
.archive-actions { display: flex; align-items: center; gap: 4px; flex-shrink: 0; }
.action-btn-cluster { display: flex; align-items: center; gap: 2px; }
.action-cluster-separator { width: 1px; height: 14px; background: var(--color-card-stroke); margin: 0 4px; }
.action-btn { width: 28px; height: 28px; border: 1px solid transparent; background: transparent; color: var(--color-neutral-6); border-radius: 6px; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: all var(--duration-fast, 150ms) var(--ease-breath); flex-shrink: 0; box-sizing: border-box; }
.action-btn svg { width: 13.5px; height: 13.5px; }
.action-btn:hover { background: var(--color-neutral-3); color: var(--color-neutral-10); border-color: var(--color-card-stroke); }
.action-btn:focus-visible { outline: 2px solid var(--color-accent); outline-offset: 1px; box-shadow: 0 0 0 2px var(--color-accent-muted); }
.action-btn--primary { width: auto; height: 28px; padding: 0 10px; gap: 5px; border-radius: var(--radius-sm, 6px); background: var(--color-accent-muted, rgba(184, 51, 42, 0.08)); color: var(--color-accent); border: 1px solid var(--color-accent-muted); font-size: var(--text-label-12, 12px); font-weight: 500; cursor: pointer; display: inline-flex; align-items: center; justify-content: center; transition: all var(--duration-fast, 150ms) var(--ease-breath); }
.action-btn--primary:hover { background: var(--color-accent); color: var(--color-text-on-accent, #fff); border-color: var(--color-accent); }
.action-btn--primary svg { width: 13px; height: 13px; }
.action-btn--danger:hover { background: var(--color-error-muted, rgba(239, 68, 68, 0.12)); color: var(--color-error); border-color: var(--color-error-muted); }
.action-btn--danger:focus-visible { outline: 2px solid var(--color-error); outline-offset: 1px; box-shadow: 0 0 0 2px var(--color-error-muted); }
.delete-overlay { position: absolute; inset: 0; background: rgba(255, 255, 255, 0.96); backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px); display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 16px; z-index: 10; border-radius: var(--radius-xl, 16px); padding: 20px; }
[data-theme="dark"] .delete-overlay { background: var(--color-panel-bg); }
.delete-overlay p { font-size: var(--text-copy-13, 13px); font-weight: 500; color: var(--color-neutral-9); margin: 0; text-align: center; max-width: 260px; line-height: 1.5; }
.delete-btns { display: flex; gap: 10px; }
.fade-enter-active, .fade-leave-active { transition: opacity 0.25s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
</style>
