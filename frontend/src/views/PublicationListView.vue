<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import {
  listPublications,
  createPublication,
  deletePublication,
  updatePublicationMetadata,
  type PublicationSummary,
} from '../api/publication'
import { blankPublication, defaultSettings } from '../data/sampleFamily'
import { builtinSamples } from '../data/builtinDynastySamples'
import type { PublicationInfo } from '../types/family'
import ShareLinkManager from '../components/ShareLinkManager.vue'
import CollaboratorManager from '../components/CollaboratorManager.vue'
import { useLexiconStore } from '../stores/lexicon'
import FeedbackStrip from '../components/FeedbackStrip.vue'
import PoeticHeader from '../components/PoeticHeader.vue'
import AppSelect, { type AppSelectOption } from '../components/AppSelect.vue'
import { useFeedback } from '../composables/useFeedback'

const router = useRouter()
const feedback = useFeedback()
const lexiconStore = useLexiconStore()
const lexicon = computed(() => lexiconStore.lexicon)
const publicationsQuote = computed(() => lexicon.value.publications.quote.replace(/\\n/g, '<br/>'))

const publications = ref<PublicationSummary[]>([])
const loading = ref(true)
const showCreateDialog = ref(false)
const newTitle = ref('')
const newSubtitle = ref('')

const showEditDialog = ref(false)
const editingId = ref<number | null>(null)
const editingRevision = ref<number>(0)
const editForm = ref({
  title: '',
  subtitle: '',
  description: '',
  ancestralOrigin: '',
  hallName: '',
  familyMotto: '',
})

const deleteConfirmId = ref<number | null>(null)
const deletingId = ref<number | null>(null)
const saving = ref(false)
const creating = ref(false)
const showShareDialog = ref(false)
const shareDialogPubId = ref<number | null>(null)
const showCollabDialog = ref(false)
const collabDialogPubId = ref<number | null>(null)

// ── Search, Sort & Filter State ──
const searchQuery = ref('')
const sortBy = ref<string>('updatedAt_desc')
const templatesExpanded = ref(true)

const sortOptions: AppSelectOption[] = [
  { value: 'updatedAt_desc', label: '最近更新' },
  { value: 'createdAt_desc', label: '最新创建' },
  { value: 'title_asc', label: '谱名拼音' },
  { value: 'revision_desc', label: '修缮次数' },
]

const filteredPublications = computed(() => {
  let list = [...publications.value]
  const q = searchQuery.value.trim().toLowerCase()
  if (q) {
    list = list.filter((p) => {
      const matchTitle = (p.title || '').toLowerCase().includes(q)
      const matchSubtitle = (p.subtitle || '').toLowerCase().includes(q)
      const matchOrigin = (p.info?.ancestralOrigin || '').toLowerCase().includes(q)
      const matchHall = (p.info?.hallName || '').toLowerCase().includes(q)
      const matchDesc = (p.info?.description || '').toLowerCase().includes(q)
      return matchTitle || matchSubtitle || matchOrigin || matchHall || matchDesc
    })
  }

  list.sort((a, b) => {
    if (sortBy.value === 'updatedAt_desc') {
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    }
    if (sortBy.value === 'createdAt_desc') {
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    }
    if (sortBy.value === 'title_asc') {
      return (a.title || '').localeCompare(b.title || '', 'zh-CN')
    }
    if (sortBy.value === 'revision_desc') {
      return b.revision - a.revision
    }
    return 0
  })

  return list
})

async function loadPublications() {
  loading.value = true
  try {
    publications.value = await listPublications()
  } catch {
    publications.value = []
  } finally {
    loading.value = false
  }
}

onMounted(loadPublications)

function openPublication(id: number) {
  router.push({ name: 'workbench', params: { id } })
}

function openBookEditor(pubId: number) {
  router.push({ name: 'book-editor-publication', params: { publicationId: pubId } })
}

function openActivity(pubId: number) {
  router.push({ name: 'publication-activity', params: { id: pubId } })
}

function openStats(pubId: number) {
  router.push({ name: 'publication-stats', params: { id: pubId } })
}

function previewSample(sampleId: string) {
  router.push({ name: 'sample-preview', params: { sampleId } })
}

function getSamplePersonCount(sample: typeof builtinSamples[0]): number {
  return Object.keys(sample.publication?.people || {}).length
}

function getSurnameSeal(title: string): string {
  if (!title) return '谱'
  const clean = title.trim()
  const shiIndex = clean.indexOf('氏')
  if (shiIndex > 0) {
    return clean.charAt(shiIndex - 1)
  }
  const match = clean.match(/[\u4e00-\u9fa5]/)
  return match ? match[0] : (clean.charAt(0) || '谱')
}

function getRoleBadge(role: string) {
  const r = (role || '').toUpperCase()
  if (r === 'OWNER') return { label: '谱主', class: 'role-owner' }
  if (r === 'EDITOR') return { label: '协修', class: 'role-editor' }
  if (r === 'VIEWER') return { label: '查阅', class: 'role-viewer' }
  return { label: role || '成员', class: 'role-default' }
}

function formatRelativeTime(dateStr: string) {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  const now = Date.now()
  const diff = now - date.getTime()
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

function openEditDialog(pub: PublicationSummary) {
  editingId.value = pub.id
  editingRevision.value = pub.revision
  editForm.value = {
    title: pub.title || '',
    subtitle: pub.subtitle || '',
    description: pub.info?.description || '',
    ancestralOrigin: pub.info?.ancestralOrigin || '',
    hallName: pub.info?.hallName || '',
    familyMotto: pub.info?.familyMotto || '',
  }
  showEditDialog.value = true
}

async function handleEditSave() {
  if (!editingId.value || saving.value) return
  saving.value = true

  const title = editForm.value.title.trim() || '未命名族谱'
  const subtitle = editForm.value.subtitle.trim()
  const info: PublicationInfo = {
    description: editForm.value.description.trim(),
    ancestralOrigin: editForm.value.ancestralOrigin.trim(),
    hallName: editForm.value.hallName.trim(),
    familyMotto: editForm.value.familyMotto.trim(),
  }

  try {
    await updatePublicationMetadata(editingId.value, editingRevision.value, title, subtitle, info)
    showEditDialog.value = false
    await loadPublications()
  } catch (err: any) {
    feedback.setError('保存失败: ' + (err.message || '未知错误'))
  } finally {
    saving.value = false
  }
}

async function handleCreate() {
  if (creating.value) return
  creating.value = true
  const title = newTitle.value.trim() || '未命名族谱'
  const subtitle = newSubtitle.value.trim()
  try {
    const id = await createPublication(
      { ...blankPublication, title, subtitle },
      defaultSettings,
      title,
    )
    showCreateDialog.value = false
    newTitle.value = ''
    newSubtitle.value = ''
    router.push({ name: 'workbench', params: { id } })
  } catch {
    // error handled silently
  } finally {
    creating.value = false
  }
}

function openShareDialog(pubId: number) {
  shareDialogPubId.value = pubId
  showShareDialog.value = true
}

function openCollabDialog(pubId: number) {
  collabDialogPubId.value = pubId
  showCollabDialog.value = true
}

async function handleDelete(id: number) {
  if (deletingId.value) return
  deletingId.value = id
  try {
    await deletePublication(id)
    publications.value = publications.value.filter((p) => p.id !== id)
    deleteConfirmId.value = null
  } catch (err: any) {
    feedback.setError('删除失败: ' + (err?.response?.data?.message || err.message || '未知错误'))
  } finally {
    deletingId.value = null
  }
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

const cloningSampleId = ref<string | null>(null)

async function handleViewSample(sample: typeof builtinSamples[0]) {
  if (cloningSampleId.value) return
  cloningSampleId.value = sample.id

  const baseTitle = sample.publication.title || sample.label
  try {
    const id = await createPublication(sample.publication, defaultSettings, baseTitle + ' (副本)')
    router.push({ name: 'workbench', params: { id } })
  } catch (err: any) {
    if (import.meta.env.DEV) console.error('[template clone] failed:', err)
    feedback.setError('创建失败: ' + (err?.message || '未知错误'))
  } finally {
    cloningSampleId.value = null
  }
}
</script>

<template>
  <div class="publication-list-view-root">
    <div class="gallery-stage">
      <FeedbackStrip :status-message="feedback.statusMessage.value" :error-message="feedback.errorMessage.value" @dismiss="feedback.dismiss" />

      <!-- Header -->
      <PoeticHeader
        :eyebrow="lexicon.publications.headerEyebrow"
        :title="lexicon.publications.headerTitle"
        :title-italic="lexicon.publications.headerTitleItalic"
      >
        <template #extra>
          <p class="poetic-quote" v-html="publicationsQuote"></p>
          <button class="btn btn--primary create-hero-btn" @click="showCreateDialog = true">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
            {{ lexicon.publications.createBtn }}
          </button>
        </template>
      </PoeticHeader>

      <div v-if="loading" class="loading-state">
        <div class="spinner"></div>
        <p>{{ lexicon.publications.loadingText }}</p>
      </div>

      <div v-else class="gallery-content">
        <!-- Template Section (Built-in) -->
        <section class="gallery-section template-section">
          <div class="section-eyebrow-row">
            <div class="section-eyebrow">
              <span class="dot-ember"></span> {{ lexicon.publications.templateSectionTitle }}
              <span class="section-badge">{{ builtinSamples.length }} 部范本</span>
            </div>
            <button class="toggle-expand-btn" @click="templatesExpanded = !templatesExpanded">
              <span>{{ templatesExpanded ? '收起范本' : '展开范本' }}</span>
              <svg :class="{ rotated: !templatesExpanded }" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polyline points="6 9 12 15 18 9"/></svg>
            </button>
          </div>

          <div v-show="templatesExpanded" class="template-grid">
            <div
              v-for="sample in builtinSamples"
              :key="sample.id"
              class="panel-glass template-card"
              tabindex="0"
              role="article"
              :aria-label="'模板：' + sample.publication.title"
            >
              <div class="template-bg"></div>
              <div class="template-content">
                <div class="template-meta-row">
                  <span class="template-group-badge">{{ sample.group }}</span>
                  <span class="template-count-badge">{{ getSamplePersonCount(sample) }} 位宗亲</span>
                </div>
                <h3 class="template-title">{{ sample.publication.title }}</h3>
                <p class="template-subtitle">{{ sample.publication.subtitle }}</p>
              </div>

              <div class="template-card-footer">
                <button
                  class="template-sub-btn preview-btn"
                  title="浏览世系范本"
                  @click.stop="previewSample(sample.id)"
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                  预览世系
                </button>
                <button
                  class="template-sub-btn clone-btn"
                  :disabled="cloningSampleId === sample.id"
                  @click.stop="handleViewSample(sample)"
                >
                  <svg v-if="cloningSampleId !== sample.id" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
                  <span>{{ cloningSampleId === sample.id ? '拓印中...' : '以此建谱' }}</span>
                </button>
              </div>
            </div>
          </div>
        </section>

        <!-- Empty State (No Publications at all) -->
        <div v-if="publications.length === 0" class="empty-state">
          <div class="empty-seal">{{ lexicon.publications.soul }}</div>
          <h3 class="empty-title">{{ lexicon.publications.emptyTitle }}</h3>
          <p class="empty-desc">{{ lexicon.publications.emptyDesc }}</p>
          <div class="empty-actions">
            <button class="btn btn--primary" @click="showCreateDialog = true">{{ lexicon.publications.createBtn }}</button>
          </div>
        </div>

        <!-- Archive Section (Has publications) -->
        <section v-else class="gallery-section archive-section">
          <div class="archive-header-row">
            <div class="section-eyebrow">
              <span class="dot-ink"></span> {{ lexicon.publications.archiveSectionTitle }}
            </div>

            <!-- Toolbar: Search & Sort -->
            <div class="list-toolbar">
              <div class="search-box">
                <svg class="search-icon" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                <input
                  v-model="searchQuery"
                  type="text"
                  :placeholder="lexicon.publications.searchPlaceholder"
                  class="search-input"
                />
                <button v-if="searchQuery" class="clear-search-btn" @click="searchQuery = ''" title="清除搜索">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                </button>
              </div>

              <div class="toolbar-controls">
                <div class="sort-select-wrapper">
                  <AppSelect
                    v-model="sortBy"
                    :options="sortOptions"
                    variant="compact"
                  />
                </div>
                <div class="count-pill">
                  <span v-if="searchQuery">
                    匹配 {{ filteredPublications.length }} / {{ publications.length }} 部
                  </span>
                  <span v-else>
                    共收录 {{ publications.length }} 部
                  </span>
                </div>
              </div>
            </div>
          </div>

          <!-- Search Filter Empty -->
          <div v-if="filteredPublications.length === 0" class="search-empty-state">
            <div class="search-empty-seal">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="8" y1="11" x2="14" y2="11"/></svg>
            </div>
            <h4 class="search-empty-title">未找到与 “{{ searchQuery }}” 相关的族谱</h4>
            <p class="search-empty-desc">建议更换堂号、祖籍或谱名关键词，或者清除筛选条件</p>
            <button class="btn btn--sm" @click="searchQuery = ''">清除搜索关键词</button>
          </div>

          <!-- Cards Grid -->
          <div v-else class="archive-grid">
            <article
              v-for="pub in filteredPublications"
              :key="pub.id"
              class="panel-glass archive-card"
              tabindex="0"
              role="button"
              :aria-label="'宗谱：' + (pub.title || '未命名宗谱')"
              @click="openPublication(pub.id)"
              @keydown.enter.self="openPublication(pub.id)"
              @keydown.space.self.prevent="openPublication(pub.id)"
            >
              <!-- Top Row: Seal Stamp + Title & Subtitle/Time Meta + Badges -->
              <div class="archive-header-group">
                <div class="archive-title-area">
                  <div class="archive-seal" :title="'姓氏印鉴：' + getSurnameSeal(pub.title)">
                    {{ getSurnameSeal(pub.title) }}
                  </div>
                  <div class="archive-title-meta">
                    <h3 class="archive-title" :title="pub.title || '未命名宗谱'">
                      {{ pub.title || '未命名宗谱' }}
                    </h3>
                    <div class="archive-sub-meta">
                      <span v-if="pub.subtitle" class="archive-subtitle" :title="pub.subtitle">
                        {{ pub.subtitle }}
                      </span>
                      <span v-if="pub.subtitle" class="meta-dot">·</span>
                      <span class="archive-time-tag" :title="formatDate(pub.updatedAt)">
                        <svg class="clock-icon" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                        <span>{{ formatRelativeTime(pub.updatedAt) }}</span>
                        <span v-if="pub.lastUpdatedBy" class="archive-author">({{ pub.lastUpdatedBy }})</span>
                      </span>
                    </div>
                  </div>
                </div>

                <div class="archive-badge-group">
                  <span :class="['role-badge', getRoleBadge(pub.accessRole).class]">
                    {{ getRoleBadge(pub.accessRole).label }}
                  </span>
                  <span class="archive-revision" :title="'修缮版本 v' + pub.revision">
                    v{{ pub.revision }}
                  </span>
                </div>
              </div>

              <!-- Tags Row: Hall Name & Ancestral Origin -->
              <div class="archive-tags" v-if="pub.info?.ancestralOrigin || pub.info?.hallName">
                <span v-if="pub.info?.ancestralOrigin" class="meta-tag origin-tag">
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2a8 8 0 0 0-8 8c0 5.25 8 12 8 12s8-6.75 8-12a8 8 0 0 0-8-8z"/><circle cx="12" cy="10" r="3"/></svg>
                  <span>{{ pub.info.ancestralOrigin }}</span>
                </span>
                <span v-if="pub.info?.hallName" class="meta-tag hall-tag">
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 21h18M3 10h18M5 6l7-3 7 3M4 10v11M20 10v11"/></svg>
                  <span>{{ pub.info.hallName }}</span>
                </span>
              </div>

              <!-- Description or Prompt -->
              <div class="archive-desc-wrap">
                <p v-if="pub.info?.description" class="archive-desc">{{ pub.info.description }}</p>
                <p v-else-if="pub.info?.familyMotto" class="archive-desc motto-desc">「{{ pub.info.familyMotto }}」</p>
                <p v-else class="archive-desc empty-desc-hint">点击卡片进入编撰工作台整理世系谱图</p>
              </div>

              <!-- Foot Row: Left Primary Action + Right Tools & Management -->
              <div class="archive-foot">
                <button class="action-btn action-btn--primary" title="进入编撰工作台" @click.stop="openPublication(pub.id)">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="9" y1="3" x2="9" y2="21"/></svg>
                  <span>进入编撰</span>
                </button>

                <div class="archive-actions" @click.stop>
                  <div class="action-btn-cluster" aria-label="典籍工具">
                    <button class="action-btn" title="古籍印制排版" @click.stop="openBookEditor(pub.id)">
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>
                    </button>
                    <button class="action-btn" title="编修历程" @click.stop="openActivity(pub.id)">
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                    </button>
                    <button class="action-btn" title="世系统计" @click.stop="openStats(pub.id)">
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>
                    </button>
                  </div>

                  <span class="action-cluster-separator"></span>

                  <div class="action-btn-cluster" aria-label="档案管理">
                    <button class="action-btn" title="编辑属性" @click.stop="openEditDialog(pub)">
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
                    </button>
                    <button class="action-btn" title="协作者管理" @click.stop="openCollabDialog(pub.id)">
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>
                    </button>
                    <button class="action-btn" title="分享链接" @click.stop="openShareDialog(pub.id)">
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" /><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" /></svg>
                    </button>
                    <button class="action-btn action-btn--danger" title="删除档案" @click.stop="deleteConfirmId = pub.id">
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></svg>
                    </button>
                  </div>
                </div>
              </div>

              <!-- Delete Confirm Overlay -->
              <transition name="fade">
                <div v-if="deleteConfirmId === pub.id" class="delete-overlay" @click.stop>
                  <p>确定要删除「{{ pub.title }}」吗？此操作不可撤销。</p>
                  <div class="delete-btns">
                    <button class="btn btn--danger" :disabled="deletingId === pub.id" @click="handleDelete(pub.id)">{{ deletingId === pub.id ? '删除中...' : '确认删除' }}</button>
                    <button class="btn" @click="deleteConfirmId = null">取消</button>
                  </div>
                </div>
              </transition>
            </article>
          </div>
        </section>
      </div>

      <!-- Modals: Glass Sheets -->
      <Teleport to="body">
        <!-- Create Archive Sheet -->
        <transition name="sheet-slide">
          <div v-if="showCreateDialog" class="glass-modal-overlay" role="dialog" aria-modal="true" :aria-label="lexicon.publications.createModalTitle" @click.self="showCreateDialog = false" @keydown.escape="showCreateDialog = false">
            <div class="glass-sheet">
              <header class="sheet-header">
                <h2 class="sheet-title">{{ lexicon.publications.createModalTitle }}</h2>
                <button class="sheet-close" @click="showCreateDialog = false" title="关闭">&times;</button>
              </header>
              <div class="sheet-body">
                <div class="glass-input-group">
                  <label>宗谱名称 <span class="label-hint">题名</span></label>
                  <input v-model="newTitle" type="text" placeholder="例: 陇西李氏世系图" @keyup.enter="handleCreate" />
                </div>
                <div class="glass-input-group">
                  <label>修谱卷号 <span class="label-hint">修次或卷册</span></label>
                  <input v-model="newSubtitle" type="text" placeholder="例: 丙午年重修版" @keyup.enter="handleCreate" />
                </div>
              </div>
              <footer class="sheet-footer">
                <button class="btn" @click="showCreateDialog = false">取消</button>
                <button class="btn btn--primary" :disabled="creating" @click="handleCreate">{{ creating ? '创建中...' : lexicon.publications.createModalSubmit }}</button>
              </footer>
            </div>
          </div>
        </transition>

        <!-- Edit Metadata Sheet -->
        <transition name="sheet-slide">
          <div v-if="showEditDialog" class="glass-modal-overlay" role="dialog" aria-modal="true" :aria-label="lexicon.publications.editModalTitle" @click.self="showEditDialog = false" @keydown.escape="showEditDialog = false">
            <div class="glass-sheet large">
              <header class="sheet-header">
                <h2 class="sheet-title">{{ lexicon.publications.editModalTitle }}</h2>
                <button class="sheet-close" @click="showEditDialog = false" title="关闭">&times;</button>
              </header>
              <div class="sheet-body grid-form">
                <div class="glass-input-group">
                  <label>宗谱名称 <span class="label-hint">谱书题名</span></label>
                  <input v-model="editForm.title" type="text" />
                </div>
                <div class="glass-input-group">
                  <label>修谱卷号 <span class="label-hint">卷册或修次</span></label>
                  <input v-model="editForm.subtitle" type="text" />
                </div>
                <div class="glass-input-group">
                  <label>郡望 / 祖籍 <span class="label-hint">源流望族</span></label>
                  <input v-model="editForm.ancestralOrigin" type="text" placeholder="例: 陇西 / 颍川" />
                </div>
                <div class="glass-input-group">
                  <label>家族堂号 <span class="label-hint">祠堂堂名</span></label>
                  <input v-model="editForm.hallName" type="text" placeholder="例: 三槐堂、崇本堂" />
                </div>
                <div class="glass-input-group full">
                  <label>传世家训 <span class="label-hint">家规祖训</span></label>
                  <textarea v-model="editForm.familyMotto" rows="2" placeholder="例: 诗书传家，忠厚继世"></textarea>
                </div>
                <div class="glass-input-group full">
                  <label>宗谱总序 <span class="label-hint">记述家族源流与修谱纪略</span></label>
                  <textarea v-model="editForm.description" rows="3" placeholder="记述家族源流与修谱历程..."></textarea>
                </div>
              </div>
              <footer class="sheet-footer">
                <button class="btn" @click="showEditDialog = false">放弃修改</button>
                <button class="btn btn--primary" :disabled="saving" @click="handleEditSave">{{ saving ? '保存中...' : lexicon.publications.editModalSubmit }}</button>
              </footer>
            </div>
          </div>
        </transition>

        <!-- Collaborator Manager Sheet -->
        <transition name="sheet-slide">
          <div v-if="showCollabDialog && collabDialogPubId" class="glass-modal-overlay" role="dialog" aria-modal="true" aria-label="协作者管理" @click.self="showCollabDialog = false" @keydown.escape="showCollabDialog = false">
            <div class="glass-sheet large">
              <header class="sheet-header">
                <h2 class="sheet-title">协作者管理</h2>
                <button class="sheet-close" @click="showCollabDialog = false">&times;</button>
              </header>
              <div class="sheet-body">
                <CollaboratorManager :publicationId="collabDialogPubId" />
              </div>
            </div>
          </div>
        </transition>

        <!-- Share Link Manager Sheet -->
        <transition name="sheet-slide">
          <div v-if="showShareDialog && shareDialogPubId" class="glass-modal-overlay" role="dialog" aria-modal="true" aria-label="分享链接管理" @click.self="showShareDialog = false" @keydown.escape="showShareDialog = false">
            <div class="glass-sheet">
              <header class="sheet-header">
                <h2 class="sheet-title">分享链接管理</h2>
                <button class="sheet-close" @click="showShareDialog = false">&times;</button>
              </header>
              <div class="sheet-body">
                <ShareLinkManager :publicationId="shareDialogPubId" />
              </div>
            </div>
          </div>
        </transition>
      </Teleport>
    </div>
  </div>
</template>

<style scoped>
.gallery-stage {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.create-hero-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  box-shadow: 0 4px 12px var(--color-accent-muted, rgba(184, 51, 42, 0.15));
}

/* ── Sections ── */
.gallery-section {
  margin-bottom: 2.5rem;
}

.section-eyebrow-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 1.25rem;
}

.section-eyebrow {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: var(--text-label-12, 12px);
  font-weight: 500;
  letter-spacing: 0.15em;
  color: var(--color-neutral-6);
  text-transform: uppercase;
}

.section-badge {
  font-size: 11px;
  font-weight: normal;
  letter-spacing: normal;
  color: var(--color-neutral-6);
  background: var(--color-neutral-2, rgba(0, 0, 0, 0.04));
  padding: 1px 8px;
  border-radius: 12px;
  border: 1px solid var(--color-card-stroke, rgba(0, 0, 0, 0.06));
}

.toggle-expand-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: var(--text-label-12, 12px);
  color: var(--color-neutral-6);
  background: transparent;
  border: 1px solid var(--color-card-stroke, rgba(0, 0, 0, 0.08));
  border-radius: var(--radius-md, 8px);
  padding: 4px 10px;
  cursor: pointer;
  transition: all var(--duration-fast) var(--ease-breath);
}
.toggle-expand-btn:hover {
  background: var(--color-card-fill);
  color: var(--color-neutral-9);
}
.toggle-expand-btn svg {
  transition: transform var(--duration-normal) var(--ease-breath);
}
.toggle-expand-btn svg.rotated {
  transform: rotate(180deg);
}

.dot-ember { width: 6px; height: 6px; border-radius: 50%; background: var(--color-accent); }
.dot-ink { width: 6px; height: 6px; border-radius: 50%; background: var(--color-info); }

/* ── Glass Cards ── */
.panel-glass {
  border-radius: var(--radius-xl, 16px);
  overflow: hidden;
  position: relative;
  transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.3s ease;
  background: var(--color-card-fill);
  border: 1px solid var(--color-card-stroke);
}
.panel-glass:hover {
  transform: translateY(-3px);
  box-shadow: var(--shadow-sm, 0 4px 16px rgba(0,0,0,0.06));
}
.panel-glass:focus-visible {
  outline: 2px solid var(--color-accent);
  outline-offset: 2px;
  box-shadow: 0 0 0 4px var(--color-accent-muted);
}

/* ── Template Grid ── */
.template-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 20px;
}
.template-card {
  padding: 1.25rem 1.4rem;
  display: flex;
  flex-direction: column;
  min-height: 155px;
  justify-content: space-between;
}
.template-bg {
  position: absolute;
  inset: 0;
  background: linear-gradient(135deg, rgba(255,255,255,0.08), transparent);
  pointer-events: none;
}
.template-content {
  position: relative;
  z-index: 1;
}
.template-meta-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}
.template-group-badge {
  font-size: 11px;
  font-weight: 600;
  color: var(--color-accent);
  background: var(--color-accent-muted);
  padding: 1px 7px;
  border-radius: 4px;
  border: 1px solid var(--color-accent-muted);
}
.template-count-badge {
  font-size: 11px;
  color: var(--color-neutral-6);
  background: var(--color-neutral-2, rgba(0, 0, 0, 0.04));
  padding: 1px 6px;
  border-radius: 4px;
}
.template-title {
  font-family: var(--font-serif);
  font-size: 1.2rem;
  margin: 0 0 0.25rem;
  color: var(--color-neutral-10);
  font-weight: 500;
}
.template-subtitle {
  font-size: 0.8rem;
  color: var(--color-neutral-6);
  margin: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.template-card-footer {
  position: relative;
  z-index: 1;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 12px;
  padding-top: 10px;
  border-top: 1px solid var(--color-card-stroke, rgba(0, 0, 0, 0.06));
}
.template-sub-btn {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 11.5px;
  font-weight: 500;
  padding: 4px 10px;
  border-radius: var(--radius-sm, 6px);
  border: 1px solid var(--color-card-stroke);
  background: var(--color-card-fill);
  color: var(--color-neutral-7);
  cursor: pointer;
  transition: all var(--duration-fast) var(--ease-breath);
}
.template-sub-btn:hover {
  background: var(--color-neutral-3);
  color: var(--color-neutral-9);
}
.template-sub-btn.clone-btn {
  background: var(--color-accent);
  color: var(--color-text-on-accent, #fff);
  border-color: var(--color-accent);
}
.template-sub-btn.clone-btn:hover {
  opacity: 0.92;
}

/* ── Archive Header & Toolbar ── */
.archive-header-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 16px;
  margin-bottom: 1.25rem;
}

.list-toolbar {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.search-box {
  position: relative;
  display: flex;
  align-items: center;
  gap: 8px;
  background: var(--color-panel-bg);
  border: 1px solid var(--color-card-stroke);
  border-radius: 999px;
  padding: 0 14px;
  height: 36px;
  min-width: 260px;
  max-width: 320px;
  transition: border-color var(--duration-fast) var(--ease-breath),
              box-shadow var(--duration-fast) var(--ease-breath);
}
.search-box:hover {
  border-color: var(--color-neutral-5);
}
.search-box:focus-within {
  border-color: var(--color-accent);
  box-shadow: none;
}
.search-icon {
  color: var(--color-neutral-6);
  flex-shrink: 0;
}
.search-input {
  flex: 1;
  border: none !important;
  background: transparent !important;
  height: 26px;
  line-height: 26px;
  padding: 0 4px;
  font-size: var(--text-copy-14, 14px);
  color: var(--color-neutral-9);
  outline: none !important;
  box-shadow: none !important;
  letter-spacing: 0.02em;
  width: 100%;
}
.search-input:focus,
.search-input:focus-visible {
  outline: none !important;
  box-shadow: none !important;
  border: none !important;
}
.search-input::placeholder {
  color: var(--color-neutral-6);
  font-weight: 400;
}
.clear-search-btn {
  border: none;
  background: transparent;
  color: var(--color-neutral-5);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2px;
  border-radius: 50%;
  transition: color var(--duration-fast);
}
.clear-search-btn:hover {
  color: var(--color-neutral-9);
}

.toolbar-controls {
  display: flex;
  align-items: center;
  gap: 10px;
}

.sort-select-wrapper {
  display: flex;
  align-items: center;
}
.sort-select-wrapper :deep(.app-select.compact) {
  min-width: 110px;
}
.sort-select-wrapper :deep(.app-select.compact .app-select__trigger) {
  height: 36px;
  border-radius: var(--radius-lg, 12px);
  background: var(--color-panel-bg);
  border-color: var(--color-card-stroke);
  font-size: var(--text-label-12, 12px);
  padding: 0 12px;
  box-sizing: border-box;
}
.sort-select-wrapper :deep(.app-select.compact .app-select__trigger:hover) {
  border-color: var(--color-neutral-5);
}
.sort-select-wrapper :deep(.app-select.open .app-select__trigger),
.sort-select-wrapper :deep(.app-select.compact .app-select__trigger:focus-visible) {
  border-color: var(--color-accent);
  box-shadow: 0 0 0 3px var(--color-accent-muted);
}

.count-pill {
  font-size: var(--text-label-12, 12px);
  color: var(--color-neutral-6);
  background: var(--color-neutral-2, rgba(0, 0, 0, 0.04));
  padding: 0 12px;
  height: 36px;
  display: flex;
  align-items: center;
  border-radius: var(--radius-lg, 12px);
  border: 1px solid var(--color-card-stroke, rgba(0, 0, 0, 0.06));
}

/* ── Search Empty State ── */
.search-empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 24px;
  text-align: center;
  background: var(--color-card-fill);
  border: 1px dashed var(--color-card-stroke);
  border-radius: var(--radius-xl, 16px);
  margin-top: 8px;
}
.search-empty-seal {
  width: 56px;
  height: 56px;
  border-radius: 50%;
  background: var(--color-neutral-2);
  color: var(--color-neutral-5);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 16px;
}
.search-empty-title {
  font-size: 1.1rem;
  color: var(--color-neutral-9);
  margin: 0 0 6px;
  font-family: var(--font-serif);
}
.search-empty-desc {
  font-size: var(--text-copy-13, 13px);
  color: var(--color-neutral-6);
  margin: 0 0 16px;
}

/* ── Archive Grid ── */
.archive-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
  gap: 22px;
}
.archive-card {
  position: relative;
  display: flex;
  flex-direction: column;
  padding: 20px 22px;
  min-height: 200px;
  box-sizing: border-box;
  justify-content: space-between;
  cursor: pointer;
  background: var(--color-panel-bg);
  border: 1px solid var(--color-card-stroke);
  border-radius: var(--radius-xl, 16px);
  box-shadow: var(--shadow-sm, 0 2px 10px rgba(0, 0, 0, 0.04));
  transition: transform var(--duration-fast, 180ms) var(--ease-breath),
              box-shadow var(--duration-fast, 180ms) var(--ease-breath),
              border-color var(--duration-fast, 180ms) var(--ease-breath);
}
.archive-card:hover {
  transform: translateY(-3px);
  border-color: var(--color-accent);
  box-shadow: var(--shadow-whisper, 0 8px 24px rgba(0, 0, 0, 0.08));
}

/* Header Group: Seal + Titles + Badges */
.archive-header-group {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 8px;
}
.archive-title-area {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  min-width: 0;
  flex: 1;
}

/* Surname Seal Stamp */
.archive-seal {
  width: 34px;
  height: 34px;
  border-radius: 7px;
  border: 1.5px solid var(--color-accent);
  color: var(--color-accent);
  background: var(--color-accent-muted, rgba(184, 51, 42, 0.08));
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: var(--font-serif);
  font-size: 16px;
  font-weight: 600;
  flex-shrink: 0;
  box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.4);
  line-height: 1;
}
[data-theme="dark"] .archive-seal {
  box-shadow: inset 0 0 0 1px rgba(0, 0, 0, 0.3);
}

.archive-title-meta {
  flex: 1;
  min-width: 0;
}
.archive-title {
  font-family: var(--font-serif);
  font-size: 17.5px;
  font-weight: 600;
  color: var(--color-neutral-10);
  margin: 0;
  line-height: 1.35;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.archive-sub-meta {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 3px;
  font-size: var(--text-label-12, 12px);
  color: var(--color-neutral-6);
  flex-wrap: wrap;
}
.archive-subtitle {
  color: var(--color-neutral-7);
  max-width: 140px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.meta-dot {
  color: var(--color-neutral-4);
}
.archive-time-tag {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  color: var(--color-neutral-6);
  white-space: nowrap;
}
.clock-icon {
  color: var(--color-neutral-5);
  flex-shrink: 0;
}
.archive-author {
  color: var(--color-neutral-5);
}

.archive-badge-group {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
}
.role-badge {
  font-size: 11px;
  font-weight: 600;
  padding: 1px 7px;
  border-radius: 4px;
  line-height: 1.4;
}
.role-owner {
  color: var(--color-accent);
  background: var(--color-accent-muted);
  border: 1px solid var(--color-accent-muted);
}
.role-editor {
  color: var(--color-info);
  background: var(--color-info-muted);
  border: 1px solid var(--color-info-muted);
}
.role-viewer {
  color: var(--color-neutral-6);
  background: var(--color-neutral-2);
}
.role-default {
  color: var(--color-neutral-7);
  background: var(--color-neutral-2);
}
.archive-revision {
  font-size: 11px;
  font-family: var(--font-mono, monospace);
  color: var(--color-neutral-6);
  background: var(--color-neutral-2, rgba(0, 0, 0, 0.04));
  padding: 1px 6px;
  border-radius: 4px;
  border: 1px solid var(--color-card-stroke);
}

/* Tags Row */
.archive-tags {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
  margin-bottom: 8px;
}
.meta-tag {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 11.5px;
  font-weight: 500;
  padding: 2px 8px;
  border-radius: 4px;
  background: var(--color-neutral-2, rgba(0, 0, 0, 0.04));
  color: var(--color-neutral-7);
  border: 1px solid var(--color-card-stroke, rgba(0, 0, 0, 0.06));
  max-width: 140px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.meta-tag.origin-tag {
  color: var(--color-info);
  background: var(--color-info-muted);
}
.meta-tag.hall-tag {
  color: var(--color-accent);
  background: var(--color-accent-muted);
}

/* Description / Motto Wrap */
.archive-desc-wrap {
  flex: 1;
  min-height: 38px;
  display: flex;
  align-items: flex-start;
  margin-bottom: 10px;
}
.archive-desc {
  font-size: 12px;
  color: var(--color-neutral-6);
  margin: 0;
  line-height: 1.5;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  text-overflow: ellipsis;
}
.archive-desc.motto-desc {
  font-style: italic;
  font-family: var(--font-serif);
  color: var(--color-neutral-7);
}
.archive-desc.empty-desc-hint {
  font-size: 11.5px;
  color: var(--color-neutral-5);
  font-style: normal;
}

/* Footer: Primary Action & Tools */
.archive-foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-top: 12px;
  border-top: 1px solid var(--color-card-stroke, rgba(0, 0, 0, 0.06));
  gap: 10px;
}

/* Actions clusters */
.archive-actions {
  display: flex;
  align-items: center;
  gap: 4px;
  flex-shrink: 0;
}
.action-btn-cluster {
  display: flex;
  align-items: center;
  gap: 2px;
}
.action-cluster-separator {
  width: 1px;
  height: 14px;
  background: var(--color-card-stroke);
  margin: 0 4px;
}

/* Action buttons */
.action-btn {
  width: 28px;
  height: 28px;
  border: 1px solid transparent;
  background: transparent;
  color: var(--color-neutral-6);
  border-radius: 6px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all var(--duration-fast, 150ms) var(--ease-breath);
  flex-shrink: 0;
  box-sizing: border-box;
}
.action-btn svg {
  width: 13.5px;
  height: 13.5px;
}
.action-btn:hover {
  background: var(--color-neutral-3);
  color: var(--color-neutral-10);
  border-color: var(--color-card-stroke);
}
.action-btn:focus-visible {
  outline: 2px solid var(--color-accent);
  outline-offset: 1px;
  box-shadow: 0 0 0 2px var(--color-accent-muted);
}

/* Primary Enter Workbench Action Button */
.action-btn--primary {
  width: auto;
  height: 28px;
  padding: 0 10px;
  gap: 5px;
  border-radius: var(--radius-sm, 6px);
  background: var(--color-accent-muted, rgba(184, 51, 42, 0.08));
  color: var(--color-accent);
  border: 1px solid var(--color-accent-muted);
  font-size: var(--text-label-12, 12px);
  font-weight: 500;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  transition: all var(--duration-fast, 150ms) var(--ease-breath);
}
.action-btn--primary:hover {
  background: var(--color-accent);
  color: var(--color-text-on-accent, #fff);
  border-color: var(--color-accent);
}
.action-btn--primary svg {
  width: 13px;
  height: 13px;
}

.action-btn--danger:hover {
  background: var(--color-error-muted, rgba(239, 68, 68, 0.12));
  color: var(--color-error);
  border-color: var(--color-error-muted);
}
.action-btn--danger:focus-visible {
  outline: 2px solid var(--color-error);
  outline-offset: 1px;
  box-shadow: 0 0 0 2px var(--color-error-muted);
}

/* ── Delete Confirm ── */
.delete-overlay {
  position: absolute;
  inset: 0;
  background: rgba(255, 255, 255, 0.96);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;
  z-index: 10;
  border-radius: var(--radius-xl, 16px);
  padding: 20px;
}
[data-theme="dark"] .delete-overlay {
  background: var(--color-panel-bg);
}
.delete-overlay p {
  font-size: var(--text-copy-13, 13px);
  font-weight: 500;
  color: var(--color-neutral-9);
  margin: 0;
  text-align: center;
  max-width: 260px;
  line-height: 1.5;
}
.delete-btns {
  display: flex;
  gap: 10px;
}

/* ── Empty State ── */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 80px 40px;
  text-align: center;
}
.empty-seal {
  width: 72px;
  height: 72px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: var(--font-serif);
  font-size: 2.5rem;
  color: var(--color-accent);
  border: 2px solid currentColor;
  border-radius: 12px;
  opacity: 0.6;
  margin-bottom: 20px;
  box-shadow: inset 0 0 0 2px var(--color-card-fill);
}
.empty-title {
  font-family: var(--font-serif);
  font-size: 1.35rem;
  font-weight: 500;
  color: var(--color-neutral-9);
  margin: 0 0 8px;
}
.empty-desc {
  color: var(--color-neutral-6);
  font-size: 0.9rem;
  margin: 0 0 24px;
  max-width: 420px;
  line-height: 1.6;
}

/* ── Glass Modals ── */
.glass-modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.35);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: var(--z-modal, 1000);
  padding: 24px;
}
[data-theme="dark"] .glass-modal-overlay {
  background: var(--color-overlay, rgba(0, 0, 0, 0.65));
}

.glass-sheet {
  background: var(--color-panel-bg);
  border: 1px solid var(--color-card-stroke);
  border-radius: var(--radius-xl, 16px);
  width: 100%;
  max-width: 480px;
  padding: 28px;
  box-shadow: var(--shadow-whisper, 0 12px 36px rgba(0, 0, 0, 0.12));
  position: relative;
}
.glass-sheet.large {
  max-width: 660px;
}

.sheet-body {
  overflow-y: auto;
  max-height: 65vh;
}

.sheet-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
}
.sheet-title {
  font-family: var(--font-serif);
  font-size: var(--text-title-20, 20px);
  font-weight: 500;
  color: var(--color-neutral-10);
  margin: 0;
}
.sheet-close {
  width: 30px; height: 30px;
  border-radius: var(--radius-md, 8px);
  border: 1px solid var(--color-card-stroke);
  background: var(--color-neutral-2);
  color: var(--color-neutral-6);
  font-size: 18px;
  line-height: 1;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all var(--duration-fast) var(--ease-breath);
}
.sheet-close:hover {
  background: var(--color-neutral-9);
  color: var(--color-neutral-1);
  border-color: var(--color-neutral-9);
}

.glass-input-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-bottom: 18px;
}
.glass-input-group label {
  font-size: var(--text-label-12, 12px);
  font-weight: 500;
  color: var(--color-neutral-8);
  display: flex;
  align-items: center;
}
.label-hint {
  font-size: 11px;
  font-weight: normal;
  color: var(--color-neutral-5);
  margin-left: 6px;
}
.glass-input-group input,
.glass-input-group textarea {
  background: var(--color-neutral-2);
  border: 1px solid var(--color-card-stroke);
  border-radius: var(--radius-md, 8px);
  padding: 10px 14px;
  font-family: inherit;
  font-size: var(--text-copy-14, 14px);
  color: var(--color-neutral-9);
  outline: none;
  transition: border-color var(--duration-fast) var(--ease-breath), box-shadow var(--duration-fast) var(--ease-breath);
}
.glass-input-group input:focus,
.glass-input-group textarea:focus {
  border-color: var(--color-accent);
  box-shadow: 0 0 0 3px var(--color-accent-muted);
}

.grid-form {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0 16px;
}
.glass-input-group.full {
  grid-column: 1 / 3;
}

.sheet-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 20px;
}

.spinner {
  width: 44px;
  height: 44px;
  border: 3px solid rgba(0,0,0,0.1);
  border-top-color: var(--color-accent);
  border-radius: 50%;
  animation: spin 1s cubic-bezier(0.16, 1, 0.3, 1) infinite;
}
[data-theme="dark"] .spinner {
  border-color: rgba(255,255,255,0.1);
  border-top-color: var(--color-accent);
}
@keyframes spin {
  to { transform: rotate(360deg); }
}

/* Transitions */
.fade-enter-active, .fade-leave-active { transition: opacity 0.25s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; }

.sheet-slide-enter-active, .sheet-slide-leave-active {
  transition: opacity 0.3s ease, transform 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}
.sheet-slide-enter-from { opacity: 0; transform: translateY(24px) scale(0.97); }
.sheet-slide-leave-to { opacity: 0; transform: translateY(16px) scale(0.98); }

@media (max-width: 768px) {
  .archive-header-row {
    flex-direction: column;
    align-items: stretch;
  }
  .list-toolbar {
    flex-direction: column;
    align-items: stretch;
  }
  .search-box {
    max-width: 100%;
    min-width: unset;
  }
  .toolbar-controls {
    justify-content: space-between;
  }
  .grid-form {
    grid-template-columns: 1fr;
  }
  .glass-input-group.full {
    grid-column: 1 / 2;
  }
}
</style>
