<script setup lang="ts">
import { ref } from "vue"
import type { LineagePage } from "../../types/publishing"
import type { PublicationData } from "../../types/family"
import VrainPreview from "./VrainPreview.vue"

const props = defineProps<{
  sheetNumber: number
  pageData?: LineagePage | null
  publicationData?: PublicationData | null
  draftId: number
  canvasId: string
  paper?: "A4" | "A3"
  templateName?: string
  statusText?: string
  relayouting?: boolean
  fontSize?: number
  lineHeight?: number
  columns?: number
}>()

const emit = defineEmits<{
  navigateToPage: [index: number]
}>()

const vrainPreviewRef = ref<InstanceType<typeof VrainPreview> | null>(null)

function reloadPreview() {
  vrainPreviewRef.value?.reload()
}

defineExpose({ reloadPreview })
</script>

<template>
  <div class="page-canvas">
    <div class="page-canvas__stage">
      <div class="page-canvas__toolbar">
        <div>
          <span class="page-canvas__eyebrow">当前画布</span>
          <h3 class="page-canvas__title">版面预览</h3>
        </div>
        <div class="page-canvas__meta">
          <span>{{ templateName || '默认模板' }}</span>
          <span>{{ paper || 'A4' }}</span>
          <span>第 {{ sheetNumber }} 页</span>
          <span v-if="statusText">{{ statusText }}</span>
        </div>
      </div>

      <div class="page-canvas__viewport">
        <div v-if="relayouting" class="page-canvas__overlay">正在刷新预览...</div>
        <VrainPreview
          ref="vrainPreviewRef"
          :draftId="draftId"
          :canvasId="canvasId"
          :activePageIndex="sheetNumber - 1"
          @navigateToPage="(i: number) => $emit('navigateToPage', i)"
        />
      </div>
    </div>
  </div>
</template>

<style scoped>
.page-canvas {
  display: flex;
  min-width: 0;
  height: 100%;
  padding: 18px;
  background:
    radial-gradient(circle at 50% 0%, var(--color-neutral-2), transparent 55%),
    var(--color-canvas-bg);
}

.page-canvas__stage {
  display: flex;
  flex-direction: column;
  width: 100%;
  min-width: 0;
  border: 1px solid var(--color-card-stroke);
  border-radius: var(--radius-xl);
  background: var(--color-neutral-1);
  box-shadow: var(--shadow-whisper);
  overflow: hidden;
}

.page-canvas__toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 14px 18px;
  border-bottom: 1px solid var(--color-card-stroke);
  background: var(--color-panel-bg);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
}

.page-canvas__eyebrow {
  display: block;
  margin-bottom: 1px;
  font-family: var(--font-sans);
  font-size: 11px;
  font-weight: 600;
  color: var(--color-accent);
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

.page-canvas__title {
  margin: 0;
  font-family: var(--font-serif);
  font-size: 15px;
  font-weight: 600;
  color: var(--color-neutral-10);
}

.page-canvas__meta {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 8px 12px;
  font-size: 12px;
  color: var(--color-neutral-6);
}

.page-canvas__viewport {
  position: relative;
  flex: 1;
  min-height: 0;
  overflow: hidden;
}

.page-canvas__overlay {
  position: absolute;
  top: 14px;
  right: 14px;
  z-index: 2;
  padding: 8px 12px;
  border-radius: 999px;
  background: var(--color-panel-bg);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  border: 1px solid var(--color-card-stroke);
  color: var(--color-neutral-6);
  font-size: 12px;
  font-weight: 500;
  box-shadow: var(--shadow-whisper);
}
</style>
