<script setup lang="ts">
import { computed, inject, onBeforeUnmount, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { parseExactDate, parseYear } from '../lib/dateUtils'
import { getHistoricalEra, type HistoricalDateInfo } from '../lib/dynastyUtils'
import { PUBLICATION_CONTEXT_KEY, type FamilyUnit, type Person, type PublicationData } from '../types/family'

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
    // Find representative era/dynasty in this century
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
    if (selectedGeneration.value !== null && gen !== selectedGeneration.value) continue
    if (query && !person.name.toLowerCase().includes(query)) continue

    items.push({
      person,
      generation: gen,
      birthYear: by,
      deathYear: dy,
      lifespan: dy !== null && dy >= by ? dy - by : null,
      era: getHistoricalEra(by),
    })
  }
  return items.sort((a, b) => a.birthYear - b.birthYear)
})

const totalEvents = computed(() => allEvents.value.length)
const distinctPeople = computed(() => new Set(allEvents.value.map((e) => e.person.id)).size)
const earliest = computed(() => allEvents.value.length > 0 ? allEvents.value[0].year : null)
const latest = computed(() => allEvents.value.length > 0 ? allEvents.value[allEvents.value.length - 1].year : null)
const span = computed(() => earliest.value && latest.value ? latest.value - earliest.value : null)

function centuryLabel(s: number) {
  const centuryNum = Math.floor(s / 100) + 1
  return `${centuryNum} 世纪 · 公元 ${s}—${s + 99} 年`
}

function goPerson(id: string) {
  router.push({ name: 'workbench', params: { id: props.publicationId }, query: { personId: id } })
}

function goBack() {
  router.push({ name: 'workbench', params: { id: props.publicationId } })
}

const showTop = ref(false)
function onScroll() { showTop.value = window.scrollY > 420 }
function toTop() { window.scrollTo({ top: 0, behavior: 'smooth' }) }
onMounted(() => window.addEventListener('scroll', onScroll))
onBeforeUnmount(() => window.removeEventListener('scroll', onScroll))
</script>

<template>
  <div class="timeline-root" data-testid="timeline-view">
    <!-- Top Action Row -->
    <div class="top-nav">
      <button class="back-btn" @click="goBack">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
          <line x1="19" y1="12" x2="5" y2="12" />
          <polyline points="12 19 5 12 12 5" />
        </svg>
        返回画布
      </button>

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
          编年史卷
        </button>
        <button
          type="button"
          :class="['switch-btn', { active: viewMode === 'spectrum' }]"
          @click="viewMode = 'spectrum'"
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="4" y1="6" x2="20" y2="6" /><line x1="4" y1="12" x2="16" y2="12" /><line x1="8" y1="18" x2="20" y2="18" />
          </svg>
          先祖长河
        </button>
      </div>
    </div>

    <!-- Hero Section -->
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
                共 {{ g.events.length }} 个节点 · 涉及 {{ g.people }} 位先祖 · 诞 {{ g.births }} · 殁 {{ g.deaths }}
              </p>
            </div>
          </header>

          <div class="era-events">
            <button
              v-for="e in g.events"
              :key="`${e.person.id}-${e.type}-${e.exactDate}`"
              class="event"
              :class="`event--${e.type}`"
              @click="goPerson(e.person.id)"
            >
              <div class="event-left-badge">
                <span class="event-type-mark">{{ e.type === 'birth' ? '生' : '卒' }}</span>
              </div>

              <div class="event-main">
                <div class="event-meta-line">
                  <span class="event-year">{{ e.year }} 年</span>
                  <span class="event-era-tag">{{ e.era.fullLabel }}</span>
                  <span v-if="e.generation" class="event-gen-tag">第 {{ e.generation }} 世</span>
                </div>

                <div class="event-desc-line">
                  <strong class="event-name">{{ e.person.name }}</strong>
                  <span class="event-detail">{{ e.label }}</span>
                  <span v-if="e.ageAtDeath !== undefined" class="event-age">享寿 {{ e.ageAtDeath }} 岁</span>
                </div>
              </div>

              <div class="event-hint">
                <span>画布定位</span>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </div>
            </button>
          </div>
        </article>
      </section>

      <!-- Mode 2: 先祖长河 (Lifespan Spectrum) -->
      <section v-else class="spectrum-view">
        <div class="spectrum-intro">
          <p>横向时空长卷呈现先祖生卒年代跨度。每一条光带代表一位先祖的毕生岁月，可清晰洞察同辈先祖的历史交集。</p>
        </div>

        <div class="spectrum-list">
          <div
            v-for="item in lifespanItems"
            :key="item.person.id"
            class="spectrum-row"
            @click="goPerson(item.person.id)"
          >
            <div class="spectrum-person">
              <span class="spectrum-avatar">{{ item.person.name.charAt(0) }}</span>
              <div class="spectrum-name-col">
                <strong class="spectrum-name">{{ item.person.name }}</strong>
                <span v-if="item.generation" class="spectrum-gen">第 {{ item.generation }} 世</span>
              </div>
            </div>

            <div class="spectrum-bar-area">
              <div
                class="spectrum-bar"
                :style="{
                  left: `${((item.birthYear - (earliest ?? 0)) / Math.max(1, span ?? 1)) * 100}%`,
                  width: `${Math.max(2.5, ((item.deathYear ? item.deathYear - item.birthYear : 20) / Math.max(1, span ?? 1)) * 100)}%`,
                }"
              >
                <span class="spectrum-bar-text">
                  {{ item.birthYear }} — {{ item.deathYear ?? '今' }}
                  <template v-if="item.lifespan !== null">({{ item.lifespan }}岁)</template>
                </span>
              </div>
            </div>

            <span class="spectrum-era-label">{{ item.era.shortLabel }}</span>
          </div>
        </div>
      </section>
    </template>

    <!-- Back to top -->
    <button v-show="showTop" class="top-btn" @click="toTop">↑ 顶部</button>
  </div>
</template>

<style scoped>
.timeline-root {
  max-width: 920px;
  margin: 0 auto;
  padding: 48px clamp(16px, 3.5vw, 40px) 80px;
  position: relative;
  color: var(--color-neutral-9);
}

.top-nav {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 32px;
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

.view-switch-pill {
  display: flex;
  gap: 2px;
  padding: 3px;
  border-radius: 8px;
  background: var(--fill-subtle, rgba(122, 95, 65, 0.08));
  border: 1px solid var(--line-subtle, rgba(122, 95, 65, 0.1));
}

.switch-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 5px 12px;
  border: 0;
  border-radius: 6px;
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
  background: #fff;
  color: var(--color-neutral-10);
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.08);
}

/* ── Hero ── */
.hero {
  display: flex;
  align-items: flex-start;
  gap: 20px;
  margin-bottom: 36px;
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

.hero-text {
  flex: 1;
}

.hero-eyebrow {
  font-size: 11px;
  font-weight: 700;
  color: #a93426;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  margin-bottom: 4px;
}

.hero h1 {
  font-family: var(--font-serif, "Noto Serif SC", serif);
  font-size: clamp(26px, 3.5vw, 36px);
  font-weight: 700;
  color: var(--color-neutral-10);
  margin: 0 0 10px;
  letter-spacing: 0.02em;
  line-height: 1.25;
}

.hero-narrative {
  font-family: var(--font-serif, "Noto Serif SC", serif);
  font-size: 14.5px;
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
  padding: 24px 28px;
  background: var(--bg-paper-raised, #ffffff);
  border: 1px solid var(--line-soft, rgba(122, 95, 65, 0.16));
  border-radius: 12px;
  margin-bottom: 36px;
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
  font-size: 26px;
  font-weight: 700;
  color: var(--color-neutral-9);
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
  margin-bottom: 28px;
  flex-wrap: wrap;
}

.filter-pills {
  display: flex;
  gap: 6px;
}

.filter-pill {
  padding: 5px 12px;
  border-radius: 6px;
  border: 1px solid var(--line-soft, rgba(122, 95, 65, 0.15));
  background: var(--bg-paper, #ffffff);
  color: var(--color-neutral-7);
  font-size: 11.5px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s ease;
}

.filter-pill:hover {
  border-color: var(--line-medium, rgba(122, 95, 65, 0.35));
}

.filter-pill.active {
  background: #241a10;
  color: #fff;
  border-color: #241a10;
}

.filter-right {
  display: flex;
  align-items: center;
  gap: 10px;
}

.gen-select {
  padding: 5px 10px;
  border: 1px solid var(--line-soft, rgba(122, 95, 65, 0.2));
  border-radius: 6px;
  background: #fff;
  color: var(--color-neutral-8);
  font-size: 11.5px;
  font-weight: 600;
  outline: none;
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
  padding: 5px 10px 5px 28px;
  border: 1px solid var(--line-soft, rgba(122, 95, 65, 0.2));
  border-radius: 6px;
  background: #fff;
  color: var(--color-neutral-9);
  font-size: 11.5px;
  outline: none;
  width: 170px;
  transition: all 0.15s ease;
}

.timeline-search:focus {
  border-color: #a93426;
  width: 220px;
  box-shadow: 0 0 0 2px rgba(169, 52, 38, 0.12);
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
  background: linear-gradient(180deg, rgba(169, 52, 38, 0.4), rgba(122, 95, 65, 0.2) 20%, rgba(122, 95, 65, 0.2) 80%, rgba(169, 52, 38, 0.4));
}

.era {
  margin-bottom: 44px;
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
  background: #a93426;
  border: 3px solid var(--bg-paper, #fcfbfa);
  box-shadow: 0 0 0 2px rgba(169, 52, 38, 0.25);
  margin-top: 2px;
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
  font-family: var(--font-serif, "Noto Serif SC", serif);
  font-size: 18px;
  font-weight: 700;
  color: var(--color-neutral-10);
  margin: 0;
}

.dynasty-badge {
  padding: 1px 8px;
  border-radius: 4px;
  background: rgba(169, 52, 38, 0.08);
  border: 1px solid rgba(169, 52, 38, 0.2);
  color: #a93426;
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
  border-radius: 10px;
  border: 1px solid var(--line-subtle, rgba(122, 95, 65, 0.12));
  background: var(--bg-paper-raised, #ffffff);
  cursor: pointer;
  text-align: left;
  transition: all 0.15s ease;
  box-shadow: 0 1px 4px rgba(24, 18, 12, 0.03);
}

.event:hover {
  background: #fff;
  border-color: #a93426;
  transform: translateX(4px);
  box-shadow: 0 4px 14px rgba(169, 52, 38, 0.08);
}

.event-left-badge {
  flex-shrink: 0;
}

.event-type-mark {
  width: 28px;
  height: 28px;
  display: grid;
  place-items: center;
  border-radius: 7px;
  font-size: 12.5px;
  font-weight: 700;
  font-family: var(--font-serif, "Noto Serif SC", serif);
}

.event--birth .event-type-mark {
  background: rgba(46, 125, 90, 0.1);
  color: #237452;
  border: 1px solid rgba(46, 125, 90, 0.25);
}

.event--death .event-type-mark {
  background: rgba(169, 52, 38, 0.1);
  color: #a93426;
  border: 1px solid rgba(169, 52, 38, 0.25);
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
  font-family: var(--font-serif, "Noto Serif SC", serif);
  font-size: 15px;
  font-weight: 700;
  color: var(--color-neutral-10);
  font-variant-numeric: tabular-nums;
}

.event-era-tag {
  font-size: 11px;
  color: var(--color-neutral-6);
  background: rgba(122, 95, 65, 0.06);
  padding: 1px 6px;
  border-radius: 4px;
}

.event-gen-tag {
  font-size: 10px;
  font-weight: 600;
  color: #a93426;
  background: rgba(169, 52, 38, 0.06);
  padding: 1px 6px;
  border-radius: 4px;
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
  color: var(--color-neutral-9);
}

.event-detail {
  font-size: 12.5px;
  color: var(--color-neutral-6);
}

.event-age {
  font-size: 11.5px;
  color: #a93426;
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
  color: #a93426;
}

/* ── Mode 2: 先祖长河 (Lifespan Spectrum) ── */
.spectrum-view {
  background: var(--bg-paper-raised, #ffffff);
  border: 1px solid var(--line-soft, rgba(122, 95, 65, 0.16));
  border-radius: 12px;
  padding: 24px;
  box-shadow: 0 4px 16px rgba(24, 18, 12, 0.04);
}

.spectrum-intro {
  margin-bottom: 20px;
  padding-bottom: 14px;
  border-bottom: 1px solid var(--line-subtle, rgba(122, 95, 65, 0.1));
}

.spectrum-intro p {
  margin: 0;
  font-size: 12.5px;
  color: var(--color-neutral-6);
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
  border-radius: 8px;
  cursor: pointer;
  transition: background 0.15s ease;
}

.spectrum-row:hover {
  background: rgba(169, 52, 38, 0.04);
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
  border-radius: 6px;
  background: rgba(169, 52, 38, 0.08);
  color: #a93426;
  font-family: var(--font-serif, "Noto Serif SC", serif);
  font-size: 13px;
  font-weight: 700;
  flex-shrink: 0;
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
  color: var(--color-neutral-9);
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
  background: rgba(122, 95, 65, 0.06);
  border-radius: 4px;
}

.spectrum-bar {
  position: absolute;
  top: 2px;
  bottom: 2px;
  min-width: 14px;
  border-radius: 3px;
  background: linear-gradient(90deg, #a93426, #c5574a);
  display: flex;
  align-items: center;
  padding: 0 6px;
  overflow: hidden;
  box-shadow: 0 1px 3px rgba(169, 52, 38, 0.2);
}

.spectrum-bar-text {
  font-size: 9.5px;
  color: #fff;
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
  background: var(--bg-paper-raised, #ffffff);
  border: 1px solid var(--line-soft, rgba(122, 95, 65, 0.16));
  border-radius: 12px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
}

.empty-seal {
  width: 52px;
  height: 52px;
  display: grid;
  place-items: center;
  border-radius: 14px;
  background: rgba(169, 52, 38, 0.06);
  border: 1.5px solid rgba(169, 52, 38, 0.2);
  color: #a93426;
  font-family: var(--font-serif, "Noto Serif SC", serif);
  font-size: 26px;
  font-weight: 700;
}

.empty-title {
  margin: 0;
  font-family: var(--font-serif, "Noto Serif SC", serif);
  font-size: 18px;
  font-weight: 700;
  color: var(--color-neutral-9);
}

.empty-desc {
  margin: 0;
  font-size: 13px;
  color: var(--color-neutral-6);
  max-width: 420px;
  line-height: 1.7;
}

.back-link-btn {
  margin-top: 8px;
  padding: 8px 20px;
  border: 0;
  border-radius: 7px;
  background: #241a10;
  color: #fff;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s ease;
}

.back-link-btn:hover {
  background: #382b1d;
  transform: translateY(-1px);
}

.no-match {
  text-align: center;
  padding: 40px 0;
  font-size: 13px;
  color: var(--color-neutral-6);
}

/* ── Back to top ── */
.top-btn {
  position: fixed;
  right: 28px;
  bottom: 28px;
  padding: 9px 16px;
  border-radius: 8px;
  background: #241a10;
  color: #fff;
  border: none;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  box-shadow: 0 4px 14px rgba(0, 0, 0, 0.18);
  transition: all 0.15s ease;
  z-index: 20;
}

.top-btn:hover {
  background: #3c2d1e;
  transform: translateY(-2px);
}

@media (max-width: 640px) {
  .spectrum-row {
    grid-template-columns: 90px 1fr;
  }
  .spectrum-era-label {
    display: none;
  }
}
</style>
