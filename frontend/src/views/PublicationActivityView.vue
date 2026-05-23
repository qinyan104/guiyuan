<script setup lang="ts">
import { computed, inject, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { getPublicationActivity, type ParsedActivity } from '../api/publication'
import { PUBLICATION_CONTEXT_KEY } from '../types/family'
import {
  filterPublicationActivity,
  getPublicationActivityMeta,
  PUBLICATION_ACTIVITY_FILTERS,
  summarizePublicationActivity,
  type ActivityCategory,
} from '../lib/publicationActivity'

const props = defineProps<{ publicationId: number }>()

const router = useRouter()
const context = inject(PUBLICATION_CONTEXT_KEY)!
const loading = ref(true)
const activities = ref<ParsedActivity[]>([])
const activeFilter = ref<ActivityCategory>('all')

const publicationTitle = computed(() => context.pub.publication.title || '未命名族谱')
const publicationSubtitle = computed(() => context.pub.publication.subtitle || '协作记录')
const summary = computed(() => summarizePublicationActivity(activities.value))
const filteredActivities = computed(() => filterPublicationActivity(activities.value, activeFilter.value))
const filterOptions = computed(() => PUBLICATION_ACTIVITY_FILTERS.map((filter) => ({
  ...filter,
  count: filterPublicationActivity(activities.value, filter.key).length,
})))

async function loadActivities() {
  loading.value = true
  try {
    const id = context.serverPublicationId.value || props.publicationId
    activities.value = await getPublicationActivity(id)
  } catch {
    activities.value = []
  } finally {
    loading.value = false
  }
}

function goBack() {
  router.back()
}

function actionLabel(action: string): string {
  return getPublicationActivityMeta(action).label
}

function actionTagClass(action: string): string {
  return `activity-tag--${getPublicationActivityMeta(action).tone}`
}

function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMin = Math.floor(diffMs / 60000)
  if (diffMin < 1) return '刚刚'
  if (diffMin < 60) return `${diffMin} 分钟前`

  const pad = (n: number) => String(n).padStart(2, '0')
  const month = pad(date.getMonth() + 1)
  const day = pad(date.getDate())
  const hours = pad(date.getHours())
  const minutes = pad(date.getMinutes())

  const isToday = date.toDateString() === now.toDateString()
  const yesterday = new Date(now)
  yesterday.setDate(yesterday.getDate() - 1)
  const isYesterday = date.toDateString() === yesterday.toDateString()

  if (isToday) return `今天 ${hours}:${minutes}`
  if (isYesterday) return `昨天 ${hours}:${minutes}`
  return `${month}月${day}日 ${hours}:${minutes}`
}

onMounted(loadActivities)
</script>

<template>
  <section class="activity-view">
    <button class="activity-back" type="button" data-testid="activity-back" @click="goBack">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>
      返回
    </button>

    <header class="activity-header">
      <div class="activity-heading">
        <p class="activity-eyebrow">协作动态</p>
        <h1>{{ publicationTitle }}</h1>
        <p>{{ publicationSubtitle }}</p>
      </div>
    </header>

    <div v-if="loading" class="activity-empty">正在调取协作记录...</div>
    <template v-else>
      <div v-if="activities.length > 0" class="activity-summary">
        <div class="activity-summary__item">
          <span>最近编辑</span>
          <strong>{{ summary.latestUsername }}</strong>
        </div>
        <div class="activity-summary__item">
          <span>最近动作</span>
          <strong>{{ summary.latestActionLabel }}</strong>
        </div>
        <div class="activity-summary__item">
          <span>今日 / 全部</span>
          <strong>{{ summary.todayCount }} / {{ summary.totalCount }}</strong>
        </div>
      </div>

      <div v-if="activities.length === 0" class="activity-empty">暂无协作动态</div>
      <div v-else class="activity-panel">
        <div class="activity-filters" role="tablist" aria-label="活动筛选">
          <button
            v-for="filter in filterOptions"
            :key="filter.key"
            type="button"
            class="activity-filter"
            :class="{ 'activity-filter--active': activeFilter === filter.key }"
            :data-testid="`activity-filter-${filter.key}`"
            @click="activeFilter = filter.key"
          >
            <span>{{ filter.label }}</span>
            <small>{{ filter.count }}</small>
          </button>
        </div>

        <div v-if="filteredActivities.length === 0" class="activity-empty">该分类下暂无记录</div>
        <article v-for="entry in filteredActivities" :key="entry.id" class="activity-entry">
          <div class="activity-entry__rail">
            <span></span>
          </div>
          <div class="activity-entry__card">
            <div class="activity-entry__meta">
              <span class="activity-avatar">{{ entry.username.charAt(0).toUpperCase() }}</span>
              <strong>{{ entry.username }}</strong>
              <time :datetime="entry.createdAt">{{ formatRelativeTime(entry.createdAt) }}</time>
              <span class="activity-tag" :class="actionTagClass(entry.action)">
                {{ actionLabel(entry.action) }}
              </span>
            </div>

            <div v-if="entry.parsedDetail" class="activity-diff">
              <div v-for="person in entry.parsedDetail" :key="person.personId" class="activity-diff__person">
                <strong>{{ person.personName }}</strong>
                <div v-for="change in person.changes" :key="change.field" class="activity-diff__field">
                  <span>{{ change.fieldLabel }}</span>
                  <del>{{ change.old || '（空）' }}</del>
                  <b>{{ change.new || '（空）' }}</b>
                </div>
              </div>
            </div>
            <p v-else class="activity-entry__detail">{{ entry.detail }}</p>
          </div>
        </article>
      </div>
    </template>
  </section>
</template>

<style scoped>
/* ── Layout ── */
.activity-view {
  display: flex;
  flex-direction: column;
  gap: 24px;
  max-width: 960px;
  margin: 0 auto;
  padding: 32px 16px 48px;
}

/* ── Header ── */
.activity-header {
  /* heading block, back button is separate above */
}

.activity-back {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  border: 1px solid var(--color-neutral-4);
  border-radius: var(--radius-md);
  background: var(--color-neutral-1);
  color: var(--color-neutral-7);
  cursor: pointer;
  font-size: 13px;
  font-weight: 500;
  white-space: nowrap;
  transition: all 0.15s;
  width: fit-content;
}

.activity-back:hover {
  background: var(--color-neutral-2);
  border-color: var(--color-neutral-5);
  color: var(--color-neutral-9);
}

.activity-heading {
  flex: 1;
  min-width: 0;
}

.activity-eyebrow {
  margin: 0 0 4px;
  color: var(--color-accent);
  font-size: 12px;
  font-weight: 500;
  letter-spacing: 0.1em;
  text-transform: uppercase;
}

.activity-heading h1 {
  margin: 0 0 4px;
  color: var(--color-neutral-10);
  font-family: var(--font-serif);
  font-size: var(--text-title-28);
  font-weight: 500;
}

.activity-heading p {
  margin: 0;
  color: var(--color-neutral-6);
  font-size: 14px;
}

/* ── Loading / Empty ── */
.activity-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 48px 24px;
  color: var(--color-neutral-5);
  font-size: 14px;
  background: var(--color-panel-bg);
  border: 1px solid var(--color-card-stroke);
  border-radius: var(--radius-xl);
}

/* ── Summary Cards ── */
.activity-summary {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 14px;
}

.activity-summary__item {
  padding: 18px 20px;
  background: var(--color-panel-bg);
  border: 1px solid var(--color-card-stroke);
  border-radius: var(--radius-lg);
  transition: box-shadow 0.2s;
}

.activity-summary__item:hover {
  box-shadow: var(--shadow-whisper);
}

.activity-summary__item span {
  display: block;
  margin-bottom: 6px;
  color: var(--color-neutral-5);
  font-size: 11px;
  font-weight: 500;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.activity-summary__item strong {
  color: var(--color-neutral-10);
  font-size: 18px;
  font-weight: 500;
  font-family: var(--font-serif);
}

/* ── Panel ── */
.activity-panel {
  padding: 24px;
  background: var(--color-panel-bg);
  border: 1px solid var(--color-card-stroke);
  border-radius: var(--radius-xl);
  box-shadow: var(--shadow-whisper);
}

/* ── Filters ── */
.activity-filters {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 24px;
  padding-bottom: 20px;
  border-bottom: 1px solid var(--color-neutral-3);
}

.activity-filter {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 7px 15px;
  border: 1px solid var(--color-neutral-4);
  border-radius: 999px;
  background: var(--color-neutral-1);
  color: var(--color-neutral-7);
  cursor: pointer;
  font-size: 13px;
  font-weight: 500;
  transition: all 0.15s ease;
}

.activity-filter small {
  color: var(--color-neutral-5);
  font-size: 11px;
  background: var(--color-neutral-3);
  padding: 1px 7px;
  border-radius: 999px;
  min-width: 20px;
  text-align: center;
}

.activity-filter:hover {
  border-color: var(--color-neutral-5);
  background: var(--color-neutral-2);
}

.activity-filter--active {
  border-color: var(--color-accent);
  background: var(--color-accent-muted);
  color: var(--color-accent);
}

.activity-filter--active small {
  background: var(--color-accent);
  color: #fff;
}

/* ── Timeline Entry ── */
.activity-entry {
  display: flex;
  gap: 18px;
  position: relative;
}

.activity-entry:last-child .activity-entry__card {
  padding-bottom: 0;
}

.activity-entry:last-child .activity-entry__rail::before {
  bottom: 50%;
}

/* Rail / timeline line */
.activity-entry__rail {
  width: 16px;
  flex-shrink: 0;
  position: relative;
}

.activity-entry__rail::before {
  content: '';
  position: absolute;
  top: 28px;
  bottom: -8px;
  left: 50%;
  transform: translateX(-50%);
  width: 2px;
  background: var(--color-neutral-3);
  border-radius: 1px;
}

/* Rail dot — color varies by action tag parent */
.activity-entry__rail span {
  position: absolute;
  top: 22px;
  left: 50%;
  transform: translateX(-50%);
  width: 10px;
  height: 10px;
  border: 2.5px solid var(--color-neutral-4);
  border-radius: 50%;
  background: var(--color-panel-bg);
  z-index: 1;
}

/* ── Entry Card ── */
.activity-entry__card {
  flex: 1;
  padding: 10px 0 28px;
  min-width: 0;
}

.activity-entry__meta {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 10px;
  flex-wrap: wrap;
}

.activity-avatar {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: linear-gradient(135deg, var(--color-accent), #a8322b);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 500;
  flex-shrink: 0;
}

.activity-entry__meta strong {
  color: var(--color-neutral-9);
  font-size: 14px;
  font-weight: 500;
}

.activity-entry__meta time {
  color: var(--color-neutral-5);
  font-size: 12px;
  font-family: monospace;
}

/* Action tag */
.activity-tag {
  margin-left: auto;
  border-radius: 999px;
  padding: 3px 10px;
  font-size: 11px;
  font-weight: 500;
  letter-spacing: 0.02em;
  white-space: nowrap;
}

.activity-tag--info {
  background: rgba(59, 130, 246, 0.08);
  color: #2563eb;
}

.activity-tag--success {
  background: rgba(22, 163, 74, 0.08);
  color: #16a34a;
}

.activity-tag--warning {
  background: rgba(217, 119, 6, 0.08);
  color: #d97706;
}

.activity-tag--danger {
  background: rgba(196, 58, 49, 0.08);
  color: var(--color-accent);
}

/* ── Diff card ── */
.activity-diff {
  border: 1px solid var(--color-neutral-4);
  border-radius: var(--radius-lg);
  background: var(--color-neutral-1);
  padding: 14px 16px;
}

.activity-diff__person {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.activity-diff__person > strong {
  font-size: 14px;
  color: var(--color-neutral-10);
  font-family: var(--font-serif);
}

.activity-diff__field {
  display: grid;
  grid-template-columns: 80px 1fr 1fr;
  gap: 10px;
  align-items: baseline;
  font-size: 13px;
  padding: 6px 0;
}

.activity-diff__field + .activity-diff__field {
  border-top: 1px solid var(--color-neutral-3);
}

.activity-diff__field > span {
  color: var(--color-neutral-5);
  font-size: 12px;
  font-weight: 500;
}

.activity-diff__field del {
  color: var(--color-accent);
  background: rgba(196, 58, 49, 0.06);
  border-radius: 4px;
  padding: 2px 8px;
  text-decoration: line-through;
  font-size: 12px;
}

.activity-diff__field b {
  color: #16a34a;
  background: rgba(22, 163, 74, 0.06);
  border-radius: 4px;
  padding: 2px 8px;
  font-weight: 500;
  font-size: 12px;
}

/* ── Plain detail text ── */
.activity-entry__detail {
  margin: 0;
  padding: 12px 16px;
  border: 1px solid var(--color-neutral-4);
  border-radius: var(--radius-md);
  background: var(--color-neutral-1);
  color: var(--color-neutral-7);
  font-size: 13px;
  line-height: 1.6;
}

/* ── Responsive ── */
@media (max-width: 720px) {


  .activity-summary {
    grid-template-columns: 1fr;
  }

  .activity-entry__meta {
    flex-wrap: wrap;
  }

  .activity-tag {
    margin-left: 0;
  }

  .activity-diff__field {
    grid-template-columns: 1fr;
    gap: 4px;
  }
}
</style>

