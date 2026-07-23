<script setup lang="ts">
import { computed, ref } from "vue"
import { BOOK_PAGE, bodyFontPx, charsPerColumn, columnGap, columnsPerPage, pageMargin, textColumnCount } from "../../features/book-editor/bookPageMetrics"
import type { BookLayout, BookPageLayout } from "../../types/bookDocument"

const props = defineProps<{
  page: BookPageLayout | null
  layout: BookLayout
}>()

const emit = defineEmits<{
  updatePerson: [blockIndex: number, text: string]
  selectBlock: [blockIndex: number]
}>()

const editingIndex = ref<number | null>(null)
const pageScale = 0.56

const pageStyle = computed(() => ({
  width: `${BOOK_PAGE.width * pageScale}px`,
  height: `${BOOK_PAGE.height * pageScale}px`,
  fontFamily: `${props.layout.fontFamily}, SimSun, serif`,
  fontSize: `${bodyFontPx(props.layout) * pageScale}px`,
  "--page-margin": `${pageMargin(props.layout) * pageScale}px`,
  "--column-gap": `${columnGap(props.layout) * pageScale}px`,
  "--grid-width": `${columnsPerPage(props.layout) * columnGap(props.layout) * pageScale}px`,
  "--grid-height": `${charsPerColumn(props.layout) * columnGap(props.layout) * pageScale}px`,
  "--inner-frame-inset": `${(pageMargin(props.layout) - 38) * pageScale}px`,
}))

function personStyle(text: string) {
  const columns = Math.min(textColumnCount(text, props.layout), columnsPerPage(props.layout))
  return {
    width: `${columns * columnGap(props.layout) * pageScale}px`,
    maxWidth: "var(--grid-width)",
  }
}

function startEdit(blockIndex: number) {
  editingIndex.value = blockIndex
  emit("selectBlock", blockIndex)
}

function commit(blockIndex: number, event: Event) {
  const text = (event.currentTarget as HTMLElement).innerText.trim()
  if (text) emit("updatePerson", blockIndex, text)
  editingIndex.value = null
}

function blurEditable(event: Event) {
  ;(event.currentTarget as HTMLElement).blur()
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
  <main class="page-wrap">
    <section
      v-if="page"
      class="book-page"
      :class="[`tpl-${layout.templateId}`, { 'is-cover-page': page.blocks.some((item) => item.block.type === 'cover') }]"
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
            :style="personStyle(item.block.text)"
          >
            <p
              class="person-text"
              contenteditable="true"
              spellcheck="false"
              @focus="startEdit(item.blockIndex)"
              @blur="commit(item.blockIndex, $event)"
              @keydown.ctrl.enter.prevent="blurEditable"
            >{{ item.block.text }}</p>
          </div>
        </template>
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

.page-wrap {
  min-width: 0;
  height: 100%;
  overflow: auto;
  display: flex;
  justify-content: center;
  padding: 28px;
  background: #e7e0d4;
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
  border: 1px solid #000;
  box-shadow: 0 18px 42px rgba(34, 27, 18, 0.16);
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
  outline: 1px solid #000;
  background-image: repeating-linear-gradient(
    to left,
    #000 0,
    #000 1px,
    transparent 1px,
    transparent var(--column-gap)
  );
}

.book-page.tpl-plain { background: #fffaf0; }
.book-page.tpl-white { background: #fff; }

.book-page::before,
.book-page::after {
  content: "";
  position: absolute;
  inset: 28px;
  pointer-events: none;
  border: 1.5px solid #000;
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
  min-height: 860px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  writing-mode: vertical-rl;
  margin: auto;
}

.cover h1 {
  margin: 0;
  font-size: 48px;
  font-weight: 500;
  letter-spacing: 0;
  padding: 28px 16px;
  border: 1px solid rgba(138, 31, 22, 0.38);
  background: rgba(255, 252, 246, 0.42);
}

.cover p {
  margin: 24px 0 0;
  color: #6e5136;
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
  margin: 0 0 0 var(--column-gap);
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
  height: var(--grid-height);
  outline: none;
  line-height: var(--column-gap);
  white-space: pre-wrap;
  overflow-wrap: anywhere;
  overflow: hidden;
}

footer {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 28px;
  text-align: center;
  color: #7a5a38;
  font-size: 12px;
  writing-mode: horizontal-tb;
}

.empty-page {
  margin: auto;
  color: var(--color-neutral-5);
}
</style>
