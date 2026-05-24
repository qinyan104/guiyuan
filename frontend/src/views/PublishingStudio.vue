<script setup lang="ts">
import { useFeedback } from '../composables/useFeedback'
import FeedbackStrip from '../components/FeedbackStrip.vue'

const feedback = useFeedback()
import { ref, onMounted, computed } from "vue"
import { useRoute, useRouter } from "vue-router"
import { usePublishingStudio } from "../composables/usePublishingStudio"
import { getPublication } from "../api/publication"
import { saveSheets, listSheets, deleteSheet, updateDraft } from "../api/publishing"
import type { PublicationData } from "../types/family"
import type { BookSheetLayout, LineagePage } from "../types/publishing"
import StudioToolbar from "../components/publishing/StudioToolbar.vue"
import PageThumbnailBar from "../components/publishing/PageThumbnailBar.vue"
import PageCanvas from "../components/publishing/PageCanvas.vue"
import ElementInspector from "../components/publishing/ElementInspector.vue"
import StudioStatusBar from "../components/publishing/StudioStatusBar.vue"

const route = useRoute()
const router = useRouter()
const draftId = computed(() => Number(route.params.draftId))

const {
  draft, activeSheetIndex, selectedElementId,
  syncStatus, loading, hasPendingSync, loadDraft, selectElement,
} = usePublishingStudio(draftId)

const pubData = ref<PublicationData | null>(null)
const layoutPages = ref<LineagePage[]>([])
const layoutSheets = ref<BookSheetLayout[]>([])
const sheetTypes = ref<string[]>([])
const savedSheetIds = ref<number[]>([]) // backend IDs for each sheet index

onMounted(async () => {
  await loadDraft()
  if (draft.value) {
    // Load publication data
    try {
      const result = await getPublication(draft.value.publicationId)
      pubData.value = result.publication
    } catch { /* publication may not be loaded */ }

    // Try loading saved sheets from backend
    try {
      const saved = await listSheets(draftId.value)
      if (saved.length > 0) {
        layoutPages.value = saved.map(s => {
          try { return JSON.parse(s.layoutData) as LineagePage }
          catch { return null }
        }).filter(Boolean) as LineagePage[]
        savedSheetIds.value = saved.map(s => s.id)
        sheetTypes.value = saved.map(s => s.sheetType)
      } else {
        const count = draft.value.sheetCount || 1
        sheetTypes.value = Array.from({ length: count }, () => "genealogy")
      }
    } catch {
      const count = draft.value.sheetCount || 1
      sheetTypes.value = Array.from({ length: count }, () => "genealogy")
    }
  }
})

function handleBack() { router.push("/publishing") }

async function handleAutoLayout() {
  if (!pubData.value) { feedback.errorMessage.value = "请先加载族谱数据"; return }
  try {
    // Use text-based lineage layout instead of card layout
    const { computeLineageText } = await import("../lib/lineageText")
    const pages = computeLineageText(pubData.value)
    layoutPages.value = pages
    sheetTypes.value = pages.map(() => "genealogy")
    activeSheetIndex.value = 0

    // Save to backend
    const sheetsToSave = pages.map((page, i) => ({
      sheetNumber: i + 1,
      sheetType: "genealogy",
      layoutData: JSON.stringify(page),
    }))
    const saved = await saveSheets(draftId.value, sheetsToSave)
    savedSheetIds.value = saved.map(s => s.id)

    // Update draft sheetCount
    await updateDraft(draftId.value, { publicationId: draft.value!.publicationId, title: draft.value!.title })

    feedback.statusMessage.value = `排版完成，共 ${pages.length} 页，已保存`
  } catch (e: any) {
    feedback.errorMessage.value = "自动排版失败: " + (e.message || e)
  }
}

async function handleAddSheet() {
  const newPage: LineagePage = {
    pageNumber: layoutPages.value.length + 1,
    entries: [],
    rootPersonIds: [],
  }
  layoutPages.value.push(newPage)
  sheetTypes.value.push("genealogy")
  activeSheetIndex.value = layoutPages.value.length - 1

  try {
    const sheetsToSave = layoutPages.value.map((page, i) => ({
      sheetNumber: i + 1,
      sheetType: sheetTypes.value[i] || "genealogy",
      layoutData: JSON.stringify(page),
    }))
    const saved = await saveSheets(draftId.value, sheetsToSave)
    savedSheetIds.value = saved.map(s => s.id)
  } catch { /* silent */ }
}

async function handleDeleteSheet(index: number) {
  if (layoutPages.value.length <= 1) return
  const backendId = savedSheetIds.value[index]
  layoutPages.value.splice(index, 1)
  sheetTypes.value.splice(index, 1)

  if (activeSheetIndex.value >= layoutPages.value.length) {
    activeSheetIndex.value = layoutPages.value.length - 1
  }

  try {
    if (backendId) await deleteSheet(draftId.value, backendId)
    const sheetsToSave = layoutPages.value.map((page, i) => ({
      sheetNumber: i + 1,
      sheetType: sheetTypes.value[i] || "genealogy",
      layoutData: JSON.stringify(page),
    }))
    const saved = await saveSheets(draftId.value, sheetsToSave)
    savedSheetIds.value = saved.map(s => s.id)
  } catch { /* silent */ }
}

function handleSelectSheet(index: number) {
  activeSheetIndex.value = index
}

const totalPages = computed(() => layoutPages.value.length || 1)
const currentPage = computed(() => activeSheetIndex.value + 1)
const currentPageData = computed(() => layoutPages.value[activeSheetIndex.value] || null)
</script>

<template>
  <FeedbackStrip :errorMessage="feedback.errorMessage.value" :statusMessage="feedback.statusMessage.value" @dismiss="feedback.dismiss" />
  <div v-if="loading" class="studio-loading"><p>加载中…</p></div>

  <div v-else-if="!draft" class="studio-loading">
    <p>草稿未找到</p>
    <button class="btn-back-link" @click="handleBack">← 返回列表</button>
  </div>

  <div v-else class="publishing-studio">
    <StudioToolbar
      :draftTitle="draft.title" :draftStatus="draft.status"
      :hasPendingSync="hasPendingSync"
      @back="handleBack" @autoLayout="handleAutoLayout"
    />

    <div class="studio-body">
      <PageThumbnailBar
        :sheetCount="totalPages" :activeSheetIndex="activeSheetIndex"
        :sheetTypes="sheetTypes"
        @selectSheet="handleSelectSheet"
        @addSheet="handleAddSheet"
        @deleteSheet="handleDeleteSheet"
      />

      <PageCanvas
        :sheetNumber="currentPage"
        :layoutData="currentLayout"
        :publicationData="pubData"
      />

      <ElementInspector :selectedElementId="selectedElementId" />
    </div>

    <StudioStatusBar
      :currentPage="currentPage" :totalPages="totalPages"
      :hasPendingSync="hasPendingSync"
    />
  </div>
</template>

<style scoped>
.publishing-studio { display:flex; flex-direction:column; height:100vh; background:var(--color-neutral-2); }
.studio-body { display:flex; flex:1; overflow:hidden; }
.studio-loading { display:flex; flex-direction:column; align-items:center; justify-content:center; height:100vh; color:var(--color-neutral-6); font-size:16px; }
.btn-back-link { margin-top:12px; background:transparent; border:none; color:var(--color-accent); font-size:14px; cursor:pointer; }
.btn-back-link:hover { text-decoration:underline; }
</style>
