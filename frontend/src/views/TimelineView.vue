<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { getPublication, type PublicationLoadResult } from '../api/publication'
import type { Person, PublicationData } from '../types/family'

const props = defineProps<{ publicationId: number }>()
const router = useRouter()

const loading = ref(true)
const pubData = ref<PublicationData | null>(null)

async function load() {
  loading.value = true
  try {
    const result: PublicationLoadResult = await getPublication(props.publicationId)
    pubData.value = result.publication
  } catch { /* ignore */ }
  finally { loading.value = false }
}

onMounted(load)

function parseYear(s?: string): number | null {
  if (!s) return null
  const m = s.match(/\d{3,4}/)
  return m ? parseInt(m[0]) : null
}

interface TimelineEvent {
  year: number
  label: string
  person: Person
  type: 'birth' | 'death'
  century: number
}

const events = computed<TimelineEvent[]>(() => {
  if (!pubData.value) return []
  const list: TimelineEvent[] = []
  for (const p of Object.values(pubData.value.people)) {
    const by = parseYear(p.birth)
    if (by) {
      list.push({ year: by, label: p.birth!, person: p, type: 'birth', century: Math.floor(by / 100) * 100 })
    }
    const dy = parseYear(p.death)
    if (dy) {
      list.push({ year: dy, label: p.death!, person: p, type: 'death', century: Math.floor(dy / 100) * 100 })
    }
  }
  return list.sort((a, b) => a.year - b.year || a.type.localeCompare(b.type))
})

const centuries = computed(() => {
  const map = new Map<number, TimelineEvent[]>()
  for (const e of events.value) {
    if (!map.has(e.century)) map.set(e.century, [])
    map.get(e.century)!.push(e)
  }
  return Array.from(map.entries()).sort((a, b) => a[0] - b[0])
})

const totalEvents = computed(() => events.value.length)
const earliestYear = computed(() => events.value.length ? events.value[0].year : null)
const latestYear = computed(() => events.value.length ? events.value[events.value.length - 1].year : null)

function centuryLabel(c: number): string {
  return `${c}~${c + 99}年`
}

function personGenderClass(p: Person): string {
  if (p.gender === 'male') return 'tl-person tl-person--male'
  if (p.gender === 'female') return 'tl-person tl-person--female'
  return 'tl-person'
}

function goToPerson(personId: string) {
  router.push({ name: 'person-detail', params: { pubId: props.publicationId, personId } })
}

function goBack() {
  router.push({ name: 'workbench', params: { id: props.publicationId } })
}
</script>

<template>
  <div class="timeline-page">
    <header class="timeline-nav">
      <button class="nav-back" @click="goBack">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polyline points="15 18 9 12 15 6"/></svg>
        返回工作台
      </button>
      <h1 class="timeline-nav__title">家族时间线</h1>
      <div></div>
    </header>

    <div v-if="loading" class="loading-state">加载中...</div>

    <main v-else class="timeline-content">
      <div class="timeline-summary">
        <div class="tl-summary-card">
          <span class="tl-summary-num">{{ totalEvents }}</span>
          <span class="tl-summary-label">历史事件</span>
        </div>
        <div class="tl-summary-card" v-if="earliestYear">
          <span class="tl-summary-num">{{ earliestYear }}</span>
          <span class="tl-summary-label">最早年份</span>
        </div>
        <div class="tl-summary-card" v-if="latestYear">
          <span class="tl-summary-num">{{ latestYear }}</span>
          <span class="tl-summary-label">最晚年份</span>
        </div>
      </div>

      <div v-if="events.length === 0" class="empty-state">暂无生卒年数据，无法生成时间线</div>

      <div v-else class="timeline">
        <div v-for="[century, centuryEvents] in centuries" :key="century" class="tl-century">
          <div class="tl-century__header">
            <span class="tl-century__label">{{ centuryLabel(century) }}</span>
            <span class="tl-century__count">{{ centuryEvents.length }} 件</span>
          </div>

          <div class="tl-century__track">
            <div class="tl-century__line"></div>
            <div
              v-for="(event, idx) in centuryEvents"
              :key="idx"
              class="tl-event"
              @click="goToPerson(event.person.id)"
            >
              <div class="tl-event__dot" :class="event.type === 'birth' ? 'tl-event__dot--birth' : 'tl-event__dot--death'"></div>
              <div class="tl-event__content">
                <div class="tl-event__year">{{ event.year }}年</div>
                <div class="tl-event__info">
                  <span :class="personGenderClass(event.person)">{{ event.person.name }}</span>
                  <span class="tl-event__type" :class="event.type === 'birth' ? 'tl-event__type--birth' : 'tl-event__type--death'">
                    {{ event.type === 'birth' ? '出生' : '去世' }}
                  </span>
                </div>
                <div v-if="event.label !== event.year + '年'" class="tl-event__date">{{ event.label }}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  </div>
</template>

<style scoped>
.timeline-page {
  min-height: 100vh;
  background: var(--bg-shell, #f5f0e8);
}

.timeline-nav {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 2rem;
  height: 52px;
  background: var(--bg-panel, rgba(255,255,255,0.85));
  border-bottom: 1px solid var(--border-color, rgba(0,0,0,0.06));
  backdrop-filter: blur(12px);
  position: sticky;
  top: 0;
  z-index: 50;
}

.nav-back {
  display: flex;
  align-items: center;
  gap: 0.3rem;
  background: none;
  border: none;
  color: var(--text-sub, #555);
  font-size: 0.82rem;
  font-weight: 600;
  cursor: pointer;
  padding: 0.3rem 0.5rem;
  border-radius: 6px;
  transition: color 0.15s, background 0.15s;
}

.nav-back:hover {
  color: var(--text-main, #1a1a1a);
  background: var(--bg-hover, rgba(0,0,0,0.04));
}

.timeline-nav__title {
  font-size: 1rem;
  font-weight: 700;
  color: var(--text-main, #1a1a1a);
  margin: 0;
}

.loading-state {
  text-align: center;
  padding: 4rem;
  color: var(--text-soft, #888);
}

.empty-state {
  text-align: center;
  padding: 4rem;
  color: var(--text-soft, #888);
  font-size: 0.9rem;
}

.timeline-content {
  max-width: 800px;
  margin: 0 auto;
  padding: 1.5rem 2rem 3rem;
}

/* ── Summary ── */
.timeline-summary {
  display: flex;
  gap: 0.75rem;
  margin-bottom: 2rem;
}

.tl-summary-card {
  background: var(--bg-panel, #fff);
  border: 1px solid var(--border-color, rgba(0,0,0,0.06));
  border-radius: 12px;
  padding: 1rem 1.25rem;
  flex: 1;
  text-align: center;
}

.tl-summary-num {
  display: block;
  font-size: 1.4rem;
  font-weight: 800;
  color: var(--text-main, #1a1a1a);
  line-height: 1.2;
}

.tl-summary-label {
  font-size: 0.72rem;
  color: var(--text-soft, #888);
  font-weight: 600;
}

/* ── Timeline ── */
.timeline {
  display: flex;
  flex-direction: column;
  gap: 2rem;
}

.tl-century__header {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 1rem;
}

.tl-century__label {
  font-size: 1rem;
  font-weight: 800;
  color: var(--text-main, #1a1a1a);
  font-family: 'Noto Serif SC', serif;
}

.tl-century__count {
  font-size: 0.72rem;
  font-weight: 600;
  color: var(--text-soft, #888);
  background: var(--bg-panel, #fff);
  padding: 0.15rem 0.5rem;
  border-radius: 999px;
}

.tl-century__track {
  position: relative;
  padding-left: 28px;
  display: flex;
  flex-direction: column;
  gap: 0;
}

.tl-century__line {
  position: absolute;
  left: 7px;
  top: 0;
  bottom: 0;
  width: 2px;
  background: var(--border-color, rgba(0,0,0,0.1));
}

/* ── Event ── */
.tl-event {
  position: relative;
  padding: 0.6rem 0 0.6rem 1rem;
  cursor: pointer;
  transition: all 0.2s;
  border-radius: 10px;
}

.tl-event:hover {
  background: var(--bg-hover, rgba(0,0,0,0.03));
  transform: translateX(4px);
}

.tl-event__dot {
  position: absolute;
  left: -28px;
  top: 0.85rem;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  border: 3px solid var(--bg-shell, #f5f0e8);
  z-index: 1;
}

.tl-event__dot--birth {
  background: #16a34a;
}

.tl-event__dot--death {
  background: #6b7280;
}

.tl-event__content {
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
}

.tl-event__year {
  font-size: 0.85rem;
  font-weight: 700;
  color: var(--text-main, #1a1a1a);
}

.tl-event__info {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.tl-person {
  font-size: 0.88rem;
  font-weight: 600;
  color: var(--text-main, #1a1a1a);
}

.tl-person--male {
  color: #3b82f6;
}

.tl-person--female {
  color: #ec4899;
}

.tl-event__type {
  font-size: 0.68rem;
  font-weight: 700;
  padding: 0.1rem 0.45rem;
  border-radius: 999px;
}

.tl-event__type--birth {
  background: rgba(22, 163, 74, 0.1);
  color: #16a34a;
}

.tl-event__type--death {
  background: rgba(107, 114, 128, 0.12);
  color: #6b7280;
}

.tl-event__date {
  font-size: 0.72rem;
  color: var(--text-soft, #aaa);
}

@media (max-width: 600px) {
  .timeline-content { padding: 1rem; }
  .timeline-summary { flex-direction: column; }
}
</style>
