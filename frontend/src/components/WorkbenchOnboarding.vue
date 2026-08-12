<script lang="ts">
export const WORKBENCH_ONBOARDING_STORAGE_KEY = 'guiyuan:workbench-onboarding-dismissed'
</script>

<script setup lang="ts">
import { onMounted, ref } from 'vue'

const isVisible = ref(false)

onMounted(() => {
  try {
    isVisible.value = localStorage.getItem(WORKBENCH_ONBOARDING_STORAGE_KEY) !== '1'
  } catch {
    isVisible.value = true
  }
})

function dismiss() {
  isVisible.value = false
  try {
    localStorage.setItem(WORKBENCH_ONBOARDING_STORAGE_KEY, '1')
  } catch {
    // Keep the guide dismissed for this visit when local storage is unavailable.
  }
}
</script>

<template>
  <aside
    v-if="isVisible"
    data-testid="workbench-onboarding"
    class="workbench-onboarding"
    aria-labelledby="workbench-onboarding-title"
  >
    <div class="workbench-onboarding__copy">
      <h2 id="workbench-onboarding-title">从一位亲人开始</h2>
      <p>先熟悉这三步，就能安心整理这一支家人。</p>
    </div>

    <ol class="workbench-onboarding__steps">
      <li>
        <span aria-hidden="true">1</span>
        <div>
          <strong>拖动画布</strong>
          <p>按住空白处移动，查看整份族谱。</p>
        </div>
      </li>
      <li>
        <span aria-hidden="true">2</span>
        <div>
          <strong>选择一位族人</strong>
          <p>点击人物卡，查看他与当前宗支的关系。</p>
        </div>
      </li>
      <li>
        <span aria-hidden="true">3</span>
        <div>
          <strong>编辑人物</strong>
          <p>从资料开始，再逐步补充亲属关系。</p>
        </div>
      </li>
    </ol>

    <button type="button" @click="dismiss">开始整理</button>
  </aside>
</template>

<style scoped>
.workbench-onboarding {
  position: absolute;
  z-index: 12;
  left: 20px;
  bottom: 20px;
  width: min(328px, calc(100% - 40px));
  padding: 20px;
  border-radius: var(--radius-xl);
  background: var(--color-panel-glass-bg);
  color: var(--color-neutral-9);
  box-shadow: var(--shadow-whisper);
  backdrop-filter: blur(16px) saturate(125%);
  -webkit-backdrop-filter: blur(16px) saturate(125%);
  animation: onboarding-enter var(--duration-panel) var(--ease-breath) both;
}

.workbench-onboarding__copy h2 {
  margin: 0;
  color: var(--color-neutral-10);
  font-family: var(--font-serif);
  font-size: var(--text-title-20);
  font-weight: 500;
  line-height: var(--leading-title);
}

.workbench-onboarding__copy > p {
  margin: 6px 0 0;
  color: var(--color-neutral-7);
  font-size: var(--text-copy-13);
  line-height: var(--leading-copy);
}

.workbench-onboarding__steps {
  display: grid;
  gap: 12px;
  margin: 18px 0;
  padding: 0;
  list-style: none;
}

.workbench-onboarding__steps li {
  display: grid;
  grid-template-columns: 22px minmax(0, 1fr);
  gap: 10px;
  align-items: start;
}

.workbench-onboarding__steps li > span {
  display: grid;
  width: 22px;
  height: 22px;
  place-items: center;
  border-radius: 50%;
  background: var(--color-accent-muted);
  color: var(--color-accent);
  font-size: var(--text-label-12);
  font-weight: 600;
  line-height: 1;
}

.workbench-onboarding__steps strong {
  display: block;
  color: var(--color-neutral-9);
  font-size: var(--text-copy-14);
  font-weight: 500;
  line-height: var(--leading-label);
}

.workbench-onboarding__steps p {
  margin: 2px 0 0;
  color: var(--color-neutral-7);
  font-size: var(--text-label-12);
  line-height: var(--leading-label);
}

.workbench-onboarding button {
  width: 100%;
  min-height: 40px;
  border: 0;
  border-radius: var(--radius-md);
  background: var(--color-accent-gradient);
  color: var(--color-text-on-accent);
  font: inherit;
  font-size: var(--text-copy-14);
  font-weight: 500;
  cursor: pointer;
  box-shadow: var(--shadow-accent);
  transition: filter var(--duration-fast) var(--ease-breath), transform var(--duration-fast) var(--ease-breath);
}

.workbench-onboarding button:hover {
  filter: brightness(1.08);
}

.workbench-onboarding button:active {
  transform: scale(0.98);
}

.workbench-onboarding button:focus-visible {
  outline: 2px solid var(--color-accent);
  outline-offset: 3px;
}

@keyframes onboarding-enter {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
}

@media (max-width: 640px) {
  .workbench-onboarding {
    left: 12px;
    bottom: 12px;
    width: calc(100% - 24px);
    max-width: none;
    padding: 16px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .workbench-onboarding,
  .workbench-onboarding button {
    animation: none;
    transition: none;
  }
}
</style>
