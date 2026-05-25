<script setup lang="ts">
import { computed, ref } from "vue"
import { CANVAS_TEMPLATES, FONT_OPTIONS, type CanvasTemplate } from "../../lib/vrainTemplates"

const props = defineProps<{
  draftTitle: string
  draftStatus: string
  paper: "A4" | "A3"
  editorOpen: boolean
  tweaksOpen: boolean
  canvasId: string
  currentPage: number
  totalPages: number
  templateName: string
  exporting: boolean
  autoLayouting: boolean
  tweakFontSize: number
  tweakLineHeight: number
  tweakColumns: number
  tweakMarginPreset: "compact" | "standard" | "loose"
  selectedFont: string
}>()

const emit = defineEmits<{
  back: []
  autoLayout: []
  export: []
  paperChange: [paper: "A4" | "A3"]
  toggleEditor: []
  toggleTweaks: []
  canvasChange: [canvasId: string]
  updateTweakFontSize: [value: number]
  updateTweakLineHeight: [value: number]
  updateTweakColumns: [value: number]
  updateTweakMarginPreset: [value: "compact" | "standard" | "loose"]
  updateFont: [fontId: string]
}>()

const tplOpen = ref(false)

const currentTemplate = computed<CanvasTemplate>(() => CANVAS_TEMPLATES.find(t => t.id === props.canvasId) ?? CANVAS_TEMPLATES[0])

function select(t: CanvasTemplate) { tplOpen.value = false; emit("canvasChange", t.id) }

const tplBtn = ref<HTMLElement | null>(null)
const tplPos = ref({ top: 0, left: 0 })

function openTpl() {
  if (tplBtn.value) {
    const r = tplBtn.value.getBoundingClientRect()
    tplPos.value = { top: r.bottom + 4, left: r.right - 380 }
  }
  tplOpen.value = true
}
</script>

<template>
  <header class="toolbar">

    <!-- left: back + title + template selector -->
    <div class="tb-left">
      <button class="tb-back" @click="emit('back')">← 返回画布</button>
      <div class="tb-title">{{ draftTitle }}</div>

      <!-- template selector -->
      
    </div>

    <!-- right: actions -->
    <div class="tb-right">
      <div class="tpl-wrap">
        <button ref="tplBtn" class="tpl-btn" @click="openTpl">
          {{ templateName || currentTemplate.name }}
          <span class="tpl-caret">▾</span>
        </button>
        <Teleport to="body">
          <div v-if="tplOpen" class="tpl-backdrop" @click="tplOpen = false" />
          <div v-if="tplOpen" class="tpl-menu" :style="{ position: 'fixed', top: tplPos.top + 'px', left: tplPos.left + 'px', zIndex: 99999 }">
            <div class="tpl-grid">
              <button v-for="t in CANVAS_TEMPLATES" :key="t.id"
                :class="['tpl-card', { active: canvasId === t.id }]"
                @click="select(t)">
                <img :src="t.thumbnail" :alt="t.name" class="tpl-thumb" />
                <span class="tpl-card-name">{{ t.name }}</span>
                <span v-if="canvasId === t.id" class="tpl-check">✓</span>
              </button>
            </div>
          </div>
        </Teleport>
      </div>
      <button class="tb-act" :disabled="autoLayouting" @click="emit('autoLayout')">
        {{ autoLayouting ? '正在排版...' : '自动排版' }}
      </button>
      <button class="tb-act tb-act--primary" :disabled="exporting" @click="emit('export')">
        {{ exporting ? '正在导出...' : '付梓导出' }}
      </button>
      <span class="tb-sep" />
      <button :class="['tb-tgl', { on: editorOpen }]" @click="emit('toggleEditor')" title="内容检查器">
        检查器
      </button>
      <button :class="['tb-tgl', { on: tweaksOpen }]" @click="emit('toggleTweaks')" title="排版微调">
        微调
      </button>
      <select class="tb-paper" :value="paper" @change="emit('paperChange', ($event.target as HTMLSelectElement).value as 'A4'|'A3')">
        <option value="A4">A4</option>
        <option value="A3">A3</option>
      </select>
      <span class="tb-page">第 {{ currentPage }}/{{ totalPages }} 页</span>
    </div>
  </header>

  <!-- tweaks drawer -->
  <Transition name="tweak-slide">
    <div v-if="tweaksOpen" class="tweak-bar">
      <div class="tweak-row"><span class="tweak-label">字号</span>
        <button class="tweak-btn" @click="emit('updateTweakFontSize', Math.max(14, tweakFontSize - 1))">−</button>
        <span class="tweak-val">{{ tweakFontSize }}pt</span>
        <button class="tweak-btn" @click="emit('updateTweakFontSize', Math.min(72, tweakFontSize + 1))">+</button>
      </div>
      <div class="tweak-row"><span class="tweak-label">行距</span>
        <button class="tweak-btn" @click="emit('updateTweakLineHeight', Math.round(Math.max(1.0, tweakLineHeight - 0.1) * 10) / 10)">−</button>
        <span class="tweak-val">{{ tweakLineHeight.toFixed(1) }}</span>
        <button class="tweak-btn" @click="emit('updateTweakLineHeight', Math.round(Math.min(4.0, tweakLineHeight + 0.1) * 10) / 10)">+</button>
      </div>
      <div class="tweak-row"><span class="tweak-label">栏数</span>
        <button :class="['tweak-seg', { on: tweakColumns === 1 }]" @click="emit('updateTweakColumns', 1)">1</button>
        <button :class="['tweak-seg', { on: tweakColumns === 2 }]" @click="emit('updateTweakColumns', 2)">2</button>
      </div>
      <div class="tweak-row"><span class="tweak-label">字体</span>
        <select class="tweak-select" :value="selectedFont" @change="emit('updateFont', ($event.target as HTMLSelectElement).value)">
          <option v-for="f in FONT_OPTIONS" :key="f.id" :value="f.id">{{ f.name }}</option>
        </select>
      </div>
      <div class="tweak-row"><span class="tweak-label">边距</span>
        <button :class="['tweak-seg', { on: tweakMarginPreset === 'compact' }]" @click="emit('updateTweakMarginPreset', 'compact')">紧凑</button>
        <button :class="['tweak-seg', { on: tweakMarginPreset === 'standard' }]" @click="emit('updateTweakMarginPreset', 'standard')">标准</button>
        <button :class="['tweak-seg', { on: tweakMarginPreset === 'loose' }]" @click="emit('updateTweakMarginPreset', 'loose')">宽松</button>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
/* ---- toolbar ---- */
.toolbar {
  display: flex; align-items: center; gap: 16px;
  padding: 10px 20px;
  background: var(--color-panel-bg);
  border-bottom: 1px solid var(--color-card-stroke);
  backdrop-filter: blur(10px); -webkit-backdrop-filter: blur(10px);
  flex-shrink: 0;
}
.tb-left { display: flex; align-items: center; gap: 14px; min-width: 0; }
.tb-right { display: flex; align-items: center; gap: 8px; margin-left: auto; flex-shrink: 0; }

.tb-back {
  font-size: 12px; color: var(--color-neutral-6);
  background: none; border: none; cursor: pointer;
  white-space: nowrap; padding: 4px 8px; border-radius: 6px;
  transition: all 0.14s ease;
}
.tb-back:hover { color: var(--color-accent); background: var(--color-neutral-2); }
.tb-title { font-size: 14px; font-weight: 500; color: var(--color-neutral-9); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 200px; }

/* ---- template selector ---- */
.tpl-wrap { position: relative; }
.tpl-btn {
  display: flex; align-items: center; gap: 4px;
  padding: 6px 10px;
  background: var(--color-neutral-1);
  border: 1px solid var(--color-card-stroke);
  border-radius: 8px;
  color: var(--color-neutral-8); font-size: 12px; cursor: pointer;
  white-space: nowrap;
  transition: all 0.14s ease;
}
.tpl-btn:hover { background: var(--color-neutral-2); border-color: var(--color-accent); }
.tpl-caret { font-size: 8px; color: var(--color-neutral-5); margin-left: 2px; }

.tpl-backdrop { position: fixed; inset: 0; z-index: 998; }
.tpl-menu {
  background: var(--color-panel-bg);
  backdrop-filter: blur(20px) saturate(1.4);
  -webkit-backdrop-filter: blur(20px) saturate(1.4);
  border: 1px solid var(--color-card-stroke);
  border-radius: var(--radius-xl);
  box-shadow: var(--shadow-whisper), var(--shadow-ring);
  padding: 8px;
  width: 380px;
  max-height: 56vh;
  overflow-y: auto;
}
.tpl-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 4px; }

.tpl-card {
  display: flex; align-items: center; gap: 10px;
  padding: 8px 10px; border: 1px solid transparent;
  border-radius: var(--radius-md); background: transparent; cursor: pointer;
  width: 100%; position: relative;
  transition: all 0.12s ease;
}
.tpl-card:hover { background: var(--color-neutral-2); }
.tpl-card.active { border-color: var(--color-accent); background: var(--color-accent-muted); }
.tpl-thumb { width: 44px; height: 33px; border-radius: 5px; object-fit: cover; border: 1px solid var(--color-card-stroke); flex-shrink: 0; }
.tpl-card-name { font-size: 11px; font-weight: 500; color: var(--color-neutral-8); display: block; }
.tpl-check {
  position: absolute; top: 4px; right: 6px;
  width: 16px; height: 16px; border-radius: 50%;
  background: var(--color-accent); color: #fff;
  font-size: 10px; font-weight: 700;
  display: flex; align-items: center; justify-content: center;
}

/* ---- action buttons ---- */
.tb-act {
  padding: 6px 14px; font-size: 12px; font-weight: 500;
  border: 1px solid var(--color-card-stroke); border-radius: 8px;
  background: var(--color-neutral-1); color: var(--color-neutral-7);
  cursor: pointer; white-space: nowrap;
  transition: all 0.14s ease;
}
.tb-act:hover:not(:disabled) { background: var(--color-neutral-2); transform: translateY(-1px); box-shadow: var(--shadow-whisper); }
.tb-act:disabled { opacity: 0.4; cursor: default; }
.tb-act--primary { background: var(--color-accent); color: #fff; border-color: var(--color-accent); box-shadow: 0 6px 16px rgba(196,58,49,0.16); }
.tb-act--primary:hover:not(:disabled) { background: var(--color-accent); opacity: 0.9; box-shadow: 0 8px 24px rgba(196,58,49,0.22); }
.tb-sep { width: 1px; height: 22px; background: var(--color-card-stroke); margin: 0 4px; }

.tb-tgl {
  padding: 6px 12px; font-size: 12px;
  border: 1px solid var(--color-card-stroke); border-radius: 8px;
  background: var(--color-neutral-1); color: var(--color-neutral-6);
  cursor: pointer; white-space: nowrap; transition: all 0.14s ease;
}
.tb-tgl:hover { background: var(--color-neutral-2); }
.tb-tgl.on { border-color: var(--color-accent); color: var(--color-accent); background: var(--color-accent-muted); }

.tb-paper {
  padding: 5px 6px; font-size: 11px;
  border: 1px solid var(--color-card-stroke); border-radius: 8px;
  background: var(--color-neutral-1); color: var(--color-neutral-7);
  cursor: pointer; outline: none;
}
.tb-page { font-size: 11px; color: var(--color-neutral-5); white-space: nowrap; font-variant-numeric: tabular-nums; }

/* ---- tweaks bar ---- */
.tweak-bar {
  display: flex; align-items: center; gap: 20px;
  padding: 8px 20px;
  background: var(--color-panel-bg);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  border-bottom: 1px solid var(--color-card-stroke);
}
.tweak-row { display: flex; align-items: center; gap: 6px; }
.tweak-label { font-size: 11px; color: var(--color-neutral-6); font-weight: 500; min-width: 2em; }
.tweak-btn {
  width: 24px; height: 24px; border: 1px solid var(--color-card-stroke); border-radius: 6px;
  background: var(--color-neutral-1); color: var(--color-neutral-6); cursor: pointer;
  font-size: 14px; display: flex; align-items: center; justify-content: center;
  transition: all 0.12s ease;
}
.tweak-btn:hover { background: var(--color-neutral-2); color: var(--color-neutral-9); }
.tweak-val { font-size: 11px; color: var(--color-neutral-8); min-width: 30px; text-align: center; font-variant-numeric: tabular-nums; }
.tweak-seg {
  padding: 3px 8px; border: 1px solid var(--color-card-stroke);
  background: var(--color-neutral-1); color: var(--color-neutral-6);
  font-size: 11px; cursor: pointer; transition: all 0.12s ease;
}
.tweak-seg:first-child { border-radius: 6px 0 0 6px; }
.tweak-seg:last-child { border-radius: 0 6px 6px 0; }
.tweak-seg + .tweak-seg { border-left: none; }
.tweak-seg.on { background: var(--color-accent); color: #fff; border-color: var(--color-accent); }

.tweak-select {
  padding: 3px 6px;
  border: 1px solid var(--color-card-stroke);
  border-radius: 6px;
  background: var(--color-neutral-1);
  color: var(--color-neutral-8);
  font-size: 11px;
  outline: none;
  cursor: pointer;
}

.tweak-slide-enter-active, .tweak-slide-leave-active { transition: all 0.2s ease; overflow: hidden; }
.tweak-slide-enter-from, .tweak-slide-leave-to { max-height: 0; opacity: 0; padding-top: 0; padding-bottom: 0; }
.tweak-slide-enter-to, .tweak-slide-leave-from { max-height: 48px; opacity: 1; }
</style>
