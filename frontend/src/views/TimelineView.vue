<script setup lang="ts">
import { computed, onMounted, onBeforeUnmount, ref, inject } from 'vue'
import { useRouter } from 'vue-router'
import type { Person } from '../types/family'
import { parseYear, parseExactDate } from '../lib/dateUtils'

const props = defineProps<{ publicationId: number }>()
const router = useRouter()

// ─── Shared Context ─────────────────────────────────────────────
const { pub } = inject('publication-context') as any
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
  router.push({ name: 'person-detail', params: { personId } })
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
    <div class="bento-header">
      <div class="header-left">
        <button class="action-btn back-btn" @click="goBack" title="返回工作台">
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
          <div class="metric-bg-icon">卷</div>
          <div class="metric-value">{{ totalEvents }}</div>
          <div class="metric-label">历史纪事节点</div>
        </div>
        <div class="bento-card metric-card start" v-if="earliestYear">
          <div class="metric-bg-icon">始</div>
          <div class="metric-value">{{ earliestYear }}</div>
          <div class="metric-label">源起年份</div>
        </div>
        <div class="bento-card metric-card end" v-if="latestYear">
          <div class="metric-bg-icon">承</div>
          <div class="metric-value">{{ latestYear }}</div>
          <div class="metric-label">传承至今</div>
        </div>
      </div>

      <div v-if="events.length === 0" class="timeline-empty">
        <div class="empty-icon">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" opacity="0.3"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
        </div>
        <h3 class="empty-title">时间线尚未生成</h3>
        <p class="empty-desc">添加人物并填写生卒年份后，时间线将自动生成。</p>
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
            :class="idx % 2 === 0 ? 'left' : 'right'"
            @click="goToPerson(event.person.id)"
          >
            <div class="bento-card event-card">
              <div class="event-anchor">
                <div class="anchor-dot" :class="event.type"></div>
              </div>
              <div class="event-content">
                <div class="event-top">
                  <span class="year">{{ event.year }}年</span>
                  <span class="type-badge" :class="event.type">
                    {{ event.type === 'birth' ? '出生' : '去世' }}
                  </span>
                </div>
                <div class="person-name" :class="personGenderClass(event.person)">
                  {{ event.person.name }}
                </div>
                <div v-if="event.label !== event.year + '年'" class="event-extra">
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
  font-family: monospace;
  font-size: 1.1rem;
  font-weight: 700;
  letter-spacing: 0.1em;
  color: var(--text-main);
  margin: 0 0 6px;
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
  gap: 20px;
}
.metric-card {
  padding: 24px;
  text-align: center;
}
.metric-bg-icon {
  position: absolute;
  right: -10px; bottom: -10px;
  font-size: 4rem;
  font-weight: 900;
  opacity: 0.03;
  font-family: 'Noto Serif SC', serif;
}
.metric-value {
  font-family: 'Noto Serif SC', serif;
  font-size: 2.2rem;
  font-weight: 900;
  color: var(--text-main);
  margin-bottom: 4px;
}
.metric-label {
  font-size: 0.75rem;
  font-weight: 800;
  color: var(--text-soft);
  text-transform: uppercase;
  letter-spacing: 0.1em;
}

/* ── Timeline Track ── */
.scroll-timeline {
  position: relative;
  padding: 40px 0;
}

.timeline-spine {
  position: absolute;
  left: 50%;
  top: 0; bottom: 0;
  width: 2px;
  transform: translateX(-50%);
  background: linear-gradient(to bottom, 
    transparent, 
    var(--glass-border-highlight, rgba(255,255,255,0.5)) 10%, 
    var(--glass-border-highlight, rgba(255,255,255,0.5)) 90%, 
    transparent);
}
.timeline-spine::after {
  content: '';
  position: absolute;
  inset: 0;
  background-image: linear-gradient(to bottom, 
    var(--text-main) 50%, 
    transparent 50%);
  background-size: 1px 16px;
  opacity: 0.1;
}

/* ── Century Indicators ── */
.century-block {
  margin-bottom: 64px;
}
.century-indicator {
  position: relative;
  text-align: center;
  margin-bottom: 48px;
  z-index: 2;
}
.bg-num {
  position: absolute;
  left: 50%; top: 50%;
  transform: translate(-50%, -50%);
  font-size: 7rem;
  font-weight: 900;
  color: var(--accent-amber);
  opacity: 0.04;
  font-family: 'Noto Serif SC', serif;
}
.indicator-tag {
  display: inline-block;
  padding: 6px 24px;
  background: var(--bg-panel, #fff);
  border: 1px solid var(--glass-border-highlight, rgba(255,255,255,0.8));
  border-radius: 99px;
  font-family: 'Noto Serif SC', serif;
  font-size: 1.2rem;
  font-weight: 800;
  color: var(--text-main);
  box-shadow: 0 12px 24px rgba(0,0,0,0.05);
}

/* ── Event Cards ── */
.event-wrapper {
  position: relative;
  width: 50%;
  margin-bottom: 16px;
  cursor: pointer;
}
.event-wrapper.left { align-self: flex-start; padding-right: 40px; }
.event-wrapper.right { align-self: flex-end; padding-left: 40px; margin-left: 50%; }

.event-card {
  padding: 12px 16px;
  transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
}
.event-wrapper:hover .event-card {
  transform: scale(1.02);
  border-color: var(--accent-amber);
  box-shadow: 0 24px 48px rgba(169, 110, 53, 0.1);
}

.event-anchor {
  position: absolute;
  top: 50%;
  width: 32px; height: 32px;
  transform: translateY(-50%);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10;
}
.left .event-anchor { right: -16px; }
.right .event-anchor { left: -16px; }

.anchor-dot {
  width: 12px; height: 12px;
  border-radius: 50%;
  background: #fff;
  border: 3px solid var(--glass-border-highlight, #fff);
  box-shadow: 0 0 0 1px rgba(0,0,0,0.1);
  transition: transform 0.3s ease;
}
.anchor-dot.birth { background: #10b981; }
.anchor-dot.death { background: #6b7280; }
.event-wrapper:hover .anchor-dot { transform: scale(1.3); }

.event-content { display: flex; flex-direction: column; gap: 4px; }
.event-top { display: flex; align-items: center; justify-content: space-between; }
.event-top .year { font-family: 'Noto Serif SC', serif; font-size: 1rem; font-weight: 900; color: var(--text-main); }
.type-badge { font-size: 0.65rem; font-weight: 800; padding: 2px 8px; border-radius: 4px; }
.type-badge.birth { background: rgba(16, 185, 129, 0.1); color: #10b981; }
.type-badge.death { background: rgba(107, 114, 128, 0.1); color: #6b7280; }

.person-name { font-family: 'Noto Serif SC', serif; font-size: 0.95rem; font-weight: 800; color: var(--text-main); }
.person-name.male { color: var(--accent-earth); }
.person-name.female { color: #8b2d1c; }
.event-extra { font-size: 0.75rem; color: var(--text-soft); font-style: italic; }

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
  background: var(--glass-panel-bg, rgba(255, 255, 255, 0.6));
  backdrop-filter: blur(24px) saturate(180%);
  border: 1px solid var(--glass-border-highlight, rgba(255, 255, 255, 0.8));
  border-radius: 20px;
  box-shadow: 0 24px 48px rgba(0, 0, 0, 0.05);
  position: relative;
  overflow: hidden;
}
:global([data-theme="ink-wash"]) .bento-card,
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
</style>
