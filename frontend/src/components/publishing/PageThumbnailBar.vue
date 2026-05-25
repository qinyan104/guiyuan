<script setup lang="ts">
import { computed, ref } from "vue"
import PageThumbnail from "./PageThumbnail.vue"
import type { LineagePage } from "../../types/publishing"

const props = defineProps<{
  sheetCount: number
  activeSheetIndex: number
  sheetTypes: string[]
  pages: LineagePage[]
  currentPage: number
  templateName: string
  canvasId?: string
}>()

const emit = defineEmits<{
  selectSheet: [index: number]
  deleteSheet: [index: number]
  addSheet: []
  reorderSheets: [fromIndex: number, toIndex: number]
}>()

const dragFromIndex = ref<number | null>(null)
const dragOverIndex = ref<number | null>(null)

const headerSummary = computed(() => props.currentPage + ' / ' + props.sheetCount)

function handleDragStart(index: number) { dragFromIndex.value = index }
function handleDragOver(index: number) {
  if (dragFromIndex.value === null) return
  dragOverIndex.value = index
}
function handleDrop(index: number) {
  if (dragFromIndex.value !== null && dragFromIndex.value !== index) {
    emit("reorderSheets", dragFromIndex.value, index)
  }
  dragFromIndex.value = null
  dragOverIndex.value = null
}
function handleDragEnd() {
  dragFromIndex.value = null
  dragOverIndex.value = null
}
</script>

<template>
  <div class="thumbnail-bar">
    <div class="thumbnail-bar__header">
      <div>
        <p class="thumbnail-bar__eyebrow">页面导航</p>
        <h3 class="thumbnail-bar__title">共 {{ sheetCount }} 页</h3>
        <p class="thumbnail-bar__meta">当前第 {{ headerSummary }} · {{ templateName }}</p>
      </div>
    </div>

    <div class="thumbnail-bar__list">
      <PageThumbnail
        v-for="i in sheetCount"
        :key="i"
        :sheetNumber="i"
        :sheetType="sheetTypes[i - 1] || '正文'"
        :active="i - 1 === activeSheetIndex"
        :dragOver="i - 1 === dragOverIndex && i - 1 !== dragFromIndex"
        :entries="pages[i - 1]?.entries"
        :canvasId="canvasId"
        @select="emit('selectSheet', i - 1)"
        @delete="emit('deleteSheet', i - 1)"
        @dragStart="handleDragStart"
        @dragOver="handleDragOver"
        @drop="handleDrop"
        @dragEnd="handleDragEnd"
      />
    </div>

    <div class="thumbnail-bar__footer">
      <button class="btn-add-sheet-large" @click="emit('addSheet')">
        <span class="add-sheet-icon">+</span>
        <span class="add-sheet-label">新增页面</span>
      </button>
    </div>
  </div>
</template>

<style scoped>
.thumbnail-bar {
  display: flex;
  flex-direction: column;
  min-height: 0;
  padding: 16px 8px 14px;
  border-right: 1px solid var(--color-card-stroke);
  background: var(--color-panel-bg);
  backdrop-filter: blur(12px) saturate(1.2);
  -webkit-backdrop-filter: blur(12px) saturate(1.2);
}

.thumbnail-bar__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 10px;
  padding: 0 6px 14px;
  border-bottom: 1px solid var(--color-neutral-3);
  margin-bottom: 12px;
}

.thumbnail-bar__eyebrow {
  margin: 0 0 1px;
  font-family: var(--font-sans);
  font-size: 11px;
  font-weight: 600;
  color: var(--color-accent);
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

.thumbnail-bar__title {
  margin: 0;
  font-family: var(--font-serif);
  font-size: 16px;
  font-weight: 600;
  color: var(--color-neutral-10);
}

.thumbnail-bar__meta {
  margin: 4px 0 0;
  font-size: 11px;
  color: var(--color-neutral-5);
  line-height: 1.4;
}

.thumbnail-bar__list {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding-right: 4px;
}

.thumbnail-bar__list::-webkit-scrollbar {
  width: 4px;
}

.thumbnail-bar__list::-webkit-scrollbar-thumb {
  background: var(--color-neutral-4);
  border-radius: 2px;
}

.thumbnail-bar__footer {
  padding-top: 8px;
  flex-shrink: 0;
}

.btn-add-sheet-large {
  width: 160px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 6px;
  height: 72px;
  border: 2px dashed var(--color-card-stroke);
  border-radius: var(--radius-lg);
  background: transparent;
  cursor: pointer;
  transition: all var(--duration-fast) var(--ease-breath);
  color: var(--color-neutral-5);
}

.btn-add-sheet-large:hover {
  border-color: var(--color-accent);
  color: var(--color-accent);
  background: var(--color-accent-muted);
  transform: translateY(-1px);
  box-shadow: var(--shadow-whisper);
}

.add-sheet-icon { font-size: 24px; line-height: 1; }
.add-sheet-label { font-size: 12px; font-weight: 500; }
</style>
