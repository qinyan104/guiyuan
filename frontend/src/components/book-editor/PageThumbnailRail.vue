<script setup lang="ts">
import type { BookPageLayout } from "../../types/bookDocument"

defineProps<{
  pages: BookPageLayout[]
  currentPage: number
}>()

const emit = defineEmits<{
  select: [pageIndex: number]
}>()

function isCover(page: BookPageLayout) {
  return page.blocks.some((item) => item.block.type === "cover")
}

function sideLabel(index: number) {
  if (index === 0) return "封面"
  return (index - 1) % 2 === 0 ? "右页" : "左页"
}
</script>

<template>
  <aside class="thumb-rail">
    <div class="rail-head">
      <span>页册总览</span>
      <strong>{{ pages.length }}</strong>
    </div>
    <div class="thumb-list">
      <button
        v-for="(page, index) in pages"
        :key="page.pageNumber"
        :class="['thumb', { active: index === currentPage, cover: isCover(page), left: sideLabel(index) === '左页', right: sideLabel(index) === '右页' }]"
        type="button"
        @click="emit('select', index)"
      >
        <div class="paper">
          <span>{{ page.pageNumber }}</span>
        </div>
        <small>{{ sideLabel(index) }} · 第 {{ page.pageNumber }} 页</small>
      </button>
    </div>
  </aside>
</template>

<style scoped>
.thumb-rail {
  width: 136px;
  padding: 12px 8px 20px;
  overflow-y: auto;
  border-right: 1px solid var(--line-soft, rgba(122, 95, 65, 0.14));
  background: var(--bg-paper-raised, #faf6ef);
  box-sizing: border-box;
  flex-shrink: 0;
}

.rail-head {
  height: 26px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
  padding: 0 4px;
  color: var(--text-sub, #6b5e52);
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.02em;
}

.rail-head strong {
  min-width: 20px;
  height: 17px;
  display: grid;
  place-items: center;
  border-radius: 4px;
  background: var(--fill-subtle, rgba(0, 0, 0, 0.06));
  color: var(--text-main, #241a10);
  font-size: 10.5px;
  font-variant-numeric: tabular-nums;
}

.thumb-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.thumb {
  width: 100%;
  display: block;
  border: 1px solid transparent;
  border-radius: 8px;
  background: transparent;
  padding: 6px 0 8px;
  color: var(--text-soft, #8f8878);
  cursor: pointer;
  transition: all 0.15s ease;
}

.thumb:hover {
  background: var(--bg-paper, #ffffff);
  border-color: var(--line-subtle, rgba(122, 95, 65, 0.12));
}

.thumb:active {
  transform: translateY(1px);
}

.thumb.active {
  background: var(--bg-paper, #ffffff);
  border-color: var(--color-accent, #724f2e);
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.06);
}

.paper {
  width: 72px;
  height: 100px;
  margin: 0 auto 5px;
  position: relative;
  display: grid;
  place-items: center;
  border: 1px solid rgba(28, 24, 20, 0.2);
  border-radius: 2px;
  background:
    repeating-linear-gradient(to left, rgba(38, 28, 18, 0.08) 0 1px, transparent 1px 8px),
    #fffcf6;
  box-shadow: 0 4px 10px rgba(46, 37, 26, 0.07);
}

.thumb.cover .paper {
  background:
    linear-gradient(90deg, rgba(9, 34, 45, 0.18), transparent 16%, transparent 84%, rgba(9, 34, 45, 0.12)),
    #213943;
}

.thumb.cover .paper::before {
  content: "";
  width: 16px;
  height: 52px;
  border: 1px solid rgba(138, 31, 22, 0.42);
  background: #ead9b8;
}

.thumb.cover .paper::after {
  inset: auto;
  left: 8px;
  top: 16px;
  bottom: 16px;
  width: 1px;
  border: 0;
  background: rgba(232, 214, 178, 0.36);
}

.thumb.cover .paper span {
  display: none;
}

.thumb.left .paper {
  box-shadow: inset -6px 0 10px rgba(76, 51, 28, 0.08), 0 4px 10px rgba(46, 37, 26, 0.08);
}

.thumb.right .paper {
  box-shadow: inset 6px 0 10px rgba(76, 51, 28, 0.08), 0 4px 10px rgba(46, 37, 26, 0.08);
}

.paper::after {
  content: "";
  position: absolute;
  inset: 6px;
  border: 1px solid rgba(20, 17, 14, 0.14);
  pointer-events: none;
}

.paper span {
  position: relative;
  z-index: 1;
  min-width: 20px;
  height: 20px;
  display: grid;
  place-items: center;
  border-radius: 4px;
  background: rgba(255, 252, 246, 0.88);
  color: var(--text-main, #241a10);
  font-size: 11px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
}

.thumb.active .paper {
  border-color: var(--color-accent, #724f2e);
  box-shadow: 0 0 0 2px rgba(114, 79, 46, 0.16), 0 6px 14px rgba(46, 37, 26, 0.12);
}

.thumb.active small {
  color: var(--color-accent, #724f2e);
  font-weight: 600;
}

small {
  display: block;
  font-size: 10.5px;
  font-weight: 500;
  text-align: center;
}
</style>
