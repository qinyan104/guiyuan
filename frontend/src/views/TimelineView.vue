<script setup lang="ts">
import { computed, onMounted, ref, inject } from 'vue'
import { useRouter } from 'vue-router'
import type { Person } from '../types/family'

const props = defineProps<{ publicationId: number }>()
const router = useRouter()

// ─── Shared Context ─────────────────────────────────────────────
const { pub } = inject('publication-context') as any
const pubData = computed(() => pub.publication)

function parseYear(s?: string): number | null {
  if (!s) return null
  const m = s.match(/\d{3,4}/)
  return m ? parseInt(m[0]) : null
}

/**
 * Returns a numeric representation for comparison: Year + (Month/100) + (Day/10000)
 * Supports: YYYY, YYYY-MM, YYYY-MM-DD, YYYY年M月D日, etc.
 */
function parseExactDate(s?: string): number {
  if (!s) return 0
  const yearMatch = s.match(/(\d{3,4})/)
  if (!yearMatch) return 0
  
  const year = parseInt(yearMatch[0])
  let month = 0
  let day = 0

  const afterYear = s.substring(yearMatch.index! + yearMatch[0].length)
  // Match month: look for a separator followed by 1-2 digits
  const monthMatch = afterYear.match(/[年\-\/\. ]\s*(\d{1,2})/)
  if (monthMatch) {
    const m = parseInt(monthMatch[1])
    if (m >= 1 && m <= 12) {
      month = m
      const afterMonth = afterYear.substring(monthMatch.index! + monthMatch[0].length)
      // Match day: look for a separator followed by 1-2 digits
      const dayMatch = afterMonth.match(/[月\-\/\. ]\s*(\d{1,2})/)
      if (dayMatch) {
        const d = parseInt(dayMatch[1])
        if (d >= 1 && d <= 31) {
          day = d
        }
      }
    }
  }
  return year + (month / 100) + (day / 10000)
}

interface TimelineEvent {
  year: number
  exactDate: number
  label: string
  person: Person
  type: 'birth' | 'death'
  century: number
}

const events = computed<TimelineEvent[]>(() => {
  if (!pubData.value) return []
  const list: TimelineEvent[] = []
  const people = Object.values(pubData.value.people) as Person[]
  
  for (const p of people) {
    const by = parseYear(p.birth)
    if (by) {
      list.push({ 
        year: by, 
        exactDate: parseExactDate(p.birth),
        label: p.birth!, 
        person: p, 
        type: 'birth', 
        century: Math.floor(by / 100) 
      })
    }
    const dy = parseYear(p.death)
    if (dy) {
      list.push({ 
        year: dy, 
        exactDate: parseExactDate(p.death),
        label: p.death!, 
        person: p, 
        type: 'death', 
        century: Math.floor(dy / 100) 
      })
    }
  }
  
  // Sort by exactDate, then priority: Birth > Events > Death
  return list.sort((a, b) => {
    if (a.exactDate !== b.exactDate) return a.exactDate - b.exactDate
    const priority = { birth: 1, event: 2, death: 3 }
    return (priority[a.type] || 2) - (priority[b.type] || 2)
  })
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
  const ordinal = c + 1
  return `${ordinal}世纪 (${c * 100}s)`
}

function personGenderClass(p: Person): string {
  if (p.gender === 'male') return 'tl-person tl-person--male'
  if (p.gender === 'female') return 'tl-person tl-person--female'
  return 'tl-person'
}

function goToPerson(personId: string) {
  router.push({ name: 'person-detail', params: { personId } })
}

const goBack = () => {
  router.push({ name: 'workbench' })
}

const showBackToTop = ref(false)

onMounted(() => {
  window.addEventListener('scroll', () => {
    showBackToTop.value = window.scrollY > 400
  })
})

const scrollToTop = () => {
  window.scrollTo({ top: 0, behavior: 'smooth' })
}
</script>

<template>
  <div class="timeline-page">
    <header class="timeline-nav">
      <button class="nav-back" @click="goBack">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polyline points="15 18 9 12 15 6"/></svg>
        返回工作台
      </button>
      <h1 class="timeline-nav__title">家族世代全图 · 历史长卷</h1>
      <div></div>
    </header>

    <main class="timeline-content">
      <div class="timeline-summary">
        <div class="tl-summary-card">
          <div class="tl-summary-icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
          </div>
          <span class="tl-summary-num">{{ totalEvents }}</span>
          <span class="tl-summary-label">历史纪事</span>
        </div>
        <div class="tl-summary-card" v-if="earliestYear">
          <div class="tl-summary-icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
          </div>
          <span class="tl-summary-num">{{ earliestYear }}</span>
          <span class="tl-summary-label">源起年份</span>
        </div>
        <div class="tl-summary-card" v-if="latestYear">
          <div class="tl-summary-icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15.5V17a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-1.5"/><path d="M7 7l5 5 5-5"/><path d="M12 12V3"/></svg>
          </div>
          <span class="tl-summary-num">{{ latestYear }}</span>
          <span class="tl-summary-label">传承至今</span>
        </div>
      </div>

      <div v-if="events.length === 0" class="empty-state">暂无生卒年数据，无法生成历史长卷</div>

      <div v-else class="timeline-container">
        <!-- The Spine -->
        <div class="timeline-spine"></div>

        <div v-for="[century, centuryEvents] in centuries" :key="century" class="tl-century-group">
          <!-- Century Marker -->
          <div class="tl-century-marker">
            <div class="tl-century-number">{{ century }}</div>
            <h2 class="tl-century-title">{{ centuryLabel(century) }}</h2>
          </div>

          <div 
            v-for="(event, idx) in centuryEvents" 
            :key="idx" 
            class="tl-event-wrapper"
            :class="idx % 2 === 0 ? 'tl-left' : 'tl-right'"
            @click="goToPerson(event.person.id)"
          >
            <div class="tl-event-card">
              <div class="tl-event-dot-container">
                <div class="tl-event-dot" :class="'tl-dot--' + event.type"></div>
              </div>
              <div class="tl-event-body">
                <div class="tl-event-header">
                  <span class="tl-event-year">{{ event.year }}年</span>
                  <span class="tl-event-type-tag" :class="'tl-tag--' + event.type">
                    {{ event.type === 'birth' ? '出生' : '去世' }}
                  </span>
                </div>
                <div class="tl-event-person">
                  <span :class="personGenderClass(event.person)">{{ event.person.name }}</span>
                </div>
                <div v-if="event.label !== event.year + '年'" class="tl-event-detail">
                  {{ event.label }}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>

    <button 
      v-show="showBackToTop" 
      class="back-to-top" 
      @click="scrollToTop"
    >
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"><polyline points="18 15 12 9 6 15"/></svg>
    </button>
  </div>
</template>

<style scoped>
.timeline-page {
  min-height: 100vh;
  background: var(--bg-shell, #f5f0e8);
  font-family: 'Noto Serif SC', serif;
  color: var(--text-main, #1a1a1a);
}

.timeline-nav {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 2rem;
  height: 64px;
  background: var(--bg-panel, rgba(255,255,255,0.85));
  border-bottom: 1px solid var(--border-color, rgba(0,0,0,0.06));
  backdrop-filter: blur(12px);
  position: sticky;
  top: 0;
  z-index: 100;
}

.nav-back {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  background: none;
  border: none;
  color: var(--text-sub, #555);
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
  padding: 0.5rem 0.75rem;
  border-radius: 8px;
  transition: all 0.2s;
}

.nav-back:hover {
  color: var(--accent-amber, #a96e35);
  background: var(--bg-hover, rgba(169, 110, 53, 0.05));
}

.timeline-nav__title {
  font-size: 1.25rem;
  font-weight: 900;
  letter-spacing: 0.1em;
  margin: 0;
}

.timeline-content {
  max-width: 1000px;
  margin: 0 auto;
  padding: 3rem 2rem 6rem;
}

/* ── Summary ── */
.timeline-summary {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1.5rem;
  margin-bottom: 5rem;
}

.tl-summary-card {
  background: var(--bg-panel, #fff);
  border: 1px solid var(--line-soft, rgba(117, 90, 57, 0.1));
  border-radius: 24px;
  padding: 2rem 1.5rem;
  text-align: center;
  transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.3s ease;
  box-shadow: 0 4px 20px rgba(62, 41, 22, 0.04);
}

.tl-summary-card:hover {
  transform: translateY(-6px);
  box-shadow: 0 15px 35px rgba(62, 41, 22, 0.1);
}

.tl-summary-icon {
  margin: 0 auto 1rem;
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 16px;
  background: var(--bg-shell, #f5f0e8);
  color: var(--accent-amber, #a96e35);
}

.tl-summary-num {
  display: block;
  font-size: 2.25rem;
  font-weight: 900;
  line-height: 1;
}

.tl-summary-label {
  font-size: 0.8rem;
  color: var(--text-soft, #888);
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.2em;
  margin-top: 0.5rem;
}

/* ── Timeline Track ── */
.timeline-container {
  position: relative;
  display: flex;
  flex-direction: column;
}

.timeline-spine {
  position: absolute;
  left: 50%;
  top: 0;
  bottom: 0;
  width: 2px;
  background: linear-gradient(to bottom, 
    var(--line-soft, rgba(0,0,0,0.1)) 0%, 
    var(--line-soft, rgba(0,0,0,0.1)) 100%);
  transform: translateX(-50%);
  z-index: 1;
}

/* Alternate solid/dashed effect for spine */
.timeline-spine::before {
  content: "";
  position: absolute;
  top: 0;
  bottom: 0;
  left: 0;
  right: 0;
  background-image: linear-gradient(to bottom, 
    transparent 50%, 
    var(--bg-shell, #f5f0e8) 50%);
  background-size: 1px 20px;
  opacity: 0.3;
}

/* ── Century Markers ── */
.tl-century-group {
  position: relative;
  padding-top: 4rem;
  margin-bottom: 2rem;
}

.tl-century-marker {
  position: relative;
  text-align: center;
  margin-bottom: 4rem;
  z-index: 2;
}

.tl-century-number {
  position: absolute;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
  font-size: 10rem;
  font-weight: 900;
  color: var(--accent-amber, #a96e35);
  opacity: 0.04;
  user-select: none;
  pointer-events: none;
  line-height: 1;
}

.tl-century-title {
  position: relative;
  display: inline-block;
  font-size: 1.75rem;
  font-weight: 900;
  color: var(--accent-earth, #6a4b2f);
  background: var(--bg-shell, #f5f0e8);
  padding: 0.5rem 2rem;
  border: 1px solid var(--line-soft, rgba(117, 90, 57, 0.2));
  border-radius: 99px;
  box-shadow: 0 4px 15px rgba(0,0,0,0.05);
}

/* ── Event Wrapper & Layout ── */
.tl-event-wrapper {
  position: relative;
  width: 50%;
  margin-bottom: 1rem;
  z-index: 2;
  cursor: pointer;
  transition: all 0.4s cubic-bezier(0.2, 0.8, 0.2, 1);
  animation: tl-fade-in 0.8s ease-out both;
}

@keyframes tl-fade-in {
  from { opacity: 0; transform: translateY(15px); }
  to { opacity: 1; transform: translateY(0); }
}

.tl-left {
  align-self: flex-start;
  padding-right: 32px;
}

.tl-right {
  align-self: flex-end;
  padding-left: 32px;
}

.tl-event-card {
  background: var(--bg-panel, #fff);
  padding: 0.75rem 1rem;
  border-radius: 12px;
  box-shadow: 0 2px 10px rgba(0,0,0,0.02);
  border: 1px solid var(--line-soft, rgba(0,0,0,0.04));
  position: relative;
  transition: all 0.3s;
}

.tl-event-wrapper:hover .tl-event-card {
  transform: scale(1.01);
  box-shadow: 0 6px 16px rgba(62, 41, 22, 0.06);
  border-color: var(--accent-amber, #a96e35);
}

/* Dot Container & Connector */
.tl-event-dot-container {
  position: absolute;
  top: 50%;
  width: 28px;
  height: 28px;
  transform: translateY(-50%);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 5;
}

.tl-left .tl-event-dot-container { right: -14px; }
.tl-right .tl-event-dot-container { left: -14px; }

.tl-event-dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  border: 3px solid var(--bg-shell, #f5f0e8);
  background: #fff;
  box-shadow: 0 0 0 1px rgba(0,0,0,0.05);
  transition: all 0.3s;
}

.tl-dot--birth { background: #10b981; }
.tl-dot--death { background: #6b7280; }

.tl-event-wrapper:hover .tl-event-dot {
  transform: scale(1.2);
}

/* Pulse Animation */
@keyframes tl-dot-pulse {
  0% { transform: scale(1); opacity: 0.5; }
  100% { transform: scale(2); opacity: 0; }
}

.tl-event-wrapper:hover .tl-event-dot::after {
  content: "";
  position: absolute;
  inset: -3px;
  border-radius: 50%;
  background: inherit;
  z-index: -1;
  animation: tl-dot-pulse 1.5s infinite;
}

/* ── Event Body Content ── */
.tl-event-body {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.tl-event-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
}

.tl-event-year {
  font-size: 1rem;
  font-weight: 900;
  color: var(--accent-earth, #6a4b2f);
}

.tl-event-type-tag {
  font-size: 0.6rem;
  font-weight: 800;
  padding: 0.1rem 0.4rem;
  border-radius: 99px;
  letter-spacing: 0.02em;
}

.tl-tag--birth { background: rgba(16, 185, 129, 0.1); color: #10b981; }
.tl-tag--death { background: rgba(107, 114, 128, 0.1); color: #6b7280; }

.tl-event-person {
  font-size: 0.9rem;
  font-weight: 900;
  margin: 0;
}

.tl-person--male { color: var(--accent-earth, #6a4b2f); }
.tl-person--female { color: #c47b59; }

.tl-event-detail {
  font-size: 0.75rem;
  color: var(--text-soft, #888);
  font-style: italic;
  line-height: 1.3;
}

/* ── Back to Top ── */
.back-to-top {
  position: fixed;
  right: 2.5rem;
  bottom: 2.5rem;
  width: 56px;
  height: 56px;
  border-radius: 18px;
  background: var(--bg-panel, #fff);
  border: 1px solid var(--accent-amber, #a96e35);
  color: var(--accent-amber, #a96e35);
  box-shadow: 0 10px 30px rgba(169, 110, 53, 0.15);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
  z-index: 1000;
}

.back-to-top:hover {
  transform: translateY(-8px) rotate(5deg);
  background: var(--accent-amber, #a96e35);
  color: #fff;
  box-shadow: 0 15px 40px rgba(169, 110, 53, 0.3);
}

/* ── Responsiveness ── */
@media (max-width: 800px) {
  .timeline-summary { grid-template-columns: 1fr; }
  
  .timeline-spine { left: 20px; transform: none; }
  
  .tl-left, .tl-right {
    width: 100%;
    padding-left: 50px;
    padding-right: 0;
  }
  
  .tl-left .tl-event-dot-container,
  .tl-right .tl-event-dot-container {
    left: 0;
    right: auto;
  }
  
  .tl-century-number { font-size: 6rem; }
}

.empty-state {
  text-align: center;
  padding: 6rem 2rem;
  color: var(--text-soft, #888);
  background: var(--bg-panel, #fff);
  border-radius: 24px;
  border: 2px dashed var(--line-soft, rgba(117, 90, 57, 0.1));
}
</style>
