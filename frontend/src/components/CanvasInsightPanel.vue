<script setup lang="ts">
import { computed, inject, ref } from 'vue'
import { useRouter } from 'vue-router'
import { PUBLICATION_CONTEXT_KEY, type Person } from '../types/family'
import { parseYear } from '../lib/dateUtils'

const router = useRouter()
const context = inject(PUBLICATION_CONTEXT_KEY)!
const pubId = computed(() => context.serverPublicationId.value)
const pubTitle = computed(() => context.pub.publication.title || '未命名族谱')
const expanded = ref(false)

const people = computed<Person[]>(() =>
  Object.values(context.pub.publication.people ?? {}),
)

const totalPeople = computed(() => people.value.length)
const males = computed(() => people.value.filter((p) => p.gender === 'male').length)
const females = computed(() => people.value.filter((p) => p.gender === 'female').length)
const malePercent = computed(() =>
  totalPeople.value > 0 ? Math.round((males.value / totalPeople.value) * 100) : 0,
)

// 世代数：遍历家庭树计算最大深度
const generationCount = computed(() => {
  const families = context.pub.publication.families
  if (!families) return 0
  const rootId = context.pub.publication.focusFamilyId
  const rootFamily = rootId ? families[rootId] : Object.values(families)[0]
  if (!rootFamily) return 0

  const visited = new Set<string>()
  let maxDepth = 1
  function walk(familyId: string, depth: number) {
    if (visited.has(familyId)) return
    visited.add(familyId)
    maxDepth = Math.max(maxDepth, depth)
    const fam = families[familyId]
    if (!fam) return
    for (const childId of fam.children) {
      for (const [fid, f] of Object.entries(families)) {
        if (f.adults.includes(childId)) {
          walk(fid, depth + 1)
        }
      }
    }
  }
  walk(rootFamily.id, 1)
  return maxDepth
})

const timeSpan = computed(() => {
  const years = people.value.flatMap((p) => {
    const b = parseYear(p.birth)
    const d = parseYear(p.death)
    return [b, d].filter((y): y is number => y !== null)
  })
  if (years.length === 0) return null
  return { earliest: Math.min(...years), latest: Math.max(...years) }
})

const timeSpanLabel = computed(() => {
  if (!timeSpan.value) return '待补充'
  return `${timeSpan.value.earliest}—${timeSpan.value.latest}`
})

function toggle() {
  expanded.value = !expanded.value
}

function goToStats() {
  if (pubId.value) {
    router.push({ name: 'publication-stats', params: { id: pubId.value } })
  }
}

function goToTimeline() {
  if (pubId.value) {
    router.push({ name: 'publication-timeline', params: { id: pubId.value } })
  }
}
</script>

<template>
  <div v-if="totalPeople > 0" class="insight-panel" :class="{ 'insight-panel--expanded': expanded }">
    <!-- 折叠态：一行关键数字 -->
    <button class="insight-strip" @click="toggle" :title="expanded ? '收起' : '展开家族洞察'">
      <div class="strip-item">
        <span class="strip-icon">👥</span>
        <strong>{{ totalPeople }}</strong>
        <span>人</span>
      </div>
      <div class="strip-divider"></div>
      <div class="strip-item">
        <span class="strip-icon">🌳</span>
        <strong>{{ generationCount }}</strong>
        <span>代</span>
      </div>
      <div class="strip-divider"></div>
      <div class="strip-item">
        <span class="strip-icon">🕐</span>
        <span>{{ timeSpanLabel }}</span>
      </div>
      <div class="strip-divider"></div>
      <div class="strip-item">
        <span class="strip-icon">♂</span>
        <strong>{{ malePercent }}</strong>
        <span>%</span>
        <span class="strip-icon strip-icon--fem">♀</span>
        <strong>{{ 100 - malePercent }}</strong>
        <span>%</span>
      </div>
      <div class="strip-chevron">{{ expanded ? '▾' : '▴' }}</div>
    </button>

    <!-- 展开态：更多详情 + 入口按钮 -->
    <div v-if="expanded" class="insight-detail">
      <div class="detail-grid">
        <div class="detail-item">
          <span class="detail-label">总人数</span>
          <span class="detail-value">{{ totalPeople }} 人（男 {{ males }} / 女 {{ females }}）</span>
        </div>
        <div class="detail-item">
          <span class="detail-label">世代层级</span>
          <span class="detail-value">{{ generationCount }} 代</span>
        </div>
        <div class="detail-item">
          <span class="detail-label">时间跨度</span>
          <span class="detail-value">{{ timeSpanLabel }}</span>
        </div>
      </div>

      <div class="detail-actions">
        <button class="detail-btn" @click="goToStats">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 20V10"/><path d="M12 20V4"/><path d="M6 20v-6"/></svg>
          家族纪略
        </button>
        <button class="detail-btn" @click="goToTimeline">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
          家族编年史
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.insight-panel {
  position: absolute;
  bottom: 16px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 50;
  background: var(--color-panel-bg, #fff);
  border: 1px solid var(--color-card-stroke, rgba(0,0,0,0.08));
  border-radius: 20px;
  box-shadow: 0 8px 32px rgba(0,0,0,0.1);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  overflow: hidden;
  transition: box-shadow 0.2s;
}

.insight-panel--expanded {
  box-shadow: 0 16px 48px rgba(0,0,0,0.14);
}

/* ── 折叠态横条 ── */
.insight-strip {
  display: flex;
  align-items: center;
  gap: 0;
  padding: 10px 16px;
  border: none;
  background: transparent;
  cursor: pointer;
  font-size: 13px;
  color: var(--color-neutral-8);
  white-space: nowrap;
  user-select: none;
  transition: background 0.15s;
  width: 100%;
}

.insight-strip:hover {
  background: var(--color-neutral-2, rgba(0,0,0,0.03));
}

.strip-item {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 0 10px;
}

.strip-item strong {
  font-family: 'Noto Serif SC', serif;
  font-size: 15px;
  color: var(--color-neutral-9);
}

.strip-item span {
  color: var(--color-neutral-6);
  font-size: 12px;
}

.strip-icon {
  font-size: 14px;
  line-height: 1;
}

.strip-icon--fem {
  color: #e87da0;
  margin-left: 6px;
}

.strip-divider {
  width: 1px;
  height: 20px;
  background: var(--color-neutral-4, rgba(0,0,0,0.08));
  flex-shrink: 0;
}

.strip-chevron {
  margin-left: 8px;
  font-size: 10px;
  color: var(--color-neutral-5);
  transition: transform 0.2s;
}

/* ── 展开态详情 ── */
.insight-detail {
  padding: 0 16px 14px;
  display: flex;
  flex-direction: column;
  gap: 14px;
  border-top: 1px solid var(--color-neutral-3, rgba(0,0,0,0.05));
  padding-top: 14px;
}

.detail-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
}

.detail-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.detail-label {
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.15em;
  text-transform: uppercase;
  color: var(--color-neutral-5);
}

.detail-value {
  font-size: 13px;
  color: var(--color-neutral-8);
  font-weight: 500;
}

.detail-actions {
  display: flex;
  gap: 10px;
}

.detail-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  border: 1px solid var(--color-neutral-4);
  border-radius: 999px;
  background: var(--color-neutral-1);
  color: var(--color-neutral-8);
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s;
}

.detail-btn:hover {
  background: var(--color-neutral-9);
  color: #fff;
  border-color: var(--color-neutral-9);
}

.detail-btn svg {
  flex-shrink: 0;
}

@media (max-width: 640px) {
  .strip-item {
    padding: 0 6px;
  }
  .strip-item span {
    display: none;
  }
  .detail-grid {
    grid-template-columns: 1fr;
  }
  .detail-actions {
    flex-direction: column;
  }
}
</style>
