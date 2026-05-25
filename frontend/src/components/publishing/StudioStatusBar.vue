<script setup lang="ts">
defineProps<{
  currentPage: number
  totalPages: number
  paper: "A4" | "A3"
  templateName: string
}>()
</script>

<template>
  <div class="bar">
    <span class="chip">{{ currentPage }} / {{ totalPages }}</span>
    <span class="chip">{{ templateName }}</span>
    <span class="chip">{{ paper }}</span>
  </div>
</template>

<style scoped>
.bar {
  display: flex; align-items: center; gap: 8px;
  padding: 6px 20px;
  border-top: 1px solid var(--color-card-stroke);
  background: var(--color-panel-bg);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  font-size: 11px; color: var(--color-neutral-6);
  flex-shrink: 0;
}
.chip {
  padding: 2px 8px; border-radius: 999px;
  background: var(--color-neutral-2); color: var(--color-neutral-6);
  font-weight: 500;
}
</style>