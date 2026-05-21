<script setup lang="ts">
import { ref, onMounted, computed } from "vue"
import { useRoute, useRouter } from "vue-router"
import { usePublishingStudio } from "../composables/usePublishingStudio"
import StudioToolbar from "../components/publishing/StudioToolbar.vue"
import PageThumbnailBar from "../components/publishing/PageThumbnailBar.vue"
import PageCanvas from "../components/publishing/PageCanvas.vue"
import ElementInspector from "../components/publishing/ElementInspector.vue"
import StudioStatusBar from "../components/publishing/StudioStatusBar.vue"

const route = useRoute()
const router = useRouter()
const draftId = computed(() => Number(route.params.draftId))

const {
  draft,
  activeSheetIndex,
  selectedElementId,
  syncStatus,
  loading,
  hasPendingSync,
  loadDraft,
  selectElement,
} = usePublishingStudio(draftId)

const sheetTypes = ref<string[]>([])

onMounted(async () => {
  await loadDraft()
  if (draft.value) {
    const count = draft.value.sheetCount || 1
    sheetTypes.value = Array.from({ length: count }, () => "正文")
  }
})

function handleBack() {
  router.push("/publishing")
}

function handleAutoLayout() {
  alert("自动排版功能将在 Phase 2 实现")
}

const totalPages = computed(() => draft.value?.sheetCount || 1)
const currentPage = computed(() => activeSheetIndex.value + 1)
</script>

<template>
  <div v-if="loading" class="studio-loading">
    <p>加载中…</p>
  </div>

  <div v-else-if="!draft" class="studio-loading">
    <p>草稿未找到</p>
    <button class="btn-back-link" @click="handleBack">← 返回列表</button>
  </div>

  <div v-else class="publishing-studio">
    <StudioToolbar
      :draftTitle="draft.title"
      :draftStatus="draft.status"
      :hasPendingSync="hasPendingSync"
      @back="handleBack"
      @autoLayout="handleAutoLayout"
    />

    <div class="studio-body">
      <PageThumbnailBar
        :sheetCount="totalPages"
        :activeSheetIndex="activeSheetIndex"
        :sheetTypes="sheetTypes"
        @selectSheet="(i: number) => (activeSheetIndex = i)"
        @addSheet="() => {}"
      />

      <PageCanvas
        :sheetNumber="currentPage"
      />

      <ElementInspector
        :selectedElementId="selectedElementId"
      />
    </div>

    <StudioStatusBar
      :currentPage="currentPage"
      :totalPages="totalPages"
      :hasPendingSync="hasPendingSync"
    />
  </div>
</template>

<style scoped>
.publishing-studio {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background: #f5f0e8;
}

.studio-body {
  display: flex;
  flex: 1;
  overflow: hidden;
}

.studio-loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100vh;
  color: #999;
  font-size: 16px;
}

.btn-back-link {
  margin-top: 12px;
  background: transparent;
  border: none;
  color: #c43a31;
  font-size: 14px;
  cursor: pointer;
}
.btn-back-link:hover {
  text-decoration: underline;
}
</style>