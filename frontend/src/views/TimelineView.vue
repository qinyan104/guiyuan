<script setup lang="ts">
import { computed, inject, onBeforeUnmount, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { parseExactDate, parseYear } from '../lib/dateUtils'
import { PUBLICATION_CONTEXT_KEY, type Person } from '../types/family'

const props = defineProps<{ publicationId: number }>()
const router = useRouter()
const context = inject(PUBLICATION_CONTEXT_KEY)!
const pubData = computed(() => context.pub.publication)

interface TimelineEvent {
  person: Person
  year: number
  exactDate: number
  type: 'birth' | 'death'
  label: string
  centuryStart: number
}

const events = computed<TimelineEvent[]>(() => {
  const list: TimelineEvent[] = []
  for (const person of Object.values(pubData.value.people ?? {}) as Person[]) {
    const by = parseYear(person.birth)
    if (by !== null) list.push({ person, year: by, exactDate: parseExactDate(person.birth), type: 'birth', label: person.birth || `${by}年`, centuryStart: Math.floor(by / 100) * 100 })
    const dy = parseYear(person.death)
    if (dy !== null) list.push({ person, year: dy, exactDate: parseExactDate(person.death), type: 'death', label: person.death || `${dy}年`, centuryStart: Math.floor(dy / 100) * 100 })
  }
  return list.sort((a, b) => a.exactDate !== b.exactDate ? a.exactDate - b.exactDate : a.type === 'birth' ? -1 : 1)
})

const centuryGroups = computed(() => {
  const g = new Map<number, TimelineEvent[]>()
  for (const e of events.value) {
    if (!g.has(e.centuryStart)) g.set(e.centuryStart, [])
    g.get(e.centuryStart)!.push(e)
  }
  return Array.from(g.entries()).sort((a, b) => a[0] - b[0]).map(([cs, evts]) => {
    const births = evts.filter((e) => e.type === 'birth').length
    const deaths = evts.filter((e) => e.type === 'death').length
    const people = new Set(evts.map((e) => e.person.id)).size
    return { centuryStart: cs, events: evts, births, deaths, people }
  })
})

const totalEvents = computed(() => events.value.length)
const distinctPeople = computed(() => new Set(events.value.map((e) => e.person.id)).size)
const earliest = computed(() => events.value.length > 0 ? events.value[0].year : null)
const latest = computed(() => events.value.length > 0 ? events.value[events.value.length - 1].year : null)
const span = computed(() => earliest.value && latest.value ? latest.value - earliest.value : null)

function centuryLabel(s: number) { return `${Math.floor(s / 100) + 1} 世纪 · ${s}—${s + 99}` }
function typeChar(t: TimelineEvent['type']) { return t === 'birth' ? '生' : '卒' }

function goPerson(id: string) { router.push({ name: 'workbench', params: { id: props.publicationId }, query: { personId: id } }) }
function goBack() { router.push({ name: 'workbench', params: { id: props.publicationId } }) }

const showTop = ref(false)
function onScroll() { showTop.value = window.scrollY > 420 }
function toTop() { window.scrollTo({ top: 0, behavior: 'smooth' }) }
onMounted(() => window.addEventListener('scroll', onScroll))
onBeforeUnmount(() => window.removeEventListener('scroll', onScroll))
</script>

<template>
  <div class="timeline-root" data-testid="timeline-view">
    <button class="back-link" @click="goBack">← 画布</button>

    <header class="hero">
      <h1>{{ pubData.title || '未命名族谱' }}</h1>
      <p class="hero-narrative" v-if="earliest && latest">
        自 {{ earliest }} 年至 {{ latest }} 年，跨 {{ span }} 年，
        收录 {{ totalEvents }} 个纪事节点，涉及 {{ distinctPeople }} 位族人。
      </p>
      <p class="hero-narrative" v-else>补充人物生卒年份后，编年史将在此展开。</p>
    </header>

    <section class="metric-strip" v-if="events.length > 0">
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
        <span class="metric-label">最早年份</span>
      </div>
      <div class="metric-item" v-if="span !== null">
        <span class="metric-num">{{ span }}</span>
        <span class="metric-label">年跨度</span>
      </div>
    </section>

    <div v-if="events.length === 0" class="empty-state">
      <p>补充人物生卒年份后，编年史将在此徐徐展开。</p>
      <button class="back-link" @click="goBack">前往画布补充</button>
    </div>

    <section v-else class="timeline">
      <article v-for="g in centuryGroups" :key="g.centuryStart" class="era">
        <header class="era-head">
          <div class="era-dot"></div>
          <div>
            <h2>{{ centuryLabel(g.centuryStart) }}</h2>
            <p class="era-summary">{{ g.events.length }} 节点 · {{ g.people }} 人 · 生 {{ g.births }} 卒 {{ g.deaths }}</p>
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
            <span class="event-year">{{ e.year }}</span>
            <span class="event-type">{{ typeChar(e.type) }}</span>
            <span class="event-name">{{ e.person.name }}</span>
            <span class="event-detail">{{ e.label }}</span>
            <span class="event-hint">点击定位</span>
          </button>
        </div>
      </article>
    </section>



    <button v-show="showTop" class="top-btn" @click="toTop">↑ 顶部</button>
  </div>
</template>

<style scoped>
.timeline-root {
  max-width: 880px;
  margin: 0 auto;
  padding: 60px clamp(20px, 4vw, 48px) 80px;
  position: relative;
}

.back-link {
  display: inline-block;
  margin-bottom: 40px;
  font-size: var(--text-copy-13);
  color: var(--color-neutral-6);
  background: none;
  border: none;
  cursor: pointer;
  transition: color var(--duration-fast) var(--ease-breath);
}
.back-link:hover { color: var(--color-neutral-9); }

/* ── Hero ── */
.hero { margin-bottom: 48px; }
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
  margin: 0;
  line-height: 1.8;
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
.metric-item { display: flex; flex-direction: column; gap: 4px; }
.metric-num { font-family: var(--font-serif); font-size: var(--text-title-28); font-weight: 400; color: var(--color-neutral-9); line-height: 1; }
.metric-label { font-size: var(--text-label-12); color: var(--color-neutral-6); letter-spacing: 0.08em; }

/* ── Empty ── */
.empty-state { text-align: center; padding: 64px 0; color: var(--color-neutral-6); }

/* ── Timeline ── */
.timeline { position: relative; padding-left: 32px; }
.timeline::before {
  content: '';
  position: absolute;
  left: 8px; top: 0; bottom: 0;
  width: 1px;
  background: var(--color-neutral-4);
}

.era { margin-bottom: 48px; position: relative; }
.era:last-child { margin-bottom: 0; }

.era-head {
  display: flex;
  align-items: flex-start;
  gap: 18px;
  margin-bottom: 20px;
  margin-left: -32px;
  padding-left: 22px;
}
.era-dot {
  flex-shrink: 0;
  width: 14px; height: 14px;
  border-radius: 50%;
  background: var(--color-accent);
  border: 3px solid var(--color-neutral-1);
  margin-top: 5px;
  margin-left: -7px;
  box-shadow: 0 0 0 3px var(--color-accent-muted);
}
.era-head h2 {
  font-family: var(--font-serif);
  font-size: var(--text-title-20);
  font-weight: 400;
  color: var(--color-neutral-10);
  margin: 0 0 4px;
}
.era-summary {
  font-size: var(--text-copy-13);
  color: var(--color-neutral-6);
  margin: 0;
}

/* ── Events ── */
.era-events { display: flex; flex-direction: column; gap: 8px; }

.event {
  display: grid;
  grid-template-columns: 4em 2em 1fr auto auto;
  align-items: center;
  gap: 12px;
  padding: 10px 16px;
  border-radius: var(--radius-md);
  border: none;
  background: var(--color-neutral-2);
  cursor: pointer;
  text-align: left;
  transition: background var(--duration-fast) var(--ease-breath);
}
.event:hover { background: var(--color-neutral-3); }

.event-year {
  font-family: var(--font-serif);
  font-size: var(--text-copy-16);
  font-weight: 400;
  color: var(--color-neutral-9);
}
.event-type {
  font-size: var(--text-label-12);
  font-weight: 600;
  padding: 2px 8px;
  border-radius: var(--radius-sm);
  text-align: center;
}
.event--birth .event-type { background: var(--color-male-muted); color: var(--color-male); }
.event--death .event-type { background: var(--color-female-muted); color: var(--color-female); }

.event-name {
  font-size: var(--text-copy-14);
  color: var(--color-neutral-9);
  font-weight: 500;
}
.event-detail {
  font-size: var(--text-copy-13);
  color: var(--color-neutral-6);
}
.event-hint {
  font-size: var(--text-caption-10);
  color: var(--color-neutral-6);
  opacity: 0;
  transition: opacity var(--duration-fast);
}
.event:hover .event-hint { opacity: 1; }


/* ── Back to top ── */
.top-btn {
  position: fixed;
  right: 28px; bottom: 28px;
  padding: 10px 16px;
  border-radius: var(--radius-md);
  background: var(--color-neutral-9);
  color: var(--color-neutral-1);
  border: none;
  font-size: var(--text-copy-13);
  cursor: pointer;
  transition: opacity var(--duration-fast);
}
.top-btn:hover { opacity: 0.8; }

@media (max-width: 640px) {
  .event { grid-template-columns: 3em 1.5em 1fr; }
  .event-detail, .event-hint { display: none; }
}
</style>
