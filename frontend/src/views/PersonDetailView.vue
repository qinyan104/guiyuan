<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { getPublication, updatePerson, type PublicationLoadResult } from '../api/publication'
import type { Person, PublicationData, FamilyUnit, Gender } from '../types/family'

const props = defineProps<{
  publicationId: number
  personId: string
}>()

const router = useRouter()

const loading = ref(true)
const isSaving = ref(false)
const isEditing = ref(false)
const errorMsg = ref('')
const pubData = ref<PublicationData | null>(null)
const editForm = ref<Partial<Person>>({})

async function loadPublication() {
  loading.value = true
  errorMsg.value = ''
  try {
    const result: PublicationLoadResult = await getPublication(props.publicationId)
    pubData.value = result.publication
  } catch {
    errorMsg.value = '加载族谱失败'
  } finally {
    loading.value = false
  }
}

onMounted(loadPublication)

const person = computed<Person | null>(() => {
  if (!pubData.value) return null
  return pubData.value.people[props.personId] ?? null
})

// Find family where this person is an adult
const adultFamily = computed<FamilyUnit | null>(() => {
  if (!pubData.value) return null
  return Object.values(pubData.value.families).find(
    (f) => f.adults.includes(props.personId)
  ) ?? null
})

// Find family where this person is a child
const parentFamily = computed<FamilyUnit | null>(() => {
  if (!pubData.value) return null
  return Object.values(pubData.value.families).find(
    (f) => f.children.includes(props.personId)
  ) ?? null
})

const spouse = computed<Person | null>(() => {
  if (!adultFamily.value || !pubData.value) return null
  const spouseId = adultFamily.value.adults.find((id) => id && id !== props.personId)
  return spouseId ? pubData.value.people[spouseId] ?? null : null
})

const parents = computed<Person[]>(() => {
  if (!parentFamily.value || !pubData.value) return []
  return parentFamily.value.adults
    .map((id) => (id ? pubData.value!.people[id] : null))
    .filter((p): p is Person => Boolean(p))
})

const children = computed<Person[]>(() => {
  if (!adultFamily.value || !pubData.value) return []
  return adultFamily.value.children
    .map((id) => pubData.value!.people[id])
    .filter((p): p is Person => Boolean(p))
})

const siblings = computed<Person[]>(() => {
  if (!parentFamily.value || !pubData.value) return []
  return parentFamily.value.children
    .filter((id) => id !== props.personId)
    .map((id) => pubData.value!.people[id])
    .filter((p): p is Person => Boolean(p))
})

function genderLabel(g: Gender): string {
  if (g === 'male') return '男'
  if (g === 'female') return '女'
  return '未知'
}

function genderIcon(g: Gender): string {
  if (g === 'male') return '♂'
  if (g === 'female') return '♀'
  return '○'
}

function genderClass(g: Gender): string {
  if (g === 'male') return 'gender-male'
  if (g === 'female') return 'gender-female'
  return 'gender-unknown'
}

function statusLabel(p: Person): string {
  if (p.deceased) return '已故'
  if (p.birth) {
    const birthYear = parseInt(p.birth)
    if (!isNaN(birthYear)) {
      const age = new Date().getFullYear() - birthYear
      return `${age} 岁`
    }
  }
  return '在世'
}

function photoUrl(avatarUrl?: string): string {
  if (!avatarUrl) return ''
  if (avatarUrl.startsWith('http')) return avatarUrl
  return avatarUrl
}

function goToPerson(id: string) {
  router.push({ name: 'person-detail', params: { pubId: props.publicationId, personId: id } })
}

function goBack() {
  router.push({ name: 'workbench', params: { id: props.publicationId } })
}

function goToPublications() {
  router.push({ name: 'publications' })
}

function startEdit() {
  if (!person.value) return
  editForm.value = { ...person.value }
  isEditing.value = true
}

function cancelEdit() {
  isEditing.value = false
}

async function handleSave() {
  if (!person.value) return
  isSaving.value = true
  try {
    await updatePerson(props.publicationId, props.personId, editForm.value)
    isEditing.value = false
    await loadPublication()
  } catch (err: any) {
    alert('保存失败: ' + (err.message || '未知错误'))
  } finally {
    isSaving.value = false
  }
}
</script>

<template>
  <div class="detail-page">
    <!-- Top Navigation -->
    <header class="detail-nav">
      <div class="detail-nav__left">
        <button class="nav-back" @click="goBack">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polyline points="15 18 9 12 15 6"/></svg>
          返回工作台
        </button>
        <div class="nav-breadcrumb">
          <span class="nav-link" @click="goToPublications">族谱管理</span>
          <span class="nav-sep">/</span>
          <span class="nav-current">{{ person?.name || '人物详情' }}</span>
        </div>
      </div>
      <div class="detail-nav__actions" v-if="person">
        <template v-if="!isEditing">
          <button class="btn-edit" @click="startEdit">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/></svg>
            编辑资料
          </button>
        </template>
        <template v-else>
          <button class="btn-cancel" :disabled="isSaving" @click="cancelEdit">取消</button>
          <button class="btn-save" :disabled="isSaving" @click="handleSave">
            {{ isSaving ? '保存中...' : '保存更改' }}
          </button>
        </template>
      </div>
    </header>

    <div v-if="loading" class="loading-state">加载中...</div>
    <div v-else-if="errorMsg" class="error-state">{{ errorMsg }}</div>
    <div v-else-if="!person" class="error-state">未找到该人物</div>

    <main v-else class="detail-content">
      <!-- Person Hero -->
      <section class="person-hero" :class="{ 'person-hero--editing': isEditing }">
        <div class="person-avatar" :class="genderClass(isEditing ? (editForm.gender as Gender) : person.gender)">
          <img v-if="person.avatarUrl" :src="photoUrl(person.avatarUrl)" :alt="person.name" />
          <span v-else class="avatar-text">{{ (isEditing ? editForm.name : person.name)?.slice(-1) || '?' }}</span>
        </div>
        
        <div v-if="!isEditing" class="person-info">
          <div class="person-name-row">
            <h1 class="person-name">{{ person.name }}</h1>
            <span class="gender-badge" :class="genderClass(person.gender)">
              {{ genderIcon(person.gender) }} {{ genderLabel(person.gender) }}
            </span>
            <span v-if="person.deceased" class="status-badge status-badge--deceased">已故</span>
            <span v-else class="status-badge status-badge--alive">在世</span>
          </div>
          <div v-if="person.titleName || person.clan" class="person-sub">
            <span v-if="person.titleName" class="sub-item">字/号：{{ person.titleName }}</span>
            <span v-if="person.clan" class="sub-item">堂号/氏：{{ person.clan }}</span>
          </div>
          <div class="person-dates">
            <span v-if="person.birth" class="date-item">
              <span class="date-label">出生</span>
              <span class="date-value">{{ person.birth }}</span>
            </span>
            <span v-if="person.death" class="date-item">
              <span class="date-label">去世</span>
              <span class="date-value">{{ person.death }}</span>
            </span>
            <span v-if="person.birth && person.death" class="date-item">
              <span class="date-label">享年</span>
              <span class="date-value">{{ statusLabel(person) }}</span>
            </span>
          </div>
        </div>

        <div v-else class="person-info person-info--form">
          <div class="form-row">
            <div class="field field--name">
              <label>姓名</label>
              <input v-model="editForm.name" type="text" placeholder="请输入姓名" />
            </div>
            <div class="field field--gender">
              <label>性别</label>
              <select v-model="editForm.gender">
                <option value="male">男</option>
                <option value="female">女</option>
                <option value="unknown">未知</option>
              </select>
            </div>
            <div class="field field--deceased">
              <label>状态</label>
              <div class="checkbox-group">
                <input type="checkbox" id="deceased-check" v-model="editForm.deceased" />
                <label for="deceased-check">已故</label>
              </div>
            </div>
          </div>
          <div class="form-row">
            <div class="field">
              <label>字/号</label>
              <input v-model="editForm.titleName" type="text" placeholder="例：东坡居士" />
            </div>
            <div class="field">
              <label>堂号/氏</label>
              <input v-model="editForm.clan" type="text" placeholder="例：陇西李氏" />
            </div>
          </div>
          <div class="form-row">
            <div class="field">
              <label>出生日期</label>
              <input v-model="editForm.birth" type="text" placeholder="例：1921年十月初二" />
            </div>
            <div class="field" v-if="editForm.deceased">
              <label>去世日期</label>
              <input v-model="editForm.death" type="text" placeholder="例：2008年腊月" />
            </div>
            <div class="field">
              <label>年龄/享年</label>
              <input v-model="editForm.age" type="text" placeholder="例：87 岁" />
            </div>
          </div>
        </div>
      </section>

      <!-- Note / Bio -->
      <section class="detail-section">
        <h2 class="section-title">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
          {{ isEditing ? '生平注记' : '备注' }}
        </h2>
        <div v-if="!isEditing" class="note-content" :class="{ 'note-content--empty': !person.note }">
          {{ person.note || '暂无详细记录' }}
        </div>
        <div v-else class="field field--full">
          <textarea v-model="editForm.note" rows="10" placeholder="在此输入人物的生平事迹、重要成就、家族迁徙等详细注记..."></textarea>
        </div>
      </section>

      <!-- Relationships -->
      <div v-if="!isEditing" class="rel-grid">
        <!-- Parents -->
        <section class="rel-section">
          <h2 class="section-title">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>
            父母
          </h2>
          <div v-if="parents.length === 0" class="rel-empty">暂无记录</div>
          <div v-else class="rel-list">
            <div v-for="p in parents" :key="p.id" class="rel-card" @click="goToPerson(p.id)">
              <div class="rel-card__avatar" :class="genderClass(p.gender)">
                {{ p.name.slice(-1) }}
              </div>
              <div class="rel-card__info">
                <span class="rel-card__name">{{ p.name }}</span>
                <span class="rel-card__meta">{{ genderLabel(p.gender) }} · {{ statusLabel(p) }}</span>
              </div>
            </div>
          </div>
        </section>

        <!-- Spouse -->
        <section class="rel-section">
          <h2 class="section-title">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
            配偶
          </h2>
          <div v-if="!spouse" class="rel-empty">暂无记录</div>
          <div v-else class="rel-card" @click="goToPerson(spouse.id)">
            <div class="rel-card__avatar" :class="genderClass(spouse.gender)">
              {{ spouse.name.slice(-1) }}
            </div>
            <div class="rel-card__info">
              <span class="rel-card__name">{{ spouse.name }}</span>
              <span class="rel-card__meta">{{ genderLabel(spouse.gender) }} · {{ statusLabel(spouse) }}</span>
            </div>
          </div>
        </section>

        <!-- Children -->
        <section class="rel-section">
          <h2 class="section-title">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
            子女
            <span v-if="children.length" class="section-count">{{ children.length }}</span>
          </h2>
          <div v-if="children.length === 0" class="rel-empty">暂无记录</div>
          <div v-else class="rel-list">
            <div v-for="c in children" :key="c.id" class="rel-card" @click="goToPerson(c.id)">
              <div class="rel-card__avatar" :class="genderClass(c.gender)">
                {{ c.name.slice(-1) }}
              </div>
              <div class="rel-card__info">
                <span class="rel-card__name">{{ c.name }}</span>
                <span class="rel-card__meta">{{ genderLabel(c.gender) }} · {{ statusLabel(c) }}</span>
              </div>
            </div>
          </div>
        </section>

        <!-- Siblings -->
        <section v-if="siblings.length > 0" class="rel-section">
          <h2 class="section-title">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
            兄弟姐妹
            <span class="section-count">{{ siblings.length }}</span>
          </h2>
          <div class="rel-list">
            <div v-for="s in siblings" :key="s.id" class="rel-card" @click="goToPerson(s.id)">
              <div class="rel-card__avatar" :class="genderClass(s.gender)">
                {{ s.name.slice(-1) }}
              </div>
              <div class="rel-card__info">
                <span class="rel-card__name">{{ s.name }}</span>
                <span class="rel-card__meta">{{ genderLabel(s.gender) }} · {{ statusLabel(s) }}</span>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  </div>
</template>

<style scoped>
.detail-page {
  min-height: 100vh;
  background: var(--bg-shell, #f5f0e8);
}

/* ── Nav ── */
.detail-nav {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding: 0 2rem;
  height: 56px;
  background: var(--bg-panel, rgba(255,255,255,0.85));
  border-bottom: 1px solid var(--border-color, rgba(0,0,0,0.06));
  backdrop-filter: blur(24px) saturate(180%);
  position: sticky;
  top: 0;
  z-index: 100;
}

.detail-nav__left {
  display: flex;
  align-items: center;
  gap: 1.5rem;
}

.nav-back {
  display: flex;
  align-items: center;
  gap: 0.3rem;
  background: none;
  border: none;
  color: var(--text-sub, #555);
  font-size: 0.82rem;
  font-weight: 600;
  cursor: pointer;
  padding: 0.4rem 0.6rem;
  border-radius: 8px;
  transition: all 0.2s;
}

.nav-back:hover {
  color: var(--text-main, #1a1a1a);
  background: var(--bg-hover, rgba(0,0,0,0.04));
}

.nav-breadcrumb {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  font-size: 0.82rem;
}

.nav-link {
  color: var(--text-soft, #888);
  cursor: pointer;
  font-weight: 600;
  transition: color 0.2s;
}

.nav-link:hover {
  color: var(--accent-amber, #a96e35);
}

.nav-sep {
  color: var(--text-soft, #ccc);
}

.nav-current {
  color: var(--text-main, #1a1a1a);
  font-weight: 700;
}

.detail-nav__actions {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.btn-edit, .btn-save {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.5rem 1rem;
  border-radius: 10px;
  font-size: 0.85rem;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.2s;
  border: none;
}

.btn-edit {
  background: var(--bg-hover, rgba(0,0,0,0.04));
  color: var(--text-main, #1a1a1a);
}

.btn-edit:hover {
  background: var(--accent-amber, #a96e35);
  color: #fff;
}

.btn-save {
  background: linear-gradient(135deg, var(--accent-ink, #6a4b2f), var(--accent-amber, #a96e35));
  color: #fff;
  box-shadow: 0 4px 12px rgba(169, 110, 53, 0.2);
}

.btn-save:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 6px 16px rgba(169, 110, 53, 0.3);
}

.btn-save:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-cancel {
  background: none;
  border: 1px solid var(--border-color, rgba(0,0,0,0.1));
  color: var(--text-sub, #666);
  padding: 0.5rem 1rem;
  border-radius: 10px;
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
}

.btn-cancel:hover {
  background: rgba(0,0,0,0.02);
  color: var(--text-main);
}

.loading-state,
.error-state {
  text-align: center;
  padding: 4rem 1rem;
  color: var(--text-soft, #888);
  font-size: 0.9rem;
}

/* ── Content ── */
.detail-content {
  max-width: 900px;
  margin: 0 auto;
  padding: 2.5rem 2rem;
}

/* ── Hero ── */
.person-hero {
  display: flex;
  gap: 2rem;
  align-items: flex-start;
  margin-bottom: 2.5rem;
}

.person-hero--editing {
  background: var(--bg-panel, #fff);
  padding: 2rem;
  border-radius: 20px;
  border: 1px solid var(--border-color, rgba(0,0,0,0.06));
  box-shadow: 0 4px 20px rgba(0,0,0,0.02);
}

.person-avatar {
  width: 120px;
  height: 120px;
  border-radius: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  overflow: hidden;
  font-size: 2.5rem;
  font-weight: 700;
  color: #fff;
  box-shadow: 0 8px 24px rgba(0,0,0,0.12);
}

.person-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.gender-male .avatar-text,
.person-avatar.gender-male {
  background: linear-gradient(135deg, #3b82f6, #1d4ed8);
}

.gender-female .avatar-text,
.person-avatar.gender-female {
  background: linear-gradient(135deg, #ec4899, #be185d);
}

.gender-unknown .avatar-text,
.person-avatar.gender-unknown {
  background: linear-gradient(135deg, #9ca3af, #4b5563);
}

.person-info {
  flex: 1;
}

.person-name-row {
  display: flex;
  align-items: center;
  gap: 0.8rem;
  flex-wrap: wrap;
  margin-bottom: 0.75rem;
}

.person-name {
  font-size: 2.25rem;
  font-family: 'Noto Serif SC', serif;
  font-weight: 800;
  color: var(--text-main, #1a1a1a);
  margin: 0;
}

.gender-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  padding: 0.25rem 0.75rem;
  border-radius: 999px;
  font-size: 0.75rem;
  font-weight: 700;
}

.gender-badge.gender-male {
  background: rgba(59, 130, 246, 0.1);
  color: #2563eb;
}

.gender-badge.gender-female {
  background: rgba(236, 72, 153, 0.1);
  color: #db2777;
}

.gender-badge.gender-unknown {
  background: rgba(107, 114, 128, 0.1);
  color: #4b5563;
}

.status-badge {
  padding: 0.25rem 0.75rem;
  border-radius: 999px;
  font-size: 0.75rem;
  font-weight: 700;
}

.status-badge--deceased {
  background: rgba(107, 114, 128, 0.1);
  color: #4b5563;
}

.status-badge--alive {
  background: rgba(22, 163, 74, 0.1);
  color: #15803d;
}

.person-sub {
  display: flex;
  gap: 1.5rem;
  margin-bottom: 0.75rem;
}

.sub-item {
  font-size: 0.9rem;
  color: var(--text-sub, #666);
  font-weight: 500;
}

.person-dates {
  display: flex;
  gap: 2rem;
  flex-wrap: wrap;
}

.date-item {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.date-label {
  font-size: 0.72rem;
  color: var(--text-soft, #999);
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
}

.date-value {
  font-size: 1rem;
  font-weight: 600;
  color: var(--text-main, #1a1a1a);
}

/* ── Form ── */
.form-row {
  display: flex;
  gap: 1rem;
  margin-bottom: 1rem;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
  flex: 1;
}

.field--name { flex: 2; }
.field--gender { flex: 1; }
.field--deceased { flex: 1; }

.field label {
  font-size: 0.75rem;
  font-weight: 700;
  color: var(--text-soft, #888);
  margin-left: 0.25rem;
}

.field input, .field select, .field textarea {
  width: 100%;
  padding: 0.65rem 0.9rem;
  border: 1px solid var(--border-color, rgba(0,0,0,0.12));
  border-radius: 12px;
  background: var(--bg-panel, #fff);
  color: var(--text-main, #1a1a1a);
  font-size: 0.9rem;
  outline: none;
  transition: border-color 0.2s, box-shadow 0.2s;
  box-sizing: border-box;
}

.field input:focus, .field select:focus, .field textarea:focus {
  border-color: var(--accent-amber, #a96e35);
  box-shadow: 0 0 0 3px rgba(169, 110, 53, 0.08);
}

.checkbox-group {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  height: 38px;
}

.checkbox-group input[type="checkbox"] {
  width: 18px;
  height: 18px;
  cursor: pointer;
}

.checkbox-group label {
  margin: 0;
  font-size: 0.9rem;
  font-weight: 600;
  color: var(--text-main);
  cursor: pointer;
}

/* ── Sections ── */
.detail-section {
  margin-bottom: 2.5rem;
}

.section-title {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 1.1rem;
  font-weight: 800;
  color: var(--text-main, #1a1a1a);
  margin: 0 0 1rem;
  font-family: 'Noto Serif SC', serif;
}

.section-count {
  display: inline-block;
  padding: 0.15rem 0.5rem;
  background: rgba(0,0,0,0.04);
  border-radius: 999px;
  font-size: 0.7rem;
  font-weight: 800;
  color: var(--text-soft, #888);
}

.note-content {
  background: var(--bg-panel, #fff);
  border: 1px solid var(--border-color, rgba(0,0,0,0.06));
  border-radius: 18px;
  padding: 1.5rem;
  font-size: 0.95rem;
  line-height: 1.9;
  color: var(--text-sub, #444);
  white-space: pre-wrap;
  box-shadow: 0 4px 12px rgba(0,0,0,0.01);
}

.note-content--empty {
  color: var(--text-soft, #aaa);
  font-style: italic;
  text-align: center;
  padding: 3rem 1.5rem;
}

/* ── Relationship Grid ── */
.rel-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1.5rem;
}

.rel-section {
  background: var(--bg-panel, #fff);
  border: 1px solid var(--border-color, rgba(0,0,0,0.06));
  border-radius: 18px;
  padding: 1.5rem;
  box-shadow: 0 4px 12px rgba(0,0,0,0.01);
}

.rel-empty {
  font-size: 0.85rem;
  color: var(--text-soft, #aaa);
  padding: 0.75rem 0;
  text-align: center;
}

.rel-list {
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
}

.rel-card {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 0.65rem 0.85rem;
  border-radius: 14px;
  cursor: pointer;
  transition: all 0.2s;
  border: 1px solid transparent;
}

.rel-card:hover {
  background: var(--bg-hover, rgba(0,0,0,0.02));
  border-color: var(--border-color);
  transform: translateX(4px);
}

.rel-card__avatar {
  width: 42px;
  height: 42px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1rem;
  font-weight: 700;
  color: #fff;
  flex-shrink: 0;
  box-shadow: 0 4px 10px rgba(0,0,0,0.1);
}

.rel-card__avatar.gender-male {
  background: linear-gradient(135deg, #3b82f6, #1d4ed8);
}

.rel-card__avatar.gender-female {
  background: linear-gradient(135deg, #ec4899, #be185d);
}

.rel-card__avatar.gender-unknown {
  background: linear-gradient(135deg, #9ca3af, #4b5563);
}

.rel-card__info {
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
}

.rel-card__name {
  font-size: 0.95rem;
  font-weight: 700;
  color: var(--text-main, #1a1a1a);
}

.rel-card__meta {
  font-size: 0.75rem;
  color: var(--text-soft, #888);
  font-weight: 500;
}

@media (max-width: 768px) {
  .detail-content {
    padding: 1.5rem 1rem;
  }

  .person-hero {
    flex-direction: column;
    align-items: center;
    text-align: center;
    gap: 1.5rem;
  }

  .person-name-row {
    justify-content: center;
  }

  .person-sub {
    justify-content: center;
  }

  .person-dates {
    justify-content: center;
    gap: 1.5rem;
  }

  .rel-grid {
    grid-template-columns: 1fr;
  }

  .form-row {
    flex-direction: column;
  }
}
</style>
