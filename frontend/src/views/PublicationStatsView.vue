<script setup lang="ts">
import { computed, onMounted, ref, inject } from 'vue'
import { useRouter } from 'vue-router'
import { getPublicationHistory, type PublicationHistoryEntry } from '../api/publication'
import type { Person, FamilyUnit, PublicationData } from '../types/family'
import { parseYear } from '../lib/dateUtils'

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
const compoundSurnames = ['欧阳', '太史', '端木', '上官', '司马', '东方', '独孤', '南宫', '夏侯', '诸葛', '尉迟', '皇甫', '公孙', '慕容', '令狐', '闾丘', '宰父', '谷梁', '轩辕', '申屠', '乐正', '亚里', '司徒', '司空', '段干', '钟离', '可朱', '呼延', '归海', '羊舌', '微生', '梁丘', '左丘', '东门', '西门']

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
  <div class="stats-view">
    <div class="bento-header">
      <div class="header-left">
        <button class="action-btn back-btn" @click="goBack" title="返回工作台">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="15 18 9 12 15 6"></polyline>
          </svg>
        </button>
        <div class="header-content">
          <h1 class="page-title">家族统计分析 // STATISTICS</h1>
          <p class="page-desc">全景数字化族谱数据洞察与修订追溯</p>
        </div>
      </div>
    </div>

    <main class="stats-content">
      <!-- Family Profile Hero Card -->
      <div v-if="pubData" class="bento-card hero-card">
        <div class="hero-bg-accent"></div>
        <div class="hero-main">
          <h2 class="family-title">{{ pubData.title }}</h2>
          <p v-if="pubData.subtitle" class="family-subtitle">{{ pubData.subtitle }}</p>
          <div class="family-seals" v-if="pubData.info?.ancestralOrigin || pubData.info?.hallName || pubData.info?.familyMotto">
            <div class="seal" v-if="pubData.info.ancestralOrigin">
              <span class="label">祖籍</span>
              <span class="value">{{ pubData.info.ancestralOrigin }}</span>
            </div>
            <div class="seal" v-if="pubData.info.hallName">
              <span class="label">堂号</span>
              <span class="value">{{ pubData.info.hallName }}</span>
            </div>
            <div class="seal motto" v-if="pubData.info.familyMotto">
              <span class="label">家训</span>
              <span class="value">{{ pubData.info.familyMotto }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Quick Metrics Grid -->
      <div class="metrics-grid">
        <div class="bento-card metric-card">
          <div class="metric-bg-icon">族</div>
          <div class="metric-value">{{ totalCount }}</div>
          <div class="metric-label">档案总人数</div>
        </div>
        <div class="bento-card metric-card male">
          <div class="metric-bg-icon">♂</div>
          <div class="metric-value">{{ maleCount }}</div>
          <div class="metric-label">男性编委</div>
        </div>
        <div class="bento-card metric-card female">
          <div class="metric-bg-icon">♀</div>
          <div class="metric-value">{{ femaleCount }}</div>
          <div class="metric-label">女性编委</div>
        </div>
        <div class="bento-card metric-card generation">
          <div class="metric-bg-icon">代</div>
          <div class="metric-value">{{ generationCount || '-' }}</div>
          <div class="metric-label">延续世代数</div>
        </div>
        <div class="bento-card metric-card alive">
          <div class="metric-bg-icon">世</div>
          <div class="metric-value">{{ aliveCount }}</div>
          <div class="metric-label">在世成员</div>
        </div>
        <div class="bento-card metric-card deceased">
          <div class="metric-bg-icon">卒</div>
          <div class="metric-value">{{ deceasedCount }}</div>
          <div class="metric-label">已故先祖</div>
        </div>
      </div>

      <!-- Detailed Analysis Grid -->
      <div class="analysis-grid">
        <!-- Gender Ratio Chart -->
        <div class="bento-card chart-card">
          <h3 class="card-title">人口性别比例</h3>
          <div class="gender-viz">
            <div class="ratio-bar">
              <div class="bar male" :style="{ width: malePercent + '%' }">
                <span v-if="malePercent > 15">{{ malePercent }}%</span>
              </div>
              <div class="bar female" :style="{ width: femalePercent + '%' }">
                <span v-if="femalePercent > 15">{{ femalePercent }}%</span>
              </div>
            </div>
            <div class="viz-legend">
              <div class="legend-item"><span class="dot male"></span>男性 {{ maleCount }}</div>
              <div class="legend-item"><span class="dot female"></span>女性 {{ femaleCount }}</div>
            </div>
          </div>
        </div>

        <!-- Generation Distribution -->
        <div class="bento-card chart-card">
          <h3 class="card-title">世代人口分布</h3>
          <div v-if="generationDist.length === 0" class="empty-hint">暂无数据</div>
          <div v-else class="glass-bar-chart">
            <div v-for="[gen, count] in generationDist" :key="gen" class="chart-row">
              <span class="row-label">{{ gen === 0 ? '未知' : '第 ' + gen + ' 代' }}</span>
              <div class="row-track">
                <div class="row-fill" :style="{ width: (count / maxGenCount * 100) + '%' }"></div>
              </div>
              <span class="row-value">{{ count }}</span>
            </div>
          </div>
        </div>

        <!-- Lifespan Insights -->
        <div class="bento-card chart-card">
          <h3 class="card-title">家族寿命概况</h3>
          <div v-if="lifespans.length === 0" class="empty-hint">需完善生卒年数据</div>
          <template v-else>
            <div class="stat-summary">
              <div class="stat-item">
                <div class="val">{{ avgLifespan }}<small>岁</small></div>
                <div class="lbl">平均寿命</div>
              </div>
              <div class="stat-item prominent" v-if="maxLifespan">
                <div class="val">{{ maxLifespan.years }}<small>岁</small></div>
                <div class="lbl">最高寿 · {{ maxLifespan.name }}</div>
              </div>
            </div>
            <div class="glass-bar-chart compact">
              <div v-for="[label, count] in lifespanBuckets" :key="label" class="chart-row">
                <span class="row-label">{{ label }}岁</span>
                <div class="row-track">
                  <div class="row-fill lifespan" :style="{ width: (count / maxBucketCount * 100) + '%' }"></div>
                </div>
                <span class="row-value">{{ count }}</span>
              </div>
            </div>
          </template>
        </div>

        <!-- Century Distribution -->
        <div class="bento-card chart-card">
          <h3 class="card-title">历史跨度（出生/逝世）</h3>
          <div v-if="centuryData.length === 0" class="empty-hint">暂无数据</div>
          <div v-else class="glass-timeline-chart">
            <div v-for="c in centuryData" :key="c.century" class="chart-row dual">
              <span class="row-label">{{ c.label }}</span>
              <div class="row-bars">
                <div class="bar birth" :style="{ width: (c.births / maxCenturyCount * 100) + '%' }">
                  <span v-if="c.births > 0">{{ c.births }}</span>
                </div>
                <div class="bar death" :style="{ width: (c.deaths / maxCenturyCount * 100) + '%' }">
                  <span v-if="c.deaths > 0">{{ c.deaths }}</span>
                </div>
              </div>
            </div>
            <div class="viz-legend">
              <div class="legend-item"><span class="dot birth"></span>出生</div>
              <div class="legend-item"><span class="dot death"></span>逝世</div>
            </div>
          </div>
        </div>

        <!-- Surname Rankings -->
        <div class="bento-card chart-card wide">
          <h3 class="card-title">家族姓氏分布 (TOP 10)</h3>
          <div v-if="surnameDist.length === 0" class="empty-hint">暂无数据</div>
          <div v-else class="glass-bar-chart horizontal">
            <div v-for="[surname, count] in surnameDist" :key="surname" class="chart-row">
              <span class="row-label surname">{{ surname }}</span>
              <div class="row-track">
                <div class="row-fill surname" :style="{ width: (count / maxSurnameCount * 100) + '%' }"></div>
              </div>
              <span class="row-value">{{ count }}</span>
            </div>
          </div>
        </div>

        <!-- Revision History -->
        <div class="bento-card chart-card wide">
          <h3 class="card-title">族谱修订志</h3>
          <div v-if="loadingHistory" class="empty-hint">调取档案中...</div>
          <div v-else-if="history.length === 0" class="empty-hint">尚无修订记录</div>
          <div v-else class="glass-history">
            <div v-for="entry in history" :key="entry.id" class="history-node">
              <div class="node-line">
                <div class="node-dot"></div>
              </div>
              <div class="node-card">
                <div class="node-meta">
                  <span class="time">{{ formatHistoryDate(entry.createdAt) }}</span>
                  <div class="actor">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
                    </svg>
                    {{ entry.username }}
                  </div>
                </div>
                <div class="node-body">
                  <span class="tag" :class="historyActionClass(entry.action)">{{ historyActionLabel(entry.action) }}</span>
                  <span class="detail">{{ entry.detail || '常规维护' }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  </div>
</template>

<style scoped>
.stats-view {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

/* ── Header ── */
.bento-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.header-left {
  display: flex;
  align-items: center;
  gap: 16px;
}
.page-title {
  font-family: monospace;
  font-size: 1.1rem;
  font-weight: 700;
  letter-spacing: 0.1em;
  color: var(--text-main);
  margin: 0 0 6px;
}
.page-desc {
  font-size: 0.85rem;
  color: var(--text-soft);
  margin: 0;
}
.back-btn {
  width: 40px;
  height: 40px;
  border-radius: 12px;
  background: var(--glass-panel-bg, rgba(255,255,255,0.4));
  border: 1px solid var(--glass-border-highlight, rgba(255,255,255,0.6));
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-main);
  cursor: pointer;
  transition: all 0.2s ease;
}
.back-btn:hover {
  background: var(--bg-panel, #fff);
  transform: translateX(-4px);
  box-shadow: 0 4px 12px rgba(0,0,0,0.05);
}

.stats-content {
  display: flex;
  flex-direction: column;
  gap: 24px;
  max-width: 1200px;
  margin: 0 auto;
}

/* ── Bento Card Styles ── */
.bento-card {
  background: var(--glass-panel-bg, rgba(255, 255, 255, 0.6));
  backdrop-filter: blur(24px) saturate(180%);
  -webkit-backdrop-filter: blur(24px) saturate(180%);
  border: 1px solid var(--glass-border-highlight, rgba(255, 255, 255, 0.8));
  border-radius: 20px;
  box-shadow: 0 24px 48px rgba(0, 0, 0, 0.05), inset 0 1px 0 rgba(255,255,255,0.5);
  padding: 24px;
  position: relative;
  overflow: hidden;
}
:global([data-theme="ink-wash"]) .bento-card,
:global([data-theme="rosewood"]) .bento-card,
:global([data-theme="star-sea"]) .bento-card {
  background: rgba(20, 20, 20, 0.5);
  border-color: rgba(255,255,255,0.1);
  box-shadow: 0 24px 48px rgba(0,0,0,0.2);
}

/* ── Hero Card ── */
.hero-card {
  padding: 32px 24px;
  text-align: center;
}
.hero-bg-accent {
  position: absolute;
  top: -50%; left: -50%; width: 200%; height: 200%;
  background: radial-gradient(circle, var(--accent-amber) 0%, transparent 40%);
  opacity: 0.05;
  pointer-events: none;
}
.family-title {
  font-family: 'Noto Serif SC', serif;
  font-size: 2.2rem;
  font-weight: 900;
  margin: 0 0 8px;
  color: var(--text-main);
}
.family-subtitle {
  font-size: 1.1rem;
  color: var(--text-soft);
  margin: 0 0 32px;
  font-family: 'Noto Serif SC', serif;
}
.family-seals {
  display: flex;
  justify-content: center;
  gap: 32px;
  flex-wrap: wrap;
  padding-top: 32px;
  border-top: 1px solid var(--glass-border-shadow, rgba(0,0,0,0.05));
}
.seal {
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-width: 100px;
}
.seal .label {
  font-size: 0.7rem;
  font-weight: 800;
  color: var(--accent-amber);
  text-transform: uppercase;
  letter-spacing: 0.1em;
  border: 1px solid var(--accent-amber);
  padding: 2px 8px;
  border-radius: 4px;
  width: fit-content;
  margin: 0 auto;
}
.seal .value {
  font-family: 'Noto Serif SC', serif;
  font-size: 1.2rem;
  font-weight: 700;
  color: var(--text-main);
}
.seal.motto .value { color: #8b2d1c; font-style: italic; }

/* ── Metrics Grid ── */
.metrics-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
  gap: 20px;
}
.metric-card {
  padding: 24px 20px;
  transition: transform 0.3s ease;
}
.metric-card:hover { transform: translateY(-4px); }
.metric-bg-icon {
  position: absolute;
  right: -10px; bottom: -10px;
  font-size: 4rem;
  font-weight: 900;
  opacity: 0.03;
  font-family: 'Noto Serif SC', serif;
}
.metric-value {
  font-family: 'Noto Serif SC', serif;
  font-size: 1.8rem;
  font-weight: 900;
  color: var(--text-main);
  margin-bottom: 4px;
}
.metric-label {
  font-size: 0.8rem;
  font-weight: 700;
  color: var(--text-soft);
}
.metric-card.male .metric-value { color: #3c5363; }
.metric-card.female .metric-value { color: #8b2d1c; }
.metric-card.generation .metric-value { color: var(--accent-amber); }
.metric-card.alive .metric-value { color: #2e7d32; }

/* ── Analysis Grid ── */
.analysis-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 24px;
}
.chart-card.wide { grid-column: 1 / -1; }
.card-title {
  font-family: 'Noto Serif SC', serif;
  font-size: 1rem;
  font-weight: 800;
  margin: 0 0 20px;
  display: flex;
  align-items: center;
  gap: 8px;
}
.card-title::before {
  content: '';
  width: 4px; height: 16px;
  background: var(--accent-amber);
  border-radius: 2px;
}

/* ── Custom Visualizations ── */
.ratio-bar {
  height: 28px;
  border-radius: 8px;
  overflow: hidden;
  display: flex;
  background: var(--glass-border-shadow, rgba(0,0,0,0.05));
  padding: 3px;
  margin-bottom: 16px;
}
.ratio-bar .bar {
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.8rem;
  font-weight: 800;
  color: #fff;
  transition: width 1s ease;
}
.ratio-bar .bar.male { background: linear-gradient(135deg, #3c5363, #5a7a90); border-radius: 8px 0 0 8px; }
.ratio-bar .bar.female { background: linear-gradient(135deg, #8b2d1c, #b04a3a); border-radius: 0 8px 8px 0; }

.viz-legend {
  display: flex;
  gap: 20px;
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--text-soft);
}
.legend-item { display: flex; align-items: center; gap: 6px; }
.dot { width: 8px; height: 8px; border-radius: 2px; }
.dot.male { background: #3c5363; }
.dot.female { background: #8b2d1c; }
.dot.birth { background: #3ec29a; }
.dot.death { background: #9ca3af; }

.glass-bar-chart { display: flex; flex-direction: column; gap: 12px; }
.chart-row { display: flex; align-items: center; gap: 12px; }
.row-label { width: 60px; font-size: 0.75rem; font-weight: 700; color: var(--text-soft); text-align: right; }
.row-label.surname { font-family: 'Noto Serif SC', serif; font-size: 1.1rem; font-weight: 800; color: var(--text-main); width: 40px; }
.row-track { flex: 1; height: 10px; background: var(--glass-border-shadow, rgba(0,0,0,0.05)); border-radius: 5px; overflow: hidden; }
.row-fill { height: 100%; background: linear-gradient(90deg, var(--accent-earth), var(--accent-amber)); border-radius: 5px; transition: width 1.2s ease; }
.row-fill.lifespan { background: linear-gradient(90deg, #1e7a5c, #3ec29a); }
.row-fill.surname { background: linear-gradient(90deg, #7c4dff, #b388ff); }
.row-value { width: 30px; font-size: 0.85rem; font-weight: 700; color: var(--text-main); }

.stat-summary { display: flex; gap: 32px; margin-bottom: 20px; padding: 16px; background: rgba(169, 110, 53, 0.05); border-radius: 12px; }
.stat-item .val { font-family: 'Noto Serif SC', serif; font-size: 1.5rem; font-weight: 900; }
.stat-item .val small { font-size: 0.7rem; margin-left: 2px; color: var(--text-soft); }
.stat-item .lbl { font-size: 0.7rem; font-weight: 700; color: var(--accent-amber); text-transform: uppercase; margin-top: 2px; }

.glass-timeline-chart .chart-row.dual { align-items: flex-start; }
.row-bars { flex: 1; display: flex; flex-direction: column; gap: 4px; }
.row-bars .bar { height: 10px; border-radius: 5px; transition: width 1.2s ease; display: flex; align-items: center; justify-content: flex-end; padding-right: 6px; font-size: 0.6rem; color: #fff; font-weight: 800; }
.row-bars .bar.birth { background: linear-gradient(90deg, #1e7a5c, #3ec29a); }
.row-bars .bar.death { background: linear-gradient(90deg, #5a5e66, #9ca3af); }

/* ── History Nodes ── */
.glass-history { display: flex; flex-direction: column; }
.history-node { display: flex; gap: 20px; }
.node-line { width: 2px; background: var(--glass-border-shadow, rgba(0,0,0,0.1)); position: relative; margin-left: 8px; }
.history-node:last-child .node-line { background: linear-gradient(to bottom, var(--glass-border-shadow, rgba(0,0,0,0.1)) 20px, transparent); }
.node-dot { width: 12px; height: 12px; border-radius: 50%; background: var(--bg-panel, #fff); border: 3px solid var(--accent-amber); position: absolute; left: -5px; top: 20px; z-index: 2; box-shadow: 0 0 0 4px rgba(169,110,53,0.1); }
.node-card { flex: 1; padding: 12px 0 24px; }
.node-meta { display: flex; align-items: center; gap: 12px; margin-bottom: 8px; }
.node-meta .time { font-size: 0.8rem; font-weight: 700; color: var(--accent-amber); font-family: monospace; }
.node-meta .actor { font-size: 0.75rem; font-weight: 700; color: var(--text-main); background: var(--glass-border-shadow, rgba(0,0,0,0.05)); padding: 2px 8px; border-radius: 999px; display: flex; align-items: center; gap: 4px; }
.node-body { display: flex; align-items: center; gap: 12px; background: var(--glass-panel-bg, rgba(255,255,255,0.4)); border: 1px solid var(--glass-border-shadow, rgba(0,0,0,0.05)); padding: 10px 16px; border-radius: 12px; }
.node-body .tag { font-size: 0.65rem; font-weight: 800; padding: 2px 8px; border-radius: 4px; text-transform: uppercase; }
.node-body .tag.history-tag--info { background: rgba(59,130,246,0.1); color: #3b82f6; }
.node-body .tag.history-tag--success { background: rgba(34,197,94,0.1); color: #22c55e; }
.node-body .tag.history-tag--purple { background: rgba(168,85,247,0.1); color: #a855f7; }
.node-body .tag.history-tag--indigo { background: rgba(79,70,229,0.1); color: #4f46e5; }
.node-body .detail { font-size: 0.8rem; font-weight: 500; color: var(--text-soft); }

.empty-hint { font-size: 0.85rem; color: var(--text-soft); text-align: center; padding: 32px; background: rgba(0,0,0,0.02); border: 1px dashed var(--glass-border-shadow, rgba(0,0,0,0.1)); border-radius: 12px; }

@media (max-width: 960px) {
  .analysis-grid { grid-template-columns: 1fr; }
  .family-title { font-size: 1.8rem; }
  .metrics-grid { grid-template-columns: repeat(3, 1fr); }
}
@media (max-width: 600px) {
  .metrics-grid { grid-template-columns: repeat(2, 1fr); }
  .node-meta { flex-direction: column; align-items: flex-start; gap: 4px; }
  .node-body { flex-direction: column; align-items: flex-start; gap: 6px; }
}
</style>
