<script setup lang="ts">
export interface LayoutTweaks {
  fontSize: number
  lineHeight: number
  columns: number
  marginPreset: "compact" | "standard" | "loose"
}

const props = defineProps<{
  modelValue: LayoutTweaks
}>()

const emit = defineEmits<{
  "update:modelValue": [value: LayoutTweaks]
}>()

function updateFontSize(d: number) {
  const next = clamp(props.modelValue.fontSize + d, 12, 24)
  emit("update:modelValue", { ...props.modelValue, fontSize: next })
}

function updateLineHeight(d: number) {
  const next = clamp(Math.round((props.modelValue.lineHeight + d) * 10) / 10, 1.5, 2.5)
  emit("update:modelValue", { ...props.modelValue, lineHeight: next })
}

function setColumns(n: number) {
  emit("update:modelValue", { ...props.modelValue, columns: n })
}

function setMargin(p: LayoutTweaks["marginPreset"]) {
  emit("update:modelValue", { ...props.modelValue, marginPreset: p })
}

function clamp(v: number, min: number, max: number) { return Math.max(min, Math.min(max, v)) }
</script>

<template>
  <div class="tweaks-overlay">
    <h4 class="tweaks-title">排版微调</h4>

    <div class="tweak-row">
      <label class="tweak-label">字号</label>
      <div class="tweak-control">
        <button class="tweak-btn" @click="updateFontSize(-1)">−</button>
        <span class="tweak-value">{{ modelValue.fontSize }}pt</span>
        <button class="tweak-btn" @click="updateFontSize(1)">+</button>
      </div>
    </div>

    <div class="tweak-row">
      <label class="tweak-label">行距</label>
      <div class="tweak-control">
        <button class="tweak-btn" @click="updateLineHeight(-0.1)">−</button>
        <span class="tweak-value">{{ modelValue.lineHeight.toFixed(1) }}</span>
        <button class="tweak-btn" @click="updateLineHeight(0.1)">+</button>
      </div>
    </div>

    <div class="tweak-row">
      <label class="tweak-label">栏数</label>
      <div class="tweak-control tweak-segmented">
        <button :class="['seg-btn', { active: modelValue.columns === 1 }]" @click="setColumns(1)">1</button>
        <button :class="['seg-btn', { active: modelValue.columns === 2 }]" @click="setColumns(2)">2</button>
      </div>
    </div>

    <div class="tweak-row">
      <label class="tweak-label">边距</label>
      <div class="tweak-control tweak-segmented">
        <button :class="['seg-btn', { active: modelValue.marginPreset === 'compact' }]" @click="setMargin('compact')">紧凑</button>
        <button :class="['seg-btn', { active: modelValue.marginPreset === 'standard' }]" @click="setMargin('standard')">标准</button>
        <button :class="['seg-btn', { active: modelValue.marginPreset === 'loose' }]" @click="setMargin('loose')">宽松</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.tweaks-overlay {
  background: var(--color-neutral-1);
  border: 1px solid var(--color-card-stroke);
  border-radius: 14px;
  padding: 16px 18px;
  width: 220px;
  box-shadow: var(--shadow-whisper);
  backdrop-filter: blur(12px);
}

.tweaks-title {
  font-size: 12px; font-weight: 500; color: var(--color-neutral-8); margin: 0 0 14px;
  letter-spacing: 0.02em;
}

.tweak-row {
  display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px;
}
.tweak-row:last-child { margin-bottom: 0; }

.tweak-label { font-size: 11px; color: var(--color-neutral-6); flex-shrink: 0; }

.tweak-control { display: flex; align-items: center; gap: 4px; }

.tweak-btn {
  width: 26px; height: 26px; border: 1px solid var(--color-card-stroke);
  background: var(--color-neutral-1); color: var(--color-neutral-6);
  border-radius: 8px; font-size: 14px; cursor: pointer;
  display: flex; align-items: center; justify-content: center; padding: 0;
  transition: all 0.15s;
}
.tweak-btn:hover { background: var(--color-neutral-2); color: var(--color-neutral-9); }

.tweak-value {
  font-size: 11px; color: var(--color-neutral-8); min-width: 34px; text-align: center;
  font-variant-numeric: tabular-nums;
}

.tweak-segmented { gap: 0; }
.seg-btn {
  padding: 4px 10px; border: 1px solid var(--color-card-stroke);
  background: var(--color-neutral-1); color: var(--color-neutral-6);
  font-size: 11px; cursor: pointer; transition: all 0.15s;
}
.seg-btn:first-child { border-radius: 8px 0 0 8px; }
.seg-btn:last-child { border-radius: 0 8px 8px 0; }
.seg-btn + .seg-btn { border-left: none; }
.seg-btn:hover { background: var(--color-neutral-2); }
.seg-btn.active { background: var(--color-accent); color: #fff; border-color: var(--color-accent); }
</style>
