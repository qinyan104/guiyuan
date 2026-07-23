<script setup lang="ts">
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

function updateTemplate(event: Event) {
  update(props.layout, "templateId", (event.target as HTMLSelectElement).value)
}

function updateFont(event: Event) {
  update(props.layout, "fontFamily", (event.target as HTMLSelectElement).value)
}

function updateFontSize(event: Event) {
  update(props.layout, "fontSize", Number((event.target as HTMLInputElement).value))
}

function updateMargin(event: Event) {
  update(props.layout, "marginPreset", (event.target as HTMLSelectElement).value as BookLayout["marginPreset"])
}
</script>

<template>
  <header class="book-toolbar">
    <div class="toolbar-group toolbar-group--title">
      <button class="icon-btn" type="button" title="返回画布" @click="emit('back')">←</button>
      <div class="title">{{ title || "古籍族谱" }}</div>
    </div>
    <div class="spacer" />
    <div class="toolbar-group">
      <button class="tool-btn" type="button" @click="emit('generate')">{{ hasDocument ? "重新生成" : "生成书稿" }}</button>
    </div>
    <template v-if="hasDocument">
      <div class="toolbar-group">
        <label>
          <span>模板</span>
          <select :value="layout.templateId" @change="updateTemplate">
            <option value="classic">宣纸古籍</option>
            <option value="plain">素纸竖排</option>
          </select>
        </label>
        <label>
          <span>字体</span>
          <select :value="layout.fontFamily" @change="updateFont">
            <option value="qiji-combo">奇迹手写</option>
            <option value="WenYue-GuTiFangSong">文悦古体仿宋</option>
            <option value="XiaolaiMonoSC">小赖手写</option>
            <option value="KaiTi">楷体</option>
            <option value="SimSun">宋体</option>
          </select>
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
          <select :value="layout.marginPreset" @change="updateMargin">
            <option value="compact">窄</option>
            <option value="standard">标准</option>
            <option value="loose">宽</option>
          </select>
        </label>
      </div>
      <div class="toolbar-group">
        <button class="tool-btn" type="button" @click="emit('insertPageBreak')">分页</button>
        <button class="tool-btn" type="button" :disabled="saving" @click="emit('save')">{{ saving ? "保存中" : "保存" }}</button>
        <button class="tool-btn primary" type="button" :disabled="exporting" @click="emit('exportPdf')">{{ exporting ? "导出中" : "导出 PDF" }}</button>
      </div>
    </template>
  </header>
</template>

<style scoped>
.book-toolbar {
  height: 52px;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 0 14px;
  border-bottom: 1px solid var(--color-card-stroke);
  background: var(--color-neutral-1);
}

.toolbar-group {
  height: 36px;
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 0 8px;
  border: 1px solid var(--color-card-stroke);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.42);
}

.toolbar-group--title {
  border-color: transparent;
  background: transparent;
  padding-left: 0;
}

.title {
  font-size: 15px;
  font-weight: 600;
  color: var(--color-neutral-9);
  max-width: 260px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.spacer { flex: 1; }

button,
select,
input {
  height: 26px;
  border: 0;
  border-radius: 5px;
  background: transparent;
  color: var(--color-neutral-8);
  font-size: 12px;
}

button {
  padding: 0 9px;
  cursor: pointer;
}

label {
  display: flex;
  align-items: center;
  gap: 4px;
  color: var(--color-neutral-5);
  font-size: 11px;
}

select {
  max-width: 92px;
  background: var(--color-neutral-2);
  padding: 0 6px;
}

input { width: 44px; padding: 0 4px; background: var(--color-neutral-2); }
.number-field { gap: 3px; }
button:hover:not(:disabled) { background: var(--color-neutral-2); }
button:disabled { opacity: 0.5; cursor: default; }
.icon-btn {
  width: 28px;
  padding: 0;
  border-radius: 999px;
  color: var(--color-neutral-6);
}
.tool-btn { color: var(--color-neutral-7); }
.primary { background: var(--color-accent); border-color: var(--color-accent); color: #fff; }
</style>
