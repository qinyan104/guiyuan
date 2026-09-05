<script setup lang="ts">
import { computed, inject, onBeforeUnmount, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { parseExactDate, parseYear } from '../lib/dateUtils'
import { getHistoricalEra, type HistoricalDateInfo } from '../lib/dynastyUtils'
import { PUBLICATION_CONTEXT_KEY, type FamilyUnit, type Person, type PublicationData } from '../types/family'
import DarkModeToggle from '../components/DarkModeToggle.vue'

const props = defineProps<{ publicationId: number }>()
const router = useRouter()
const context = inject(PUBLICATION_CONTEXT_KEY)!
const pubData = computed<PublicationData>(() => context.pub.publication)

const viewMode = ref<'feed' | 'spectrum'>('feed')
const filterType = ref<'all' | 'birth' | 'death'>('all')
const searchQuery = ref('')
const selectedGeneration = ref<number | null>(null)

interface TimelineEvent {
  person: Person
  year: number
  exactDate: number
  type: 'birth' | 'death'
  label: string
  centuryStart: number
  era: HistoricalDateInfo
  generation?: number
  ageAtDeath?: number
}

// ── 世代计算 ──
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

const allEvents = computed<TimelineEvent[]>(() => {
  const list: TimelineEvent[] = []
  const people = Object.values(pubData.value.people ?? {}) as Person[]

  for (const person of people) {
    const by = parseYear(person.birth)
    const dy = parseYear(person.death)
    const gen = generationMap.value.get(person.id)
    const age = by !== null && dy !== null && dy >= by ? dy - by : undefined

    if (by !== null) {
      list.push({
        person,
        year: by,
        exactDate: parseExactDate(person.birth),
        type: 'birth',
        label: person.birth || `${by}年`,
        centuryStart: Math.floor(by / 100) * 100,
        era: getHistoricalEra(by),
        generation: gen,
      })
    }
    if (dy !== null) {
      list.push({
        person,
        year: dy,
        exactDate: parseExactDate(person.death),
        type: 'death',
        label: person.death || `${dy}年`,
        centuryStart: Math.floor(dy / 100) * 100,
        era: getHistoricalEra(dy),
        generation: gen,
        ageAtDeath: age,
      })
    }
  }
  return list.sort((a, b) => a.exactDate !== b.exactDate ? a.exactDate - b.exactDate : a.type === 'birth' ? -1 : 1)
})

const availableGenerations = computed(() => {
  const gens = new Set<number>()
  for (const e of allEvents.value) {
    if (e.generation !== undefined) gens.add(e.generation)
  }
  return Array.from(gens).sort((a, b) => a - b)
})

const filteredEvents = computed(() => {
  const query = searchQuery.value.trim().toLowerCase()
  return allEvents.value.filter((e) => {
    if (filterType.value !== 'all' && e.type !== filterType.value) return false
    if (selectedGeneration.value !== null && e.generation !== selectedGeneration.value) return false
    if (query) {
      const matchName = e.person.name.toLowerCase().includes(query)
      const matchYear = String(e.year).includes(query)
      const matchEra = e.era.fullLabel.toLowerCase().includes(query)
      const matchDetail = e.label.toLowerCase().includes(query)
      if (!matchName && !matchYear && !matchEra && !matchDetail) return false
    }
    return true
  })
})

const centuryGroups = computed(() => {
  const g = new Map<number, TimelineEvent[]>()
  for (const e of filteredEvents.value) {
    if (!g.has(e.centuryStart)) g.set(e.centuryStart, [])
    g.get(e.centuryStart)!.push(e)
  }
  return Array.from(g.entries()).sort((a, b) => a[0] - b[0]).map(([cs, evts]) => {
    const births = evts.filter((e) => e.type === 'birth').length
    const deaths = evts.filter((e) => e.type === 'death').length
    const people = new Set(evts.map((e) => e.person.id)).size
    const eraName = evts[0]?.era.dynasty ?? ''
    return { centuryStart: cs, eraName, events: evts, births, deaths, people }
  })
})

// ── 生平长河图数据 ──
interface LifespanItem {
  person: Person
  generation?: number
  birthYear: number
  deathYear: number | null
  lifespan: number | null
  era: HistoricalDateInfo
}

const lifespanItems = computed<LifespanItem[]>(() => {
  const query = searchQuery.value.trim().toLowerCase()
  const people = Object.values(pubData.value.people ?? {}) as Person[]
  const items: LifespanItem[] = []

  for (const person of people) {
    const by = parseYear(person.birth)
    if (by === null) continue
    const dy = parseYear(person.death)
    const gen = generationMap.value.get(person.id)
    const lifespan = dy !== null && dy >= by ? dy - by : null

    if (selectedGeneration.value !== null && gen !== selectedGeneration.value) continue
    if (query) {
      const matchName = person.name.toLowerCase().includes(query)
      const matchYear = String(by).includes(query) || (dy !== null && String(dy).includes(query))
      if (!matchName && !matchYear) continue
    }

    items.push({
      person,
      generation: gen,
      birthYear: by,
      deathYear: dy,
      lifespan,
      era: getHistoricalEra(by),
    })
  }

  return items.sort((a, b) => a.birthYear - b.birthYear)
})

const minYear = computed(() => {
  if (allEvents.value.length === 0) return 0
  return allEvents.value[0].year
})

const maxYear = computed(() => {
  if (allEvents.value.length === 0) return 0
  return allEvents.value[allEvents.value.length - 1].year
})

const earliest = computed(() => (allEvents.value.length ? allEvents.value[0].year : null))
const latest = computed(() => (allEvents.value.length ? allEvents.value[allEvents.value.length - 1].year : null))
const span = computed(() => (earliest.value !== null && latest.value !== null ? latest.value - earliest.value : null))
const totalEvents = computed(() => allEvents.value.length)
const distinctPeople = computed(() => new Set(allEvents.value.map((e) => e.person.id)).size)

function centuryLabel(cs: number): string {
  if (cs < 0) return `公元前 ${Math.abs(cs)} 年代`
  const c = Math.floor(cs / 100) + 1
  return `公元 ${c} 世纪 (${cs}年代)`
}

function getLifespanBarLeft(birthYear: number): number {
  const total = (maxYear.value - minYear.value) || 1
  return Math.max(0, Math.min(100, ((birthYear - minYear.value) / total) * 100))
}

function getLifespanBarWidth(item: LifespanItem): number {
  const total = (maxYear.value - minYear.value) || 1
  const end = item.deathYear ?? (item.birthYear + (item.lifespan ?? 60))
  const len = Math.max(1, end - item.birthYear)
  return Math.max(1.5, Math.min(100, (len / total) * 100))
}

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

// ── Back to Top ──
const showTop = ref(false)
function onScroll() {
  showTop.value = window.scrollY > 400
}
function toTop() {
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

onMounted(() => window.addEventListener('scroll', onScroll, { passive: true }))
onBeforeUnmount(() => window.removeEventListener('scroll', onScroll))
</script>

<template>
  <div class="timeline-root" data-testid="timeline-view">
    <div class="page-container">
      <!-- Standard Top Navigation Bar -->
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
            <span class="topbar-page-label">宗谱编年史</span>
          </div>
        </div>

        <div class="topbar-right">
          <!-- View Mode Switch -->
          <div v-if="allEvents.length > 0" class="view-switch-pill">
            <button
              type="button"
              :class="['switch-btn', { active: viewMode === 'feed' }]"
              @click="viewMode = 'feed'"
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <line x1="12" y1="2" x2="12" y2="22" /><circle cx="12" cy="7" r="3" /><circle cx="12" cy="17" r="3" />
              </svg>
              <span>编年史卷</span>
            </button>
            <button
              type="button"
              :class="['switch-btn', { active: viewMode === 'spectrum' }]"
              @click="viewMode = 'spectrum'"
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <line x1="4" y1="6" x2="20" y2="6" /><line x1="4" y1="12" x2="16" y2="12" /><line x1="8" y1="18" x2="20" y2="18" />
              </svg>
              <span>先祖长河</span>
            </button>
          </div>
          <DarkModeToggle />
        </div>
      </header>

      <!-- Hero Card -->
      <header class="hero">
        <div class="hero-seal">历</div>
        <div class="hero-text">
          <div class="hero-eyebrow">宗谱编年史</div>
          <h1>{{ pubData.title || '未命名族谱' }}</h1>
          <p class="hero-narrative" v-if="earliest && latest">
            溯古及今，自 <strong>{{ earliest }}</strong> 年至 <strong>{{ latest }}</strong> 年，跨越 <strong>{{ span }}</strong> 载光阴，
            收录 <strong>{{ totalEvents }}</strong> 个纪事节点，汇聚 <strong>{{ distinctPeople }}</strong> 位先祖族人生卒岁华。
          </p>
          <p class="hero-narrative" v-else>补充人物生卒年份后，编年史将在此徐徐展开。</p>
        </div>
      </header>

      <!-- Metric Strip -->
      <section class="metric-strip" v-if="allEvents.length > 0">
        <div class="metric-item">
          <span class="metric-num">{{ totalEvents }}</span>
          <span class="metric-label">纪事节点</span>
        </div>
        <div class="metric-item">
          <span class="metric-num">{{ distinctPeople }}</span>
          <span class="metric-label">有据族人</span>
        </div>
        <div class="metric-item">
          <span class="metric-num">{{ earliest }}</span>
          <span class="metric-label">肇始之年</span>
        </div>
        <div class="metric-item" v-if="span !== null">
          <span class="metric-num">{{ span }}<small> 年</small></span>
          <span class="metric-label">时空跨度</span>
        </div>
      </section>

      <!-- Empty State -->
      <div v-if="allEvents.length === 0" class="empty-state">
        <div class="empty-seal">纪</div>
        <p class="empty-title">暂无带年份的族人纪事</p>
        <p class="empty-desc">在画布中为先祖人物补充生卒年或干支纪年后，编年史将在此自动排定朝代纪年与时空长卷。</p>
        <button class="back-link-btn" @click="goBack">前往画布补充</button>
      </div>

      <!-- Main Content Area -->
      <template v-else>
        <!-- Filter & Search Toolbar -->
        <div class="filter-toolbar">
          <div class="filter-pills">
            <button
              type="button"
              :class="['filter-pill', { active: filterType === 'all' }]"
              @click="filterType = 'all'"
            >
              全部 ({{ allEvents.length }})
            </button>
            <button
              type="button"
              :class="['filter-pill', { active: filterType === 'birth' }]"
              @click="filterType = 'birth'"
            >
              诞辰 ({{ allEvents.filter(e => e.type === 'birth').length }})
            </button>
            <button
              type="button"
              :class="['filter-pill', { active: filterType === 'death' }]"
              @click="filterType = 'death'"
            >
              归真 ({{ allEvents.filter(e => e.type === 'death').length }})
            </button>
          </div>

          <div class="filter-right">
            <!-- Generation Selector -->
            <select
              v-if="availableGenerations.length > 1"
              v-model="selectedGeneration"
              class="gen-select"
            >
              <option :value="null">全部世代</option>
              <option v-for="g in availableGenerations" :key="g" :value="g">第 {{ g }} 世</option>
            </select>

            <!-- Search Input -->
            <div class="search-wrap">
              <svg class="search-icon" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <input
                v-model="searchQuery"
                type="search"
                class="timeline-search"
                placeholder="搜索名讳、年份或朝代..."
              />
            </div>
          </div>
        </div>

        <!-- Mode 1: 编年史卷 (Chronological Feed) -->
        <section v-if="viewMode === 'feed'" class="timeline">
          <div v-if="filteredEvents.length === 0" class="no-match">
            未检索到符合条件的纪事节点
          </div>

          <article v-for="g in centuryGroups" :key="g.centuryStart" class="era">
            <header class="era-head">
              <div class="era-dot"></div>
              <div class="era-title-block">
                <div class="era-title-row">
                  <h2>{{ centuryLabel(g.centuryStart) }}</h2>
                  <span v-if="g.eraName" class="dynasty-badge">{{ g.eraName }}</span>
                </div>
                <p class="era-summary">
                  谱载 <strong>{{ g.events.length }}</strong> 次生卒纪事 · <strong>{{ g.people }}</strong> 位族人 ·
                  {{ g.births }} 诞辰 / {{ g.deaths }} 归真
                </p>
              </div>
            </header>

            <div class="era-events">
              <div
                v-for="(e, idx) in g.events"
                :key="`${e.person.id}-${e.type}-${e.year}-${idx}`"
                :class="['event', `event--${e.type}`, `event--${e.person.gender || 'male'}`]"
                @click="goPerson(e.person.id)"
              >
                <div class="event-left-badge">
                  <div class="event-type-mark">
                    {{ e.type === 'birth' ? '诞' : '殁' }}
                  </div>
                </div>

                <div class="event-main">
                  <div class="event-meta-line">
                    <span class="event-year">{{ e.year }} 年</span>
                    <span v-if="e.era.fullLabel" class="event-era-tag">{{ e.era.fullLabel }}</span>
                    <span v-if="e.generation" class="event-gen-tag">第 {{ e.generation }} 世</span>
                  </div>

                  <div class="event-desc-line">
                    <strong class="event-name">{{ e.person.name }}</strong>
                    <span class="event-detail">{{ e.type === 'birth' ? '诞生' : '归真' }} · {{ e.label }}</span>
                    <span v-if="e.ageAtDeath !== undefined" class="event-age">享寿 {{ e.ageAtDeath }} 岁</span>
                  </div>
                </div>

                <div class="event-hint">
                  <span>画布定位</span>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                    <polyline points="9 18 15 12 9 6" />
                  </svg>
                </div>
              </div>
            </div>
          </article>
        </section>

        <!-- Mode 2: 先祖长河 (Lifespan Spectrum) -->
        <section v-else-if="viewMode === 'spectrum'" class="spectrum-view">
          <div class="spectrum-intro">
            <p>
              先祖长河图以时空为轴，直观展开每位族人的生平跨度与当代历史朝代对照。
              时空始于 <strong>{{ minYear }}</strong> 年，迄于 <strong>{{ maxYear }}</strong> 年。
            </p>
          </div>

          <div v-if="lifespanItems.length === 0" class="no-match">
            未检索到符合条件的族人生卒数据
          </div>

          <div v-else class="spectrum-list">
            <div
              v-for="item in lifespanItems"
              :key="item.person.id"
              class="spectrum-row"
              @click="goPerson(item.person.id)"
            >
              <div class="spectrum-person">
                <div :class="['spectrum-avatar', `spectrum-avatar--${item.person.gender || 'male'}`]">
                  {{ item.person.name.slice(0, 1) }}
                </div>
                <div class="spectrum-name-col">
                  <strong class="spectrum-name">{{ item.person.name }}</strong>
                  <span class="spectrum-gen">
                    {{ item.generation ? `第${item.generation}世` : '' }}
                    {{ item.lifespan !== null ? `· 享寿${item.lifespan}岁` : '' }}
                  </span>
                </div>
              </div>

              <div class="spectrum-bar-area">
                <div
                  :class="['spectrum-bar', `spectrum-bar--${item.person.gender || 'male'}`]"
                  :style="{
                    left: `${getLifespanBarLeft(item.birthYear)}%`,
                    width: `${getLifespanBarWidth(item)}%`
                  }"
                  :title="`${item.person.name}: ${item.birthYear} — ${item.deathYear ?? '今'}`"
                >
                  <span class="spectrum-bar-text">
                    {{ item.birthYear }}{{ item.deathYear ? `-${item.deathYear}` : '' }}
                  </span>
                </div>
              </div>

              <div class="spectrum-era-label">
                {{ item.era.reign || item.era.dynasty || `${item.birthYear}年` }}
              </div>
            </div>
          </div>
        </section>
      </template>

      <!-- Back to top -->
      <button v-show="showTop" class="top-btn" @click="toTop">↑ 顶部</button>
    </div>
  </div>
</template>

<style scoped>
.timeline-root {
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

.view-switch-pill {
  display: flex;
  gap: 2px;
  padding: 3px;
  border-radius: var(--radius-md, 8px);
  background: var(--color-neutral-3);
  border: 1px solid var(--color-neutral-4);
}

.switch-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 5px 12px;
  border: 0;
  border-radius: var(--radius-sm, 6px);
  background: transparent;
  color: var(--color-neutral-7);
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s ease;
}

.switch-btn:hover {
  color: var(--color-neutral-9);
}

.switch-btn.active {
  background: var(--color-card-fill, var(--color-neutral-2));
  color: var(--color-neutral-10);
  box-shadow: var(--shadow-ring);
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

.hero-text {
  flex: 1;
  min-width: 0;
}

.hero-eyebrow {
  font-size: 11px;
  font-weight: 700;
  color: var(--color-accent);
  letter-spacing: 0.1em;
  text-transform: uppercase;
  margin-bottom: 4px;
}

.hero h1 {
  font-family: var(--font-serif);
  font-size: clamp(24px, 3.2vw, 32px);
  font-weight: 700;
  color: var(--color-neutral-10);
  margin: 0 0 8px;
  letter-spacing: 0.02em;
  line-height: 1.25;
}

.hero-narrative {
  font-family: var(--font-serif);
  font-size: 14px;
  color: var(--color-neutral-7);
  margin: 0;
  line-height: 1.8;
}

.hero-narrative strong {
  color: var(--color-neutral-9);
  font-weight: 700;
}

/* ── Metric Strip ── */
.metric-strip {
  display: flex;
  gap: 32px;
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
  font-size: 26px;
  font-weight: 700;
  color: var(--color-neutral-10);
  line-height: 1;
}

.metric-num small {
  font-size: 14px;
  font-weight: 500;
  color: var(--color-neutral-6);
}

.metric-label {
  font-size: 11px;
  color: var(--color-neutral-6);
  letter-spacing: 0.06em;
  font-weight: 600;
}

/* ── Filter Toolbar ── */
.filter-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 24px;
  flex-wrap: wrap;
}

.filter-pills {
  display: flex;
  gap: 6px;
}

.filter-pill {
  padding: 6px 14px;
  border-radius: var(--radius-sm, 6px);
  border: 1px solid var(--color-neutral-4);
  background: var(--color-card-fill, var(--color-neutral-2));
  color: var(--color-neutral-7);
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s ease;
}

.filter-pill:hover {
  border-color: var(--color-neutral-5);
  background: var(--color-neutral-3);
  color: var(--color-neutral-9);
}

.filter-pill.active {
  background: var(--color-accent);
  color: var(--color-text-on-accent, #fff);
  border-color: var(--color-accent);
}

.filter-right {
  display: flex;
  align-items: center;
  gap: 10px;
}

.gen-select {
  padding: 6px 12px;
  border: 1px solid var(--color-neutral-4);
  border-radius: var(--radius-sm, 6px);
  background: var(--color-card-fill, var(--color-neutral-2));
  color: var(--color-neutral-8);
  font-size: 12px;
  font-weight: 600;
  outline: none;
  color-scheme: light dark;
}

.search-wrap {
  position: relative;
  display: flex;
  align-items: center;
}

.search-icon {
  position: absolute;
  left: 9px;
  color: var(--color-neutral-6);
  pointer-events: none;
}

.timeline-search {
  padding: 6px 10px 6px 28px;
  border: 1px solid var(--color-neutral-4);
  border-radius: var(--radius-sm, 6px);
  background: var(--color-card-fill, var(--color-neutral-2));
  color: var(--color-neutral-9);
  font-size: 12px;
  outline: none;
  width: 170px;
  transition: all 0.15s ease;
  color-scheme: light dark;
}

.timeline-search:focus {
  border-color: var(--color-accent);
  width: 220px;
  box-shadow: 0 0 0 2px var(--color-accent-muted);
}

/* ── Timeline (Chronological Feed) ── */
.timeline {
  position: relative;
  padding-left: 36px;
}

.timeline::before {
  content: '';
  position: absolute;
  left: 11px;
  top: 8px;
  bottom: 12px;
  width: 2px;
  background: linear-gradient(180deg, var(--color-accent), var(--color-neutral-4) 20%, var(--color-neutral-4) 80%, var(--color-accent));
}

.era {
  margin-bottom: 40px;
  position: relative;
}

.era:last-child {
  margin-bottom: 0;
}

.era-head {
  display: flex;
  align-items: flex-start;
  gap: 16px;
  margin-bottom: 18px;
  margin-left: -36px;
  padding-left: 2px;
}

.era-dot {
  flex-shrink: 0;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: var(--color-accent);
  border: 3px solid var(--color-canvas-bg, var(--color-neutral-1));
  box-shadow: 0 0 0 2px var(--color-accent-muted);
  margin-top: 2px;
  transition: border-color 0.25s ease;
}

.era-title-block {
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.era-title-row {
  display: flex;
  align-items: center;
  gap: 10px;
}

.era-head h2 {
  font-family: var(--font-serif);
  font-size: 18px;
  font-weight: 700;
  color: var(--color-neutral-10);
  margin: 0;
}

.dynasty-badge {
  padding: 1px 8px;
  border-radius: var(--radius-sm, 4px);
  background: var(--color-accent-muted);
  border: 1px solid var(--color-accent);
  color: var(--color-accent);
  font-size: 11px;
  font-weight: 700;
}

.era-summary {
  font-size: 12px;
  color: var(--color-neutral-6);
  margin: 0;
}

.era-events {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.event {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 12px 18px;
  border-radius: var(--radius-md, 8px);
  border: 1px solid var(--color-card-stroke, var(--color-neutral-4));
  background: var(--color-card-fill, var(--color-neutral-2));
  cursor: pointer;
  text-align: left;
  transition: all 0.15s ease;
  box-shadow: var(--shadow-whisper);
}

.event:hover {
  background: var(--color-neutral-3);
  border-color: var(--color-accent);
  transform: translateX(4px);
  box-shadow: 0 4px 14px var(--color-accent-muted);
}

.event-left-badge {
  flex-shrink: 0;
}

.event-type-mark {
  width: 28px;
  height: 28px;
  display: grid;
  place-items: center;
  border-radius: var(--radius-sm, 6px);
  font-size: 12.5px;
  font-weight: 700;
  font-family: var(--font-serif);
}

.event--birth .event-type-mark {
  background: var(--color-male-muted);
  color: var(--color-male);
  border: 1px solid var(--color-male);
}

.event--female.event--birth .event-type-mark {
  background: var(--color-female-muted);
  color: var(--color-female);
  border: 1px solid var(--color-female);
}

.event--death .event-type-mark {
  background: var(--color-accent-muted);
  color: var(--color-accent);
  border: 1px solid var(--color-accent);
}

.event-main {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.event-meta-line {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.event-year {
  font-family: var(--font-serif);
  font-size: 15px;
  font-weight: 700;
  color: var(--color-neutral-10);
  font-variant-numeric: tabular-nums;
}

.event-era-tag {
  font-size: 11px;
  color: var(--color-neutral-7);
  background: var(--color-neutral-3);
  padding: 1px 6px;
  border-radius: var(--radius-sm, 4px);
}

.event-gen-tag {
  font-size: 10px;
  font-weight: 600;
  color: var(--color-accent);
  background: var(--color-accent-muted);
  padding: 1px 6px;
  border-radius: var(--radius-sm, 4px);
}

.event-desc-line {
  display: flex;
  align-items: baseline;
  gap: 10px;
  flex-wrap: wrap;
}

.event-name {
  font-size: 14px;
  font-weight: 700;
  color: var(--color-neutral-10);
}

.event-detail {
  font-size: 12.5px;
  color: var(--color-neutral-7);
}

.event-age {
  font-size: 11.5px;
  color: var(--color-accent);
  font-weight: 600;
}

.event-hint {
  display: flex;
  align-items: center;
  gap: 3px;
  font-size: 11px;
  color: var(--color-neutral-6);
  opacity: 0;
  transition: opacity 0.15s ease;
  flex-shrink: 0;
}

.event:hover .event-hint {
  opacity: 1;
  color: var(--color-accent);
}

/* ── Mode 2: 先祖长河 (Lifespan Spectrum) ── */
.spectrum-view {
  background: var(--color-card-fill, var(--color-neutral-2));
  border: 1px solid var(--color-card-stroke, var(--color-neutral-4));
  border-radius: var(--radius-lg, 12px);
  padding: 24px;
  box-shadow: var(--shadow-whisper);
  transition: background-color 0.25s ease, border-color 0.25s ease;
}

.spectrum-intro {
  margin-bottom: 20px;
  padding-bottom: 14px;
  border-bottom: 1px solid var(--color-neutral-3);
}

.spectrum-intro p {
  margin: 0;
  font-size: 13px;
  color: var(--color-neutral-7);
  line-height: 1.6;
}

.spectrum-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.spectrum-row {
  display: grid;
  grid-template-columns: 140px 1fr 130px;
  align-items: center;
  gap: 16px;
  padding: 8px 12px;
  border-radius: var(--radius-md, 8px);
  cursor: pointer;
  transition: background 0.15s ease;
}

.spectrum-row:hover {
  background: var(--color-neutral-3);
}

.spectrum-person {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.spectrum-avatar {
  width: 26px;
  height: 26px;
  display: grid;
  place-items: center;
  border-radius: var(--radius-sm, 6px);
  background: var(--color-male-muted);
  color: var(--color-male);
  border: 1px solid var(--color-male);
  font-family: var(--font-serif);
  font-size: 13px;
  font-weight: 700;
  flex-shrink: 0;
}

.spectrum-avatar--female {
  background: var(--color-female-muted);
  color: var(--color-female);
  border-color: var(--color-female);
}

.spectrum-name-col {
  display: flex;
  flex-direction: column;
  gap: 1px;
  min-width: 0;
}

.spectrum-name {
  font-size: 13px;
  font-weight: 700;
  color: var(--color-neutral-10);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.spectrum-gen {
  font-size: 9.5px;
  color: var(--color-neutral-6);
}

.spectrum-bar-area {
  position: relative;
  height: 20px;
  background: var(--color-neutral-3);
  border-radius: var(--radius-sm, 4px);
}

.spectrum-bar {
  position: absolute;
  top: 2px;
  bottom: 2px;
  min-width: 14px;
  border-radius: 3px;
  background: var(--color-accent-gradient);
  display: flex;
  align-items: center;
  padding: 0 6px;
  overflow: hidden;
  box-shadow: 0 1px 3px var(--color-accent-muted);
}

.spectrum-bar--female {
  background: linear-gradient(145deg, var(--color-female), var(--color-accent));
}

.spectrum-bar-text {
  font-size: 9.5px;
  color: var(--color-text-on-accent, #fff);
  font-weight: 600;
  white-space: nowrap;
  font-variant-numeric: tabular-nums;
}

.spectrum-era-label {
  font-size: 11px;
  color: var(--color-neutral-6);
  text-align: right;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* ── Empty State ── */
.empty-state {
  text-align: center;
  padding: 64px 24px;
  background: var(--color-card-fill, var(--color-neutral-2));
  border: 1px solid var(--color-card-stroke, var(--color-neutral-4));
  border-radius: var(--radius-lg, 12px);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  box-shadow: var(--shadow-whisper);
}

.empty-seal {
  width: 52px;
  height: 52px;
  display: grid;
  place-items: center;
  border-radius: var(--radius-lg, 12px);
  background: var(--color-neutral-3);
  border: 1.5px solid var(--color-neutral-4);
  color: var(--color-neutral-6);
  font-family: var(--font-serif);
  font-size: 26px;
  font-weight: 700;
}

.empty-title {
  font-family: var(--font-serif);
  font-size: 17px;
  font-weight: 700;
  color: var(--color-neutral-10);
  margin: 0;
}

.empty-desc {
  font-size: 13.5px;
  color: var(--color-neutral-7);
  max-width: 440px;
  margin: 0;
  line-height: 1.6;
}

.back-link-btn {
  margin-top: 8px;
  padding: 8px 20px;
  border-radius: var(--radius-md, 8px);
  background: var(--color-accent);
  color: var(--color-text-on-accent, #fff);
  border: none;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s ease;
}

.back-link-btn:hover {
  opacity: 0.9;
  box-shadow: var(--shadow-accent);
}

.no-match {
  text-align: center;
  padding: 36px 0;
  font-size: 13px;
  color: var(--color-neutral-6);
}

/* ── Back to Top ── */
.top-btn {
  position: fixed;
  bottom: 24px;
  right: 28px;
  padding: 7px 14px;
  font-size: 12px;
  font-weight: 600;
  color: var(--color-neutral-8);
  background: var(--color-card-fill, var(--color-neutral-2));
  border: 1px solid var(--color-neutral-4);
  border-radius: var(--radius-md, 8px);
  cursor: pointer;
  box-shadow: var(--shadow-whisper);
  transition: all 0.15s ease;
  z-index: 90;
}

.top-btn:hover {
  background: var(--color-neutral-9);
  color: var(--color-neutral-1);
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
  .metric-strip {
    gap: 16px;
  }
  .spectrum-row {
    grid-template-columns: 110px 1fr 80px;
  }
}
</style>
