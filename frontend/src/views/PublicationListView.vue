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
import { useFeedback } from '../composables/useFeedback'
const router = useRouter()
const feedback = useFeedback()
const { lexicon } = useLexiconStore()
const publicationsQuote = computed(() => lexicon.publications.quote.replace(/\\n/g, '<br/>'))

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

function openActivity(pubId: number) {
  router.push({ name: 'publication-activity', params: { id: pubId } })
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

function getSurnameSeal(title: string): string {
  if (!title) return '谱'
  const match = title.match(/^([\u4e00-\u9fa5]{1,4})[氏族谱图卷表录]/)
  if (match && match[1]) {
    return match[1].charAt(0)
  }
  const clean = title.replace(/[^\u4e00-\u9fa5]/g, '')
  return clean.charAt(0) || '谱'
}

function getAccessRoleLabel(role?: string): string {
  switch (role) {
    case 'OWNER': return '所有者'
    case 'EDITOR': return '编委'
    case 'VIEWER': return '查阅'
    default: return '档案'
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
          <button class="btn btn--primary" @click="showCreateDialog = true">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
            新建宗谱存档
          </button>
        </template>
      </PoeticHeader>

      <div v-if="loading" class="loading-state">
        <div class="spinner"></div>
        <p>正在开启藏经阁...</p>
      </div>

      <div v-else>
        <div class="publication-grid">
          <!-- Template Section (Built-in) -->
          <section class="gallery-section">
            <div class="section-eyebrow">
              <span class="dot-ember"></span> 经典王朝世系模板
            </div>
            <div class="template-grid">
              <div v-for="sample in builtinSamples" :key="sample.id" class="panel-glass template-card" @click="handleViewSample(sample)">
                <div class="template-bg"></div>
                <div class="template-header-seal">
                  <span>{{ getSurnameSeal(sample.publication.title) }}</span>
                </div>
                <div class="template-content">
                  <h3 class="template-title">{{ sample.publication.title }}</h3>
                  <p class="template-subtitle">{{ sample.publication.subtitle }}</p>
                </div>
                <div class="template-action" v-if="cloningSampleId !== sample.id">
                  开卷拓印 <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M5 12h14M12 5l7 7-7 7" /></svg>
                </div>
                <div class="template-action cloning" v-else>
                  拓印中...
                </div>
              </div>
            </div>
          </section>

          <div v-if="publications.length === 0" class="empty-state">
            <div class="empty-seal">空</div>
            <h3 class="empty-title">书卷空余，待君挥墨</h3>
            <p class="empty-desc">尚未收录任何宗族典藏，您可以开宗立派，或从上方经典模板中演化。</p>
            <div class="empty-actions">
              <button class="btn btn--primary" @click="showCreateDialog = true">新建宗谱存档</button>
            </div>
          </div>

          <!-- Archive Section -->
          <section v-else class="gallery-section">
            <div class="section-eyebrow">
              <span class="dot-ink"></span> 私人研究档案
            </div>

            <div class="archive-grid">
              <article v-for="pub in publications" :key="pub.id" class="panel-glass archive-card" @click="openPublication(pub.id)">
                <!-- Book Header Banner with Seal Crest & Role Badge -->
                <div class="archive-header-banner">
                  <div class="spine-decor"></div>
                  <div class="surname-seal" title="典藏金石印章">
                    <span>{{ getSurnameSeal(pub.title) }}</span>
                  </div>
                  <div class="role-badge" :class="pub.accessRole ? pub.accessRole.toLowerCase() : 'owner'">
                    {{ getAccessRoleLabel(pub.accessRole) }}
                  </div>
                </div>

                <div class="archive-body">
                  <div class="title-row">
                    <h3 class="archive-title">{{ pub.title || '未命名宗谱' }}</h3>
                    <span class="revision-chip">v{{ pub.revision }}</span>
                  </div>
                  <p v-if="pub.subtitle" class="archive-subtitle">{{ pub.subtitle }}</p>

                  <!-- Meta Tags: Hall name & Ancestral Origin -->
                  <div class="archive-tags" v-if="pub.info?.hallName || pub.info?.ancestralOrigin">
                    <span v-if="pub.info?.hallName" class="meta-tag hall-tag">
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 21h18M3 10h18M5 6l7-3 7 3M4 10v11M20 10v11" /></svg>
                      {{ pub.info.hallName }}
                    </span>
                    <span v-if="pub.info?.ancestralOrigin" class="meta-tag origin-tag">
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2a8 8 0 0 0-8 8c0 5.25 8 12 8 12s8-6.75 8-12a8 8 0 0 0-8-8z"/><circle cx="12" cy="10" r="3"/></svg>
                      {{ pub.info.ancestralOrigin }}
                    </span>
                  </div>

                  <p v-if="pub.info?.description" class="archive-desc">{{ pub.info.description }}</p>
                </div>

                <div class="archive-foot">
                  <div class="archive-date-info">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                    <span>{{ formatDate(pub.updatedAt) }}</span>
                  </div>
                  <div class="archive-actions">
                    <button class="action-btn" title="编辑属性" @click.stop="openEditDialog(pub)">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
                    </button>
                    <button class="action-btn" title="协作者管理" @click.stop="openCollabDialog(pub.id)">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 1 0 7.75" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>
                    </button>
                    <button class="action-btn" title="分享链接" @click.stop="openShareDialog(pub.id)">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" /><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" /></svg>
                    </button>
                    <button class="action-btn action-btn--danger" title="删除档案" @click.stop="deleteConfirmId = pub.id">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></svg>
                    </button>
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
      </div>

      <!-- Modals: Glass Sheets -->
      <Teleport to="body">
        <!-- Create Archive Sheet -->
        <transition name="sheet-slide">
          <div v-if="showCreateDialog" class="glass-modal-overlay" role="dialog" aria-modal="true" aria-label="新建宗谱存档" @click.self="showCreateDialog = false" @keydown.escape="showCreateDialog = false">
            <div class="glass-sheet">
              <header class="sheet-header">
                <h2 class="sheet-title">开宗立派</h2>
                <button class="sheet-close" @click="showCreateDialog = false">&times;</button>
              </header>
              <div class="sheet-body">
                <div class="glass-input-group">
                  <label>宗谱名称 TITLE</label>
                  <input v-model="newTitle" type="text" placeholder="例: 陇西李氏世系图" @keyup.enter="handleCreate" />
                </div>
                <div class="glass-input-group">
                  <label>修谱卷号 SUBTITLE</label>
                  <input v-model="newSubtitle" type="text" placeholder="例: 丙午年重修版" @keyup.enter="handleCreate" />
                </div>
              </div>
              <footer class="sheet-footer">
                <button class="btn" @click="showCreateDialog = false">取消</button>
                <button class="btn btn--primary" :disabled="creating" @click="handleCreate">{{ creating ? '创建中...' : '建档立案' }}</button>
              </footer>
            </div>
          </div>
        </transition>

        <!-- Edit Metadata Sheet -->
        <transition name="sheet-slide">
          <div v-if="showEditDialog" class="glass-modal-overlay" role="dialog" aria-modal="true" aria-label="修缮档案属性" @click.self="showEditDialog = false" @keydown.escape="showEditDialog = false">
            <div class="glass-sheet large">
              <header class="sheet-header">
                <h2 class="sheet-title">修缮档案属性</h2>
                <button class="sheet-close" @click="showEditDialog = false">&times;</button>
              </header>
              <div class="sheet-body grid-form">
                <div class="glass-input-group">
                  <label>宗谱名称 TITLE</label>
                  <input v-model="editForm.title" type="text" />
                </div>
                <div class="glass-input-group">
                  <label>修谱卷号 SUBTITLE</label>
                  <input v-model="editForm.subtitle" type="text" />
                </div>
                <div class="glass-input-group">
                  <label>郡望/祖籍 ORIGIN</label>
                  <input v-model="editForm.ancestralOrigin" type="text" placeholder="例: 陇西/颍川" />
                </div>
                <div class="glass-input-group">
                  <label>家族堂号 HALL NAME</label>
                  <input v-model="editForm.hallName" type="text" placeholder="例: 三槐堂" />
                </div>
                <div class="glass-input-group full">
                  <label>传世家训 FAMILY MOTTO</label>
                  <textarea v-model="editForm.familyMotto" rows="2" placeholder="例: 诗书传家，忠厚继世"></textarea>
                </div>
                <div class="glass-input-group full">
                  <label>宗谱总序 DESCRIPTION</label>
                  <textarea v-model="editForm.description" rows="3" placeholder="记述家族源流与修谱历程..."></textarea>
                </div>
              </div>
              <footer class="sheet-footer">
                <button class="btn" @click="showEditDialog = false">放弃修改</button>
                <button class="btn btn--primary" :disabled="saving" @click="handleEditSave">{{ saving ? '保存中...' : '封装保存' }}</button>
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

/* ── Sections ── */
.gallery-section {
  margin-bottom: 3rem;
}
.section-eyebrow {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: var(--text-label-12, 12px);
  font-weight: 600;
  letter-spacing: 0.12em;
  color: var(--color-neutral-6);
  margin-bottom: 1.25rem;
  text-transform: uppercase;
}
.dot-ember { width: 6px; height: 6px; border-radius: 50%; background: var(--color-accent); }
.dot-ink { width: 6px; height: 6px; border-radius: 50%; background: var(--color-info); }

/* ── Glass Cards Base ── */
.panel-glass {
  border-radius: var(--radius-2xl, 20px);
  overflow: hidden;
  position: relative;
  background: var(--color-panel-glass-bg, var(--color-panel-bg));
  border: 1px solid var(--color-card-stroke);
  box-shadow: var(--shadow-whisper);
  transition: transform var(--duration-fast, 150ms) var(--ease-breath),
              box-shadow var(--duration-fast, 150ms) var(--ease-breath),
              border-color var(--duration-fast, 150ms) var(--ease-breath);
  cursor: pointer;
}
.panel-glass:hover {
  transform: translateY(-4px) scale(1.012);
  box-shadow: var(--shadow-whisper), var(--shadow-accent);
  border-color: var(--color-accent);
}

/* ── Template Grid ── */
.template-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(290px, 1fr));
  gap: 20px;
}
.template-card {
  padding: 18px 20px;
  display: flex;
  flex-direction: column;
  height: 155px;
  justify-content: space-between;
  position: relative;
}
.template-bg {
  position: absolute;
  inset: 0;
  background: radial-gradient(circle at top right, var(--color-accent-muted, rgba(37, 99, 235, 0.08)), transparent 60%);
  pointer-events: none;
}
.template-header-seal {
  position: absolute;
  right: 18px;
  top: 18px;
  width: 32px;
  height: 32px;
  border-radius: var(--radius-md);
  background: var(--color-accent-gradient);
  color: var(--color-text-on-accent, #ffffff);
  font-family: var(--font-serif);
  font-size: 15px;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: var(--shadow-whisper);
  opacity: 0.85;
}
.template-content {
  position: relative;
  z-index: 1;
  padding-right: 40px;
}
.template-title {
  font-family: var(--font-serif);
  font-size: var(--text-title-18, 18px);
  margin: 0 0 4px;
  color: var(--color-neutral-9);
  font-weight: 600;
}
.template-subtitle {
  font-size: var(--text-copy-13, 13px);
  color: var(--color-neutral-6);
  margin: 0;
}
.template-action {
  position: relative;
  z-index: 1;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 4px;
  font-size: var(--text-label-12, 12px);
  font-weight: 600;
  color: var(--color-accent);
  transition: all var(--duration-fast) var(--ease-breath);
}

/* ── Archive Grid ── */
.archive-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 22px;
}
.archive-card {
  display: flex;
  flex-direction: column;
  padding: 0;
  min-height: 200px;
  box-sizing: border-box;
}

/* Card Banner */
.archive-header-banner {
  height: 46px;
  background: linear-gradient(90deg, var(--color-accent-muted, rgba(37, 99, 235, 0.08)), transparent);
  border-bottom: 1px solid var(--color-card-stroke);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 16px;
  position: relative;
}

.spine-decor {
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 4px;
  background: var(--color-accent-gradient);
}

.surname-seal {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: var(--radius-sm);
  background: var(--color-accent-gradient);
  color: var(--color-text-on-accent, #ffffff);
  font-family: var(--font-serif);
  font-size: 14px;
  font-weight: 700;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.15);
  margin-left: 4px;
}

.role-badge {
  font-size: 11px;
  font-weight: 600;
  padding: 2px 8px;
  border-radius: 999px;
  background: var(--color-neutral-3);
  color: var(--color-neutral-7);
}

.role-badge.owner {
  background: var(--color-accent-muted);
  color: var(--color-accent);
}

.role-badge.editor {
  background: var(--color-info-muted);
  color: var(--color-info);
}

/* Card Body */
.archive-body {
  flex: 1;
  padding: 14px 18px 10px;
  display: flex;
  flex-direction: column;
}

.title-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 2px;
}

.archive-title {
  font-family: var(--font-serif);
  font-size: var(--text-title-18, 18px);
  font-weight: 600;
  color: var(--color-neutral-10);
  margin: 0;
  line-height: 1.3;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.revision-chip {
  font-size: 11px;
  font-family: var(--font-mono, monospace);
  font-weight: 500;
  color: var(--color-neutral-6);
  background: var(--color-neutral-3);
  padding: 1px 6px;
  border-radius: var(--radius-sm);
  flex-shrink: 0;
}

.archive-subtitle {
  font-size: var(--text-copy-13, 13px);
  color: var(--color-neutral-6);
  margin: 0 0 10px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.archive-tags {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
  margin-bottom: 8px;
}

.meta-tag {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 11px;
  font-weight: 500;
  background: var(--color-neutral-3);
  padding: 3px 8px;
  border-radius: var(--radius-sm);
  color: var(--color-neutral-7);
}

.meta-tag.hall-tag {
  background: var(--color-accent-muted);
  color: var(--color-accent);
}

.meta-tag.origin-tag {
  background: var(--color-info-muted);
  color: var(--color-info);
}

.archive-desc {
  font-size: 12px;
  color: var(--color-neutral-6);
  margin: 0;
  line-height: 1.4;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

/* Card Foot */
.archive-foot {
  padding: 10px 16px;
  border-top: 1px solid var(--color-card-stroke);
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: rgba(0, 0, 0, 0.015);
}

.archive-date-info {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 11px;
  color: var(--color-neutral-6);
}

.archive-actions {
  display: flex;
  align-items: center;
  gap: 6px;
}

/* ── Action buttons ── */
.action-btn {
  width: 30px;
  height: 30px;
  border: 1px solid var(--color-neutral-4);
  background: var(--color-neutral-2);
  color: var(--color-neutral-6);
  border-radius: var(--radius-md);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all var(--duration-fast) var(--ease-breath);
  flex-shrink: 0;
  box-sizing: border-box;
}
.action-btn svg {
  width: 14px; height: 14px;
}
.action-btn:hover {
  background: var(--color-accent);
  color: var(--color-text-on-accent, #fff);
  border-color: var(--color-accent);
  transform: translateY(-1px);
}
.action-btn--danger:hover {
  background: var(--color-error);
  color: #fff;
  border-color: var(--color-error);
}

/* ── Delete Confirm ── */
.delete-overlay {
  position: absolute;
  inset: 0;
  background: var(--color-panel-glass-bg, rgba(255, 255, 255, 0.96));
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 20px;
  z-index: 10;
  border-radius: var(--radius-2xl, 20px);
}
.delete-overlay p {
  font-size: var(--text-copy-14);
  font-weight: 500;
  color: var(--color-neutral-9);
  margin: 0;
  text-align: center;
  max-width: 260px;
  line-height: 1.6;
}
.delete-btns {
  display: flex;
  gap: 12px;
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
  width: 80px;
  height: 80px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: var(--font-serif);
  font-size: 3rem;
  color: var(--color-accent);
  border: 3px solid currentColor;
  border-radius: 12px;
  opacity: 0.5;
  margin-bottom: 24px;
  box-shadow: inset 0 0 0 2px var(--color-card-fill);
}
.empty-title {
  font-family: var(--font-serif);
  font-size: 1.4rem;
  font-weight: 500;
  color: var(--color-neutral-9);
  margin: 0 0 8px;
}
.empty-desc {
  color: var(--color-neutral-6);
  font-size: 0.9rem;
  margin: 0 0 24px;
}

/* ── Glass Modals ── */
.glass-modal-overlay {
  position: fixed;
  inset: 0;
  background: var(--color-overlay, rgba(15, 23, 42, 0.35));
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: var(--z-modal);
  padding: 24px;
}

.glass-sheet {
  background: var(--color-panel-bg);
  border: 1px solid var(--color-card-stroke);
  border-radius: var(--radius-2xl);
  width: 100%;
  max-width: 480px;
  padding: 32px;
  box-shadow: var(--shadow-whisper);
  position: relative;
}
.glass-sheet.large {
  max-width: 680px;
}

.sheet-body {
  overflow-y: auto;
  max-height: 65vh;
}

.sheet-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 28px;
}
.sheet-title {
  font-family: var(--font-serif);
  font-size: var(--text-title-24);
  font-weight: 500;
  color: var(--color-neutral-10);
  margin: 0;
}
.sheet-close {
  width: 32px; height: 32px;
  border-radius: var(--radius-md);
  border: 1px solid var(--color-neutral-4);
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
  gap: 8px;
  margin-bottom: 20px;
}
.glass-input-group label {
  font-size: var(--text-label-12);
  font-weight: 500;
  letter-spacing: 0.08em;
  color: var(--color-neutral-6);
  text-transform: uppercase;
}
.glass-input-group input,
.glass-input-group textarea {
  background: var(--color-neutral-2);
  border: 1px solid var(--color-neutral-4);
  border-radius: var(--radius-lg);
  padding: 12px 16px;
  font-family: inherit;
  font-size: var(--text-copy-14);
  color: var(--color-neutral-9);
  outline: none;
  transition: border-color var(--duration-fast) var(--ease-breath);
}
.glass-input-group input:focus,
.glass-input-group textarea:focus {
  border-color: var(--color-neutral-8);
}

.grid-form {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0 20px;
}
.glass-input-group.full {
  grid-column: 1 / 3;
}

.sheet-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 24px;
}

.spinner {
  width: 48px;
  height: 48px;
  border: 3px solid rgba(0,0,0,0.1);
  border-top-color: var(--color-accent);
  border-radius: 50%;
  animation: spin 1s cubic-bezier(0.16, 1, 0.3, 1) infinite;
}
@keyframes spin {
  to { transform: rotate(360deg); }
}

/* Transitions */
.fade-enter-active, .fade-leave-active { transition: opacity 0.3s; }
.fade-enter-from, .fade-leave-to { opacity: 0; }

.sheet-slide-enter-active, .sheet-slide-leave-active {
  transition: opacity 0.4s ease, transform 0.4s cubic-bezier(0.16, 1, 0.3, 1);
}
.sheet-slide-enter-from { opacity: 0; transform: translateY(40px) scale(0.95); }
.sheet-slide-leave-to { opacity: 0; transform: translateY(20px) scale(0.98); }

@media (max-width: 768px) {
  .archive-card { flex-direction: column; }
  .grid-form { grid-template-columns: 1fr; }
  .glass-input-group.full { grid-column: 1 / 2; }
}
</style>


