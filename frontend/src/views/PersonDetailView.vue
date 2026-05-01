<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { getPublication, type PublicationLoadResult } from '../api/publication'
import type { Person, PublicationData, FamilyUnit, Gender } from '../types/family'

const props = defineProps<{
  publicationId: number
  personId: string
}>()

const router = useRouter()

const loading = ref(true)
const errorMsg = ref('')
const pubData = ref<PublicationData | null>(null)

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
</script>

<template>
  <div class="detail-page">
    <!-- Top Navigation -->
    <header class="detail-nav">
      <button class="nav-back" @click="goBack">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polyline points="15 18 9 12 15 6"/></svg>
        返回工作台
      </button>
      <div class="nav-breadcrumb">
        <span class="nav-link" @click="goToPublications">族谱管理</span>
        <span class="nav-sep">/</span>
        <span class="nav-current">{{ person?.name || '人物详情' }}</span>
      </div>
    </header>

    <div v-if="loading" class="loading-state">加载中...</div>
    <div v-else-if="errorMsg" class="error-state">{{ errorMsg }}</div>
    <div v-else-if="!person" class="error-state">未找到该人物</div>

    <main v-else class="detail-content">
      <!-- Person Hero -->
      <section class="person-hero">
        <div class="person-avatar" :class="genderClass(person.gender)">
          <img v-if="person.avatarUrl" :src="photoUrl(person.avatarUrl)" :alt="person.name" />
          <span v-else class="avatar-text">{{ person.name.slice(-1) }}</span>
        </div>
        <div class="person-info">
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
      </section>

      <!-- Note -->
      <section v-if="person.note" class="detail-section">
        <h2 class="section-title">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
          备注
        </h2>
        <div class="note-content">{{ person.note }}</div>
      </section>

      <!-- Relationships -->
      <div class="rel-grid">
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
  gap: 1rem;
  padding: 0 2rem;
  height: 52px;
  background: var(--bg-panel, rgba(255,255,255,0.85));
  border-bottom: 1px solid var(--border-color, rgba(0,0,0,0.06));
  backdrop-filter: blur(12px);
  position: sticky;
  top: 0;
  z-index: 50;
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
  padding: 0.3rem 0.5rem;
  border-radius: 6px;
  transition: color 0.15s, background 0.15s;
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
  color: var(--accent-amber, #a96e35);
  cursor: pointer;
  font-weight: 600;
}

.nav-link:hover {
  text-decoration: underline;
}

.nav-sep {
  color: var(--text-soft, #aaa);
}

.nav-current {
  color: var(--text-main, #1a1a1a);
  font-weight: 600;
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
  max-width: 800px;
  margin: 0 auto;
  padding: 2rem;
}

/* ── Hero ── */
.person-hero {
  display: flex;
  gap: 1.5rem;
  align-items: flex-start;
  margin-bottom: 2rem;
}

.person-avatar {
  width: 96px;
  height: 96px;
  border-radius: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  overflow: hidden;
  font-size: 2rem;
  font-weight: 700;
  color: #fff;
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
  background: linear-gradient(135deg, #8b8b8b, #555);
}

.person-info {
  flex: 1;
}

.person-name-row {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  flex-wrap: wrap;
  margin-bottom: 0.5rem;
}

.person-name {
  font-size: 1.75rem;
  font-family: 'Noto Serif SC', serif;
  font-weight: 700;
  color: var(--text-main, #1a1a1a);
  margin: 0;
}

.gender-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.2rem;
  padding: 0.2rem 0.6rem;
  border-radius: 999px;
  font-size: 0.72rem;
  font-weight: 700;
}

.gender-badge.gender-male {
  background: rgba(59, 130, 246, 0.1);
  color: #3b82f6;
}

.gender-badge.gender-female {
  background: rgba(236, 72, 153, 0.1);
  color: #ec4899;
}

.gender-badge.gender-unknown {
  background: rgba(100, 100, 100, 0.1);
  color: #888;
}

.status-badge {
  padding: 0.2rem 0.6rem;
  border-radius: 999px;
  font-size: 0.7rem;
  font-weight: 700;
}

.status-badge--deceased {
  background: rgba(100, 100, 100, 0.1);
  color: #888;
}

.status-badge--alive {
  background: rgba(22, 163, 74, 0.1);
  color: #16a34a;
}

.person-sub {
  display: flex;
  gap: 1rem;
  margin-bottom: 0.5rem;
}

.sub-item {
  font-size: 0.82rem;
  color: var(--text-soft, #888);
}

.person-dates {
  display: flex;
  gap: 1.25rem;
  flex-wrap: wrap;
}

.date-item {
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
}

.date-label {
  font-size: 0.68rem;
  color: var(--text-soft, #888);
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.date-value {
  font-size: 0.9rem;
  font-weight: 600;
  color: var(--text-main, #1a1a1a);
}

/* ── Sections ── */
.detail-section {
  margin-bottom: 1.75rem;
}

.section-title {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  font-size: 0.9rem;
  font-weight: 700;
  color: var(--text-main, #1a1a1a);
  margin: 0 0 0.75rem;
  font-family: 'Noto Serif SC', serif;
}

.section-count {
  display: inline-block;
  padding: 0.1rem 0.4rem;
  background: var(--bg-shell, #f0ebe3);
  border-radius: 999px;
  font-size: 0.68rem;
  font-weight: 700;
  color: var(--text-soft, #888);
}

.note-content {
  background: var(--bg-panel, #fff);
  border: 1px solid var(--border-color, rgba(0,0,0,0.06));
  border-radius: 12px;
  padding: 1rem;
  font-size: 0.88rem;
  line-height: 1.8;
  color: var(--text-sub, #555);
  white-space: pre-wrap;
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
  border-radius: 14px;
  padding: 1.25rem;
}

.rel-empty {
  font-size: 0.82rem;
  color: var(--text-soft, #aaa);
  padding: 0.5rem 0;
}

.rel-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.rel-card {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.5rem 0.65rem;
  border-radius: 10px;
  cursor: pointer;
  transition: background 0.15s;
}

.rel-card:hover {
  background: var(--bg-hover, rgba(0,0,0,0.03));
}

.rel-card__avatar {
  width: 36px;
  height: 36px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.9rem;
  font-weight: 700;
  color: #fff;
  flex-shrink: 0;
}

.rel-card__avatar.gender-male {
  background: linear-gradient(135deg, #3b82f6, #1d4ed8);
}

.rel-card__avatar.gender-female {
  background: linear-gradient(135deg, #ec4899, #be185d);
}

.rel-card__avatar.gender-unknown {
  background: linear-gradient(135deg, #8b8b8b, #555);
}

.rel-card__info {
  display: flex;
  flex-direction: column;
}

.rel-card__name {
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--text-main, #1a1a1a);
}

.rel-card__meta {
  font-size: 0.72rem;
  color: var(--text-soft, #888);
}

@media (max-width: 640px) {
  .detail-content {
    padding: 1rem;
  }

  .person-hero {
    flex-direction: column;
    align-items: center;
    text-align: center;
  }

  .person-name-row {
    justify-content: center;
  }

  .person-sub {
    justify-content: center;
  }

  .person-dates {
    justify-content: center;
  }

  .rel-grid {
    grid-template-columns: 1fr;
  }
}
</style>
