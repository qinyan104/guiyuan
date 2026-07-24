<script setup lang="ts">
import AppSelect from "../AppSelect.vue"
import type { BookLayout } from "../../types/bookDocument"

const props = defineProps<{
  title: string
  layout: BookLayout
  saving: boolean
  exporting: boolean
  hasDocument: boolean
}>()

const emit = defineEmits<{
  back: []
  generate: []
  save: []
  exportPdf: []
  insertPageBreak: []
  updateLayout: [layout: BookLayout]
}>()

function update<K extends keyof BookLayout>(layout: BookLayout, key: K, value: BookLayout[K]) {
  emit("updateLayout", { ...layout, [key]: value })
}

const templateOptions = [
  { value: "classic", label: "宣纸古籍 · 双框版心" },
  { value: "plain", label: "素纸竖排 · 干净纸面" },
  { value: "white", label: "白底栏格 · 校对底稿" },
]

const fontOptions = [
  { value: "qiji-combo", label: "奇迹手写 · 慎终追远" },
  { value: "WenYue-GuTiFangSong", label: "文悦仿宋 · 世系昭穆" },
  { value: "XiaolaiMonoSC", label: "小赖手写 · 家乘流芳" },
  { value: "PingXianZhenSong", label: "屏显真宋 · 谱牒修明" },
  { value: "HanaMinA", label: "花园明朝 · 宗支有序" },
]

const marginOptions = [
  { value: "compact", label: "窄" },
  { value: "standard", label: "标准" },
  { value: "loose", label: "宽" },
]

function updateTemplate(value: string) {
  update(props.layout, "templateId", value)
}

function updateFont(value: string) {
  update(props.layout, "fontFamily", value)
}

function updateCustomFont(event: Event) {
  const value = (event.target as HTMLInputElement).value.trim()
  if (value) updateFont(value)
}

function updateFontSize(event: Event) {
  update(props.layout, "fontSize", Number((event.target as HTMLInputElement).value))
}

function updateMargin(value: string) {
  update(props.layout, "marginPreset", value as BookLayout["marginPreset"])
}
</script>

<template>
  <header class="book-toolbar">
    <div class="toolbar-group toolbar-group--title">
      <button class="icon-btn" type="button" title="返回画布" @click="emit('back')">←</button>
      <div class="title">{{ title || "古籍族谱" }}</div>
    </div>
    <div class="spacer" />
    <div class="toolbar-group toolbar-actions">
      <button class="tool-btn tool-btn--quiet" type="button" @click="emit('generate')">{{ hasDocument ? "重新生成" : "生成书稿" }}</button>
    </div>
    <template v-if="hasDocument">
      <div class="toolbar-group">
        <label>
          <span>纸张</span>
          <AppSelect
            class="toolbar-select toolbar-select--paper"
            variant="compact"
            :modelValue="layout.templateId"
            :options="templateOptions"
            @update:modelValue="updateTemplate"
          />
        </label>
        <label>
          <span>字体</span>
          <AppSelect
            class="toolbar-select toolbar-select--font"
            variant="compact"
            :modelValue="layout.fontFamily"
            :options="fontOptions"
            @update:modelValue="updateFont"
          />
          <input
            class="custom-font-input"
            type="text"
            placeholder="自定义字体名"
            :value="fontOptions.some((option) => option.value === layout.fontFamily) ? '' : layout.fontFamily"
            @change="updateCustomFont"
          />
        </label>
        <label class="number-field">
          <span>字号</span>
          <input
            type="number"
            min="14"
            max="32"
            :value="layout.fontSize"
            @change="updateFontSize"
          />
        </label>
        <label>
          <span>边距</span>
          <AppSelect
            class="toolbar-select toolbar-select--margin"
            variant="compact"
            :modelValue="layout.marginPreset"
            :options="marginOptions"
            @update:modelValue="updateMargin"
          />
        </label>
      </div>
      <div class="toolbar-group toolbar-actions">
        <button class="tool-btn tool-btn--quiet" type="button" @click="emit('insertPageBreak')">插入分页</button>
        <button class="tool-btn" type="button" :disabled="saving" @click="emit('save')">{{ saving ? "保存中" : "保存书稿" }}</button>
        <button class="tool-btn primary" type="button" :disabled="exporting" @click="emit('exportPdf')">{{ exporting ? "导出中" : "导出 PDF" }}</button>
      </div>
    </template>
  </header>
</template>

<style scoped>
@font-face {
  font-family: "qiji-combo";
  src: url("/vrain/fonts/qiji-combo.ttf") format("truetype");
  font-display: swap;
}

@font-face {
  font-family: "WenYue-GuTiFangSong";
  src: url("/vrain/fonts/WenYue-GuTiFangSong-JRFC-2.otf") format("opentype");
  font-display: swap;
}

@font-face {
  font-family: "XiaolaiMonoSC";
  src: url("/vrain/fonts/XiaolaiMonoSC-Regular.ttf") format("truetype");
  font-display: swap;
}

@font-face {
  font-family: "PingXianZhenSong";
  src: url("/vrain/fonts/PingXianZhenSong.ttf") format("truetype");
  font-display: swap;
}

@font-face {
  font-family: "HanaMinA";
  src: url("/vrain/fonts/HanaMinA.ttf") format("truetype");
  font-display: swap;
}

.book-toolbar {
  min-height: 60px;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 18px;
  overflow-x: auto;
  border-bottom: 1px solid rgba(28, 24, 20, 0.08);
  background: #fbf8f1;
  box-shadow: 0 1px 0 rgba(255, 255, 255, 0.8) inset;
}

.toolbar-group {
  min-height: 38px;
  display: flex;
  align-items: center;
  flex: 0 0 auto;
  gap: 7px;
  padding: 4px 7px;
  border: 1px solid rgba(28, 24, 20, 0.08);
  border-radius: 6px;
  background: #fffdfa;
}

.custom-font-input {
  width: 104px;
}

.toolbar-group--title {
  border-color: transparent;
  background: transparent;
  padding-left: 0;
}

.toolbar-actions {
  align-items: stretch;
  gap: 2px;
  padding: 4px;
  border-radius: 999px;
  background: #f7f2e9;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.72);
}

.title {
  font-family: var(--font-serif);
  font-size: 16px;
  font-weight: 700;
  color: #1c1814;
  max-width: 320px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.spacer { flex: 1; }

button,
input {
  height: 28px;
  border: 1px solid rgba(28, 24, 20, 0.1);
  border-radius: 4px;
  background: transparent;
  color: #2d261f;
  font-size: 12px;
  transition: background 160ms ease, border-color 160ms ease, color 160ms ease, transform 160ms ease;
}

button {
  padding: 0 10px;
  cursor: pointer;
  font-weight: 600;
}

label {
  display: flex;
  align-items: center;
  gap: 5px;
  color: #6b6252;
  font-size: 11px;
  font-weight: 600;
  white-space: nowrap;
}

input {
  width: 48px;
  padding: 0 6px;
  background: #f4efe6;
  font-variant-numeric: tabular-nums;
}
.number-field { gap: 3px; }
button:hover:not(:disabled),
input:hover {
  background: #eee6da;
  border-color: rgba(28, 24, 20, 0.18);
}

button:active:not(:disabled) { transform: translateY(1px); }

button:focus-visible,
input:focus-visible {
  outline: 2px solid rgba(198, 60, 46, 0.18);
  border-color: var(--color-accent);
}

button:disabled { opacity: 0.5; cursor: default; }
.toolbar-select {
  width: 112px;
  --control-radius: 4px;
  --line-soft: rgba(28, 24, 20, 0.1);
  --bg-paper: #f4efe6;
  --text-main: #2d261f;
  --text-soft: #6b6252;
  --accent-signal: var(--color-accent);
  --shadow-ring: 0 0 0 2px rgba(198, 60, 46, 0.18);
}

.toolbar-select--paper { width: 154px; }
.toolbar-select--font { width: 166px; }
.toolbar-select--margin { width: 78px; }

.icon-btn {
  width: 30px;
  padding: 0;
  color: #463e32;
  background: #f0e9dd;
}
.tool-btn {
  min-width: auto;
  min-height: 30px;
  padding: 0 13px;
  border: 0;
  border-radius: 999px;
  color: #6b6252;
  background: transparent;
}

.tool-btn--quiet {
  color: #6b6252;
}

.tool-btn:hover:not(:disabled),
.tool-btn--quiet:hover:not(:disabled) {
  color: #2d261f;
  background: #fffdfa;
}

.primary {
  min-width: 90px;
  background: var(--color-accent);
  color: #fff;
  box-shadow: 0 8px 16px rgba(198, 60, 46, 0.16);
}

.primary:hover:not(:disabled) {
  background: var(--color-accent-deep);
  border-color: var(--color-accent-deep);
}
</style>
