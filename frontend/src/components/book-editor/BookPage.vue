<script setup lang="ts">
import { computed, ref } from "vue"
import { BOOK_PAGE, bodyFontPx, columnGap, columnsPerPage, pageMargin, textColumnCount } from "../../features/book-editor/bookPageMetrics"
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
  "--body-height": `${(BOOK_PAGE.height - pageMargin(props.layout) * 2) * pageScale}px`,
  "--body-width": `${(BOOK_PAGE.width - pageMargin(props.layout) * 2) * pageScale}px`,
  "--inner-frame-inset": `${(pageMargin(props.layout) - 38) * pageScale}px`,
}))

function personStyle(text: string) {
  const columns = Math.min(textColumnCount(text, props.layout), columnsPerPage(props.layout))
  return {
    width: `${columns * columnGap(props.layout) * pageScale}px`,
    maxWidth: "var(--body-width)",
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
      <div class="book-spine" aria-hidden="true">
        <span class="fish-tail">◆</span>
        <span>归源</span>
        <span class="fish-tail">◆</span>
      </div>
      <footer>{{ page.pageNumber }}</footer>
    </section>
    <section v-else class="empty-page">暂无书页</section>
  </main>
</template>

<style scoped>
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
  background: #f8f0df;
  border: 1px solid rgba(122, 90, 56, 0.55);
  box-shadow: 0 18px 42px rgba(34, 27, 18, 0.16);
  line-height: 1.9;
  overflow: hidden;
}

.page-content {
  position: absolute;
  inset: var(--page-margin);
  writing-mode: vertical-rl;
  text-orientation: upright;
  overflow: hidden;
  max-width: var(--body-width);
  max-height: var(--body-height);
}

.book-page.tpl-plain { background: #fffaf0; }

.book-page::before,
.book-page::after {
  content: "";
  position: absolute;
  inset: 28px;
  pointer-events: none;
  border: 1px solid rgba(122, 90, 56, 0.5);
}

.book-page::after {
  inset: var(--inner-frame-inset);
  border-color: rgba(122, 90, 56, 0.25);
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
}

.cover p {
  margin: 24px 0 0;
  color: #6e5136;
}

.generation {
  margin: 0 0 0 24px;
  height: var(--body-height);
  max-width: var(--column-gap);
  overflow: hidden;
  color: #8a1f16;
  font-size: 1.25em;
  font-weight: 600;
  line-height: 1.2;
}

.person-block {
  margin: 0 0 0 calc(var(--column-gap) * 0.55);
  padding: 0;
  border-radius: 4px;
  cursor: text;
  height: var(--body-height);
  max-width: var(--body-width);
  overflow: hidden;
  contain: layout paint;
}

.person-text {
  margin: 0;
  height: var(--body-height);
  outline: none;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
  overflow: hidden;
}

.book-spine {
  position: absolute;
  top: 96px;
  bottom: 96px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  align-items: center;
  justify-content: space-between;
  writing-mode: vertical-rl;
  color: rgba(122, 90, 56, 0.45);
  font-size: 12px;
  pointer-events: none;
}

.fish-tail {
  color: rgba(138, 31, 22, 0.65);
  font-size: 10px;
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
