<script setup lang="ts">
import { computed, onMounted, ref, inject } from 'vue'
import { useRouter } from 'vue-router'
import { getPublicationActivity, type ParsedActivity } from '../api/publication'
import { PUBLICATION_CONTEXT_KEY, type Person, type PublicationData } from '../types/family'
import { parseYear } from '../lib/dateUtils'
import {
  filterPublicationActivity,
  getPublicationActivityMeta,
  PUBLICATION_ACTIVITY_FILTERS,
  summarizePublicationActivity,
  type ActivityCategory,
} from '../lib/publicationActivity'

defineProps<{ publicationId: number }>()
const router = useRouter()

// ─── Shared Context ─────────────────────────────────────────────
const { pub, serverPublicationId } = inject(PUBLICATION_CONTEXT_KEY)!
const pubData = computed<PublicationData>(() => pub.publication)

const loadingHistory = ref(true)
const history = ref<ParsedActivity[]>([])
const activeActivityFilter = ref<ActivityCategory>('all')

async function loadHistory() {
  if (!serverPublicationId.value) {
    loadingHistory.value = false
    return
  }
  loadingHistory.value = true
  try {
    history.value = await getPublicationActivity(serverPublicationId.value)
  } catch { history.value = [] }
  finally { loadingHistory.value = false }
}

onMounted(loadHistory)

const people = computed<Person[]>(() => Object.values(pubData.value.people))
const activitySummary = computed(() => summarizePublicationActivity(history.value))
const filteredHistory = computed(() => filterPublicationActivity(history.value, activeActivityFilter.value))
const activityFilterOptions = computed(() => PUBLICATION_ACTIVITY_FILTERS.map((filter) => ({
  ...filter,
  count: filterPublicationActivity(history.value, filter.key).length,
})))

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

function actionLabel(action: string): string {
  return getPublicationActivityMeta(action).label
}

function actionTagClass(action: string): string {
  return `tag--${getPublicationActivityMeta(action).tone}`
}

function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMin = Math.floor(diffMs / 60000)
  if (diffMin < 1) return '刚刚'
  if (diffMin < 60) return `${diffMin} 分钟前`
  const diffHour = Math.floor(diffMin / 60)
  if (diffHour < 24) return `${diffHour} 小时前`
  const diffDay = Math.floor(diffHour / 24)
  if (diffDay < 30) return `${diffDay} 天前`
  return date.toLocaleDateString('zh-CN')
}
</script>

<template>
  <div class="stats-view">
        <!-- Ambient Glassmorphism Background -->
    <div class="ambient-bg">
      <div class="orb orb-1"></div>
      <div class="orb orb-2"></div>
    </div>
    <div class="bento-header">
      <div class="header-left">
        <button class="action-btn back-btn" @click="goBack" aria-label="Back">
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
      <div v-if="totalCount === 0" class="stats-empty">
        <div class="empty-icon">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" opacity="0.3"><path d="M18 20V10" /><path d="M12 20V4" /><path d="M6 20v-6" /></svg>
        </div>
        <h3 class="empty-title">数据面板尚待充实</h3>
        <p class="empty-desc">&#28155;&#21152;&#20154;&#29289;&#21015;&#20013;&#65292;&#32479;&#35745;&#20449;&#24687;&#23558;&#33258;&#21160;&#29983;&#25104;&#12290;</p>
        <button class="bento-btn primary" @click="router.push({ name: 'workbench', params: { id: publicationId } })">前往画布</button>
      </div>
      <div v-else class="stats-content-inner">
        <!-- Family Profile Hero Card -->
        <div v-if="pubData" class="bento-card hero-card">
          <div class="hero-bg-accent"></div>
          <div class="hero-main">
            <h2 class="family-title">{{ pubData.title }}</h2>
            <p v-if="pubData.subtitle" class="family-subtitle">{{ pubData.subtitle }}</p>
            <div v-if="pubData.info?.ancestralOrigin || pubData.info?.hallName || pubData.info?.familyMotto" class="family-seals">
              <div v-if="pubData.info.ancestralOrigin" class="seal">
                <span class="label">祖籍</span>
                <span class="value">{{ pubData.info.ancestralOrigin }}</span>
              </div>
              <div v-if="pubData.info.hallName" class="seal">
                <span class="label">堂号</span>
                <span class="value">{{ pubData.info.hallName }}</span>
              </div>
              <div v-if="pubData.info.familyMotto" class="seal motto">
                <span class="label">家训</span>
                <span class="value">{{ pubData.info.familyMotto }}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Quick Metrics Grid -->
        <div class="metrics-grid">
          <div class="bento-card metric-card">
            <div class="metric-bg-icon">&#24635;</div>
            <div class="metric-value">{{ totalCount }}</div>
            <div class="metric-label">&#24635;&#20154;&#25968;</div>
          </div>
          <div class="bento-card metric-card male">
            <div class="metric-bg-icon">&#30007;</div>
            <div class="metric-value">{{ maleCount }}</div>
            <div class="metric-label">&#30007;&#24615;&#27604;</div>
          </div>
          <div class="bento-card metric-card female">
            <div class="metric-bg-icon">♀</div>
            <div class="metric-value">{{ femaleCount }}</div>
            <div class="metric-label">&#22899;&#24615;&#27604;</div>
          </div>
          <div class="bento-card metric-card generation">
            <div class="metric-bg-icon">&#20195;</div>
            <div class="metric-value">{{ generationCount || '-' }}</div>
            <div class="metric-label">&#20195;&#20790;</div>
          </div>
          <div class="bento-card metric-card alive">
            <div class="metric-bg-icon">&#23431;</div>
            <div class="metric-value">{{ aliveCount }}</div>
            <div class="metric-label">在世成员</div>
          </div>
          <div class="bento-card metric-card deceased">
            <div class="metric-bg-icon">&#22995;</div>
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
                <div class="legend-item"><span class="dot male"></span>&#30007; {{ maleCount }}</div>
                <div class="legend-item"><span class="dot female"></span>&#22899; {{ femaleCount }}</div>
              </div>
            </div>
          </div>

          <!-- Generation Distribution -->
          <div class="bento-card chart-card">
            <h3 class="card-title">世代人口分布</h3>
            <div v-if="generationDist.length === 0" class="empty-hint">暂无数据</div>
            <div v-else class="glass-bar-chart">
              <div v-for="[gen, count] in generationDist" :key="gen" class="chart-row">
                <span class="row-label">{{ gen === 0 ? '&#26410;&#30693;' : '&#31532;' + gen + '&#19990;' }}</span>
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
            <div v-if="lifespans.length === 0" class="empty-hint">&#26080;&#25968;&#25454;</div>
            <template v-else>
              <div class="stat-summary">
                <div class="stat-item">
                  <div class="val">{{ avgLifespan }}<small>&#23681;</small></div>
                  <div class="lbl">平均寿命</div>
                </div>
                <div v-if="maxLifespan" class="stat-item prominent">
                  <div class="val">{{ maxLifespan.years }}<small>&#23681;</small></div>
                  <div class="lbl">最高寿 · {{ maxLifespan.name }}</div>
                </div>
              </div>
              <div class="glass-bar-chart compact">
                <div v-for="[label, count] in lifespanBuckets" :key="label" class="chart-row">
                  <span class="row-label">{{ label }}&#23681;</span>
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
            <h3 class="card-title">&#22995;&#27665;&#20998;&#24067;</h3>
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
            <div class="activity-card-header">
              <h3 class="card-title">&#20462;&#35746;&#35760;&#24405;</h3>
              <div v-if="!loadingHistory && history.length > 0" class="activity-summary">
                <div class="activity-summary__item">
                  <span class="activity-summary__label">&#25193;&#25509;&#26465;&#25968;</span>
                  <strong>{{ activitySummary.latestUsername }}</strong>
                </div>
                <div class="activity-summary__item">
                  <span class="activity-summary__label">&#28304;&#22010;&#20154;&#25968;</span>
                  <strong>{{ activitySummary.latestActionLabel }}</strong>
                </div>
                <div class="activity-summary__item">
                  <span class="activity-summary__label">今日 / 全部</span>
                  <strong>{{ activitySummary.todayCount }} / {{ activitySummary.totalCount }}</strong>
                </div>
              </div>
            </div>
            <div v-if="loadingHistory" class="empty-hint">&#21152;&#36733;&#20013;...</div>
            <div v-else-if="history.length === 0" class="empty-hint">尚无修订记录</div>
            <div v-else class="glass-history">
            <div class="activity-filters" role="tablist" aria-label="Filter">
                <button
                  v-for="filter in activityFilterOptions"
                  :key="filter.key"
                  type="button"
                  class="activity-filter"
                  :class="{ 'activity-filter--active': activeActivityFilter === filter.key }"
                  @click="activeActivityFilter = filter.key"
                >
                  <span>{{ filter.label }}</span>
                  <small>{{ filter.count }}</small>
                </button>
              </div>
              <div v-if="filteredHistory.length === 0" class="empty-hint">该分类下暂无记录</div>
              <article
                v-for="entry in filteredHistory"
                :key="entry.id"
                class="audit-entry"
              >
                <div class="node-line">
                  <div class="node-dot"></div>
                </div>
                <div class="node-card">
                  <div class="audit-entry__meta">
                    <span class="audit-entry__username">{{ entry.username }}</span>
                    <time class="audit-entry__time" :datetime="entry.createdAt">
                      {{ formatRelativeTime(entry.createdAt) }}
                    </time>
                    <span class="audit-entry__action-tag" :class="actionTagClass(entry.action)">
                      {{ actionLabel(entry.action) }}
                    </span>
                  </div>

                  <!-- Field-level diff (only when parsedDetail exists) -->
                  <div v-if="entry.parsedDetail" class="audit-entry__diff">
                    <div v-for="person in entry.parsedDetail" :key="person.personId" class="diff-person">
                      <strong class="diff-person__name">{{ person.personName }}</strong>
                      <div v-for="change in person.changes" :key="change.field" class="diff-field">
                        <span class="diff-field__label">{{ change.fieldLabel }}</span>
                        <span class="diff-field__old">{{ change.old || '&#32929;' }}</span>
                        <span class="diff-field__arrow">&#8594;</span>
                        <span class="diff-field__new">{{ change.new || '&#32929;' }}</span>
                      </div>
                    </div>
                  </div>

                  <!-- Fallback for legacy entries without parsed diff -->
                  <p v-else class="audit-entry__detail">{{ entry.detail }}</p>
                </div>
              </article>
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
.row-bars .bar.death { background: linear-gradient(90deg, #5a5e66, #9ca3af); }

/* ── History Nodes ── */
.activity-card-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 20px;
  margin-bottom: 18px;
}

.activity-summary {
  display: grid;
  grid-template-columns: repeat(3, minmax(120px, 1fr));
  gap: 10px;
  min-width: min(520px, 100%);
}

.activity-summary__item {
  padding: 16px 20px;
  border: 1px solid var(--glass-border-shadow, rgba(0,0,0,0.08));
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.5);
}

.activity-summary__label {
  display: block;
  margin-bottom: 6px;
  color: var(--text-soft);
  font-family: 'Noto Serif SC', 'Songti SC', 'STZhongsong', serif;
  font-size: 0.85rem;
  font-weight: 500;
}

.activity-summary__item strong {
  color: var(--text-main);
  font-family: 'Noto Serif SC', 'Songti SC', 'STZhongsong', serif;
  font-size: 1.1rem;
  font-weight: 500;
}

.activity-filters {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 18px;
}

.activity-filter {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 10px;
  border: 1px solid var(--glass-border-shadow, rgba(0,0,0,0.08));
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.45);
  color: var(--text-soft);
  cursor: pointer;
  font-size: 0.78rem;
  font-weight: 700;
}

.activity-filter small {
  color: var(--accent-amber);
  font-size: 0.72rem;
}

.activity-filter--active,
.activity-filter:hover {
  border-color: var(--accent-amber);
  background: rgba(169, 110, 53, 0.12);
  color: var(--text-main);
}

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
  .activity-card-header { flex-direction: column; }
  .activity-summary { grid-template-columns: 1fr; min-width: 100%; }
}
@media (max-width: 600px) {
  .metrics-grid { grid-template-columns: repeat(2, 1fr); }
  .node-meta { flex-direction: column; align-items: flex-start; gap: 4px; }
  .node-body { flex-direction: column; align-items: flex-start; gap: 6px; }
}

/* ── Stats Empty State ── */
.stats-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 80px 40px;
  text-align: center;
  min-height: 400px;
}
.stats-empty .empty-title {
  font-family: 'Noto Serif SC', serif;
  font-size: 1.4rem;
  font-weight: 700;
  color: var(--text-main);
  margin: 0 0 8px;
}
.stats-empty .empty-desc {
  color: var(--text-soft);
  font-size: 0.9rem;
  margin: 0 0 24px;
}

/* ── Bento Button ── */
.bento-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  border-radius: 999px;
  font-size: 0.85rem;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.2s ease;
  border: none;
}
.bento-btn.primary {
  background: var(--text-main);
  color: var(--bg-panel, #fff);
  box-shadow: 0 4px 12px rgba(0,0,0,0.1);
}
.bento-btn.primary:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(0,0,0,0.15);
}

/* ── Audit Entry / Activity Timeline ── */
.audit-entry {
  display: flex;
  gap: 20px;
}

.audit-entry__meta {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 6px;
}

.audit-entry__username {
  font-size: 0.75rem;
  font-weight: 700;
  color: var(--text-main);
  background: var(--glass-border-shadow, rgba(0,0,0,0.05));
  padding: 2px 8px;
  border-radius: 999px;
  display: flex;
  align-items: center;
  gap: 4px;
}

.audit-entry__time {
  font-size: 0.8rem;
  font-weight: 700;
  color: var(--accent-amber);
  font-family: monospace;
}

.audit-entry__action-tag {
  font-size: 0.7rem;
  padding: 1px 8px;
  border-radius: 10px;
  font-weight: 500;
  margin-left: auto;
}

.tag--info { background: rgba(59, 130, 246, 0.1); color: #3b82f6; }
.tag--success { background: rgba(39, 174, 96, 0.1); color: #27ae60; }
.tag--warning { background: rgba(217, 119, 6, 0.12); color: #b45309; }
.tag--danger { background: rgba(192, 57, 43, 0.1); color: #c0392b; }

.audit-entry__diff {
  margin-top: 8px;
  padding: 8px 12px;
  background: rgba(0, 0, 0, 0.02);
  border-radius: 8px;
  font-size: 0.85rem;
}

.diff-person {
  margin-bottom: 6px;
}

.diff-person__name {
  color: var(--accent-amber, #a96e35);
  display: block;
  margin-bottom: 2px;
}

.diff-field {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 1px 0;
  font-size: 0.82rem;
}

.diff-field__label {
  min-width: 42px;
  color: var(--text-soft, #8a6845);
  font-size: 0.75rem;
}

.diff-field__old {
  text-decoration: line-through;
  color: #c0392b;
  background: rgba(192, 57, 43, 0.06);
  padding: 0 6px;
  border-radius: 3px;
}

.diff-field__arrow {
  color: var(--text-soft, #8a6845);
  font-size: 0.75rem;
}

.diff-field__new {
  color: #27ae60;
  background: rgba(39, 174, 96, 0.06);
  padding: 0 6px;
  border-radius: 3px;
}

.audit-entry__detail {
  font-size: 0.8rem;
  font-weight: 500;
  color: var(--text-soft);
  margin: 4px 0 0;
}
</style>
