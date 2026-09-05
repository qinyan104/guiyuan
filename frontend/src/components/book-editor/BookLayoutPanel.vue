<script setup lang="ts">
import { computed } from "vue"
import type { BookLayout } from "../../types/bookDocument"
import { resolveBookFontFamily } from "../../features/book-editor/bookFonts"

const props = defineProps<{
  layout: BookLayout
  canInsertPageBreak: boolean
  canDeletePageBreak: boolean
}>()

const emit = defineEmits<{
  updateLayout: [layout: BookLayout]
  insertPageBreak: []
  deletePageBreak: []
  close: []
}>()

function update<K extends keyof BookLayout>(key: K, value: BookLayout[K]) {
  emit("updateLayout", { ...props.layout, [key]: value })
}

const templates = [
  {
    id: "classic",
    name: "朱丝古籍",
    desc: "传统朱红乌丝栏 · 鱼尾对开版心",
    color: "#a93426",
    bg: "#faf5ec",
  },
  {
    id: "plain",
    name: "素雅宣纸",
    desc: "墨色暗纹细栏 · 简净文人雅致",
    color: "#544b3d",
    bg: "#f8f3ea",
  },
  {
    id: "white",
    name: "白底清稿",
    desc: "无框白底素版 · 现代校样试印",
    color: "#888888",
    bg: "#ffffff",
  },
]

const fontOptions = [
  { id: "LXGWWenKai", name: "霞鹜文楷", tag: "手抄谱牒 · 秀雅温润", sample: "世系昭穆 源远流长" },
  { id: "WenYue-GuTiFangSong", name: "文悦仿宋", tag: "宗谱正体 · 严谨端正", sample: "光前裕后 慎终追远" },
  { id: "PingXianZhenSong", name: "屏显真宋", tag: "雕版宋体 · 骨力遒劲", sample: "承先启后 敦宗睦族" },
  { id: "HanaMinA", name: "花园明朝", tag: "大字符集 · 罕字完备", sample: "万派朝宗 支分派别" },
  { id: "qiji-combo", name: "奇迹手写", tag: "苍劲古朴 · 墨韵生动", sample: "行状世德 奕叶重光" },
  { id: "XiaolaiMonoSC", name: "小赖手写", tag: "手抄家乘 · 自然随性", sample: "木本水源 追本溯源" },
]

const marginOptions = [
  { id: "compact", label: "窄边距", desc: "天头地脚小，容字更多" },
  { id: "standard", label: "标准", desc: "古籍经典黄金版面比例" },
  { id: "loose", label: "宽边距", desc: "舒展典雅，适于大型本" },
]

const currentFontId = computed(() => resolveBookFontFamily(props.layout.fontFamily))
</script>

<template>
  <aside class="book-layout-panel">
    <header class="panel-header">
      <div class="panel-header__text">
        <h3 class="panel-title">版式设计</h3>
        <p class="panel-subtitle">古籍排版规制与纸面外观</p>
      </div>
      <button class="panel-close-btn" type="button" aria-label="关闭面板" @click="emit('close')">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </button>
    </header>

    <div class="panel-body">
      <!-- Section 1: 版芯模板 -->
      <div class="section">
        <div class="section-title">版芯规制</div>
        <div class="template-list">
          <button
            v-for="tpl in templates"
            :key="tpl.id"
            type="button"
            :class="['template-card', { active: layout.templateId === tpl.id }]"
            @click="update('templateId', tpl.id)"
          >
            <span class="template-color-dot" :style="{ backgroundColor: tpl.color, borderColor: tpl.color }"></span>
            <div class="template-info">
              <span class="template-name">{{ tpl.name }}</span>
              <span class="template-desc">{{ tpl.desc }}</span>
            </div>
            <span v-if="layout.templateId === tpl.id" class="check-mark">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </span>
          </button>
        </div>
      </div>

      <!-- Section 2: 字体选择 -->
      <div class="section">
        <div class="section-title">排版字体</div>
        <div class="font-list">
          <button
            v-for="font in fontOptions"
            :key="font.id"
            type="button"
            :class="['font-card', { active: currentFontId === font.id }]"
            @click="update('fontFamily', font.id)"
          >
            <div class="font-info">
              <div class="font-header">
                <span class="font-name" :style="{ fontFamily: font.id }">{{ font.name }}</span>
                <span class="font-tag">{{ font.tag }}</span>
              </div>
              <span class="font-sample" :style="{ fontFamily: font.id }">{{ font.sample }}</span>
            </div>
            <span v-if="currentFontId === font.id" class="check-mark">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </span>
          </button>
        </div>
      </div>

      <!-- Section 3: 正文字号 -->
      <div class="section">
        <div class="section-header-inline">
          <span class="section-title">正文字号</span>
          <span class="font-size-display">{{ layout.fontSize }} px</span>
        </div>
        <div class="slider-row">
          <input
            type="range"
            min="14"
            max="32"
            step="1"
            :value="layout.fontSize"
            class="range-input"
            @input="update('fontSize', Number(($event.target as HTMLInputElement).value))"
          />
        </div>
        <div class="font-size-presets">
          <button
            v-for="size in [16, 18, 20, 24]"
            :key="size"
            type="button"
            :class="['preset-btn', { active: layout.fontSize === size }]"
            @click="update('fontSize', size)"
          >
            {{ size }}px
          </button>
        </div>
      </div>

      <!-- Section 4: 边距预设 -->
      <div class="section">
        <div class="section-title">天头地脚留白</div>
        <div class="margin-grid">
          <button
            v-for="opt in marginOptions"
            :key="opt.id"
            type="button"
            :class="['margin-card', { active: layout.marginPreset === opt.id }]"
            @click="update('marginPreset', opt.id as BookLayout['marginPreset'])"
          >
            <span class="margin-label">{{ opt.label }}</span>
            <span class="margin-desc">{{ opt.desc }}</span>
          </button>
        </div>
      </div>

      <!-- Section 5: 分页控制 -->
      <div class="section">
        <div class="section-title">分页辅助</div>
        <p class="section-hint">选中书页中的条目后，可在其后插入强行分页。</p>
        <div class="page-break-actions">
          <button
            type="button"
            class="action-btn"
            :disabled="!canInsertPageBreak"
            @click="emit('insertPageBreak')"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            插入手动分页
          </button>
          <button
            type="button"
            class="action-btn action-btn--danger"
            :disabled="!canDeletePageBreak"
            @click="emit('deletePageBreak')"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="3 6 5 6 21 6" />
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
            </svg>
            删除选中的分页符
          </button>
        </div>
      </div>
    </div>
  </aside>
</template>

<style scoped>
.book-layout-panel {
  width: 300px;
  height: 100%;
  display: flex;
  flex-direction: column;
  background: var(--bg-paper-raised, #fcfbfa);
  border-left: 1px solid var(--line-soft, rgba(122, 95, 65, 0.16));
  box-shadow: -4px 0 16px rgba(24, 18, 12, 0.05);
  box-sizing: border-box;
  flex-shrink: 0;
  z-index: 10;
}

.panel-header {
  padding: 14px 16px;
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  border-bottom: 1px solid var(--line-subtle, rgba(122, 95, 65, 0.08));
  flex-shrink: 0;
}

.panel-header__text {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.panel-title {
  margin: 0;
  font-family: var(--font-serif, "Noto Serif SC", serif);
  font-size: 13.5px;
  font-weight: 600;
  color: var(--text-main, #241a10);
  letter-spacing: 0.02em;
}

.panel-subtitle {
  margin: 0;
  font-size: 11px;
  color: var(--text-soft, #8f8878);
}

.panel-close-btn {
  width: 26px;
  height: 26px;
  border-radius: 6px;
  background: transparent;
  border: 1px solid transparent;
  color: var(--text-soft, #8f8878);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.15s ease;
  margin-top: -2px;
  margin-right: -4px;
}

.panel-close-btn:hover {
  background: var(--fill-subtle, rgba(0, 0, 0, 0.05));
  color: var(--text-main, #241a10);
}

.panel-body {
  flex: 1;
  overflow-y: auto;
  padding: 14px 14px 20px;
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.section {
  display: flex;
  flex-direction: column;
  gap: 7px;
}

.section-title {
  font-size: 11.5px;
  font-weight: 600;
  color: var(--text-sub, #544b3d);
  letter-spacing: 0.02em;
}

.section-header-inline {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.font-size-display {
  font-size: 11.5px;
  font-weight: 600;
  color: var(--color-accent, #724f2e);
  font-variant-numeric: tabular-nums;
}

.section-hint {
  margin: 0;
  font-size: 11px;
  color: var(--text-soft, #8f8878);
  line-height: 1.4;
}

/* Template Cards */
.template-list {
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.template-card {
  display: flex;
  align-items: center;
  gap: 9px;
  padding: 8px 10px;
  border-radius: 8px;
  border: 1px solid var(--line-subtle, rgba(122, 95, 65, 0.12));
  background: var(--bg-paper, #ffffff);
  cursor: pointer;
  text-align: left;
  transition: all 0.15s ease;
}

.template-card:hover:not(.active) {
  border-color: var(--line-soft, rgba(122, 95, 65, 0.25));
  background: #fdfcfa;
}

.template-card.active {
  border-color: var(--color-accent, #724f2e);
  background: rgba(114, 79, 46, 0.04);
}

.template-color-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  border: 1px solid transparent;
  flex-shrink: 0;
}

.template-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 1px;
  min-width: 0;
}

.template-name {
  font-size: 12px;
  font-weight: 600;
  color: var(--text-main, #241a10);
}

.template-desc {
  font-size: 10.5px;
  color: var(--text-soft, #8f8878);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.check-mark {
  color: var(--color-accent, #724f2e);
  display: flex;
  align-items: center;
  flex-shrink: 0;
}

/* Font Cards */
.font-list {
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.font-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 7px 10px;
  border-radius: 8px;
  border: 1px solid var(--line-subtle, rgba(122, 95, 65, 0.12));
  background: var(--bg-paper, #ffffff);
  cursor: pointer;
  text-align: left;
  transition: all 0.15s ease;
}

.font-card:hover:not(.active) {
  border-color: var(--line-soft, rgba(122, 95, 65, 0.25));
  background: #fdfcfa;
}

.font-card.active {
  border-color: var(--color-accent, #724f2e);
  background: rgba(114, 79, 46, 0.04);
}

.font-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
  flex: 1;
  min-width: 0;
}

.font-header {
  display: flex;
  align-items: center;
  gap: 6px;
}

.font-name {
  font-size: 12px;
  font-weight: 600;
  color: var(--text-main, #241a10);
}

.font-tag {
  font-size: 10px;
  color: var(--text-soft, #8f8878);
}

.font-sample {
  font-size: 11px;
  color: var(--text-sub, #544b3d);
  letter-spacing: 0.05em;
  opacity: 0.85;
}

/* Slider */
.slider-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.range-input {
  flex: 1;
  height: 4px;
  border-radius: 2px;
  outline: none;
  background: var(--fill-subtle, rgba(122, 95, 65, 0.15));
  accent-color: var(--color-accent, #724f2e);
  cursor: pointer;
}

.font-size-presets {
  display: flex;
  gap: 5px;
  margin-top: 3px;
}

.preset-btn {
  flex: 1;
  padding: 3px 0;
  border-radius: 6px;
  border: 1px solid var(--line-subtle, rgba(122, 95, 65, 0.12));
  background: var(--bg-paper, #ffffff);
  font-size: 11px;
  color: var(--text-sub, #544b3d);
  cursor: pointer;
  transition: all 0.15s ease;
}

.preset-btn.active {
  border-color: var(--color-accent, #724f2e);
  background: var(--color-accent, #724f2e);
  color: #ffffff;
  font-weight: 600;
}

/* Margin Cards */
.margin-grid {
  display: flex;
  gap: 5px;
}

.margin-card {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 7px 4px;
  border-radius: 8px;
  border: 1px solid var(--line-subtle, rgba(122, 95, 65, 0.12));
  background: var(--bg-paper, #ffffff);
  cursor: pointer;
  text-align: center;
  transition: all 0.15s ease;
}

.margin-card:hover:not(.active) {
  border-color: var(--line-soft, rgba(122, 95, 65, 0.25));
}

.margin-card.active {
  border-color: var(--color-accent, #724f2e);
  background: rgba(114, 79, 46, 0.04);
}

.margin-label {
  font-size: 11.5px;
  font-weight: 600;
  color: var(--text-main, #241a10);
}

.margin-desc {
  font-size: 9.5px;
  color: var(--text-soft, #8f8878);
  margin-top: 2px;
}

/* Page Break Actions */
.page-break-actions {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-top: 3px;
}

.action-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 6px 10px;
  border-radius: 7px;
  border: 1px solid var(--line-subtle, rgba(122, 95, 65, 0.14));
  background: var(--bg-paper, #ffffff);
  font-size: 11.5px;
  font-weight: 500;
  color: var(--text-main, #241a10);
  cursor: pointer;
  transition: all 0.15s ease;
}

.action-btn:hover:not(:disabled) {
  background: var(--fill-subtle, rgba(0, 0, 0, 0.04));
  border-color: var(--line-soft, rgba(122, 95, 65, 0.25));
}

.action-btn:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.action-btn--danger {
  color: var(--color-error, #b3261e);
}

.action-btn--danger:hover:not(:disabled) {
  background: rgba(179, 38, 30, 0.05);
  border-color: rgba(179, 38, 30, 0.2);
}
</style>
