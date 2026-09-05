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
  blocks?: BookBlock[]
  prevPersonIndex?: number | null
  nextPersonIndex?: number | null
}>()

const emit = defineEmits<{
  updateLayout: [layout: BookLayout]
  insertPageBreak: []
  deletePageBreak: []
  updateBlock: [blockIndex: number, field: "text" | "note" | "title" | "subtitle", text: string]
  selectBlock: [blockIndex: number | null]
  close: []
}>()

const activeTab = ref<"layout" | "inspector">("layout")
const searchQuery = ref("")

watch(
  () => props.selectedBlockIndex,
  (newIdx) => {
    if (newIdx !== null && newIdx !== undefined) {
      activeTab.value = "inspector"
    }
  },
)

interface PersonItem {
  blockIndex: number
  block: Extract<BookBlock, { type: "person" }>
}

const personBlocks = computed<PersonItem[]>(() => {
  if (!props.blocks) return []
  const result: PersonItem[] = []
  props.blocks.forEach((block, index) => {
    if (block.type === "person") {
      result.push({ blockIndex: index, block })
    }
  })
  return result
})

const filteredPersons = computed(() => {
  const query = searchQuery.value.trim().toLowerCase()
  if (!query) return personBlocks.value
  return personBlocks.value.filter(({ block }) =>
    block.personName.toLowerCase().includes(query) ||
    String(block.generation).includes(query) ||
    block.text.toLowerCase().includes(query) ||
    (block.note && block.note.toLowerCase().includes(query))
  )
})

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
            <div class="tpl-swatch" :style="{ borderColor: tpl.color }">
              <div class="tpl-swatch-inner" :style="{ background: tpl.id === 'white' ? '#fff' : '#faf6ef' }">
                <div class="tpl-lines" :style="{ borderColor: tpl.color }"></div>
              </div>
            </div>
            <div class="tpl-meta">
              <span class="tpl-name">{{ tpl.name }}</span>
              <span class="tpl-desc">{{ tpl.desc }}</span>
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
          <div class="person-head-left">
            <div class="person-seal-avatar">{{ selectedBlock.personName.charAt(0) }}</div>
            <div class="person-head-info">
              <h4 class="person-head-name">{{ selectedBlock.personName }}</h4>
              <span class="person-head-gen">第 {{ selectedBlock.generation }} 世 · 世系行状</span>
            </div>
          </div>
          <div class="person-nav-group">
            <button
              type="button"
              class="person-nav-btn"
              :disabled="prevPersonIndex === null || prevPersonIndex === undefined"
              title="上一位先祖"
              @click="prevPersonIndex !== null && prevPersonIndex !== undefined && emit('selectBlock', prevPersonIndex)"
            >
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="15 18 9 12 15 6" />
              </svg>
            </button>
            <button
              type="button"
              class="person-nav-btn"
              title="返回世系条目索引"
              @click="emit('selectBlock', null)"
            >
              目录
            </button>
            <button
              type="button"
              class="person-nav-btn"
              :disabled="nextPersonIndex === null || nextPersonIndex === undefined"
              title="下一位先祖"
              @click="nextPersonIndex !== null && nextPersonIndex !== undefined && emit('selectBlock', nextPersonIndex)"
            >
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </button>
          </div>
        </div>

        <!-- Person Biography Text -->
        <div class="section">
          <div class="section-header-inline">
            <span class="section-title">行状正文（名讳生平）</span>
            <span class="char-count">{{ selectedBlock.text.length }} 字</span>
          </div>
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
          <div class="section-header-inline">
            <span class="section-title">双行小字夹注（配偶与子嗣）</span>
            <span class="char-count">{{ (selectedBlock.note || '').length }} 字</span>
          </div>
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
          内容修改将触发左侧古籍实时纵向排版并自动保存草稿。
        </div>
      </template>

      <!-- Case B: Cover Block -->
      <template v-else-if="selectedBlock?.type === 'cover'">
        <div class="inspector-badge-row">
          <div class="person-head-left">
            <div class="person-seal-avatar">封</div>
            <div class="person-head-info">
              <h4 class="person-head-name">书本封面题签</h4>
              <span class="person-head-gen">传统宣纸磁青封皮</span>
            </div>
          </div>
          <button type="button" class="person-nav-btn" @click="emit('selectBlock', null)">目录</button>
        </div>
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
        <div class="inspector-badge-row">
          <div class="person-head-left">
            <div class="person-seal-avatar">世</div>
            <div class="person-head-info">
              <h4 class="person-head-name">第 {{ selectedBlock.generation }} 世 世系标目</h4>
              <span class="person-head-gen">世系分卷题头</span>
            </div>
          </div>
          <button type="button" class="person-nav-btn" @click="emit('selectBlock', null)">目录</button>
        </div>
        <div class="section">
          <div class="section-title">世系标题内容</div>
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
        <div class="inspector-badge-row">
          <div class="person-head-left">
            <div class="person-seal-avatar">序</div>
            <div class="person-head-info">
              <h4 class="person-head-name">{{ selectedBlock.title || '谱序' }}</h4>
              <span class="person-head-gen">序文与凡例</span>
            </div>
          </div>
          <button type="button" class="person-nav-btn" @click="emit('selectBlock', null)">目录</button>
        </div>
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

      <!-- Case E: Ancestor Quick Index / Filter (When no block is active) -->
      <div v-else class="ancestor-index-view">
        <div class="index-head">
          <div class="index-title-row">
            <span class="index-title">先祖世系索引</span>
            <span class="index-count">共 {{ personBlocks.length }} 位</span>
          </div>
          <div class="search-box">
            <svg class="search-icon" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              v-model="searchQuery"
              type="search"
              class="search-input"
              placeholder="搜索先祖名讳、生平或世代..."
            />
          </div>
        </div>

        <div class="ancestor-card-list">
          <button
            v-for="item in filteredPersons"
            :key="item.blockIndex"
            type="button"
            class="ancestor-card"
            @click="emit('selectBlock', item.blockIndex)"
          >
            <div class="ancestor-avatar">{{ item.block.personName.charAt(0) }}</div>
            <div class="ancestor-info">
              <div class="ancestor-top">
                <strong class="ancestor-name">{{ item.block.personName }}</strong>
                <span class="ancestor-gen">第 {{ item.block.generation }} 世</span>
              </div>
              <p class="ancestor-snippet">{{ item.block.text || item.block.note || '暂无详细行状' }}</p>
            </div>
            <svg class="ancestor-chevron" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </button>
          <div v-if="filteredPersons.length === 0" class="empty-filter">
            未找到匹配的先祖条目
          </div>
        </div>
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
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px;
  border: 0;
  border-radius: 5px;
  background: transparent;
  color: var(--text-sub, #6b5e52);
  font-size: 11.5px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s ease;
  position: relative;
}

.panel-tab:hover {
  color: var(--text-main, #241a10);
}

.panel-tab.active {
  background: #fff;
  color: var(--text-main, #241a10);
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.08);
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
  display: grid;
  place-items: center;
  border: 0;
  border-radius: 6px;
  background: transparent;
  color: var(--text-sub, #6b5e52);
  cursor: pointer;
  transition: all 0.15s ease;
}

.panel-close-btn:hover {
  background: var(--fill-subtle, rgba(0, 0, 0, 0.06));
  color: var(--text-main, #241a10);
}

.panel-body {
  flex: 1;
  overflow-y: auto;
  padding: 14px 14px 28px;
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.section {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.section-title {
  font-size: 11.5px;
  font-weight: 700;
  color: var(--text-main, #241a10);
  letter-spacing: 0.02em;
}

.section-header-inline {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.char-count {
  font-size: 10.5px;
  color: var(--text-soft, #8f8878);
  font-variant-numeric: tabular-nums;
}

.section-hint {
  margin: 0;
  font-size: 11px;
  line-height: 1.5;
  color: var(--text-soft, #8f8878);
}

/* 模板卡片 */
.template-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.template-card {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 10px;
  border: 1px solid var(--line-subtle, rgba(122, 95, 65, 0.12));
  border-radius: 8px;
  background: #fff;
  cursor: pointer;
  transition: all 0.15s ease;
  position: relative;
  text-align: left;
}

.template-card:hover {
  border-color: var(--line-medium, rgba(122, 95, 65, 0.3));
  background: #fdfaf6;
}

.template-card.active {
  border-color: var(--color-accent, #a93426);
  background: rgba(169, 52, 38, 0.03);
  box-shadow: 0 0 0 1px var(--color-accent, #a93426);
}

.tpl-swatch {
  width: 32px;
  height: 42px;
  border: 1.5px solid;
  border-radius: 3px;
  padding: 2px;
  box-sizing: border-box;
  flex-shrink: 0;
}

.tpl-swatch-inner {
  width: 100%;
  height: 100%;
  border-radius: 1px;
  display: grid;
  place-items: center;
}

.tpl-lines {
  width: 60%;
  height: 70%;
  border-left: 1px dashed;
  border-right: 1px dashed;
  opacity: 0.6;
}

.tpl-meta {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.tpl-name {
  font-size: 12.5px;
  font-weight: 700;
  color: var(--text-main, #241a10);
}

.tpl-desc {
  font-size: 10px;
  color: var(--text-soft, #8f8878);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.check-mark {
  color: var(--color-accent, #a93426);
  flex-shrink: 0;
}

/* 字体选择 */
.font-list {
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.font-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 10px;
  border: 1px solid var(--line-subtle, rgba(122, 95, 65, 0.12));
  border-radius: 7px;
  background: #fff;
  cursor: pointer;
  transition: all 0.15s ease;
  text-align: left;
}

.font-card:hover {
  border-color: var(--line-medium, rgba(122, 95, 65, 0.3));
}

.font-card.active {
  border-color: var(--color-accent, #a93426);
  background: rgba(169, 52, 38, 0.03);
  box-shadow: 0 0 0 1px var(--color-accent, #a93426);
}

.font-info {
  display: flex;
  flex-direction: column;
  gap: 3px;
  min-width: 0;
}

.font-header {
  display: flex;
  align-items: center;
  gap: 6px;
}

.font-name {
  font-size: 13px;
  font-weight: 700;
  color: var(--text-main, #241a10);
}

.font-tag {
  font-size: 9.5px;
  color: var(--text-soft, #8f8878);
}

.font-sample {
  font-size: 11px;
  color: var(--text-sub, #6b5e52);
  letter-spacing: 0.04em;
}

/* 字号滑块 */
.font-size-display {
  font-size: 11px;
  font-weight: 700;
  color: var(--color-accent, #a93426);
  font-variant-numeric: tabular-nums;
}

.slider-row {
  display: flex;
  align-items: center;
}

.range-input {
  width: 100%;
  accent-color: var(--color-accent, #a93426);
  cursor: pointer;
}

.font-size-presets {
  display: flex;
  gap: 5px;
}

.preset-btn {
  flex: 1;
  height: 24px;
  border: 1px solid var(--line-subtle, rgba(122, 95, 65, 0.14));
  border-radius: 5px;
  background: #fff;
  color: var(--text-sub, #6b5e52);
  font-size: 10.5px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s ease;
}

.preset-btn:hover {
  border-color: var(--line-medium, rgba(122, 95, 65, 0.3));
}

.preset-btn.active {
  background: var(--color-accent, #a93426);
  color: #fff;
  border-color: var(--color-accent, #a93426);
}

/* 边距选项 */
.margin-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 6px;
}

.margin-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  padding: 8px 4px;
  border: 1px solid var(--line-subtle, rgba(122, 95, 65, 0.12));
  border-radius: 7px;
  background: #fff;
  cursor: pointer;
  transition: all 0.15s ease;
}

.margin-card:hover {
  border-color: var(--line-medium, rgba(122, 95, 65, 0.3));
}

.margin-card.active {
  border-color: var(--color-accent, #a93426);
  background: rgba(169, 52, 38, 0.04);
  box-shadow: 0 0 0 1px var(--color-accent, #a93426);
}

.margin-label {
  font-size: 11.5px;
  font-weight: 700;
  color: var(--text-main, #241a10);
}

.margin-desc {
  font-size: 9.5px;
  color: var(--text-soft, #8f8878);
}

/* 分页按钮 */
.page-break-actions {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.action-btn {
  height: 30px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  border: 1px solid var(--line-soft, rgba(122, 95, 65, 0.2));
  border-radius: 6px;
  background: #fff;
  color: var(--text-main, #241a10);
  font-size: 11.5px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s ease;
}

.action-btn:hover:not(:disabled) {
  border-color: var(--color-accent, #a93426);
  color: var(--color-accent, #a93426);
}

.action-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.action-btn--danger {
  color: #c23829;
  border-color: rgba(194, 56, 41, 0.2);
}

.action-btn--danger:hover:not(:disabled) {
  background: rgba(194, 56, 41, 0.05);
  border-color: #c23829;
}

/* ───────────────────────────────────────
   条目修撰 (Inspector)
   ─────────────────────────────────────── */
.inspector-badge-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 10px;
  border-radius: 9px;
  background: rgba(169, 52, 38, 0.05);
  border: 1px solid rgba(169, 52, 38, 0.18);
}

.person-head-left {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.person-seal-avatar {
  width: 32px;
  height: 32px;
  display: grid;
  place-items: center;
  border-radius: 8px;
  background: #a93426;
  color: #fff;
  font-family: var(--font-serif, "Noto Serif SC", serif);
  font-size: 16px;
  font-weight: 700;
  box-shadow: inset 0 0 6px rgba(0, 0, 0, 0.2);
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
  font-size: 14px;
  font-weight: 800;
  color: var(--text-main, #241a10);
}

.person-head-gen {
  font-size: 10px;
  color: var(--color-accent, #a93426);
  font-weight: 600;
}

.person-nav-group {
  display: flex;
  align-items: center;
  gap: 4px;
  flex-shrink: 0;
}

.person-nav-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  height: 24px;
  padding: 0 7px;
  border: 1px solid var(--line-soft, rgba(122, 95, 65, 0.18));
  border-radius: 5px;
  background: #fff;
  color: var(--text-sub, #6b5e52);
  font-size: 11px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s ease;
}

.person-nav-btn:hover:not(:disabled) {
  border-color: var(--color-accent, #a93426);
  color: var(--color-accent, #a93426);
}

.person-nav-btn:disabled {
  opacity: 0.35;
  cursor: not-allowed;
}

.quick-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.quick-chip {
  padding: 2px 7px;
  border: 1px solid var(--line-subtle, rgba(122, 95, 65, 0.15));
  border-radius: 4px;
  background: #fff;
  color: var(--text-sub, #6b5e52);
  font-size: 10.5px;
  cursor: pointer;
  transition: all 0.15s ease;
}

.quick-chip:hover {
  border-color: var(--color-accent, #a93426);
  color: var(--color-accent, #a93426);
  background: rgba(169, 52, 38, 0.04);
}

.inspector-input,
.inspector-textarea {
  width: 100%;
  box-sizing: border-box;
  padding: 8px 10px;
  border: 1px solid var(--line-soft, rgba(122, 95, 65, 0.2));
  border-radius: 7px;
  background: #fff;
  color: var(--text-main, #241a10);
  font-size: 12.5px;
  line-height: 1.6;
  transition: border-color 0.15s ease, box-shadow 0.15s ease;
  font-family: inherit;
}

.inspector-input:focus,
.inspector-textarea:focus {
  outline: none;
  border-color: var(--color-accent, #a93426);
  box-shadow: 0 0 0 2px rgba(169, 52, 38, 0.12);
}

.inspector-textarea {
  resize: vertical;
}

.live-repage-hint {
  display: flex;
  align-items: flex-start;
  gap: 6px;
  padding: 8px 10px;
  border-radius: 7px;
  background: rgba(122, 95, 65, 0.06);
  color: var(--text-soft, #8f8878);
  font-size: 10.5px;
  line-height: 1.5;
}

.live-repage-hint svg {
  flex-shrink: 0;
  margin-top: 1px;
}

/* ───────────────────────────────────────
   先祖世系索引视图
   ─────────────────────────────────────── */
.ancestor-index-view {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.index-head {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.index-title-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.index-title {
  font-size: 12.5px;
  font-weight: 700;
  color: var(--text-main, #241a10);
}

.index-count {
  font-size: 10.5px;
  color: var(--text-soft, #8f8878);
  font-variant-numeric: tabular-nums;
}

.search-box {
  position: relative;
  display: flex;
  align-items: center;
}

.search-icon {
  position: absolute;
  left: 9px;
  color: var(--text-soft, #8f8878);
  pointer-events: none;
}

.search-input {
  width: 100%;
  box-sizing: border-box;
  padding: 6px 10px 6px 28px;
  border: 1px solid var(--line-soft, rgba(122, 95, 65, 0.2));
  border-radius: 7px;
  background: #fff;
  color: var(--text-main, #241a10);
  font-size: 11.5px;
  outline: none;
  transition: all 0.15s ease;
}

.search-input:focus {
  border-color: var(--color-accent, #a93426);
  box-shadow: 0 0 0 2px rgba(169, 52, 38, 0.12);
}

.ancestor-card-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
  max-height: calc(100vh - 240px);
  overflow-y: auto;
  padding-right: 2px;
}

.ancestor-card {
  display: flex;
  align-items: center;
  gap: 9px;
  padding: 8px 10px;
  border: 1px solid var(--line-subtle, rgba(122, 95, 65, 0.12));
  border-radius: 8px;
  background: #fff;
  cursor: pointer;
  transition: all 0.15s ease;
  text-align: left;
  width: 100%;
  box-sizing: border-box;
}

.ancestor-card:hover {
  border-color: var(--color-accent, #a93426);
  background: rgba(169, 52, 38, 0.03);
  transform: translateY(-1px);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
}

.ancestor-avatar {
  width: 28px;
  height: 28px;
  display: grid;
  place-items: center;
  border-radius: 6px;
  background: rgba(169, 52, 38, 0.1);
  color: #a93426;
  font-family: var(--font-serif, "Noto Serif SC", serif);
  font-size: 14px;
  font-weight: 700;
  flex-shrink: 0;
}

.ancestor-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.ancestor-top {
  display: flex;
  align-items: center;
  gap: 6px;
}

.ancestor-name {
  font-size: 12.5px;
  font-weight: 700;
  color: var(--text-main, #241a10);
}

.ancestor-gen {
  font-size: 9.5px;
  padding: 1px 4px;
  border-radius: 3px;
  background: rgba(122, 95, 65, 0.08);
  color: var(--text-sub, #6b5e52);
  font-weight: 600;
}

.ancestor-snippet {
  margin: 0;
  font-size: 10.5px;
  color: var(--text-soft, #8f8878);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.ancestor-chevron {
  color: var(--text-soft, #8f8878);
  flex-shrink: 0;
  opacity: 0.6;
}

.empty-filter {
  padding: 24px 0;
  text-align: center;
  font-size: 11px;
  color: var(--text-soft, #8f8878);
}
</style>
