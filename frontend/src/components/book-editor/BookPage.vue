<script setup lang="ts">
import { computed } from "vue"
import type { BookLayout, BookPageLayout, BookPageMetrics } from "../../types/bookDocument"

const props = defineProps<{
  page: BookPageLayout | null
  layout: BookLayout
  metrics: BookPageMetrics
  bookTitle?: string
  scale?: number
  framed?: boolean
  side?: "left" | "right" | "single"
  selectedBlockIndex?: number | null
}>()

const emit = defineEmits<{
  updateBlock: [blockIndex: number, field: "text" | "note" | "title" | "subtitle", text: string]
  selectBlock: [blockIndex: number]
  goToPage: [pageNumber: number]
}>()

const pageScale = computed(() => props.scale ?? 0.56)
const isCoverPage = computed(() => props.page?.blocks.some((item) => item.block.type === "cover") ?? false)
const pageSide = computed(() => props.side ?? "single")
const pageBreaks = computed(() => props.page?.blocks.filter((item) => item.block.type === "pageBreak") ?? [])

function fontStack(fontFamily: string) {
  return `"${fontFamily}"`
}

function coverTitleClass(title: string) {
  const length = Array.from(title.trim()).length
  if (length > 14) return "cover-surface--compact"
  if (length > 8) return "cover-surface--medium"
  return ""
}

const pageStyle = computed(() => ({
  width: `${props.metrics.pageWidth * pageScale.value}px`,
  height: `${props.metrics.pageHeight * pageScale.value}px`,
  fontFamily: fontStack(props.layout.fontFamily),
  fontSize: `${props.metrics.bodyFontSize * pageScale.value}px`,
  "--page-margin": `${props.metrics.pageMargin * pageScale.value}px`,
  "--page-scale": pageScale.value,
  "--page-width": `${props.metrics.pageWidth}px`,
  "--page-height": `${props.metrics.pageHeight}px`,
  "--outer-frame-inset": `${44 * pageScale.value}px`,
  "--column-gap": `${props.metrics.columnGap * pageScale.value}px`,
  "--grid-width": `${props.metrics.columnsPerPage * props.metrics.columnGap * pageScale.value}px`,
  "--grid-height": `${props.metrics.charsPerColumn * props.metrics.columnGap * pageScale.value}px`,
  "--inner-frame-inset": `${(props.metrics.pageMargin - 38) * pageScale.value}px`,
}))

function personStyle(columnCount: number) {
  const columns = Math.min(columnCount, props.metrics.columnsPerPage)
  return {
    width: `${columns * props.metrics.columnGap * pageScale.value}px`,
    maxWidth: "var(--grid-width)",
  }
}

function editableText(element: HTMLElement) {
  return (element.textContent ?? "").replace(/\r\n?/g, "\n")
}

function commitColumn(blockIndex: number, field: "text" | "note", sourceStart: number | undefined, sourceEnd: number | undefined, columnText: string, original: string, event: Event) {
  if (sourceStart === undefined || sourceEnd === undefined) return
  const nextColumnText = editableText(event.currentTarget as HTMLElement)
  if (nextColumnText === columnText) return
  emit("updateBlock", blockIndex, field, `${original.slice(0, sourceStart)}${nextColumnText}${original.slice(sourceEnd)}`)
}

function commitCover(blockIndex: number, field: "title" | "subtitle", original: string, event: Event) {
  const element = event.currentTarget as HTMLElement
  const text = editableText(element).replace(/\n+/g, "").trim()
  if (field === "title" && !text) {
    element.textContent = original
    return
  }
  if (text !== original) emit("updateBlock", blockIndex, field, text)
}

function blurEditable(event: Event) {
  ;(event.currentTarget as HTMLElement).blur()
}

function insertColumnBreak(event: Event) {
  const selection = window.getSelection()
  if (!selection?.rangeCount) return
  selection.deleteFromDocument()
  const range = selection.getRangeAt(0)
  const breakNode = document.createTextNode("\n")
  range.insertNode(breakNode)
  range.setStartAfter(breakNode)
  range.collapse(true)
  selection.removeAllRanges()
  selection.addRange(range)
}

const pageNumberText = computed(() => toHan(props.page?.pageNumber ?? 1))

function toHan(value: number): string {
  const nums = ["零", "一", "二", "三", "四", "五", "六", "七", "八", "九", "十"]
  if (value <= 10) return nums[value]
  if (value < 20) return `十${nums[value - 10]}`
  const tens = Math.floor(value / 10)
  const ones = value % 10
  return `${nums[tens]}十${ones ? nums[ones] : ""}`
}
</script>

<template>
  <main :class="['page-wrap', { 'page-wrap--framed': framed }]">
    <div v-if="pageBreaks.length" class="page-break-markers">
      <button
        v-for="item in pageBreaks"
        :key="item.blockIndex"
        type="button"
        :class="['page-break-marker', { selected: selectedBlockIndex === item.blockIndex }]"
        @click="emit('selectBlock', item.blockIndex)"
      >
        手动分页 · 点击选择
      </button>
    </div>
    <section
      v-if="page"
      :class="['book-page', `book-page--${pageSide}`, { 'book-page--framed': framed }, `tpl-${layout.templateId}`, { 'is-cover-page': isCoverPage }]"
      :style="pageStyle"
    >
      <div class="page-content">
        <template v-for="item in page.blocks" :key="item.blockIndex">
          <div
            v-if="item.block.type === 'cover'"
            class="cover"
            :style="{ fontFamily: fontStack(item.fontFamily) }"
            @click="emit('selectBlock', item.blockIndex)"
          >
            <div :class="['cover-surface', coverTitleClass(item.block.title)]">
              <h1
                contenteditable="plaintext-only"
                role="textbox"
                aria-label="编辑封面标题"
                spellcheck="false"
                @focus="emit('selectBlock', item.blockIndex)"
                @blur="commitCover(item.blockIndex, 'title', item.block.title, $event)"
                @keydown.enter.prevent="blurEditable"
              >
                <span v-for="(run, runIndex) in item.columns[0]?.runs" :key="runIndex" :style="{ fontFamily: run.fontFamily }">{{ run.text }}</span>
              </h1>
              <p
                contenteditable="plaintext-only"
                role="textbox"
                aria-label="编辑封面副标题"
                data-placeholder="点击填写副标题"
                spellcheck="false"
                @focus="emit('selectBlock', item.blockIndex)"
                @blur="commitCover(item.blockIndex, 'subtitle', item.block.subtitle || '', $event)"
                @keydown.enter.prevent="blurEditable"
              >
                <span v-for="(run, runIndex) in item.columns[1]?.runs" :key="runIndex" :style="{ fontFamily: run.fontFamily }">{{ run.text }}</span>
              </p>
            </div>
          </div>
          <div v-else-if="item.block.type === 'contents'" class="contents-block" :style="personStyle(item.columnSpan)">
            <template v-for="(column, columnIndex) in item.columns" :key="columnIndex">
              <button
                v-if="column.variant === 'contentsEntry'"
                type="button"
                class="contents-column contents-column--entry"
                :disabled="!column.targetPageNumber"
                @click.stop="column.targetPageNumber && emit('goToPage', column.targetPageNumber)"
              >
                <span v-for="(run, runIndex) in column.runs" :key="runIndex" :style="{ fontFamily: run.fontFamily }">{{ run.text }}</span>
              </button>
              <span v-else :class="['contents-column', `contents-column--${column.variant}`]">
                <span v-for="(run, runIndex) in column.runs" :key="runIndex" :style="{ fontFamily: run.fontFamily }">{{ run.text }}</span>
              </span>
            </template>
          </div>
          <div
            v-else-if="item.block.type === 'preface'"
            class="preface-block"
            :style="personStyle(item.columnSpan)"
          >
            <span
              v-for="(column, columnIndex) in item.columns"
              :key="columnIndex"
              :class="['preface-column', `preface-column--${column.variant || 'body'}`]"
              :contenteditable="column.sourceStart !== undefined ? 'plaintext-only' : undefined"
              :role="column.sourceStart !== undefined ? 'textbox' : undefined"
              :aria-multiline="column.sourceStart !== undefined ? 'true' : undefined"
              spellcheck="false"
              @focus="emit('selectBlock', item.blockIndex)"
              @blur="commitColumn(item.blockIndex, 'text', column.sourceStart, column.sourceEnd, column.text, item.block.text, $event)"
              @keydown.ctrl.enter.prevent="blurEditable"
              @keydown.enter.exact.prevent="insertColumnBreak"
            >
              <span
                v-for="(run, runIndex) in column.runs"
                :key="runIndex"
                :class="run.variant ? `person-run--${run.variant}` : undefined"
                :style="{ fontFamily: run.fontFamily }"
              >{{ run.text }}</span>
            </span>
          </div>
          <h2
            v-else-if="item.block.type === 'generationHeading'"
            class="generation"
            role="button"
            tabindex="0"
            :style="{ fontFamily: fontStack(item.fontFamily) }"
            @click="emit('selectBlock', item.blockIndex)"
            @keydown.enter.prevent="emit('selectBlock', item.blockIndex)"
            @keydown.space.prevent="emit('selectBlock', item.blockIndex)"
          >
            <template v-for="(column, columnIndex) in item.columns" :key="columnIndex">
              <span v-for="(run, runIndex) in column.runs" :key="runIndex" :style="{ fontFamily: run.fontFamily }">{{ run.text }}</span>
            </template>
          </h2>
          <div
            v-else-if="item.block.type === 'person'"
            class="person-block"
            :data-book-block-index="item.blockIndex"
            :style="[personStyle(item.columnSpan), { fontFamily: fontStack(item.fontFamily) }]"
            @click="emit('selectBlock', item.blockIndex)"
          >
            <div class="person-columns">
              <template v-for="(column, columnIndex) in item.columns" :key="columnIndex">
                <span v-if="column.variant === 'annotation'" class="person-column person-column--annotation" aria-label="夹注">
                  <span
                    v-for="(line, lineIndex) in column.subcolumns"
                    :key="lineIndex"
                    class="person-annotation-line"
                    contenteditable="plaintext-only"
                    role="textbox"
                    aria-label="编辑夹注"
                    aria-multiline="true"
                    spellcheck="false"
                    @focus="emit('selectBlock', item.blockIndex)"
                    @blur="commitColumn(item.blockIndex, 'note', line.sourceStart, line.sourceEnd, line.text, item.block.note || '', $event)"
                    @keydown.ctrl.enter.prevent="blurEditable"
                    @keydown.enter.exact.prevent="insertColumnBreak"
                  >
                    <span
                      v-for="(run, runIndex) in line.runs"
                      :key="runIndex"
                      :class="run.variant ? `person-run--${run.variant}` : undefined"
                      :style="{ fontFamily: run.fontFamily }"
                    >{{ run.text }}</span>
                  </span>
                </span>
                <span
                  v-else
                  class="person-column"
                  contenteditable="plaintext-only"
                  role="textbox"
                  aria-multiline="true"
                  spellcheck="false"
                  @focus="emit('selectBlock', item.blockIndex)"
                  @blur="commitColumn(item.blockIndex, 'text', column.sourceStart, column.sourceEnd, column.text, item.block.text, $event)"
                  @keydown.ctrl.enter.prevent="blurEditable"
                  @keydown.enter.exact.prevent="insertColumnBreak"
                >
                  <span
                    v-for="(run, runIndex) in column.runs"
                    :key="runIndex"
                    :class="run.variant ? `person-run--${run.variant}` : undefined"
                    :style="{ fontFamily: run.fontFamily }"
                  >{{ run.text }}</span>
                </span>
              </template>
            </div>
          </div>
        </template>
      </div>
      <aside v-if="!isCoverPage && layout.templateId === 'classic'" class="book-center" aria-hidden="true">
        <span class="book-center-title">{{ bookTitle || "归源谱牒" }}</span>
        <i class="fish-tail fish-tail--top"></i>
        <span class="book-center-section">{{ page.sectionTitle || "正文" }}</span>
        <i class="fish-tail fish-tail--bottom"></i>
        <span class="book-center-page">{{ pageNumberText }}</span>
      </aside>
      <footer v-if="!isCoverPage && layout.templateId !== 'classic'">第 {{ pageNumberText }} 页</footer>
    </section>
    <section v-else class="empty-page">暂无书页</section>
  </main>
</template>

<style scoped>
@font-face {
  font-family: "MaShanZheng";
  src: url("/vrain/fonts/MaShanZheng-Regular.ttf") format("truetype");
  font-display: swap;
}

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

@font-face {
  font-family: "Jigmo";
  src: url("/vrain/fonts/Jigmo.ttf") format("truetype");
  font-display: swap;
}

@font-face {
  font-family: "Jigmo2";
  src: url("/vrain/fonts/Jigmo2.ttf") format("truetype");
  font-display: swap;
}

@font-face {
  font-family: "Jigmo3";
  src: url("/vrain/fonts/Jigmo3.ttf") format("truetype");
  font-display: swap;
}

.page-wrap {
  position: relative;
  width: max-content;
  min-width: 0;
  height: auto;
  overflow: visible;
  display: flex;
  justify-content: center;
  padding: 0;
  background: transparent;
}

.page-break-markers {
  position: absolute;
  z-index: 3;
  top: -14px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 5px;
}

.page-break-marker {
  min-height: 26px;
  padding: 0 12px;
  border: 1px dashed rgba(138, 31, 22, 0.52);
  border-radius: 999px;
  background: #fffdfa;
  color: #8a1f16;
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
  box-shadow: 0 5px 14px rgba(46, 37, 26, 0.12);
}

.page-break-marker.selected {
  border-style: solid;
  background: #8a1f16;
  color: #fff;
}

.page-break-marker:focus-visible {
  outline: 3px solid rgba(198, 60, 46, 0.2);
  outline-offset: 2px;
}

.book-page {
  position: relative;
  box-sizing: border-box;
  color: #21170f;
  background:
    linear-gradient(90deg, rgba(122, 90, 56, 0.035), transparent 16%, transparent 84%, rgba(122, 90, 56, 0.035)),
    linear-gradient(180deg, #fbf4e6, #f6ecd9);
  border: 1px solid rgba(32, 24, 16, 0.28);
  box-shadow:
    0 26px 60px rgba(46, 37, 26, 0.18),
    0 0 0 1px rgba(255, 255, 255, 0.72),
    0 2px 0 rgba(255, 255, 255, 0.68) inset;
  line-height: 1.9;
  overflow: hidden;
}

.book-page.tpl-classic {
  color: rgba(48, 31, 18, 0.9);
  background:
    radial-gradient(circle at 18% 22%, rgba(129, 82, 35, 0.055) 0 1px, transparent 1.8px),
    radial-gradient(circle at 76% 68%, rgba(129, 82, 35, 0.045) 0 1px, transparent 1.6px),
    repeating-linear-gradient(4deg, rgba(137, 91, 42, 0.018) 0 1px, transparent 1px 7px),
    linear-gradient(100deg, rgba(255, 248, 222, 0.72), rgba(244, 224, 179, 0.84)),
    #f2dfb6;
  border-color: rgba(175, 53, 34, 0.7);
}

.page-content {
  position: absolute;
  top: var(--page-margin);
  right: var(--page-margin);
  width: var(--grid-width);
  height: var(--grid-height);
  writing-mode: vertical-rl;
  text-orientation: upright;
  overflow: hidden;
}

.book-page:not(.is-cover-page) .page-content {
  outline: 1px solid rgba(32, 24, 16, 0.34);
  background-image: repeating-linear-gradient(
    to left,
    rgba(38, 28, 18, 0.18) 0,
    rgba(38, 28, 18, 0.18) 1px,
    transparent 1px,
    transparent var(--column-gap)
  );
}

.book-page.tpl-classic:not(.is-cover-page) .page-content {
  outline-color: rgba(190, 53, 34, 0.78);
  background-image: repeating-linear-gradient(
    to left,
    rgba(190, 53, 34, 0.68) 0,
    rgba(190, 53, 34, 0.68) 1px,
    transparent 1px,
    transparent var(--column-gap)
  );
}

.is-cover-page .page-content {
  inset: 0;
  width: auto;
  height: auto;
}

.book-page.tpl-plain {
  color: rgba(43, 35, 27, 0.9);
  background:
    radial-gradient(circle at 24% 18%, rgba(104, 80, 48, 0.04) 0 1px, transparent 1.6px),
    repeating-linear-gradient(7deg, rgba(96, 73, 42, 0.012) 0 1px, transparent 1px 8px),
    #faf4e7;
  border-color: rgba(66, 51, 35, 0.34);
}

.book-page.tpl-white {
  color: #20242a;
  background: #fff;
  border-color: #d8dadd;
  box-shadow: 0 18px 46px rgba(32, 38, 45, 0.12), 0 0 0 1px rgba(255, 255, 255, 0.9);
}

.book-page.tpl-plain:not(.is-cover-page) .page-content {
  outline-color: rgba(55, 43, 31, 0.28);
  background-image: repeating-linear-gradient(
    to left,
    rgba(55, 43, 31, 0.12) 0,
    rgba(55, 43, 31, 0.12) 1px,
    transparent 1px,
    transparent var(--column-gap)
  );
}

.book-page.tpl-white:not(.is-cover-page) .page-content {
  outline: none;
  background-image: none;
}

.book-page::before,
.book-page::after {
  content: "";
  position: absolute;
  inset: var(--outer-frame-inset);
  pointer-events: none;
  border: 1px solid rgba(32, 24, 16, 0.36);
}

.book-page.tpl-classic::before {
  border-width: 2px;
  border-color: rgba(181, 48, 30, 0.9);
}

.book-page.tpl-classic::after {
  border-color: rgba(190, 53, 34, 0.72);
}

.book-page::after {
  inset: var(--inner-frame-inset);
  border-color: rgba(32, 24, 16, 0.3);
}

.book-page.is-cover-page::before,
.book-page.is-cover-page::after {
  display: none;
}

.book-page.tpl-plain::after,
.book-page.tpl-white::before,
.book-page.tpl-white::after {
  display: none;
}

.book-page.tpl-plain::before {
  border-color: rgba(55, 43, 31, 0.42);
}

.cover {
  position: absolute;
  inset: 0;
  overflow: hidden;
}

.cover-surface {
  --cover-title-size: 54px;
  --cover-title-height: 720px;
  --cover-title-padding: 56px 24px;
  --cover-subtitle-gap: 28px;
  position: absolute;
  top: 0;
  right: 0;
  width: var(--page-width);
  height: var(--page-height);
  transform: scale(var(--page-scale));
  transform-origin: top right;
  min-height: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  writing-mode: vertical-rl;
  margin: 0;
  background:
    radial-gradient(circle at 48px 22%, rgba(4, 14, 20, 0.3) 0 5px, transparent 6px),
    radial-gradient(circle at 48px 42%, rgba(4, 14, 20, 0.3) 0 5px, transparent 6px),
    radial-gradient(circle at 48px 62%, rgba(4, 14, 20, 0.3) 0 5px, transparent 6px),
    linear-gradient(90deg, rgba(7, 24, 32, 0.42), transparent 14%, transparent 88%, rgba(7, 24, 32, 0.18)),
    repeating-linear-gradient(0deg, rgba(255, 255, 255, 0.02) 0 1px, transparent 1px 6px),
    #213943;
  color: #1e1710;
}

.cover-surface--medium {
  --cover-title-size: 46px;
  --cover-title-height: 760px;
  --cover-title-padding: 44px 22px;
  --cover-subtitle-gap: 24px;
}

.cover-surface--compact {
  --cover-title-size: 32px;
  --cover-title-height: 820px;
  --cover-title-padding: 36px 20px;
  --cover-subtitle-gap: 20px;
}

.cover-surface::before {
  content: "";
  position: absolute;
  left: 42px;
  top: 132px;
  bottom: 132px;
  border-left: 2px solid rgba(232, 214, 178, 0.38);
  pointer-events: none;
}

.cover h1 {
  margin: 0;
  font-family: "MaShanZheng", "LXGWWenKai", serif;
  box-sizing: border-box;
  height: var(--cover-title-height);
  max-height: calc(var(--page-height) - 180px);
  padding: var(--cover-title-padding);
  font-size: var(--cover-title-size);
  font-weight: 500;
  letter-spacing: 0;
  white-space: nowrap;
  border: 1px solid rgba(118, 42, 31, 0.36);
  background:
    linear-gradient(180deg, rgba(255, 252, 242, 0.98), rgba(239, 226, 196, 0.98));
  box-shadow: 0 0 0 8px rgba(237, 221, 186, 0.1);
}

.cover p {
  margin: var(--cover-subtitle-gap) 0 0;
  color: rgba(246, 231, 194, 0.82);
  font-family: "WenYue-GuTiFangSong", SimSun, serif;
}

.cover h1[contenteditable],
.cover p[contenteditable] {
  cursor: text;
}

.cover h1[contenteditable]:focus-visible,
.cover p[contenteditable]:focus-visible {
  outline: 2px dashed currentColor;
  outline-offset: 6px;
}

.cover p:empty::before {
  content: attr(data-placeholder);
  opacity: 0.55;
}

.tpl-plain .cover-surface {
  color: #2c241b;
  background:
    radial-gradient(circle at 48px 22%, rgba(49, 36, 23, 0.28) 0 5px, transparent 6px),
    radial-gradient(circle at 48px 42%, rgba(49, 36, 23, 0.28) 0 5px, transparent 6px),
    radial-gradient(circle at 48px 62%, rgba(49, 36, 23, 0.28) 0 5px, transparent 6px),
    repeating-linear-gradient(0deg, rgba(255, 255, 255, 0.025) 0 1px, transparent 1px 7px),
    linear-gradient(90deg, rgba(67, 49, 31, 0.18), transparent 18%, transparent 84%, rgba(67, 49, 31, 0.12)),
    #ad8a5d;
}

.tpl-plain .cover h1 {
  border-color: rgba(57, 42, 28, 0.42);
  background: linear-gradient(180deg, #fbf3df, #ead9b6);
}

.tpl-plain .cover p {
  color: rgba(43, 32, 22, 0.76);
}

.tpl-white .cover-surface {
  color: #1e2329;
  background: linear-gradient(90deg, #eef0f2, #fff 18%, #fff 82%, #eef0f2);
}

.tpl-white .cover-surface::before {
  border-color: rgba(38, 45, 53, 0.22);
}

.tpl-white .cover h1 {
  border-color: #c9cdd2;
  background: #fff;
  box-shadow: 0 0 0 8px rgba(31, 39, 48, 0.025);
}

.tpl-white .cover p {
  color: #68717b;
}

.generation {
  margin: 0 0 0 var(--column-gap);
  height: var(--grid-height);
  max-width: var(--column-gap);
  overflow: hidden;
  color: #8a1f16;
  background: linear-gradient(90deg, rgba(138, 31, 22, 0.02), rgba(138, 31, 22, 0.1));
  border: 1px solid rgba(138, 31, 22, 0.38);
  font-size: 1.28em;
  font-weight: 600;
  line-height: var(--column-gap);
  text-align: center;
}

.tpl-plain .generation {
  color: #4b3a29;
  background: rgba(67, 49, 31, 0.055);
  border-color: rgba(67, 49, 31, 0.28);
}

.tpl-white .generation {
  color: #2b3138;
  background: #f3f4f5;
  border-color: #d9dce0;
  font-size: 1.16em;
}

.preface-block,
.contents-block {
  display: flex;
  flex-direction: row-reverse;
  width: var(--grid-width);
  height: var(--grid-height);
  margin: 0;
  font: inherit;
  font-weight: 400;
  writing-mode: horizontal-tb;
}

.preface-column,
.contents-column {
  box-sizing: border-box;
  flex: 0 0 var(--column-gap);
  height: var(--grid-height);
  writing-mode: vertical-rl;
  text-orientation: upright;
  line-height: var(--column-gap);
  white-space: pre;
}

.contents-column {
  margin: 0;
  padding: 0;
  border: 0;
  color: inherit;
  background: transparent;
  font: inherit;
}

.contents-column--contentsTitle {
  color: #9d281b;
  font-size: 1.42em;
  font-weight: 500;
  text-align: center;
}

.contents-column--contentsSpacer { opacity: 0; }

.contents-column--entry {
  cursor: pointer;
  transition: background-color 120ms ease, color 120ms ease;
}

.contents-column--entry:hover,
.contents-column--entry:focus-visible {
  color: #9d281b;
  background: rgba(157, 40, 27, 0.06);
  outline: none;
}

.preface-column--prefaceTitle {
  color: #9d281b;
  font-size: 1.42em;
  font-weight: 500;
  text-align: center;
}

.tpl-plain .preface-column--prefaceTitle { color: #4b3a29; }
.tpl-white .preface-column--prefaceTitle { color: #2b3138; }
.tpl-plain .contents-column--contentsTitle { color: #4b3a29; }
.tpl-white .contents-column--contentsTitle { color: #2b3138; }

.preface-column--prefaceSpacer {
  opacity: 0;
}

.preface-column[contenteditable],
.person-annotation-line[contenteditable] {
  outline: none;
  caret-color: var(--color-accent);
  cursor: text;
}

.person-block {
  position: relative;
  margin: 0;
  padding-left: 0.18em;
  border-left: 1px dotted rgba(78, 51, 29, 0.12);
  cursor: text;
  height: var(--grid-height);
  max-width: var(--grid-width);
  overflow: hidden;
  contain: layout paint;
}

.tpl-classic .person-block {
  border-left-color: rgba(190, 53, 34, 0.22);
}

.tpl-white .person-block { border-left-color: #e1e3e6; }

.person-columns {
  width: 100%;
  height: var(--grid-height);
  display: flex;
  flex-direction: row-reverse;
  writing-mode: horizontal-tb;
}

.person-column {
  box-sizing: border-box;
  flex: 0 0 var(--column-gap);
  height: var(--grid-height);
  writing-mode: vertical-rl;
  text-orientation: upright;
  line-height: var(--column-gap);
  white-space: pre;
  outline: none;
  caret-color: var(--color-accent);
}

.person-column--annotation {
  display: flex;
  flex-direction: row-reverse;
  writing-mode: horizontal-tb;
  color: rgba(138, 31, 22, 0.78);
  font-size: 0.62em;
  cursor: default;
}

.person-run--name {
  color: #a3291c;
  font-size: 1.18em;
  font-weight: 500;
}

.tpl-plain .person-run--name { color: #3f3022; }
.tpl-white .person-run--name { color: #1f252b; font-size: 1.12em; }

.person-run--metadata {
  color: rgba(65, 43, 26, 0.72);
  font-size: 0.92em;
}

.tpl-white .person-run--metadata { color: #626a73; }

.tpl-plain .person-column--annotation { color: rgba(75, 58, 41, 0.72); }
.tpl-white .person-column--annotation { color: #68717b; }

.tpl-classic .person-run--punctuation,
.tpl-classic .person-run--sentenceEnd {
  display: inline-block;
  font-size: 0.52em;
  transform: translate(0.42em, -0.12em);
}

.tpl-classic .person-run--sentenceEnd {
  color: #b33222;
}

.person-annotation-line {
  flex: 0 0 50%;
  height: var(--grid-height);
  writing-mode: vertical-rl;
  text-orientation: upright;
  line-height: calc(var(--column-gap) / 2);
  white-space: pre;
}

.book-center {
  position: absolute;
  z-index: 2;
  top: var(--page-margin);
  bottom: var(--page-margin);
  width: calc(var(--column-gap) * 0.8);
  color: rgba(177, 48, 31, 0.9);
  pointer-events: none;
}

.book-page--right .book-center,
.book-page--single .book-center {
  left: calc((var(--page-margin) - var(--column-gap)) / 2);
}

.book-page--left .book-center {
  right: calc((var(--page-margin) - var(--column-gap)) / 2);
}

.book-center::before {
  content: "";
  position: absolute;
  top: 0;
  bottom: 0;
  left: 50%;
  border-left: 1px solid rgba(190, 53, 34, 0.24);
}

.fish-tail {
  position: absolute;
  left: 8%;
  width: 84%;
  height: calc(var(--column-gap) * 0.28);
  background: rgba(177, 48, 31, 0.88);
  clip-path: polygon(0 0, 100% 0, 64% 50%, 100% 100%, 0 100%, 36% 50%);
}

.fish-tail--top { top: 28%; }
.fish-tail--bottom { bottom: 28%; transform: rotate(180deg); }

.book-center-title,
.book-center-section,
.book-center-page {
  position: absolute;
  left: 50%;
  transform: translateX(-50%);
  writing-mode: vertical-rl;
  white-space: nowrap;
  background: #f2dfb6;
  font-family: "MaShanZheng", "LXGWWenKai", serif;
}

.book-center-title {
  top: 7%;
  max-height: 18%;
  overflow: hidden;
  padding: 0.25em 0;
  font-size: 0.62em;
  letter-spacing: 0.12em;
}

.book-center-section {
  top: 36%;
  padding: 0.35em 0;
  font-size: 0.78em;
  letter-spacing: 0.14em;
}

.book-center-page {
  bottom: 8%;
  padding: 0.25em 0;
  font-size: 0.62em;
}

footer {
  position: absolute;
  bottom: 30px;
  left: 50%;
  transform: translateX(-50%);
  color: rgba(78, 51, 29, 0.48);
  font-size: 12px;
  writing-mode: horizontal-tb;
}

.empty-page {
  margin: auto;
  color: var(--color-neutral-5);
}
</style>
