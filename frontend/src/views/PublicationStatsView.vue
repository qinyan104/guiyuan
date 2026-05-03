<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { getPublication, getPublicationHistory, type PublicationLoadResult, type PublicationHistoryEntry } from '../api/publication'
import type { Person, PublicationData, Gender } from '../types/family'

const props = defineProps<{ publicationId: number }>()
const router = useRouter()

const loading = ref(true)
const pubData = ref<PublicationData | null>(null)
const history = ref<PublicationHistoryEntry[]>([])

async function load() {
  loading.value = true
  try {
    const result: PublicationLoadResult = await getPublication(props.publicationId)
    pubData.value = result.publication
  } catch { /* ignore */ }
  finally { loading.value = false }

  try {
    history.value = await getPublicationHistory(props.publicationId)
  } catch { history.value = [] }
}

onMounted(load)

const people = computed<Person[]>(() => pubData.value ? Object.values(pubData.value.people) : [])
const families = computed(() => pubData.value ? Object.values(pubData.value.families) : [])

// ── Overview ──
const totalCount = computed(() => people.value.length)
const maleCount = computed(() => people.value.filter(p => p.gender === 'male').length)
const femaleCount = computed(() => people.value.filter(p => p.gender === 'female').length)
const deceasedCount = computed(() => people.value.filter(p => p.deceased).length)
const aliveCount = computed(() => totalCount.value - deceasedCount.value)

// ── Generation count ──
const generationCount = computed(() => {
  if (!pubData.value || families.value.length === 0) return 0
  const f = pubData.value.families
  const rootId = pubData.value.focusFamilyId
  if (!rootId || !f[rootId]) return 0
  let count = 0
  let currentId: string | undefined = rootId
  const visited = new Set<string>()
  while (currentId && !visited.has(currentId)) {
    visited.add(currentId)
    count++
    const family = f[currentId]
    if (!family) break
    // Find child family
    let nextId: string | undefined
    for (const childId of family.children) {
      const childFamily = Object.values(f).find(fa => fa.adults.includes(childId))
      if (childFamily && !visited.has(childFamily.id)) {
        nextId = childFamily.id
        break
      }
    }
    currentId = nextId
  }
  return count
})

// ── Gender ratio bar ──
const malePercent = computed(() => totalCount.value ? Math.round(maleCount.value / totalCount.value * 100) : 0)
const femalePercent = computed(() => totalCount.value ? 100 - malePercent.value : 0)

// ── Generation distribution ──
function assignGenerations(): Map<string, number> {
  const genMap = new Map<string, number>()
  if (!pubData.value) return genMap
  const f = pubData.value.families
  const rootId = pubData.value.focusFamilyId
  if (!rootId || !f[rootId]) return genMap

  function walk(familyId: string, gen: number) {
    const family = f[familyId]
    if (!family) return
    for (const adultId of family.adults) {
      if (adultId && !genMap.has(adultId)) genMap.set(adultId, gen)
    }
    for (const childId of family.children) {
      if (!genMap.has(childId)) genMap.set(childId, gen + 1)
      const childFamily = Object.values(f).find(fa => fa.adults.includes(childId))
      if (childFamily) walk(childFamily.id, gen + 1)
    }
  }
  walk(rootId, 1)
  // Assign uncategorized
  for (const p of people.value) {
    if (!genMap.has(p.id)) genMap.set(p.id, 0)
  }
  return genMap
}

const generationDist = computed(() => {
  const genMap = assignGenerations()
  const dist = new Map<number, number>()
  genMap.forEach((gen) => {
    dist.set(gen, (dist.get(gen) || 0) + 1)
  })
  return Array.from(dist.entries()).sort((a, b) => a[0] - b[0])
})

const maxGenCount = computed(() => Math.max(1, ...generationDist.value.map(d => d[1])))

// ── Lifespan stats ──
function parseYear(s?: string): number | null {
  if (!s) return null
  const m = s.match(/\d{3,4}/)
  return m ? parseInt(m[0]) : null
}

const lifespans = computed(() => {
  return people.value
    .filter(p => p.birth && p.death)
    .map(p => ({ name: p.name, years: parseYear(p.death)! - parseYear(p.birth)! }))
    .filter(l => l.years > 0 && l.years < 150)
})

const avgLifespan = computed(() => {
  if (lifespans.value.length === 0) return null
  const sum = lifespans.value.reduce((a, b) => a + b.years, 0)
  return Math.round(sum / lifespans.value.length * 10) / 10
})

const maxLifespan = computed(() => {
  if (lifespans.value.length === 0) return null
  return lifespans.value.reduce((a, b) => a.years > b.years ? a : b)
})

const minLifespan = computed(() => {
  if (lifespans.value.length === 0) return null
  return lifespans.value.reduce((a, b) => a.years < b.years ? a : b)
})

// ── Lifespan distribution (decades) ──
const lifespanBuckets = computed(() => {
  const buckets = new Map<string, number>()
  for (const l of lifespans.value) {
    const label = `${Math.floor(l.years / 10) * 10}~${Math.floor(l.years / 10) * 10 + 9}`
    buckets.set(label, (buckets.get(label) || 0) + 1)
  }
  return Array.from(buckets.entries()).sort((a, b) => a[0].localeCompare(b[0]))
})

const maxBucketCount = computed(() => Math.max(1, ...lifespanBuckets.value.map(d => d[1])))

// ── Century timeline ──
const centuryData = computed(() => {
  const births = new Map<number, number>()
  const deaths = new Map<number, number>()
  for (const p of people.value) {
    const by = parseYear(p.birth)
    const dy = parseYear(p.death)
    if (by) {
      const century = Math.floor(by / 100) * 100
      births.set(century, (births.get(century) || 0) + 1)
    }
    if (dy) {
      const century = Math.floor(dy / 100) * 100
      deaths.set(century, (deaths.get(century) || 0) + 1)
    }
  }
  const allCenturies = new Set([...births.keys(), ...deaths.keys()])
  return Array.from(allCenturies)
    .sort((a, b) => a - b)
    .map(c => ({
      century: c,
      label: `${c}s`,
      births: births.get(c) || 0,
      deaths: deaths.get(c) || 0,
    }))
})

const maxCenturyCount = computed(() => Math.max(1, ...centuryData.value.map(d => Math.max(d.births, d.deaths))))

// ── Surname distribution ──
const surnameDist = computed(() => {
  const map = new Map<string, number>()
  for (const p of people.value) {
    if (p.name.length >= 1) {
      const surname = p.name.charAt(0)
      map.set(surname, (map.get(surname) || 0) + 1)
    }
  }
  return Array.from(map.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
})

const maxSurnameCount = computed(() => Math.max(1, ...surnameDist.value.map(d => d[1])))

function goBack() {
  router.push({ name: 'workbench', params: { id: props.publicationId } })
}

function historyActionLabel(action: string): string {
  const map: Record<string, string> = {
    CREATE_PUB: '创建族谱',
    UPDATE_PUB: '保存修改',
    DELETE_PUB: '删除族谱',
    BACKUP: '数据库备份',
    UPDATE_PUB_META: '修改信息',
    UPDATE_PERSON: '编辑人物',
  }
  return map[action] || action
}

function historyActionClass(action: string): string {
  if (action.includes('DELETE')) return 'history-tag history-tag--danger'
  if (action.includes('CREATE')) return 'history-tag history-tag--success'
  if (action === 'UPDATE_PUB_META') return 'history-tag history-tag--purple'
  if (action === 'UPDATE_PERSON') return 'history-tag history-tag--indigo'
  if (action.includes('UPDATE')) return 'history-tag history-tag--info'
  return 'history-tag'
}

function formatHistoryDate(dateStr: string) {
  const d = new Date(dateStr)
  return d.toLocaleDateString('zh-CN', {
    month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit',
  })
}
</script>

<template>
  <div class="stats-page">
    <header class="stats-nav">
      <button class="nav-back" @click="goBack">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polyline points="15 18 9 12 15 6"/></svg>
        返回工作台
      </button>
      <h1 class="stats-nav__title">统计分析</h1>
      <div></div>
    </header>

    <div v-if="loading" class="loading-state">加载中...</div>

    <main v-else class="stats-content">
      <!-- Family Profile Hero -->
      <section v-if="pubData" class="family-hero">
        <div class="family-hero__header">
          <h2 class="family-hero__title">{{ pubData.title }}</h2>
          <p v-if="pubData.subtitle" class="family-hero__subtitle">{{ pubData.subtitle }}</p>
        </div>
        <div class="family-hero__meta" v-if="pubData.info?.ancestralOrigin || pubData.info?.hallName || pubData.info?.familyMotto">
          <div class="meta-item" v-if="pubData.info.ancestralOrigin">
            <span class="meta-label">起源地</span>
            <span class="meta-value">{{ pubData.info.ancestralOrigin }}</span>
          </div>
          <div class="meta-item" v-if="pubData.info.hallName">
            <span class="meta-label">堂号</span>
            <span class="meta-value">{{ pubData.info.hallName }}</span>
          </div>
          <div class="meta-item meta-item--motto" v-if="pubData.info.familyMotto">
            <span class="meta-label">家训</span>
            <span class="meta-value">{{ pubData.info.familyMotto }}</span>
          </div>
        </div>
      </section>

      <!-- Overview Cards -->
      <div class="overview-grid">
        <div class="ov-card">
          <div class="ov-card__bg">族</div>
          <span class="ov-card__number">{{ totalCount }}</span>
          <span class="ov-card__label">总人数</span>
        </div>
        <div class="ov-card ov-card--male">
          <div class="ov-card__bg">♂</div>
          <span class="ov-card__number">{{ maleCount }}</span>
          <span class="ov-card__label">男性</span>
        </div>
        <div class="ov-card ov-card--female">
          <div class="ov-card__bg">♀</div>
          <span class="ov-card__number">{{ femaleCount }}</span>
          <span class="ov-card__label">女性</span>
        </div>
        <div class="ov-card ov-card--gen">
          <div class="ov-card__bg">世代</div>
          <span class="ov-card__number">{{ generationCount || '-' }}</span>
          <span class="ov-card__label">世代数</span>
        </div>
        <div class="ov-card ov-card--alive">
          <div class="ov-card__bg">👥</div>
          <span class="ov-card__number">{{ aliveCount }}</span>
          <span class="ov-card__label">在世</span>
        </div>
        <div class="ov-card ov-card--deceased">
          <div class="ov-card__bg">✝</div>
          <span class="ov-card__number">{{ deceasedCount }}</span>
          <span class="ov-card__label">已故</span>
        </div>
      </div>

      <!-- Charts Grid -->
      <div class="charts-grid">
        <!-- Gender Ratio -->
        <section class="chart-card">
          <h2 class="chart-title">性别比例</h2>
          <div class="gender-bar">
            <div class="gender-bar__male" :style="{ width: malePercent + '%' }">
              <span v-if="malePercent > 15">♂ {{ malePercent }}%</span>
            </div>
            <div class="gender-bar__female" :style="{ width: femalePercent + '%' }">
              <span v-if="femalePercent > 15">♀ {{ femalePercent }}%</span>
            </div>
          </div>
          <div class="gender-legend">
            <span class="legend-item"><span class="legend-dot legend-dot--male"></span>男性 {{ maleCount }}</span>
            <span class="legend-item"><span class="legend-dot legend-dot--female"></span>女性 {{ femaleCount }}</span>
          </div>
        </section>

        <!-- Generation Distribution -->
        <section class="chart-card">
          <h2 class="chart-title">世代分布</h2>
          <div v-if="generationDist.length === 0" class="chart-empty">暂无数据</div>
          <div v-else class="bar-chart">
            <div v-for="[gen, count] in generationDist" :key="gen" class="bar-row">
              <span class="bar-label">第{{ gen }}代</span>
              <div class="bar-track">
                <div class="bar-fill" :style="{ width: (count / maxGenCount * 100) + '%' }"></div>
              </div>
              <span class="bar-value">{{ count }}</span>
            </div>
          </div>
        </section>

        <!-- Lifespan Stats -->
        <section class="chart-card">
          <h2 class="chart-title">寿命统计</h2>
          <div v-if="lifespans.length === 0" class="chart-empty">需要生卒年数据才能计算</div>
          <template v-else>
            <div class="lifespan-summary">
              <div class="ls-item">
                <span class="ls-value">{{ avgLifespan }}</span>
                <span class="ls-label">平均寿命</span>
              </div>
              <div class="ls-item" v-if="maxLifespan">
                <span class="ls-value">{{ maxLifespan.years }}</span>
                <span class="ls-label">最高寿 · {{ maxLifespan.name }}</span>
              </div>
              <div class="ls-item" v-if="minLifespan">
                <span class="ls-value">{{ minLifespan.years }}</span>
                <span class="ls-label">最低寿 · {{ minLifespan.name }}</span>
              </div>
            </div>
            <div class="bar-chart" style="margin-top: 1rem;">
              <div v-for="[label, count] in lifespanBuckets" :key="label" class="bar-row">
                <span class="bar-label">{{ label }}岁</span>
                <div class="bar-track">
                  <div class="bar-fill bar-fill--lifespan" :style="{ width: (count / maxBucketCount * 100) + '%' }"></div>
                </div>
                <span class="bar-value">{{ count }}</span>
              </div>
            </div>
          </template>
        </section>

        <!-- Century Timeline -->
        <section class="chart-card">
          <h2 class="chart-title">世纪分布（出生 / 去世）</h2>
          <div v-if="centuryData.length === 0" class="chart-empty">暂无数据</div>
          <div v-else class="timeline-chart">
            <div v-for="c in centuryData" :key="c.century" class="timeline-row">
              <span class="timeline-label">{{ c.label }}</span>
              <div class="timeline-bars">
                <div class="timeline-bar timeline-bar--birth" :style="{ width: (c.births / maxCenturyCount * 100) + '%' }">
                  <span v-if="c.births > 0" class="timeline-bar__val">{{ c.births }}</span>
                </div>
                <div class="timeline-bar timeline-bar--death" :style="{ width: (c.deaths / maxCenturyCount * 100) + '%' }">
                  <span v-if="c.deaths > 0" class="timeline-bar__val">{{ c.deaths }}</span>
                </div>
              </div>
            </div>
            <div class="timeline-legend">
              <span class="legend-item"><span class="legend-dot legend-dot--birth"></span>出生</span>
              <span class="legend-item"><span class="legend-dot legend-dot--death"></span>去世</span>
            </div>
          </div>
        </section>

        <!-- Surname Distribution -->
        <section class="chart-card chart-card--wide">
          <h2 class="chart-title">姓氏分布（前10）</h2>
          <div v-if="surnameDist.length === 0" class="chart-empty">暂无数据</div>
          <div v-else class="bar-chart bar-chart--horizontal">
            <div v-for="[surname, count] in surnameDist" :key="surname" class="bar-row">
              <span class="bar-label bar-label--surname">{{ surname }}</span>
              <div class="bar-track">
                <div class="bar-fill bar-fill--surname" :style="{ width: (count / maxSurnameCount * 100) + '%' }"></div>
              </div>
              <span class="bar-value">{{ count }}</span>
            </div>
          </div>
        </section>

        <!-- Modification History -->
        <section class="chart-card chart-card--wide">
          <h2 class="chart-title">修改历史</h2>
          <div v-if="history.length === 0" class="chart-empty">暂无修改记录</div>
          <div v-else class="history-list">
            <div v-for="entry in history" :key="entry.id" class="history-item">
              <span class="history-time">{{ formatHistoryDate(entry.createdAt) }}</span>
              <span :class="historyActionClass(entry.action)">{{ historyActionLabel(entry.action) }}</span>
              <span class="history-user">{{ entry.username }}</span>
              <span class="history-detail">{{ entry.detail || '-' }}</span>
            </div>
          </div>
        </section>
      </div>
    </main>
  </div>
</template>

<style scoped>
.stats-page {
  min-height: 100vh;
  background: var(--bg-shell, #f5f0e8);
}

.stats-nav {
  display: flex;
  align-items: center;
  justify-content: space-between;
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

.stats-nav__title {
  font-size: 1rem;
  font-weight: 700;
  color: var(--text-main, #1a1a1a);
  margin: 0;
}

.loading-state {
  text-align: center;
  padding: 4rem;
  color: var(--text-soft, #888);
}

.stats-content {
  max-width: 1000px;
  margin: 0 auto;
  padding: 2rem;
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

/* ── Family Hero ── */
.family-hero {
  background: linear-gradient(135deg, var(--bg-panel, #fff) 0%, #fffdfa 100%);
  border: 1px solid var(--border-color, rgba(0,0,0,0.06));
  border-radius: 20px;
  padding: 3rem 2rem;
  text-align: center;
  box-shadow: 0 10px 30px -10px rgba(0,0,0,0.05);
}

.family-hero__title {
  font-size: 2.25rem;
  font-family: 'Noto Serif SC', serif;
  font-weight: 900;
  color: var(--text-main, #1a1a1a);
  margin: 0 0 0.5rem;
  letter-spacing: -0.02em;
}

.family-hero__subtitle {
  font-size: 1.1rem;
  color: var(--text-soft, #888);
  margin: 0 0 2rem;
  font-weight: 500;
}

.family-hero__meta {
  display: flex;
  justify-content: center;
  gap: 3rem;
  flex-wrap: wrap;
  padding-top: 2rem;
  border-top: 1px dashed var(--border-color, rgba(0,0,0,0.1));
}

.meta-item {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  position: relative;
  padding: 0 1rem;
}

.meta-item::after {
  content: "";
  position: absolute;
  right: -1.5rem;
  top: 20%;
  height: 60%;
  width: 1px;
  background: var(--border-color, rgba(0,0,0,0.06));
}

.meta-item:last-child::after { display: none; }

.meta-label {
  font-size: 0.7rem;
  color: var(--text-soft, #999);
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.15em;
}

.meta-value {
  font-size: 1.1rem;
  font-weight: 700;
  color: var(--accent-ink, #6a4b2f);
  font-family: 'Noto Serif SC', serif;
}

.meta-item--motto .meta-value {
  font-style: italic;
  color: var(--accent-amber, #a96e35);
}

/* ── Overview Cards ── */
.overview-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  gap: 1rem;
}

.ov-card {
  background: var(--bg-panel, #fff);
  border: 1px solid var(--border-color, rgba(0,0,0,0.06));
  border-radius: 16px;
  padding: 1.5rem 1.25rem;
  text-align: left;
  position: relative;
  overflow: hidden;
  transition: transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.2s ease;
  cursor: default;
}

.ov-card:hover {
  transform: translateY(-4px) scale(1.02);
  box-shadow: 0 12px 20px -10px rgba(0,0,0,0.08);
}

.ov-card__bg {
  position: absolute;
  right: -10px;
  bottom: -15px;
  font-size: 5rem;
  font-weight: 900;
  opacity: 0.04;
  user-select: none;
  pointer-events: none;
  font-family: 'Noto Serif SC', serif;
}

.ov-card__number {
  display: block;
  font-size: 2rem;
  font-weight: 900;
  color: var(--text-main, #1a1a1a);
  line-height: 1;
  margin-bottom: 0.25rem;
  position: relative;
}

.ov-card__label {
  font-size: 0.8rem;
  color: var(--text-soft, #888);
  font-weight: 600;
  position: relative;
}

.ov-card--male .ov-card__number { color: #3b82f6; }
.ov-card--female .ov-card__number { color: #ec4899; }
.ov-card--gen .ov-card__number { color: var(--accent-amber, #a96e35); }
.ov-card--alive .ov-card__number { color: #10b981; }
.ov-card--deceased .ov-card__number { color: #6b7280; }

/* ── Charts Grid ── */
.charts-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1.5rem;
}

.chart-card {
  background: var(--bg-panel, #fff);
  border: 1px solid var(--border-color, rgba(0,0,0,0.06));
  border-radius: 18px;
  padding: 1.5rem;
  box-shadow: 0 2px 10px rgba(0,0,0,0.02);
}

.chart-card--wide {
  grid-column: 1 / -1;
}

.chart-title {
  font-size: 1rem;
  font-weight: 800;
  color: var(--text-main, #1a1a1a);
  margin: 0 0 1.5rem;
  font-family: 'Noto Serif SC', serif;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.chart-title::before {
  content: "";
  width: 4px;
  height: 1rem;
  background: var(--accent-amber, #a96e35);
  border-radius: 2px;
}

.chart-empty {
  font-size: 0.85rem;
  color: var(--text-soft, #aaa);
  text-align: center;
  padding: 2rem 0;
  border: 1px dashed var(--border-color, rgba(0,0,0,0.1));
  border-radius: 12px;
}

/* ── Gender Bar ── */
.gender-bar {
  display: flex;
  height: 40px;
  border-radius: 20px;
  overflow: hidden;
  margin-bottom: 1rem;
  box-shadow: inset 0 2px 4px rgba(0,0,0,0.05);
}

.gender-bar__male {
  background: linear-gradient(90deg, #3b82f6, #60a5fa);
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-size: 0.85rem;
  font-weight: 800;
  transition: width 0.8s cubic-bezier(0.16, 1, 0.3, 1);
}

.gender-bar__female {
  background: linear-gradient(90deg, #ec4899, #f472b6);
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-size: 0.85rem;
  font-weight: 800;
  transition: width 0.8s cubic-bezier(0.16, 1, 0.3, 1);
}

.gender-legend,
.timeline-legend {
  display: flex;
  gap: 1.5rem;
  font-size: 0.8rem;
  color: var(--text-soft, #888);
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-weight: 600;
}

.legend-dot {
  width: 10px;
  height: 10px;
  border-radius: 3px;
}

.legend-dot--male { background: #3b82f6; }
.legend-dot--female { background: #ec4899; }
.legend-dot--birth { background: #10b981; }
.legend-dot--death { background: #6b7280; }

/* ── Bar Chart ── */
.bar-chart {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.bar-row {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.bar-label {
  width: 60px;
  font-size: 0.75rem;
  font-weight: 700;
  color: var(--text-soft, #888);
  text-align: right;
  flex-shrink: 0;
}

.bar-label--surname {
  width: 32px;
  font-size: 1rem;
  font-weight: 800;
  color: var(--text-main, #1a1a1a);
  text-align: center;
  font-family: 'Noto Serif SC', serif;
}

.bar-track {
  flex: 1;
  height: 12px;
  background: var(--bg-shell, #f0ebe3);
  border-radius: 6px;
  overflow: hidden;
}

.bar-fill {
  height: 100%;
  background: linear-gradient(90deg, var(--accent-ink, #6a4b2f), var(--accent-amber, #a96e35));
  border-radius: 6px;
  transition: width 0.8s cubic-bezier(0.16, 1, 0.3, 1);
  min-width: 4px;
  box-shadow: 0 0 10px rgba(169, 110, 53, 0.2);
}

.bar-fill--lifespan {
  background: linear-gradient(90deg, #10b981, #34d399);
  box-shadow: 0 0 10px rgba(16, 185, 129, 0.2);
}

.bar-fill--surname {
  background: linear-gradient(90deg, #8b5cf6, #a78bfa);
  box-shadow: 0 0 10px rgba(139, 92, 246, 0.2);
}

.bar-value {
  width: 32px;
  font-size: 0.8rem;
  font-weight: 800;
  color: var(--text-main, #1a1a1a);
  text-align: left;
  flex-shrink: 0;
}

/* ── Lifespan Summary ── */
.lifespan-summary {
  display: flex;
  gap: 2rem;
  margin-bottom: 1rem;
  padding: 1rem;
  background: var(--bg-shell, #f9f7f2);
  border-radius: 12px;
}

.ls-item {
  display: flex;
  flex-direction: column;
}

.ls-value {
  font-size: 1.5rem;
  font-weight: 900;
  color: var(--text-main, #1a1a1a);
  line-height: 1.2;
}

.ls-label {
  font-size: 0.75rem;
  color: var(--text-soft, #888);
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

/* ── Timeline Chart ── */
.timeline-chart {
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
}

.timeline-row {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.timeline-label {
  width: 50px;
  font-size: 0.75rem;
  font-weight: 700;
  color: var(--text-soft, #888);
  text-align: right;
  flex-shrink: 0;
}

.timeline-bars {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.timeline-bar {
  height: 10px;
  border-radius: 5px;
  transition: width 0.8s cubic-bezier(0.16, 1, 0.3, 1);
  min-width: 4px;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  padding-right: 6px;
}

.timeline-bar--birth {
  background: linear-gradient(90deg, #10b981, #34d399);
}

.timeline-bar--death {
  background: linear-gradient(90deg, #6b7280, #9ca3af);
}

.timeline-bar__val {
  font-size: 0.65rem;
  font-weight: 800;
  color: #fff;
}

/* ── History List (Timeline) ── */
.history-list {
  display: flex;
  flex-direction: column;
  position: relative;
  padding-left: 1.5rem;
}

.history-list::before {
  content: "";
  position: absolute;
  left: 3px;
  top: 0.5rem;
  bottom: 0.5rem;
  width: 2px;
  background: var(--border-color, rgba(0,0,0,0.06));
}

.history-item {
  display: flex;
  align-items: flex-start;
  gap: 1rem;
  padding: 1rem 0;
  position: relative;
}

.history-item::before {
  content: "";
  position: absolute;
  left: -1.5rem;
  top: 1.4rem;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--bg-panel, #fff);
  border: 2px solid var(--accent-amber, #a96e35);
  transform: translateX(-3px);
  z-index: 1;
}

.history-time {
  width: 100px;
  font-size: 0.75rem;
  color: var(--text-soft, #999);
  font-weight: 600;
  padding-top: 0.25rem;
  flex-shrink: 0;
}

.history-tag {
  display: inline-block;
  padding: 0.2rem 0.75rem;
  border-radius: 6px;
  font-size: 0.7rem;
  font-weight: 800;
  background: rgba(100,100,100,0.06);
  color: var(--text-sub, #666);
  flex-shrink: 0;
  border: 1px solid rgba(0,0,0,0.03);
}

.history-tag--danger {
  background: rgba(239, 68, 68, 0.08);
  color: #ef4444;
  border-color: rgba(239, 68, 68, 0.1);
}

.history-tag--success {
  background: rgba(16, 185, 129, 0.08);
  color: #10b981;
  border-color: rgba(16, 185, 129, 0.1);
}

.history-tag--info {
  background: rgba(59, 130, 246, 0.08);
  color: #3b82f6;
  border-color: rgba(59, 130, 246, 0.1);
}

.history-tag--purple {
  background: rgba(168, 85, 247, 0.08);
  color: #a855f7;
  border-color: rgba(168, 85, 247, 0.1);
}

.history-tag--indigo {
  background: rgba(99, 102, 241, 0.08);
  color: #6366f1;
  border-color: rgba(99, 102, 241, 0.1);
}

.history-user {
  font-weight: 700;
  color: var(--text-main, #1a1a1a);
  flex-shrink: 0;
  font-size: 0.85rem;
  padding-top: 0.15rem;
}

.history-detail {
  color: var(--text-soft, #888);
  font-size: 0.85rem;
  padding-top: 0.15rem;
  flex: 1;
}

@media (max-width: 850px) {
  .charts-grid { grid-template-columns: 1fr; }
  .family-hero__meta { gap: 1.5rem; }
  .meta-item::after { display: none; }
}

@media (max-width: 600px) {
  .stats-content { padding: 1rem; }
  .overview-grid { grid-template-columns: repeat(2, 1fr); }
  .history-item { flex-direction: column; gap: 0.5rem; padding-left: 0.5rem; }
  .history-time { width: auto; }
  .history-item::before { top: 1rem; }
}
</style>

