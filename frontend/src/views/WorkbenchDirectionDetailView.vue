<script setup lang="ts">
/**
 * Assumptions / reasoning
 * - The user needs to inspect each direction at full scale before choosing.
 * - This page is still a design lab artifact, not production workbench code.
 */
import { computed } from 'vue'
import { useRoute } from 'vue-router'

import WorkbenchDirectionPreview from '../components/WorkbenchDirectionPreview.vue'
import {
  getWorkbenchDirection,
  workbenchDirections,
} from '../features/design/workbenchDirections'

const route = useRoute()

const direction = computed(() => getWorkbenchDirection(route.params.directionId as string | undefined) ?? null)
const directionIndex = computed(() => workbenchDirections.findIndex((item) => item.id === direction.value?.id))
const previousDirection = computed(() =>
  directionIndex.value > 0 ? workbenchDirections[directionIndex.value - 1] : null,
)
const nextDirection = computed(() =>
  directionIndex.value >= 0 && directionIndex.value < workbenchDirections.length - 1
    ? workbenchDirections[directionIndex.value + 1]
    : null,
)
</script>

<template>
  <div class="detail-page">
    <header class="detail-hero">
      <div class="detail-hero__nav">
        <RouterLink class="nav-link" :to="{ name: 'workbench-direction-lab' }">返回总览</RouterLink>
        <div class="nav-jump" v-if="direction">
          <RouterLink
            v-for="item in workbenchDirections"
            :key="item.id"
            class="jump-chip"
            :class="{ 'jump-chip--active': item.id === direction.id }"
            :to="{ name: 'workbench-direction-detail', params: { directionId: item.id } }"
          >
            {{ item.title }}
          </RouterLink>
        </div>
      </div>

      <template v-if="direction">
        <p class="detail-hero__eyebrow">{{ direction.label }}</p>
        <h1 class="detail-hero__title">{{ direction.title }}</h1>
        <p class="detail-hero__subtitle">{{ direction.subtitle }}</p>
        <p class="detail-hero__summary">{{ direction.summary }}</p>
      </template>

      <template v-else>
        <p class="detail-hero__eyebrow">Direction Not Found</p>
        <h1 class="detail-hero__title">这个方向不存在</h1>
        <p class="detail-hero__summary">可以返回总览重新选择，我们只保留 3 条主方向候选。</p>
      </template>
    </header>

    <main v-if="direction" class="detail-layout">
      <section class="detail-preview">
        <WorkbenchDirectionPreview :direction="direction" />
      </section>

      <section class="detail-notes">
        <article class="note-card">
          <p class="note-card__eyebrow">和当前版本的差距</p>
          <ul class="note-list">
            <li v-for="item in direction.nowGap" :key="item">{{ item }}</li>
          </ul>
        </article>

        <article class="note-card">
          <p class="note-card__eyebrow">如果正式落地，会先改什么</p>
          <ul class="note-list">
            <li v-for="item in direction.rollout" :key="item">{{ item }}</li>
          </ul>
        </article>

        <article class="note-card">
          <p class="note-card__eyebrow">这不是主题切换</p>
          <p class="note-card__copy">
            这 3 个不是未来给用户切换的主题皮肤，而是我们内部先选主方向的产品路线。
            一旦选定，正式实现会继续基于你现在的代码往前做，不会另起炉灶。
          </p>
        </article>

        <div class="direction-switch">
          <RouterLink
            v-if="previousDirection"
            class="switch-link"
            :to="{ name: 'workbench-direction-detail', params: { directionId: previousDirection.id } }"
          >
            ← {{ previousDirection.title }}
          </RouterLink>
          <span v-else class="switch-link switch-link--disabled">← 已是第一项</span>

          <RouterLink
            v-if="nextDirection"
            class="switch-link"
            :to="{ name: 'workbench-direction-detail', params: { directionId: nextDirection.id } }"
          >
            {{ nextDirection.title }} →
          </RouterLink>
          <span v-else class="switch-link switch-link--disabled">已是最后一项 →</span>
        </div>
      </section>
    </main>
  </div>
</template>

<style scoped>
.detail-page {
  min-height: 100vh;
  padding: 32px 24px 56px;
  background:
    radial-gradient(circle at top, rgba(201, 78, 62, 0.08), transparent 22%),
    linear-gradient(180deg, #f7f3eb 0%, #efe9de 100%);
  color: #241f1a;
}

.detail-hero,
.detail-layout {
  width: min(1380px, 100%);
  margin: 0 auto;
}

.detail-hero__nav {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  align-items: center;
  flex-wrap: wrap;
  margin-bottom: 18px;
}

.nav-link,
.jump-chip,
.switch-link {
  display: inline-flex;
  align-items: center;
  text-decoration: none;
  transition: all 160ms ease;
}

.nav-link {
  padding: 10px 14px;
  border-radius: 999px;
  border: 1px solid rgba(95, 85, 77, 0.12);
  background: rgba(255, 251, 245, 0.82);
  color: #5f554d;
  font-size: 13px;
}

.nav-link:hover,
.jump-chip:hover,
.switch-link:hover {
  transform: translateY(-1px);
}

.nav-jump {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.jump-chip {
  padding: 9px 14px;
  border-radius: 999px;
  border: 1px solid rgba(95, 85, 77, 0.1);
  background: rgba(255, 255, 255, 0.68);
  color: #62574d;
  font-size: 13px;
}

.jump-chip--active {
  background: #9e4035;
  border-color: #9e4035;
  color: #fff8f3;
}

.detail-hero__eyebrow,
.note-card__eyebrow {
  margin: 0 0 8px;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: #9a8674;
}

.detail-hero__title {
  margin: 0;
  font-family: var(--font-serif);
  font-size: clamp(34px, 4.8vw, 58px);
  font-weight: 600;
  letter-spacing: 0.04em;
  line-height: 1.06;
}

.detail-hero__subtitle {
  margin: 12px 0 0;
  font-size: 18px;
  color: #6a5f54;
}

.detail-hero__summary {
  width: min(780px, 100%);
  margin: 14px 0 0;
  font-size: 16px;
  line-height: 1.9;
  color: #60554a;
}

.detail-layout {
  display: grid;
  grid-template-columns: minmax(0, 1.45fr) minmax(320px, 0.75fr);
  gap: 24px;
  margin-top: 26px;
  align-items: start;
}

.detail-notes {
  display: grid;
  gap: 16px;
}

.note-card {
  padding: 20px;
  border-radius: 24px;
  border: 1px solid rgba(108, 92, 77, 0.12);
  background: rgba(255, 252, 247, 0.82);
  box-shadow:
    0 20px 36px rgba(73, 52, 28, 0.06),
    inset 0 1px 0 rgba(255, 255, 255, 0.82);
}

.note-list {
  margin: 0;
  padding-left: 18px;
  display: grid;
  gap: 10px;
  color: #554a40;
  font-size: 14px;
  line-height: 1.8;
}

.note-card__copy {
  margin: 0;
  color: #5b5046;
  font-size: 14px;
  line-height: 1.85;
}

.direction-switch {
  display: flex;
  justify-content: space-between;
  gap: 12px;
}

.switch-link {
  padding: 12px 16px;
  border-radius: 18px;
  border: 1px solid rgba(108, 92, 77, 0.12);
  background: rgba(255, 251, 245, 0.86);
  color: #5b5046;
  font-size: 13px;
}

.switch-link--disabled {
  opacity: 0.45;
}

@media (max-width: 1180px) {
  .detail-layout {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 900px) {
  .detail-page {
    padding: 20px 14px 36px;
  }

  .direction-switch {
    flex-direction: column;
  }
}
</style>
