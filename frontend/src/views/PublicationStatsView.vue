<script setup lang="ts">
import { computed, inject, ref } from 'vue'
import { useRouter } from 'vue-router'
import { parseYear } from '../lib/dateUtils'
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

const people = computed<Person[]>(() => Object.values(pubData.value.people ?? {}))
const families = computed<Record<string, FamilyUnit>>(() => pubData.value.families ?? {})

// ── 核心人口计数 ──
const totalCount = computed(() => people.value.length)
const maleCount = computed(() => people.value.filter((p) => p.gender === 'male').length)
const femaleCount = computed(() => people.value.filter((p) => p.gender === 'female').length)
const deceasedCount = computed(() => people.value.filter((p) => p.deceased).length)
const aliveCount = computed(() => totalCount.value - deceasedCount.value)
const malePercent = computed(() => totalCount.value > 0 ? Math.round((maleCount.value / totalCount.value) * 100) : 0)
const femalePercent = computed(() => totalCount.value > 0 ? 100 - malePercent.value : 0)

// ── 世代计算 ──
const generationMap = computed(() => {
  const map = new Map<string, number>()
  const rootId = pubData.value.focusFamilyId
  const rootFamily = rootId ? families.value[rootId] : Object.values(families.value)[0]
  if (!rootFamily) return map

  const queue: Array<{ personId: string; generation: number }> = []
  for (const adultId of rootFamily.adults) {
    if (adultId && !map.has(adultId)) {
      map.set(adultId, 1)
      queue.push({ personId: adultId, generation: 1 })
    }
  }

  let head = 0
  const famList = Object.values(families.value)
  while (head < queue.length) {
    const cur = queue[head++]
    for (const fam of famList) {
      if (!fam.adults.includes(cur.personId)) continue
      for (const sid of fam.adults) {
        if (sid && !map.has(sid)) { map.set(sid, cur.generation); queue.push({ personId: sid, generation: cur.generation }) }
      }
      for (const cid of fam.children) {
        if (cid && !map.has(cid)) { map.set(cid, cur.generation + 1); queue.push({ personId: cid, generation: cur.generation + 1 }) }
      }
    }
  }
  return map
})

const generationCount = computed(() => {
  const known = Array.from(generationMap.value.values()).filter((v) => v > 0)
  return known.length > 0 ? Math.max(...known) : 0
})

interface GenStat {
  generation: number
  count: number
  male: number
  female: number
}

const generationDistribution = computed(() => {
  const map = new Map<number, GenStat>()
  people.value.forEach((p) => {
    const g = generationMap.value.get(p.id) || 0
    if (!map.has(g)) map.set(g, { generation: g, count: 0, male: 0, female: 0 })
    const entry = map.get(g)!
    entry.count++
    if (p.gender === 'male') entry.male++
    else if (p.gender === 'female') entry.female++
  })
  return Array.from(map.entries())
    .sort((a, b) => a[0] - b[0])
    .map(([g, stat]) => [g, stat.count] as [number, number])
})

const generationDetails = computed<GenStat[]>(() => {
  const map = new Map<number, GenStat>()
  people.value.forEach((p) => {
    const g = generationMap.value.get(p.id) || 0
    if (!map.has(g)) map.set(g, { generation: g, count: 0, male: 0, female: 0 })
    const entry = map.get(g)!
    entry.count++
    if (p.gender === 'male') entry.male++
    else if (p.gender === 'female') entry.female++
  })
  return Array.from(map.values()).sort((a, b) => a.generation - b.generation)
})

const maxGenCount = computed(() => Math.max(1, ...generationDistribution.value.map(([, c]) => c)))
const peakGeneration = computed(() => {
  if (generationDistribution.value.length === 0) return null
  let max = generationDistribution.value[0]
  for (const item of generationDistribution.value) {
    if (item[0] > 0 && item[1] > max[1]) max = item
  }
  return max[0] > 0 ? max : null
})

// ── 寿年统计 ──
const lifespans = computed(() =>
  people.value
    .map((p) => {
      const b = parseYear(p.birth), d = parseYear(p.death)
      if (b === null || d === null) return null
      const y = d - b
      if (y < 0 || y > 120) return null
      return { id: p.id, name: p.name, years: y, birth: b, death: d }
    })
    .filter((x): x is { id: string; name: string; years: number; birth: number; death: number } => x !== null),
)

const avgLifespan = computed(() => {
  if (lifespans.value.length === 0) return null
  return Math.round((lifespans.value.reduce((s, x) => s + x.years, 0) / lifespans.value.length) * 10) / 10
})

const oldestPerson = computed(() => {
  if (lifespans.value.length === 0) return null
  return [...lifespans.value].sort((a, b) => b.years - a.years)[0]
})

const lifespanBuckets = computed(() => {
  const buckets = new Map<string, number>()
  const labels = ['30岁以下', '30-49岁', '50-69岁', '70-79岁', '80-89岁', '90岁以上']
  labels.forEach(l => buckets.set(l, 0))

  for (const item of lifespans.value) {
    const y = item.years
    if (y < 30) buckets.set('30岁以下', (buckets.get('30岁以下') || 0) + 1)
    else if (y < 50) buckets.set('30-49岁', (buckets.get('30-49岁') || 0) + 1)
    else if (y < 70) buckets.set('50-69岁', (buckets.get('50-69岁') || 0) + 1)
    else if (y < 80) buckets.set('70-79岁', (buckets.get('70-79岁') || 0) + 1)
    else if (y < 90) buckets.set('80-89岁', (buckets.get('80-89岁') || 0) + 1)
    else buckets.set('90岁以上', (buckets.get('90岁以上') || 0) + 1)
  }
  return Array.from(buckets.entries())
})
const maxBucket = computed(() => Math.max(1, ...lifespanBuckets.value.map(([, c]) => c)))

// ── 时间跨度 ──
const datedYears = computed(() =>
  people.value.flatMap((p) => {
    const b = parseYear(p.birth), d = parseYear(p.death)
    return [b, d].filter((y): y is number => y !== null)
  }),
)
const earliestYear = computed(() => datedYears.value.length > 0 ? Math.min(...datedYears.value) : null)
const latestYear = computed(() => datedYears.value.length > 0 ? Math.max(...datedYears.value) : null)
const timelineSpan = computed(() => earliestYear.value && latestYear.value ? latestYear.value - earliestYear.value : null)

// ── 姓氏与姻亲 ──
const compoundSurnames = ['欧阳','太史','端木','上官','司马','东方','独孤','南宫','万俟','闻人','夏侯','诸葛','尉迟','公羊','赫连','澹台','皇甫','宗政','濮阳','公冶','太叔','申屠','公孙','慕容','仲孙','钟离','长孙','宇文','司徒','鲜于','司空','闾丘','子车','亓官','司寇','巫马','公西','颛孙','壤驷','公良','漆雕','乐正','宰父','谷梁','拓跋','夹谷','轩辕','令狐','段干','百里','呼延','东郭','南门','羊舌','微生','梁丘','左丘','东门','西门','第五']
function getSurname(name: string): string {
  if (!name) return ''
  if (name.length >= 2 && compoundSurnames.includes(name.slice(0, 2))) return name.slice(0, 2)
  return name.charAt(0)
}

const surnameDist = computed(() => {
  const dist = new Map<string, number>()
  for (const p of people.value) {
    const s = getSurname(p.name)
    if (s) dist.set(s, (dist.get(s) || 0) + 1)
  }
  return Array.from(dist.entries()).sort((a, b) => b[1] - a[1]).slice(0, 8)
})
const maxSurname = computed(() => Math.max(1, ...surnameDist.value.map(([, c]) => c)))

// ── 昭穆字派高频字洞察 ──
const nameCharDist = computed(() => {
  const dist = new Map<string, number>()
  const ignoreWords = new Set(['氏', '公', '公讳', '孺人', '老', '大', '小', '一', '二', '三', '四', '五', '六', '七', '八', '九', '十'])
  for (const p of people.value) {
    if (!p.name) continue
    const surname = getSurname(p.name)
    const givenName = p.name.slice(surname.length)
    for (const char of givenName) {
      if (char.trim() && !ignoreWords.has(char)) {
        dist.set(char, (dist.get(char) || 0) + 1)
      }
    }
  }
  return Array.from(dist.entries()).sort((a, b) => b[1] - a[1]).slice(0, 12)
})

// ── 叙述 ──
const narrative = computed(() => {
  const parts: string[] = []
  parts.push(`共 ${totalCount.value} 人`)
  if (generationCount.value > 0) parts.push(`${generationCount.value} 代`)
  if (earliestYear.value && latestYear.value) parts.push(`自 ${earliestYear.value} 年 至 ${latestYear.value} 年`)
  return parts.join('，')
})

function goPerson(id: string) {
  router.push({ name: 'workbench', params: { id: props.publicationId }, query: { personId: id } })
}

function goBack() {
  router.push({ name: 'workbench', params: { id: props.publicationId } })
}
</script>

<template>
  <div class="chronicle-root" data-testid="stats-view">
    <!-- Top Action -->
    <div class="top-bar">
      <button class="back-btn" @click="goBack">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
          <line x1="19" y1="12" x2="5" y2="12" />
          <polyline points="12 19 5 12 12 5" />
        </svg>
        返回画布
      </button>
    </div>

    <!-- Hero Section -->
    <header class="hero">
      <div class="hero-left">
        <div class="hero-seal">源</div>
      </div>
      <div class="hero-center">
        <div class="hero-eyebrow">宗族洞察数据全景</div>
        <h1>{{ pubData.title || '未命名族谱' }}</h1>
        <p class="hero-narrative">{{ narrative }}。</p>
        <p v-if="pubData.subtitle" class="hero-sub">{{ pubData.subtitle }}</p>
      </div>

      <!-- Clan Seal Badge (堂号与郡望) -->
      <div v-if="pubData.info?.hallName || pubData.info?.ancestralOrigin" class="clan-hall-card">
        <span v-if="pubData.info?.ancestralOrigin" class="hall-origin">{{ pubData.info.ancestralOrigin }}郡</span>
        <strong v-if="pubData.info?.hallName" class="hall-name">{{ pubData.info.hallName }}</strong>
        <span v-if="pubData.info?.familyMotto" class="hall-motto">“{{ pubData.info.familyMotto }}”</span>
      </div>
    </header>

    <!-- 核心指标条 (Metric Strip) -->
    <section class="metric-strip">
      <div class="metric-item">
        <span class="metric-num">{{ totalCount }}</span>
        <span class="metric-label">谱载族人</span>
      </div>
      <div class="metric-item">
        <span class="metric-num">{{ generationCount || '—' }}</span>
        <span class="metric-label">传承世代</span>
      </div>
      <div class="metric-item">
        <span class="metric-num">{{ aliveCount }} / {{ deceasedCount }}</span>
        <span class="metric-label">在世 / 归真</span>
      </div>
      <div class="metric-item">
        <span class="metric-num">{{ malePercent }}<small>%</small></span>
        <span class="metric-label">男丁比例 ({{ maleCount }}人)</span>
      </div>
      <div class="metric-item" v-if="timelineSpan !== null">
        <span class="metric-num">{{ timelineSpan }}<small> 年</small></span>
        <span class="metric-label">历代跨度</span>
      </div>
      <div class="metric-item" v-if="avgLifespan !== null">
        <span class="metric-num">{{ avgLifespan }}<small> 岁</small></span>
        <span class="metric-label">族人平均寿数</span>
      </div>
    </section>

    <!-- 世代繁衍分布 (Generation Progression) -->
    <section class="panel">
      <div class="panel-head">
        <div class="panel-title-group">
          <div class="panel-icon">代</div>
          <div>
            <h2>世代繁衍金字塔</h2>
            <p class="panel-subtitle">历代人口阶梯繁衍，开枝散叶传承脉络</p>
          </div>
        </div>
        <div class="head-badges">
          <span v-if="peakGeneration" class="peak-badge">
            繁衍鼎盛：第 {{ peakGeneration[0] }} 代 ({{ peakGeneration[1] }}人)
          </span>
          <span class="panel-chip">{{ generationCount }} 代共承</span>
        </div>
      </div>

      <div v-if="generationDistribution.length === 0" class="empty">暂无世代数据</div>
      <div v-else class="gen-pyramid">
        <div
          v-for="stat in generationDetails"
          :key="stat.generation"
          class="gen-row"
        >
          <div class="gen-name">
            <strong>{{ stat.generation === 0 ? '未归世' : `第 ${stat.generation} 世` }}</strong>
            <small>{{ stat.male }} 男 · {{ stat.female }} 女</small>
          </div>

          <div class="gen-bar-wrap">
            <div class="gen-bar-track">
              <div
                class="gen-bar-fill"
                :style="{ width: `${(stat.count / maxGenCount) * 100}%` }"
              >
                <span v-if="(stat.count / maxGenCount) > 0.15" class="gen-bar-inner-text">
                  {{ stat.count }} 人
                </span>
              </div>
            </div>
          </div>

          <span class="gen-val">{{ stat.count }} 人</span>
        </div>
      </div>
    </section>

    <!-- 寿数与昭穆字派 双栏 -->
    <section class="dual-panel">
      <!-- 寿年分布 -->
      <div class="panel">
        <div class="panel-head">
          <div class="panel-title-group">
            <div class="panel-icon">寿</div>
            <div>
              <h2>寿数考录</h2>
              <p class="panel-subtitle">有生卒年记载之先祖享寿分布</p>
            </div>
          </div>
          <span class="panel-chip" v-if="avgLifespan !== null">均寿 {{ avgLifespan }} 岁</span>
        </div>

        <div v-if="lifespans.length === 0" class="empty">补充生卒年数据后将在此展现寿数分布</div>
        <div v-else class="lifespan-body">
          <div v-if="oldestPerson" class="longevity-badge" @click="goPerson(oldestPerson.id)">
            <span class="longevity-tag">最高寿先祖</span>
            <strong class="longevity-name">{{ oldestPerson.name }}</strong>
            <span class="longevity-years">享寿 {{ oldestPerson.years }} 岁</span>
            <small class="longevity-era">({{ oldestPerson.birth }}—{{ oldestPerson.death }})</small>
          </div>

          <div class="bar-list">
            <div v-for="[b, c] in lifespanBuckets" :key="b" class="bar-row">
              <span class="bar-label">{{ b }}</span>
              <div class="bar-track">
                <div class="bar-fill bar-fill--warm" :style="{ width: `${(c / maxBucket) * 100}%` }"></div>
              </div>
              <span class="bar-val">{{ c }} 人</span>
            </div>
          </div>
        </div>
      </div>

      <!-- 昭穆字派与用字洞察 -->
      <div class="panel">
        <div class="panel-head">
          <div class="panel-title-group">
            <div class="panel-icon">派</div>
            <div>
              <h2>昭穆字派高频字</h2>
              <p class="panel-subtitle">名讳字辈传承用字洞察</p>
            </div>
          </div>
          <span class="panel-chip">字辈前列</span>
        </div>

        <div v-if="nameCharDist.length === 0" class="empty">暂无足够名讳数据</div>
        <div v-else class="word-grid">
          <div
            v-for="[char, count] in nameCharDist"
            :key="char"
            class="word-seal"
          >
            <span class="word-char">{{ char }}</span>
            <span class="word-count">{{ count }} 人</span>
          </div>
        </div>
      </div>
    </section>

    <!-- 姓氏与主要姻亲 -->
    <section class="panel">
      <div class="panel-head">
        <div class="panel-title-group">
          <div class="panel-icon">宗</div>
          <div>
            <h2>姓氏与通婚氏族</h2>
            <p class="panel-subtitle">本宗宗支与主要配偶氏族源流</p>
          </div>
        </div>
        <span class="panel-chip">Top {{ surnameDist.length }}</span>
      </div>

      <div v-if="surnameDist.length === 0" class="empty">暂无姓氏数据</div>
      <div v-else class="surname-grid">
        <div
          v-for="([s, c], idx) in surnameDist"
          :key="s"
          class="surname-card"
        >
          <div class="surname-seal" :class="{ 'surname-seal--main': idx === 0 }">{{ s }}</div>
          <div class="surname-info">
            <strong class="surname-name">{{ s }}氏</strong>
            <span class="surname-count">{{ c }} 位族人 / 配偶</span>
          </div>
          <div class="surname-bar-mini">
            <div class="surname-bar-fill" :style="{ width: `${(c / maxSurname) * 100}%` }"></div>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>

<style scoped>
.chronicle-root {
  max-width: 920px;
  margin: 0 auto;
  padding: 48px clamp(16px, 3.5vw, 40px) 80px;
  color: var(--color-neutral-9);
}

.top-bar {
  margin-bottom: 28px;
}

.back-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 7px 16px;
  font-size: 13px;
  font-weight: 600;
  color: var(--color-neutral-7);
  background: var(--bg-paper-raised, #ffffff);
  border: 1px solid var(--line-soft, rgba(122, 95, 65, 0.2));
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.15s ease;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
}

.back-btn:hover {
  background: var(--color-neutral-9);
  color: #fff;
  border-color: var(--color-neutral-9);
  box-shadow: 0 3px 8px rgba(0, 0, 0, 0.12);
}

/* ── Hero ── */
.hero {
  display: flex;
  align-items: flex-start;
  gap: 20px;
  margin-bottom: 32px;
  position: relative;
}

.hero-seal {
  width: 48px;
  height: 48px;
  display: grid;
  place-items: center;
  border-radius: 12px;
  background: rgba(169, 52, 38, 0.08);
  border: 1.5px solid rgba(169, 52, 38, 0.3);
  color: #a93426;
  font-family: var(--font-serif, "Noto Serif SC", serif);
  font-size: 24px;
  font-weight: 700;
  box-shadow: inset 0 0 8px rgba(169, 52, 38, 0.08);
  flex-shrink: 0;
  margin-top: 4px;
}

.hero-center {
  flex: 1;
  min-width: 0;
}

.hero-eyebrow {
  font-size: 11px;
  font-weight: 700;
  color: #a93426;
  letter-spacing: 0.1em;
  margin-bottom: 4px;
}

.hero h1 {
  font-family: var(--font-serif, "Noto Serif SC", serif);
  font-size: clamp(26px, 3.5vw, 36px);
  font-weight: 700;
  color: var(--color-neutral-10);
  margin: 0 0 8px;
  line-height: 1.25;
}

.hero-narrative {
  font-family: var(--font-serif, "Noto Serif SC", serif);
  font-size: 14.5px;
  color: var(--color-neutral-7);
  margin: 0 0 4px;
  line-height: 1.8;
}

.hero-sub {
  font-size: 12.5px;
  color: var(--color-neutral-6);
  margin: 0;
}

/* 堂号印章卡片 */
.clan-hall-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2px;
  padding: 10px 16px;
  border-radius: 10px;
  background: rgba(169, 52, 38, 0.05);
  border: 1.5px solid rgba(169, 52, 38, 0.2);
  flex-shrink: 0;
}

.hall-origin {
  font-size: 10.5px;
  color: var(--color-neutral-6);
  font-weight: 600;
}

.hall-name {
  font-family: var(--font-serif, "Noto Serif SC", serif);
  font-size: 16px;
  color: #a93426;
  font-weight: 800;
}

.hall-motto {
  font-size: 10.5px;
  color: var(--color-neutral-7);
  font-style: italic;
}

/* ── Metric Strip ── */
.metric-strip {
  display: flex;
  gap: 28px;
  padding: 22px 28px;
  background: var(--bg-paper-raised, #ffffff);
  border: 1px solid var(--line-soft, rgba(122, 95, 65, 0.16));
  border-radius: 12px;
  margin-bottom: 28px;
  flex-wrap: wrap;
  box-shadow: 0 4px 16px rgba(24, 18, 12, 0.04);
}

.metric-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.metric-num {
  font-family: var(--font-serif, "Noto Serif SC", serif);
  font-size: 24px;
  font-weight: 700;
  color: var(--color-neutral-10);
  line-height: 1;
}

.metric-num small {
  font-size: 13px;
  font-weight: 500;
  color: var(--color-neutral-6);
}

.metric-label {
  font-size: 11px;
  color: var(--color-neutral-6);
  letter-spacing: 0.04em;
  font-weight: 600;
}

/* ── Panels ── */
.panel {
  background: var(--bg-paper-raised, #ffffff);
  border: 1px solid var(--line-soft, rgba(122, 95, 65, 0.16));
  border-radius: 12px;
  padding: 24px;
  margin-bottom: 24px;
  box-shadow: 0 4px 16px rgba(24, 18, 12, 0.04);
}

.panel-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20px;
}

.panel-title-group {
  display: flex;
  align-items: center;
  gap: 12px;
}

.panel-icon {
  width: 32px;
  height: 32px;
  display: grid;
  place-items: center;
  border-radius: 8px;
  background: rgba(169, 52, 38, 0.08);
  color: #a93426;
  font-family: var(--font-serif, "Noto Serif SC", serif);
  font-size: 15px;
  font-weight: 700;
}

.panel-head h2 {
  font-family: var(--font-serif, "Noto Serif SC", serif);
  font-size: 17px;
  font-weight: 700;
  color: var(--color-neutral-10);
  margin: 0;
}

.panel-subtitle {
  margin: 2px 0 0;
  font-size: 11.5px;
  color: var(--color-neutral-6);
}

.head-badges {
  display: flex;
  align-items: center;
  gap: 8px;
}

.peak-badge {
  font-size: 11px;
  color: #a93426;
  background: rgba(169, 52, 38, 0.06);
  border: 1px solid rgba(169, 52, 38, 0.2);
  padding: 2px 8px;
  border-radius: 5px;
  font-weight: 600;
}

.panel-chip {
  font-size: 11px;
  padding: 2px 8px;
  border-radius: 5px;
  background: var(--fill-subtle, rgba(122, 95, 65, 0.08));
  color: var(--color-neutral-7);
  font-weight: 600;
}

/* ── 世代金字塔 ── */
.gen-pyramid {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.gen-row {
  display: grid;
  grid-template-columns: 130px 1fr 60px;
  align-items: center;
  gap: 14px;
}

.gen-name {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.gen-name strong {
  font-size: 13px;
  font-weight: 700;
  color: var(--color-neutral-9);
}

.gen-name small {
  font-size: 10.5px;
  color: var(--color-neutral-6);
}

.gen-bar-wrap {
  width: 100%;
}

.gen-bar-track {
  height: 22px;
  background: rgba(122, 95, 65, 0.06);
  border-radius: 6px;
  overflow: hidden;
}

.gen-bar-fill {
  height: 100%;
  border-radius: 6px;
  background: linear-gradient(90deg, #a93426, #c5574a);
  display: flex;
  align-items: center;
  padding: 0 10px;
  transition: width 0.3s ease;
}

.gen-bar-inner-text {
  font-size: 11px;
  color: #fff;
  font-weight: 700;
  white-space: nowrap;
}

.gen-val {
  font-size: 12px;
  font-weight: 700;
  color: var(--color-neutral-8);
  text-align: right;
  font-variant-numeric: tabular-nums;
}

/* ── 双栏布局 ── */
.dual-panel {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 24px;
}

/* 寿数考录 */
.lifespan-body {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.longevity-badge {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  border-radius: 8px;
  background: rgba(169, 52, 38, 0.05);
  border: 1px solid rgba(169, 52, 38, 0.18);
  cursor: pointer;
  transition: all 0.15s ease;
}

.longevity-badge:hover {
  background: rgba(169, 52, 38, 0.08);
  transform: translateY(-1px);
}

.longevity-tag {
  font-size: 10px;
  color: #fff;
  background: #a93426;
  padding: 2px 6px;
  border-radius: 4px;
  font-weight: 600;
}

.longevity-name {
  font-size: 13px;
  font-weight: 700;
  color: var(--color-neutral-9);
}

.longevity-years {
  font-size: 12px;
  color: #a93426;
  font-weight: 700;
}

.longevity-era {
  font-size: 11px;
  color: var(--color-neutral-6);
  margin-left: auto;
}

.bar-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.bar-row {
  display: grid;
  grid-template-columns: 75px 1fr 50px;
  align-items: center;
  gap: 10px;
}

.bar-label {
  font-size: 12px;
  color: var(--color-neutral-7);
}

.bar-track {
  height: 14px;
  background: rgba(122, 95, 65, 0.06);
  border-radius: 4px;
  overflow: hidden;
}

.bar-fill {
  height: 100%;
  border-radius: 4px;
  transition: width 0.3s ease;
}

.bar-fill--warm {
  background: linear-gradient(90deg, #b07d4b, #cf9d6b);
}

.bar-val {
  font-size: 11.5px;
  font-weight: 600;
  color: var(--color-neutral-8);
  text-align: right;
  font-variant-numeric: tabular-nums;
}

/* 昭穆字派网格 */
.word-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
}

.word-seal {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 10px 4px;
  border-radius: 8px;
  background: var(--fill-subtle, rgba(122, 95, 65, 0.04));
  border: 1px solid var(--line-subtle, rgba(122, 95, 65, 0.1));
  transition: all 0.15s ease;
}

.word-seal:hover {
  background: rgba(169, 52, 38, 0.05);
  border-color: rgba(169, 52, 38, 0.3);
  transform: translateY(-1px);
}

.word-char {
  font-family: var(--font-serif, "Noto Serif SC", serif);
  font-size: 20px;
  font-weight: 800;
  color: #a93426;
}

.word-count {
  font-size: 10.5px;
  color: var(--color-neutral-6);
  font-variant-numeric: tabular-nums;
}

/* 姓氏卡片 */
.surname-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 10px;
}

.surname-card {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 12px;
  border-radius: 8px;
  background: var(--fill-subtle, rgba(122, 95, 65, 0.04));
  border: 1px solid var(--line-subtle, rgba(122, 95, 65, 0.1));
  transition: all 0.15s ease;
}

.surname-card:hover {
  border-color: rgba(122, 95, 65, 0.3);
  transform: translateY(-1px);
}

.surname-seal {
  width: 32px;
  height: 32px;
  display: grid;
  place-items: center;
  border-radius: 8px;
  background: rgba(122, 95, 65, 0.12);
  color: var(--color-neutral-9);
  font-family: var(--font-serif, "Noto Serif SC", serif);
  font-size: 15px;
  font-weight: 700;
}

.surname-seal--main {
  background: #a93426;
  color: #fff;
}

.surname-info {
  display: flex;
  flex-direction: column;
  gap: 1px;
}

.surname-name {
  font-size: 14px;
  font-weight: 700;
  color: var(--color-neutral-9);
}

.surname-count {
  font-size: 10.5px;
  color: var(--color-neutral-6);
}

.surname-bar-mini {
  height: 4px;
  background: rgba(122, 95, 65, 0.08);
  border-radius: 2px;
  overflow: hidden;
}

.surname-bar-fill {
  height: 100%;
  border-radius: 2px;
  background: #a93426;
}

.empty {
  text-align: center;
  padding: 28px 0;
  font-size: 12.5px;
  color: var(--color-neutral-6);
}

@media (max-width: 768px) {
  .dual-panel {
    grid-template-columns: 1fr;
  }
  .surname-grid {
    grid-template-columns: repeat(2, 1fr);
  }
  .word-grid {
    grid-template-columns: repeat(3, 1fr);
  }
}
</style>
