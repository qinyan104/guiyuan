<script setup lang="ts">
import { computed, onMounted, ref, inject } from 'vue'
import { useRouter } from 'vue-router'
import { getPublicationHistory, type PublicationHistoryEntry } from '../api/publication'
import type { Person, FamilyUnit, PublicationData } from '../types/family'

const props = defineProps<{ publicationId: number }>()
const router = useRouter()

// ─── Shared Context ─────────────────────────────────────────────
const { pub, serverPublicationId } = inject('publication-context') as {
  pub: { publication: PublicationData }
  serverPublicationId: { value: number | null }
}
const pubData = computed<PublicationData>(() => pub.publication)

const loadingHistory = ref(true)
const history = ref<PublicationHistoryEntry[]>([])

async function loadHistory() {
  if (!serverPublicationId.value) {
    loadingHistory.value = false
    return
  }
  loadingHistory.value = true
  try {
    history.value = await getPublicationHistory(serverPublicationId.value)
  } catch { history.value = [] }
  finally { loadingHistory.value = false }
}

onMounted(loadHistory)

const people = computed<Person[]>(() => Object.values(pubData.value.people))
const families = computed<FamilyUnit[]>(() => Object.values(pubData.value.families))

// ── Data Cleaning & Accuracy ──
const totalCount = computed(() => people.value.length)
const maleCount = computed(() => people.value.filter(p => p.gender === 'male').length)
const femaleCount = computed(() => people.value.filter(p => p.gender === 'female').length)
const deceasedCount = computed(() => people.value.filter(p => p.deceased).length)
const aliveCount = computed(() => totalCount.value - deceasedCount.value)

// ── Generation Calculation (BFS Engine) ──
const generationMap = computed(() => {
  const genMap = new Map<string, number>()
  if (!pubData.value) return genMap
  
  const f = pubData.value.families
  const rootId = pubData.value.focusFamilyId
  if (!rootId || !f[rootId]) return genMap

  const queue: { personId: string; gen: number }[] = []
  
  // Initialize with root family adults
  const rootFamily = f[rootId]
  for (const adultId of rootFamily.adults) {
    if (adultId && !genMap.has(adultId)) {
      genMap.set(adultId, 1)
      queue.push({ personId: adultId, gen: 1 })
    }
  }

  // BFS Traversal
  let head = 0
  while (head < queue.length) {
    const { personId, gen } = queue[head++]
    
    // Find all families where this person is an adult
    for (const fam of Object.values(f)) {
      if (fam.adults.includes(personId)) {
        // Add spouses at same generation
        for (const spouseId of fam.adults) {
          if (spouseId && !genMap.has(spouseId)) {
            genMap.set(spouseId, gen)
            queue.push({ personId: spouseId, gen })
          }
        }
        // Add children at gen + 1
        for (const childId of fam.children) {
          if (childId && !genMap.has(childId)) {
            genMap.set(childId, gen + 1)
            queue.push({ personId: childId, gen: gen + 1 })
          }
        }
      }
    }
  }

  // Assign gen 0 to disconnected people
  for (const p of people.value) {
    if (!genMap.has(p.id)) genMap.set(p.id, 0)
  }
  
  return genMap
})

const generationCount = computed(() => {
  const values = Array.from(generationMap.value.values()).filter(v => v > 0)
  return values.length > 0 ? Math.max(...values) : 0
})

const generationDist = computed(() => {
  const dist = new Map<number, number>()
  generationMap.value.forEach((gen) => {
    dist.set(gen, (dist.get(gen) || 0) + 1)
  })
  return Array.from(dist.entries()).sort((a, b) => a[0] - b[0])
})

const maxGenCount = computed(() => Math.max(1, ...generationDist.value.map(d => d[1])))

// ── Gender ratio ──
const malePercent = computed(() => totalCount.value ? Math.round(maleCount.value / totalCount.value * 100) : 0)
const femalePercent = computed(() => totalCount.value ? 100 - malePercent.value : 0)

// ── Surname Statistics (Compound Surname Support) ──
const compoundSurnames = ['欧阳', '太史', '端木', '上官', '司马', '东方', '独孤', '南宫', '夏侯', '诸葛', '尉迟', '皇甫', '公孙', '慕容', '令狐', '闾丘', '宰父', '谷梁', '轩辕', '申屠', '乐正', '亚里', '司徒', '司空', '段干', '钟离', '闾丘', '可朱', '呼延', '归海', '乐正', '羊舌', '微生', '梁丘', '左丘', '东门', '西门']

const surnameDist = computed(() => {
  const map = new Map<string, number>()
  for (const p of people.value) {
    if (!p.name) continue
    let surname = ''
    if (p.name.length >= 2) {
      const double = p.name.substring(0, 2)
      if (compoundSurnames.includes(double)) {
        surname = double
      }
    }
    if (!surname && p.name.length >= 1) {
      surname = p.name.charAt(0)
    }
    if (surname) {
      map.set(surname, (map.get(surname) || 0) + 1)
    }
  }
  return Array.from(map.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
})

const maxSurnameCount = computed(() => Math.max(1, ...surnameDist.value.map(d => d[1])))

// ── Lifespan Accuracy ──
function parseYear(s?: string): number | null {
  if (!s) return null
  const m = s.match(/\d{3,4}/)
  return m ? parseInt(m[0]) : null
}

const lifespans = computed(() => {
  return people.value
    .filter(p => p.birth && p.death)
    .map(p => {
      const by = parseYear(p.birth)
      const dy = parseYear(p.death)
      if (by === null || dy === null) return null
      return { name: p.name, years: dy - by }
    })
    .filter((l): l is { name: string, years: number } => l !== null && l.years >= 0 && l.years <= 120)
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

const lifespanBuckets = computed(() => {
  const buckets = new Map<string, number>()
  for (const l of lifespans.value) {
    const label = `${Math.floor(l.years / 10) * 10}~${Math.floor(l.years / 10) * 10 + 9}`
    buckets.set(label, (buckets.get(label) || 0) + 1)
  }
  return Array.from(buckets.entries()).sort((a, b) => a[0].localeCompare(b[0]))
})

const maxBucketCount = computed(() => Math.max(1, ...lifespanBuckets.value.map(d => d[1])))

// ── Century distribution ──
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

function goBack() {
  router.push({ name: 'workbench' })
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
      <h1 class="stats-nav__title">家族统计分析</h1>
      <div class="nav-spacer"></div>
    </header>

    <main class="stats-content">
      <!-- Family Profile Hero -->
      <section v-if="pubData" class="family-hero">
        <div class="family-hero__header">
          <h2 class="family-hero__title">{{ pubData.title }}</h2>
          <p v-if="pubData.subtitle" class="family-hero__subtitle">{{ pubData.subtitle }}</p>
        </div>
        <div class="family-hero__meta" v-if="pubData.info?.ancestralOrigin || pubData.info?.hallName || pubData.info?.familyMotto">
          <div class="seal-item" v-if="pubData.info.ancestralOrigin">
            <span class="seal-label">祖籍</span>
            <span class="seal-value">{{ pubData.info.ancestralOrigin }}</span>
          </div>
          <div class="seal-item" v-if="pubData.info.hallName">
            <span class="seal-label">堂号</span>
            <span class="seal-value">{{ pubData.info.hallName }}</span>
          </div>
          <div class="seal-item seal-item--motto" v-if="pubData.info.familyMotto">
            <span class="seal-label">家训</span>
            <span class="seal-value">{{ pubData.info.familyMotto }}</span>
          </div>
        </div>
      </section>

      <!-- Overview Cards -->
      <div class="overview-grid">
        <div class="ov-card">
          <div class="ov-card__bg">族</div>
          <div class="ov-card__content">
            <span class="ov-card__number">{{ totalCount }}</span>
            <span class="ov-card__label">总人数</span>
          </div>
        </div>
        <div class="ov-card ov-card--male">
          <div class="ov-card__bg">♂</div>
          <div class="ov-card__content">
            <span class="ov-card__number">{{ maleCount }}</span>
            <span class="ov-card__label">男性</span>
          </div>
        </div>
        <div class="ov-card ov-card--female">
          <div class="ov-card__bg">♀</div>
          <div class="ov-card__content">
            <span class="ov-card__number">{{ femaleCount }}</span>
            <span class="ov-card__label">女性</span>
          </div>
        </div>
        <div class="ov-card ov-card--gen">
          <div class="ov-card__bg">世代</div>
          <div class="ov-card__content">
            <span class="ov-card__number">{{ generationCount || '-' }}</span>
            <span class="ov-card__label">世代数</span>
          </div>
        </div>
        <div class="ov-card ov-card--alive">
          <div class="ov-card__bg">世</div>
          <div class="ov-card__content">
            <span class="ov-card__number">{{ aliveCount }}</span>
            <span class="ov-card__label">在世</span>
          </div>
        </div>
        <div class="ov-card ov-card--deceased">
          <div class="ov-card__bg">卒</div>
          <div class="ov-card__content">
            <span class="ov-card__number">{{ deceasedCount }}</span>
            <span class="ov-card__label">已故</span>
          </div>
        </div>
      </div>

      <!-- Charts Grid -->
      <div class="charts-grid">
        <!-- Gender Ratio -->
        <section class="chart-card">
          <h2 class="chart-title">人口性别比例</h2>
          <div class="gender-bar">
            <div class="gender-bar__male" :style="{ width: malePercent + '%' }">
              <span v-if="malePercent > 15">{{ malePercent }}%</span>
            </div>
            <div class="gender-bar__female" :style="{ width: femalePercent + '%' }">
              <span v-if="femalePercent > 15">{{ femalePercent }}%</span>
            </div>
          </div>
          <div class="gender-legend">
            <span class="legend-item"><span class="legend-dot legend-dot--male"></span>男性 {{ maleCount }}</span>
            <span class="legend-item"><span class="legend-dot legend-dot--female"></span>女性 {{ femaleCount }}</span>
          </div>
        </section>

        <!-- Generation Distribution -->
        <section class="chart-card">
          <h2 class="chart-title">世代人口分布</h2>
          <div v-if="generationDist.length === 0" class="chart-empty">暂无数据</div>
          <div v-else class="bar-chart">
            <div v-for="[gen, count] in generationDist" :key="gen" class="bar-row">
              <span class="bar-label">{{ gen === 0 ? '未知' : '第' + gen + '代' }}</span>
              <div class="bar-track">
                <div class="bar-fill" :style="{ width: (count / maxGenCount * 100) + '%' }"></div>
              </div>
              <span class="bar-value">{{ count }}</span>
            </div>
          </div>
        </section>

        <!-- Lifespan Stats -->
        <section class="chart-card">
          <h2 class="chart-title">家族寿命概况</h2>
          <div v-if="lifespans.length === 0" class="chart-empty">需要完善生卒年数据以生成报告</div>
          <template v-else>
            <div class="lifespan-summary">
              <div class="ls-item">
                <span class="ls-value">{{ avgLifespan }}<small>岁</small></span>
                <span class="ls-label">平均寿命</span>
              </div>
              <div class="ls-item" v-if="maxLifespan">
                <span class="ls-value">{{ maxLifespan.years }}<small>岁</small></span>
                <span class="ls-label">最高寿 · {{ maxLifespan.name }}</span>
              </div>
              <div class="ls-item" v-if="minLifespan">
                <span class="ls-value">{{ minLifespan.years }}<small>岁</small></span>
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
          <h2 class="chart-title">历史跨度（出生/逝世）</h2>
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
              <span class="legend-item"><span class="legend-dot legend-dot--death"></span>逝世</span>
            </div>
          </div>
        </section>

        <!-- Surname Distribution -->
        <section class="chart-card chart-card--wide">
          <h2 class="chart-title">家族姓氏分布 (TOP 10)</h2>
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
          <h2 class="chart-title">修订志记录</h2>
          <div v-if="loadingHistory" class="chart-empty">正在调取家族修订志...</div>
          <div v-else-if="history.length === 0" class="chart-empty">尚无修订记录</div>
          <div v-else class="history-timeline">
            <div v-for="entry in history" :key="entry.id" class="history-event">
              <div class="history-event__line">
                <div class="history-event__dot"></div>
              </div>
              <div class="history-event__content">
                <div class="history-event__meta">
                  <span class="history-event__time">{{ formatHistoryDate(entry.createdAt) }}</span>
                  <div class="history-event__actor">
                    <svg class="actor-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
                    </svg>
                    {{ entry.username }}
                  </div>
                </div>
                <div class="history-event__body">
                  <span :class="historyActionClass(entry.action)">{{ historyActionLabel(entry.action) }}</span>
                  <span class="history-event__detail">{{ entry.detail || '系统常规更新' }}</span>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  </div>
</template>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Noto+Serif+SC:wght@400;700;900&display=swap');

.stats-page {
  min-height: 100vh;
  background: var(--bg-shell, #efe3cf);
  background-image: var(--shell-bg-image);
  color: var(--text-main, #2c2420);
}

.stats-nav {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 2rem;
  height: 60px;
  background: var(--bg-panel);
  border-bottom: 1px solid var(--line-soft);
  backdrop-filter: blur(20px);
  position: sticky;
  top: 0;
  z-index: 50;
}

.nav-back {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  background: none;
  border: 1px solid var(--line-soft);
  color: var(--accent-earth, #6a4b2f);
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
  padding: 0.4rem 0.8rem;
  border-radius: 20px;
  transition: all 0.2s ease;
}

.nav-back:hover {
  background: rgba(169, 110, 53, 0.05);
  border-color: var(--accent-amber);
  transform: translateX(-2px);
}

.stats-nav__title {
  font-size: 1.1rem;
  font-weight: 800;
  color: var(--text-main);
  margin: 0;
  font-family: 'Noto Serif SC', serif;
  letter-spacing: 0.1em;
}

.nav-spacer { width: 100px; }

.stats-content {
  max-width: 1100px;
  margin: 0 auto;
  padding: 2.5rem 2rem;
  display: flex;
  flex-direction: column;
  gap: 2rem;
}

/* ── Family Hero ── */
.family-hero {
  background: var(--bg-panel);
  border: 1px solid var(--line-soft);
  border-radius: 24px;
  padding: 3.5rem 2rem;
  text-align: center;
  position: relative;
  overflow: hidden;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.05);
}

.family-hero::before {
  content: "";
  position: absolute;
  top: 0; left: 0; right: 0; bottom: 0;
  background: url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M30 0l15 30H15z' fill='%23a96e35' fill-opacity='0.02'/%3E%3C/svg%3E");
  pointer-events: none;
}

.family-hero__title {
  font-size: 2.8rem;
  font-family: 'Noto Serif SC', serif;
  font-weight: 900;
  color: var(--text-main);
  margin: 0 0 0.5rem;
  letter-spacing: -0.01em;
}

.family-hero__subtitle {
  font-size: 1.25rem;
  color: var(--accent-earth);
  margin: 0 0 2.5rem;
  font-weight: 500;
  font-family: 'Noto Serif SC', serif;
  opacity: 0.7;
}

.family-hero__meta {
  display: flex;
  justify-content: center;
  gap: 2.5rem;
  flex-wrap: wrap;
  padding-top: 2.5rem;
  border-top: 1px solid var(--line-soft);
}

.seal-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.6rem;
  min-width: 100px;
}

.seal-label {
  font-size: 0.75rem;
  color: var(--accent-amber);
  font-weight: 700;
  padding: 0.1rem 0.5rem;
  border: 1px solid var(--accent-amber);
  border-radius: 4px;
  letter-spacing: 0.1em;
  background: rgba(169, 110, 53, 0.05);
}

.seal-value {
  font-size: 1.25rem;
  font-weight: 700;
  color: var(--text-main);
  font-family: 'Noto Serif SC', serif;
}

.seal-item--motto .seal-value {
  color: #8b2d1c;
  font-style: italic;
}

/* ── Overview Cards ── */
.overview-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
  gap: 1.25rem;
}

.ov-card {
  background: var(--bg-panel);
  border: 1px solid var(--line-soft);
  border-radius: 20px;
  padding: 1.75rem 1.5rem;
  position: relative;
  overflow: hidden;
  transition: all 0.3s cubic-bezier(0.23, 1, 0.32, 1);
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.03);
}

.ov-card:hover {
  transform: translateY(-5px);
  box-shadow: 0 12px 25px rgba(0, 0, 0, 0.08);
  border-color: var(--accent-amber);
}

.ov-card__bg {
  position: absolute;
  right: -5px;
  bottom: -15px;
  font-size: 5.5rem;
  font-weight: 900;
  color: var(--accent-earth);
  opacity: 0.04;
  user-select: none;
  pointer-events: none;
  font-family: 'Noto Serif SC', serif;
  transition: opacity 0.3s ease;
}

.ov-card:hover .ov-card__bg {
  opacity: 0.08;
}

.ov-card__number {
  display: block;
  font-size: 2.25rem;
  font-weight: 900;
  color: var(--text-main);
  line-height: 1;
  margin-bottom: 0.4rem;
  font-family: 'Noto Serif SC', serif;
}

.ov-card__label {
  font-size: 0.85rem;
  color: var(--text-soft);
  font-weight: 600;
}

.ov-card--male .ov-card__number { color: var(--accent-ink); }
.ov-card--female .ov-card__number { color: #8b2d1c; }
.ov-card--gen .ov-card__number { color: var(--accent-amber); }
.ov-card--alive .ov-card__number { color: var(--accent-olive); }
.ov-card--deceased .ov-card__number { color: var(--text-soft); }

/* ── Charts Grid ── */
.charts-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1.5rem;
}

.chart-card {
  background: var(--bg-panel);
  border: 1px solid var(--line-soft);
  border-radius: 20px;
  padding: 1.75rem;
  box-shadow: 0 4px 12px rgba(0,0,0,0.02);
}

.chart-card--wide {
  grid-column: 1 / -1;
}

.chart-title {
  font-size: 1.05rem;
  font-weight: 800;
  color: var(--text-main);
  margin: 0 0 1.75rem;
  font-family: 'Noto Serif SC', serif;
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.chart-title::before {
  content: "";
  width: 5px;
  height: 1.2rem;
  background: var(--accent-amber);
  border-radius: 3px;
  box-shadow: 0 0 8px rgba(169, 110, 53, 0.4);
}

.chart-empty {
  font-size: 0.9rem;
  color: var(--text-soft);
  text-align: center;
  padding: 3rem 0;
  background: var(--bg-shell);
  border: 1px dashed var(--line-soft);
  border-radius: 16px;
}

/* ── Gender Bar ── */
.gender-bar {
  display: flex;
  height: 44px;
  border-radius: 12px;
  overflow: hidden;
  margin-bottom: 1.25rem;
  background: var(--bg-shell);
  padding: 4px;
}

.gender-bar__male {
  background: var(--metric-ink, linear-gradient(135deg, #3c5363, #5a7a90));
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-size: 0.9rem;
  font-weight: 900;
  border-radius: 8px 0 0 8px;
  transition: width 1s cubic-bezier(0.16, 1, 0.3, 1);
  box-shadow: 0 4px 10px rgba(60, 83, 99, 0.2);
}

.gender-bar__female {
  background: linear-gradient(135deg, #8b2d1c, #b04a3a);
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-size: 0.9rem;
  font-weight: 900;
  border-radius: 0 8px 8px 0;
  transition: width 1s cubic-bezier(0.16, 1, 0.3, 1);
  box-shadow: 0 4px 10px rgba(139, 45, 28, 0.2);
}

.gender-legend,
.timeline-legend {
  display: flex;
  gap: 1.75rem;
  font-size: 0.85rem;
  color: var(--text-sub);
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  font-weight: 600;
}

.legend-dot {
  width: 12px;
  height: 12px;
  border-radius: 4px;
}

.legend-dot--male { background: var(--accent-ink); }
.legend-dot--female { background: #8b2d1c; }
.legend-dot--birth { background: var(--accent-olive); }
.legend-dot--death { background: var(--text-soft); }

/* ── Bar Chart ── */
.bar-chart {
  display: flex;
  flex-direction: column;
  gap: 0.85rem;
}

.bar-row {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.bar-label {
  width: 65px;
  font-size: 0.8rem;
  font-weight: 700;
  color: var(--text-soft);
  text-align: right;
  flex-shrink: 0;
}

.bar-label--surname {
  width: 40px;
  font-size: 1.1rem;
  font-weight: 800;
  color: var(--text-main);
  text-align: center;
  font-family: 'Noto Serif SC', serif;
}

.bar-track {
  flex: 1;
  height: 14px;
  background: var(--bg-shell);
  border-radius: 7px;
  overflow: hidden;
}

.bar-fill {
  height: 100%;
  background: var(--metric-amber, linear-gradient(90deg, #4a3421, #a96e35));
  border-radius: 7px;
  transition: width 1.2s cubic-bezier(0.16, 1, 0.3, 1);
  min-width: 4px;
  box-shadow: 0 0 12px rgba(169, 110, 53, 0.25);
}

.bar-fill--lifespan {
  background: var(--metric-olive, linear-gradient(90deg, #1e7a5c, #3ec29a));
  box-shadow: 0 0 12px rgba(103, 114, 79, 0.25);
}

.bar-fill--surname {
  background: var(--metric-earth, linear-gradient(90deg, #7c4dff, #b388ff));
  box-shadow: 0 0 12px rgba(118, 79, 47, 0.25);
}

.bar-value {
  width: 35px;
  font-size: 0.9rem;
  font-weight: 800;
  color: var(--text-main);
  text-align: left;
}

/* ── Lifespan Summary ── */
.lifespan-summary {
  display: flex;
  gap: 2.5rem;
  margin-bottom: 1.25rem;
  padding: 1.5rem;
  background: rgba(169, 110, 53, 0.04);
  border-radius: 16px;
  border: 1px solid var(--line-soft);
}

.ls-item {
  display: flex;
  flex-direction: column;
}

.ls-value {
  font-size: 1.75rem;
  font-weight: 900;
  color: var(--text-main);
  line-height: 1.1;
  font-family: 'Noto Serif SC', serif;
}

.ls-value small {
  font-size: 0.85rem;
  margin-left: 2px;
  color: var(--text-soft);
}

.ls-label {
  font-size: 0.75rem;
  color: var(--accent-amber);
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  margin-top: 0.25rem;
}

/* ── Timeline Chart ── */
.timeline-chart {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.timeline-row {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.timeline-label {
  width: 55px;
  font-size: 0.8rem;
  font-weight: 700;
  color: var(--text-soft);
  text-align: right;
  flex-shrink: 0;
}

.timeline-bars {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.timeline-bar {
  height: 12px;
  border-radius: 6px;
  transition: width 1.2s cubic-bezier(0.16, 1, 0.3, 1);
  min-width: 6px;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  padding-right: 8px;
}

.timeline-bar--birth {
  background: var(--metric-olive, linear-gradient(90deg, #1e7a5c, #3ec29a));
}

.timeline-bar--death {
  background: linear-gradient(90deg, #5a5e66, #9ca3af);
}

.timeline-bar__val {
  font-size: 0.7rem;
  font-weight: 900;
  color: #fff;
}

/* ── History Timeline ── */
.history-timeline {
  display: flex;
  flex-direction: column;
  gap: 0;
}

.history-event {
  display: flex;
  gap: 1.5rem;
}

.history-event__line {
  width: 2px;
  background: var(--line-soft);
  position: relative;
  margin-left: 8px;
}

.history-event:last-child .history-event__line {
  background: linear-gradient(to bottom, var(--line-soft) 20px, transparent);
}

.history-event__dot {
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: var(--bg-paper);
  border: 3px solid var(--accent-amber);
  position: absolute;
  left: -6px;
  top: 1.25rem;
  box-shadow: 0 0 0 4px rgba(169, 110, 53, 0.1);
  z-index: 2;
}

.history-event__content {
  flex: 1;
  padding: 1rem 0 2rem;
}

.history-event__meta {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 0.75rem;
}

.history-event__time {
  font-size: 0.85rem;
  font-weight: 700;
  color: var(--accent-amber);
}

.history-event__actor {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  font-size: 0.85rem;
  font-weight: 700;
  color: var(--text-main);
  background: var(--bg-shell);
  padding: 0.2rem 0.6rem;
  border-radius: 12px;
}

.actor-icon {
  width: 12px;
  height: 12px;
  color: var(--accent-earth);
}

.history-event__body {
  display: flex;
  align-items: center;
  gap: 1rem;
  background: var(--bg-panel);
  border: 1px solid var(--line-soft);
  padding: 0.75rem 1rem;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.03);
}

.history-tag {
  padding: 0.25rem 0.75rem;
  border-radius: 6px;
  font-size: 0.75rem;
  font-weight: 800;
  border: 1px solid transparent;
}

.history-tag--danger { background: var(--danger-bg); color: var(--danger-title); border-color: var(--danger-border); }
.history-tag--success { background: rgba(103, 114, 79, 0.1); color: var(--accent-olive); border-color: rgba(103, 114, 79, 0.2); }
.history-tag--info { background: rgba(60, 83, 99, 0.1); color: var(--accent-ink); border-color: rgba(60, 83, 99, 0.2); }
.history-tag--purple { background: rgba(124, 77, 255, 0.1); color: #7c4dff; border-color: rgba(124, 77, 255, 0.2); }
.history-tag--indigo { background: rgba(55, 48, 163, 0.1); color: #3730a3; border-color: rgba(55, 48, 163, 0.2); }

.history-event__detail {
  font-size: 0.9rem;
  color: var(--text-sub);
  font-weight: 500;
}

@media (max-width: 900px) {
  .charts-grid { grid-template-columns: 1fr; }
}

@media (max-width: 600px) {
  .family-hero__title { font-size: 2rem; }
  .family-hero__meta { gap: 1.5rem; }
  .overview-grid { grid-template-columns: repeat(2, 1fr); }
  .history-event__meta { flex-direction: column; align-items: flex-start; gap: 0.5rem; }
  .history-event__body { flex-direction: column; align-items: flex-start; }
}
</style>
