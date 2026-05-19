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
  router.push({ name: 'workbench', params: { id: props.publicationId } })
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
  const diffHour = Math.floor(diffMin / 60)
  if (diffHour < 24) return `${diffHour} 小时前`
  const diffDay = Math.floor(diffHour / 24)
  if (diffDay < 30) return `${diffDay} 天前`
  return date.toLocaleDateString('zh-CN')
}

onMounted(loadActivities)
</script>

<template>
  <section class="activity-view">
    <header class="activity-header">
      <button class="activity-back" type="button" data-testid="activity-back" @click="goBack">
        返回工作台
      </button>
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
.activity-view {
  display: flex;
  flex-direction: column;
  gap: 22px;
  max-width: 1040px;
  margin: 0 auto;
}

.activity-header {
  display: flex;
  align-items: flex-start;
  gap: 18px;
}

.activity-back {
  padding: 8px 12px;
  border: 1px solid var(--glass-border-shadow, rgba(0,0,0,0.08));
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.5);
  color: var(--text-main);
  cursor: pointer;
  font-weight: 700;
}

.activity-heading {
  flex: 1;
}

.activity-eyebrow {
  margin: 0 0 6px;
  color: var(--accent-amber, #a96e35);
  font-size: 0.78rem;
  font-weight: 800;
  letter-spacing: 0.12em;
}

.activity-heading h1 {
  margin: 0 0 6px;
  color: var(--text-main);
  font-family: 'Noto Serif SC', serif;
  font-size: 2rem;
}

.activity-heading p {
  margin: 0;
  color: var(--text-soft);
}

.activity-summary {
  display: grid;
  grid-template-columns: repeat(3, minmax(160px, 1fr));
  gap: 14px;
}

.activity-summary__item,
.activity-panel,
.activity-empty {
  border: 1px solid var(--glass-border-highlight, rgba(255,255,255,0.65));
  border-radius: 8px;
  background: var(--glass-panel-bg, rgba(255,255,255,0.55));
  box-shadow: 0 18px 40px rgba(0,0,0,0.04);
}

.activity-summary__item {
  padding: 14px 16px;
}

.activity-summary__item span {
  display: block;
  margin-bottom: 5px;
  color: var(--text-soft);
  font-size: 0.76rem;
  font-weight: 700;
}

.activity-summary__item strong {
  color: var(--text-main);
}

.activity-panel {
  padding: 18px;
}

.activity-filters {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 18px;
}

.activity-filter {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 7px 11px;
  border: 1px solid var(--glass-border-shadow, rgba(0,0,0,0.08));
  border-radius: 8px;
  background: rgba(255,255,255,0.45);
  color: var(--text-soft);
  cursor: pointer;
  font-weight: 700;
}

.activity-filter small {
  color: var(--accent-amber, #a96e35);
}

.activity-filter--active,
.activity-filter:hover {
  border-color: var(--accent-amber, #a96e35);
  background: rgba(169, 110, 53, 0.12);
  color: var(--text-main);
}

.activity-entry {
  display: flex;
  gap: 16px;
}

.activity-entry__rail {
  width: 14px;
  position: relative;
}

.activity-entry__rail::before {
  content: '';
  position: absolute;
  top: 0;
  bottom: 0;
  left: 6px;
  width: 2px;
  background: var(--glass-border-shadow, rgba(0,0,0,0.1));
}

.activity-entry__rail span {
  position: absolute;
  top: 17px;
  left: 1px;
  width: 12px;
  height: 12px;
  border: 3px solid var(--accent-amber, #a96e35);
  border-radius: 999px;
  background: var(--bg-panel, #fff);
}

.activity-entry__card {
  flex: 1;
  padding: 12px 0 24px;
}

.activity-entry__meta {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 8px;
}

.activity-entry__meta strong {
  color: var(--text-main);
  background: rgba(0,0,0,0.04);
  border-radius: 999px;
  padding: 2px 8px;
  font-size: 0.78rem;
}

.activity-entry__meta time {
  color: var(--accent-amber, #a96e35);
  font-family: monospace;
  font-size: 0.78rem;
  font-weight: 700;
}

.activity-tag {
  margin-left: auto;
  border-radius: 999px;
  padding: 2px 9px;
  font-size: 0.72rem;
  font-weight: 800;
}

.activity-tag--info { background: rgba(59, 130, 246, 0.1); color: #3b82f6; }
.activity-tag--success { background: rgba(39, 174, 96, 0.1); color: #27ae60; }
.activity-tag--warning { background: rgba(217, 119, 6, 0.12); color: #b45309; }
.activity-tag--danger { background: rgba(192, 57, 43, 0.1); color: #c0392b; }

.activity-diff,
.activity-entry__detail {
  border: 1px solid var(--glass-border-shadow, rgba(0,0,0,0.06));
  border-radius: 8px;
  background: rgba(255,255,255,0.38);
  padding: 10px 12px;
}

.activity-diff__person {
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.activity-diff__field {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  font-size: 0.84rem;
}

.activity-diff__field span {
  color: var(--text-soft);
  font-weight: 700;
}

.activity-diff__field del {
  color: #c0392b;
  background: rgba(192, 57, 43, 0.06);
  border-radius: 4px;
  padding: 0 6px;
}

.activity-diff__field b {
  color: #27ae60;
  background: rgba(39, 174, 96, 0.06);
  border-radius: 4px;
  padding: 0 6px;
}

.activity-entry__detail {
  margin: 0;
  color: var(--text-soft);
}

.activity-empty {
  padding: 32px;
  color: var(--text-soft);
  text-align: center;
}

@media (max-width: 720px) {
  .activity-header {
    flex-direction: column;
  }

  .activity-summary {
    grid-template-columns: 1fr;
  }

  .activity-entry__meta {
    flex-wrap: wrap;
  }

  .activity-tag {
    margin-left: 0;
  }
}
</style>
