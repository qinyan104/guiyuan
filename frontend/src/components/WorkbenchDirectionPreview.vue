<script setup lang="ts">
import type { WorkbenchDirection } from '../features/design/workbenchDirections'

defineProps<{
  direction: WorkbenchDirection
  compact?: boolean
}>()
</script>

<template>
  <div class="direction-preview" :class="{ 'direction-preview--compact': compact }">
    <div class="prototype-shell" :class="`prototype-shell--${direction.id}`">
      <div class="prototype-topbar">
        <div class="prototype-brand">
          <span class="prototype-brand__mark">归</span>
          <div class="prototype-brand__copy">
            <strong>无涯画布</strong>
            <span v-if="direction.id === 'archive'">卷一 · 修谱案头</span>
            <span v-else-if="direction.id === 'pro'">族谱工作台 · 正在编辑</span>
            <span v-else>共修现场 · 5 人在线</span>
          </div>
        </div>

        <div class="prototype-actions">
          <span class="action-chip">考据</span>
          <span class="action-chip">付梓</span>
          <span class="action-chip action-chip--strong">
            {{ direction.id === 'collab' ? '共修动态' : '编辑人物' }}
          </span>
        </div>
      </div>

      <div class="prototype-body">
        <aside
          v-if="direction.id !== 'archive'"
          class="prototype-rail"
          :class="{ 'prototype-rail--collab': direction.id === 'collab' }"
        >
          <div class="rail-block">
            <span class="rail-title">{{ direction.id === 'collab' ? '协作者' : '视图' }}</span>
            <div v-if="direction.id === 'collab'" class="avatar-stack">
              <span>赵</span>
              <span>韩</span>
              <span>许</span>
              <span>曹</span>
            </div>
            <div v-else class="rail-pills">
              <span>全览</span>
              <span>关系</span>
              <span>纪略</span>
            </div>
          </div>

          <div class="rail-block">
            <span class="rail-title">{{ direction.id === 'collab' ? '待处理' : '状态' }}</span>
            <ul class="rail-list">
              <li>{{ direction.id === 'collab' ? '2 条分支待确认' : '当前人物已定位' }}</li>
              <li>{{ direction.id === 'collab' ? '1 条注记待采纳' : '缩放 38%' }}</li>
            </ul>
          </div>
        </aside>

        <section class="prototype-canvas" :class="`prototype-canvas--${direction.id}`">
          <div class="canvas-grid"></div>

          <div class="tree tree--root"></div>
          <div class="tree tree--branch-left"></div>
          <div class="tree tree--branch-center"></div>
          <div class="tree tree--branch-right"></div>

          <div v-if="direction.id === 'archive'" class="floating-note">
            <span class="floating-note__eyebrow">卷宗注记</span>
            <strong>李军子</strong>
            <p>人物信息不常驻大块提示，以边注式提醒轻触出现。</p>
          </div>

          <div v-if="direction.id === 'pro'" class="focus-band">
            <span>当前人物</span>
            <strong>李军子</strong>
            <em>配偶韩慧 · 4 位子女</em>
          </div>

          <div v-if="direction.id === 'collab'" class="activity-toast">
            <span class="activity-toast__title">韩慧刚刚更新了注记</span>
            <span class="activity-toast__meta">“长房 / 次子”待确认</span>
          </div>

          <div class="mini-map" :class="{ 'mini-map--quiet': direction.id === 'archive' }">
            <div class="mini-map__paper"></div>
          </div>
        </section>

        <aside class="prototype-drawer" :class="`prototype-drawer--${direction.id}`">
          <div class="drawer-head">
            <div class="drawer-avatar">李</div>
            <div>
              <strong>李军子</strong>
              <span>
                {{
                  direction.id === 'collab'
                    ? '当前由 root 与 韩慧共同修订'
                    : direction.id === 'archive'
                      ? '人物录'
                      : '当前人物 · 主编辑区'
                }}
              </span>
            </div>
          </div>

          <div class="drawer-section">
            <span class="drawer-label">生卒信息</span>
            <div class="field-grid">
              <div class="field-box"></div>
              <div class="field-box"></div>
              <div class="field-box"></div>
              <div class="field-box"></div>
            </div>
          </div>

          <div class="drawer-section">
            <span class="drawer-label">
              {{ direction.id === 'collab' ? '讨论与关系' : '亲属关系' }}
            </span>
            <div class="tag-row">
              <span class="relation-tag">韩慧</span>
              <span class="relation-tag">谢涛之</span>
              <span class="relation-tag">曹磊石</span>
            </div>
          </div>

          <div v-if="direction.id === 'collab'" class="drawer-section">
            <span class="drawer-label">近期协作</span>
            <div class="comment-block">
              <strong>韩慧</strong>
              <p>建议把人物注记统一为“长房 / 次子”的写法。</p>
            </div>
          </div>
        </aside>
      </div>
    </div>
  </div>
</template>

<style scoped>
.direction-preview {
  width: 100%;
}

.prototype-shell {
  border-radius: 28px;
  min-height: 700px;
  overflow: hidden;
  border: 1px solid var(--color-card-stroke);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.55),
    0 28px 44px rgba(72, 49, 25, 0.08);
}

.direction-preview--compact .prototype-shell {
  min-height: 480px;
  border-radius: 24px;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.55);
}

.prototype-shell--archive {
  background:
    linear-gradient(180deg, rgba(255, 250, 242, 0.98), rgba(246, 239, 227, 0.98)),
    radial-gradient(circle at top, rgba(168, 120, 67, 0.08), transparent 20%);
}

.prototype-shell--pro {
  background:
    linear-gradient(180deg, rgba(251, 249, 244, 0.98), rgba(240, 235, 227, 0.98)),
    radial-gradient(circle at top, rgba(165, 61, 49, 0.06), transparent 22%);
}

.prototype-shell--collab {
  background:
    linear-gradient(180deg, rgba(249, 246, 240, 0.98), rgba(236, 232, 224, 0.98)),
    radial-gradient(circle at top right, rgba(63, 89, 92, 0.12), transparent 24%);
}

.prototype-topbar {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  align-items: center;
  padding: 18px 20px;
  border-bottom: 1px solid var(--color-card-stroke);
}

.direction-preview--compact .prototype-topbar {
  padding: 16px 18px;
}

.prototype-brand {
  display: flex;
  gap: 12px;
  align-items: center;
  min-width: 0;
}

.prototype-brand__mark {
  width: 36px;
  height: 36px;
  border-radius: 12px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: var(--color-accent);
  color: var(--color-text-on-accent);
  font-family: var(--font-serif);
  font-size: 20px;
  font-weight: 600;
  flex-shrink: 0;
}

.prototype-brand__copy {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.prototype-brand__copy strong {
  font-family: var(--font-serif);
  font-size: 22px;
  font-weight: 600;
  letter-spacing: 0.04em;
}

.direction-preview--compact .prototype-brand__copy strong {
  font-size: 20px;
}

.prototype-brand__copy span,
.drawer-head span,
.activity-toast__meta {
  font-size: 12px;
  color: var(--color-neutral-6);
}

.prototype-actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  justify-content: flex-end;
}

.action-chip,
.relation-tag {
  display: inline-flex;
  align-items: center;
  padding: 7px 12px;
  border-radius: 999px;
  border: 1px solid var(--color-card-stroke);
  background: var(--color-card-fill);
  font-size: 12px;
  color: var(--color-neutral-8);
}

.action-chip--strong {
  background: var(--color-accent);
  border-color: var(--color-accent);
  color: var(--color-text-on-accent);
}

.prototype-body {
  display: grid;
  grid-template-columns: 84px minmax(0, 1fr) 280px;
  min-height: 620px;
}

.direction-preview--compact .prototype-body {
  grid-template-columns: 74px minmax(0, 1fr) 220px;
  min-height: 420px;
}

.prototype-rail {
  padding: 16px 12px;
  border-right: 1px solid var(--color-card-stroke);
  background: var(--color-card-fill);
}

.prototype-rail--collab {
  background: rgba(63, 89, 92, 0.08);
}

.rail-block + .rail-block {
  margin-top: 14px;
}

.rail-title,
.drawer-label,
.floating-note__eyebrow {
  display: block;
  margin-bottom: 8px;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--color-neutral-5);
}

.rail-pills,
.avatar-stack,
.tag-row {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.rail-pills span,
.avatar-stack span {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 26px;
  height: 26px;
  padding: 0 8px;
  border-radius: 999px;
  background: var(--color-card-fill);
  font-size: 11px;
  color: var(--color-neutral-8);
}

.avatar-stack span {
  background: rgba(48, 78, 81, 0.12);
}

.rail-list {
  margin: 0;
  padding: 0;
  list-style: none;
  display: grid;
  gap: 8px;
  font-size: 11px;
  line-height: 1.6;
  color: var(--color-neutral-7);
}

.prototype-canvas {
  position: relative;
  overflow: hidden;
}

.prototype-canvas--archive {
  background:
    linear-gradient(rgba(173, 145, 114, 0.08) 1px, transparent 1px),
    linear-gradient(90deg, rgba(173, 145, 114, 0.08) 1px, transparent 1px),
    transparent;
  background-size: 36px 36px;
}

.direction-preview--compact .prototype-canvas--archive {
  background-size: 32px 32px;
}

.prototype-canvas--pro {
  background:
    linear-gradient(rgba(128, 114, 100, 0.09) 1px, transparent 1px),
    linear-gradient(90deg, rgba(128, 114, 100, 0.09) 1px, transparent 1px),
    linear-gradient(180deg, rgba(255, 255, 255, 0.1), transparent);
  background-size: 32px 32px;
}

.direction-preview--compact .prototype-canvas--pro,
.direction-preview--compact .prototype-canvas--collab {
  background-size: 28px 28px;
}

.prototype-canvas--collab {
  background:
    linear-gradient(rgba(77, 97, 100, 0.12) 1px, transparent 1px),
    linear-gradient(90deg, rgba(77, 97, 100, 0.12) 1px, transparent 1px),
    linear-gradient(180deg, rgba(255, 255, 255, 0.08), transparent);
  background-size: 32px 32px;
}

.canvas-grid {
  position: absolute;
  inset: 0;
  background:
    radial-gradient(circle at 15% 0%, rgba(198, 72, 54, 0.08), transparent 18%),
    radial-gradient(circle at 80% 12%, rgba(148, 114, 64, 0.08), transparent 14%);
}

.tree {
  position: absolute;
  border: 1.5px solid rgba(97, 83, 72, 0.4);
  border-top: none;
}

.tree--root {
  top: 100px;
  left: 18%;
  width: 62%;
  height: 120px;
}

.direction-preview--compact .tree--root {
  top: 76px;
  left: 22%;
  width: 56%;
  height: 92px;
}

.tree--branch-left,
.tree--branch-center,
.tree--branch-right {
  top: 230px;
  width: 23%;
  height: 96px;
}

.direction-preview--compact .tree--branch-left,
.direction-preview--compact .tree--branch-center,
.direction-preview--compact .tree--branch-right {
  top: 168px;
  width: 21%;
  height: 74px;
}

.tree--branch-left {
  left: 8%;
}

.tree--branch-center {
  left: 38.5%;
}

.tree--branch-right {
  right: 8%;
}

.floating-note,
.focus-band,
.activity-toast {
  position: absolute;
  border-radius: 18px;
  border: 1px solid var(--color-card-stroke);
  box-shadow: 0 18px 28px rgba(72, 49, 25, 0.08);
}

.floating-note {
  top: 28px;
  right: 24px;
  width: 240px;
  padding: 16px 18px;
  background: var(--color-card-fill);
}

.direction-preview--compact .floating-note {
  top: 26px;
  right: 18px;
  width: 180px;
  padding: 14px 15px;
}

.floating-note strong,
.focus-band strong,
.drawer-head strong,
.activity-toast__title {
  display: block;
  font-family: var(--font-serif);
  font-size: 18px;
  font-weight: 600;
  color: var(--color-neutral-10);
}

.floating-note p {
  margin: 8px 0 0;
  font-size: 12px;
  line-height: 1.7;
  color: var(--color-neutral-7);
}

.focus-band {
  top: 28px;
  right: 24px;
  display: grid;
  gap: 4px;
  min-width: 220px;
  padding: 16px 18px;
  background: var(--color-card-fill);
}

.direction-preview--compact .focus-band {
  top: 22px;
  right: 20px;
  min-width: 176px;
  padding: 14px 16px;
}

.focus-band span,
.focus-band em {
  font-size: 12px;
  color: var(--color-neutral-6);
  font-style: normal;
}

.activity-toast {
  left: 24px;
  bottom: 20px;
  width: 220px;
  padding: 14px 16px;
  background: var(--color-card-fill);
}

.direction-preview--compact .activity-toast {
  left: 20px;
  bottom: 16px;
  width: 186px;
  padding: 13px 14px;
}

.mini-map {
  position: absolute;
  right: 24px;
  bottom: 20px;
  width: 164px;
  height: 136px;
  border-radius: 22px;
  border: 1px solid var(--color-card-stroke);
  background: var(--color-card-fill);
  backdrop-filter: blur(8px);
}

.direction-preview--compact .mini-map {
  right: 18px;
  bottom: 16px;
  width: 120px;
  height: 108px;
}

.mini-map--quiet {
  opacity: 0.72;
}

.mini-map__paper {
  position: absolute;
  inset: 16px;
  border-radius: 12px;
  border: 1px dashed var(--color-accent-ghost);
}

.prototype-drawer {
  padding: 18px 16px;
  border-left: 1px solid var(--color-card-stroke);
  background: var(--color-card-fill);
}

.direction-preview--compact .prototype-drawer {
  padding: 16px 14px;
}

.prototype-drawer--collab {
  background: var(--color-card-fill);
}

.drawer-head {
  display: flex;
  gap: 12px;
  align-items: center;
}

.drawer-avatar {
  width: 42px;
  height: 42px;
  border-radius: 16px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: var(--color-accent-ghost);
  color: var(--color-accent-deep);
  font-family: var(--font-serif);
  font-size: 20px;
  font-weight: 600;
}

.drawer-section + .drawer-section {
  margin-top: 16px;
}

.field-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
}

.field-box,
.comment-block {
  border-radius: 14px;
  border: 1px solid var(--color-card-stroke);
  background: var(--color-card-fill);
}

.field-box {
  height: 38px;
}

.comment-block {
  padding: 10px 12px;
}

.comment-block p {
  margin: 6px 0 0;
  font-size: 12px;
  line-height: 1.7;
  color: var(--color-neutral-7);
}

@media (max-width: 980px) {
  .prototype-shell {
    min-height: auto;
  }

  .prototype-body,
  .direction-preview--compact .prototype-body {
    grid-template-columns: 1fr;
  }

  .prototype-rail,
  .prototype-drawer {
    border: none;
    border-top: 1px solid var(--color-card-stroke);
  }

  .prototype-canvas {
    min-height: 360px;
  }

  .direction-preview--compact .prototype-canvas {
    min-height: 340px;
  }
}
</style>
