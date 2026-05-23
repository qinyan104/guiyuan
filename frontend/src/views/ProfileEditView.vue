<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { getMyProfile, submitProfileChange, type MyProfile, type MyProfilePerson } from '../api/profile'
import ConfirmDialog from '../components/ConfirmDialog.vue'

const loading = ref(true)
const profile = ref<MyProfile | null>(null)
const error = ref<string | null>(null)

const form = ref<MyProfilePerson>({
  name: '',
  gender: 'unknown',
  birth: '',
  death: '',
  deceased: false,
  note: '',
  avatarUrl: '',
})
const avatarPreview = ref<string | null>(null)
const avatarFile = ref<File | null>(null)

const submitting = ref(false)
const showConfirm = ref(false)
const submitSuccess = ref(false)

async function loadProfile() {
  loading.value = true
  error.value = null
  try {
    profile.value = await getMyProfile()
    resetForm()
  } catch (e: unknown) {
    error.value = e instanceof Error ? e.message : '加载失败'
  } finally {
    loading.value = false
  }
}

onMounted(loadProfile)

function resetForm() {
  if (!profile.value) return
  form.value = { ...profile.value.person }
  avatarPreview.value = profile.value.person.avatarUrl || null
  avatarFile.value = null
}

const hasChanges = computed(() => {
  if (!profile.value) return false
  const p = profile.value.person
  return (
    form.value.name !== p.name ||
    form.value.gender !== p.gender ||
    (form.value.birth || '') !== (p.birth || '') ||
    (form.value.death || '') !== (p.death || '') ||
    form.value.deceased !== p.deceased ||
    (form.value.note || '') !== (p.note || '') ||
    avatarFile.value !== null
  )
})

const changedFields = computed(() => {
  if (!profile.value) return []
  const p = profile.value.person
  const fields: string[] = []
  if (form.value.name !== p.name) fields.push('姓名')
  if (form.value.gender !== p.gender) fields.push('性别')
  if ((form.value.birth || '') !== (p.birth || '')) fields.push('出生')
  if ((form.value.death || '') !== (p.death || '')) fields.push('逝世')
  if (form.value.deceased !== p.deceased) fields.push('在世状态')
  if ((form.value.note || '') !== (p.note || '')) fields.push('注记')
  if (avatarFile.value) fields.push('头像')
  return fields
})

function handleAvatarChange(e: Event) {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return
  if (file.size > 5 * 1024 * 1024) {
    alert('图片大小不能超过 5MB')
    return
  }
  compressImage(file).then((blob) => {
    avatarFile.value = new File([blob], file.name, { type: 'image/jpeg' })
    avatarPreview.value = URL.createObjectURL(blob)
  })
}

async function compressImage(file: File): Promise<Blob> {
  return new Promise((resolve) => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      URL.revokeObjectURL(url)
      const canvas = document.createElement('canvas')
      const maxSize = 200
      let w = img.width
      let h = img.height
      if (w > maxSize || h > maxSize) {
        if (w > h) { h = Math.round(h * maxSize / w); w = maxSize }
        else { w = Math.round(w * maxSize / h); h = maxSize }
      }
      canvas.width = w
      canvas.height = h
      const ctx = canvas.getContext('2d')!
      ctx.drawImage(img, 0, 0, w, h)
      canvas.toBlob((blob) => resolve(blob!), 'image/jpeg', 0.85)
    }
    img.src = url
  })
}

async function handleSubmit() {
  if (!profile.value || !hasChanges.value) return
  showConfirm.value = true
}

async function confirmSubmit() {
  if (!profile.value) return
  showConfirm.value = false
  submitting.value = true
  try {
    const changes: Record<string, unknown> = {}
    const p = profile.value.person
    if (form.value.name !== p.name) changes.name = form.value.name
    if (form.value.gender !== p.gender) changes.gender = form.value.gender
    if ((form.value.birth || '') !== (p.birth || '')) changes.birth = form.value.birth || null
    if ((form.value.death || '') !== (p.death || '')) changes.death = form.value.death || null
    if (form.value.deceased !== p.deceased) changes.deceased = String(form.value.deceased)
    if ((form.value.note || '') !== (p.note || '')) changes.note = form.value.note || null
    if (avatarFile.value) {
      const reader = new FileReader()
      const base64 = await new Promise<string>((resolve) => {
        reader.onload = () => resolve(reader.result as string)
        reader.readAsDataURL(avatarFile.value!)
      })
      changes.avatar = base64
    }
    await submitProfileChange(changes)
    submitSuccess.value = true
    await loadProfile()
  } catch (e: unknown) {
    alert(e instanceof Error ? e.message : '提交失败')
  } finally {
    submitting.value = false
  }
}

function genderLabel(g: string) {
  if (g === 'male') return '男'
  if (g === 'female') return '女'
  return '未知'
}
</script>

<template>
  <div class="profile-edit-root">
    <div class="profile-edit-view">
      <!-- Loading -->
      <div v-if="loading" class="loading-state">
        <div class="spinner"></div>
      </div>

      <!-- Error: No linked person -->
      <div v-else-if="error" class="empty-state">
        <div class="empty-icon">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round">
            <circle cx="12" cy="8" r="4"/><path d="M6 21v-2a4 4 0 014-4h4a4 4 0 014 4v2"/>
          </svg>
        </div>
        <h2>暂未关联族谱人物</h2>
        <p>您的账号尚未关联到族谱中的人物。请联系管理员进行账号派生。</p>
      </div>

      <!-- Pending approval banner -->
      <div v-else-if="profile?.hasPendingChanges && !submitSuccess" class="pending-banner">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
          <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
        </svg>
        <span>您的修改已提交，等待管理员审核。审核期间无法再次提交。</span>
      </div>

      <!-- Submit success banner -->
      <div v-else-if="submitSuccess" class="success-banner">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>
        </svg>
        <span>修改已提交，等待管理员审核。</span>
        <button class="bento-btn small" @click="submitSuccess = false; loadProfile()">刷新状态</button>
      </div>

      <!-- Main content -->
      <template v-else-if="profile">
        <header class="poetic-header">
          <div class="poetic-header__main">
            <div class="poetic-eyebrow">{{ profile.publication.title }}</div>
            <h1 class="poetic-title">个人信息</h1>
          </div>
        </header>

        <div class="edit-layout">
          <!-- Form -->
          <div class="form-panel">
            <div class="bento-card">
              <div class="field">
                <label>姓名</label>
                <input v-model="form.name" type="text" :disabled="profile.hasPendingChanges" />
              </div>
              <div class="field">
                <label>性别</label>
                <select v-model="form.gender" :disabled="profile.hasPendingChanges">
                  <option value="male">男</option>
                  <option value="female">女</option>
                  <option value="unknown">未知</option>
                </select>
              </div>
              <div class="field-row">
                <div class="field">
                  <label>出生</label>
                  <input v-model="form.birth" type="text" placeholder="如：1990 或 1990-01-15" :disabled="profile.hasPendingChanges" />
                </div>
                <div class="field">
                  <label>逝世</label>
                  <input v-model="form.death" type="text" placeholder="如：2020" :disabled="profile.hasPendingChanges || form.deceased === false" />
                </div>
              </div>
              <div class="field checkbox-field">
                <label>
                  <input type="checkbox" v-model="form.deceased" :disabled="profile.hasPendingChanges" />
                  <span>已故</span>
                </label>
              </div>
              <div class="field">
                <label>头像</label>
                <div class="avatar-upload">
                  <div v-if="avatarPreview" class="avatar-preview">
                    <img :src="avatarPreview" alt="头像预览" />
                  </div>
                  <input
                    type="file"
                    accept="image/*"
                    :disabled="profile.hasPendingChanges"
                    @change="handleAvatarChange"
                  />
                </div>
              </div>
              <div class="field">
                <label>注记</label>
                <textarea v-model="form.note" rows="3" :disabled="profile.hasPendingChanges"></textarea>
              </div>
            </div>

            <div class="form-actions">
              <button class="bento-btn" :disabled="!hasChanges || profile.hasPendingChanges" @click="resetForm">
                重置
              </button>
              <button
                class="bento-btn primary"
                :disabled="!hasChanges || submitting || profile.hasPendingChanges"
                @click="handleSubmit"
              >
                {{ submitting ? '提交中...' : '提交审核' }}
              </button>
            </div>
          </div>

          <!-- Preview -->
          <div class="preview-panel">
            <div class="preview-card bento-card">
              <div class="preview-header">
                <span class="preview-label">预览卡片</span>
              </div>
              <div class="person-card-preview" :class="{ 'is-deceased': form.deceased }">
                <div class="card-avatar">
                  <img v-if="avatarPreview" :src="avatarPreview" alt="" />
                  <div v-else class="avatar-placeholder">{{ form.name?.charAt(0) || '?' }}</div>
                </div>
                <div class="card-info">
                  <h3 class="card-name">{{ form.name || '未填写' }}</h3>
                  <span class="card-gender">{{ genderLabel(form.gender) }}</span>
                  <span v-if="form.deceased" class="card-status deceased">已故</span>
                  <span v-else class="card-status alive">在世</span>
                </div>
                <div class="card-details">
                  <div v-if="form.birth" class="detail-row">
                    <span class="label">出生</span>
                    <span>{{ form.birth }}</span>
                  </div>
                  <div v-if="form.death" class="detail-row">
                    <span class="label">逝世</span>
                    <span>{{ form.death }}</span>
                  </div>
                  <div v-if="form.note" class="detail-row note">
                    <span class="label">注记</span>
                    <span>{{ form.note }}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </template>
    </div>

    <!-- Confirm Submit Dialog -->
    <ConfirmDialog
      :modelValue="showConfirm"
      title="确认提交修改"
      :message="`将提交以下字段的修改：${changedFields.join('、')}。\n\n提交后需等待管理员审核通过后才会生效。`"
      confirmLabel="确认提交"
      tone="warning"
      @confirm="confirmSubmit"
      @cancel="showConfirm = false"
      @update:model-value="(v: boolean) => { if (!v) showConfirm = false }"
    />
  </div>
</template>

<style scoped>
.profile-edit-root {
  width: 100%;
  min-height: 100%;
  padding: 2rem;
  box-sizing: border-box;
}
.profile-edit-view {
  max-width: 1000px;
  margin: 0 auto;
}
.poetic-header {
  display: grid;
  grid-template-columns: 1.5fr 1fr;
  gap: 1.5rem;
  align-items: start;
}
.bento-card {
  background: var(--surface, #fff);
  border: 1px solid var(--border, rgba(0,0,0,0.08));
  border-radius: 16px;
  padding: 1.5rem;
  backdrop-filter: blur(12px);
}
.field {
  margin-bottom: 1rem;
}
.field label {
  display: block;
  font-size: 0.8rem;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  opacity: 0.7;
  margin-bottom: 0.35rem;
}
.field input[type="text"],
.field select,
.field textarea {
  width: 100%;
  padding: 0.6rem 0.8rem;
  border: 1px solid var(--border, rgba(0,0,0,0.12));
  border-radius: 8px;
  background: var(--surface, #fff);
  color: var(--text, #1a1a1a);
  font-size: 0.9rem;
  font-family: inherit;
  box-sizing: border-box;
}
.field input:disabled,
.field select:disabled,
.field textarea:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.field-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
}
.checkbox-field label {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  text-transform: none;
  font-weight: 500;
  opacity: 1;
  cursor: pointer;
}
.checkbox-field input[type="checkbox"] {
  width: 16px;
  height: 16px;
}
.avatar-upload {
  display: flex;
  align-items: center;
  gap: 1rem;
}
.avatar-preview {
  width: 64px;
  height: 64px;
  border-radius: 50%;
  overflow: hidden;
  flex-shrink: 0;
}
.avatar-preview img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
  margin-top: 1rem;
}
.bento-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.6rem 1.2rem;
  border: 1px solid var(--border, rgba(0,0,0,0.1));
  border-radius: 10px;
  background: var(--surface, #fff);
  color: var(--text, #1a1a1a);
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s;
}
.bento-btn:hover { background: var(--surface-hover, #f5f5f5); }
.bento-btn:disabled { opacity: 0.4; cursor: not-allowed; }
.bento-btn.primary {
  background: var(--accent, #6366f1);
  color: #fff;
  border-color: transparent;
}
.bento-btn.small {
  padding: 0.35rem 0.75rem;
  font-size: 0.8rem;
}
.preview-panel {
  position: sticky;
  top: 2rem;
}
.preview-header {
  margin-bottom: 1rem;
}
.preview-label {
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  opacity: 0.5;
}
.person-card-preview {
  border: 1px solid var(--border, rgba(0,0,0,0.06));
  border-radius: 12px;
  padding: 1.25rem;
  background: var(--surface-alt, rgba(0,0,0,0.02));
}
.person-card-preview.is-deceased {
  opacity: 0.6;
}
.card-avatar {
  width: 56px;
  height: 56px;
  border-radius: 50%;
  overflow: hidden;
  margin-bottom: 0.75rem;
}
.card-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.avatar-placeholder {
  width: 100%;
  height: 100%;
  background: var(--accent, #6366f1);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.25rem;
  font-weight: 500;
}
.card-info {
  margin-bottom: 0.75rem;
}
.card-name {
  font-size: 1.1rem;
  font-weight: 500;
  margin: 0 0 0.35rem;
}
.card-gender {
  font-size: 0.8rem;
  opacity: 0.6;
  margin-right: 0.5rem;
}
.card-status {
  font-size: 0.75rem;
  padding: 0.1rem 0.5rem;
  border-radius: 9999px;
  font-weight: 500;
}
.card-status.alive {
  background: #dcfce7;
  color: #15803d;
}
.card-status.deceased {
  background: #f3f4f6;
  color: #6b7280;
}
.card-details {
  border-top: 1px solid var(--border, rgba(0,0,0,0.06));
  padding-top: 0.75rem;
}
.detail-row {
  display: flex;
  gap: 0.5rem;
  font-size: 0.85rem;
  margin-bottom: 0.35rem;
}
.detail-row .label {
  opacity: 0.5;
  flex-shrink: 0;
  min-width: 2rem;
}
.detail-row.note .label {
  min-width: 2rem;
}
.pending-banner,
.success-banner {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 1rem 1.25rem;
  border-radius: 12px;
  margin-bottom: 1.5rem;
  font-size: 0.9rem;
}
.pending-banner {
  background: #fef3c7;
  color: #92400e;
  border: 1px solid #fbbf24;
}
.success-banner {
  background: #dcfce7;
  color: #166534;
  border: 1px solid #4ade80;
}
.empty-state {
  text-align: center;
  padding: 4rem 2rem;
  opacity: 0.6;
}
.empty-icon {
  margin-bottom: 1rem;
}
.empty-state h2 {
  margin: 0 0 0.5rem;
  font-size: 1.25rem;
}
.empty-state p {
  margin: 0;
  font-size: 0.9rem;
}
.loading-state {
  display: flex;
  justify-content: center;
  padding: 4rem;
}
.spinner {
  width: 24px;
  height: 24px;
  border: 3px solid var(--border, rgba(0,0,0,0.1));
  border-top-color: var(--accent, #6366f1);
  border-radius: 50%;
  animation: spin 0.6s linear infinite;
}
@keyframes spin {
  to { transform: rotate(360deg); }
}
@media (max-width: 768px) {
  .edit-layout {
    grid-template-columns: 1fr;
  }
  .preview-panel {
    position: static;
  }
}
</style>

