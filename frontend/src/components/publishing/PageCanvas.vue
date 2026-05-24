<script setup lang="ts">
import { computed } from "vue"
import type { LineagePage } from "../../types/publishing"
import type { PublicationData } from "../../types/family"
import SealStamp from "./SealStamp.vue"

const props = defineProps<{
  sheetNumber: number
  pageData?: LineagePage | null
  publicationData?: PublicationData | null
}>()

const entries = computed(() => props.pageData?.entries ?? [])
const hasContent = computed(() => entries.value.length > 0)

function entryClass(gender: string): string {
  if (gender === "male") return "entry-male"
  if (gender === "female") return "entry-female"
  return ""
}
</script>

<template>
  <div class="page-canvas">
    <div class="book-page">
      <!-- 版框 -->
      <div class="page-frame">
        <div class="frame-top"></div>
        <div class="frame-left"></div>
        <div class="frame-right"></div>
        <div class="frame-bottom"></div>
      </div>

      <!-- 版心（中缝）-->
      <div class="spine">
        <div class="fish-tail top-fish"></div>
        <span class="spine-text">{{ publicationData?.title || '族谱' }}</span>
        <div class="fish-tail bottom-fish"></div>
        <span class="spine-page">{{ sheetNumber }}</span>
      </div>

      <!-- 文字内容 -->
      <div v-if="hasContent" class="page-content">
        <div
          v-for="(entry, i) in entries"
          :key="entry.personId"
          class="lineage-entry"
          :class="entryClass(entry.gender)"
          :style="{ '--gen': entry.generation }"
        >
          <span class="entry-num">{{ i + 1 }}</span>
          <span class="entry-text">{{ entry.formattedText }}</span>
        </div>
      </div>

      <!-- 空页提示 -->
      <div v-else class="page-content page-empty">
        <p class="content-placeholder">第 {{ sheetNumber }} 页</p>
        <p class="content-hint">点击"自动排版"生成世系录</p>
      </div>

      <!-- 印章 -->
      <div v-if="hasContent && publicationData" class="page-seal">
        <SealStamp :text="publicationData.title || '族谱'" :size="36" />
      </div>
    </div>
  </div>
</template>

<style scoped>
.page-canvas {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--color-neutral-3);
  padding: 24px;
  overflow: auto;
}

.book-page {
  position: relative;
  width: 180mm;
  min-height: 257mm;
  max-width: 100%;
  background: var(--color-neutral-1);
  box-shadow: var(--shadow-whisper);
  padding: 18mm 15mm 18mm 25mm; /* top right bottom left - left wider for spine */
  font-family: "Noto Serif SC", "Source Han Serif SC", "SimSun", serif;
  font-size: 12px;
  line-height: 1.9;
  color: var(--color-neutral-9);
}

/* ── 版框 ── */
.page-frame {
  position: absolute;
  inset: 10mm 12mm 10mm 10mm;
  pointer-events: none;
  border: 1px solid var(--color-neutral-8);
}
.frame-top, .frame-bottom {
  position: absolute;
  left: 0; right: 0;
  height: 0;
}
.frame-left, .frame-right {
  position: absolute;
  top: 0; bottom: 0;
  width: 0;
}

/* ── 版心 / 中缝 ── */
.spine {
  position: absolute;
  top: 10mm;
  bottom: 10mm;
  left: 50%;
  transform: translateX(-50%);
  width: 12mm;
  display: flex;
  flex-direction: column;
  align-items: center;
  pointer-events: none;
  border-left: 1px solid var(--color-neutral-5);
  border-right: 1px solid var(--color-neutral-5);
}

.fish-tail {
  width: 12mm;
  height: 4mm;
  position: relative;
}
.fish-tail::before, .fish-tail::after {
  content: "";
  position: absolute;
  bottom: 0;
  width: 0;
  height: 0;
  border-bottom: 4mm solid var(--color-neutral-8);
}
.fish-tail::before {
  left: 0;
  border-left: 6mm solid transparent;
}
.fish-tail::after {
  right: 0;
  border-right: 6mm solid transparent;
}

.top-fish { margin-bottom: 2mm; }
.bottom-fish { margin-top: auto; transform: rotate(180deg); }

.spine-text {
  font-size: 9px;
  color: var(--color-neutral-8);
  writing-mode: vertical-rl;
  letter-spacing: 2px;
  margin: 2mm 0;
  flex: 1;
  text-align: center;
}

.spine-page {
  font-size: 10px;
  color: var(--color-neutral-7);
  writing-mode: vertical-rl;
  margin-top: 2mm;
}

/* ── 世系录条目 ── */
.page-content {
  column-count: 1;
  column-gap: 6mm;
}

.page-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 200mm;
}

.content-placeholder {
  color: var(--color-neutral-5);
  font-size: 14px;
  margin: 0;
}

.content-hint {
  color: var(--color-neutral-4);
  font-size: 11px;
  margin-top: 8px;
}

.lineage-entry {
  display: flex;
  gap: 6px;
  margin-bottom: 8px;
  padding-bottom: 8px;
  border-bottom: 1px dotted var(--color-neutral-4);
  break-inside: avoid;
}

.entry-num {
  flex-shrink: 0;
  width: 18px;
  font-size: 10px;
  color: var(--color-neutral-6);
  text-align: right;
  padding-top: 2px;
}

.entry-text {
  flex: 1;
  text-align: justify;
}

.entry-male .entry-text {
  color: var(--color-neutral-9);
}

.entry-female .entry-text {
  color: var(--color-neutral-8);
}

/* ── 印章 ── */
.page-seal {
  position: absolute;
  bottom: 14mm;
  right: 16mm;
  opacity: 0.6;
}
</style>