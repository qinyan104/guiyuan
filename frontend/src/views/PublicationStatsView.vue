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
  }
  return map[action] || action
}

function historyActionClass(action: string): string {
  if (action.includes('DELETE')) return 'history-tag history-tag--danger'
  if (action.includes('CREATE')) return 'history-tag history-tag--success'
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
      <!-- Overview Cards -->
      <div class="overview-grid">
        <div class="ov-card">
          <span class="ov-card__number">{{ totalCount }}</span>
          <span class="ov-card__label">总人数</span>
        </div>
        <div class="ov-card ov-card--male">
          <span class="ov-card__number">{{ maleCount }}</span>
          <span class="ov-card__label">男性</span>
        </div>
        <div class="ov-card ov-card--female">
          <span class="ov-card__number">{{ femaleCount }}</span>
          <span class="ov-card__label">女性</span>
        </div>
        <div class="ov-card">
          <span class="ov-card__number">{{ generationCount || '-' }}</span>
          <span class="ov-card__label">世代</span>
        </div>
        <div class="ov-card">
          <span class="ov-card__number">{{ aliveCount }}</span>
          <span class="ov-card__label">在世</span>
        </div>
        <div class="ov-card">
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
  padding: 1.5rem 2rem 3rem;
}

/* ── Overview Cards ── */
.overview-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(130px, 1fr));
  gap: 0.75rem;
  margin-bottom: 1.5rem;
}

.ov-card {
  background: var(--bg-panel, #fff);
  border: 1px solid var(--border-color, rgba(0,0,0,0.06));
  border-radius: 12px;
  padding: 1rem;
  text-align: center;
}

.ov-card__number {
  display: block;
  font-size: 1.5rem;
  font-weight: 800;
  color: var(--text-main, #1a1a1a);
  line-height: 1.2;
}

.ov-card__label {
  font-size: 0.72rem;
  color: var(--text-soft, #888);
  font-weight: 600;
}

.ov-card--male .ov-card__number { color: #3b82f6; }
.ov-card--female .ov-card__number { color: #ec4899; }

/* ── Charts Grid ── */
.charts-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
}

.chart-card {
  background: var(--bg-panel, #fff);
  border: 1px solid var(--border-color, rgba(0,0,0,0.06));
  border-radius: 14px;
  padding: 1.25rem;
}

.chart-card--wide {
  grid-column: 1 / -1;
}

.chart-title {
  font-size: 0.88rem;
  font-weight: 700;
  color: var(--text-main, #1a1a1a);
  margin: 0 0 1rem;
  font-family: 'Noto Serif SC', serif;
}

.chart-empty {
  font-size: 0.8rem;
  color: var(--text-soft, #aaa);
  text-align: center;
  padding: 1.5rem 0;
}

/* ── Gender Bar ── */
.gender-bar {
  display: flex;
  height: 32px;
  border-radius: 8px;
  overflow: hidden;
  margin-bottom: 0.75rem;
}

.gender-bar__male {
  background: linear-gradient(90deg, #3b82f6, #60a5fa);
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-size: 0.75rem;
  font-weight: 700;
  transition: width 0.5s ease;
}

.gender-bar__female {
  background: linear-gradient(90deg, #ec4899, #f472b6);
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-size: 0.75rem;
  font-weight: 700;
  transition: width 0.5s ease;
}

.gender-legend,
.timeline-legend {
  display: flex;
  gap: 1.25rem;
  font-size: 0.75rem;
  color: var(--text-soft, #888);
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  font-weight: 600;
}

.legend-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
}

.legend-dot--male { background: #3b82f6; }
.legend-dot--female { background: #ec4899; }
.legend-dot--birth { background: #16a34a; }
.legend-dot--death { background: #888; }

/* ── Bar Chart ── */
.bar-chart {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.bar-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.bar-label {
  width: 56px;
  font-size: 0.72rem;
  font-weight: 600;
  color: var(--text-soft, #888);
  text-align: right;
  flex-shrink: 0;
}

.bar-label--surname {
  width: 24px;
  font-size: 0.85rem;
  color: var(--text-main, #1a1a1a);
  text-align: center;
}

.bar-track {
  flex: 1;
  height: 18px;
  background: var(--bg-shell, #f0ebe3);
  border-radius: 4px;
  overflow: hidden;
}

.bar-fill {
  height: 100%;
  background: linear-gradient(90deg, var(--accent-ink, #6a4b2f), var(--accent-amber, #a96e35));
  border-radius: 4px;
  transition: width 0.5s ease;
  min-width: 2px;
}

.bar-fill--lifespan {
  background: linear-gradient(90deg, #16a34a, #4ade80);
}

.bar-fill--surname {
  background: linear-gradient(90deg, #8b5cf6, #a78bfa);
}

.bar-value {
  width: 28px;
  font-size: 0.72rem;
  font-weight: 700;
  color: var(--text-main, #1a1a1a);
  text-align: left;
  flex-shrink: 0;
}

/* ── Lifespan Summary ── */
.lifespan-summary {
  display: flex;
  gap: 1.25rem;
  margin-bottom: 0.5rem;
}

.ls-item {
  display: flex;
  flex-direction: column;
}

.ls-value {
  font-size: 1.25rem;
  font-weight: 800;
  color: var(--text-main, #1a1a1a);
}

.ls-label {
  font-size: 0.68rem;
  color: var(--text-soft, #888);
  font-weight: 600;
}

/* ── Timeline Chart ── */
.timeline-chart {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.timeline-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.timeline-label {
  width: 50px;
  font-size: 0.72rem;
  font-weight: 600;
  color: var(--text-soft, #888);
  text-align: right;
  flex-shrink: 0;
}

.timeline-bars {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.timeline-bar {
  height: 12px;
  border-radius: 3px;
  transition: width 0.5s ease;
  min-width: 2px;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  padding-right: 4px;
}

.timeline-bar--birth {
  background: linear-gradient(90deg, #16a34a, #4ade80);
}

.timeline-bar--death {
  background: linear-gradient(90deg, #6b7280, #9ca3af);
}

.timeline-bar__val {
  font-size: 0.6rem;
  font-weight: 700;
  color: #fff;
}

.timeline-legend {
  margin-top: 0.5rem;
}

/* ── History List ── */
.history-list {
  display: flex;
  flex-direction: column;
  gap: 0;
}

.history-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.55rem 0;
  border-bottom: 1px solid var(--border-color, rgba(0,0,0,0.04));
  font-size: 0.82rem;
}

.history-item:last-child {
  border-bottom: none;
}

.history-time {
  width: 70px;
  font-size: 0.72rem;
  color: var(--text-soft, #888);
  flex-shrink: 0;
}

.history-tag {
  display: inline-block;
  padding: 0.1rem 0.5rem;
  border-radius: 999px;
  font-size: 0.68rem;
  font-weight: 700;
  background: rgba(100,100,100,0.1);
  color: var(--text-sub, #555);
  flex-shrink: 0;
}

.history-tag--danger {
  background: rgba(239, 68, 68, 0.1);
  color: #ef4444;
}

.history-tag--success {
  background: rgba(22, 163, 74, 0.1);
  color: #16a34a;
}

.history-tag--info {
  background: rgba(59, 130, 246, 0.1);
  color: #3b82f6;
}

.history-user {
  font-weight: 600;
  color: var(--text-main, #1a1a1a);
  flex-shrink: 0;
}

.history-detail {
  color: var(--text-soft, #888);
  font-size: 0.78rem;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

@media (max-width: 700px) {
  .stats-content { padding: 1rem; }
  .overview-grid { grid-template-columns: repeat(3, 1fr); }
  .charts-grid { grid-template-columns: 1fr; }
  .lifespan-summary { flex-wrap: wrap; }
  .history-item { flex-wrap: wrap; }
  .history-detail { width: 100%; }
}
</style>
