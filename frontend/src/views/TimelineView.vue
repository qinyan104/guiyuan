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
    const birthYear = parseYear(person.birth)
    if (birthYear !== null) {
      list.push({
        person,
        year: birthYear,
        exactDate: parseExactDate(person.birth),
        type: 'birth',
        label: person.birth || `${birthYear}年`,
        centuryStart: Math.floor(birthYear / 100) * 100,
      })
    }

    const deathYear = parseYear(person.death)
    if (deathYear !== null) {
      list.push({
        person,
        year: deathYear,
        exactDate: parseExactDate(person.death),
        type: 'death',
        label: person.death || `${deathYear}年`,
        centuryStart: Math.floor(deathYear / 100) * 100,
      })
    }
  }

  return list.sort((left, right) => {
    if (left.exactDate !== right.exactDate) {
      return left.exactDate - right.exactDate
    }

    return left.type === right.type ? 0 : left.type === 'birth' ? -1 : 1
  })
})

const centuryGroups = computed(() => {
  const grouped = new Map<number, TimelineEvent[]>()

  for (const event of events.value) {
    if (!grouped.has(event.centuryStart)) {
      grouped.set(event.centuryStart, [])
    }

    grouped.get(event.centuryStart)!.push(event)
  }

  return Array.from(grouped.entries())
    .sort((a, b) => a[0] - b[0])
    .map(([centuryStart, centuryEvents]) => {
      const births = centuryEvents.filter((event) => event.type === 'birth').length
      const deaths = centuryEvents.filter((event) => event.type === 'death').length
      const distinctPeople = new Set(centuryEvents.map((event) => event.person.id)).size

      return {
        centuryStart,
        centuryEvents,
        births,
        deaths,
        distinctPeople,
      }
    })
})

const totalEvents = computed(() => events.value.length)
const datedPeopleCount = computed(
  () => new Set(events.value.map((event) => event.person.id)).size,
)
const earliestYear = computed(() => (events.value.length > 0 ? events.value[0].year : null))
const latestYear = computed(() =>
  events.value.length > 0 ? events.value[events.value.length - 1].year : null,
)
const timelineSpan = computed(() => {
  if (earliestYear.value === null || latestYear.value === null) return null
  return latestYear.value - earliestYear.value
})

const timelineSummary = computed(() => {
  const parts: string[] = []

  if (earliestYear.value !== null && latestYear.value !== null) {
    parts.push(`时间跨度 ${earliestYear.value}—${latestYear.value} 年`)
  }

  parts.push(`共收录 ${totalEvents.value} 个纪事节点`)
  parts.push(`涉及 ${datedPeopleCount.value} 位有据人物`)

  return parts.join('，') + '。'
})

const showBackToTop = ref(false)

function centuryLabel(startYear: number) {
  return `${Math.floor(startYear / 100) + 1} 世纪 · ${startYear}—${startYear + 99}`
}

function typeLabel(type: TimelineEvent['type']) {
  return type === 'birth' ? '出生' : '去世'
}

function eventMeta(event: TimelineEvent) {
  return event.label === `${event.year}年` ? `${typeLabel(event.type)}记录` : event.label
}

function goToPerson(personId: string) {
  router.push({
    name: 'workbench',
    params: { id: props.publicationId },
    query: { personId },
  })
}

function goBack() {
  router.push({ name: 'workbench', params: { id: props.publicationId } })
}

function onScroll() {
  showBackToTop.value = window.scrollY > 420
}

function scrollToTop() {
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

onMounted(() => {
  window.addEventListener('scroll', onScroll)
})

onBeforeUnmount(() => {
  window.removeEventListener('scroll', onScroll)
})
</script>

<template>
  <div class="timeline-view page-shell" data-testid="timeline-view">
    <header class="timeline-header">
      <button type="button" class="header-back" @click="goBack">返回画布</button>
      <div class="header-copy">
        <p class="header-eyebrow">Family Chronicle</p>
        <h1>家族编年史</h1>
        <p class="header-desc">沿着时间展开人物生卒节点，回看家族脉络如何在年代里延续。</p>
      </div>
    </header>

    <main class="timeline-main">
      <section v-if="events.length === 0" data-testid="timeline-empty" class="empty-panel bento-card">
        <div class="empty-icon">史</div>
        <h2>家族编年史尚未生成</h2>
        <p>补充人物的生卒年份后，这里会自动串起家族的时间脉络。</p>
        <button type="button" class="primary-btn" @click="goBack">前往画布补充</button>
      </section>

      <template v-else>
        <section class="hero-panel bento-card">
          <div class="hero-copy">
            <p class="section-eyebrow">Chronicle Overview</p>
            <h2>{{ pubData.title || '未命名族谱' }}</h2>
            <p class="hero-subtitle">{{ pubData.subtitle || '暂无副题' }}</p>
            <p class="hero-summary">{{ timelineSummary }}</p>
          </div>

          <div class="hero-side">
            <div class="hero-note">
              <span>最早年份</span>
              <strong>{{ earliestYear }}</strong>
            </div>
            <div class="hero-note">
              <span>最近年份</span>
              <strong>{{ latestYear }}</strong>
            </div>
            <div class="hero-note">
              <span>年代跨度</span>
              <strong>{{ timelineSpan ?? 0 }} 年</strong>
            </div>
            <div class="hero-note">
              <span>有据人物</span>
              <strong>{{ datedPeopleCount }} 人</strong>
            </div>
          </div>
        </section>

        <section class="metric-grid">
          <article class="metric-card bento-card">
            <span class="metric-label">纪事节点</span>
            <strong class="metric-value">{{ totalEvents }}</strong>
            <p class="metric-desc">每个生卒时间都会成为一条编年节点。</p>
          </article>

          <article class="metric-card bento-card">
            <span class="metric-label">涉及人物</span>
            <strong class="metric-value">{{ datedPeopleCount }}</strong>
            <p class="metric-desc">至少录入过一个有效年份的人物数量。</p>
          </article>

          <article class="metric-card bento-card">
            <span class="metric-label">时间起点</span>
            <strong class="metric-value">{{ earliestYear }}</strong>
            <p class="metric-desc">当前可追溯到的最早年份。</p>
          </article>

          <article class="metric-card bento-card">
            <span class="metric-label">时间跨度</span>
            <strong class="metric-value">{{ timelineSpan ?? 0 }}</strong>
            <p class="metric-desc">以最早与最晚节点计算的跨度。</p>
          </article>
        </section>

        <section class="timeline-shell">
          <div class="timeline-spine" aria-hidden="true"></div>

          <article
            v-for="group in centuryGroups"
            :key="group.centuryStart"
            class="era-section"
          >
            <div class="era-heading">
              <p class="section-eyebrow">Era</p>
              <h3>{{ centuryLabel(group.centuryStart) }}</h3>
              <p class="era-desc">
                本世纪共记载 {{ group.centuryEvents.length }} 个节点，涉及 {{ group.distinctPeople }}
                位人物，其中出生 {{ group.births }} 次、去世 {{ group.deaths }} 次。
              </p>
            </div>

            <div class="era-events">
              <button
                v-for="event in group.centuryEvents"
                :key="`${event.person.id}-${event.type}-${event.exactDate}`"
                data-testid="timeline-event"
                type="button"
                class="timeline-event bento-card"
                @click="goToPerson(event.person.id)"
              >
                <div class="timeline-event__year">
                  <strong>{{ event.year }}</strong>
                  <span>年</span>
                </div>

                <div class="timeline-event__body">
                  <div class="timeline-event__meta">
                    <span class="event-type" :class="`event-type--${event.type}`">
                      {{ typeLabel(event.type) }}
                    </span>
                    <span class="event-person">{{ event.person.name }}</span>
                  </div>

                  <p class="timeline-event__detail">{{ eventMeta(event) }}</p>
                  <p class="timeline-event__hint">点击返回画布定位此人</p>
                </div>
              </button>
            </div>
          </article>
        </section>
      </template>
    </main>

    <button
      v-show="showBackToTop"
      type="button"
      class="back-to-top"
      @click="scrollToTop"
    >
      回到顶部
    </button>
  </div>
</template>

<style scoped>
.timeline-view {
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

.timeline-header {
  display: flex;
  align-items: flex-start;
  gap: 18px;
}

.header-back,
.primary-btn,
.back-to-top,
.timeline-event {
  transition:
    transform 160ms ease,
    box-shadow 160ms ease,
    background 160ms ease,
    border-color 160ms ease;
}

.header-back,
.primary-btn,
.back-to-top {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 40px;
  padding: 0 16px;
  border-radius: 999px;
  font-size: 0.88rem;
  font-weight: 500;
}

.header-back {
  border: 1px solid var(--color-neutral-5);
  background: var(--color-neutral-2);
  color: var(--color-neutral-9);
  box-shadow: 0 12px 24px color-mix(in srgb, var(--color-neutral-9) 6%, transparent);
}

.header-back:hover,
.primary-btn:hover,
.back-to-top:hover,
.timeline-event:hover {
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
.era-heading h3 {
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
.section-eyebrow,
.metric-label {
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
.era-desc,
.timeline-event__detail,
.timeline-event__hint {
  color: var(--color-neutral-7);
}

.header-desc {
  margin: 0;
  font-size: 0.95rem;
  line-height: 1.7;
}

.timeline-main {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.empty-panel,
.hero-panel,
.metric-card,
.timeline-event {
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

.hero-subtitle,
.hero-summary,
.era-desc,
.metric-desc,
.timeline-event__detail,
.timeline-event__hint {
  margin: 0;
  line-height: 1.8;
}

.hero-side,
.metric-grid {
  display: grid;
  gap: 12px;
}

.hero-side {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.hero-note,
.metric-card {
  display: grid;
  gap: 8px;
}

.hero-note,
.metric-card {
  padding: 18px 20px;
  border-radius: 20px;
  border: 1px solid var(--color-neutral-4);
  background: color-mix(in srgb, var(--color-neutral-1) 88%, transparent);
}

.hero-note span {
  color: var(--color-neutral-6);
  font-size: 0.78rem;
  font-weight: 500;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.hero-note strong,
.metric-value {
  color: var(--color-neutral-9);
}

.hero-note strong {
  font-size: 1rem;
  line-height: 1.5;
}

.metric-grid {
  grid-template-columns: repeat(4, minmax(0, 1fr));
}

.metric-value {
  font-family: 'Noto Serif SC', 'Songti SC', serif;
  font-size: 2rem;
  font-weight: 500;
  line-height: 1;
}

.timeline-shell {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 24px;
  padding-left: 32px;
}

.timeline-spine {
  position: absolute;
  left: 11px;
  top: 12px;
  bottom: 12px;
  width: 2px;
  border-radius: 999px;
  background: color-mix(in srgb, var(--color-accent) 24%, transparent);
}

.era-section {
  position: relative;
  display: grid;
  gap: 16px;
}

.era-heading {
  position: relative;
  padding: 0 0 0 18px;
}

.era-heading::before {
  content: '';
  position: absolute;
  left: -26px;
  top: 6px;
  width: 14px;
  height: 14px;
  border-radius: 999px;
  border: 3px solid var(--color-accent);
  background: var(--color-neutral-1);
  box-shadow: 0 0 0 4px color-mix(in srgb, var(--color-accent) 12%, transparent);
}

.era-heading h3 {
  font-size: 1.35rem;
  line-height: 1.3;
}

.era-events {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.timeline-event {
  display: grid;
  grid-template-columns: 112px minmax(0, 1fr);
  gap: 18px;
  align-items: flex-start;
  width: 100%;
  text-align: left;
  border: 1px solid var(--color-neutral-4);
  background: color-mix(in srgb, var(--color-neutral-1) 90%, transparent);
  box-shadow: 0 18px 28px color-mix(in srgb, var(--color-neutral-9) 6%, transparent);
}

.timeline-event:hover {
  border-color: color-mix(in srgb, var(--color-accent) 42%, transparent);
  box-shadow: 0 20px 32px color-mix(in srgb, var(--color-accent) 10%, transparent);
}

.timeline-event__year {
  display: grid;
  gap: 4px;
  justify-items: end;
  padding-top: 2px;
}

.timeline-event__year strong,
.event-person {
  color: var(--color-neutral-9);
}

.timeline-event__year strong {
  font-family: 'Noto Serif SC', 'Songti SC', serif;
  font-size: 1.8rem;
  font-weight: 500;
  line-height: 1;
}

.timeline-event__year span {
  color: var(--color-neutral-6);
  font-size: 0.8rem;
}

.timeline-event__body {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.timeline-event__meta {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.event-type,
.event-person {
  display: inline-flex;
  align-items: center;
  min-height: 28px;
  border-radius: 999px;
  font-size: 0.8rem;
  font-weight: 800;
}

.event-type {
  padding: 0 10px;
  border: 1px solid transparent;
}

.event-type--birth {
  background: color-mix(in srgb, var(--color-success) 12%, transparent);
  color: var(--color-success);
}

.event-type--death {
  background: color-mix(in srgb, var(--color-warning) 14%, transparent);
  color: var(--color-warning);
}

.event-person {
  padding: 0 12px;
  background: color-mix(in srgb, var(--color-neutral-9) 6%, transparent);
}

.timeline-event__hint {
  color: var(--color-neutral-6);
  font-size: 0.84rem;
}

.back-to-top {
  position: fixed;
  right: 28px;
  bottom: 28px;
  border: 1px solid transparent;
  background: var(--color-accent);
  color: var(--btn-primary-color);
  box-shadow: 0 18px 30px color-mix(in srgb, var(--color-accent) 18%, transparent);
}

@media (max-width: 1180px) {
  .hero-panel,
  .metric-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 760px) {
  .page-shell {
    padding-inline: 18px;
    padding-bottom: 28px;
  }

  .timeline-header {
    flex-direction: column;
  }

  .hero-side {
    grid-template-columns: 1fr;
  }

  .timeline-shell {
    padding-left: 24px;
  }

  .timeline-spine {
    left: 7px;
  }

  .era-heading {
    padding-left: 12px;
  }

  .era-heading::before {
    left: -22px;
  }

  .timeline-event {
    grid-template-columns: 1fr;
  }

  .timeline-event__year {
    justify-items: start;
  }
}
</style>

