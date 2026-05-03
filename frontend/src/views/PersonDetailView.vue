<script setup lang="ts">
import { computed, ref, inject } from 'vue'
import { useRouter } from 'vue-router'
import type { Person, FamilyUnit, Gender } from '../types/family'

const props = defineProps<{
  publicationId: number
  personId: string
}>()

const router = useRouter()

// ─── Shared Context ─────────────────────────────────────────────
const { pub, saveToServer, history } = inject('publication-context') as any
const pubData = computed(() => pub.publication)

const isSaving = ref(false)
const isEditing = ref(false)
const editForm = ref<Partial<Person>>({})

const person = computed<Person | null>(() => {
  if (!pubData.value) return null
  return pubData.value.people[props.personId] ?? null
})

// Find family where this person is an adult
const adultFamily = computed<FamilyUnit | null>(() => {
  if (!pubData.value) return null
  return Object.values(pubData.value.families).find(
    (f: any) => f.adults.includes(props.personId)
  ) ?? (null as any)
})

// Find family where this person is a child
const parentFamily = computed<FamilyUnit | null>(() => {
  if (!pubData.value) return null
  return Object.values(pubData.value.families).find(
    (f: any) => f.children.includes(props.personId)
  ) ?? (null as any)
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
  router.push({ name: 'person-detail', params: { personId: id } })
}

function goBack() {
  router.push({ name: 'workbench' })
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
    // Update reactive state in shared context
    Object.assign(pub.publication.people[props.personId], editForm.value)
    
    // Trigger immediate save and mark history
    await saveToServer()
    history.markHistory('修改人物详情')
    
    isEditing.value = false
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
      <div class="detail-nav__actions" v-if="person && !isEditing">
        <button class="btn-edit" @click="startEdit">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/></svg>
          编辑资料
        </button>
      </div>
    </header>

    <div v-if="!person" class="error-state">未找到该人物</div>

    <main v-else class="detail-content">
      <!-- Floating Action Bar (Only visible when editing) -->
      <Transition name="slide-up">
        <div v-if="isEditing" class="floating-actions">
          <div class="floating-actions__content">
            <span class="editing-label">正在编辑生平资料...</span>
            <div class="floating-actions__btns">
              <button class="btn-cancel" :disabled="isSaving" @click="cancelEdit">取消</button>
              <button class="btn-save" :disabled="isSaving" @click="handleSave">
                {{ isSaving ? '保存中...' : '保存并同步' }}
              </button>
            </div>
          </div>
        </div>
      </Transition>
      <div class="content-grid">
        <!-- Main Column: Bio -->
        <div class="column-main">
          <!-- Note / Bio -->
          <section class="bio-card card">
            <h2 class="section-title">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
              生平注记
            </h2>
            <div v-if="!isEditing" class="note-content" :class="{ 'note-content--empty': !person.note }">
              <span v-if="person.note" class="drop-cap">{{ person.note.charAt(0) }}</span>
              {{ person.note ? person.note.slice(1) : '暂无详细记录' }}
              <div class="scroll-ornament scroll-ornament--top"></div>
              <div class="scroll-ornament scroll-ornament--bottom"></div>
            </div>
            <div v-else class="field field--full">
              <textarea v-model="editForm.note" rows="15" placeholder="在此输入人物的生平事迹、重要成就、家族迁徙等详细注记..."></textarea>
            </div>
          </section>
        </div>

        <!-- Sidebar Column: Hero & Relationships -->
        <aside class="column-sidebar">
          <!-- Person Hero -->
          <section class="person-hero" :class="{ 'person-hero--deceased': person.deceased, 'person-hero--editing': isEditing }">
            <div class="hero-inner">
              <div class="person-avatar-frame octagonal-frame">
                <div class="person-avatar octagonal-clip" :class="genderClass(isEditing ? (editForm.gender as Gender) : person.gender)">
                  <img v-if="person.avatarUrl" :src="photoUrl(person.avatarUrl)" :alt="person.name" />
                  <span v-else class="avatar-text">{{ (isEditing ? editForm.name : person.name)?.slice(-1) || '?' }}</span>
                </div>
              </div>
              
              <div v-if="!isEditing" class="hero-info">
                <h1 class="hero-name">{{ person.name }}</h1>
                <div class="hero-dates">
                  {{ person.birth || '?' }} — {{ person.death || (person.deceased ? '?' : '至今') }}
                </div>
                <div class="hero-badges">
                  <span class="gender-badge" :class="genderClass(person.gender)">
                    {{ genderIcon(person.gender) }} {{ genderLabel(person.gender) }}
                  </span>
                  <span v-if="person.deceased" class="vermilion-seal seal--deceased">已故</span>
                  <span v-else class="vermilion-seal seal--alive">在世</span>
                </div>
                <div v-if="person.titleName || person.clan" class="hero-sub">
                  <div v-if="person.titleName" class="sub-item">字/号：{{ person.titleName }}</div>
                  <div v-if="person.clan" class="sub-item">堂号：{{ person.clan }}</div>
                </div>
              </div>

              <div v-else class="person-info person-info--form">
                <div class="edit-form-grid">
                  <!-- Section 1: Vital Stats -->
                  <div class="form-section">
                    <h3 class="form-section-title">核心信息</h3>
                    <div class="form-row">
                      <div class="field field--name">
                        <label>姓名</label>
                        <input v-model="editForm.name" type="text" placeholder="请输入姓名" />
                      </div>
                    </div>
                    <div class="form-row">
                      <div class="field field--gender">
                        <label>性别</label>
                        <select v-model="editForm.gender">
                          <option value="male">男</option>
                          <option value="female">女</option>
                          <option value="unknown">未知</option>
                        </select>
                      </div>
                      <div class="field field--deceased">
                        <label>生死状态</label>
                        <div class="checkbox-group">
                          <input type="checkbox" id="deceased-check" v-model="editForm.deceased" />
                          <label for="deceased-check">已故</label>
                        </div>
                      </div>
                    </div>
                  </div>

                  <!-- Section 2: Identity -->
                  <div class="form-section">
                    <h3 class="form-section-title">身份与堂号</h3>
                    <div class="form-row">
                      <div class="field">
                        <label>字/号/讳</label>
                        <input v-model="editForm.titleName" type="text" placeholder="例：东坡居士" />
                      </div>
                    </div>
                    <div class="form-row">
                      <div class="field">
                        <label>堂号/氏</label>
                        <input v-model="editForm.clan" type="text" placeholder="例：陇西李氏" />
                      </div>
                    </div>
                  </div>

                  <!-- Section 3: Dates -->
                  <div class="form-section">
                    <h3 class="form-section-title">重要日期</h3>
                    <div class="form-row">
                      <div class="field">
                        <label>出生日期</label>
                        <input v-model="editForm.birth" type="text" placeholder="例：1921年十月初二" />
                      </div>
                    </div>
                    <div class="form-row">
                      <div class="field" v-if="editForm.deceased">
                        <label>去世日期</label>
                        <input v-model="editForm.death" type="text" placeholder="例：2008年腊月" />
                      </div>
                      <div class="field">
                        <label>享年/岁数</label>
                        <input v-model="editForm.age" type="text" placeholder="例：87 岁" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <div class="rel-card-group card" v-if="!isEditing">
            <h2 class="section-title">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
              家族成员
            </h2>
            
            <div class="rel-grid">
              <!-- Parents -->
              <section class="rel-section">
                <h3 class="rel-group-title">父母</h3>
                <div v-if="parents.length === 0" class="rel-empty">暂无记录</div>
                <div v-else class="rel-list">
                  <div v-for="p in parents" :key="p.id" class="rel-card" @click="goToPerson(p.id)">
                    <div class="rel-card__avatar" :class="genderClass(p.gender)">
                      {{ p.name.slice(-1) }}
                    </div>
                    <div class="rel-card__info">
                      <span class="rel-card__name">{{ p.name }} <span class="gender-mini-icon">{{ genderIcon(p.gender) }}</span></span>
                      <span class="rel-card__meta">{{ statusLabel(p) }}</span>
                    </div>
                  </div>
                </div>
              </section>

              <!-- Spouse -->
              <section class="rel-section">
                <h3 class="rel-group-title">配偶</h3>
                <div v-if="!spouse" class="rel-empty">暂无记录</div>
                <div v-else class="rel-card" @click="goToPerson(spouse.id)">
                  <div class="rel-card__avatar" :class="genderClass(spouse.gender)">
                    {{ spouse.name.slice(-1) }}
                  </div>
                  <div class="rel-card__info">
                    <span class="rel-card__name">{{ spouse.name }} <span class="gender-mini-icon">{{ genderIcon(spouse.gender) }}</span></span>
                    <span class="rel-card__meta">{{ statusLabel(spouse) }}</span>
                  </div>
                </div>
              </section>

              <!-- Children -->
              <section class="rel-section">
                <h3 class="rel-group-title">子女 <span v-if="children.length" class="section-count">{{ children.length }}</span></h3>
                <div v-if="children.length === 0" class="rel-empty">暂无记录</div>
                <div v-else class="rel-list">
                  <div v-for="c in children" :key="c.id" class="rel-card" @click="goToPerson(c.id)">
                    <div class="rel-card__avatar" :class="genderClass(c.gender)">
                      {{ c.name.slice(-1) }}
                    </div>
                    <div class="rel-card__info">
                      <span class="rel-card__name">{{ c.name }} <span class="gender-mini-icon">{{ genderIcon(c.gender) }}</span></span>
                      <span class="rel-card__meta">{{ statusLabel(c) }}</span>
                    </div>
                  </div>
                </div>
              </section>

              <!-- Siblings -->
              <section v-if="siblings.length > 0" class="rel-section">
                <h3 class="rel-group-title">兄弟姐妹 <span class="section-count">{{ siblings.length }}</span></h3>
                <div class="rel-list">
                  <div v-for="s in siblings" :key="s.id" class="rel-card" @click="goToPerson(s.id)">
                    <div class="rel-card__avatar" :class="genderClass(s.gender)">
                      {{ s.name.slice(-1) }}
                    </div>
                    <div class="rel-card__info">
                      <span class="rel-card__name">{{ s.name }} <span class="gender-mini-icon">{{ genderIcon(s.gender) }}</span></span>
                      <span class="rel-card__meta">{{ statusLabel(s) }}</span>
                    </div>
                  </div>
                </div>
              </section>
            </div>
          </div>
        </aside>
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

.error-state {
  text-align: center;
  padding: 4rem 1rem;
  color: var(--text-soft, #888);
  font-size: 0.9rem;
}

/* ── Content ── */
.detail-content {
  max-width: 1200px;
  margin: 0 auto;
  padding: 3rem 2rem;
  animation: fadeIn 0.8s cubic-bezier(0.22, 1, 0.36, 1);
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(30px); }
  to { opacity: 1; transform: translateY(0); }
}

.content-grid {
  display: grid;
  grid-template-columns: 1fr 360px;
  gap: 2.5rem;
  align-items: start;
}

.column-sidebar {
  position: sticky;
  top: 80px;
  display: flex;
  flex-direction: column;
  gap: 2rem;
}

@media (max-width: 1024px) {
  .content-grid {
    grid-template-columns: 1fr;
    max-width: 800px;
    margin: 0 auto;
  }
  .column-sidebar {
    position: static;
  }
}

.card {
  background: var(--bg-panel-strong, #fff);
  border-radius: 24px;
  border: 1px solid var(--line-soft, rgba(0,0,0,0.06));
  box-shadow: 0 10px 30px rgba(0,0,0,0.03);
  padding: 2rem;
}

/* ── Hero ── */
.person-hero {
  padding: 2.5rem 1.5rem;
  text-align: center;
  background: var(--bg-panel-strong, #fff);
  border-radius: 24px;
  border: 1px solid var(--line-soft, rgba(0,0,0,0.06));
  box-shadow: 0 10px 30px rgba(0,0,0,0.03);
  position: relative;
  transition: all 0.5s ease;
  overflow: hidden;
}

.person-hero--deceased {
  filter: grayscale(0.5) sepia(0.3);
  opacity: 0.95;
}

.person-hero--deceased::before {
  content: "";
  position: absolute;
  inset: 0;
  background: radial-gradient(circle at center, transparent 30%, rgba(0,0,0,0.05) 100%);
  pointer-events: none;
}

.hero-inner {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1.25rem;
  position: relative;
  z-index: 1;
}

.octagonal-frame {
  display: inline-block;
  padding: 8px;
  background: linear-gradient(135deg, var(--accent-amber, #a96e35), #6a4b2f);
  clip-path: polygon(30% 0%, 70% 0%, 100% 30%, 100% 70%, 70% 100%, 30% 100%, 0% 70%, 0% 30%);
  transition: transform 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
  box-shadow: 0 8px 24px rgba(106, 75, 47, 0.3);
}

.person-hero:hover .octagonal-frame {
  transform: rotate(3deg) scale(1.05);
}

.octagonal-clip {
  width: 130px;
  height: 130px;
  clip-path: polygon(30% 0%, 70% 0%, 100% 30%, 100% 70%, 70% 100%, 30% 100%, 0% 70%, 0% 30%);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  overflow: hidden;
  font-size: 2.8rem;
  font-weight: 700;
  color: #fff;
  border: 2px solid rgba(255,255,255,0.2);
  background-color: rgba(169, 110, 53, 0.05);
}

.person-avatar img {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.person-avatar.gender-male {
  background: linear-gradient(135deg, #3b82f6, #1d4ed8);
}

.person-avatar.gender-female {
  background: linear-gradient(135deg, #ec4899, #be185d);
}

.person-avatar.gender-unknown {
  background: linear-gradient(135deg, #9ca3af, #4b5563);
}

.hero-info {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.hero-name {
  font-size: 2.2rem;
  font-family: 'Noto Serif SC', serif;
  font-weight: 900;
  color: var(--text-main, #1a1a1a);
  margin: 0 0 0.25rem;
  letter-spacing: 0.05em;
}

.hero-dates {
  font-size: 0.95rem;
  font-weight: 600;
  color: var(--text-soft, #888);
  letter-spacing: 0.15em;
  margin-bottom: 1.25rem;
  font-family: 'Noto Serif SC', serif;
}

.hero-badges {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 1.25rem;
}

/* Vermilion Seal Styling */
.vermilion-seal {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 54px;
  height: 54px;
  border: 2.5px solid #b22222;
  color: #b22222;
  font-family: 'Noto Serif SC', serif;
  font-weight: 900;
  font-size: 1.1rem;
  line-height: 1.1;
  padding: 4px;
  background: rgba(178, 34, 34, 0.03);
  box-shadow: inset 0 0 10px rgba(178, 34, 34, 0.1);
  position: relative;
  text-transform: uppercase;
  writing-mode: vertical-rl;
  text-orientation: upright;
  letter-spacing: -0.1em;
}

.vermilion-seal::after {
  content: "";
  position: absolute;
  inset: 0;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100' viewBox='0 0 100 100'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100' height='100' filter='url(%23noise)' opacity='0.2'/%3E%3C/svg%3E");
  pointer-events: none;
  mix-blend-mode: multiply;
}

.seal--deceased {
  border-style: double;
  border-width: 4px;
}

.seal--alive {
  border-radius: 4px;
}

.hero-sub {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
  color: var(--text-sub, #666);
  font-weight: 500;
  font-size: 0.95rem;
  font-family: 'Noto Serif SC', serif;
}

.sub-item {
  position: relative;
}

.person-hero--editing {
  background: var(--bg-panel, #fff);
  padding: 2rem 1.5rem;
  border-radius: 24px;
}

.person-info--form {
  width: 100%;
  text-align: left;
}

.edit-form-grid {
  display: flex;
  flex-direction: column;
  gap: 2rem;
}

.form-section {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.form-section-title {
  font-size: 0.9rem;
  font-weight: 800;
  color: var(--accent-amber, #a96e35);
  text-transform: uppercase;
  letter-spacing: 0.1em;
  margin: 0;
  padding-bottom: 0.5rem;
  border-bottom: 1px solid var(--line-soft);
}

.gender-badge {
  padding: 0.4rem 1.2rem;
  border-radius: 6px;
  font-size: 0.85rem;
  font-weight: 800;
  font-family: 'Noto Serif SC', serif;
  border: 1px solid currentColor;
}

.gender-badge.gender-male { background: rgba(59, 130, 246, 0.05); color: #2563eb; }
.gender-badge.gender-female { background: rgba(236, 72, 153, 0.05); color: #db2777; }
.gender-badge.gender-unknown { background: rgba(107, 114, 128, 0.05); color: #4b5563; }

/* ── Form ── */
.form-row {
  display: flex;
  gap: 1.5rem;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
  flex: 1;
}

.field--name { flex: 2; }

.field label {
  font-size: 0.75rem;
  font-weight: 700;
  color: var(--text-soft, #888);
  margin-left: 0.25rem;
}

.field input, .field select {
  width: 100%;
  padding: 0.75rem 0.5rem;
  border: none;
  border-bottom: 2px solid var(--line-soft, rgba(0,0,0,0.1));
  border-radius: 0;
  background: transparent;
  color: var(--text-main, #1a1a1a);
  font-size: 1rem;
  font-weight: 500;
  outline: none;
  transition: all 0.3s;
}

.field input:focus, .field select:focus {
  border-bottom-color: var(--accent-amber, #a96e35);
  background: rgba(169, 110, 53, 0.02);
}

.field textarea {
  width: 100%;
  border: 1px solid var(--line-soft);
  border-radius: 16px;
  padding: 1.5rem;
  background: var(--bg-paper, #fff);
  font-size: 1rem;
  line-height: 1.6;
  outline: none;
  transition: all 0.3s;
}

.field textarea:focus {
  border-color: var(--accent-amber);
  box-shadow: 0 0 0 4px rgba(169, 110, 53, 0.05);
}

.checkbox-group {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  height: 44px;
}

/* ── Biography & Note ── */
.section-title {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  font-size: 1.4rem;
  font-weight: 900;
  color: var(--accent-ink, #4a3423);
  margin: 0 0 1.5rem;
  font-family: 'Noto Serif SC', serif;
  border-left: 4px solid var(--accent-amber, #a96e35);
  padding-left: 1rem;
}

.note-content {
  font-size: 1.25rem;
  line-height: 2.2;
  color: var(--text-sub, #2a2a2a);
  padding: 4rem;
  background-color: var(--bg-shell, #efe3cf);
  background-image: 
    url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100' viewBox='0 0 100 100'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.6' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100' height='100' filter='url(%23noise)' opacity='0.08'/%3E%3C/svg%3E"),
    linear-gradient(to right, rgba(0,0,0,0.03) 1px, transparent 1px);
  background-size: 100% 100%, 2.5em 100%;
  border-radius: 4px;
  position: relative;
  box-shadow: 
    0 20px 50px rgba(0,0,0,0.1),
    0 2px 4px rgba(0,0,0,0.05);
  border: 1px solid #d4c4a8;
  font-family: 'Noto Serif SC', serif;
  white-space: pre-wrap;
  overflow: hidden;
}

.drop-cap {
  float: left;
  font-size: 4.5rem;
  line-height: 1;
  padding-top: 0.1rem;
  padding-right: 0.6rem;
  padding-left: 0.2rem;
  font-weight: 900;
  color: #b22222; /* Madder Red */
  font-family: 'Noto Serif SC', serif;
  text-shadow: 2px 2px 0px rgba(0,0,0,0.05);
}

.scroll-ornament {
  position: absolute;
  left: 0;
  right: 0;
  height: 20px;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='40' height='20' viewBox='0 0 40 20'%3E%3Cpath d='M0 10 Q10 0 20 10 T40 10' fill='none' stroke='%23a96e35' stroke-width='1' opacity='0.3'/%3E%3C/svg%3E");
  background-repeat: repeat-x;
}

.scroll-ornament--top {
  top: 10px;
}

.scroll-ornament--bottom {
  bottom: 10px;
  transform: rotate(180deg);
}

/* ── Relationships ── */
.rel-card-group {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.rel-group-title {
  font-size: 0.85rem;
  font-weight: 800;
  color: var(--text-soft, #888);
  text-transform: uppercase;
  letter-spacing: 0.1em;
  margin-bottom: 0.75rem;
  padding-bottom: 0.5rem;
  border-bottom: 1px solid var(--line-soft);
}

.rel-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.rel-card {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 0.85rem 1rem;
  border-radius: 16px;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
  border: 1px solid transparent;
  background: var(--bg-panel, rgba(0,0,0,0.02));
}

.rel-card:hover {
  background: var(--bg-paper, #fff);
  border-color: var(--accent-amber, #a96e35);
  transform: translateX(8px) scale(1.02);
  box-shadow: 0 10px 25px rgba(0,0,0,0.04);
}

.rel-card__avatar {
  width: 46px;
  height: 46px;
  border-radius: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.1rem;
  font-weight: 700;
  color: #fff;
  flex-shrink: 0;
  box-shadow: 0 4px 12px rgba(0,0,0,0.1);
}

.gender-male .rel-card__avatar, .rel-card__avatar.gender-male { background: linear-gradient(135deg, #3b82f6, #1d4ed8); }
.gender-female .rel-card__avatar, .rel-card__avatar.gender-female { background: linear-gradient(135deg, #ec4899, #be185d); }
.gender-unknown .rel-card__avatar, .rel-card__avatar.gender-unknown { background: linear-gradient(135deg, #9ca3af, #4b5563); }

.rel-card__info {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
}

.rel-card__name {
  font-size: 1rem;
  font-weight: 700;
  color: var(--text-main, #1a1a1a);
  display: flex;
  align-items: center;
  gap: 0.4rem;
}

.gender-mini-icon {
  font-size: 0.75rem;
  opacity: 0.6;
}

.rel-card__meta {
  font-size: 0.75rem;
  color: var(--text-soft, #888);
  font-weight: 600;
}

.rel-empty {
  font-size: 0.8rem;
  color: var(--text-soft, #bbb);
  padding: 1rem;
  text-align: center;
  border: 1px dashed var(--line-soft);
  border-radius: 12px;
}

/* ── Floating Actions ── */
.floating-actions {
  position: fixed;
  bottom: 2rem;
  left: 50%;
  transform: translateX(-50%);
  z-index: 1000;
  width: auto;
  min-width: 400px;
}

.floating-actions__content {
  background: rgba(255, 255, 255, 0.7);
  backdrop-filter: blur(20px) saturate(180%);
  border: 1px solid rgba(169, 110, 53, 0.2);
  padding: 0.75rem 1.5rem;
  border-radius: 24px;
  box-shadow: 0 15px 40px rgba(106, 75, 47, 0.15);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 2rem;
}

.editing-label {
  font-size: 0.85rem;
  font-weight: 700;
  color: var(--accent-ink);
  font-family: 'Noto Serif SC', serif;
}

.floating-actions__btns {
  display: flex;
  gap: 0.75rem;
}

/* Transitions */
.slide-up-enter-active,
.slide-up-leave-active {
  transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
}

.slide-up-enter-from,
.slide-up-leave-to {
  transform: translate(-50%, 100%);
  opacity: 0;
}

@media (max-width: 768px) {
  .detail-content { padding: 2rem 1rem; }
  .hero-name { font-size: 2.5rem; }
  .person-avatar { width: 120px; height: 120px; font-size: 2.5rem; }
  .form-row { flex-direction: column; gap: 1rem; }
  .floating-actions { width: 90%; min-width: 0; }
  .floating-actions__content { flex-direction: column; gap: 1rem; padding: 1.25rem; }
}
</style>
