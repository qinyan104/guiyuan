<script setup lang="ts">
import type { BookLayout } from "../../types/bookDocument"

defineProps<{
  title: string
  layout: BookLayout
  saving: boolean
  exporting: boolean
  hasDocument: boolean
  viewMode: "single" | "spread"
  zoom: number
  canInsertPageBreak: boolean
  canDeletePageBreak: boolean
  hasUnsavedChanges: boolean
  layoutOpen?: boolean
}>()

const emit = defineEmits<{
  back: []
  generate: []
  save: []
  exportPdf: []
  insertPageBreak: []
  deletePageBreak: []
  updateLayout: [layout: BookLayout]
  updateViewMode: [viewMode: "single" | "spread"]
  zoomIn: []
  zoomOut: []
  resetZoom: []
  toggleLayout: []
}>()
</script>

<template>
  <header class="book-toolbar">
    <!-- Left: Back & Book Identity -->
    <div class="toolbar-group toolbar-group--left">
      <button class="icon-btn" type="button" title="返回画布工作台" @click="emit('back')">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
          <line x1="19" y1="12" x2="5" y2="12" />
          <polyline points="12 19 5 12 12 5" />
        </svg>
      </button>
      <div class="book-meta">
        <span class="book-badge">古籍线装</span>
        <span class="title" :title="title">{{ title || "古籍族谱" }}</span>
      </div>
      <span
        v-if="hasDocument"
        role="status"
        aria-live="polite"
        :class="['save-state', { dirty: hasUnsavedChanges }]"
      >
        <span class="save-state__dot"></span>
        {{ hasUnsavedChanges ? "未保存" : "已保存" }}
      </span>
    </div>

    <!-- Center: View Mode & Zoom -->
    <div v-if="hasDocument" class="toolbar-group toolbar-group--center">
      <!-- View mode switch -->
      <div class="pill-group">
        <button
          type="button"
          :class="['pill-btn', { active: viewMode === 'spread' }]"
          title="对开双页展开阅览"
          @click="emit('updateViewMode', 'spread')"
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
            <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
          </svg>
          双页
        </button>
        <button
          type="button"
          :class="['pill-btn', { active: viewMode === 'single' }]"
          title="单页顺序阅览"
          @click="emit('updateViewMode', 'single')"
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <rect x="5" y="3" width="14" height="18" rx="2" />
          </svg>
          单页
        </button>
      </div>

      <div class="divider"></div>

      <!-- Zoom controls -->
      <div class="zoom-group">
        <button type="button" class="zoom-btn" title="缩小 (Ctrl+-)" @click="emit('zoomOut')">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
        </button>
        <span class="zoom-val" title="点击重置缩放 (Ctrl+0)" @click="emit('resetZoom')">{{ Math.round(zoom * 100) }}%</span>
        <button type="button" class="zoom-btn" title="放大 (Ctrl++)" @click="emit('zoomIn')">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
        </button>
      </div>
    </div>

    <!-- Right: Actions -->
    <div class="toolbar-group toolbar-group--right">
      <!-- Layout Drawer Toggle -->
      <button
        v-if="hasDocument"
        type="button"
        :class="['tool-btn', { 'tool-btn--active': layoutOpen }]"
        title="版式规制与条目修撰 (Esc)"
        @click="emit('toggleLayout')"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <line x1="4" y1="21" x2="4" y2="14" />
          <line x1="4" y1="10" x2="4" y2="3" />
          <line x1="12" y1="21" x2="12" y2="12" />
          <line x1="12" y1="8" x2="12" y2="3" />
          <line x1="20" y1="21" x2="20" y2="16" />
          <line x1="20" y1="12" x2="20" y2="3" />
          <line x1="1" y1="14" x2="7" y2="14" />
          <line x1="9" y1="8" x2="15" y2="8" />
          <line x1="17" y1="16" x2="23" y2="16" />
        </svg>
        版式设计
      </button>

      <!-- Re-generate / Generate button -->
      <button
        type="button"
        class="tool-btn tool-btn--quiet"
        :title="hasDocument ? '从谱系数据重新生成书稿' : '生成古籍书稿'"
        @click="emit('generate')"
      >
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="1 4 1 10 7 10" />
          <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
        </svg>
        {{ hasDocument ? "重新编排" : "生成书稿" }}
      </button>

      <template v-if="hasDocument">
        <!-- Save button -->
        <button
          type="button"
          class="tool-btn tool-btn--save"
          :disabled="saving"
          title="保存书稿 (Ctrl+S)"
          @click="emit('save')"
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
            <polyline points="17 21 17 13 7 13 7 21" />
            <polyline points="7 3 7 8 15 8" />
          </svg>
          {{ saving ? "保存中" : "保存" }}
        </button>

        <!-- Export PDF button -->
        <button
          type="button"
          class="tool-btn tool-btn--primary primary"
          :disabled="exporting"
          @click="emit('exportPdf')"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" y1="15" x2="12" y2="3" />
          </svg>
          {{ exporting ? "导出中" : "导出 PDF" }}
        </button>
      </template>
    </div>
  </header>
</template>

<style scoped>
@font-face {
  font-family: "LXGWWenKai";
  src: url("/vrain/fonts/LXGWWenKai-Regular.ttf") format("truetype");
  font-display: swap;
}

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
  height: 52px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 0 16px;
  background: var(--bg-paper-raised, #fcfbfa);
  border-bottom: 1px solid var(--line-soft, rgba(122, 95, 65, 0.16));
  box-shadow: 0 1px 3px rgba(24, 18, 12, 0.04);
  flex-shrink: 0;
  z-index: 20;
  box-sizing: border-box;
}

.toolbar-group {
  display: flex;
  align-items: center;
  gap: 10px;
}

.toolbar-group--left {
  flex: 1;
  min-width: 0;
}

.toolbar-group--center {
  flex-shrink: 0;
}

.toolbar-group--right {
  flex: 1;
  justify-content: flex-end;
  gap: 8px;
}

.icon-btn {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  border: 1px solid var(--line-subtle, rgba(122, 95, 65, 0.12));
  background: var(--bg-paper, #ffffff);
  color: var(--text-main, #241a10);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.15s ease;
  flex-shrink: 0;
}

.icon-btn:hover {
  background: var(--fill-subtle, rgba(0, 0, 0, 0.05));
  border-color: var(--line-soft, rgba(122, 95, 65, 0.25));
}

.book-meta {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.book-badge {
  font-size: 10.5px;
  font-weight: 600;
  padding: 2px 6px;
  border-radius: 4px;
  background: rgba(114, 79, 46, 0.08);
  color: var(--color-accent, #724f2e);
  flex-shrink: 0;
  letter-spacing: 0.02em;
}

.title {
  font-family: var(--font-serif, "Noto Serif SC", serif);
  font-size: 14.5px;
  font-weight: 600;
  color: var(--text-main, #241a10);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.save-state {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 3px 8px;
  border-radius: 999px;
  background: rgba(34, 139, 34, 0.09);
  color: #2e6b2e;
  font-size: 11px;
  font-weight: 500;
  flex-shrink: 0;
}

.save-state__dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #2e6b2e;
}

.save-state.dirty {
  background: rgba(217, 83, 79, 0.1);
  color: #b33936;
}

.save-state.dirty .save-state__dot {
  background: #b33936;
}

/* Pill Group (View Mode) */
.pill-group {
  display: flex;
  gap: 2px;
  padding: 3px;
  border-radius: 8px;
  background: var(--fill-subtle, rgba(0, 0, 0, 0.04));
  border: 1px solid var(--line-subtle, rgba(122, 95, 65, 0.08));
}

.pill-btn {
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 4px 10px;
  border-radius: 6px;
  border: none;
  background: transparent;
  color: var(--text-sub, #6b5e52);
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s ease;
}

.pill-btn:hover:not(.active) {
  color: var(--text-main, #241a10);
}

.pill-btn.active {
  background: var(--bg-paper, #ffffff);
  color: var(--text-main, #241a10);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
  font-weight: 600;
}

.divider {
  width: 1px;
  height: 18px;
  background: var(--line-subtle, rgba(122, 95, 65, 0.12));
}

/* Zoom Group */
.zoom-group {
  display: flex;
  align-items: center;
  gap: 3px;
  padding: 2px 4px;
  border-radius: 8px;
  background: var(--fill-subtle, rgba(0, 0, 0, 0.04));
  border: 1px solid var(--line-subtle, rgba(122, 95, 65, 0.08));
}

.zoom-btn {
  width: 26px;
  height: 26px;
  border-radius: 6px;
  border: none;
  background: transparent;
  color: var(--text-sub, #6b5e52);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.15s ease;
}

.zoom-btn:hover {
  background: var(--bg-paper, #ffffff);
  color: var(--text-main, #241a10);
}

.zoom-val {
  min-width: 42px;
  text-align: center;
  font-size: 11.5px;
  font-weight: 600;
  color: var(--text-main, #241a10);
  cursor: pointer;
  padding: 2px 4px;
  border-radius: 4px;
  font-variant-numeric: tabular-nums;
  user-select: none;
}

.zoom-val:hover {
  background: rgba(0, 0, 0, 0.04);
}

/* Action Tool Buttons */
.tool-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  border-radius: 8px;
  border: 1px solid var(--line-subtle, rgba(122, 95, 65, 0.14));
  background: var(--bg-paper, #ffffff);
  font-size: 12.5px;
  font-weight: 500;
  color: var(--text-main, #241a10);
  cursor: pointer;
  transition: all 0.15s ease;
  white-space: nowrap;
}

.tool-btn:hover:not(:disabled) {
  border-color: var(--line-soft, rgba(122, 95, 65, 0.28));
  background: #faf8f5;
}

.tool-btn:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.tool-btn--active {
  border-color: var(--color-accent, #724f2e);
  background: rgba(114, 79, 46, 0.08);
  color: var(--color-accent, #724f2e);
  font-weight: 600;
}

.tool-btn--quiet {
  background: transparent;
  border-color: transparent;
  color: var(--text-sub, #6b5e52);
}

.tool-btn--quiet:hover:not(:disabled) {
  background: var(--fill-subtle, rgba(0, 0, 0, 0.05));
  border-color: transparent;
  color: var(--text-main, #241a10);
}

.tool-btn--save {
  color: var(--text-main, #241a10);
}

.tool-btn--primary,
.primary {
  background: var(--btn-primary-bg, #241a10);
  border-color: transparent;
  color: var(--btn-primary-color, #ffffff);
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.12);
  font-weight: 600;
}

.tool-btn--primary:hover:not(:disabled),
.primary:hover:not(:disabled) {
  background: #382c20;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.18);
  border-color: transparent;
}
</style>
