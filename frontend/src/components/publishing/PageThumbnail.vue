<script setup lang="ts">
import type { LineageEntry } from "../../types/publishing"

defineProps<{
  sheetNumber: number
  sheetType: string
  active: boolean
  dragOver: boolean
  entries?: LineageEntry[]
}>()

const emit = defineEmits<{
  select: []
  delete: []
  dragStart: [index: number]
  dragOver: [index: number]
  drop: [index: number]
  dragEnd: []
}>()

function chineseNum(n: number): string {
  const map = ['', '一', '二', '三', '四', '五', '六', '七', '八', '九', '十',
    '十一', '十二', '十三', '十四', '十五', '十六', '十七', '十八', '十九', '二十']
  return map[n] || String(n)
}
</script>

<template>
  <div
    :class="['page-thumbnail', { active, 'drag-over': dragOver }]"
    draggable="true"
    @click="emit('select')"
    @contextmenu.prevent="emit('delete')"
    @dragstart="emit('dragStart', sheetNumber - 1)"
    @dragover.prevent="emit('dragOver', sheetNumber - 1)"
    @drop.prevent="emit('drop', sheetNumber - 1)"
    @dragend="emit('dragEnd')"
  >
    <div class="thumb-preview">
      <span class="thumb-watermark">{{ chineseNum(sheetNumber) }}</span>

      <template v-if="entries && entries.length > 0">
        <div class="thumb-mini-text">
          <span
            v-for="(entry, i) in entries.slice(0, 6)"
            :key="entry.personId"
            class="thumb-line"
          >{{ entry.personName }}</span>
        </div>
      </template>
      <template v-else>
        <span class="thumb-empty">空页</span>
      </template>

      <div class="thumb-footer">
        <span class="thumb-count">{{ entries?.length ?? 0 }} 条</span>
        <span class="thumb-type">{{ sheetType === 'genealogy' ? '世系' : sheetType }}</span>
      </div>
    </div>
    <span class="thumb-label">第 {{ sheetNumber }} 页</span>
  </div>
</template>

<style scoped>
.page-thumbnail {
  width: 160px;
  margin: 0 auto 10px;
  cursor: grab;
  text-align: center;
  position: relative;
}

.page-thumbnail:active { cursor: grabbing; }

.page-thumbnail:hover .thumb-preview {
  box-shadow: var(--shadow-whisper);
  transform: translateY(-1px);
  border-color: var(--color-neutral-5);
}

.page-thumbnail.active .thumb-preview {
  border-color: rgba(196, 58, 49, 0.3);
  background: var(--color-accent-muted);
}

.page-thumbnail.active::after {
  content: '';
  position: absolute;
  left: -2px;
  top: 10px;
  bottom: 10px;
  width: 3px;
  border-radius: 3px;
  background: var(--color-accent);
}

.page-thumbnail.drag-over .thumb-preview {
  border-color: var(--color-accent);
  border-width: 2px;
  border-style: dashed;
}

.thumb-preview {
  position: relative;
  height: 200px;
  background: var(--color-neutral-1);
  border: 1px solid var(--color-card-stroke);
  border-radius: var(--radius-lg);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  transition: all var(--duration-fast) var(--ease-breath);
  user-select: none;
  box-shadow: var(--shadow-whisper);
}

.thumb-watermark {
  position: absolute;
  top: 8px;
  right: 12px;
  font-size: 40px;
  font-family: var(--font-serif);
  color: var(--color-neutral-3);
  line-height: 1;
  pointer-events: none;
  opacity: 0.5;
}

.thumb-mini-text {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 44px 10px 30px;
  width: 100%;
  box-sizing: border-box;
  flex: 1;
}

.thumb-line {
  font-size: 8px;
  color: var(--color-neutral-7);
  line-height: 1.4;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-family: var(--font-serif);
}

.thumb-empty {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 13px;
  color: var(--color-neutral-4);
  border: 1.5px dashed var(--color-neutral-3);
  margin: 16px;
  border-radius: var(--radius-md);
}

.thumb-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 5px 10px;
  border-top: 1px solid var(--color-card-stroke);
  font-size: 9px;
}

.thumb-count { color: var(--color-neutral-5); }

.thumb-type {
  padding: 1px 6px;
  border-radius: 999px;
  background: var(--color-neutral-2);
  color: var(--color-neutral-6);
  font-size: 8px;
}

.thumb-label {
  display: block;
  font-size: 11px;
  color: var(--color-neutral-6);
  margin-top: 4px;
  font-weight: 500;
}
</style>
