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
  padding: 14px 12px;
  overflow-y: auto;
  border-right: 1px solid var(--color-card-stroke);
  background: var(--color-neutral-2);
}

.thumb {
  width: 100%;
  display: block;
  border: 0;
  background: transparent;
  padding: 6px 0 10px;
  color: var(--color-neutral-6);
  cursor: pointer;
}

.paper {
  width: 74px;
  height: 104px;
  margin: 0 auto 6px;
  display: grid;
  place-items: center;
  border: 1px solid rgba(122, 90, 56, 0.35);
  background: #f8f0df;
  box-shadow: 0 6px 16px rgba(30, 24, 18, 0.08);
}

.thumb.active .paper {
  border-color: var(--color-accent);
  box-shadow: 0 0 0 2px var(--color-accent-muted), 0 8px 20px rgba(30, 24, 18, 0.12);
}

small { font-size: 11px; }
</style>
