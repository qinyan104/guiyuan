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
  border-right: 1px solid #e8e0d5;
  background: #faf7f2;
  flex-shrink: 0;
  overflow-y: auto;
}

.btn-add-sheet {
  display: block;
  width: 80px;
  margin: 8px auto 0;
  padding: 10px 0;
  background: transparent;
  border: 2px dashed #d0c8b8;
  border-radius: 4px;
  color: #999;
  font-size: 13px;
  cursor: pointer;
  transition: border-color 0.15s, color 0.15s;
}
.btn-add-sheet:hover {
  border-color: #c43a31;
  color: #c43a31;
}
</style>