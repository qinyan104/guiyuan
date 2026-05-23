<script setup lang="ts">
import { computed } from "vue"
import type { BookSheetLayout } from "../../types/publishing"
import type { PublicationData } from "../../types/family"
import SealStamp from "./SealStamp.vue"

const props = defineProps<{
  sheetNumber: number
  layoutData?: BookSheetLayout | null
  publicationData?: PublicationData | null
}>()

const personCards = computed(() => props.layoutData?.elements.personCards ?? [])
const lines = computed(() => props.layoutData?.elements.connectionLines ?? [])
const anchors = computed(() => props.layoutData?.elements.anchors ?? [])
const hasLayout = computed(() => !!props.layoutData && personCards.value.length > 0)

function personName(pid: string): string {
  return props.publicationData?.people[pid]?.name ?? pid
}

function jitterPath(pts: {x:number;y:number}[], seed: number): string {
  if (pts.length === 0) return ""
  let d = "M " + pts[0].x + " " + pts[0].y
  for (let i = 1; i < pts.length; i++) {
    const jx = ((seed * (i+1) * 7) % 100 - 50) / 100 * 0.6
    const jy = ((seed * (i+1) * 13) % 100 - 50) / 100 * 0.6
    d += " L " + (pts[i].x + jx) + " " + (pts[i].y + jy)
  }
  return d
}

const topAnchor = computed(() => anchors.value.find(a => a.direction === "top"))
const bottomAnchor = computed(() => anchors.value.filter(a => a.direction === "bottom"))
const leftAnchor = computed(() => anchors.value.find(a => a.direction === "left"))
const rightAnchor = computed(() => anchors.value.find(a => a.direction === "right"))
</script>

<template>
  <div class="page-canvas">
    <div class="book-page">
      <svg class="page-svg" viewBox="0 0 210 297" xmlns="http://www.w3.org/2000/svg">
        <rect class="pg-frame" x="15" y="20" width="180" height="257" fill="none" stroke-width="0.5" />
        <line class="pg-spine" x1="105" y1="20" x2="105" y2="277" stroke-width="0.3" stroke-dasharray="4 4" />
        <polygon class="pg-bookmark" points="100,26 105,32 110,26" />
        <polygon class="pg-bookmark" points="100,32 105,38 110,32" />
        <polygon class="pg-bookmark" points="100,262 105,268 110,262" />
        <polygon class="pg-bookmark" points="100,268 105,274 110,268" />
        <text class="pg-page-num" x="105" y="288" text-anchor="middle" font-size="4" font-family="serif">{{ sheetNumber }}</text>
        <g v-if="hasLayout">
          <path v-for="(line, i) in lines" :key="'l'+i" :d="jitterPath(line.points, i)" fill="none" class="pg-bloodline" stroke-width="0.7" stroke-linecap="round" opacity="0.85" />
          <circle v-for="(line, i) in lines" :key="'k'+i" :cx="line.points[0].x" :cy="line.points[0].y" r="1.5" class="pg-bloodline-knot" opacity="0.8" />
        </g>
        <g v-for="card in personCards" :key="card.personId" class="pg-person-card">
          <rect :x="card.x" :y="card.y" :width="30" :height="15" stroke-width="0.4" rx="1" />
          <text :x="card.x + 2" :y="card.y + 11" font-size="4.5" font-family="serif">{{ personName(card.personId) }}</text>
        </g>
        <g v-if="hasLayout">
          <text v-if="topAnchor" x="105" y="18" text-anchor="middle" font-size="3" class="pg-anchor" font-family="serif">{{ topAnchor.label }}</text>
          <text v-for="(a, ai) in bottomAnchor" :key="'ba'+ai" :x="105" :y="278 + ai * 4" text-anchor="middle" font-size="3" class="pg-anchor" font-family="serif">{{ a.label }}</text>
          <text v-if="leftAnchor" x="16" y="150" font-size="3" class="pg-anchor" font-family="serif" writing-mode="vertical-rl">{{ leftAnchor.label }}</text>
          <text v-if="rightAnchor" x="194" y="150" font-size="3" class="pg-anchor" font-family="serif" writing-mode="vertical-rl">{{ rightAnchor.label }}</text>
        </g>
      </svg>
      <div v-if="hasLayout && publicationData" class="page-seal">
        <SealStamp :text="publicationData.title || '族谱'" :size="40" />
      </div>
      <div v-if="!hasLayout" class="page-content">
        <p class="content-placeholder">第 {{ sheetNumber }} 页</p>
        <p class="content-hint">点击"自动排版"生成内容</p>
      </div>
    </div>
  </div>
</template>

<style scoped>
.page-canvas { flex:1; display:flex; align-items:center; justify-content:center; background:var(--color-neutral-3); padding:24px; overflow:auto; }
.book-page { position:relative; width:210mm; aspect-ratio:210/297; max-width:100%; max-height:calc(100vh - 120px); background:var(--color-neutral-1); box-shadow:var(--shadow-whisper); }
.page-svg { position:absolute; top:0; left:0; width:100%; height:100%; pointer-events:none; }
.page-content { position:absolute; inset:22px 18px 22px 15px; display:flex; flex-direction:column; align-items:center; justify-content:center; }
.content-placeholder { color:var(--color-neutral-4); font-size:16px; font-family:serif; margin:0; }
.content-hint { color:var(--color-neutral-3); font-size:12px; margin-top:8px; font-family:serif; }
.page-seal { position:absolute; bottom:6mm; right:5mm; opacity:0.7; }
</style>
/* ── SVG token overrides ── */
.pg-frame { stroke: var(--color-accent); }
.pg-spine { stroke: var(--color-accent); }
.pg-bookmark { fill: var(--color-neutral-10); }
.pg-page-num { fill: var(--color-neutral-6); }
.pg-bloodline { stroke: var(--color-accent); }
.pg-bloodline-knot { fill: var(--color-accent); }
.pg-anchor { fill: var(--color-accent); }

/* Person cards */
.pg-person-card rect { fill: var(--color-neutral-1); stroke: var(--color-neutral-8); }
.pg-person-card text { fill: var(--color-neutral-9); }
