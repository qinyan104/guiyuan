<script setup lang="ts">
import { ref, onMounted, watch } from "vue"

const props = defineProps<{
  text: string     // 族谱名，如 "陇西李氏宗谱"
  size?: number    // 印章边长，默认 200
}>()

const canvasRef = ref<HTMLCanvasElement | null>(null)

function generateSeal() {
  const canvas = canvasRef.value
  if (!canvas) return
  const s = props.size || 200
  canvas.width = s
  canvas.height = s
  const ctx = canvas.getContext("2d")!
  
  // 1. 朱砂底色
  ctx.fillStyle = "#C43A31"
  ctx.fillRect(0, 0, s, s)

  // 2. 斑驳纹理 — 随机散布半透明暗点模拟拓印不均
  const rng = mulberry32(hashStr(props.text))
  for (let i = 0; i < 300; i++) {
    const x = rng() * s
    const y = rng() * s
    const r = rng() * 2 + 0.5
    ctx.fillStyle = `rgba(0,0,0,${rng() * 0.25})`
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill()
  }
  
  // 3. 边缘随机切削（模拟印章边缘磨损）
  ctx.globalCompositeOperation = "destination-out"
  for (let i = 0; i < 40; i++) {
    const edge = Math.floor(rng() * 4)
    let x: number, y: number
    if (edge === 0) { x = rng() * s; y = 0 }
    else if (edge === 1) { x = s; y = rng() * s }
    else if (edge === 2) { x = rng() * s; y = s }
    else { x = 0; y = rng() * s }
    ctx.beginPath(); ctx.arc(x, y, rng() * 4 + 1, 0, Math.PI * 2); ctx.fill()
  }
  ctx.globalCompositeOperation = "source-over"

  // 4. 双线边框
  const m = s * 0.05
  ctx.strokeStyle = "#8B0000"
  ctx.lineWidth = s * 0.02
  ctx.strokeRect(m, m, s - 2*m, s - 2*m)
  ctx.lineWidth = s * 0.008
  ctx.strokeRect(m*2.5, m*2.5, s - 5*m, s - 5*m)

  // 5. 文字 — 竖排居中，米白色模拟刻痕
  ctx.fillStyle = "#FFF5EE"
  const chars = [...props.text].filter(c => c.trim())
  if (chars.length === 0) return
  const fontSize = Math.min(s / chars.length * 0.7, s * 0.2)
  ctx.font = `bold ${fontSize}px "Noto Serif SC", "SimSun", serif`
  ctx.textAlign = "center"
  ctx.textBaseline = "middle"
  const startY = s/2 - ((chars.length-1) * fontSize * 0.85) / 2
  for (let i = 0; i < chars.length; i++) {
    ctx.fillText(chars[i], s/2, startY + i * fontSize * 0.85)
  }
}

// Simple PRNG for deterministic output
function mulberry32(a: number) {
  return function() {
    a |= 0; a = a + 0x6D2B79F5 | 0
    let t = Math.imul(a ^ a >>> 15, 1 | a)
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t
    return ((t ^ t >>> 14) >>> 0) / 4294967296
  }
}

function hashStr(s: string): number {
  let h = 0
  for (let i = 0; i < s.length; i++) h = ((h << 5) - h + s.charCodeAt(i)) | 0
  return h
}

onMounted(generateSeal)
watch(() => props.text, generateSeal)
watch(() => props.size, generateSeal)
</script>

<template>
  <div class="seal-stamp" :style="{ width: (size||200)+'px', height: (size||200)+'px' }">
    <canvas ref="canvasRef" class="seal-canvas" />
  </div>
</template>

<style scoped>
.seal-stamp { overflow: hidden; border-radius: 2px; }
.seal-canvas { width: 100%; height: 100%; display: block; }
</style>
