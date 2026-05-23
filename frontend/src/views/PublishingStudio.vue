<script setup lang="ts">
import { useFeedback } from '../composables/useFeedback'
import FeedbackStrip from '../components/FeedbackStrip.vue'

const feedback = useFeedback()
import { ref, onMounted, computed } from "vue"
import { useRoute, useRouter } from "vue-router"
import { usePublishingStudio } from "../composables/usePublishingStudio"
import { getPublication } from "../api/publication"
import type { PublicationData } from "../types/family"
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
const sheetTypes = ref<string[]>([])
const layoutSheets = ref<any[]>([])

onMounted(async () => {
  await loadDraft()
  if (draft.value) {
    // Load actual publication data for rendering
    try {
      const result = await getPublication(draft.value.publicationId)
      pubData.value = result.publication
    } catch { /* publication may not be loaded */ }
    const count = draft.value.sheetCount || 1
    sheetTypes.value = Array.from({ length: count }, () => "世系")
  }
})

function handleBack() { router.push("/publishing") }

async function handleAutoLayout() {
  if (!pubData.value) { feedback.errorMessage.value = "请先加载族谱数据"; return }
  try {
    const { computeTraditionalLayout } = await import("../lib/traditionalLayout")
    layoutSheets.value = computeTraditionalLayout(pubData.value)
    sheetTypes.value = layoutSheets.value.map(() => "世系")
    activeSheetIndex.value = 0
  } catch (e: any) {
    feedback.errorMessage.value = "自动排版失败: " + (e.message || e)
  }
}

const totalPages = computed(() => layoutSheets.value.length || 1)
const currentPage = computed(() => activeSheetIndex.value + 1)
const currentLayout = computed(() => layoutSheets.value[activeSheetIndex.value] || null)
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
        @selectSheet="(i: number) => (activeSheetIndex = i)"
        @addSheet="() => {}"
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
.publishing-studio { display:flex; flex-direction:column; height:100vh; background:#f5f0e8; }
.studio-body { display:flex; flex:1; overflow:hidden; }
.studio-loading { display:flex; flex-direction:column; align-items:center; justify-content:center; height:100vh; color:#999; font-size:16px; }
.btn-back-link { margin-top:12px; background:transparent; border:none; color:#c43a31; font-size:14px; cursor:pointer; }
.btn-back-link:hover { text-decoration:underline; }
</style>
