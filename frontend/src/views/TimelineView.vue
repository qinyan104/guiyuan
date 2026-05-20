﻿﻿﻿<script setup lang="ts">
import { computed, onMounted, onBeforeUnmount, ref, inject } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { PUBLICATION_CONTEXT_KEY, type Person } from '../types/family'
import { parseYear, parseExactDate } from '../lib/dateUtils'

defineProps<{ publicationId: number }>()
const router = useRouter()
const route = useRoute()

// ─── Shared Context ─────────────────────────────────────────────
const { pub } = inject(PUBLICATION_CONTEXT_KEY)!
const pubData = computed(() => pub.publication)

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
  if (p.gender === 'male') return 'tl-person male'
  if (p.gender === 'female') return 'tl-person female'
  return 'tl-person'
}

function goToPerson(personId: string) {
  router.push({ name: 'workbench', params: { id: route.params.id }, query: { personId } })
}

const goBack = () => {
  router.push({ name: 'workbench' })
}

const showBackToTop = ref(false)

const onScroll = () => {
  showBackToTop.value = window.scrollY > 400
}

onMounted(() => {
  window.addEventListener('scroll', onScroll)
})
onBeforeUnmount(() => {
  window.removeEventListener('scroll', onScroll)
})

const scrollToTop = () => {
  window.scrollTo({ top: 0, behavior: 'smooth' })
}
</script>

<template>
  <div class="timeline-view">
        <!-- Ambient Glassmorphism Background -->
    <div class="ambient-bg">
      <div class="orb orb-1"></div>
      <div class="orb orb-2"></div>
    </div>
    <div class="bento-header">
      <div class="header-left">
        <button class="action-btn back-btn" @click="goBack" aria-label="Back">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="15 18 9 12 15 6"></polyline>
          </svg>
        </button>
        <div class="header-content">
          <h1 class="page-title">家族历史长卷 // TIMELINE</h1>
          <p class="page-desc">穿越时空的血脉延续与岁月纪事</p>
        </div>
      </div>
    </div>

    <main class="timeline-main">
      <!-- Summary Metrics Card -->
      <div class="bento-grid summary-grid">
        <div class="bento-card metric-card">
          <div class="metric-bg-icon">&#21367;</div>
          <div class="metric-value">{{ totalEvents }}</div>
          <div class="metric-label">历史纪事节点</div>
        </div>
        <div v-if="earliestYear" class="bento-card metric-card start">
          <div class="metric-bg-icon">&#22987;</div>
          <div class="metric-value">{{ earliestYear }}</div>
          <div class="metric-label">源起年份</div>
        </div>
        <div v-if="latestYear" class="bento-card metric-card end">
          <div class="metric-bg-icon">&#25215;</div>
          <div class="metric-value">{{ latestYear }}</div>
          <div class="metric-label">传承至今</div>
        </div>
      </div>

      <div v-if="events.length === 0" class="timeline-empty">
        <div class="empty-icon">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" opacity="0.3"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>
        </div>
          <h3 class="empty-title">&#26102;&#38388;&#32447;&#23581;&#26410;&#29983;&#25104;</h3>
          <p class="empty-desc">&#28155;&#21152;&#20154;&#29289;&#24182;&#22586;&#20889;&#29983;&#21508;&#24180;&#20221;&#21518;&#65292;&#26102;&#38388;&#32447;&#23558;&#33258;&#21160;&#29983;&#25104;&#12290;</p>
        <button class="bento-btn primary" @click="router.push({ name: 'workbench', params: { id: publicationId } })">前往画布添加人物</button>
      </div>
      <div v-else>
        <div class="scroll-timeline">
          <!-- Spine -->
          <div class="timeline-spine"></div>

          <div v-for="[century, centuryEvents] in centuries" :key="century" class="century-block">
            <!-- Century Indicator -->
            <div class="century-indicator">
              <div class="bg-num">{{ century }}</div>
              <div class="indicator-tag">{{ centuryLabel(century) }}</div>
            </div>

            <!-- Event Cards -->
            <div 
              v-for="(event, idx) in centuryEvents" 
              :key="idx" 
              class="event-wrapper"
              @click="goToPerson(event.person.id)"
            >
              <div class="year-display">
                <span class="year">{{ event.year }}&#24180;</span>
              </div>
              <div class="bento-card event-card">
                <div class="event-anchor">
                  <div class="anchor-dot" :class="event.type"></div>
                </div>
                <div class="event-content">
                  <div class="event-top">
                    <div class="person-name" :class="personGenderClass(event.person)">
                      {{ event.person.name }}
                    </div>
                    <span class="type-badge" :class="event.type">
                      {{ event.type === 'birth' ? '出生' : '去世' }}
                    </span>
                  </div>
                  <div v-if="event.label !== event.year + '&#24180;'" class="event-extra">
                    {{ event.label }}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>

    <!-- Floating Back to Top -->
    <button 
      v-show="showBackToTop" 
      class="float-action-btn scroll-top" 
      @click="scrollToTop"
    >
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round">
        <polyline points="18 15 12 9 6 15"></polyline>
      </svg>
    </button>
  </div>
</template>

<style scoped>
.timeline-view {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

/* ── Header ── */
.bento-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.header-left {
  display: flex;
  align-items: center;
  gap: 16px;
}
.page-title {
  font-family: 'Noto Serif SC', 'Songti SC', 'STZhongsong', serif;
  font-size: 1.8rem;
  font-weight: 500;
  letter-spacing: 0.15em;
  color: var(--text-main);
  margin: 0 0 8px;
}
.page-desc {
  font-size: 0.85rem;
  color: var(--text-soft);
  margin: 0;
}
.back-btn {
  width: 40px;
  height: 40px;
  border-radius: 12px;
  background: var(--glass-panel-bg, rgba(255,255,255,0.4));
  border: 1px solid var(--glass-border-highlight, rgba(255,255,255,0.6));
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-main);
  cursor: pointer;
  transition: all 0.2s ease;
}
.back-btn:hover {
  background: var(--bg-panel, #fff);
  transform: translateX(-4px);
}

.timeline-main {
  display: flex;
  flex-direction: column;
  gap: 32px;
  max-width: 1000px;
  margin: 0 auto;
}

/* ── Summary ── */
.summary-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 24px;
}
.metric-card {
  padding: 32px 24px;
  text-align: center;
  border-radius: 32px;
  background: var(--glass-panel-bg, rgba(255,255,255,0.7));
  backdrop-filter: blur(40px) saturate(200%);
  border: 1px solid var(--glass-border-highlight, rgba(255,255,255,0.9));
  box-shadow: 0 16px 48px rgba(169, 110, 53, 0.05);
  transition: transform 0.3s ease, box-shadow 0.3s ease;
}
.metric-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 24px 64px rgba(169, 110, 53, 0.1);
}
.metric-bg-icon {
  position: absolute;
  right: -10px; bottom: -20px;
  font-size: 6rem;
  font-weight: 500;
  opacity: 0.03;
  font-family: 'Noto Serif SC', 'Songti SC', 'STZhongsong', serif;
}
.metric-value {
  font-family: 'Noto Serif SC', 'Songti SC', 'STZhongsong', serif;
  font-size: 2.8rem;
  font-weight: 500;
  color: var(--text-main);
  margin-bottom: 8px;
}
.metric-label {
  font-family: 'Noto Serif SC', 'Songti SC', 'STZhongsong', serif;
  font-size: 0.9rem;
  font-weight: 500;
  color: var(--text-soft);
  letter-spacing: 0.1em;
}

/* ── Timeline Track ── */
.scroll-timeline {
  position: relative;
  padding: 40px 0;
  max-width: 800px;
  margin: 0 auto;
}

.timeline-spine {
  position: absolute;
  left: 120px;
  top: 0; bottom: 0;
  width: 1px;
  background: var(--accent-amber, #b33939);
  opacity: 0.2;
}

/* ── Century Indicators ── */
.century-block {
  margin-bottom: 100px;
}
.century-indicator {
  position: relative;
  text-align: left;
  padding-left: 140px;
  margin-bottom: 64px;
}
.bg-num {
  position: absolute;
  left: 0; top: 50%;
  transform: translateY(-50%);
  font-size: 8rem;
  font-weight: 500;
  color: var(--accent-amber, #b33939);
  opacity: 0.05;
  font-family: 'Noto Serif SC', 'Songti SC', 'STZhongsong', serif;
}
.indicator-tag {
  display: inline-block;
  padding: 12px 32px;
  background: var(--glass-panel-bg, rgba(255,255,255,0.85));
  backdrop-filter: blur(12px);
  border: 1px solid var(--glass-border-highlight, rgba(255,255,255,0.9));
  border-radius: 32px;
  font-family: 'Noto Serif SC', 'Songti SC', 'STZhongsong', serif;
  font-size: 1.4rem;
  font-weight: 500;
  color: var(--accent-amber, #b33939);
  box-shadow: 0 12px 32px rgba(169, 110, 53, 0.08);
  position: relative;
  z-index: 2;
}

/* ── Event Cards ── */
.event-wrapper {
  position: relative;
  width: 100%;
  padding-left: 160px;
  margin-bottom: 24px;
  cursor: pointer;
}

.event-card {
  padding: 24px 32px;
  border-radius: 24px;
  background: var(--glass-panel-bg, rgba(255, 255, 255, 0.4));
  backdrop-filter: blur(40px) saturate(200%);
  border: 1px solid var(--glass-border-highlight, rgba(255, 255, 255, 0.9));
  box-shadow: 0 12px 32px rgba(169, 110, 53, 0.06);
  transition: all 0.4s cubic-bezier(0.165, 0.84, 0.44, 1);
  display: flex;
  align-items: center;
}
.event-wrapper:hover .event-card {
  transform: translateY(-4px);
  border-color: var(--accent-amber, #b33939);
  box-shadow: 0 24px 48px rgba(169, 110, 53, 0.12);
}

.event-anchor {
  position: absolute;
  top: 50%;
  left: 120px;
  width: 12px; height: 12px;
  transform: translate(-50%, -50%);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10;
}

.anchor-dot {
  width: 8px; height: 8px;
  border-radius: 4px;
  background: var(--accent-amber, #b33939);
  box-shadow: 0 0 0 4px rgba(255,255,255,0.8);
  transition: transform 0.3s ease;
}
.anchor-dot.birth { background: #b33939; }
.anchor-dot.death { background: #4a4a4a; box-shadow: 0 0 0 4px rgba(240,240,240,0.8); }
.event-wrapper:hover .anchor-dot { transform: scale(1.5); }

.event-content { display: flex; flex-direction: column; gap: 8px; width: 100%; }
.event-top { display: flex; align-items: center; gap: 16px; margin-bottom: 4px; }
.year-display { position: absolute; left: 0; top: 50%; transform: translateY(-50%); width: 100px; text-align: right; }
.year-display .year { font-family: 'Noto Serif SC', 'Songti SC', 'STZhongsong', serif; font-size: 1.8rem; font-weight: 500; color: var(--accent-amber, #b33939); letter-spacing: 0.05em; }

.type-badge { font-family: 'Noto Serif SC', 'Songti SC', 'STZhongsong', serif; font-size: 0.8rem; font-weight: 500; padding: 4px 12px; border-radius: 12px; border: 1px solid currentColor; }
.type-badge.birth { background: rgba(179, 57, 57, 0.05); color: #b33939; }
.type-badge.death { background: rgba(74, 74, 74, 0.05); color: #4a4a4a; }

.person-name { font-family: 'Noto Serif SC', 'Songti SC', 'STZhongsong', serif; font-size: 1.4rem; font-weight: 500; color: var(--text-main); letter-spacing: 0.1em; }
.person-name.male { color: var(--text-main); }
.person-name.female { color: var(--text-main); }
.event-extra { font-family: 'Noto Serif SC', 'Songti SC', 'STZhongsong', serif; font-size: 0.95rem; color: var(--text-soft); }

/* ── Float Actions ── */
.float-action-btn {
  position: fixed;
  right: 32px; bottom: 32px;
  width: 56px; height: 56px;
  border-radius: 18px;
  background: var(--text-main);
  color: var(--bg-panel, #fff);
  border: none;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 12px 24px rgba(0,0,0,0.15);
  cursor: pointer;
  transition: all 0.3s ease;
  z-index: 1000;
}
.float-action-btn:hover { transform: translateY(-4px); }

.empty-hint {
  text-align: center;
  padding: 64px;
  background: var(--glass-panel-bg, rgba(255,255,255,0.4));
  border-radius: 24px;
  border: 2px dashed var(--glass-border-shadow, rgba(0,0,0,0.1));
  color: var(--text-soft);
}

/* ── Timeline Empty State ── */
.timeline-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 80px 40px;
  text-align: center;
  min-height: 400px;
}
.timeline-empty .empty-title {
  font-family: 'Noto Serif SC', serif;
  font-size: 1.4rem;
  font-weight: 700;
  color: var(--text-main);
  margin: 0 0 8px;
}
.timeline-empty .empty-desc {
  color: var(--text-soft);
  font-size: 0.9rem;
  margin: 0 0 24px;
}

/* ── Bento Button ── */
.bento-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  border-radius: 999px;
  font-size: 0.85rem;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.2s ease;
  border: none;
}
.bento-btn.primary {
  background: var(--text-main);
  color: var(--bg-panel, #fff);
  box-shadow: 0 4px 12px rgba(0,0,0,0.1);
}
.bento-btn.primary:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(0,0,0,0.15);
}

/* ── Bento Card (Global Redefinition for this View) ── */
.bento-card {
  background: var(--glass-panel-bg, rgba(255, 255, 255, 0.4));
  backdrop-filter: blur(40px) saturate(200%);
  border: 1px solid var(--glass-border-highlight, rgba(255, 255, 255, 0.9));
  border-radius: 32px;
  box-shadow: 0 24px 64px rgba(169, 110, 53, 0.08);
  position: relative;
  overflow: hidden;
}
:global([data-theme="rosewood"]) .bento-card,
:global([data-theme="star-sea"]) .bento-card {
  background: rgba(20, 20, 20, 0.5);
  border-color: rgba(255,255,255,0.1);
}

@media (max-width: 800px) {
  .timeline-spine { left: 32px; transform: none; }
  .century-indicator { text-align: left; padding-left: 64px; }
  .bg-num { left: 64px; transform: translateY(-50%); }
  .event-wrapper { width: 100% !important; margin-left: 0 !important; padding-left: 64px !important; padding-right: 0 !important; }
  .event-anchor { left: 16px !important; right: auto !important; }
  .summary-grid { grid-template-columns: 1fr; }
}

/* ── Ambient Glassmorphism Background ── */
.ambient-bg {
  position: fixed; inset: 0; pointer-events: none; z-index: 0; overflow: hidden;
}
.orb { position: absolute; border-radius: 50%; filter: blur(90px); opacity: 0.45; }
.orb-1 {
  width: 700px; height: 700px;
  background: radial-gradient(circle, rgba(169, 110, 53, 0.35), transparent 70%);
  top: -200px; left: -150px;
  animation: orb-drift 18s ease-in-out infinite alternate;
}
.orb-2 {
  width: 550px; height: 550px;
  background: radial-gradient(circle, rgba(100, 130, 210, 0.2), transparent 70%);
  bottom: -100px; right: -100px;
  animation: orb-drift 22s ease-in-out infinite alternate-reverse;
}
@keyframes orb-drift {
  from { transform: translate(0, 0) scale(1); }
  to   { transform: translate(40px, 30px) scale(1.08); }
}
.bento-header, .timeline-main { position: relative; z-index: 1; }
.timeline-view { padding: 32px; min-height: 100vh; box-sizing: border-box; position: relative; }

/* ── Action button base ── */
.action-btn { display: flex; align-items: center; justify-content: center; background: none; border: none; padding: 0; cursor: pointer; color: inherit; }

/* ── Gender-tinted person name (tl-person from personGenderClass) ── */
.tl-person.male   { color: #3a6bc9; }
.tl-person.female { color: #c9476a; }
.person-name.male   { color: #3a6bc9; }
.person-name.female { color: #c9476a; }

/* ── Event card entrance animation ── */
@keyframes card-enter {
  from { opacity: 0; transform: translateY(14px); }
  to   { opacity: 1; transform: translateY(0); }
}
.century-block .event-wrapper { animation: card-enter 0.4s ease both; }
.century-block .event-wrapper:nth-child(1) { animation-delay: 0.04s; }
.century-block .event-wrapper:nth-child(2) { animation-delay: 0.08s; }
.century-block .event-wrapper:nth-child(3) { animation-delay: 0.12s; }
.century-block .event-wrapper:nth-child(4) { animation-delay: 0.16s; }
.century-block .event-wrapper:nth-child(5) { animation-delay: 0.20s; }
</style>
