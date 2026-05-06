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

const router = useRouter()

const publications = ref<PublicationSummary[]>([])
const loading = ref(true)
const creatingTemplate = ref(false)

const showCreateDialog = ref(false)
const newTitle = ref('')
const newSubtitle = ref('')

const showEditDialog = ref(false)
const editingId = ref<number | null>(null)
const editForm = ref({
  title: '',
  subtitle: '',
  description: '',
  ancestralOrigin: '',
  hallName: '',
  familyMotto: '',
})

const deleteConfirmId = ref<number | null>(null)

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

function openEditDialog(pub: PublicationSummary) {
  editingId.value = pub.id
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
    await updatePublicationMetadata(editingId.value, title, subtitle, info)
    showEditDialog.value = false
    await loadPublications()
  } catch (err: any) {
    alert('保存失败: ' + (err.message || '未知错误'))
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

async function handleDelete(id: number) {
  try {
    await deletePublication(id)
    publications.value = publications.value.filter((p) => p.id !== id)
    deleteConfirmId.value = null
  } catch {
    // error handled silently
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

async function handleCreateFromTemplate(sample: typeof builtinSamples[0]) {
  if (creatingTemplate.value) return

  creatingTemplate.value = true
  const baseTitle = sample.publication.title || sample.label
  const newTitle = baseTitle + ' (副本)'

  try {
    const id = await createPublication(
      sample.publication,
      defaultSettings,
      newTitle,
    )
    router.push({ name: 'workbench', params: { id } })
  } catch (err: any) {
    alert('创建模板失败: ' + (err.message || '未知错误'))
  } finally {
    creatingTemplate.value = false
  }
}
</script>

<template>
  <div class="archive-container">
    <!-- Editorial Header -->
    <header class="archive-header">
      <div class="archive-header__meta">
        <span class="dot-label dot-label--signal">System / Genealogy</span>
        <span class="archive-header__count">{{ publications.length }} VOLUMES</span>
      </div>
      <div class="archive-header__main">
        <h1 class="archive-header__title">谱系陈列馆</h1>
        <p class="archive-header__tagline">归档、研究与家族史的视觉编研</p>
      </div>
      <div class="archive-header__actions">
        <button class="pill-btn pill-btn--black" @click="showCreateDialog = true">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          新建存档
        </button>
      </div>
    </header>

    <div v-if="loading" class="archive-status">
      <div class="spinner-dot"></div>
      <span>RETRIEVING ARCHIVES...</span>
    </div>

    <div v-else class="archive-content">
      <!-- Curated Collection (Templates) -->
      <section class="collection-section">
        <div class="section-eyebrow">
          <span class="dot-label dot-label--ember">Curated Collections</span>
          <h2 class="section-title">王朝世系模板</h2>
        </div>

        <div class="collection-grid">
          <div
            v-for="sample in builtinSamples"
            :key="sample.id"
            class="collection-item"
            @click="handleCreateFromTemplate(sample)"
          >
            <div class="collection-item__indicator"></div>
            <div class="collection-item__body">
              <h3 class="collection-item__title">{{ sample.publication.title }}</h3>
              <p class="collection-item__subtitle">{{ sample.publication.subtitle }}</p>
            </div>
            <div class="collection-item__arrow">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
            </div>
          </div>
        </div>
      </section>

      <!-- Archive Exhibits -->
      <section class="exhibit-section">
        <div class="section-eyebrow">
          <span class="dot-label">Private Archives</span>
          <h2 class="section-title">个人研究存档</h2>
        </div>

        <div v-if="publications.length === 0" class="exhibit-empty">
          <p>陈列柜暂空。请通过右上方「新建存档」开始编研。</p>
        </div>

        <div v-else class="exhibit-grid">
          <article
            v-for="pub in publications"
            :key="pub.id"
            class="exhibit-card"
            @click="openPublication(pub.id)"
          >
            <div class="exhibit-card__canvas">
              <div class="exhibit-card__num">{{ pub.id.toString().padStart(3, '0') }}</div>
              <div class="exhibit-card__initials">{{ pub.title?.substring(0, 1) || '典' }}</div>
            </div>
            <div class="exhibit-card__content">
              <header class="exhibit-card__header">
                <h3 class="exhibit-card__title">{{ pub.title || '未命名存档' }}</h3>
                <span class="exhibit-card__date">{{ formatDate(pub.updatedAt) }}</span>
              </header>
              <p class="exhibit-card__subtitle">{{ pub.subtitle || 'NO SUBTITLE' }}</p>
              
              <footer class="exhibit-card__footer">
                <div class="exhibit-card__tags">
                  <span v-if="pub.info?.hallName" class="tag">{{ pub.info.hallName }}</span>
                  <span v-if="pub.info?.ancestralOrigin" class="tag">{{ pub.info.ancestralOrigin }}</span>
                </div>
                <div class="exhibit-card__actions">
                  <button class="action-btn" title="EDIT" @click.stop="openEditDialog(pub)">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                  </button>
                  <button class="action-btn action-btn--danger" title="DELETE" @click.stop="deleteConfirmId = pub.id">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                  </button>
                </div>
              </footer>
            </div>

            <div v-if="deleteConfirmId === pub.id" class="exhibit-confirm" @click.stop>
              <p>PERMANENTLY DELETE?</p>
              <div class="exhibit-confirm__btns">
                <button class="pill-btn pill-btn--black pill-btn--sm" @click="handleDelete(pub.id)">DELETE</button>
                <button class="pill-btn pill-btn--white pill-btn--sm" @click="deleteConfirmId = null">CANCEL</button>
              </div>
            </div>
          </article>
        </div>
      </section>
    </div>

    <!-- Create Dialog (Minimalist) -->
    <Teleport to="body">
      <div v-if="showCreateDialog" class="modal-overlay" @click.self="showCreateDialog = false">
        <div class="modal-sheet">
          <header class="modal-sheet__header">
            <h2 class="modal-sheet__title">NEW ARCHIVE</h2>
            <button class="modal-close" @click="showCreateDialog = false">&times;</button>
          </header>
          <div class="modal-sheet__body">
            <div class="input-field">
              <label>TITLE</label>
              <input v-model="newTitle" type="text" placeholder="e.g. 陇西李氏世系图" @keyup.enter="handleCreate" />
            </div>
            <div class="input-field">
              <label>SUBTITLE</label>
              <input v-model="newSubtitle" type="text" placeholder="e.g. 2026 EDITION" @keyup.enter="handleCreate" />
            </div>
          </div>
          <footer class="modal-sheet__footer">
            <button class="pill-btn pill-btn--white" @click="showCreateDialog = false">CANCEL</button>
            <button class="pill-btn pill-btn--black" @click="handleCreate">CREATE VOLUME</button>
          </footer>
        </div>
      </div>
    </Teleport>

    <!-- Edit Dialog (Editorial Form) -->
    <Teleport to="body">
      <div v-if="showEditDialog" class="modal-overlay" @click.self="showEditDialog = false">
        <div class="modal-sheet modal-sheet--lg">
          <header class="modal-sheet__header">
            <h2 class="modal-sheet__title">EDIT METADATA</h2>
            <button class="modal-close" @click="showEditDialog = false">&times;</button>
          </header>
          <div class="modal-sheet__body grid-2-col">
            <div class="input-field">
              <label>TITLE</label>
              <input v-model="editForm.title" type="text" />
            </div>
            <div class="input-field">
              <label>SUBTITLE</label>
              <input v-model="editForm.subtitle" type="text" />
            </div>
            <div class="input-field">
              <label>ANCESTRAL ORIGIN</label>
              <input v-model="editForm.ancestralOrigin" type="text" />
            </div>
            <div class="input-field">
              <label>HALL NAME (堂号)</label>
              <input v-model="editForm.hallName" type="text" />
            </div>
            <div class="input-field full-width">
              <label>FAMILY MOTTO (家训)</label>
              <textarea v-model="editForm.familyMotto" rows="2"></textarea>
            </div>
            <div class="input-field full-width">
              <label>DESCRIPTION</label>
              <textarea v-model="editForm.description" rows="3"></textarea>
            </div>
          </div>
          <footer class="modal-sheet__footer">
            <button class="pill-btn pill-btn--white" @click="showEditDialog = false">DISCARD</button>
            <button class="pill-btn pill-btn--black" @click="handleEditSave">SAVE CHANGES</button>
          </footer>
        </div>
      </div>
    </Teleport>

    <Teleport to="body">
      <div v-if="creatingTemplate" class="loading-scrim">
        <div class="spinner-dot"></div>
        <p>GENERATING VOLUME FROM TEMPLATE...</p>
      </div>
    </Teleport>
  </div>
</template>

<style scoped>
.archive-container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 80px 40px;
  min-height: 100vh;
  position: relative;
}

/* Editorial Header */
.archive-header {
  display: flex;
  flex-direction: column;
  gap: 16px;
  margin-bottom: 80px;
  border-bottom: 1px solid var(--line-soft);
  padding-bottom: 40px;
}

.archive-header__meta {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.archive-header__count {
  font-family: var(--font-inter, sans-serif);
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.15em;
  color: var(--text-soft);
}

.archive-header__main {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.archive-header__title {
  font-family: "Waldenburg", Georgia, serif;
  font-size: 48px;
  font-weight: 300;
  letter-spacing: -0.02em;
  color: var(--text-main);
  margin: 0;
}

.archive-header__tagline {
  font-family: var(--font-inter, sans-serif);
  font-size: 16px;
  color: var(--text-sub);
  margin: 0;
}

.archive-header__actions {
  margin-top: 12px;
}

/* Pill Buttons */
.pill-btn {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 0 20px;
  height: 40px;
  border-radius: 9999px;
  font-family: var(--font-inter, sans-serif);
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  border: 1px solid var(--line-soft);
}

.pill-btn--black {
  background: var(--text-main, #000);
  color: var(--bg-shell, #fff);
  border-color: var(--text-main, #000);
}

.pill-btn--black:hover {
  opacity: 0.85;
  transform: translateY(-1px);
}

.pill-btn--white {
  background: #fff;
  color: #000;
}

.pill-btn--white:hover {
  background: var(--card-hover-fill);
  transform: translateY(-1px);
}

.pill-btn--sm {
  height: 32px;
  padding: 0 14px;
  font-size: 11px;
}

/* Dot Labels */
.dot-label {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--text-soft);
}

.dot-label::before {
  content: "";
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--line-soft);
}

.dot-label--signal::before { background: #0447ff; }
.dot-label--ember::before { background: #ff4704; }

/* Section Styles */
.collection-section {
  margin-bottom: 80px;
}

.section-eyebrow {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 24px;
}

.section-title {
  font-family: "Waldenburg", Georgia, serif;
  font-size: 24px;
  font-weight: 300;
  color: var(--text-main);
  margin: 0;
}

/* Collection Grid */
.collection-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 16px;
}

.collection-item {
  display: flex;
  align-items: center;
  gap: 20px;
  padding: 24px;
  background: #fff;
  border: 0.5px solid var(--line-soft);
  border-radius: 16px;
  cursor: pointer;
  transition: all 0.3s ease;
  position: relative;
  box-shadow: rgba(0, 0, 0, 0.4) 0px 0px 1.143px 0px, rgba(0, 0, 0, 0.04) 0px 2px 4px 0px;
}

.collection-item:hover {
  transform: scale(1.01);
  border-color: var(--text-main);
}

.collection-item__indicator {
  width: 2px;
  height: 40px;
  background: var(--text-main);
}

.collection-item__title {
  font-family: "Waldenburg", Georgia, serif;
  font-size: 18px;
  font-weight: 300;
  margin: 0 0 4px;
  color: var(--text-main);
}

.collection-item__subtitle {
  font-size: 12px;
  color: var(--text-soft);
  margin: 0;
}

.collection-item__arrow {
  margin-left: auto;
  opacity: 0.3;
  transition: opacity 0.2s;
}

.collection-item:hover .collection-item__arrow {
  opacity: 1;
}

/* Exhibit Cards */
.exhibit-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(360px, 1fr));
  gap: 24px;
}

.exhibit-card {
  display: flex;
  gap: 0;
  background: #fff;
  border-radius: 16px;
  border: 0.5px solid var(--line-soft);
  overflow: hidden;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: rgba(0, 0, 0, 0.4) 0px 0px 1.143px 0px, rgba(0, 0, 0, 0.04) 0px 2px 4px 0px;
  position: relative;
}

.exhibit-card:hover {
  border-color: var(--text-main);
  transform: translateY(-2px);
}

.exhibit-card__canvas {
  width: 100px;
  background: #000;
  color: #fff;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  padding: 16px;
  flex-shrink: 0;
}

.exhibit-card__num {
  font-family: var(--font-inter);
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.1em;
  opacity: 0.6;
}

.exhibit-card__initials {
  font-family: "Waldenburg", Georgia, serif;
  font-size: 32px;
  font-weight: 300;
}

.exhibit-card__content {
  flex: 1;
  padding: 24px;
  display: flex;
  flex-direction: column;
}

.exhibit-card__header {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  margin-bottom: 4px;
}

.exhibit-card__title {
  font-family: "Waldenburg", Georgia, serif;
  font-size: 20px;
  font-weight: 300;
  margin: 0;
  color: var(--text-main);
}

.exhibit-card__date {
  font-size: 9px;
  font-weight: 700;
  color: var(--text-soft);
}

.exhibit-card__subtitle {
  font-size: 13px;
  color: var(--text-sub);
  margin: 0 0 16px;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.exhibit-card__footer {
  margin-top: auto;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.exhibit-card__tags {
  display: flex;
  gap: 8px;
}

.tag {
  font-size: 9px;
  padding: 2px 8px;
  background: var(--card-hover-fill);
  border-radius: 4px;
  color: var(--text-soft);
  font-weight: 700;
}

.exhibit-card__actions {
  display: flex;
  gap: 4px;
}

.action-btn {
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 6px;
  border: none;
  background: transparent;
  color: var(--text-soft);
  cursor: pointer;
  transition: all 0.2s;
}

.action-btn:hover {
  background: var(--card-hover-fill);
  color: var(--text-main);
}

.action-btn--danger:hover {
  background: #fff5f5;
  color: #ff4704;
}

/* Confirm Overlay */
.exhibit-confirm {
  position: absolute;
  inset: 0;
  background: rgba(255, 255, 255, 0.98);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;
  z-index: 5;
}

.exhibit-confirm p {
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.1em;
  color: #ff4704;
}

.exhibit-confirm__btns {
  display: flex;
  gap: 8px;
}

/* Modals */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(253, 252, 252, 0.85);
  backdrop-filter: blur(8px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2000;
}

.modal-sheet {
  background: #fff;
  border: 0.5px solid var(--line-soft);
  border-radius: 24px;
  width: 100%;
  max-width: 440px;
  box-shadow: 0 40px 80px rgba(0, 0, 0, 0.1);
  padding: 40px;
  position: relative;
}

.modal-sheet--lg {
  max-width: 680px;
}

.modal-sheet__header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 32px;
}

.modal-sheet__title {
  font-family: var(--font-inter);
  font-size: 14px;
  font-weight: 800;
  letter-spacing: 0.1em;
  color: var(--text-main);
}

.modal-close {
  background: none;
  border: none;
  font-size: 24px;
  cursor: pointer;
  color: var(--text-soft);
}

.input-field {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 24px;
}

.grid-2-col {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0 24px;
}

.full-width {
  grid-column: 1 / 3;
}

.input-field label {
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.05em;
  color: var(--text-soft);
}

.input-field input,
.input-field textarea {
  padding: 12px 0;
  border: none;
  border-bottom: 1px solid var(--text-main);
  background: transparent;
  font-family: var(--font-inter);
  font-size: 15px;
  color: var(--text-main);
  outline: none;
}

.input-field input::placeholder {
  color: var(--text-soft);
}

.modal-sheet__footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 24px;
}

/* Status & Scrims */
.archive-status,
.loading-scrim {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;
  padding: 80px 0;
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.2em;
  color: var(--text-soft);
}

.loading-scrim {
  position: fixed;
  inset: 0;
  background: rgba(253, 252, 252, 0.9);
  z-index: 3000;
}

.spinner-dot {
  width: 8px;
  height: 8px;
  background: var(--text-main);
  border-radius: 50%;
  animation: pulse 1s ease-in-out infinite;
}

@keyframes pulse {
  0% { transform: scale(0.8); opacity: 0.3; }
  50% { transform: scale(1.2); opacity: 1; }
  100% { transform: scale(0.8); opacity: 0.3; }
}

.exhibit-empty {
  padding: 60px 0;
  text-align: center;
  color: var(--text-soft);
  font-size: 14px;
  border: 1px dashed var(--line-soft);
  border-radius: 16px;
}
</style>
