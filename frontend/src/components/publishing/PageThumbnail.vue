<script setup lang="ts">
/**
 * PageThumbnail — 页面缩略图（Canvas 渲染版）
 *
 * 用 Canvas 绘制迷你古籍页面预览：
 * - 纸张底色 + 边框
 * - 竖排条目名（最多 12 条）
 * - 页码水印
 */
import type { LineageEntry } from "../../types/publishing"
import { computed, onMounted, onUnmounted, ref, watch } from "vue"

const props = defineProps<{
  sheetNumber: number
  sheetType: string
  active: boolean
  dragOver: boolean
  entries?: LineageEntry[]
  canvasId?: string
}>()

const emit = defineEmits<{
  select: []
  delete: []
  dragStart: [index: number]
  dragOver: [index: number]
  drop: [index: number]
  dragEnd: []
}>()

const canvasRef = ref<HTMLCanvasElement | null>(null)
const W = 160
const H = 200
const DPR = 2

// 按模板选纸张色
const paperColor = computed(() => {
  const map: Record<string, string> = {
    mr_5: "#f5edd6", mr_4: "#f4ecd3",
    "24_paper": "#f3ead0", "28_paper": "#f1e8cc",
    "24_black": "#333", "18_blue": "#1e2a3a", "18_red": "#3a1e1e",
    "20_paper": "#f6eede", vintage: "#e8dab8", bamboo: "#e5d9b8",
    simple: "#faf8f4",
  }
  return map[props.canvasId ?? ""] || "#f5edd6"
})

function chineseNum(n: number): string {
  const map = ['', '一', '二', '三', '四', '五', '六', '七', '八', '九', '十',
    '十一', '十二', '十三', '十四', '十五', '十六', '十七', '十八', '十九', '二十']
  return map[n] || String(n)
}

function renderThumb() {
  const canvas = canvasRef.value
  if (!canvas) return

  canvas.width = W * DPR
  canvas.height = H * DPR
  canvas.style.width = `${W}px`
  canvas.style.height = `${H}px`

  const ctx = canvas.getContext("2d")
  if (!ctx) return

  ctx.scale(DPR, DPR)

  // 底色
  ctx.fillStyle = paperColor.value
  ctx.fillRect(0, 0, W, H)

  // 内框
  ctx.strokeStyle = "rgba(0,0,0,0.15)"
  ctx.lineWidth = 1
  ctx.strokeRect(8, 8, W - 16, H - 16)

  // 页码水印
  ctx.fillStyle = "rgba(0,0,0,0.08)"
  ctx.font = '36px "Noto Serif SC", serif'
  ctx.textAlign = "right"
  ctx.fillText(chineseNum(props.sheetNumber), W - 16, 42)

  // 条目名（竖排，右→左）
  const names = (props.entries ?? []).slice(0, 12).map(e => e.personName)
  if (names.length > 0) {
    ctx.fillStyle = "rgba(0,0,0,0.35)"
    ctx.font = '6px "Noto Serif SC", serif'
    ctx.textAlign = "start"

    const colX = W - 28 // 从右开始
    let rowY = 56
    let col = 0
    for (const name of names) {
      ctx.fillText(name, colX - col * 28, rowY)
      rowY += 10
      if (rowY > H - 28) {
        rowY = 56
        col++
      }
    }
  }

  // 底栏
  ctx.fillStyle = "rgba(0,0,0,0.04)"
  ctx.fillRect(8, H - 24, W - 16, 16)
  ctx.fillStyle = "rgba(0,0,0,0.25)"
  ctx.font = '8px sans-serif'
  ctx.textAlign = "center"
  const count = props.entries?.length ?? 0
  ctx.fillText(`${count} 条`, W / 2, H - 11)
}

watch(() => [props.entries, props.canvasId], renderThumb, { deep: false })
onMounted(() => renderThumb())
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
      <canvas ref="canvasRef" class="thumb-canvas"></canvas>
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
  box-shadow: 0 2px 8px rgba(0,0,0,0.12);
  transform: translateY(-1px);
}

.page-thumbnail.active .thumb-preview {
  outline: 2px solid var(--color-accent);
  outline-offset: -2px;
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
  outline: 2px dashed var(--color-accent);
}

.thumb-preview {
  width: 160px;
  height: 200px;
  background: var(--color-neutral-1);
  border: 1px solid var(--color-card-stroke);
  border-radius: 10px;
  overflow: hidden;
  transition: all 0.15s ease;
  user-select: none;
}

.thumb-canvas {
  width: 160px;
  height: 200px;
  display: block;
}

.thumb-label {
  display: block;
  font-size: 11px;
  color: var(--color-neutral-6);
  margin-top: 4px;
  font-weight: 500;
}
</style>
