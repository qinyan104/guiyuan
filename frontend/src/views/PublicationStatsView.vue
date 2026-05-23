<script setup lang="ts">
import { computed, inject, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { getPublicationActivity, type ParsedActivity } from '../api/publication'
import { parseYear } from '../lib/dateUtils'
import {
  filterPublicationActivity,
  getPublicationActivityMeta,
  type ActivityCategory,
} from '../lib/publicationActivity'
import {
  PUBLICATION_CONTEXT_KEY,
  type FamilyUnit,
  type Person,
  type PublicationData,
} from '../types/family'

const props = defineProps<{ publicationId: number }>()

const router = useRouter()
const context = inject(PUBLICATION_CONTEXT_KEY)!
const pubData = computed<PublicationData>(() => context.pub.publication)

const activityLoading = ref(true)
const activities = ref<ParsedActivity[]>([])
const activeActivityFilter = ref<ActivityCategory>('all')

const activityFilters: Array<{ key: ActivityCategory; label: string }> = [
  { key: 'all', label: '全部' },
  { key: 'person', label: '人物变更' },
  { key: 'publication', label: '族谱信息' },
  { key: 'sharing', label: '分享协作' },
  { key: 'danger', label: '危险操作' },
]

const activityLabels: Record<string, string> = {
  CREATE_PUB: '创建族谱',
  UPDATE_PUB: '保存族谱',
  UPDATE_PUB_META: '修改族谱信息',
  UPDATE_PERSON: '编辑人物',
  DELETE_PUB: '删除族谱',
  CREATE_SHARE_LINK: '创建分享链接',
  REVOKE_SHARE_LINK: '撤销分享链接',
  UPDATE_ACCESS: '调整协作者权限',
  REMOVE_ACCESS: '移除协作者',
}

const compoundSurnames = [
  '欧阳',
  '太史',
  '端木',
  '上官',
  '司马',
  '东方',
  '独孤',
  '南宫',
  '万俟',
  '闻人',
  '夏侯',
  '诸葛',
  '尉迟',
  '公羊',
  '赫连',
  '澹台',
  '皇甫',
  '宗政',
  '濮阳',
  '公冶',
  '太叔',
  '申屠',
  '公孙',
  '慕容',
  '仲孙',
  '钟离',
  '长孙',
  '宇文',
  '司徒',
  '鲜于',
  '司空',
  '闾丘',
  '子车',
  '亓官',
  '司寇',
  '巫马',
  '公西',
  '颛孙',
  '壤驷',
  '公良',
  '漆雕',
  '乐正',
  '宰父',
  '谷梁',
  '拓跋',
  '夹谷',
  '轩辕',
  '令狐',
  '段干',
  '百里',
  '呼延',
  '东郭',
  '南门',
  '羊舌',
  '微生',
  '梁丘',
  '左丘',
  '东门',
  '西门',
  '第五',
]

async function loadActivities() {
  activityLoading.value = true
  try {
    const id = context.serverPublicationId.value || props.publicationId
    activities.value = await getPublicationActivity(id)
  } catch {
    activities.value = []
  } finally {
    activityLoading.value = false
  }
}

onMounted(loadActivities)

const people = computed<Person[]>(() => Object.values(pubData.value.people ?? {}))
const families = computed<Record<string, FamilyUnit>>(() => pubData.value.families ?? {})

const totalCount = computed(() => people.value.length)
const maleCount = computed(() => people.value.filter((person) => person.gender === 'male').length)
const femaleCount = computed(() => people.value.filter((person) => person.gender === 'female').length)
const deceasedCount = computed(() => people.value.filter((person) => person.deceased).length)
const aliveCount = computed(() => totalCount.value - deceasedCount.value)

const datedYears = computed(() =>
  people.value.flatMap((person) => {
    const years = [parseYear(person.birth), parseYear(person.death)].filter(
      (year): year is number => year !== null,
    )
    return years
  }),
)

const earliestYear = computed(() =>
  datedYears.value.length > 0 ? Math.min(...datedYears.value) : null,
)

const latestYear = computed(() =>
  datedYears.value.length > 0 ? Math.max(...datedYears.value) : null,
)

const timelineSpan = computed(() => {
  if (earliestYear.value === null || latestYear.value === null) return null
  return latestYear.value - earliestYear.value
})

const generationMap = computed(() => {
  const map = new Map<string, number>()
  const rootFamilyId = pubData.value.focusFamilyId
  if (!rootFamilyId || !families.value[rootFamilyId]) {
    for (const person of people.value) {
      map.set(person.id, 0)
    }
    return map
  }

  const queue: Array<{ personId: string; generation: number }> = []
  const rootFamily = families.value[rootFamilyId]

  for (const adultId of rootFamily.adults) {
    if (adultId && !map.has(adultId)) {
      map.set(adultId, 1)
      queue.push({ personId: adultId, generation: 1 })
    }
  }

  let head = 0
  const familyList = Object.values(families.value)

  while (head < queue.length) {
    const current = queue[head++]
    for (const family of familyList) {
      if (!family.adults.includes(current.personId)) continue

      for (const spouseId of family.adults) {
        if (spouseId && !map.has(spouseId)) {
          map.set(spouseId, current.generation)
          queue.push({ personId: spouseId, generation: current.generation })
        }
      }

      for (const childId of family.children) {
        if (childId && !map.has(childId)) {
          map.set(childId, current.generation + 1)
          queue.push({ personId: childId, generation: current.generation + 1 })
        }
      }
    }
  }

  for (const person of people.value) {
    if (!map.has(person.id)) {
      map.set(person.id, 0)
    }
  }

  return map
})

const generationCount = computed(() => {
  const knownGenerations = Array.from(generationMap.value.values()).filter((value) => value > 0)
  return knownGenerations.length > 0 ? Math.max(...knownGenerations) : 0
})

const generationDistribution = computed(() => {
  const distribution = new Map<number, number>()
  generationMap.value.forEach((generation) => {
    distribution.set(generation, (distribution.get(generation) || 0) + 1)
  })

  return Array.from(distribution.entries()).sort((a, b) => a[0] - b[0])
})

const maxGenerationCount = computed(() =>
  Math.max(1, ...generationDistribution.value.map(([, count]) => count)),
)

const malePercent = computed(() =>
  totalCount.value > 0 ? Math.round((maleCount.value / totalCount.value) * 100) : 0,
)

const femalePercent = computed(() =>
  totalCount.value > 0 ? 100 - malePercent.value : 0,
)

const surnameDistribution = computed(() => {
  const distribution = new Map<string, number>()

  for (const person of people.value) {
    if (!person.name) continue
    let surname = ''

    if (person.name.length >= 2) {
      const doubleSurname = person.name.slice(0, 2)
      if (compoundSurnames.includes(doubleSurname)) {
        surname = doubleSurname
      }
    }

    if (!surname) {
      surname = person.name.charAt(0)
    }

    if (surname) {
      distribution.set(surname, (distribution.get(surname) || 0) + 1)
    }
  }

  return Array.from(distribution.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
})

const maxSurnameCount = computed(() =>
  Math.max(1, ...surnameDistribution.value.map(([, count]) => count)),
)

const lifespans = computed(() => {
  return people.value
    .map((person) => {
      const birthYear = parseYear(person.birth)
      const deathYear = parseYear(person.death)
      if (birthYear === null || deathYear === null) return null
      const years = deathYear - birthYear
      if (years < 0 || years > 120) return null
      return {
        name: person.name,
        years,
      }
    })
    .filter((item): item is { name: string; years: number } => item !== null)
})

const averageLifespan = computed(() => {
  if (lifespans.value.length === 0) return null
  const totalYears = lifespans.value.reduce((sum, item) => sum + item.years, 0)
  return Math.round((totalYears / lifespans.value.length) * 10) / 10
})

const maxLifespan = computed(() => {
  if (lifespans.value.length === 0) return null
  return lifespans.value.reduce((longest, item) => (item.years > longest.years ? item : longest))
})

const lifespanBuckets = computed(() => {
  const buckets = new Map<string, number>()
  for (const item of lifespans.value) {
    const start = Math.floor(item.years / 10) * 10
    const label = `${start}-${start + 9} 岁`
    buckets.set(label, (buckets.get(label) || 0) + 1)
  }

  return Array.from(buckets.entries()).sort((a, b) => a[0].localeCompare(b[0]))
})

const maxLifespanBucketCount = computed(() =>
  Math.max(1, ...lifespanBuckets.value.map(([, count]) => count)),
)

const centuryDistribution = computed(() => {
  const births = new Map<number, number>()
  const deaths = new Map<number, number>()

  for (const person of people.value) {
    const birthYear = parseYear(person.birth)
    const deathYear = parseYear(person.death)

    if (birthYear !== null) {
      const century = Math.floor(birthYear / 100) * 100
      births.set(century, (births.get(century) || 0) + 1)
    }

    if (deathYear !== null) {
      const century = Math.floor(deathYear / 100) * 100
      deaths.set(century, (deaths.get(century) || 0) + 1)
    }
  }

  const centuries = Array.from(new Set([...births.keys(), ...deaths.keys()])).sort((a, b) => a - b)

  return centuries.map((startYear) => ({
    startYear,
    label: `${startYear}-${startYear + 99}`,
    births: births.get(startYear) || 0,
    deaths: deaths.get(startYear) || 0,
  }))
})

const maxCenturyCount = computed(() =>
  Math.max(
    1,
    ...centuryDistribution.value.map((item) => Math.max(item.births, item.deaths)),
  ),
)

const activitySummary = computed(() => {
  const latest = activities.value[0]
  const today = new Date().toISOString().slice(0, 10)
  const todayCount = activities.value.filter((item) => item.createdAt.slice(0, 10) === today).length

  return {
    totalCount: activities.value.length,
    todayCount,
    latestUsername: latest?.username || '暂无',
    latestActionLabel: latest ? actionLabel(latest.action) : '暂无记录',
  }
})

const activityFilterOptions = computed(() =>
  activityFilters.map((filter) => ({
    ...filter,
    count: filterPublicationActivity(activities.value, filter.key).length,
  })),
)

const filteredActivities = computed(() =>
  filterPublicationActivity(activities.value, activeActivityFilter.value),
)

const narrativeSummary = computed(() => {
  const segments: string[] = []

  segments.push(`共收录 ${totalCount.value} 位族人`)

  if (generationCount.value > 0) {
    segments.push(`当前可识别 ${generationCount.value} 代世系`)
  }

  if (timelineSpan.value !== null && earliestYear.value !== null && latestYear.value !== null) {
    segments.push(`时间线覆盖 ${earliestYear.value} 至 ${latestYear.value} 年`)
  }

  if (averageLifespan.value !== null) {
    segments.push(`可计算寿年样本平均 ${averageLifespan.value} 岁`)
  }

  return segments.join('，') + '。'
})

const topSurnameSummary = computed(() => {
  if (surnameDistribution.value.length === 0) return '待补充'
  const [surname, count] = surnameDistribution.value[0]
  return `${surname} 姓 ${count} 人`
})

const timelineRangeLabel = computed(() => {
  if (earliestYear.value === null || latestYear.value === null) return '待补充'
  return `${earliestYear.value}—${latestYear.value}`
})

function centuryLegendLabel(generation: number) {
  return generation === 0 ? '未归世系' : `第 ${generation} 代`
}

function actionLabel(action: string) {
  return activityLabels[action] ?? action ?? '其他操作'
}

function actionToneClass(action: string) {
  return `activity-tag--${getPublicationActivityMeta(action).tone}`
}

function formatRelativeTime(value: string) {
  const date = new Date(value)
  const diffMs = Date.now() - date.getTime()
  const diffMinutes = Math.floor(diffMs / 60000)

  if (diffMinutes < 1) return '刚刚'
  if (diffMinutes < 60) return `${diffMinutes} 分钟前`

  const diffHours = Math.floor(diffMinutes / 60)
  if (diffHours < 24) return `${diffHours} 小时前`

  const diffDays = Math.floor(diffHours / 24)
  if (diffDays < 30) return `${diffDays} 天前`

  return date.toLocaleDateString('zh-CN')
}

function goBack() {
  router.push({ name: 'workbench', params: { id: props.publicationId } })
}
</script>

<template>
  <div class="stats-view page-shell" data-testid="stats-view">
    <header class="insight-header">
      <button type="button" class="header-back" @click="goBack">
        返回画布
      </button>
      <div class="header-copy">
        <p class="header-eyebrow">Research Digest</p>
        <h1 data-testid="stats-title">家族纪略</h1>
        <p class="header-desc">围绕族谱结构、人口构成与修订动态的综合摘要。</p>
      </div>
    </header>

    <main class="stats-main">
      <section v-if="totalCount === 0" data-testid="stats-empty" class="empty-panel bento-card">
        <div class="empty-icon">纪</div>
        <h2>族谱资料还没有形成纪略</h2>
        <p>先在画布中录入人物与家庭关系，这里会自动生成统计与考据摘要。</p>
        <button type="button" class="primary-btn" @click="goBack">前往画布录入</button>
      </section>

      <template v-else>
        <section class="hero-panel bento-card">
          <div class="hero-copy">
            <p class="section-eyebrow">族谱总览</p>
            <h2>{{ pubData.title || '未命名族谱' }}</h2>
            <p class="hero-subtitle">{{ pubData.subtitle || '暂无副题' }}</p>
            <p class="hero-summary">{{ narrativeSummary }}</p>

            <div class="hero-tags">
              <span v-if="pubData.info?.ancestralOrigin" class="hero-tag">
                祖籍 · {{ pubData.info.ancestralOrigin }}
              </span>
              <span v-if="pubData.info?.hallName" class="hero-tag">
                堂号 · {{ pubData.info.hallName }}
              </span>
              <span v-if="pubData.info?.familyMotto" class="hero-tag">
                家训 · {{ pubData.info.familyMotto }}
              </span>
            </div>
          </div>

          <div class="hero-side">
            <div class="hero-note">
              <span>记录跨度</span>
              <strong>{{ timelineRangeLabel }}</strong>
            </div>
            <div class="hero-note">
              <span>有据寿年</span>
              <strong>{{ lifespans.length }} 人</strong>
            </div>
            <div class="hero-note">
              <span>最近修订</span>
              <strong>{{ activitySummary.latestUsername }} · {{ activitySummary.latestActionLabel }}</strong>
            </div>
            <div class="hero-note">
              <span>高频姓氏</span>
              <strong>{{ topSurnameSummary }}</strong>
            </div>
          </div>
        </section>

        <section class="metric-grid">
          <article data-testid="metric-total" class="metric-card bento-card">
            <span class="metric-label">总人数</span>
            <strong class="metric-value">{{ totalCount }}</strong>
            <p class="metric-desc">当前族谱已录入的全部人物。</p>
          </article>

          <article class="metric-card bento-card">
            <span class="metric-label">在世 / 已故</span>
            <strong class="metric-value">{{ aliveCount }} / {{ deceasedCount }}</strong>
            <p class="metric-desc">根据人物状态自动汇总。</p>
          </article>

          <article data-testid="metric-generations" class="metric-card bento-card">
            <span class="metric-label">世代层级</span>
            <strong class="metric-value">{{ generationCount || '待补充' }}</strong>
            <p class="metric-desc">以焦点家庭为起点推断当前世系。</p>
          </article>

          <article class="metric-card bento-card">
            <span class="metric-label">男女分布</span>
            <strong class="metric-value">{{ maleCount }} / {{ femaleCount }}</strong>
            <p class="metric-desc">按已录入性别信息统计。</p>
          </article>
        </section>

        <section class="analysis-grid">
          <article class="analysis-card bento-card">
            <div class="card-heading">
              <div>
                <p class="section-eyebrow">Structure</p>
                <h3>人口结构</h3>
              </div>
              <span class="card-chip">{{ malePercent }}% / {{ femalePercent }}%</span>
            </div>

            <div class="ratio-bar" aria-hidden="true">
              <div class="ratio-bar__male" :style="{ width: `${malePercent}%` }"></div>
              <div class="ratio-bar__female" :style="{ width: `${femalePercent}%` }"></div>
            </div>

            <div class="legend-row">
              <span>男性 {{ maleCount }}</span>
              <span>女性 {{ femaleCount }}</span>
            </div>
          </article>

          <article class="analysis-card bento-card">
            <div class="card-heading">
              <div>
                <p class="section-eyebrow">Generation</p>
                <h3>世代分布</h3>
              </div>
              <span class="card-chip">{{ generationCount || 0 }} 代</span>
            </div>

            <div v-if="generationDistribution.length === 0" class="empty-hint">暂无可识别世系。</div>
            <div v-else class="chart-list">
              <div
                v-for="[generation, count] in generationDistribution"
                :key="generation"
                class="chart-row"
              >
                <span class="chart-label">{{ centuryLegendLabel(generation) }}</span>
                <div class="chart-track">
                  <div
                    class="chart-fill chart-fill--generation"
                    :style="{ width: `${(count / maxGenerationCount) * 100}%` }"
                  ></div>
                </div>
                <span class="chart-value">{{ count }}</span>
              </div>
            </div>
          </article>

          <article class="analysis-card bento-card">
            <div class="card-heading">
              <div>
                <p class="section-eyebrow">Lifespan</p>
                <h3>寿年概览</h3>
              </div>
              <span class="card-chip">{{ averageLifespan ?? '—' }} 岁</span>
            </div>

            <div v-if="lifespans.length === 0" class="empty-hint">还没有足够的生卒数据来计算寿年。</div>
            <template v-else>
              <div class="summary-pair">
                <div>
                  <span>平均寿年</span>
                  <strong>{{ averageLifespan }} 岁</strong>
                </div>
                <div v-if="maxLifespan">
                  <span>最长寿者</span>
                  <strong>{{ maxLifespan.name }} · {{ maxLifespan.years }} 岁</strong>
                </div>
              </div>

              <div class="chart-list compact">
                <div
                  v-for="[bucket, count] in lifespanBuckets"
                  :key="bucket"
                  class="chart-row"
                >
                  <span class="chart-label">{{ bucket }}</span>
                  <div class="chart-track">
                    <div
                      class="chart-fill chart-fill--lifespan"
                      :style="{ width: `${(count / maxLifespanBucketCount) * 100}%` }"
                    ></div>
                  </div>
                  <span class="chart-value">{{ count }}</span>
                </div>
              </div>
            </template>
          </article>

          <article class="analysis-card bento-card">
            <div class="card-heading">
              <div>
                <p class="section-eyebrow">Chronology</p>
                <h3>生卒世纪</h3>
              </div>
              <span class="card-chip">{{ timelineRangeLabel }}</span>
            </div>

            <div v-if="centuryDistribution.length === 0" class="empty-hint">暂无可用于分段的年代信息。</div>
            <div v-else class="chart-list dual">
              <div
                v-for="century in centuryDistribution"
                :key="century.startYear"
                class="dual-row"
              >
                <span class="chart-label">{{ century.label }}</span>
                <div class="dual-track">
                  <div
                    class="dual-bar dual-bar--birth"
                    :style="{ width: `${(century.births / maxCenturyCount) * 100}%` }"
                  >
                    <span v-if="century.births">{{ century.births }}</span>
                  </div>
                  <div
                    class="dual-bar dual-bar--death"
                    :style="{ width: `${(century.deaths / maxCenturyCount) * 100}%` }"
                  >
                    <span v-if="century.deaths">{{ century.deaths }}</span>
                  </div>
                </div>
              </div>

              <div class="legend-row">
                <span>出生记录</span>
                <span>去世记录</span>
              </div>
            </div>
          </article>

          <article class="analysis-card analysis-card--wide bento-card">
            <div class="card-heading">
              <div>
                <p class="section-eyebrow">Surname</p>
                <h3>姓氏分布</h3>
              </div>
              <span class="card-chip">Top 10</span>
            </div>

            <div v-if="surnameDistribution.length === 0" class="empty-hint">暂无可用于统计的姓名信息。</div>
            <div v-else class="chart-list">
              <div
                v-for="[surname, count] in surnameDistribution"
                :key="surname"
                class="chart-row"
              >
                <span class="chart-label">{{ surname }}</span>
                <div class="chart-track">
                  <div
                    class="chart-fill chart-fill--surname"
                    :style="{ width: `${(count / maxSurnameCount) * 100}%` }"
                  ></div>
                </div>
                <span class="chart-value">{{ count }}</span>
              </div>
            </div>
          </article>

          <article class="analysis-card analysis-card--wide bento-card">
            <div class="card-heading card-heading--activity">
              <div>
                <p class="section-eyebrow">Activity</p>
                <h3>族谱修订</h3>
              </div>

              <div v-if="!activityLoading && activities.length > 0" class="activity-summary">
                <div class="activity-summary__item">
                  <span>最近编辑</span>
                  <strong>{{ activitySummary.latestUsername }}</strong>
                </div>
                <div class="activity-summary__item">
                  <span>最近动作</span>
                  <strong>{{ activitySummary.latestActionLabel }}</strong>
                </div>
                <div class="activity-summary__item">
                  <span>今日 / 全部</span>
                  <strong>{{ activitySummary.todayCount }} / {{ activitySummary.totalCount }}</strong>
                </div>
              </div>
            </div>

            <div v-if="activityLoading" class="empty-hint">正在读取修订记录…</div>
            <div v-else-if="activities.length === 0" class="empty-hint">暂时还没有修订记录。</div>
            <div v-else class="activity-panel">
              <div class="activity-filters" role="tablist" aria-label="修订筛选">
                <button
                  v-for="filter in activityFilterOptions"
                  :key="filter.key"
                  :data-testid="filter.key === 'sharing' ? 'activity-filter-sharing' : undefined"
                  type="button"
                  class="activity-filter"
                  :class="{ 'activity-filter--active': activeActivityFilter === filter.key }"
                  @click="activeActivityFilter = filter.key"
                >
                  <span>{{ filter.label }}</span>
                  <small>{{ filter.count }}</small>
                </button>
              </div>

              <div v-if="filteredActivities.length === 0" class="empty-hint">
                当前筛选下没有修订记录。
              </div>

              <article
                v-for="entry in filteredActivities"
                :key="entry.id"
                class="activity-entry"
              >
                <div class="activity-rail">
                  <span class="activity-dot"></span>
                </div>

                <div class="activity-card">
                  <div class="activity-card__meta">
                    <strong>{{ entry.username }}</strong>
                    <time :datetime="entry.createdAt">{{ formatRelativeTime(entry.createdAt) }}</time>
                    <span class="activity-tag" :class="actionToneClass(entry.action)">
                      {{ actionLabel(entry.action) }}
                    </span>
                  </div>

                  <div v-if="entry.parsedDetail" class="activity-diff">
                    <div
                      v-for="person in entry.parsedDetail"
                      :key="person.personId"
                      class="activity-diff__person"
                    >
                      <strong>{{ person.personName }}</strong>
                      <div
                        v-for="change in person.changes"
                        :key="change.field"
                        class="activity-diff__field"
                      >
                        <span class="activity-diff__label">{{ change.fieldLabel }}</span>
                        <span class="activity-diff__old">{{ change.old || '空' }}</span>
                        <span class="activity-diff__arrow">→</span>
                        <span class="activity-diff__new">{{ change.new || '空' }}</span>
                      </div>
                    </div>
                  </div>

                  <p v-else class="activity-detail">{{ entry.detail }}</p>
                </div>
              </article>
            </div>
          </article>
        </section>
      </template>
    </main>
  </div>
</template>

<style scoped>
.stats-view {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.page-shell {
  box-sizing: border-box;
  width: 100%;
  max-width: 1240px;
  margin: 0 auto;
  padding: 0 clamp(20px, 3.6vw, 44px) 40px;
}

.insight-header {
  display: flex;
  align-items: flex-start;
  gap: 18px;
}

.header-back,
.primary-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 40px;
  padding: 0 16px;
  border-radius: 999px;
  font-size: 0.88rem;
  font-weight: 500;
  transition:
    transform 160ms ease,
    box-shadow 160ms ease,
    background 160ms ease,
    border-color 160ms ease;
}

.header-back {
  border: 1px solid var(--color-neutral-5);
  background: var(--color-neutral-2);
  color: var(--color-neutral-9);
  box-shadow: 0 12px 24px color-mix(in srgb, var(--color-neutral-9) 6%, transparent);
}

.header-back:hover,
.primary-btn:hover {
  transform: translateY(-1px);
}

.header-copy {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.header-copy h1,
.hero-copy h2,
.empty-panel h2,
.card-heading h3 {
  margin: 0;
  color: var(--color-neutral-9);
  font-family: 'Noto Serif SC', 'Songti SC', serif;
}

.header-copy h1 {
  font-size: 2rem;
  font-weight: 500;
  letter-spacing: 0.06em;
}

.header-eyebrow,
.section-eyebrow {
  margin: 0;
  color: var(--color-neutral-6);
  font-size: 0.72rem;
  font-weight: 800;
  letter-spacing: 0.2em;
  text-transform: uppercase;
}

.header-desc,
.hero-subtitle,
.hero-summary,
.metric-desc,
.empty-panel p,
.chart-label,
.chart-value,
.legend-row,
.activity-detail {
  color: var(--color-neutral-7);
}

.header-desc {
  margin: 0;
  font-size: 0.95rem;
  line-height: 1.7;
}

.stats-main {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.empty-panel,
.hero-panel,
.metric-card,
.analysis-card {
  border-radius: 28px;
  padding: 24px;
}

.empty-panel {
  display: grid;
  justify-items: center;
  gap: 12px;
  text-align: center;
  padding: 64px 32px;
}

.empty-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 72px;
  height: 72px;
  border-radius: 22px;
  background: color-mix(in srgb, var(--color-accent) 10%, var(--color-neutral-1));
  color: var(--color-accent);
  font-family: 'Noto Serif SC', 'Songti SC', serif;
  font-size: 1.8rem;
  font-weight: 500;
}

.primary-btn {
  border: 1px solid transparent;
  background: var(--color-accent);
  color: var(--btn-primary-color);
  box-shadow: 0 18px 30px color-mix(in srgb, var(--color-accent) 18%, transparent);
}

.hero-panel {
  display: grid;
  grid-template-columns: minmax(0, 1.5fr) minmax(280px, 1fr);
  gap: 20px;
}

.hero-copy {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.hero-copy h2 {
  font-size: 2rem;
  line-height: 1.1;
}

.hero-subtitle {
  margin: 0;
  font-size: 1rem;
}

.hero-summary {
  margin: 0;
  line-height: 1.8;
  font-size: 0.95rem;
}

.hero-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.hero-tag,
.card-chip {
  display: inline-flex;
  align-items: center;
  min-height: 32px;
  padding: 0 12px;
  border-radius: 999px;
  border: 1px solid color-mix(in srgb, var(--color-accent) 18%, transparent);
  background: color-mix(in srgb, var(--color-accent) 10%, var(--color-neutral-1));
  color: var(--color-neutral-9);
  font-size: 0.78rem;
  font-weight: 500;
}

.hero-side {
  display: grid;
  gap: 12px;
}

.hero-note,
.activity-summary__item {
  display: grid;
  gap: 6px;
  padding: 16px 18px;
  border-radius: 20px;
  border: 1px solid var(--color-neutral-4);
  background: color-mix(in srgb, var(--color-neutral-1) 88%, transparent);
}

.hero-note span,
.activity-summary__item span,
.summary-pair span {
  color: var(--color-neutral-6);
  font-size: 0.78rem;
  font-weight: 500;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.hero-note strong,
.activity-summary__item strong,
.summary-pair strong,
.metric-value {
  color: var(--color-neutral-9);
}

.hero-note strong {
  font-size: 1rem;
  line-height: 1.5;
}

.metric-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 16px;
}

.metric-card {
  display: grid;
  gap: 10px;
}

.metric-label {
  color: var(--color-neutral-6);
  font-size: 0.78rem;
  font-weight: 800;
  letter-spacing: 0.16em;
  text-transform: uppercase;
}

.metric-value {
  font-family: 'Noto Serif SC', 'Songti SC', serif;
  font-size: 2rem;
  font-weight: 500;
  line-height: 1;
}

.metric-desc {
  margin: 0;
  font-size: 0.9rem;
  line-height: 1.7;
}

.analysis-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
}

.analysis-card {
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.analysis-card--wide {
  grid-column: 1 / -1;
}

.card-heading {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 16px;
}

.card-heading h3 {
  font-size: 1.3rem;
  line-height: 1.2;
}

.ratio-bar {
  display: flex;
  width: 100%;
  height: 16px;
  overflow: hidden;
  border-radius: 999px;
  background: color-mix(in srgb, var(--color-neutral-9) 6%, transparent);
}

.ratio-bar__male,
.ratio-bar__female,
.chart-fill,
.dual-bar {
  height: 100%;
  border-radius: inherit;
}

.ratio-bar__male {
  background: var(--color-info);
}

.ratio-bar__female {
  background: var(--color-neutral-7);
}

.legend-row {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  font-size: 0.86rem;
  font-weight: 500;
}

.chart-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.chart-row,
.dual-row {
  display: grid;
  align-items: center;
  gap: 12px;
}

.chart-row {
  grid-template-columns: minmax(96px, 132px) minmax(0, 1fr) auto;
}

.dual-row {
  grid-template-columns: minmax(96px, 132px) minmax(0, 1fr);
}

.chart-label,
.chart-value {
  font-size: 0.88rem;
  line-height: 1.5;
}

.chart-track,
.dual-track {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.chart-track {
  justify-content: center;
  height: 12px;
  overflow: hidden;
  border-radius: 999px;
  background: color-mix(in srgb, var(--color-neutral-9) 6%, transparent);
}

.chart-fill {
  background: var(--color-warning);
}

.chart-fill--generation {
  background: var(--color-neutral-7);
}

.chart-fill--lifespan {
  background: var(--color-info);
}

.chart-fill--surname {
  background: var(--color-success);
}

.summary-pair {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.summary-pair > div {
  display: grid;
  gap: 6px;
  padding: 16px 18px;
  border-radius: 20px;
  border: 1px solid var(--color-neutral-4);
  background: color-mix(in srgb, var(--color-neutral-1) 88%, transparent);
}

.dual-track {
  gap: 8px;
}

.dual-bar {
  display: inline-flex;
  align-items: center;
  justify-content: flex-end;
  min-width: 0;
  padding-right: 8px;
  color: var(--btn-primary-color);
  font-size: 0.76rem;
  font-weight: 500;
}

.dual-bar--birth {
  background: var(--color-warning);
}

.dual-bar--death {
  background: var(--color-neutral-7);
}

.empty-hint {
  padding: 20px;
  border-radius: 20px;
  border: 1px dashed var(--color-neutral-4);
  background: color-mix(in srgb, var(--color-neutral-1) 82%, transparent);
  color: var(--color-neutral-6);
  font-size: 0.92rem;
  line-height: 1.7;
  text-align: center;
}

.card-heading--activity {
  align-items: stretch;
}

.activity-summary {
  display: grid;
  grid-template-columns: repeat(3, minmax(132px, 1fr));
  gap: 10px;
  min-width: min(520px, 100%);
}

.activity-panel {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.activity-filters {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.activity-filter {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-height: 36px;
  padding: 0 12px;
  border-radius: 999px;
  border: 1px solid var(--color-neutral-4);
  background: color-mix(in srgb, var(--color-neutral-1) 88%, transparent);
  color: var(--color-neutral-7);
  font-size: 0.82rem;
  font-weight: 500;
}

.activity-filter small {
  color: var(--color-accent);
  font-size: 0.76rem;
}

.activity-filter--active,
.activity-filter:hover {
  border-color: color-mix(in srgb, var(--color-accent) 42%, transparent);
  background: color-mix(in srgb, var(--color-accent) 10%, var(--color-neutral-1));
  color: var(--color-neutral-9);
}

.activity-entry {
  display: grid;
  grid-template-columns: 18px minmax(0, 1fr);
  gap: 14px;
}

.activity-rail {
  position: relative;
}

.activity-rail::before {
  content: '';
  position: absolute;
  top: 10px;
  bottom: -18px;
  left: 8px;
  width: 1px;
  background: color-mix(in srgb, var(--color-neutral-9) 12%, transparent);
}

.activity-entry:last-child .activity-rail::before {
  bottom: 10px;
}

.activity-dot {
  position: absolute;
  top: 10px;
  left: 2px;
  width: 12px;
  height: 12px;
  border-radius: 999px;
  border: 2px solid var(--color-accent);
  background: var(--color-neutral-1);
  box-shadow: 0 0 0 4px color-mix(in srgb, var(--color-accent) 12%, transparent);
}

.activity-card {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding-bottom: 16px;
}

.activity-card__meta {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.activity-card__meta strong {
  display: inline-flex;
  align-items: center;
  min-height: 28px;
  padding: 0 10px;
  border-radius: 999px;
  background: color-mix(in srgb, var(--color-neutral-9) 6%, transparent);
  color: var(--color-neutral-9);
  font-size: 0.8rem;
  font-weight: 800;
}

.activity-card__meta time {
  color: var(--color-accent);
  font-family: ui-monospace, 'SFMono-Regular', 'Cascadia Code', monospace;
  font-size: 0.8rem;
  font-weight: 500;
}

.activity-tag {
  display: inline-flex;
  align-items: center;
  min-height: 28px;
  margin-left: auto;
  padding: 0 10px;
  border-radius: 999px;
  font-size: 0.76rem;
  font-weight: 800;
}

.activity-tag--info {
  background: color-mix(in srgb, var(--color-neutral-9) 8%, transparent);
  color: var(--color-neutral-9);
}

.activity-tag--success {
  background: color-mix(in srgb, var(--color-success) 14%, transparent);
  color: var(--color-success);
}

.activity-tag--warning {
  background: color-mix(in srgb, var(--color-warning) 14%, transparent);
  color: var(--color-warning);
}

.activity-tag--danger {
  background: var(--danger-bg);
  color: var(--color-error);
}

.activity-diff,
.activity-detail {
  margin: 0;
  padding: 14px 16px;
  border-radius: 18px;
  border: 1px solid var(--color-neutral-4);
  background: color-mix(in srgb, var(--color-neutral-1) 82%, transparent);
}

.activity-diff {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.activity-diff__person {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.activity-diff__person strong {
  color: var(--color-neutral-9);
  font-size: 0.96rem;
}

.activity-diff__field {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  font-size: 0.86rem;
}

.activity-diff__label {
  color: var(--color-neutral-6);
  font-weight: 500;
}

.activity-diff__old,
.activity-diff__new {
  display: inline-flex;
  align-items: center;
  min-height: 26px;
  padding: 0 8px;
  border-radius: 999px;
}

.activity-diff__old {
  color: var(--color-error);
  background: color-mix(in srgb, var(--color-error) 10%, transparent);
  text-decoration: line-through;
}

.activity-diff__new {
  color: var(--color-success);
  background: color-mix(in srgb, var(--color-success) 12%, transparent);
}

.activity-diff__arrow {
  color: var(--color-neutral-6);
}

.activity-detail {
  font-size: 0.92rem;
  line-height: 1.7;
}

@media (max-width: 1180px) {
  .hero-panel,
  .analysis-grid {
    grid-template-columns: 1fr;
  }

  .metric-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .activity-summary {
    grid-template-columns: 1fr;
    min-width: 0;
  }
}

@media (max-width: 760px) {
  .page-shell {
    padding-inline: 18px;
    padding-bottom: 28px;
  }

  .insight-header {
    flex-direction: column;
  }

  .metric-grid,
  .summary-pair {
    grid-template-columns: 1fr;
  }

  .chart-row,
  .dual-row {
    grid-template-columns: 1fr;
  }

  .legend-row {
    flex-direction: column;
    align-items: flex-start;
  }

  .activity-entry {
    grid-template-columns: 12px minmax(0, 1fr);
  }

  .activity-tag {
    margin-left: 0;
  }
}
</style>

