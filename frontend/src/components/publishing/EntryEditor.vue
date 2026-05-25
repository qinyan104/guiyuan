<script setup lang="ts">
import { computed, ref, watch, onMounted, onUnmounted } from "vue"
import type { LineagePage } from "../../types/publishing"

const props = defineProps<{
  pageData: LineagePage | null
  pageNumber: number
  totalPages: number
  open: boolean
  templateName?: string
  statusText?: string
  relayouting?: boolean
}>()

const emit = defineEmits<{
  close: []
  updateEntry: [index: number, text: string]
  moveEntry: [fromIndex: number, toIndex: number]
  deleteEntry: [index: number]
  moveToPage: [entryIndex: number, targetPage: number]
  saveAndRelayout: []
}>()

// --- editing ---
const editingIndex = ref<number | null>(null)
const editText = ref("")

const entryCount = computed(() => props.pageData?.entries?.length ?? 0)

watch(
  () => props.pageNumber,
  () => { editingIndex.value = null },
)

function startEdit(index: number, text: string) {
  editingIndex.value = index
  editText.value = text
}

function confirmEdit() {
  if (editingIndex.value !== null) {
    const oldText = props.pageData?.entries?.[editingIndex.value]?.formattedText ?? ""
    const newText = editText.value
    if (oldText !== newText) {
      pushHistory(editingIndex.value, oldText, newText)
    }
    emit("updateEntry", editingIndex.value, newText)
    editingIndex.value = null
  }
}

function cancelEdit() {
  editingIndex.value = null
}

// --- generation grouping ---
const generationGroups = computed(() => {
  const entries = props.pageData?.entries ?? []
  const groups: { generation: number; entries: typeof entries }[] = []
  const seen = new Map<number, number>()
  for (const entry of entries) {
    const gen = entry.generation
    if (seen.has(gen)) {
      groups[seen.get(gen)!].entries.push(entry)
    } else {
      seen.set(gen, groups.length)
      groups.push({ generation: gen, entries: [entry] })
    }
  }
  return groups
})

const collapsedGroups = ref<Set<number>>(new Set())

function toggleGroup(gen: number) {
  if (collapsedGroups.value.has(gen)) {
    collapsedGroups.value.delete(gen)
  } else {
    collapsedGroups.value.add(gen)
  }
}

// --- drag sorting ---
const dragEntryIndex = ref<number | null>(null)
const dragOverEntryIndex = ref<number | null>(null)

function handleDragStart(index: number) {
  dragEntryIndex.value = index
}

function handleDragOver(e: DragEvent, index: number) {
  e.preventDefault()
  dragOverEntryIndex.value = index
}

function handleDrop(index: number) {
  if (dragEntryIndex.value !== null && dragEntryIndex.value !== index) {
    emit("moveEntry", dragEntryIndex.value, index)
  }
  dragEntryIndex.value = null
  dragOverEntryIndex.value = null
}

function handleDragEnd() {
  dragEntryIndex.value = null
  dragOverEntryIndex.value = null
}

// --- batch selection ---
const selectedEntries = ref<Set<number>>(new Set())
const allSelected = computed(() => {
  const total = props.pageData?.entries?.length ?? 0
  return total > 0 && selectedEntries.value.size === total
})

function toggleSelectAll() {
  const total = props.pageData?.entries?.length ?? 0
  if (allSelected.value) {
    selectedEntries.value.clear()
  } else {
    for (let i = 0; i < total; i++) selectedEntries.value.add(i)
  }
}

function toggleSelect(index: number) {
  if (selectedEntries.value.has(index)) {
    selectedEntries.value.delete(index)
  } else {
    selectedEntries.value.add(index)
  }
}

function batchDelete() {
  const indices = [...selectedEntries.value].sort((a, b) => b - a)
  for (const i of indices) emit("deleteEntry", i)
  selectedEntries.value.clear()
}

// --- move popover ---
const moveEntryIndex = ref<number | null>(null)

function openMovePopover(index: number) {
  moveEntryIndex.value = index
}

function confirmMoveToPage(targetPageNumber: number) {
  if (moveEntryIndex.value !== null) {
    emit("moveToPage", moveEntryIndex.value, targetPageNumber - 1)
    moveEntryIndex.value = null
  }
}

// --- undo / redo ---
interface EditRecord { entryIndex: number; oldText: string; newText: string }
const editHistory = ref<EditRecord[]>([])
const historyIndex = ref(-1)
const undoNotice = ref("")

let undoNoticeTimer: ReturnType<typeof setTimeout> | null = null

function pushHistory(index: number, oldText: string, newText: string) {
  editHistory.value = editHistory.value.slice(0, historyIndex.value + 1)
  editHistory.value.push({ entryIndex: index, oldText, newText })
  if (editHistory.value.length > 20) editHistory.value.shift()
  historyIndex.value = editHistory.value.length - 1
}

function undo() {
  if (historyIndex.value < 0) return
  const record = editHistory.value[historyIndex.value]
  const entries = props.pageData?.entries
  if (entries && entries[record.entryIndex]) {
    emit("updateEntry", record.entryIndex, record.oldText)
  }
  historyIndex.value--
  showUndoNotice()
}

function redo() {
  if (historyIndex.value >= editHistory.value.length - 1) return
  historyIndex.value++
  const record = editHistory.value[historyIndex.value]
  const entries = props.pageData?.entries
  if (entries && entries[record.entryIndex]) {
    emit("updateEntry", record.entryIndex, record.newText)
  }
  showUndoNotice()
}

function showUndoNotice() {
  undoNotice.value = "已撤销"
  if (undoNoticeTimer) clearTimeout(undoNoticeTimer)
  undoNoticeTimer = setTimeout(() => { undoNotice.value = ""; undoNoticeTimer = null }, 2000)
}

function handleKeydown(e: KeyboardEvent) {
  if (!props.open || editingIndex.value !== null) return
  if (e.ctrlKey && e.key === "z" && !e.shiftKey) { e.preventDefault(); undo() }
  else if (e.ctrlKey && (e.key === "Z" || (e.key === "z" && e.shiftKey))) { e.preventDefault(); redo() }
}

onMounted(() => window.addEventListener("keydown", handleKeydown))
onUnmounted(() => window.removeEventListener("keydown", handleKeydown))
</script>

<template>
  <Transition name="panel-slide">
    <div v-if="open" class="entry-editor">
      <div class="editor-header">
        <div>
          <p class="editor-eyebrow">内容检查器</p>
          <h3 class="editor-title">第 {{ pageNumber }} 页 · {{ entryCount }} 条</h3>
          <p class="editor-meta">{{ templateName || '默认模板' }} · {{ statusText || '已同步' }}</p>
        </div>
        <div class="editor-header-actions">
          <span class="shortcut-hint">Ctrl+Enter 保存 · Ctrl+Z 撤销</span>
          <button class="editor-close" @click="emit('close')">×</button>
        </div>
      </div>

      <!-- undo notice -->
      <div v-if="undoNotice" class="undo-indicator">{{ undoNotice }}</div>

      <!-- empty -->
      <div v-if="!pageData?.entries?.length" class="editor-empty">
        <p>本页暂无条目</p>
        <p class="editor-hint">先执行“自动排版”，再逐条检查内容。</p>
      </div>

      <template v-else>
        <!-- batch bar -->
        <div v-if="selectedEntries.size > 0" class="batch-bar">
          <span>{{ selectedEntries.size }} 条已选</span>
          <button class="btn-sm btn-danger" @click="batchDelete">删除选中</button>
        </div>

        <!-- select all header -->
        <div v-else class="batch-header">
          <label class="select-all">
            <input type="checkbox" :checked="allSelected" @change="toggleSelectAll" />
            全选
          </label>
        </div>

        <!-- entry list with generation groups -->
        <div class="editor-list">
          <template v-for="group in generationGroups" :key="group.generation">
            <button class="gen-header" @click="toggleGroup(group.generation)">
              <span class="gen-arrow">{{ collapsedGroups.has(group.generation) ? '▸' : '▾' }}</span>
              <span class="gen-label">第{{ group.generation }} 世</span>
              <span class="gen-count">{{ group.entries.length }} 条</span>
            </button>

            <template v-if="!collapsedGroups.has(group.generation)">
              <div
                v-for="(entry, gi) in group.entries"
                :key="entry.personId"
                :class="[
                  'entry-card',
                  { 'entry-card--dragging': dragEntryIndex === gi,
                    'entry-card--drag-over': dragOverEntryIndex === gi && dragOverEntryIndex !== dragEntryIndex,
                    'entry-card--selected': selectedEntries.has(gi)
                  }
                ]"
                draggable="true"
                @dragstart="handleDragStart(gi)"
                @dragover="(e) => handleDragOver(e, gi)"
                @drop="handleDrop(gi)"
                @dragend="handleDragEnd"
              >
                <div class="entry-grip" title="拖拽排序">⠅</div>
                <label class="entry-check" @click.stop>
                  <input
                    type="checkbox"
                    :checked="selectedEntries.has(gi)"
                    @change="toggleSelect(gi)"
                  />
                </label>

                <div class="entry-body">
                  <div class="entry-head">
                    <span class="entry-index">{{ gi + 1 }}</span>
                    <span class="entry-name">{{ entry.personName }}</span>
                    <span class="entry-gender" :class="entry.gender === 'male' ? 'gender-m' : 'gender-f'">
                      {{ entry.gender === 'male' ? '男' : entry.gender === 'female' ? '女' : '' }}
                    </span>
                    <div class="entry-head-actions">
                      <button class="btn-icon" @click="startEdit(gi, entry.formattedText)" title="编辑">✏️</button>
                      <button class="btn-icon" @click="openMovePopover(gi)" title="移动到...">↗</button>
                      <button class="btn-icon btn-icon--danger" @click="emit('deleteEntry', gi)" title="删除">🗑️</button>
                    </div>
                  </div>

                  <template v-if="editingIndex === gi">
                    <textarea
                      v-model="editText"
                      class="entry-textarea"
                      rows="4"
                      @keyup.ctrl.enter="confirmEdit"
                    />
                    <div class="entry-edit-actions">
                      <button class="btn-sm btn-confirm" @click="confirmEdit">确认</button>
                      <button class="btn-sm btn-cancel" @click="cancelEdit">取消</button>
                    </div>
                  </template>

                  <template v-else>
                    <p class="entry-text" @dblclick="startEdit(gi, entry.formattedText)">
                      {{ entry.formattedText }}
                    </p>
                  </template>
                </div>

                <!-- move popover -->
                <div v-if="moveEntryIndex === gi" class="move-popover">
                  <p class="move-popover-title">移动到第几页？</p>
                  <div class="move-popover-grid">
                    <button
                      v-for="p in totalPages"
                      :key="p"
                      :class="['move-page-btn', { 'move-page-btn--current': p === pageNumber }]"
                      :disabled="p === pageNumber"
                      @click="confirmMoveToPage(p)"
                    >
                      <span class="move-page-num">{{ p }}</span>
                    </button>
                  </div>
                  <button class="move-popover-cancel" @click="moveEntryIndex = null">取消</button>
                </div>
                <div v-if="moveEntryIndex === gi" class="move-popover-backdrop" @click="moveEntryIndex = null" />
              </div>
            </template>
          </template>
        </div>
      </template>

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
  background: var(--color-neutral-1);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  flex-shrink: 0;
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

.batch-bar .btn-danger { margin-left: auto; }

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

/* entry list */
.editor-list {
  flex: 1;
  overflow-y: auto;
  padding: 4px 12px 8px;
}

/* entry card */
.entry-card {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  background: var(--color-neutral-1);
  border: 1px solid var(--color-card-stroke);
  border-radius: var(--radius-lg);
  padding: 12px 14px;
  margin-bottom: 8px;
  box-shadow: var(--shadow-whisper);
  transition: border-color var(--duration-fast) var(--ease-breath),
              box-shadow var(--duration-fast) var(--ease-breath);
  position: relative;
}

.entry-card:hover {
  border-color: var(--color-accent);
  box-shadow: 0 8px 24px rgba(36, 35, 31, 0.06);
}

.entry-card--selected {
  border-color: var(--color-accent);
  background: var(--color-accent-muted);
}

.entry-card--dragging { opacity: 0.5; }
.entry-card--drag-over { border-top: 2px solid var(--color-accent); }

.entry-body { flex: 1; min-width: 0; }

/* grip & check */
.entry-grip {
  flex-shrink: 0;
  width: 20px;
  cursor: grab;
  color: var(--color-neutral-5);
  font-size: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  user-select: none;
  opacity: 0;
  transition: opacity var(--duration-fast) var(--ease-breath);
}

.entry-card:hover .entry-grip,
.entry-card--selected .entry-grip { opacity: 1; }

.entry-check {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  opacity: 0;
  transition: opacity var(--duration-fast) var(--ease-breath);
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

/* icon buttons */
.btn-icon {
  width: 26px;
  height: 26px;
  border: none;
  background: transparent;
  border-radius: var(--radius-sm);
  cursor: pointer;
  font-size: 13px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--color-neutral-5);
  transition: all var(--duration-fast) var(--ease-breath);
}

.btn-icon:hover { background: var(--color-neutral-2); color: var(--color-neutral-9); }
.btn-icon--danger:hover { background: var(--color-accent-muted); color: var(--color-accent); }

/* text & textarea */
.entry-text {
  font-size: 12px;
  color: var(--color-neutral-8);
  line-height: 1.6;
  margin: 0;
  cursor: pointer;
  word-break: break-all;
}

.entry-text:hover { color: var(--color-accent); }

.entry-textarea {
  width: 100%;
  box-sizing: border-box;
  padding: 8px 10px;
  border: 1px solid var(--color-accent);
  border-radius: var(--radius-md);
  font-size: 12px;
  line-height: 1.6;
  font-family: inherit;
  resize: vertical;
  outline: none;
  background: var(--color-neutral-1);
  color: var(--color-neutral-9);
}

.entry-textarea:focus {
  border-color: var(--color-accent);
  box-shadow: 0 0 0 3px var(--color-accent-muted);
}

.entry-edit-actions {
  display: flex;
  gap: 6px;
  margin-top: 6px;
}

/* small buttons */
.btn-sm {
  padding: 3px 10px;
  border: 1px solid var(--color-card-stroke);
  background: var(--color-neutral-1);
  color: var(--color-neutral-6);
  border-radius: var(--radius-md);
  font-size: 11px;
  cursor: pointer;
  transition: all var(--duration-fast) var(--ease-breath);
}

.btn-sm:hover:not(:disabled) { background: var(--color-neutral-2); color: var(--color-neutral-9); }
.btn-sm:disabled { opacity: 0.3; cursor: default; }

.btn-confirm {
  background: var(--color-accent);
  color: #fff;
  border-color: var(--color-accent);
}

.btn-danger:hover {
  background: var(--color-accent-muted);
  color: var(--color-accent);
  border-color: var(--color-accent);
}

/* move popover */
.move-popover {
  position: absolute;
  right: 20px;
  top: 48px;
  z-index: 20;
  background: var(--color-neutral-1);
  border: 1px solid var(--color-card-stroke);
  border-radius: var(--radius-lg);
  padding: 14px;
  box-shadow: 0 16px 48px rgba(36, 35, 31, 0.14);
  backdrop-filter: blur(24px) saturate(140%);
  -webkit-backdrop-filter: blur(24px) saturate(140%);
  width: 180px;
}

.move-popover-title {
  font-size: 12px;
  color: var(--color-neutral-7);
  margin: 0 0 10px;
  font-weight: 500;
}

.move-popover-grid {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  gap: 6px;
  margin-bottom: 10px;
}

.move-page-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 10px 4px;
  border: 1px solid var(--color-card-stroke);
  border-radius: var(--radius-md);
  background: var(--color-neutral-1);
  cursor: pointer;
  transition: all var(--duration-fast) var(--ease-breath);
}

.move-page-btn:hover:not(:disabled) {
  border-color: var(--color-accent);
  background: var(--color-accent-muted);
}

.move-page-btn--current,
.move-page-btn:disabled { opacity: 0.35; cursor: default; }

.move-page-num { font-size: 16px; font-weight: 500; color: var(--color-neutral-9); }

.move-popover-cancel {
  display: block;
  width: 100%;
  padding: 6px;
  border: 1px solid var(--color-card-stroke);
  border-radius: var(--radius-md);
  background: var(--color-neutral-1);
  color: var(--color-neutral-6);
  font-size: 11px;
  cursor: pointer;
}

.move-popover-cancel:hover { background: var(--color-neutral-2); }
.move-popover-backdrop { position: fixed; inset: 0; z-index: 19; }

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
</style>
