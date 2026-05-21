<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from "vue"
import { useRoute, useRouter } from "vue-router"
import { getPersonDetail, upsertPersonDetail } from "../api/publishing"
import type { BookPersonDetail } from "../types/publishing"

const route = useRoute()
const router = useRouter()
const draftId = computed(() => Number(route.params.draftId))
const personId = computed(() => route.params.personId as string)

const detail = ref<BookPersonDetail | null>(null)
const biography = ref("")
const loading = ref(false)
const lastSaved = ref("")
const savedBio = ref("")

let autoSaveTimer: ReturnType<typeof setInterval> | null = null

async function load() {
  loading.value = true
  try {
    detail.value = await getPersonDetail(draftId.value, personId.value)
    biography.value = detail.value.biography || ""
    savedBio.value = biography.value
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "加载人物详情失败"
    alert(msg)
  } finally {
    loading.value = false
  }
}

async function save() {
  if (biography.value === savedBio.value) return
  try {
    await upsertPersonDetail(draftId.value, {
      personId: personId.value,
      biography: biography.value,
      userModified: true,
    })
    savedBio.value = biography.value
    lastSaved.value = new Date().toLocaleTimeString("zh-CN")
  } catch (e: unknown) {
    // silent fail for auto-save
  }
}

async function autoSave() {
  if (biography.value !== savedBio.value) {
    await save()
  }
}

function goBack() {
  router.push(`/publishing/${draftId.value}`)
}

const wordCount = computed(() => biography.value.replace(/\s/g, "").length)

onMounted(async () => {
  await load()
  autoSaveTimer = setInterval(autoSave, 30000)
})

onUnmounted(() => {
  if (autoSaveTimer) clearInterval(autoSaveTimer)
})
</script>

<template>
  <div class="biography-editor">
    <!-- Header -->
    <header class="bio-header">
      <button class="btn-back" @click="goBack">← 返回草稿</button>
      <span class="bio-person-id">{{ personId }}</span>
      <span class="bio-label">传记编辑</span>
      <div class="header-spacer" />
      <button class="btn-save" @click="save">保存</button>
      <span v-if="lastSaved" class="last-saved">上次保存: {{ lastSaved }}</span>
    </header>

    <div v-if="loading" class="bio-loading">
      <p>加载中…</p>
    </div>

    <div v-else class="bio-body">
      <!-- Left: Textarea -->
      <div class="bio-editor-pane">
        <textarea
          v-model="biography"
          class="bio-textarea"
          placeholder="在此编辑传记内容…"
        />
      </div>

      <!-- Right: Vertical preview -->
      <div class="bio-preview-pane">
        <div class="bio-preview">
          <p v-if="biography" class="preview-text">{{ biography }}</p>
          <p v-else class="preview-empty">传记预览（竖排）</p>
        </div>
      </div>
    </div>

    <!-- Footer -->
    <footer class="bio-footer">
      <span>{{ wordCount }} 字</span>
      <span class="footer-hint">每 30 秒自动保存</span>
    </footer>
  </div>
</template>

<style scoped>
.biography-editor {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background: #faf7f2;
}

.bio-header {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 12px 20px;
  border-bottom: 1px solid #e8e0d5;
  background: #fffdf8;
  flex-shrink: 0;
}

.btn-back {
  background: transparent;
  border: none;
  color: #c43a31;
  font-size: 14px;
  cursor: pointer;
}
.btn-back:hover {
  text-decoration: underline;
}

.bio-person-id {
  font-size: 13px;
  color: #888;
  font-family: monospace;
}

.bio-label {
  font-size: 15px;
  font-weight: 600;
  color: #333;
}

.header-spacer {
  flex: 1;
}

.btn-save {
  padding: 6px 16px;
  background: #c43a31;
  color: #fff;
  border: none;
  border-radius: 4px;
  font-size: 13px;
  cursor: pointer;
}
.btn-save:hover {
  background: #a8322a;
}

.last-saved {
  font-size: 11px;
  color: #bbb;
}

.bio-loading {
  display: flex;
  align-items: center;
  justify-content: center;
  flex: 1;
  color: #999;
}

.bio-body {
  display: flex;
  flex: 1;
  overflow: hidden;
}

.bio-editor-pane {
  flex: 1;
  padding: 20px;
}

.bio-textarea {
  width: 100%;
  height: 100%;
  border: 1px solid #e8e0d5;
  border-radius: 6px;
  padding: 16px;
  font-family: "Noto Serif SC", "SimSun", serif;
  font-size: 15px;
  line-height: 1.8;
  resize: none;
  outline: none;
  background: #fffdf8;
  box-sizing: border-box;
}
.bio-textarea:focus {
  border-color: #c43a31;
}

.bio-preview-pane {
  width: 320px;
  padding: 20px 16px;
  border-left: 1px solid #e8e0d5;
  flex-shrink: 0;
}

.bio-preview {
  height: 100%;
  overflow-y: auto;
  writing-mode: vertical-rl;
  text-orientation: mixed;
  font-family: "Noto Serif SC", "SimSun", serif;
  font-size: 14px;
  line-height: 2;
  color: #333;
  padding: 12px;
  background: #fffdf8;
  border: 1px solid #e8e0d5;
  border-radius: 6px;
}

.preview-text {
  margin: 0;
  white-space: pre-wrap;
}

.preview-empty {
  margin: 0;
  color: #ccc;
}

.bio-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 20px;
  border-top: 1px solid #e8e0d5;
  background: #faf7f2;
  font-size: 12px;
  color: #999;
  flex-shrink: 0;
}

.footer-hint {
  color: #ccc;
}
</style>