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
                <div class="archive-body">
                  <h3 class="archive-title">{{ pub.title || '未命名宗谱' }}</h3>
                  <p v-if="pub.subtitle" class="archive-subtitle">{{ pub.subtitle }}</p>
                  <div class="archive-tags" v-if="pub.info?.hallName || pub.info?.ancestralOrigin">
                    <span v-if="pub.info?.hallName" class="meta-tag">{{ pub.info.hallName }}</span>
                    <span v-if="pub.info?.ancestralOrigin" class="meta-tag">{{ pub.info.ancestralOrigin }}</span>
                  </div>
                </div>

                <div class="archive-foot">
                  <span class="archive-date">{{ formatDate(pub.updatedAt) }}</span>
                  <div class="archive-actions">
                    <button class="action-btn" title="编辑属性" @click.stop="openEditDialog(pub)">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                    </button>
                    <button class="action-btn" title="协作者管理" @click.stop="openCollabDialog(pub.id)">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                    </button>
                    <button class="action-btn" title="分享链接" @click.stop="openShareDialog(pub.id)">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
                    </button>
                    <button class="action-btn action-btn--danger" title="删除档案" @click.stop="deleteConfirmId = pub.id">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                    </button>
                  </div>
                </div>

                <!-- Delete Confirm Overlay -->
                <transition name="fade">
                  <div v-if="deleteConfirmId === pub.id" class="delete-overlay" @click.stop>
                    <p>确定要删除「{{ pub.title }}」吗？此操作不可撤销。</p>
                    <div class="delete-btns">
                      <button class="glass-pill-btn danger" @click="handleDelete(pub.id)">确认删除</button>
                      <button class="glass-pill-btn" @click="deleteConfirmId = null">取消</button>
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
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 8px 20px;
  border-radius: 999px;
  border: 1px solid var(--color-neutral-4);
  background: var(--color-neutral-2);
  font-size: var(--text-copy-13);
  font-weight: 500;
  color: var(--color-neutral-8);
  cursor: pointer;
  transition: all var(--duration-fast) var(--ease-breath);
}
.glass-pill-btn:hover {
  background: var(--color-neutral-9);
  color: var(--color-neutral-1);
  border-color: var(--color-neutral-9);
}
.glass-pill-btn.primary {
  background: var(--color-neutral-9);
  color: var(--color-neutral-1);
  border-color: var(--color-neutral-9);
}
.glass-pill-btn.primary:hover {
  opacity: 0.85;
}
.glass-pill-btn.danger {
  background: var(--color-error);
  color: #fff;
  border-color: var(--color-error);
}
.glass-pill-btn.danger:hover {
  opacity: 0.85;
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
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 20px;
}
.archive-card {
  display: flex;
  flex-direction: column;
  padding: 24px;
  border-left: 3px solid var(--color-accent);
  min-height: 140px;
}
.archive-body {
  flex: 1;
}
.archive-title {
  font-family: var(--font-serif);
  font-size: var(--text-title-20);
  font-weight: 400;
  color: var(--color-neutral-10);
  margin: 0 0 4px;
  line-height: 1.3;
}
.archive-subtitle {
  font-size: var(--text-copy-13);
  color: var(--color-neutral-6);
  margin: 0 0 12px;
}
.archive-tags {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  margin-bottom: 16px;
}

.archive-foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.archive-date {
  font-size: var(--text-label-12);
  color: var(--color-neutral-6);
}
.archive-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}
/* ── Action buttons ── */
.action-btn {
  width: 32px; height: 32px;
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
  background: var(--color-neutral-9);
  color: var(--color-neutral-1);
  border-color: var(--color-neutral-9);
}
.action-btn--danger:hover {
  background: var(--color-error);
  color: #fff;
  border-color: var(--color-error);
}

.meta-tag {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: var(--text-label-12);
  font-weight: 500;
  background: var(--color-neutral-2);
  padding: 3px 8px;
  border-radius: var(--radius-sm);
  color: var(--color-neutral-7);
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
  gap: 20px;
  z-index: 10;
  border-radius: 24px;
}
[data-theme="dark"] .delete-overlay {
  background: rgba(20, 20, 20, 0.96);
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
.delete-btns .glass-pill-btn {
  font-size: var(--text-copy-13);
  padding: 8px 20px;
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
[data-theme="dark"] .glass-sheet {
  background: var(--color-neutral-2);
  border-color: rgba(255,255,255,0.06);
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
  font-weight: 400;
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


