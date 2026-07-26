<script setup lang="ts">
import { computed, ref } from "vue"
import { BOOK_PAGE, bodyFontPx, charsPerColumn, columnGap, columnsPerPage, pageMargin, textColumnCount } from "../../features/book-editor/bookPageMetrics"
import type { BookLayout, BookPageLayout } from "../../types/bookDocument"

const props = defineProps<{
  page: BookPageLayout | null
  layout: BookLayout
  scale?: number
  framed?: boolean
  side?: "left" | "right" | "single"
}>()

const emit = defineEmits<{
  updatePerson: [blockIndex: number, text: string]
  selectBlock: [blockIndex: number]
}>()

const editingIndex = ref<number | null>(null)
const pageScale = computed(() => props.scale ?? 0.56)
const isCoverPage = computed(() => props.page?.blocks.some((item) => item.block.type === "cover") ?? false)
const pageSide = computed(() => props.side ?? "single")

const pageStyle = computed(() => ({
  width: `${BOOK_PAGE.width * pageScale.value}px`,
  height: `${BOOK_PAGE.height * pageScale.value}px`,
  fontFamily: `${props.layout.fontFamily}, WenYue-GuTiFangSong, SimSun, serif`,
  fontSize: `${bodyFontPx(props.layout) * pageScale.value}px`,
  "--page-margin": `${pageMargin(props.layout) * pageScale.value}px`,
  "--column-gap": `${columnGap(props.layout) * pageScale.value}px`,
  "--grid-width": `${columnsPerPage(props.layout) * columnGap(props.layout) * pageScale.value}px`,
  "--grid-height": `${charsPerColumn(props.layout) * columnGap(props.layout) * pageScale.value}px`,
  "--inner-frame-inset": `${(pageMargin(props.layout) - 38) * pageScale.value}px`,
}))

function personStyle(text: string) {
  const columns = Math.min(textColumnCount(text, props.layout), columnsPerPage(props.layout))
  return {
    width: `${columns * columnGap(props.layout) * pageScale.value}px`,
    maxWidth: "var(--grid-width)",
  }
}

function editableText(element: HTMLElement) {
  return (element.textContent ?? "").replace(/\r\n?/g, "\n")
}

function resizeEditable(event: Event) {
  const element = event.currentTarget as HTMLElement
  const block = element.parentElement
  if (!block) return
  Object.assign(block.style, personStyle(editableText(element)))
}

function startEdit(blockIndex: number) {
  editingIndex.value = blockIndex
  emit("selectBlock", blockIndex)
}

function commit(blockIndex: number, event: Event) {
  const text = editableText(event.currentTarget as HTMLElement)
  emit("updatePerson", blockIndex, text)
  editingIndex.value = null
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
  resizeEditable(event)
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
    <section
      v-if="page"
      :class="['book-page', `book-page--${pageSide}`, { 'book-page--framed': framed }, `tpl-${layout.templateId}`, { 'is-cover-page': isCoverPage }]"
      :style="pageStyle"
    >
      <div class="page-content">
        <template v-for="item in page.blocks" :key="item.blockIndex">
          <div v-if="item.block.type === 'cover'" class="cover">
            <h1>{{ item.block.title }}</h1>
            <p v-if="item.block.subtitle">{{ item.block.subtitle }}</p>
          </div>
          <h2 v-else-if="item.block.type === 'generationHeading'" class="generation">{{ item.block.text }}</h2>
          <div
            v-else-if="item.block.type === 'person'"
            :class="['person-block', { editing: editingIndex === item.blockIndex }]"
            :data-book-block-index="item.blockIndex"
            :style="personStyle(item.block.text)"
          >
            <p
              class="person-text"
              contenteditable="true"
              spellcheck="false"
              @focus="startEdit(item.blockIndex)"
              @input="resizeEditable"
              @blur="commit(item.blockIndex, $event)"
              @keydown.ctrl.enter.prevent="blurEditable"
              @keydown.enter.exact.prevent="insertColumnBreak"
            >{{ item.block.text }}</p>
          </div>
        </template>
      </div>
      <div v-if="!isCoverPage" class="book-mouth" aria-hidden="true">
        <span class="fish-tail">◆</span>
        <span>族谱</span>
        <span class="fish-tail">◆</span>
      </div>
      <footer>第 {{ pageNumberText }} 页</footer>
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

.page-wrap {
  min-width: 0;
  height: 100%;
  overflow: auto;
  display: flex;
  justify-content: center;
  padding: 36px 44px;
  background:
    radial-gradient(circle at 50% 12%, rgba(255, 253, 250, 0.9), transparent 34%),
    linear-gradient(180deg, #eee7da, #e4dacb);
}

.page-wrap--framed {
  height: auto;
  overflow: visible;
  padding: 0;
  background: transparent;
}

.book-page {
  position: relative;
  box-sizing: border-box;
  color: #21170f;
  background:
    radial-gradient(circle at 18% 22%, rgba(120, 82, 42, 0.055), transparent 26%),
    radial-gradient(circle at 76% 68%, rgba(110, 74, 38, 0.045), transparent 30%),
    linear-gradient(90deg, rgba(122, 90, 56, 0.035), transparent 18%, transparent 82%, rgba(122, 90, 56, 0.035)),
    #f8f0df;
  border: 1px solid rgba(32, 24, 16, 0.45);
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
  outline: 1px solid rgba(32, 24, 16, 0.45);
  background-image: repeating-linear-gradient(
    to left,
    rgba(38, 28, 18, 0.24) 0,
    rgba(38, 28, 18, 0.24) 1px,
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
  border: 1px solid rgba(32, 24, 16, 0.5);
}

.book-page::after {
  inset: var(--inner-frame-inset);
  border-color: #000;
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
  min-height: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  writing-mode: vertical-rl;
  margin: 0;
  background:
    linear-gradient(90deg, rgba(9, 34, 45, 0.16), transparent 10%, transparent 90%, rgba(9, 34, 45, 0.12)),
    repeating-linear-gradient(0deg, rgba(255, 255, 255, 0.025) 0 1px, transparent 1px 5px),
    #263f48;
  color: #1e1710;
}

.cover h1 {
  margin: 0;
  font-family: "qiji-combo", "XiaolaiMonoSC", serif;
  font-size: 54px;
  font-weight: 500;
  letter-spacing: 0;
  padding: 54px 22px;
  border: 1px solid rgba(118, 42, 31, 0.48);
  background:
    linear-gradient(180deg, rgba(255, 252, 242, 0.98), rgba(236, 220, 187, 0.96));
  box-shadow:
    0 0 0 9px rgba(237, 221, 186, 0.18),
    0 18px 34px rgba(10, 21, 24, 0.22);
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
  font-size: 1.25em;
  font-weight: 600;
  line-height: var(--column-gap);
}

.person-block {
  margin: 0;
  padding: 0;
  border-radius: 4px;
  cursor: text;
  height: var(--grid-height);
  max-width: var(--grid-width);
  overflow: hidden;
  contain: layout paint;
}

.person-text {
  margin: 0;
  width: 100%;
  height: var(--grid-height);
  outline: none;
  line-height: var(--column-gap);
  white-space: pre-wrap;
  overflow-wrap: anywhere;
  overflow: hidden;
  caret-color: var(--color-accent);
  color: rgba(33, 23, 15, 0.9);
}

footer {
  position: absolute;
  bottom: 30px;
  left: 50%;
  transform: translateX(-50%);
  color: #7a5a38;
  font-size: 12px;
  writing-mode: horizontal-tb;
}

.book-mouth {
  position: absolute;
  top: 50%;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  transform: translateY(-50%);
  color: rgba(78, 51, 29, 0.58);
  font-size: 12px;
  line-height: 1;
  writing-mode: vertical-rl;
}

.book-page--right .book-mouth {
  left: 38px;
}

.book-page--left .book-mouth {
  right: 38px;
}

.book-page--single .book-mouth {
  left: 38px;
}

.fish-tail {
  color: rgba(138, 31, 22, 0.52);
  font-size: 10px;
}

.empty-page {
  margin: auto;
  color: var(--color-neutral-5);
}
</style>
