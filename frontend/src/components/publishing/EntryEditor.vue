<script setup lang="ts">
import { computed, ref, watch, onMounted, onUnmounted, nextTick } from "vue"
import type { LineagePage } from "../../types/publishing"

const props = defineProps<{
  pageData: LineagePage | null
  pageNumber: number
  totalPages: number
  open: boolean
  templateName?: string
  statusText?: string
  relayouting?: boolean
  /** Canvas 点击条目 → 高亮对应卡片 */
  highlightedPersonId?: string | null
  /** 全部页面（跨页搜索用） */
  allPages?: LineagePage[]
  /** 设置 */
  sortGenFirst?: boolean
  showSpouses?: boolean
  hideLocation?: boolean
  cnNumeral?: boolean
}>()

const emit = defineEmits<{
  close: []
  updateEntry: [index: number, text: string]
  moveEntry: [fromIndex: number, toIndex: number]
  deleteEntry: [index: number]
  moveToPage: [entryIndex: number, targetPage: number]
  saveAndRelayout: []
  /** 跨页搜索结果点击 → 跳转到目标页面 */
  navigateToEntry: [pageIndex: number, personId: string]
  /** 文本编辑：更新指定页面的第 N 条条目 */
  updateEntryAt: [pageIndex: number, entryIndex: number, text: string]
  /** 在空白页添加新条目 */
  addEntry: [pageIndex: number, personName: string, formattedText: string]
  /** 设置变更 */
  updateSetting: [key: string, value: boolean]
  /** 悬停高亮 */
  hoverEntry: [personId: string | null]
}>()

/** 中文数字 */
const CN_NUMS = ["", "一", "二", "三", "四", "五", "六", "七", "八", "九", "十",
  "十一", "十二", "十三", "十四", "十五", "十六", "十七", "十八", "十九", "二十"]
function cnGen(g: number): string { return CN_NUMS[g] || `${g}` }

/** 按世代合并全部条目为连续文本 */
const lineageDocument = computed(() => {
  const pages = props.allPages || (props.pageData ? [props.pageData] : [])
  const genMap = new Map<number, { entryIndex: number; pageIndex: number; personId: string; text: string }[]>()
  for (let pi = 0; pi < pages.length; pi++) {
    const page = pages[pi]
    for (let ei = 0; ei < (page.entries || []).length; ei++) {
      const entry = page.entries![ei]
      if (!genMap.has(entry.generation)) genMap.set(entry.generation, [])
      genMap.get(entry.generation)!.push({ entryIndex: ei, pageIndex: pi, personId: entry.personId, text: entry.formattedText })
    }
  }
  const gens = [...genMap.keys()].sort((a, b) => a - b)
  return gens.map(g => ({
    generation: g,
    label: `第${cnGen(g + 1)}世`,
    items: genMap.get(g)!,
  }))
})



// --- highlight sync from Canvas ---
const highlightedEntryIndex = ref<number | null>(null)
const editorListRef = ref<HTMLElement | null>(null)

watch(() => props.highlightedPersonId, (personId) => {
  highlightedEntryIndex.value = personId
    ? props.pageData?.entries?.findIndex(e => e.personId === personId) ?? null
    : null
})

// ── 撤销 ──
const undoNotice = ref("")
let undoNoticeTimer: ReturnType<typeof setTimeout> | null = null

/** 去抖输入：200ms 无输入后触发更新 */
const inputTimers = new Map<string, ReturnType<typeof setTimeout>>()
/** 在最后聚焦的 textarea 光标处插入控制字符 */
let lastActiveTA: HTMLTextAreaElement | null = null
function trackFocus(e: Event) { lastActiveTA = e.target as HTMLTextAreaElement }
function insertBreak(ch: string) {
  if (!lastActiveTA) return
  const ta = lastActiveTA
  const start = ta.selectionStart
  ta.value = ta.value.slice(0, start) + ch + ta.value.slice(ta.selectionEnd)
  ta.selectionStart = ta.selectionEnd = start + 1
  ta.dispatchEvent(new Event("input", { bubbles: true }))
  ta.focus()
}

function addNewEntry(e: KeyboardEvent) {
  const ta = e.target as HTMLTextAreaElement
  const text = ta.value.trim()
  if (!text) return
  // 用第一行作为人名，其余作为内容
  const lines = text.split("\n")
  const name = lines[0].slice(0, 20)
  emit("addEntry", props.pageNumber - 1, name, text)
  ta.value = ""
}

function onEntryInput(pi: number, ei: number, e: Event) {
  const text = (e.target as HTMLTextAreaElement).value
  const key = `${pi}-${ei}`
  if (inputTimers.has(key)) clearTimeout(inputTimers.get(key))
  inputTimers.set(key, setTimeout(() => {
    emit("updateEntryAt", pi, ei, text)
    inputTimers.delete(key)
  }, 200))
}

function showUndoNotice() {
  undoNotice.value = "已撤销"
  if (undoNoticeTimer) clearTimeout(undoNoticeTimer)
  undoNoticeTimer = setTimeout(() => { undoNotice.value = ""; undoNoticeTimer = null }, 2000)
}
</script>

<template>
  <Transition name="panel-slide">
    <div v-if="open" class="entry-editor">
      <div class="editor-header">
        <div>
          <p class="editor-eyebrow">内容检查器</p>
          <h3 class="editor-title">第 {{ pageNumber }} / {{ totalPages }} 页</h3>
          <p class="editor-meta">{{ templateName || '默认模板' }} · {{ statusText || '已同步' }}</p>
        </div>
        <div class="editor-header-actions">
          <span class="shortcut-hint">Ctrl+Enter 保存 · Ctrl+Z 撤销</span>
          <button class="editor-close" @click="emit('close')">×</button>
        </div>
      </div>

      <!-- undo notice -->
      <div v-if="undoNotice" class="undo-indicator">{{ undoNotice }}</div>

      <!-- 设置栏 -->
      <div class="settings-bar">
        <span class="setting-label">编排</span>
        <button :class="['setting-btn', { on: sortGenFirst }]" @click="$emit('updateSetting', 'sortGenFirst', !sortGenFirst)">按世代</button>
        <span class="setting-label">女</span>
        <button :class="['setting-btn', { on: showSpouses }]" @click="$emit('updateSetting', 'showSpouses', !showSpouses)">独立</button>
        <span class="setting-label">地</span>
        <button :class="['setting-btn', { on: !hideLocation }]" @click="$emit('updateSetting', 'hideLocation', !hideLocation)">隐藏</button>
        <span class="setting-label">数</span>
        <button :class="['setting-btn', { on: cnNumeral }]" @click="$emit('updateSetting', 'cnNumeral', !cnNumeral)">汉字</button>
        <button class="setting-btn" @click="insertBreak('\u00B6')" title="在光标处插入换列符">换列</button>
        <button class="setting-btn" @click="insertBreak('\u00A7')" title="在光标处插入换页符">换页</button>
      </div>

      <!-- 空白页添加条目 -->
      <div v-if="pageData && pageData.entries.length === 0" class="empty-page-add">
        <p class="empty-hint">此页暂无内容</p>
        <textarea
          class="new-entry-input"
          placeholder="在此输入条目内容，按 Ctrl+Enter 添加…"
          rows="4"
          @keydown.ctrl.enter="addNewEntry($event)"
        ></textarea>
      </div>

      <!-- 文本视图（连续世系录，可编辑） -->
      <div v-if="allPages && pageData && pageData.entries.length > 0" class="text-document">
        <template v-for="gen in lineageDocument" :key="gen.generation">
          <h3 class="text-gen-header">{{ gen.label }}</h3>
          <textarea
            v-for="(item, i) in gen.items"
            :key="i"
            class="text-entry-edit"
            :value="item.text"
            rows="3"
            @focus="trackFocus"
            @mouseenter="emit('hoverEntry', item.personId)"
            @mouseleave="emit('hoverEntry', null)"
            @input="onEntryInput(item.pageIndex, item.entryIndex, $event)"
          ></textarea>
        </template>
      </div>

            <div class="editor-footer" v-if="pageData?.entries?.length">
        <button class="btn-save-relayout" :disabled="relayouting" @click="emit('saveAndRelayout')">
          {{ relayouting ? '正在保存...' : '保存并重新排版' }}
        </button>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.entry-editor {
  width: 100%;
  height: 100%;
  background: var(--color-neutral-1);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.editor-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  padding: 14px 16px 10px;
  border-bottom: 1px solid var(--color-card-stroke);
}

.editor-header-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

.shortcut-hint {
  font-size: 10px;
  color: var(--color-neutral-5);
  padding: 2px 6px;
  border-radius: var(--radius-sm);
  background: var(--color-neutral-2);
  display: none;
}

.editor-eyebrow {
  margin: 0 0 1px;
  font-family: var(--font-sans);
  font-size: 11px;
  font-weight: 600;
  color: var(--color-accent);
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

.editor-title {
  margin: 0;
  font-family: var(--font-serif);
  font-size: 15px;
  font-weight: 600;
  color: var(--color-neutral-10);
}

.editor-meta {
  margin: 3px 0 0;
  font-size: 11px;
  color: var(--color-neutral-5);
}



.editor-close {
  width: 28px;
  height: 28px;
  border: none;
  background: transparent;
  color: var(--color-neutral-6);
  font-size: 20px;
  cursor: pointer;
  border-radius: var(--radius-sm);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all var(--duration-fast) var(--ease-breath);
}

.editor-close:hover {
  background: var(--color-neutral-3);
  color: var(--color-neutral-10);
}





/* undo notice */
.undo-indicator {
  padding: 4px 14px;
  background: var(--color-accent-muted);
  color: var(--color-accent);
  font-size: 11px;
  text-align: center;
  border-bottom: 1px solid var(--color-card-stroke);
}

/* empty */
.editor-empty {
  padding: 40px 20px;
  text-align: center;
  color: var(--color-neutral-7);
  font-size: 13px;
}

.editor-hint {
  font-size: 11px;
  color: var(--color-neutral-5);
  margin-top: 4px;
}

/* batch */
.batch-bar {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 16px;
  background: var(--color-accent-muted);
  border-bottom: 1px solid var(--color-accent);
  font-size: 12px;
  color: var(--color-accent);
  font-weight: 500;
}

.batch-bar 

.batch-header {
  padding: 6px 16px;
  border-bottom: 1px solid var(--color-card-stroke);
}

.select-all {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 11px;
  color: var(--color-neutral-6);
  cursor: pointer;
}

.select-all input,
.entry-check input {
  accent-color: var(--color-accent);
  width: 15px;
  height: 15px;
}

/* generation headers */
.gen-header {
  display: flex;
  align-items: center;
  gap: 6px;
  width: 100%;
  padding: 8px 16px 6px;
  background: transparent;
  border: none;
  border-bottom: 1px solid var(--color-card-stroke);
  cursor: pointer;
  font-size: 12px;
  color: var(--color-neutral-7);
  transition: color var(--duration-fast) var(--ease-breath);
}

.gen-header:hover { color: var(--color-neutral-9); }

.gen-arrow { font-size: 10px; width: 12px; text-align: center; }
.gen-label { font-weight: 500; color: var(--color-neutral-8); }
.gen-count { margin-left: auto; font-size: 10px; color: var(--color-neutral-5); }



@keyframes highlight-pulse {
  0% { box-shadow: 0 0 0 0px var(--color-accent), 0 8px 24px rgba(196, 58, 49, 0.06); }
  50% { box-shadow: 0 0 0 4px var(--color-accent), 0 8px 24px rgba(196, 58, 49, 0.18); }
  100% { box-shadow: 0 0 0 2px var(--color-accent), 0 8px 24px rgba(196, 58, 49, 0.12); }
}



.entry-card:hover .entry-check,
.entry-card--selected .entry-check { opacity: 1; }

/* entry head */
.entry-head {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 6px;
}

.entry-index { font-size: 11px; color: var(--color-neutral-5); min-width: 18px; }
.entry-name { font-size: 13px; font-weight: 500; color: var(--color-neutral-9); }

.entry-gender {
  font-size: 10px;
  padding: 1px 5px;
  border-radius: 3px;
}

.gender-m { background: var(--color-male-muted); color: var(--color-male); }
.gender-f { background: var(--color-female-muted); color: var(--color-female); }

.entry-head-actions {
  display: flex;
  align-items: center;
  gap: 2px;
  margin-left: auto;
  opacity: 0;
  transition: opacity var(--duration-fast) var(--ease-breath);
}

.entry-card:hover .entry-head-actions,
.entry-card--selected .entry-head-actions { opacity: 1; }





.entry-edit-actions {
  display: flex;
  gap: 6px;
  margin-top: 6px;
}




.btn-sm:disabled { opacity: 0.3; cursor: default; }



.btn-danger:hover {
  background: var(--color-accent-muted);
  color: var(--color-accent);
  border-color: var(--color-accent);
}



/* ── 设置栏 ── */
.settings-bar {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 6px 12px;
  border-bottom: 1px solid var(--color-card-stroke);
  flex-shrink: 0;
}
.setting-label {
  font-size: 10px;
  color: var(--color-neutral-5);
  margin-right: 2px;
}
.setting-btn {
  padding: 2px 8px;
  border: 1px solid var(--color-card-stroke);
  border-radius: 4px;
  background: var(--color-neutral-1);
  color: var(--color-neutral-6);
  font-size: 10px;
  cursor: pointer;
  transition: all 0.12s;
}
.setting-btn.on {
  background: var(--color-accent);
  color: #fff;
  border-color: var(--color-accent);
}

/* ── 文本视图（世系录）── */
.text-document {
  flex: 1;
  overflow-y: auto;
  padding: 16px 20px;
}

.text-gen-header {
  margin: 24px 0 12px;
  padding-bottom: 6px;
  border-bottom: 1px solid var(--color-card-stroke);
  font-family: "Noto Serif SC", "SimSun", serif;
  font-size: 16px;
  font-weight: 600;
  color: var(--color-accent);
  text-align: center;
  letter-spacing: 0.3em;
}

.text-gen-header:first-child { margin-top: 0; }

.text-entry-edit {
  display: block;
  width: 100%;
  box-sizing: border-box;
  margin-bottom: 10px;
  padding: 8px 12px;
  border: 1px solid transparent;
  border-radius: 6px;
  font-family: "Noto Serif SC", "SimSun", "STSong", serif;
  font-size: 14px;
  line-height: 2;
  color: var(--color-neutral-9);
  background: transparent;
  resize: vertical;
  outline: none;
  transition: border-color 0.15s, background 0.15s;
}
.text-entry-edit:hover { border-color: var(--color-card-stroke); background: var(--color-neutral-1); }
.text-entry-edit:focus { border-color: var(--color-accent); background: var(--color-neutral-1); box-shadow: 0 0 0 2px var(--color-accent-muted); }

/* footer */
.editor-footer {
  padding: 12px 16px;
  border-top: 1px solid var(--color-card-stroke);
}

.btn-save-relayout {
  width: 100%;
  padding: 9px 0;
  background: var(--color-accent);
  color: #fff;
  border: none;
  border-radius: var(--radius-md);
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: opacity var(--duration-fast) var(--ease-breath);
}

.btn-save-relayout:disabled { opacity: 0.7; cursor: default; }
.btn-save-relayout:hover:not(:disabled) { opacity: 0.9; }

/* transitions */
.panel-slide-enter-active,
.panel-slide-leave-active {
  transition: margin 0.2s ease, opacity 0.2s ease;
}

.panel-slide-enter-from,
.panel-slide-leave-to { margin-right: -360px; opacity: 0; }
.editor-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  padding: 16px 20px 12px;
  border-bottom: 1px solid var(--color-card-stroke);
}
.editor-header-actions { display: flex; align-items: center; gap: 8px; }
.shortcut-hint { font-size: 10px; color: var(--color-neutral-5); padding: 2px 8px; border-radius: var(--radius-sm); background: var(--color-neutral-2); }
.editor-eyebrow { margin: 0 0 2px; font-family: var(--font-sans); font-size: 10px; font-weight: 600; color: var(--color-accent); letter-spacing: 0.15em; text-transform: uppercase; }
.editor-title { margin: 0; font-family: var(--font-serif); font-size: 16px; font-weight: 600; color: var(--color-neutral-10); }
.editor-meta { margin: 2px 0 0; font-size: 11px; color: var(--color-neutral-5); }
.editor-close { width: 28px; height: 28px; border: 1px solid var(--color-card-stroke); border-radius: var(--radius-sm); background: var(--color-neutral-1); color: var(--color-neutral-6); font-size: 16px; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: all 0.14s ease; }
.editor-close:hover { background: var(--color-neutral-3); color: var(--color-neutral-10); }
.editor-empty { padding: 40px 20px; text-align: center; color: var(--color-neutral-7); font-size: 13px; }
.editor-hint { font-size: 11px; color: var(--color-neutral-5); margin-top: 4px; }
.undo-indicator { padding: 4px 14px; background: var(--color-accent-muted); color: var(--color-accent); font-size: 11px; text-align: center; border-bottom: 1px solid var(--color-card-stroke); }
.editor-footer { padding: 12px 20px; border-top: 1px solid var(--color-card-stroke); }
.btn-save-relayout { width: 100%; padding: 9px 0; background: var(--color-accent); color: #fff; border: none; border-radius: var(--radius-md); font-size: 13px; font-weight: 500; cursor: pointer; transition: opacity 0.14s; }
.btn-save-relayout:disabled { opacity: 0.7; cursor: default; }
.btn-save-relayout:hover:not(:disabled) { opacity: 0.9; }
.empty-page-add { padding: 24px 20px; flex: 1; }
.empty-hint { text-align: center; color: var(--color-neutral-5); font-size: 13px; margin-bottom: 16px; }
.new-entry-input { width: 100%; box-sizing: border-box; padding: 10px 12px; border: 1px solid var(--color-card-stroke); border-radius: var(--radius-md); font-family: var(--font-serif); font-size: 14px; line-height: 2; color: var(--color-neutral-9); background: var(--color-neutral-1); resize: vertical; outline: none; }
.new-entry-input:focus { border-color: var(--color-accent); }
</style>
