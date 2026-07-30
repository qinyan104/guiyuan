<script setup lang="ts">
import { computed } from "vue"
import type { BookLayout, BookPageLayout, BookPageMetrics } from "../../types/bookDocument"

const props = defineProps<{
  page: BookPageLayout | null
  layout: BookLayout
  metrics: BookPageMetrics
  scale?: number
  framed?: boolean
  side?: "left" | "right" | "single"
  selectedBlockIndex?: number | null
}>()

const emit = defineEmits<{
  updatePerson: [blockIndex: number, text: string]
  selectBlock: [blockIndex: number]
}>()

const pageScale = computed(() => props.scale ?? 0.56)
const isCoverPage = computed(() => props.page?.blocks.some((item) => item.block.type === "cover") ?? false)
const pageSide = computed(() => props.side ?? "single")
const pageBreaks = computed(() => props.page?.blocks.filter((item) => item.block.type === "pageBreak") ?? [])

function fontStack(fontFamily: string) {
  return `"${fontFamily}"`
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

function commitColumn(blockIndex: number, sourceStart: number | undefined, sourceEnd: number | undefined, columnText: string, original: string, event: Event) {
  if (sourceStart === undefined || sourceEnd === undefined) return
  const nextColumnText = editableText(event.currentTarget as HTMLElement)
  if (nextColumnText === columnText) return
  emit("updatePerson", blockIndex, `${original.slice(0, sourceStart)}${nextColumnText}${original.slice(sourceEnd)}`)
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
      >手动分页 · 点击选择</button>
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
            role="button"
            tabindex="0"
            :style="{ fontFamily: fontStack(item.fontFamily) }"
            @click="emit('selectBlock', item.blockIndex)"
            @keydown.enter.prevent="emit('selectBlock', item.blockIndex)"
            @keydown.space.prevent="emit('selectBlock', item.blockIndex)"
          >
            <div class="cover-surface">
              <h1><span v-for="(run, runIndex) in item.columns[0]?.runs" :key="runIndex" :style="{ fontFamily: run.fontFamily }">{{ run.text }}</span></h1>
              <p v-if="item.block.subtitle"><span v-for="(run, runIndex) in item.columns[1]?.runs" :key="runIndex" :style="{ fontFamily: run.fontFamily }">{{ run.text }}</span></p>
            </div>
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
              <span
                v-for="(column, columnIndex) in item.columns"
                :key="columnIndex"
                class="person-column"
                contenteditable="plaintext-only"
                role="textbox"
                aria-multiline="true"
                spellcheck="false"
                @focus="emit('selectBlock', item.blockIndex)"
                @blur="commitColumn(item.blockIndex, column.sourceStart, column.sourceEnd, column.text, item.block.text, $event)"
                @keydown.ctrl.enter.prevent="blurEditable"
                @keydown.enter.exact.prevent="insertColumnBreak"
              >
                <span v-for="(run, runIndex) in column.runs" :key="runIndex" :style="{ fontFamily: run.fontFamily }">{{ run.text }}</span>
              </span>
            </div>
          </div>
        </template>
      </div>
      <footer v-if="!isCoverPage">第 {{ pageNumberText }} 页</footer>
    </section>
    <section v-else class="empty-page">暂无书页</section>
  </main>
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

.is-cover-page .page-content {
  inset: 0;
  width: auto;
  height: auto;
}

.book-page.tpl-plain { background: #fffaf0; }
.book-page.tpl-white { background: #fff; }

.book-page::before,
.book-page::after {
  content: "";
  position: absolute;
  inset: 28px;
  pointer-events: none;
  border: 1px solid rgba(32, 24, 16, 0.36);
}

.book-page::after {
  inset: var(--inner-frame-inset);
  border-color: rgba(32, 24, 16, 0.3);
}

.book-page.is-cover-page::before,
.book-page.is-cover-page::after {
  display: none;
}

.book-page.tpl-plain::before,
.book-page.tpl-plain::after,
.book-page.tpl-white::before,
.book-page.tpl-white::after {
  display: none;
}

.cover {
  position: absolute;
  inset: 0;
  overflow: hidden;
}

.cover-surface {
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
  font-family: "qiji-combo", "XiaolaiMonoSC", serif;
  font-size: 54px;
  font-weight: 500;
  letter-spacing: 0;
  min-height: 720px;
  padding: 56px 24px;
  border: 1px solid rgba(118, 42, 31, 0.36);
  background:
    linear-gradient(180deg, rgba(255, 252, 242, 0.98), rgba(239, 226, 196, 0.98));
  box-shadow: 0 0 0 8px rgba(237, 221, 186, 0.1);
}

.cover p {
  margin: 28px 0 0;
  color: rgba(246, 231, 194, 0.82);
  font-family: "WenYue-GuTiFangSong", SimSun, serif;
}

.generation {
  margin: 0 0 0 var(--column-gap);
  height: var(--grid-height);
  max-width: var(--column-gap);
  overflow: hidden;
  color: #8a1f16;
  background: rgba(138, 31, 22, 0.055);
  border-left: 1px solid rgba(138, 31, 22, 0.32);
  font-size: 1.18em;
  font-weight: 600;
  line-height: var(--column-gap);
  text-align: center;
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
