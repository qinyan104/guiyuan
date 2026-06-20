<script setup lang="ts">
/**
 * Assumptions / reasoning
 * - This page is a safe design lab, not production workbench code.
 * - The user wants three clearly different directions before committing to one branch.
 * - The current product priorities are: editing efficiency first, ritual + modern professional tone,
 *   and a long-term path toward collaborative family editing.
 */
import WorkbenchDirectionPreview from '../components/WorkbenchDirectionPreview.vue'
import { workbenchDirections } from '../features/design/workbenchDirections'
</script>

<template>
  <div class="lab-page">
    <header class="lab-hero">
      <p class="lab-hero__eyebrow">Workbench Direction Lab</p>
      <h1 class="lab-hero__title">先定主方向，再进正式页面打磨</h1>
      <p class="lab-hero__copy">
        这不是换皮对比，而是 3 条不同的产品气质路线。你先看总览，再进入每个方向的全屏页看完整比例和信息层级，最后再决定哪一条进入正式实现。
      </p>
      <div class="lab-hero__meta">
        <span class="lab-pill">总览页</span>
        <span class="lab-pill">全屏单页</span>
        <span class="lab-pill lab-pill--accent">推荐先看方向 B</span>
      </div>
    </header>

    <main class="lab-grid">
      <article
        v-for="direction in workbenchDirections"
        :key="direction.id"
        class="direction-card"
        :class="{ 'direction-card--recommended': direction.recommended }"
      >
        <div class="direction-card__header">
          <div>
            <p class="direction-card__label">{{ direction.label }}</p>
            <h2 class="direction-card__title">{{ direction.title }}</h2>
            <p class="direction-card__subtitle">{{ direction.subtitle }}</p>
          </div>
          <span v-if="direction.recommended" class="direction-card__badge">推荐先做</span>
        </div>

        <div class="direction-card__preview">
          <WorkbenchDirectionPreview :direction="direction" compact />
        </div>

        <div class="direction-card__body">
          <p class="direction-card__summary">{{ direction.summary }}</p>

          <div class="direction-card__facts">
            <div>
              <span class="fact-label">适合</span>
              <p>{{ direction.fit }}</p>
            </div>
            <div>
              <span class="fact-label">风险</span>
              <p>{{ direction.risk }}</p>
            </div>
          </div>

          <ul class="direction-card__list">
            <li v-for="item in direction.bullets" :key="item">{{ item }}</li>
          </ul>

          <div class="direction-card__actions">
            <RouterLink
              class="direction-link"
              :to="{ name: 'workbench-direction-detail', params: { directionId: direction.id } }"
            >
              全屏查看
            </RouterLink>
          </div>
        </div>
      </article>
    </main>

    <section class="decision-panel">
      <p class="decision-panel__eyebrow">Current Recommendation</p>
      <h2>先用「专业修谱台」进入正式打磨</h2>
      <p>
        它最稳，也最符合你现在的商业目标。先把核心编辑体验做成竞争力，再把仪式感和共修能力逐步叠加，而不是一开始把工作台做重。
      </p>
    </section>
  </div>
</template>

<style scoped>
.lab-page {
  min-height: 100vh;
  padding: 48px 28px 72px;
  background:
    radial-gradient(circle at top, rgba(201, 78, 62, 0.08), transparent 24%),
    linear-gradient(180deg, #f8f4ed 0%, #f2ede3 100%);
  color: #241f1a;
}

.lab-hero {
  width: min(1100px, 100%);
  margin: 0 auto 34px;
}

.lab-hero__eyebrow,
.decision-panel__eyebrow,
.direction-card__label,
.fact-label {
  margin: 0 0 8px;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: #9a8674;
}

.lab-hero__title {
  margin: 0;
  font-family: 'Noto Serif SC', 'Source Han Serif SC', serif;
  font-size: clamp(32px, 4.8vw, 54px);
  font-weight: 600;
  letter-spacing: 0.04em;
  line-height: 1.08;
}

.lab-hero__copy {
  width: min(760px, 100%);
  margin: 14px 0 0;
  font-size: 16px;
  line-height: 1.8;
  color: #5f554d;
}

.lab-hero__meta {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 20px;
}

.lab-pill,
.direction-link {
  display: inline-flex;
  align-items: center;
  text-decoration: none;
}

.lab-pill {
  padding: 8px 14px;
  border-radius: 999px;
  border: 1px solid rgba(95, 85, 77, 0.12);
  background: rgba(255, 251, 245, 0.78);
  font-size: 13px;
  color: #5f554d;
}

.lab-pill--accent {
  border-color: rgba(159, 56, 43, 0.18);
  background: rgba(159, 56, 43, 0.08);
  color: #82362e;
}

.lab-grid {
  width: min(1300px, 100%);
  margin: 0 auto;
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 22px;
  align-items: start;
}

.direction-card {
  border-radius: 28px;
  border: 1px solid rgba(108, 92, 77, 0.12);
  background: rgba(255, 252, 247, 0.82);
  box-shadow:
    0 24px 40px rgba(73, 52, 28, 0.08),
    inset 0 1px 0 rgba(255, 255, 255, 0.8);
  overflow: hidden;
}

.direction-card--recommended {
  border-color: rgba(159, 56, 43, 0.22);
  box-shadow:
    0 26px 42px rgba(73, 52, 28, 0.1),
    inset 0 1px 0 rgba(255, 255, 255, 0.8),
    0 0 0 1px rgba(159, 56, 43, 0.06);
}

.direction-card__header,
.direction-card__body {
  padding: 22px 22px 0;
}

.direction-card__header {
  display: flex;
  justify-content: space-between;
  gap: 14px;
  align-items: flex-start;
}

.direction-card__title {
  margin: 0;
  font-family: 'Noto Serif SC', 'Source Han Serif SC', serif;
  font-size: 28px;
  font-weight: 600;
  letter-spacing: 0.04em;
}

.direction-card__subtitle {
  margin: 8px 0 0;
  font-size: 14px;
  line-height: 1.7;
  color: #6b6056;
}

.direction-card__badge {
  display: inline-flex;
  align-items: center;
  padding: 7px 12px;
  border-radius: 999px;
  background: #923d34;
  color: #fff8f3;
  font-size: 12px;
  font-weight: 600;
  white-space: nowrap;
}

.direction-card__preview {
  padding: 18px 18px 0;
}

.direction-card__body {
  padding-bottom: 24px;
}

.direction-card__summary {
  margin: 18px 0 0;
  font-size: 14px;
  line-height: 1.85;
  color: #5d534a;
}

.direction-card__facts {
  display: grid;
  gap: 12px;
  margin-top: 18px;
}

.direction-card__facts p {
  margin: 4px 0 0;
  font-size: 13px;
  line-height: 1.75;
  color: #62574d;
}

.direction-card__list {
  margin: 18px 0 0;
  padding-left: 18px;
  display: grid;
  gap: 8px;
  color: #4f473f;
  font-size: 13px;
  line-height: 1.7;
}

.direction-card__actions {
  margin-top: 20px;
}

.direction-link {
  padding: 11px 16px;
  border-radius: 999px;
  background: rgba(159, 56, 43, 0.1);
  border: 1px solid rgba(159, 56, 43, 0.14);
  color: #8b3a31;
  font-size: 13px;
  font-weight: 600;
  transition: transform 160ms ease, background 160ms ease;
}

.direction-link:hover {
  transform: translateY(-1px);
  background: rgba(159, 56, 43, 0.14);
}

.decision-panel {
  width: min(1300px, 100%);
  margin: 28px auto 0;
  padding: 24px 26px;
  border-radius: 28px;
  border: 1px solid rgba(159, 56, 43, 0.14);
  background:
    linear-gradient(180deg, rgba(255, 251, 246, 0.88), rgba(250, 240, 233, 0.84));
  box-shadow:
    0 22px 40px rgba(73, 52, 28, 0.06),
    inset 0 1px 0 rgba(255, 255, 255, 0.84);
}

.decision-panel h2 {
  margin: 0;
  font-family: 'Noto Serif SC', 'Source Han Serif SC', serif;
  font-size: 28px;
  font-weight: 600;
  letter-spacing: 0.04em;
}

.decision-panel p {
  margin: 12px 0 0;
  width: min(760px, 100%);
  font-size: 15px;
  line-height: 1.85;
  color: #60554a;
}

@media (max-width: 1260px) {
  .lab-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 900px) {
  .lab-page {
    padding: 24px 14px 48px;
  }
}
</style>
