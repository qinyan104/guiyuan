<script setup lang="ts">
import { computed, inject } from 'vue'
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

const totalCount = computed(() => people.value.length)
const maleCount = computed(() => people.value.filter((p) => p.gender === 'male').length)
const femaleCount = computed(() => people.value.filter((p) => p.gender === 'female').length)
const deceasedCount = computed(() => people.value.filter((p) => p.deceased).length)
const aliveCount = computed(() => totalCount.value - deceasedCount.value)
const malePercent = computed(() => totalCount.value > 0 ? Math.round((maleCount.value / totalCount.value) * 100) : 0)

// ── 世代 ──
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

const generationDistribution = computed(() => {
  const dist = new Map<number, number>()
  generationMap.value.forEach((g) => dist.set(g, (dist.get(g) || 0) + 1))
  return Array.from(dist.entries()).sort((a, b) => a[0] - b[0])
})
const maxGenCount = computed(() => Math.max(1, ...generationDistribution.value.map(([, c]) => c)))

// ── 寿年 ──
const lifespans = computed(() =>
  people.value
    .map((p) => {
      const b = parseYear(p.birth), d = parseYear(p.death)
      if (b === null || d === null) return null
      const y = d - b
      if (y < 0 || y > 120) return null
      return { name: p.name, years: y }
    })
    .filter((x): x is { name: string; years: number } => x !== null),
)

const avgLifespan = computed(() => {
  if (lifespans.value.length === 0) return null
  return Math.round((lifespans.value.reduce((s, x) => s + x.years, 0) / lifespans.value.length) * 10) / 10
})

const lifespanBuckets = computed(() => {
  const buckets = new Map<string, number>()
  for (const item of lifespans.value) {
    const start = Math.floor(item.years / 10) * 10
    buckets.set(`${start}-${start + 9}岁`, (buckets.get(`${start}-${start + 9}岁`) || 0) + 1)
  }
  return Array.from(buckets.entries()).sort((a, b) => a[0].localeCompare(b[0]))
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

// ── 姓氏 ──
const compoundSurnames = ['欧阳','太史','端木','上官','司马','东方','独孤','南宫','万俟','闻人','夏侯','诸葛','尉迟','公羊','赫连','澹台','皇甫','宗政','濮阳','公冶','太叔','申屠','公孙','慕容','仲孙','钟离','长孙','宇文','司徒','鲜于','司空','闾丘','子车','亓官','司寇','巫马','公西','颛孙','壤驷','公良','漆雕','乐正','宰父','谷梁','拓跋','夹谷','轩辕','令狐','段干','百里','呼延','东郭','南门','羊舌','微生','梁丘','左丘','东门','西门','第五']
const surnameDist = computed(() => {
  const dist = new Map<string, number>()
  for (const p of people.value) {
    if (!p.name) continue
    let s = ''
    if (p.name.length >= 2 && compoundSurnames.includes(p.name.slice(0, 2))) s = p.name.slice(0, 2)
    if (!s) s = p.name.charAt(0)
    if (s) dist.set(s, (dist.get(s) || 0) + 1)
  }
  return Array.from(dist.entries()).sort((a, b) => b[1] - a[1]).slice(0, 8)
})
const maxSurname = computed(() => Math.max(1, ...surnameDist.value.map(([, c]) => c)))

// ── 叙述 ──
const narrative = computed(() => {
  const parts: string[] = []
  parts.push(`共 ${totalCount.value} 人`)
  if (generationCount.value > 0) parts.push(`${generationCount.value} 代`)
  if (earliestYear.value && latestYear.value) parts.push(`自 ${earliestYear.value} 年 至 ${latestYear.value} 年`)
  return parts.join('，')
})

function goBack() { router.push({ name: 'workbench', params: { id: props.publicationId } }) }
</script>

<template>
  <div class="chronicle-root" data-testid="stats-view">
    <button class="back-btn" @click="goBack">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 12H5"/><polyline points="12 19 5 12 12 5"/></svg>
      画布
    </button>

    <header class="hero">
      <h1>{{ pubData.title || '未命名族谱' }}</h1>
      <p class="hero-narrative">{{ narrative }}。</p>
      <p v-if="pubData.subtitle" class="hero-sub">{{ pubData.subtitle }}</p>
    </header>

    <section class="metric-strip">
      <div class="metric-item">
        <span class="metric-num">{{ totalCount }}</span>
        <span class="metric-label">族人</span>
      </div>
      <div class="metric-item">
        <span class="metric-num">{{ generationCount || '—' }}</span>
        <span class="metric-label">世代</span>
      </div>
      <div class="metric-item">
        <span class="metric-num">{{ aliveCount }} / {{ deceasedCount }}</span>
        <span class="metric-label">在世 / 已故</span>
      </div>
      <div class="metric-item">
        <span class="metric-num">{{ malePercent }}<small>%</small></span>
        <span class="metric-label">男性比例</span>
      </div>
      <div class="metric-item" v-if="timelineSpan !== null">
        <span class="metric-num">{{ timelineSpan }}</span>
        <span class="metric-label">年跨度</span>
      </div>
      <div class="metric-item" v-if="avgLifespan !== null">
        <span class="metric-num">{{ avgLifespan }}</span>
        <span class="metric-label">均寿</span>
      </div>
    </section>

    <!-- 世代分布 -->
    <section class="panel">
      <div class="panel-head">
        <h2>世代</h2>
        <span class="panel-chip">{{ generationCount }} 代</span>
      </div>
      <div class="bar-list">
        <div v-for="[g, c] in generationDistribution" :key="g" class="bar-row">
          <span class="bar-label">{{ g === 0 ? '未归' : `第${g}代` }}</span>
          <div class="bar-track"><div class="bar-fill" :style="{ width: `${(c / maxGenCount) * 100}%` }"></div></div>
          <span class="bar-val">{{ c }}</span>
        </div>
      </div>
    </section>

    <!-- 寿年 + 姓氏 双栏 -->
    <section class="dual-panel">
      <div class="panel">
        <div class="panel-head">
          <h2>寿年</h2>
          <span class="panel-chip" v-if="avgLifespan !== null">{{ avgLifespan }} 岁</span>
        </div>
        <div v-if="lifespans.length === 0" class="empty">暂无足够数据</div>
        <div v-else class="bar-list">
          <div v-for="[b, c] in lifespanBuckets" :key="b" class="bar-row">
            <span class="bar-label">{{ b }}</span>
            <div class="bar-track"><div class="bar-fill bar-fill--warm" :style="{ width: `${(c / maxBucket) * 100}%` }"></div></div>
            <span class="bar-val">{{ c }}</span>
          </div>
        </div>
      </div>

      <div class="panel">
        <div class="panel-head">
          <h2>姓氏</h2>
          <span class="panel-chip">Top 8</span>
        </div>
        <div v-if="surnameDist.length === 0" class="empty">暂无数据</div>
        <div v-else class="bar-list">
          <div v-for="[s, c] in surnameDist" :key="s" class="bar-row">
            <span class="bar-label">{{ s }}</span>
            <div class="bar-track"><div class="bar-fill bar-fill--accent" :style="{ width: `${(c / maxSurname) * 100}%` }"></div></div>
            <span class="bar-val">{{ c }}</span>
          </div>
        </div>
      </div>
    </section>


  </div>
</template>

<style scoped>
.chronicle-root {
  max-width: 880px;
  margin: 0 auto;
  padding: 60px clamp(20px, 4vw, 48px) 80px;
}

.back-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 40px;
  padding: 7px 14px;
  font-size: var(--text-copy-13);
  font-weight: 500;
  color: var(--color-neutral-7);
  background: transparent;
  border: 1px solid var(--color-neutral-4);
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: all var(--duration-fast) var(--ease-breath);
}
.back-btn:hover {
  background: var(--color-neutral-9);
  color: var(--color-neutral-1);
  border-color: var(--color-neutral-9);
}
.back-btn svg { flex-shrink: 0; }

/* ── Hero ── */
.hero {
  margin-bottom: 48px;
}
.hero h1 {
  font-family: var(--font-serif);
  font-size: var(--text-display-36);
  font-weight: 400;
  color: var(--color-neutral-10);
  margin: 0 0 16px;
  letter-spacing: 0.04em;
  line-height: 1.25;
}
.hero-narrative {
  font-family: var(--font-serif);
  font-size: var(--text-copy-16);
  color: var(--color-neutral-7);
  margin: 0 0 8px;
  line-height: 1.8;
}
.hero-sub {
  font-size: var(--text-copy-13);
  color: var(--color-neutral-6);
  margin: 0;
}

/* ── Metric Strip ── */
.metric-strip {
  display: flex;
  gap: 32px;
  padding: 32px 0;
  border-top: 1px solid var(--color-neutral-5);
  border-bottom: 1px solid var(--color-neutral-5);
  margin-bottom: 56px;
  flex-wrap: wrap;
}
.metric-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.metric-num {
  font-family: var(--font-serif);
  font-size: var(--text-title-28);
  font-weight: 400;
  color: var(--color-neutral-9);
  line-height: 1;
}
.metric-num small {
  font-size: var(--text-copy-14);
  color: var(--color-neutral-6);
}
.metric-label {
  font-size: var(--text-label-12);
  color: var(--color-neutral-6);
  letter-spacing: 0.08em;
}

/* ── Panel ── */
.panel {
  margin-bottom: 56px;
}
.panel-head {
  display: flex;
  align-items: baseline;
  gap: 16px;
  margin-bottom: 24px;
}
.panel-head h2 {
  font-family: var(--font-serif);
  font-size: var(--text-title-20);
  font-weight: 400;
  color: var(--color-neutral-10);
  margin: 0;
}
.panel-chip {
  font-size: var(--text-label-12);
  color: var(--color-accent);
  font-weight: 500;
  letter-spacing: 0.06em;
  background: var(--color-accent-muted);
  padding: 2px 10px;
  border-radius: var(--radius-md);
}

.dual-panel {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 48px;
}
@media (max-width: 640px) { .dual-panel { grid-template-columns: 1fr; } }

/* ── Bar List ── */
.bar-list { display: flex; flex-direction: column; gap: 12px; }
.bar-row { display: grid; grid-template-columns: 7em 1fr 2.5em; align-items: center; gap: 16px; }
.bar-label { font-size: var(--text-copy-13); color: var(--color-neutral-7); text-align: right; }
.bar-val { font-size: var(--text-copy-13); color: var(--color-neutral-8); }
.bar-track { height: 8px; background: var(--color-neutral-3); border-radius: var(--radius-sm); overflow: hidden; }
.bar-fill { height: 100%; background: var(--color-neutral-8); border-radius: var(--radius-sm); min-width: 2px; transition: width var(--duration-slow) var(--ease-breath); }
.bar-fill--warm { background: var(--color-warning); }
.bar-fill--accent { background: var(--color-accent); }

.empty { color: var(--color-neutral-6); font-size: var(--text-copy-13); padding: 12px 0; }

</style>
