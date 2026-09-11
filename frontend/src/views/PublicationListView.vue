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
import PublicationArchiveSection from '../components/PublicationArchiveSection.vue'
import PublicationTemplateSection from '../components/PublicationTemplateSection.vue'
import { useFeedback } from '../composables/useFeedback'
import { getUserErrorMessage } from '../api/http'
import { usePublicationListFilters } from '../features/publications/usePublicationListFilters'

const router = useRouter()
const feedback = useFeedback()
const lexiconStore = useLexiconStore()
const lexicon = computed(() => lexiconStore.lexicon)
const publicationsQuote = computed(() => lexicon.value.publications.quote.replace(/\\n/g, '\n'))

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

const templatesExpanded = ref(true)
const { searchQuery, sortBy, sortOptions, filteredPublications } = usePublicationListFilters(publications)

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

const openingId = ref<number | null>(null)

async function openPublication(id: number) {
  if (openingId.value !== null) return
  openingId.value = id
  try {
    await router.push({ name: 'workbench', params: { id } })
  } catch {
    openingId.value = null
  }
}

async function openBookEditor(pubId: number) {
  if (openingId.value !== null) return
  openingId.value = pubId
  try {
    await router.push({ name: 'book-editor-publication', params: { publicationId: pubId } })
  } catch {
    openingId.value = null
  }
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
  } catch (err: unknown) {
    feedback.setError('保存失败: ' + getUserErrorMessage(err, '未知错误'))
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
    const id = await createPublication({ ...blankPublication, title, subtitle }, defaultSettings, title)
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
    publications.value = publications.value.filter(p => p.id !== id)
    deleteConfirmId.value = null
  } catch (err: unknown) {
    feedback.setError('删除失败: ' + getUserErrorMessage(err, '未知错误'))
  } finally {
    deletingId.value = null
  }
}

const cloningSampleId = ref<string | null>(null)

async function handleViewSample(sample: (typeof builtinSamples)[0]) {
  if (cloningSampleId.value) return
  cloningSampleId.value = sample.id

  const baseTitle = sample.publication.title || sample.label
  try {
    const id = await createPublication(sample.publication, defaultSettings, baseTitle + ' (副本)')
    router.push({ name: 'workbench', params: { id } })
  } catch (err: unknown) {
    if (import.meta.env.DEV) console.error('[template clone] failed:', err)
    feedback.setError('创建失败: ' + getUserErrorMessage(err, '未知错误'))
  } finally {
    cloningSampleId.value = null
  }
}
</script>

<template>
  <div class="publication-list-view-root">
    <!-- 顶部微光进度条（页面跳转与数据载入时显示） -->
    <div v-if="openingId !== null" class="view-top-progress" aria-hidden="true">
      <div class="view-top-progress__bar"></div>
    </div>
    <div class="gallery-stage">
      <FeedbackStrip :statusMessage="feedback.statusMessage.value" :errorMessage="feedback.errorMessage.value" @dismiss="feedback.dismiss" />

      <!-- Header -->
      <PoeticHeader
        :eyebrow="lexicon.publications.headerEyebrow"
        :title="lexicon.publications.headerTitle"
        :titleItalic="lexicon.publications.headerTitleItalic"
      >
        <template #extra>
          <p class="poetic-quote">{{ publicationsQuote }}</p>
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
        <PublicationTemplateSection
          :samples="builtinSamples"
          :expanded="templatesExpanded"
          :cloningSampleId="cloningSampleId"
          :title="lexicon.publications.templateSectionTitle"
          @update:expanded="templatesExpanded = $event"
          @preview="previewSample"
          @clone="handleViewSample"
        />

        <!-- Empty State (No Publications at all) -->
        <div v-if="publications.length === 0" class="empty-state">
          <div class="empty-seal">{{ lexicon.publications.soul }}</div>
          <h3 class="empty-title">{{ lexicon.publications.emptyTitle }}</h3>
          <p class="empty-desc">{{ lexicon.publications.emptyDesc }}</p>
          <div class="empty-actions">
            <button class="btn btn--primary" @click="showCreateDialog = true">{{ lexicon.publications.createBtn }}</button>
          </div>
        </div>

        <PublicationArchiveSection
          v-else
          :title="lexicon.publications.archiveSectionTitle"
          :publications="publications"
          :filteredPublications="filteredPublications"
          :searchQuery="searchQuery"
          :sortBy="sortBy"
          :sortOptions="sortOptions"
          :openingId="openingId"
          :deleteConfirmId="deleteConfirmId"
          :deletingId="deletingId"
          @update:search-query="searchQuery = $event"
          @update:sort-by="sortBy = $event"
          @open="openPublication"
          @open-book-editor="openBookEditor"
          @open-activity="openActivity"
          @open-stats="openStats"
          @edit="openEditDialog"
          @open-collaborators="openCollabDialog"
          @open-share="openShareDialog"
          @request-delete="deleteConfirmId = $event"
          @confirm-delete="handleDelete"
          @cancel-delete="deleteConfirmId = null"
        />
      </div>

      <!-- Modals: Glass Sheets -->
      <Teleport to="body">
        <!-- Create Archive Sheet -->
        <transition name="sheet-slide">
          <div v-if="showCreateDialog" class="glass-modal-overlay" role="dialog" aria-modal="true" :aria-label="lexicon.publications.createModalTitle" @click.self="showCreateDialog = false" @keydown.escape="showCreateDialog = false">
            <div class="glass-sheet">
              <header class="sheet-header">
                <h2 class="sheet-title">{{ lexicon.publications.createModalTitle }}</h2>
                <button class="sheet-close" title="关闭" @click="showCreateDialog = false">&times;</button>
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
                <button class="sheet-close" title="关闭" @click="showEditDialog = false">&times;</button>
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
