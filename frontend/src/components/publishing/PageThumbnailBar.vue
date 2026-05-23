<script setup lang="ts">
import PageThumbnail from "./PageThumbnail.vue"

defineProps<{
  sheetCount: number
  activeSheetIndex: number
  sheetTypes: string[]
}>()

defineEmits<{
  selectSheet: [index: number]
  deleteSheet: [index: number]
  addSheet: []
}>()
</script>

<template>
  <div class="thumbnail-bar">
    <PageThumbnail
      v-for="i in sheetCount"
      :key="i"
      :sheetNumber="i"
      :sheetType="sheetTypes[i - 1] || '正文'"
      :active="i - 1 === activeSheetIndex"
      @select="$emit('selectSheet', i - 1)"
      @delete="$emit('deleteSheet', i - 1)"
    />
    <button class="btn-add-sheet" @click="$emit('addSheet')">+ 新页</button>
  </div>
</template>

<style scoped>
.thumbnail-bar {
  width: 100px;
  padding: 12px 10px;
  border-right: 1px solid var(--color-neutral-3);
  background: var(--color-neutral-1);
  flex-shrink: 0;
  overflow-y: auto;
}

.btn-add-sheet {
  display: block;
  width: 80px;
  margin: 8px auto 0;
  padding: 10px 0;
  background: transparent;
  border: 2px dashed var(--color-neutral-4);
  border-radius: 4px;
  color: var(--color-neutral-6);
  font-size: 13px;
  cursor: pointer;
  transition: border-color 0.15s, color 0.15s;
}
.btn-add-sheet:hover {
  border-color: var(--color-accent);
  color: var(--color-accent);
}
</style>
