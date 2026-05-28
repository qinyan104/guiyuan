<script setup lang="ts">
import { onMounted, ref } from 'vue'
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
import { useLexicon } from '../composables/useLexicon'
import FeedbackStrip from '../components/FeedbackStrip.vue'
import { useFeedback } from '../composables/useFeedback'
import { getPublicationActivityCardSummary } from '../lib/publicationActivity'

const router = useRouter()
const feedback = useFeedback()
const { lexicon } = useLexicon()

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
  if (!editingId.value) return

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
  }
}

async function handleCreate() {
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
  try {
    await deletePublication(id)
    publications.value = publications.value.filter((p) => p.id !== id)
    deleteConfirmId.value = null
  } catch (err: any) {
    alert('删除失败: ' + (err?.response?.data?.message || err.message || '未知错误'))
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
    console.error('[template clone] failed:', err)
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
      <header class="poetic-header">
        <div class="poetic-header__main">
          <div class="poetic-eyebrow">{{ lexicon.publications.headerEyebrow }}</div>
          <h1 class="poetic-title">{{ lexicon.publications.headerTitle }}<span class="text-italic">{{ lexicon.publications.headerTitleItalic }}</span></h1>
        </div>
        
        <div class="poetic-header__extra" style="display: flex; justify-content: space-between; align-items: center; gap: 2rem;">
          <p class="poetic-quote" v-html="lexicon.publications.quote.replace(/\\n/g, '<br/>')"></p>
          <button class="glass-pill-btn primary-action" @click="showCreateDialog = true">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
            新建宗谱存档
          </button>
        </div>
      </header>

      <div v-if="loading" class="loading-state">
        <div class="spinner"></div>
        <p>正在开启藏经阁...</p>
      </div>

      <div v-else>
        <div class="publication-grid">
          <!-- Template Section (Built-in) - Moved outside of the empty-state conditional for better discovery -->
          <section class="gallery-section">
            <div class="section-eyebrow">
              <span class="dot-ember"></span> 经典王朝世系模板
            </div>
            <div class="template-grid">
              <div v-for="sample in builtinSamples" :key="sample.id" class="glass-card template-card" @click="handleViewSample(sample)">
                <div class="template-bg"></div>
                <div class="template-content">
                  <h3 class="template-title">{{ sample.publication.title }}</h3>
                  <p class="template-subtitle">{{ sample.publication.subtitle }}</p>
                </div>
                <div class="template-action" v-if="cloningSampleId !== sample.id">
                  打开此谱 <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M5 12h14M12 5l7 7-7 7" /></svg>
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
              <button class="bento-btn primary" @click="showCreateDialog = true">新建宗谱存档</button>
            </div>
          </div>

          <!-- Archive Section -->
          <section v-else class="gallery-section">
            <div class="section-eyebrow">
              <span class="dot-ink"></span> 私人研究档案
            </div>

            <div class="archive-grid">
              <article v-for="pub in publications" :key="pub.id" class="glass-card archive-card" @click="openPublication(pub.id)">
                <!-- Visual Left Pane -->
                <div class="archive-visual">
                  <div class="visual-meta">第{{ pub.id }}卷</div>
                  <div class="visual-title-vertical">{{ pub.title?.substring(0, 6) || '未命名' }}</div>
                  <div class="visual-spine-line"></div>
                </div>

                <!-- Content Right Pane -->
                <div class="archive-details">
                  <div class="archive-main">
                    <h3 class="archive-title">{{ pub.title || '未命名宗谱' }}</h3>
                    <p class="archive-subtitle">{{ pub.subtitle || '暂无副标题' }}</p>
                    <div class="archive-tags">
                      <span v-if="pub.info?.hallName" class="meta-tag">{{ pub.info.hallName }}</span>
                      <span v-if="pub.info?.ancestralOrigin" class="meta-tag"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" /></svg> {{ pub.info.ancestralOrigin }}</span>
                    </div>
                    <button
                      v-if="pub.lastUpdatedBy || pub.lastActivityAction"
                      class="latest-activity"
                      type="button"
                      data-testid="latest-activity-link"
                      @click.stop="openActivity(pub.id)"
                    >
                      <span class="latest-activity__label">最近动态</span>
                      <span class="latest-activity__body">
                        <strong>协作动态</strong>
                        <span>{{ getPublicationActivityCardSummary(pub.lastUpdatedBy, pub.lastActivityAction) }}</span>
                        <small>查看修订志</small>
                      </span>
                    </button>
                  </div>

                  <div class="archive-footer">
                    <span class="archive-date">{{ formatDate(pub.updatedAt) }} 更新</span>
                    <div class="archive-actions" @click.stop>
                      <button class="icon-btn" title="出版工作室" @click="router.push(`/publishing/publication/${pub.id}`)">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>
                      </button>
                      <button class="icon-btn" title="编辑属性" @click="openEditDialog(pub)">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
                      </button>
                      <button class="icon-btn" title="协作者管理" @click="openCollabDialog(pub.id)">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>
                      </button>
                      <button class="icon-btn" title="分享链接" @click="openShareDialog(pub.id)">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" /><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" /></svg>
                      </button>
                      <button class="icon-btn danger" title="焚毁档案" @click="deleteConfirmId = pub.id">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></svg>
                      </button>
                    </div>
                  </div>
                </div>

                <!-- Delete Confirm Overlay -->
                <transition name="fade">
                  <div v-if="deleteConfirmId === pub.id" class="delete-overlay" @click.stop>
                    <p>焚毁此宗谱将彻底抹除数据，是否确认？</p>
                    <div class="delete-btns">
                      <button class="glass-pill-btn danger" @click="handleDelete(pub.id)">确认焚毁</button>
                      <button class="glass-pill-btn" @click="deleteConfirmId = null">暂且保留</button>
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
          <div v-if="showCreateDialog" class="glass-modal-overlay" @click.self="showCreateDialog = false">
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
                <button class="glass-pill-btn" @click="showCreateDialog = false">取消</button>
                <button class="glass-pill-btn primary" @click="handleCreate">建档立案</button>
              </footer>
            </div>
          </div>
        </transition>

        <!-- Edit Metadata Sheet -->
        <transition name="sheet-slide">
          <div v-if="showEditDialog" class="glass-modal-overlay" @click.self="showEditDialog = false">
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
                <button class="glass-pill-btn" @click="showEditDialog = false">放弃修改</button>
                <button class="glass-pill-btn primary" @click="handleEditSave">封装保存</button>
              </footer>
            </div>
          </div>
        </transition>

        <!-- Collaborator Manager Sheet -->
        <transition name="sheet-slide">
          <div v-if="showCollabDialog && collabDialogPubId" class="glass-modal-overlay" @click.self="showCollabDialog = false">
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
          <div v-if="showShareDialog && shareDialogPubId" class="glass-modal-overlay" @click.self="showShareDialog = false">
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

/* ── Header ── */
.gallery-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  margin-bottom: 2.5rem;
  padding: 0 8px;
}
.header-meta {
  font-family: monospace;
  font-size: 0.75rem;
  letter-spacing: 0.2em;
  color: var(--color-neutral-6);
  margin-bottom: 0.5rem;
  text-transform: uppercase;
}
.header-title {
  font-size: 2.5rem;
  font-family: 'Noto Serif SC', serif;
  font-weight: 500;
  color: var(--color-neutral-9);
  margin: 0 0 0.5rem;
  letter-spacing: 0.05em;
}
.header-desc {
  font-size: 0.95rem;
  color: var(--color-neutral-6);
  margin: 0;
}
.header-right {
  margin-bottom: 0.5rem;
}

/* ── Glass Pill Button ── */
.glass-pill-btn {
  background: var(--color-card-fill);
  border: 1px solid var(--color-card-stroke);
  border-radius: 999px;
  padding: 0.6rem 1.5rem;
  font-size: 0.9rem;
  font-weight: 500;
  color: var(--color-neutral-9);
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  backdrop-filter: blur(12px) saturate(150%);
  -webkit-backdrop-filter: blur(12px) saturate(150%);
  box-shadow: 0 4px 12px rgba(0,0,0,0.05);
  transition: all 0.2s ease;
}
.glass-pill-btn:hover {
  background: var(--bg-panel, #fff);
  border-color: var(--color-neutral-9);
  transform: translateY(-2px);
  box-shadow: 0 8px 16px rgba(0,0,0,0.08);
}
.glass-pill-btn.primary {
  background: var(--color-neutral-9);
  color: var(--bg-shell, #fff);
  border-color: transparent;
}
.glass-pill-btn.primary:hover {
  opacity: 0.85;
  box-shadow: var(--shadow-whisper);
}
.glass-pill-btn.danger {
  background: #ff4704;
  color: #fff;
  border-color: transparent;
}

[data-theme="dark"] .glass-pill-btn,
[data-theme="dark"] .glass-pill-btn {
  background: rgba(0,0,0,0.4);
  border-color: rgba(255,255,255,0.1);
  color: #fff;
}
[data-theme="dark"] .glass-pill-btn:hover,
[data-theme="dark"] .glass-pill-btn:hover {
  background: #fff;
  color: #000;
}
[data-theme="dark"] .glass-pill-btn.primary,
[data-theme="dark"] .glass-pill-btn.primary {
  background: linear-gradient(135deg, var(--color-neutral-8), var(--color-accent));
  color: #fff;
}

/* ── Sections ── */
.gallery-section {
  margin-bottom: 3rem;
}
.section-eyebrow {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.8rem;
  font-weight: 500;
  letter-spacing: 0.15em;
  color: var(--color-neutral-6);
  margin-bottom: 1.5rem;
  text-transform: uppercase;
}
.dot-ember { width: 6px; height: 6px; border-radius: 50%; background: var(--color-accent); }
.dot-ink { width: 6px; height: 6px; border-radius: 50%; background: var(--color-info); }

/* ── Glass Cards ── */
.glass-card {
  background: var(--color-card-fill);
  border: 1px solid var(--color-card-stroke);
  border-radius: 20px;
  overflow: hidden;
  box-shadow: 
    0 12px 32px -12px rgba(0,0,0,0.05),
    inset 0 0 0 1px var(--color-neutral-4);
  backdrop-filter: blur(24px) saturate(150%);
  -webkit-backdrop-filter: blur(24px) saturate(150%);
  position: relative;
  transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.3s ease;
  cursor: pointer;
}
.glass-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 24px 48px -12px rgba(0,0,0,0.1);
}
[data-theme="dark"] .glass-card,
[data-theme="dark"] .glass-card {
  background: rgba(0, 0, 0, 0.2);
  border-color: rgba(255, 255, 255, 0.06);
  box-shadow: inset 0 0 0 1px rgba(0,0,0,0.4);
}

/* ── Template Grid ── */
.template-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 20px;
}
.template-card {
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
  height: 140px;
  justify-content: space-between;
}
.template-bg {
  position: absolute;
  inset: 0;
  background: linear-gradient(135deg, rgba(255,255,255,0.1), transparent);
  pointer-events: none;
}
.template-content {
  position: relative;
  z-index: 1;
}
.template-title {
  font-family: 'Noto Serif SC', serif;
  font-size: 1.3rem;
  margin: 0 0 0.25rem;
  color: var(--color-neutral-9);
  font-weight: 500;
}
.template-subtitle {
  font-size: 0.8rem;
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
  font-size: 0.75rem;
  font-weight: 500;
  color: var(--color-accent);
  opacity: 0;
  transform: translateX(-10px);
  transition: all 0.3s ease;
}
.template-card:hover .template-action {
  opacity: 1;
  transform: translateX(0);
}

/* ── Archive Grid ── */
.archive-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(360px, 1fr));
  gap: 24px;
}
.archive-card {
  display: flex;
  flex-direction: row;
  min-height: 180px;
}
.archive-visual {
  width: 64px;
  background: linear-gradient(to right, rgba(255,255,255,0.05), transparent 10%, transparent 90%, rgba(0,0,0,0.2)), var(--color-neutral-9);
  color: var(--bg-panel, #fff);
  display: flex;
  flex-direction: column;
  justify-content: flex-start;
  align-items: center;
  padding: 1.5rem 0;
  flex-shrink: 0;
  border-right: 2px solid rgba(0,0,0,0.2);
  position: relative;
}
.visual-spine-line {
  position: absolute;
  right: 6px;
  top: 15%;
  bottom: 15%;
  width: 1px;
  background: transparent;
  border-top: 8px solid var(--color-accent);
  border-bottom: 8px solid var(--color-accent);
}
.visual-meta {
  font-family: 'Noto Serif SC', serif;
  font-size: 0.8rem;
  letter-spacing: 0.1em;
  opacity: 0.8;
  writing-mode: vertical-rl;
  margin-bottom: 1rem;
}
.visual-title-vertical {
  writing-mode: vertical-rl;
  font-family: 'Noto Serif SC', serif;
  font-size: 1.1rem;
  font-weight: 500;
  letter-spacing: 0.3em;
  color: var(--bg-panel, #fff);
  z-index: 1;
}
.archive-details {
  flex: 1;
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}
.archive-title {
  font-family: 'Noto Serif SC', serif;
  font-size: 1.4rem;
  font-weight: 500;
  color: var(--color-neutral-9);
  margin: 0 0 0.3rem;
}
.archive-subtitle {
  font-size: 0.85rem;
  color: var(--color-neutral-6);
  margin: 0 0 1rem;
}
.archive-tags {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.latest-activity {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  margin-top: 14px;
  padding: 8px 10px;
  border: 1px solid var(--color-neutral-5);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.42);
  color: var(--color-neutral-6);
  cursor: pointer;
  text-align: left;
  font: inherit;
  transition: all 0.2s ease;
}

.latest-activity:hover {
  border-color: var(--color-accent);
  background: rgba(169, 110, 53, 0.1);
  color: var(--color-neutral-9);
}

.latest-activity__label {
  flex: 0 0 auto;
  color: var(--color-accent);
  font-size: 0.7rem;
  font-weight: 800;
}

.latest-activity__body {
  display: inline-flex;
  flex-wrap: wrap;
  gap: 6px;
  min-width: 0;
  font-size: 0.78rem;
  font-weight: 500;
}

.latest-activity__body strong {
  color: var(--color-neutral-9);
}

.latest-activity__body small {
  color: var(--color-accent);
  font-size: 0.72rem;
  font-weight: 800;
}

.meta-tag {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 0.7rem;
  font-weight: 500;
  background: rgba(0,0,0,0.04);
  padding: 4px 8px;
  border-radius: 6px;
  color: var(--text-sub);
}
[data-theme="dark"] .meta-tag,
[data-theme="dark"] .meta-tag {
  background: rgba(255,255,255,0.08);
}
.archive-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 1rem;
  padding-top: 1rem;
  border-top: 1px dashed var(--border-color, rgba(0,0,0,0.1));
}
.archive-date {
  font-family: monospace;
  font-size: 0.75rem;
  color: var(--color-neutral-6);
}
.archive-actions {
  display: flex;
  gap: 4px;
}
.icon-btn {
  width: 32px;
  height: 32px;
  border: none;
  background: transparent;
  color: var(--color-neutral-6);
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s;
}
.icon-btn:hover {
  background: rgba(0,0,0,0.05);
  color: var(--color-neutral-9);
}
.icon-btn.danger:hover {
  background: rgba(255, 71, 4, 0.1);
  color: #ff4704;
}

/* ── Delete Confirm ── */
.delete-overlay {
  position: absolute;
  inset: 0;
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(8px);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;
  z-index: 10;
}
[data-theme="dark"] .delete-overlay,
[data-theme="dark"] .delete-overlay {
  background: rgba(0, 0, 0, 0.95);
}
.delete-overlay p {
  font-size: 0.9rem;
  font-weight: 500;
  color: #ff4704;
  margin: 0;
}
.delete-btns {
  display: flex;
  gap: 12px;
}

.empty-gallery {
  padding: 4rem 2rem;
  text-align: center;
  color: var(--color-neutral-6);
  font-size: 0.9rem;
  border: 1px dashed var(--border-color, rgba(0,0,0,0.2));
  border-radius: 20px;
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
  font-family: 'Noto Serif SC', serif;
  font-size: 3rem;
  color: var(--color-accent);
  border: 3px solid currentColor;
  border-radius: 12px;
  opacity: 0.5;
  margin-bottom: 24px;
  box-shadow: inset 0 0 0 2px var(--color-card-fill);
}
.empty-title {
  font-family: 'Noto Serif SC', serif;
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

/* ── Bento Button ── */
.bento-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  border-radius: 999px;
  font-size: 0.85rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  border: none;
}
.bento-btn.primary {
  background: var(--color-neutral-9);
  color: var(--bg-panel, #fff);
  box-shadow: 0 4px 12px rgba(0,0,0,0.1);
}
.bento-btn.primary:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-whisper);
}

/* ── Glass Modals ── */
.glass-modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(255, 255, 255, 0.3);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2000;
  padding: 24px;
}
[data-theme="dark"] .glass-modal-overlay,
[data-theme="dark"] .glass-modal-overlay {
  background: rgba(0, 0, 0, 0.5);
}

.glass-sheet {
  background: var(--color-card-fill);
  border: 1px solid var(--color-card-stroke);
  border-radius: 28px;
  width: 100%;
  max-width: 480px;
  padding: 32px;
  box-shadow: 0 40px 80px rgba(0, 0, 0, 0.1);
  position: relative;
  overflow: hidden;
}
.glass-sheet.large {
  max-width: 680px;
}

.sheet-body {
  overflow-y: auto;
  max-height: 65vh;
  scrollbar-width: thin;
}
[data-theme="dark"] .glass-sheet,
[data-theme="dark"] .glass-sheet {
  background: rgba(20, 20, 20, 0.85);
  border-color: rgba(255,255,255,0.1);
}

.sheet-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
}
.sheet-title {
  font-family: 'Noto Serif SC', serif;
  font-size: 1.5rem;
  font-weight: 500;
  color: var(--color-neutral-9);
  margin: 0;
}
.sheet-close {
  background: none;
  border: none;
  font-size: 28px;
  line-height: 1;
  color: var(--color-neutral-6);
  cursor: pointer;
}
.sheet-close:hover { color: var(--color-neutral-9); }

.glass-input-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 1.5rem;
}
.glass-input-group label {
  font-size: 0.75rem;
  font-weight: 500;
  letter-spacing: 0.05em;
  color: var(--color-neutral-6);
}
.glass-input-group input,
.glass-input-group textarea {
  background: rgba(255,255,255,0.5);
  border: 1px solid var(--border-color, rgba(0,0,0,0.1));
  border-radius: 12px;
  padding: 12px 16px;
  font-family: inherit;
  font-size: 1rem;
  color: var(--color-neutral-9);
  outline: none;
  transition: all 0.2s;
}
.glass-input-group input:focus,
.glass-input-group textarea:focus {
  background: #fff;
  border-color: var(--color-neutral-9);
  box-shadow: 0 4px 12px rgba(0,0,0,0.05);
}
[data-theme="dark"] .glass-input-group input,
[data-theme="dark"] .glass-input-group input {
  background: rgba(0,0,0,0.4);
  border-color: rgba(255,255,255,0.1);
}
[data-theme="dark"] .glass-input-group input:focus,
[data-theme="dark"] .glass-input-group input:focus {
  background: rgba(0,0,0,0.6);
  border-color: var(--color-neutral-9);
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
  margin-top: 1rem;
}

.spinner {
  width: 48px;
  height: 48px;
  border: 3px solid rgba(0,0,0,0.1);
  border-top-color: var(--color-accent);
  border-radius: 50%;
  animation: spin 1s cubic-bezier(0.16, 1, 0.3, 1) infinite;
}
[data-theme="dark"] .spinner,
[data-theme="dark"] .spinner {
  border-color: rgba(255,255,255,0.1);
  border-top-color: var(--color-accent);
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
  .archive-visual { width: 100%; height: 80px; flex-direction: row; padding: 1rem 1.5rem; border-right: none; border-bottom: 1px solid var(--border-color, rgba(0,0,0,0.1)); }
  .visual-meta { writing-mode: horizontal-tb; transform: none; }
  .grid-form { grid-template-columns: 1fr; }
  .glass-input-group.full { grid-column: 1 / 2; }
}
</style>


