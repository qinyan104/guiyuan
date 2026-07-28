<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from "vue"
import BookPage from "./BookPage.vue"
import type { BookLayout, BookPaginationResult } from "../../types/bookDocument"

const props = defineProps<{
  pagination: BookPaginationResult
  currentPageIndex: number
  layout: BookLayout
  viewMode: "single" | "spread"
  zoom: number
}>()

const emit = defineEmits<{
  updatePerson: [blockIndex: number, text: string]
  selectBlock: [blockIndex: number]
}>()

const stageRef = ref<HTMLElement | null>(null)
const stageWidth = ref(0)
const stageHeight = ref(0)
const pages = computed(() => props.pagination.pages)
const currentPage = computed(() => pages.value[props.currentPageIndex] ?? pages.value[0] ?? null)
const isCover = computed(() => currentPage.value?.blocks.some((item) => item.block.type === "cover") ?? false)
const spreadPages = computed(() => {
  if (props.viewMode === "single" || isCover.value) {
    return { right: currentPage.value, left: null }
  }
  const bodyIndex = Math.max(0, props.currentPageIndex - 1)
  const rightIndex = 1 + Math.floor(bodyIndex / 2) * 2
  return {
    right: pages.value[rightIndex] ?? null,
    left: pages.value[rightIndex + 1] ?? null,
  }
})
const singleScale = computed(() => fitScale(1, 0.56) * props.zoom)
const spreadScale = computed(() => fitScale(2, 0.48) * props.zoom)
const blankLeafStyle = computed(() => ({
  width: `${props.pagination.metrics.pageWidth * spreadScale.value}px`,
  height: `${props.pagination.metrics.pageHeight * spreadScale.value}px`,
}))

let resizeObserver: ResizeObserver | null = null

function fitScale(pageCount: 1 | 2, max: number) {
  if (!stageWidth.value || !stageHeight.value) return pageCount === 1 ? 0.56 : 0.46
  const chromeWidth = pageCount === 1 ? 88 : 160
  const chromeHeight = pageCount === 1 ? 72 : 96
  const spine = pageCount === 2 ? 18 : 0
  const byWidth = (stageWidth.value - chromeWidth - spine) / (props.pagination.metrics.pageWidth * pageCount)
  const byHeight = (stageHeight.value - chromeHeight) / props.pagination.metrics.pageHeight
  return Math.max(0.3, Math.min(max, byWidth, byHeight))
}

function watchSize() {
  if (!stageRef.value) return
  const rect = stageRef.value.getBoundingClientRect()
  stageWidth.value = rect.width
  stageHeight.value = rect.height
}

onMounted(() => {
  watchSize()
  resizeObserver = new ResizeObserver(watchSize)
  if (stageRef.value) resizeObserver.observe(stageRef.value)
})

onBeforeUnmount(() => {
  resizeObserver?.disconnect()
})
</script>

<template>
  <main ref="stageRef" :class="['book-stage', { 'book-stage--single': viewMode === 'single' || isCover }]">
    <BookPage
      v-if="viewMode === 'single' || isCover"
      :page="currentPage"
      :layout="layout"
      :metrics="pagination.metrics"
      :scale="singleScale"
      side="single"
      @updatePerson="(blockIndex, text) => emit('updatePerson', blockIndex, text)"
      @selectBlock="emit('selectBlock', $event)"
    />
    <div v-else class="book-spread">
      <div class="spread-side spread-side--left">
        <BookPage
          v-if="spreadPages.left"
          :page="spreadPages.left"
          :layout="layout"
          :metrics="pagination.metrics"
          :scale="spreadScale"
          side="left"
          framed
          @updatePerson="(blockIndex, text) => emit('updatePerson', blockIndex, text)"
          @selectBlock="emit('selectBlock', $event)"
        />
        <div v-else class="blank-leaf" :style="blankLeafStyle" aria-hidden="true"></div>
      </div>
      <div class="book-spine" aria-hidden="true"></div>
      <div class="spread-side spread-side--right">
        <BookPage
          :page="spreadPages.right"
          :layout="layout"
          :metrics="pagination.metrics"
          :scale="spreadScale"
          side="right"
          framed
          @updatePerson="(blockIndex, text) => emit('updatePerson', blockIndex, text)"
          @selectBlock="emit('selectBlock', $event)"
        />
      </div>
    </div>
  </main>
</template>

<style scoped>
.book-stage {
  min-width: 0;
  height: 100%;
  overflow: auto;
  display: flex;
  justify-content: flex-start;
  align-items: flex-start;
  padding: 36px 44px;
  background:
    radial-gradient(circle at 50% 12%, rgba(255, 253, 250, 0.75), transparent 34%),
    linear-gradient(180deg, #eee7da, #e0d5c3);
}

.book-stage > * {
  margin: auto;
}

.book-stage--single {
  align-items: flex-start;
}

.book-spread {
  display: grid;
  grid-template-columns: minmax(0, auto) 18px minmax(0, auto);
  align-items: stretch;
  padding: 18px 24px;
  background: #cdbfa9;
  box-shadow:
    0 30px 70px rgba(45, 34, 22, 0.2),
    inset 0 0 0 1px rgba(255, 246, 226, 0.24);
}

.spread-side {
  background: #f4ead8;
}

.blank-leaf {
  background:
    linear-gradient(90deg, rgba(122, 90, 56, 0.035), transparent 20%),
    #f8f0df;
}

.spread-side--left {
  box-shadow: inset -18px 0 28px rgba(76, 51, 28, 0.1);
}

.spread-side--right {
  box-shadow: inset 18px 0 28px rgba(76, 51, 28, 0.1);
}

.book-spine {
  background:
    linear-gradient(90deg, rgba(70, 47, 26, 0.16), rgba(255, 248, 236, 0.16), rgba(70, 47, 26, 0.18)),
    #bca98e;
}
</style>
