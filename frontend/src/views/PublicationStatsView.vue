<script setup lang="ts">
import { computed, inject } from 'vue'
import { useRouter } from 'vue-router'
import { parseYear } from '../lib/dateUtils'
import { PUBLICATION_CONTEXT_KEY, type FamilyUnit, type Person, type PublicationData } from '../types/family'
import DarkModeToggle from '../components/DarkModeToggle.vue'

const props = defineProps<{ publicationId: number }>()
const router = useRouter()
const context = inject(PUBLICATION_CONTEXT_KEY)!
const pubData = computed<PublicationData>(() => context.pub.publication)

const people = computed<Person[]>(() => Object.values(pubData.value.people ?? {}))
const totalCount = computed(() => people.value.length)

// ── 性别与在世统计 ──
const maleCount = computed(() => people.value.filter((p) => p.gender === 'male').length)
const femaleCount = computed(() => people.value.filter((p) => p.gender === 'female').length)
const deceasedCount = computed(() => people.value.filter((p) => p.deceased).length)
const aliveCount = computed(() => totalCount.value - deceasedCount.value)
const malePercent = computed(() => totalCount.value ? Math.round((maleCount.value / totalCount.value) * 100) : 0)

// ── 堂号与修谱信息 ──
const clanHallInfo = computed(() => {
  const info = pubData.value.info
  if (!info) return null
  return {
    hall: info.hallName?.trim(),
    motto: info.familyMotto?.trim(),
    origin: info.ancestralOrigin?.trim(),
  }
})

// ── 世代计算与世代金字塔 ──
const families = computed<Record<string, FamilyUnit>>(() => pubData.value.families ?? {})
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

const generationDistribution = computed(() => {
  const counts = new Map<number, number>()
  for (const p of people.value) {
    const g = generationMap.value.get(p.id) ?? 0
    counts.set(g, (counts.get(g) ?? 0) + 1)
  }
  return Array.from(counts.entries()).sort((a, b) => a[0] - b[0])
})

const maxGenCount = computed(() => {
  let m = 1
  for (const [, c] of generationDistribution.value) {
    if (c > m) m = c
  }
  return m
})

const generationCount = computed(() => {
  const gens = generationDistribution.value.map(([g]) => g).filter((g) => g > 0)
  return gens.length ? Math.max(...gens) : 0
})

const peakGeneration = computed(() => {
  let maxGen = 0
  let maxC = 0
  for (const [g, c] of generationDistribution.value) {
    if (g > 0 && c > maxC) {
      maxC = c
      maxGen = g
    }
  }
  return maxGen > 0 ? [maxGen, maxC] : null
})

const generationDetails = computed(() => {
  return generationDistribution.value.map(([g, c]) => {
    const pInGen = people.value.filter((p) => (generationMap.value.get(p.id) ?? 0) === g)
    const m = pInGen.filter((p) => p.gender === 'male').length
    const f = pInGen.filter((p) => p.gender === 'female').length
    return { generation: g, count: c, male: m, female: f }
  })
})

// ── 寿数与历史年代统计 ──
const lifespans = computed<number[]>(() => {
  const list: number[] = []
  for (const p of people.value) {
    const by = parseYear(p.birth)
    const dy = parseYear(p.death)
    if (by !== null && dy !== null && dy >= by) {
      const age = dy - by
      if (age >= 0 && age <= 120) list.push(age)
    }
  }
  return list
})

const avgLifespan = computed(() => {
  if (lifespans.value.length === 0) return null
  const sum = lifespans.value.reduce((acc, v) => acc + v, 0)
  return Math.round(sum / lifespans.value.length)
})

const oldestPerson = computed(() => {
  let maxAge = -1
  let target: { person: Person; years: number; birth: string; death: string } | null = null
  for (const p of people.value) {
    const by = parseYear(p.birth)
    const dy = parseYear(p.death)
    if (by !== null && dy !== null && dy >= by) {
      const age = dy - by
      if (age > maxAge) {
        maxAge = age
        target = { person: p, years: age, birth: p.birth || `${by}年`, death: p.death || `${dy}年` }
      }
    }
  }
  return target ? { id: target.person.id, name: target.person.name, years: target.years, birth: target.birth, death: target.death } : null
})

const lifespanBuckets = computed(() => {
  const buckets = [
    { label: '30岁以下', min: 0, max: 29, count: 0 },
    { label: '30-49岁', min: 30, max: 49, count: 0 },
    { label: '50-69岁', min: 50, max: 69, count: 0 },
    { label: '70-79岁 (古稀)', min: 70, max: 79, count: 0 },
    { label: '80岁以上 (耄耋)', min: 80, max: 150, count: 0 },
  ]
  for (const age of lifespans.value) {
    for (const b of buckets) {
      if (age >= b.min && age <= b.max) {
        b.count++
        break
      }
    }
  }
  return buckets.map((b) => [b.label, b.count] as [string, number])
})

const maxBucket = computed(() => {
  let m = 1
  for (const [, c] of lifespanBuckets.value) {
    if (c > m) m = c
  }
  return m
})

// ── 历代跨度 ──
const timelineSpan = computed(() => {
  let earliest = Infinity
  let latest = -Infinity
  for (const p of people.value) {
    const by = parseYear(p.birth)
    const dy = parseYear(p.death)
    if (by !== null) {
      if (by < earliest) earliest = by
      if (by > latest) latest = by
    }
    if (dy !== null) {
      if (dy < earliest) earliest = dy
      if (dy > latest) latest = dy
    }
  }
  if (earliest === Infinity || latest === -Infinity) return null
  return latest - earliest
})

// ── 昭穆字派高频字 (字辈分析) ──
const nameCharDist = computed(() => {
  const counts = new Map<string, number>()
  for (const p of people.value) {
    const raw = (p.name || '').trim()
    if (raw.length < 2) continue
    const givenName = raw.slice(1)
    for (const ch of givenName) {
      if (/^[\u4e00-\u9fa5]$/.test(ch)) {
        counts.set(ch, (counts.get(ch) ?? 0) + 1)
      }
    }
  }
  return Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1])
    .filter(([, c]) => c >= 2)
    .slice(0, 12)
})

// ── 姓氏与主要姻亲 ──
const surnameDist = computed(() => {
  const counts = new Map<string, number>()
  for (const p of people.value) {
    const n = (p.name || '').trim()
    if (n.length >= 1) {
      const s = n.charAt(0)
      counts.set(s, (counts.get(s) ?? 0) + 1)
    }
  }
  return Array.from(counts.entries()).sort((a, b) => b[1] - a[1]).slice(0, 8)
})

const maxSurname = computed(() => {
  let m = 1
  for (const [, c] of surnameDist.value) {
    if (c > m) m = c
  }
  return m
})

// ── 叙述性摘要 ──
const narrativeSummary = computed(() => {
  if (totalCount.value === 0) return ''
  const parts: string[] = []
  parts.push(`本谱共载族人先祖 ${totalCount.value} 位`)
  if (generationCount.value > 0) parts.push(`历传 ${generationCount.value} 世`)
  if (timelineSpan.value !== null) parts.push(`跨越 ${timelineSpan.value} 年时空脉络`)
  if (peakGeneration.value) parts.push(`于第 ${peakGeneration.value[0]} 世迎繁衍鼎盛 (${peakGeneration.value[1]}人)`)
  if (avgLifespan.value !== null) parts.push(`有据族人平均享寿 ${avgLifespan.value} 岁`)
  return parts.join('，') + '。'
})

function goBack() {
  router.push({ name: 'workbench', params: { id: props.publicationId } })
}

function goPerson(personId: string) {
  router.push({
    name: 'workbench',
    params: { id: props.publicationId },
    query: { personId },
  })
}
</script>

<template>
  <div class="chronicle-root" data-testid="stats-view">
    <div class="page-container">
      <!-- Standard Topbar -->
      <header class="topbar">
        <div class="topbar-left">
          <button class="back-btn" type="button" @click="goBack" title="返回画布">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
              <line x1="19" y1="12" x2="5" y2="12" />
              <polyline points="12 19 5 12 12 5" />
            </svg>
            <span>返回画布</span>
          </button>
          <div class="topbar-divider"></div>
          <div class="topbar-breadcrumb">
            <span class="topbar-pub-title">{{ pubData.title || '未命名族谱' }}</span>
            <span class="topbar-crumb-sep">/</span>
            <span class="topbar-page-label">宗族洞察数据</span>
          </div>
        </div>

        <div class="topbar-right">
          <DarkModeToggle />
        </div>
      </header>

      <!-- Hero Card -->
      <header class="hero">
        <div class="hero-seal">谱</div>
        <div class="hero-center">
          <div class="hero-eyebrow">宗族洞察</div>
          <h1>{{ pubData.title || '未命名族谱' }}</h1>
          <p class="hero-narrative" v-if="narrativeSummary">{{ narrativeSummary }}</p>
          <p class="hero-sub" v-if="pubData.subtitle">{{ pubData.subtitle }}</p>
        </div>

        <!-- 堂号印章卡片 -->
        <div v-if="clanHallInfo && (clanHallInfo.hall || clanHallInfo.origin)" class="clan-hall-card">
          <span v-if="clanHallInfo.origin" class="hall-origin">{{ clanHallInfo.origin }}郡望</span>
          <strong v-if="clanHallInfo.hall" class="hall-name">{{ clanHallInfo.hall }}</strong>
          <span v-if="clanHallInfo.motto" class="hall-motto">“{{ clanHallInfo.motto }}”</span>
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
  </div>
</template>

<style scoped>
.chronicle-root {
  min-height: 100vh;
  width: 100%;
  background-color: var(--color-canvas-bg, var(--color-neutral-1));
  color: var(--color-neutral-9);
  box-sizing: border-box;
  position: relative;
  transition: background-color 0.25s ease, color 0.25s ease;
}

.page-container {
  max-width: 1020px;
  margin: 0 auto;
  padding: 16px 24px 80px;
  box-sizing: border-box;
}

/* ── Standard Topbar ── */
.topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 10px 18px;
  background: var(--workbench-header-bg, var(--color-panel-bg));
  border: 1px solid var(--workbench-header-border, var(--color-card-stroke));
  border-radius: var(--radius-2xl, 16px);
  box-shadow: var(--workbench-header-shadow, var(--shadow-whisper));
  backdrop-filter: blur(18px) saturate(135%);
  -webkit-backdrop-filter: blur(18px) saturate(135%);
  position: sticky;
  top: 14px;
  z-index: 50;
  margin-bottom: 24px;
  transition: background-color 0.25s ease, border-color 0.25s ease;
}

.topbar-left {
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 0;
}

.back-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 14px;
  font-size: 12.5px;
  font-weight: 600;
  color: var(--color-neutral-8);
  background: var(--color-card-fill, var(--color-neutral-2));
  border: 1px solid var(--color-neutral-4);
  border-radius: var(--radius-md, 8px);
  cursor: pointer;
  transition: all 0.15s ease;
  white-space: nowrap;
  flex-shrink: 0;
}

.back-btn:hover {
  background: var(--color-neutral-9);
  color: var(--color-neutral-1);
  border-color: var(--color-neutral-9);
  box-shadow: var(--shadow-whisper);
}

.topbar-divider {
  width: 1px;
  height: 18px;
  background: var(--color-neutral-4);
  flex-shrink: 0;
}

.topbar-breadcrumb {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  min-width: 0;
}

.topbar-pub-title {
  font-family: var(--font-serif);
  font-weight: 600;
  color: var(--color-neutral-10);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 220px;
}

.topbar-crumb-sep {
  color: var(--color-neutral-5);
  font-size: 12px;
}

.topbar-page-label {
  color: var(--color-accent);
  font-weight: 600;
  font-size: 12.5px;
  white-space: nowrap;
}

.topbar-right {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-shrink: 0;
}

/* ── Hero Card ── */
.hero {
  display: flex;
  align-items: flex-start;
  gap: 20px;
  padding: 24px 28px;
  background: var(--color-card-fill, var(--color-neutral-2));
  border: 1px solid var(--color-card-stroke, var(--color-neutral-4));
  border-radius: var(--radius-xl, 16px);
  box-shadow: var(--shadow-whisper);
  margin-bottom: 24px;
  position: relative;
  transition: background-color 0.25s ease, border-color 0.25s ease;
}

.hero-seal {
  width: 48px;
  height: 48px;
  display: grid;
  place-items: center;
  border-radius: var(--radius-lg, 12px);
  background: var(--color-accent-muted);
  border: 1.5px solid var(--color-accent);
  color: var(--color-accent);
  font-family: var(--font-serif);
  font-size: 24px;
  font-weight: 700;
  box-shadow: var(--shadow-accent);
  flex-shrink: 0;
  margin-top: 2px;
}

.hero-center {
  flex: 1;
  min-width: 0;
}

.hero-eyebrow {
  font-size: 11px;
  font-weight: 700;
  color: var(--color-accent);
  letter-spacing: 0.1em;
  margin-bottom: 4px;
}

.hero h1 {
  font-family: var(--font-serif);
  font-size: clamp(24px, 3.2vw, 32px);
  font-weight: 700;
  color: var(--color-neutral-10);
  margin: 0 0 8px;
  line-height: 1.25;
}

.hero-narrative {
  font-family: var(--font-serif);
  font-size: 14px;
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
  gap: 3px;
  padding: 10px 18px;
  border-radius: var(--radius-lg, 12px);
  background: var(--color-accent-muted);
  border: 1.5px solid var(--color-accent);
  flex-shrink: 0;
  align-self: center;
}

.hall-origin {
  font-size: 10.5px;
  color: var(--color-neutral-7);
  font-weight: 600;
}

.hall-name {
  font-family: var(--font-serif);
  font-size: 16px;
  color: var(--color-accent);
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
  padding: 20px 28px;
  background: var(--color-card-fill, var(--color-neutral-2));
  border: 1px solid var(--color-card-stroke, var(--color-neutral-4));
  border-radius: var(--radius-lg, 12px);
  margin-bottom: 24px;
  flex-wrap: wrap;
  box-shadow: var(--shadow-whisper);
  transition: background-color 0.25s ease, border-color 0.25s ease;
}

.metric-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.metric-num {
  font-family: var(--font-serif);
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
  background: var(--color-card-fill, var(--color-neutral-2));
  border: 1px solid var(--color-card-stroke, var(--color-neutral-4));
  border-radius: var(--radius-lg, 12px);
  padding: 24px;
  margin-bottom: 24px;
  box-shadow: var(--shadow-whisper);
  transition: background-color 0.25s ease, border-color 0.25s ease;
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
  border-radius: var(--radius-md, 8px);
  background: var(--color-accent-muted);
  color: var(--color-accent);
  font-family: var(--font-serif);
  font-size: 15px;
  font-weight: 700;
}

.panel-head h2 {
  font-family: var(--font-serif);
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
  color: var(--color-accent);
  background: var(--color-accent-muted);
  border: 1px solid var(--color-accent);
  padding: 2px 8px;
  border-radius: var(--radius-sm, 5px);
  font-weight: 600;
}

.panel-chip {
  font-size: 11px;
  padding: 2px 8px;
  border-radius: var(--radius-sm, 5px);
  background: var(--color-neutral-3);
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
  color: var(--color-neutral-10);
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
  background: var(--color-neutral-3);
  border-radius: var(--radius-sm, 6px);
  overflow: hidden;
}

.gen-bar-fill {
  height: 100%;
  border-radius: var(--radius-sm, 6px);
  background: var(--color-accent-gradient);
  display: flex;
  align-items: center;
  padding: 0 10px;
  transition: width 0.3s ease;
}

.gen-bar-inner-text {
  font-size: 11px;
  color: var(--color-text-on-accent, #fff);
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
  border-radius: var(--radius-md, 8px);
  background: var(--color-accent-muted);
  border: 1px solid var(--color-accent);
  cursor: pointer;
  transition: all 0.15s ease;
}

.longevity-badge:hover {
  background: var(--color-neutral-3);
  transform: translateY(-1px);
}

.longevity-tag {
  font-size: 10px;
  color: var(--color-text-on-accent, #fff);
  background: var(--color-accent);
  padding: 2px 6px;
  border-radius: var(--radius-sm, 4px);
  font-weight: 600;
}

.longevity-name {
  font-size: 13px;
  font-weight: 700;
  color: var(--color-neutral-10);
}

.longevity-years {
  font-size: 12px;
  color: var(--color-accent);
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
  grid-template-columns: 85px 1fr 50px;
  align-items: center;
  gap: 10px;
}

.bar-label {
  font-size: 12px;
  color: var(--color-neutral-7);
}

.bar-track {
  height: 14px;
  background: var(--color-neutral-3);
  border-radius: var(--radius-sm, 4px);
  overflow: hidden;
}

.bar-fill {
  height: 100%;
  border-radius: var(--radius-sm, 4px);
  transition: width 0.3s ease;
}

.bar-fill--warm {
  background: linear-gradient(90deg, var(--color-warning), var(--color-accent));
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
  border-radius: var(--radius-md, 8px);
  background: var(--color-neutral-3);
  border: 1px solid var(--color-neutral-4);
  transition: all 0.15s ease;
}

.word-seal:hover {
  background: var(--color-accent-muted);
  border-color: var(--color-accent);
  transform: translateY(-1px);
}

.word-char {
  font-family: var(--font-serif);
  font-size: 20px;
  font-weight: 800;
  color: var(--color-accent);
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
  border-radius: var(--radius-md, 8px);
  background: var(--color-neutral-3);
  border: 1px solid var(--color-neutral-4);
  transition: all 0.15s ease;
}

.surname-card:hover {
  border-color: var(--color-neutral-5);
  background: var(--color-card-hover-fill, var(--color-neutral-1));
  transform: translateY(-1px);
}

.surname-seal {
  width: 32px;
  height: 32px;
  display: grid;
  place-items: center;
  border-radius: var(--radius-md, 8px);
  background: var(--color-card-fill, var(--color-neutral-2));
  color: var(--color-neutral-8);
  font-family: var(--font-serif);
  font-size: 15px;
  font-weight: 700;
  border: 1px solid var(--color-neutral-4);
}

.surname-seal--main {
  background: var(--color-accent);
  color: var(--color-text-on-accent, #fff);
  border-color: var(--color-accent);
}

.surname-info {
  display: flex;
  flex-direction: column;
  gap: 1px;
}

.surname-name {
  font-size: 14px;
  font-weight: 700;
  color: var(--color-neutral-10);
}

.surname-count {
  font-size: 10.5px;
  color: var(--color-neutral-6);
}

.surname-bar-mini {
  height: 4px;
  background: var(--color-neutral-4);
  border-radius: 2px;
  overflow: hidden;
}

.surname-bar-fill {
  height: 100%;
  border-radius: 2px;
  background: var(--color-accent);
}

.empty {
  text-align: center;
  padding: 28px 0;
  font-size: 12.5px;
  color: var(--color-neutral-6);
}

@media (max-width: 768px) {
  .page-container {
    padding: 12px 14px 60px;
  }
  .topbar {
    flex-direction: column;
    align-items: stretch;
    gap: 10px;
  }
  .topbar-left, .topbar-right {
    justify-content: space-between;
  }
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
