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
import { samplePublication, defaultSettings } from '../data/sampleFamily'
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
      { ...samplePublication, title, subtitle },
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
  <div>
    <div class="list-header">
      <div>
        <h1 class="list-header__title">族谱管理</h1>
        <p class="list-header__desc">管理你的家族谱系资料</p>
      </div>
      <div class="list-header__actions">
        <button class="btn-create" @click="showCreateDialog = true">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          新建族谱
        </button>
      </div>
    </div>

    <div v-if="loading" class="list-empty">
      <p>加载中...</p>
    </div>

    <div v-else-if="publications.length === 0" class="list-empty">
      <div class="list-empty__icon">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="12" y1="18" x2="12" y2="12"/><line x1="9" y1="15" x2="15" y2="15"/></svg>
      </div>
      <h3>暂无族谱</h3>
      <p>点击「新建族谱」开始创建你的第一份族谱</p>
    </div>

    <div v-else class="publication-grid">
      <div
        v-for="pub in publications"
        :key="pub.id"
        class="pub-card"
        @click="openPublication(pub.id)"
      >
        <div class="pub-card__body">
          <h3 class="pub-card__title">{{ pub.title || '未命名族谱' }}</h3>
          <p class="pub-card__subtitle">{{ pub.subtitle || '暂无副标题' }}</p>
          <p v-if="pub.description" class="pub-card__description">{{ pub.description }}</p>
        </div>
        <div class="pub-card__footer">
          <span class="pub-card__date">{{ formatDate(pub.updatedAt) }}</span>
          <div class="pub-card__actions">
            <button
              class="pub-card__action-btn"
              title="编辑信息"
              @click.stop="openEditDialog(pub)"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/></svg>
            </button>
            <button
              class="pub-card__action-btn pub-card__delete"
              title="删除"
              @click.stop="deleteConfirmId = pub.id"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
            </button>
          </div>
        </div>

        <div v-if="deleteConfirmId === pub.id" class="pub-card__confirm" @click.stop>
          <p>确认删除此族谱？</p>
          <div class="pub-card__confirm-btns">
            <button class="btn-confirm-yes" @click="handleDelete(pub.id)">删除</button>
            <button class="btn-confirm-no" @click="deleteConfirmId = null">取消</button>
          </div>
        </div>
      </div>
    </div>

    <!-- Create Dialog -->
    <Teleport to="body">
      <div v-if="showCreateDialog" class="dialog-overlay" @click.self="showCreateDialog = false">
        <div class="dialog">
          <h2 class="dialog__title">新建族谱</h2>
          <div class="dialog__field">
            <label>族谱标题</label>
            <input v-model="newTitle" type="text" placeholder="例：张氏家谱" @keyup.enter="handleCreate" />
          </div>
          <div class="dialog__field">
            <label>副标题（可选）</label>
            <input v-model="newSubtitle" type="text" placeholder="例：第三修 · 二〇二六年" @keyup.enter="handleCreate" />
          </div>
          <div class="dialog__actions">
            <button class="btn-dialog-cancel" @click="showCreateDialog = false">取消</button>
            <button class="btn-dialog-confirm" @click="handleCreate">创建</button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- Edit Dialog -->
    <Teleport to="body">
      <div v-if="showEditDialog" class="dialog-overlay" @click.self="showEditDialog = false">
        <div class="dialog dialog--large">
          <h2 class="dialog__title">编辑族谱信息</h2>
          <div class="dialog__field">
            <label>族谱标题</label>
            <input v-model="editForm.title" type="text" placeholder="例：张氏家谱" />
          </div>
          <div class="dialog__field">
            <label>副标题</label>
            <input v-model="editForm.subtitle" type="text" placeholder="例：第三修 · 二〇二六年" />
          </div>
          <div class="dialog__field">
            <label>家族起源地</label>
            <input v-model="editForm.ancestralOrigin" type="text" placeholder="例：山西洪洞" />
          </div>
          <div class="dialog__field">
            <label>堂号</label>
            <input v-model="editForm.hallName" type="text" placeholder="例：三槐堂" />
          </div>
          <div class="dialog__field">
            <label>家训</label>
            <textarea v-model="editForm.familyMotto" rows="2" placeholder="例：耕读传家，勤俭立业"></textarea>
          </div>
          <div class="dialog__field">
            <label>简介</label>
            <textarea v-model="editForm.description" rows="3" placeholder="简要介绍族谱的修撰背景..."></textarea>
          </div>
          <div class="dialog__actions">
            <button class="btn-dialog-cancel" @click="showEditDialog = false">取消</button>
            <button class="btn-dialog-confirm" @click="handleEditSave">保存</button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<style scoped>
.list-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 1.5rem;
}

.list-header__actions {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.list-header__title {
  font-size: 1.5rem;
  font-family: 'Noto Serif SC', serif;
  font-weight: 700;
  color: var(--text-main, #1a1a1a);
  margin: 0;
}

.list-header__desc {
  color: var(--text-soft, #888);
  margin: 0.25rem 0 0;
  font-size: 0.85rem;
}

.btn-create {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.65rem 1.25rem;
  background: linear-gradient(135deg, var(--accent-ink, #6a4b2f), var(--accent-amber, #a96e35));
  color: #fff;
  border: none;
  border-radius: 12px;
  font-size: 0.9rem;
  font-weight: 700;
  cursor: pointer;
  transition: transform 0.15s, box-shadow 0.15s;
  box-shadow: 0 4px 12px rgba(0,0,0,0.1);
}

.btn-create:hover {
  transform: translateY(-1px);
  box-shadow: 0 6px 20px rgba(0,0,0,0.15);
}

.list-empty {
  text-align: center;
  padding: 3rem 1rem;
  color: var(--text-soft, #888);
}

.list-empty__icon {
  margin-bottom: 1rem;
  opacity: 0.4;
}

.list-empty h3 {
  margin: 0 0 0.5rem;
  color: var(--text-main, #1a1a1a);
}

.list-empty p {
  margin: 0;
  font-size: 0.9rem;
}

.publication-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 1rem;
}

.pub-card {
  position: relative;
  background: var(--bg-panel, rgba(255,255,255,0.85));
  border: 1px solid var(--border-color, rgba(0,0,0,0.08));
  border-radius: 14px;
  cursor: pointer;
  transition: transform 0.2s, box-shadow 0.2s, border-color 0.2s;
  overflow: hidden;
}

.pub-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(0,0,0,0.06);
  border-color: var(--accent-amber, #a96e35);
}

.pub-card__body {
  padding: 1.25rem 1.25rem 0.5rem;
}

.pub-card__title {
  margin: 0 0 0.25rem;
  font-size: 1rem;
  font-family: 'Noto Serif SC', serif;
  color: var(--text-main, #1a1a1a);
}

.pub-card__subtitle {
  margin: 0;
  font-size: 0.8rem;
  color: var(--text-soft, #888);
}

.pub-card__description {
  margin: 0.4rem 0 0;
  font-size: 0.75rem;
  color: var(--text-soft, #999);
  line-height: 1.5;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.pub-card__footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.6rem 1.25rem;
  border-top: 1px solid var(--border-color, rgba(0,0,0,0.04));
}

.pub-card__date {
  font-size: 0.72rem;
  color: var(--text-soft, #888);
}

.pub-card__actions {
  display: flex;
  gap: 0.5rem;
}

.pub-card__action-btn {
  background: none;
  border: none;
  color: var(--text-soft, #aaa);
  cursor: pointer;
  padding: 0.3rem;
  border-radius: 6px;
  transition: color 0.15s, background 0.15s;
  display: flex;
  align-items: center;
}

.pub-card__action-btn:hover {
  color: var(--accent-amber, #a96e35);
  background: rgba(169, 110, 53, 0.08);
}

.pub-card__action-btn.pub-card__delete:hover {
  color: #ef4444;
  background: rgba(239, 68, 68, 0.08);
}

.pub-card__delete {
  background: none;
  border: none;
  color: var(--text-soft, #aaa);
  cursor: pointer;
  padding: 0.2rem;
  border-radius: 6px;
  transition: color 0.15s, background 0.15s;
  display: flex;
  align-items: center;
}

.pub-card__confirm {
  color: #ef4444;
  background: rgba(239, 68, 68, 0.08);
}

.pub-card__confirm {
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.7);
  backdrop-filter: blur(4px);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.75rem;
  border-radius: 14px;
  color: #fff;
}

.pub-card__confirm p {
  margin: 0;
  font-weight: 600;
  font-size: 0.9rem;
}

.pub-card__confirm-btns {
  display: flex;
  gap: 0.5rem;
}

.btn-confirm-yes {
  padding: 0.35rem 1rem;
  background: #ef4444;
  color: #fff;
  border: none;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  font-size: 0.8rem;
}

.btn-confirm-no {
  padding: 0.35rem 1rem;
  background: rgba(255,255,255,0.15);
  color: #fff;
  border: 1px solid rgba(255,255,255,0.3);
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  font-size: 0.8rem;
}

.dialog-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.4);
  backdrop-filter: blur(6px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.dialog {
  background: var(--bg-panel, #fff);
  border: 1px solid var(--border-color, rgba(0,0,0,0.08));
  border-radius: 18px;
  padding: 1.75rem;
  width: 100%;
  max-width: 400px;
  box-shadow: 0 24px 64px rgba(0,0,0,0.15);
}

.dialog--large {
  max-width: 500px;
}

.dialog__title {
  margin: 0 0 0.75rem;
  font-size: 1.15rem;
  font-family: 'Noto Serif SC', serif;
  color: var(--text-main, #1a1a1a);
}

.dialog__desc {
  margin: 0 0 0.5rem;
  font-size: 0.85rem;
  color: var(--text-soft, #888);
}

.dialog__field {
  margin-bottom: 0.85rem;
}

.dialog__field label {
  display: block;
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--text-sub, #555);
  margin-bottom: 0.3rem;
}

.dialog__field input {
  width: 100%;
  padding: 0.55rem 0.8rem;
  border: 1px solid var(--border-color, rgba(0,0,0,0.12));
  border-radius: 10px;
  background: var(--bg-shell, #f5f0e8);
  color: var(--text-main, #1a1a1a);
  font-size: 0.85rem;
  outline: none;
  transition: border-color 0.2s;
  box-sizing: border-box;
}

.dialog__field textarea {
  width: 100%;
  padding: 0.55rem 0.8rem;
  border: 1px solid var(--border-color, rgba(0,0,0,0.12));
  border-radius: 10px;
  background: var(--bg-shell, #f5f0e8);
  color: var(--text-main, #1a1a1a);
  font-size: 0.85rem;
  outline: none;
  transition: border-color 0.2s;
  box-sizing: border-box;
  resize: vertical;
  font-family: inherit;
}

.dialog__field input:focus,
.dialog__field textarea:focus {
  border-color: var(--accent-amber, #a96e35);
}

.dialog__actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.6rem;
  margin-top: 1.25rem;
}

.btn-dialog-cancel {
  padding: 0.45rem 1.1rem;
  background: transparent;
  border: 1px solid var(--border-color, rgba(0,0,0,0.12));
  border-radius: 10px;
  color: var(--text-main, #1a1a1a);
  font-weight: 600;
  cursor: pointer;
  font-size: 0.85rem;
}

.btn-dialog-confirm {
  padding: 0.45rem 1.1rem;
  background: linear-gradient(135deg, var(--accent-ink, #6a4b2f), var(--accent-amber, #a96e35));
  color: #fff;
  border: none;
  border-radius: 10px;
  font-weight: 700;
  cursor: pointer;
  font-size: 0.85rem;
}

</style>
