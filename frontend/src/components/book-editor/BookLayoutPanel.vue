<script setup lang="ts">
import { computed, ref, watch } from "vue"
import type { BookBlock, BookLayout } from "../../types/bookDocument"
import { resolveBookFontFamily } from "../../features/book-editor/bookFonts"

const props = defineProps<{
  layout: BookLayout
  canInsertPageBreak: boolean
  canDeletePageBreak: boolean
  selectedBlock?: BookBlock | null
  selectedBlockIndex?: number | null
}>()

const emit = defineEmits<{
  updateLayout: [layout: BookLayout]
  insertPageBreak: []
  deletePageBreak: []
  updateBlock: [blockIndex: number, field: "text" | "note" | "title" | "subtitle", text: string]
  close: []
}>()

const activeTab = ref<"layout" | "inspector">("layout")

watch(
  () => props.selectedBlockIndex,
  (newIdx) => {
    if (newIdx !== null && newIdx !== undefined) {
      activeTab.value = "inspector"
    }
  },
)

function update<K extends keyof BookLayout>(key: K, value: BookLayout[K]) {
  emit("updateLayout", { ...props.layout, [key]: value })
}

function handleFieldChange(field: "text" | "note" | "title" | "subtitle", value: string) {
  if (props.selectedBlockIndex !== null && props.selectedBlockIndex !== undefined) {
    emit("updateBlock", props.selectedBlockIndex, field, value)
  }
}

function insertSnippet(field: "text" | "note", snippet: string) {
  if (props.selectedBlockIndex === null || props.selectedBlockIndex === undefined || !props.selectedBlock) return
  if (props.selectedBlock.type !== "person") return

  const current = (field === "text" ? props.selectedBlock.text : props.selectedBlock.note) || ""
  const next = current ? `${current} ${snippet}` : snippet
  emit("updateBlock", props.selectedBlockIndex, field, next)
}

const templates = [
  {
    id: "classic",
    name: "朱丝古籍",
    desc: "传统朱红乌丝栏 · 鱼尾对开版心",
    color: "#a93426",
  },
  {
    id: "plain",
    name: "素雅宣纸",
    desc: "墨色暗纹细栏 · 简净文人雅致",
    color: "#544b3d",
  },
  {
    id: "white",
    name: "白底清稿",
    desc: "无框白底素版 · 现代校样试印",
    color: "#888888",
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
  { id: "compact", label: "窄边距", desc: "字行紧凑" },
  { id: "standard", label: "标准", desc: "黄金版面" },
  { id: "loose", label: "宽边距", desc: "舒展典雅" },
]

const currentFontId = computed(() => resolveBookFontFamily(props.layout.fontFamily))
</script>

<template>
  <aside class="book-layout-panel">
    <!-- Panel Header with Tabs -->
    <header class="panel-header">
      <div class="panel-tabs">
        <button
          type="button"
          :class="['panel-tab', { active: activeTab === 'layout' }]"
          @click="activeTab = 'layout'"
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="4" y1="21" x2="4" y2="14" /><line x1="4" y1="10" x2="4" y2="3" />
            <line x1="12" y1="21" x2="12" y2="12" /><line x1="12" y1="8" x2="12" y2="3" />
            <line x1="20" y1="21" x2="20" y2="16" /><line x1="20" y1="12" x2="20" y2="3" />
            <line x1="1" y1="14" x2="7" y2="14" /><line x1="9" y1="8" x2="15" y2="8" /><line x1="17" y1="16" x2="23" y2="16" />
          </svg>
          版式规制
        </button>
        <button
          type="button"
          :class="['panel-tab', { active: activeTab === 'inspector' }]"
          @click="activeTab = 'inspector'"
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
          </svg>
          条目修撰
          <span v-if="selectedBlock" class="active-dot"></span>
        </button>
      </div>

      <button class="panel-close-btn" type="button" aria-label="关闭面板" @click="emit('close')">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </button>
    </header>

    <!-- Tab 1: 版式规制 -->
    <div v-show="activeTab === 'layout'" class="panel-body">
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
        <p class="section-hint">选中书页中的条目后，可在其后插入强行分页符。</p>
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

    <!-- Tab 2: 条目修撰 Inspector -->
    <div v-show="activeTab === 'inspector'" class="panel-body">
      <!-- Case A: Person Block -->
      <template v-if="selectedBlock?.type === 'person'">
        <div class="inspector-badge-row">
          <div class="person-seal-avatar">{{ selectedBlock.personName.charAt(0) }}</div>
          <div class="person-head-info">
            <h4 class="person-head-name">{{ selectedBlock.personName }}</h4>
            <span class="person-head-gen">第 {{ selectedBlock.generation }} 世 · 世系行状</span>
          </div>
        </div>

        <!-- Person Biography Text -->
        <div class="section">
          <div class="section-title">行状正文（名讳生平）</div>
          <div class="quick-chips">
            <button
              v-for="chip in ['讳', '字', '号', '行', '生于', '卒于', '享寿', '葬于']"
              :key="chip"
              type="button"
              class="quick-chip"
              @click="insertSnippet('text', chip)"
            >
              + {{ chip }}
            </button>
          </div>
          <textarea
            :value="selectedBlock.text"
            rows="5"
            class="inspector-textarea"
            placeholder="填写先祖名讳、字号、官职生平、享寿卒葬..."
            @input="handleFieldChange('text', ($event.target as HTMLTextAreaElement).value)"
          ></textarea>
        </div>

        <!-- Person Annotation Note -->
        <div class="section">
          <div class="section-title">双行小字夹注（配偶与子嗣）</div>
          <div class="quick-chips">
            <button
              v-for="chip in ['配某氏', '继配', '合葬', '生子', '生女', '出嗣']"
              :key="chip"
              type="button"
              class="quick-chip"
              @click="insertSnippet('note', chip)"
            >
              + {{ chip }}
            </button>
          </div>
          <textarea
            :value="selectedBlock.note || ''"
            rows="4"
            class="inspector-textarea"
            placeholder="在此填写配偶氏族、生卒合葬、子嗣名号（古籍将自动拆为双行小字排列）..."
            @input="handleFieldChange('note', ($event.target as HTMLTextAreaElement).value)"
          ></textarea>
        </div>

        <div class="live-repage-hint">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="16" x2="12" y2="12" />
            <line x1="12" y1="8" x2="12.01" y2="8" />
          </svg>
          修改内容后，左侧古籍版芯将自动实时纵向分列与排版。
        </div>
      </template>

      <!-- Case B: Cover Block -->
      <template v-else-if="selectedBlock?.type === 'cover'">
        <div class="section">
          <div class="section-title">谱书主标题（题签）</div>
          <input
            :value="selectedBlock.title"
            class="inspector-input"
            placeholder="输入谱书题签（如：清河张氏宗谱）"
            @input="handleFieldChange('title', ($event.target as HTMLInputElement).value)"
          />
        </div>
        <div class="section">
          <div class="section-title">副标题（卷次 · 堂号）</div>
          <input
            :value="selectedBlock.subtitle || ''"
            class="inspector-input"
            placeholder="输入副标题或堂号（如：卷之一 · 百忍堂）"
            @input="handleFieldChange('subtitle', ($event.target as HTMLInputElement).value)"
          />
        </div>
      </template>

      <!-- Case C: Generation Heading Block -->
      <template v-else-if="selectedBlock?.type === 'generationHeading'">
        <div class="section">
          <div class="section-title">世系标题</div>
          <input
            :value="selectedBlock.text"
            class="inspector-input"
            placeholder="输入世系标题（如：第一世 始祖）"
            @input="handleFieldChange('text', ($event.target as HTMLInputElement).value)"
          />
        </div>
      </template>

      <!-- Case D: Preface Block -->
      <template v-else-if="selectedBlock?.type === 'preface'">
        <div class="section">
          <div class="section-title">谱序正文</div>
          <textarea
            :value="selectedBlock.text"
            rows="10"
            class="inspector-textarea"
            placeholder="在此编辑序言或凡例正文..."
            @input="handleFieldChange('text', ($event.target as HTMLTextAreaElement).value)"
          ></textarea>
        </div>
      </template>

      <!-- Case E: Empty / No selection -->
      <div v-else class="inspector-empty">
        <div class="inspector-empty__icon">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
            <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
            <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
          </svg>
        </div>
        <div class="inspector-empty__title">点击书页条目精修</div>
        <p class="inspector-empty__desc">点击书页中的任意先祖行状、配偶小字或封面，即可在此以现代输入习惯舒适修撰，左侧同步实时重排。</p>
      </div>
    </div>
  </aside>
</template>

<style scoped>
.book-layout-panel {
  width: 320px;
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
  padding: 10px 14px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  border-bottom: 1px solid var(--line-subtle, rgba(122, 95, 65, 0.08));
  flex-shrink: 0;
}

.panel-tabs {
  display: flex;
  gap: 3px;
  padding: 2px;
  border-radius: 7px;
  background: var(--fill-subtle, rgba(0, 0, 0, 0.04));
  border: 1px solid var(--line-subtle, rgba(122, 95, 65, 0.08));
}

.panel-tab {
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 4px 10px;
  border-radius: 5px;
  border: none;
  background: transparent;
  font-size: 11.5px;
  font-weight: 500;
  color: var(--text-sub, #6b5e52);
  cursor: pointer;
  transition: all 0.15s ease;
  position: relative;
}

.panel-tab:hover:not(.active) {
  color: var(--text-main, #241a10);
}

.panel-tab.active {
  background: var(--bg-paper, #ffffff);
  color: var(--text-main, #241a10);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
  font-weight: 600;
}

.active-dot {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: var(--color-accent, #a93426);
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
  gap: 16px;
}

.section {
  display: flex;
  flex-direction: column;
  gap: 6px;
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

/* Slider & Margin */
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

/* Inspector Elements */
.inspector-badge-row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border-radius: 8px;
  background: rgba(169, 52, 38, 0.05);
  border: 1px solid rgba(169, 52, 38, 0.14);
}

.person-seal-avatar {
  width: 32px;
  height: 32px;
  display: grid;
  place-items: center;
  border-radius: 6px;
  background: #a93426;
  color: #fff;
  font-family: var(--font-serif, "Noto Serif SC", serif);
  font-size: 16px;
  font-weight: 700;
  flex-shrink: 0;
}

.person-head-info {
  display: flex;
  flex-direction: column;
  gap: 1px;
  min-width: 0;
}

.person-head-name {
  margin: 0;
  font-family: var(--font-serif, "Noto Serif SC", serif);
  font-size: 14px;
  font-weight: 700;
  color: var(--text-main, #241a10);
}

.person-head-gen {
  font-size: 10.5px;
  color: #a93426;
  font-weight: 500;
}

.quick-chips {
  display: flex;
  gap: 4px;
  flex-wrap: wrap;
  margin-bottom: 4px;
}

.quick-chip {
  padding: 2px 6px;
  border-radius: 4px;
  border: 1px solid var(--line-subtle, rgba(122, 95, 65, 0.14));
  background: var(--bg-paper, #ffffff);
  font-size: 10.5px;
  color: var(--text-sub, #544b3d);
  cursor: pointer;
  transition: all 0.15s ease;
}

.quick-chip:hover {
  border-color: var(--color-accent, #724f2e);
  color: var(--color-accent, #724f2e);
}

.inspector-textarea {
  width: 100%;
  padding: 8px 10px;
  border-radius: 8px;
  border: 1px solid var(--line-soft, rgba(122, 95, 65, 0.18));
  background: var(--bg-paper, #ffffff);
  color: var(--text-main, #241a10);
  font-size: 12.5px;
  line-height: 1.6;
  font-family: inherit;
  box-sizing: border-box;
  resize: vertical;
  outline: none;
  transition: border-color 0.15s, box-shadow 0.15s;
}

.inspector-textarea:focus {
  border-color: var(--color-accent, #724f2e);
  box-shadow: 0 0 0 2px rgba(114, 79, 46, 0.1);
}

.inspector-input {
  width: 100%;
  padding: 8px 10px;
  border-radius: 8px;
  border: 1px solid var(--line-soft, rgba(122, 95, 65, 0.18));
  background: var(--bg-paper, #ffffff);
  color: var(--text-main, #241a10);
  font-size: 12.5px;
  font-family: inherit;
  box-sizing: border-box;
  outline: none;
  transition: border-color 0.15s, box-shadow 0.15s;
}

.inspector-input:focus {
  border-color: var(--color-accent, #724f2e);
  box-shadow: 0 0 0 2px rgba(114, 79, 46, 0.1);
}

.live-repage-hint {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 10.5px;
  color: var(--text-soft, #8f8878);
  line-height: 1.4;
  margin-top: 4px;
}

.inspector-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 48px 16px;
  text-align: center;
  color: var(--text-soft, #8f8878);
  gap: 8px;
}

.inspector-empty__icon {
  width: 44px;
  height: 44px;
  display: grid;
  place-items: center;
  border-radius: 50%;
  background: var(--fill-subtle, rgba(0, 0, 0, 0.04));
  color: var(--text-sub, #6b5e52);
  margin-bottom: 4px;
}

.inspector-empty__title {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-main, #241a10);
}

.inspector-empty__desc {
  margin: 0;
  font-size: 11px;
  line-height: 1.6;
  max-width: 220px;
}
</style>
