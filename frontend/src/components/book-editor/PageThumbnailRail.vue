<script setup lang="ts">
import type { BookPageLayout } from "../../types/bookDocument"

defineProps<{
  pages: BookPageLayout[]
  currentPage: number
}>()

const emit = defineEmits<{
  select: [pageIndex: number]
}>()
</script>

<template>
  <aside class="thumb-rail">
    <div class="rail-head">
      <span>页册</span>
      <strong>{{ pages.length }}</strong>
    </div>
    <button
      v-for="(page, index) in pages"
      :key="page.pageNumber"
      :class="['thumb', { active: index === currentPage }]"
      type="button"
      @click="emit('select', index)"
    >
      <div class="paper">
        <span>{{ page.pageNumber }}</span>
      </div>
      <small>第 {{ page.pageNumber }} 页</small>
    </button>
  </aside>
</template>

<style scoped>
.thumb-rail {
  width: 136px;
  padding: 16px 12px 20px;
  overflow-y: auto;
  border-right: 1px solid rgba(28, 24, 20, 0.08);
  background: #f4efe6;
}

.rail-head {
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 10px;
  padding: 0 3px;
  color: #7a705f;
  font-size: 11px;
  font-weight: 700;
}

.rail-head strong {
  min-width: 24px;
  height: 20px;
  display: grid;
  place-items: center;
  border-radius: 5px;
  background: #e8dfd0;
  color: #463e32;
  font-variant-numeric: tabular-nums;
}

.thumb {
  width: 100%;
  display: block;
  border: 1px solid transparent;
  border-radius: 6px;
  background: transparent;
  padding: 8px 0 10px;
  color: #746a5a;
  cursor: pointer;
  transition: background 180ms ease, border-color 180ms ease, transform 180ms ease;
}

.thumb:hover {
  background: #fffdfa;
  border-color: rgba(28, 24, 20, 0.08);
}

.thumb:active { transform: translateY(1px); }

.thumb:focus-visible {
  outline: 2px solid rgba(198, 60, 46, 0.18);
  outline-offset: 2px;
}

.paper {
  width: 74px;
  height: 104px;
  margin: 0 auto 6px;
  position: relative;
  display: grid;
  place-items: center;
  border: 1px solid rgba(28, 24, 20, 0.22);
  background:
    repeating-linear-gradient(to left, rgba(0, 0, 0, 0.18) 0 1px, transparent 1px 8px),
    #fffaf0;
  box-shadow: 0 8px 18px rgba(46, 37, 26, 0.1);
}

.paper::after {
  content: "";
  position: absolute;
  inset: 8px;
  border: 1px solid rgba(20, 17, 14, 0.18);
  pointer-events: none;
}

.paper span {
  position: relative;
  z-index: 1;
  min-width: 22px;
  height: 22px;
  display: grid;
  place-items: center;
  border-radius: 4px;
  background: rgba(255, 252, 246, 0.82);
  color: #1c1814;
  font-size: 12px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
}

.thumb.active .paper {
  border-color: var(--color-accent);
  box-shadow: 0 0 0 3px rgba(198, 60, 46, 0.12), 0 10px 22px rgba(46, 37, 26, 0.16);
}

.thumb.active small { color: var(--color-accent); }

small {
  font-size: 11px;
  font-weight: 600;
}
</style>
