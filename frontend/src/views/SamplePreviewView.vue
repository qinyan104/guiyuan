<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, provide, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import { getBuiltinSampleById } from '../data/builtinDynastySamples'
import { defaultSettings } from '../data/sampleFamily'
import { usePublicationState } from '../composables/usePublicationState'
import { createPublication } from '../api/publication'

import PublicationCanvas from '../components/PublicationCanvas.vue'
import FeedbackStrip from '../components/FeedbackStrip.vue'

const route = useRoute()
const router = useRouter()

const sampleId = computed(() => route.params.sampleId as string)
const sample = computed(() => getBuiltinSampleById(sampleId.value))

const clonedId = ref<number | null>(null)
const cloning = ref(false)
const cloneError = ref('')

const feedbackMessage = ref('')
const feedbackError = ref('')

const viewportPan = ref({ x: 0, y: 0 })

const pub = usePublicationState(
  sample.value?.publication ?? { title: '', subtitle: '', focusFamilyId: '', people: {}, families: {} } as any,
  defaultSettings,
)

// Stub history (no undo/redo for read-only preview)
const history = {
  undoChange: () => {},
  redoChange: () => {},
  scheduleHistoryCommit: () => {},
  initializeHistoryBaseline: () => {},
  disposeHistory: () => {},
  pushHistoryState: () => {},
}

const syncStatus = ref<'saved'>('saved')

provide('publication-context', {
  pub,
  history,
  syncStatus,
  saveToServer: () => Promise.resolve(),
  serverPublicationId: ref<number | null>(null),
  viewportPan,
})

// Watch for route param changes (unlikely but handle it)
watch(sampleId, (newId) => {
  const s = getBuiltinSampleById(newId)
  if (s) {
    pub.replaceReactiveObject(pub.publication, s.publication)
    pub.replaceReactiveObject(pub.settings, defaultSettings)
    pub.selectedPersonId.value = pub.getDefaultSelectedPersonId(s.publication)
  }
})

async function handleClone() {
  if (cloning.value || !sample.value) return
  cloning.value = true
  cloneError.value = ''

  const baseTitle = sample.value.publication.title || sample.value.label
  const newTitle = baseTitle + ' (副本)'

  try {
    const id = await createPublication(sample.value.publication, defaultSettings, newTitle)
    clonedId.value = id
    feedbackMessage.value = `已创建「${newTitle}」，正在跳转...`
    setTimeout(() => {
      router.push({ name: 'workbench', params: { id } })
    }, 1200)
  } catch (err: any) {
    cloneError.value = '创建失败: ' + (err.message || '未知错误')
    feedbackError.value = cloneError.value
  } finally {
    cloning.value = false
  }
}

function goBack() {
  router.push({ name: 'publications' })
}

// Keyboard shortcuts: Escape to go back
function handleKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape') {
    goBack()
  }
}

onMounted(() => {
  window.addEventListener('keydown', handleKeydown)
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', handleKeydown)
})

// Canvas interaction
const canvasRef = ref<InstanceType<typeof PublicationCanvas> | null>(null)
const publicationLayout = computed(() => pub.layout.value)

function handleSelectPerson(personId: string) {
  pub.selectedPersonId.value = personId
}

function handleUpdateZoom(zoom: number) {
  pub.settings.zoom = zoom
}
</script>

<template>
  <div class="sample-preview-root">
    <!-- Top bar -->
    <header class="preview-header">
      <div class="header-left">
        <button class="back-btn" title="返回谱系陈列馆" @click="goBack">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M19 12H5M12 19l-7-7 7-7" /></svg>
          <span>返回</span>
        </button>
        <div class="header-divider"></div>
        <div class="header-info">
          <span class="sample-badge">示例</span>
          <h2 class="sample-title">{{ sample?.publication.title || sample?.label || '未知示例' }}</h2>
          <span v-if="sample?.publication.subtitle" class="sample-subtitle">{{ sample.publication.subtitle }}</span>
        </div>
      </div>
      <div class="header-right">
        <button class="clone-btn" :disabled="cloning || !!clonedId" @click="handleClone">
          <svg v-if="cloning" class="spin" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10" stroke-dasharray="32" stroke-dashoffset="32" /></svg>
          <svg v-else width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="9" y="9" width="13" height="13" rx="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" /></svg>
          <span>{{ cloning ? '拓印中...' : clonedId ? '已拓印 ✓' : '拓印至我的典藏' }}</span>
        </button>
      </div>
    </header>

    <!-- Feedback -->
    <FeedbackStrip
      :statusMessage="feedbackMessage"
      :errorMessage="feedbackError"
      @dismiss="feedbackMessage = ''; feedbackError = ''"
    />

    <!-- Canvas area -->
    <div class="canvas-area">
      <PublicationCanvas
        ref="canvasRef"
        :publication="pub.publication"
        :settings="pub.settings"
        :layout="publicationLayout"
        :selectedPersonId="pub.selectedPersonId.value"
        :panX="viewportPan.x"
        :panY="viewportPan.y"
        @select-person="handleSelectPerson"
        @update-zoom="handleUpdateZoom"
        @update:pan-x="viewportPan.x = $event"
        @update:pan-y="viewportPan.y = $event"
      />
    </div>

    <!-- Bottom hint -->
    <div class="preview-hint">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="10" /><path d="M12 16v-4" /><path d="M12 8h.01" /></svg>
      <span>预览模式 — 拖拽平移 · 滚轮缩放 · 点击人物查看详情 · 按 <kbd>ESC</kbd> 返回</span>
    </div>
  </div>
</template>

<style scoped>
.sample-preview-root {
  height: 100%;
  display: flex;
  flex-direction: column;
  background: var(--bg-shell, #f5f0e8);
  position: relative;
}

/* ── Header ── */
.preview-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 20px;
  border-bottom: 1px solid var(--border-color, rgba(0,0,0,0.08));
  background: var(--glass-panel-bg, rgba(255,255,255,0.6));
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  flex-shrink: 0;
  z-index: 10;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 0;
}

.back-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: none;
  border: 1px solid var(--border-color, rgba(0,0,0,0.1));
  border-radius: 8px;
  padding: 6px 12px;
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--text-sub, #666);
  cursor: pointer;
  transition: all 0.2s;
  white-space: nowrap;
  flex-shrink: 0;
}
.back-btn:hover {
  background: var(--text-main, #1a1a1a);
  color: var(--bg-panel, #fff);
  border-color: var(--text-main);
}

.header-divider {
  width: 1px;
  height: 28px;
  background: var(--border-color, rgba(0,0,0,0.1));
  flex-shrink: 0;
}

.header-info {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
}

.sample-badge {
  font-size: 0.7rem;
  font-weight: 700;
  letter-spacing: 0.1em;
  color: #fff;
  background: var(--accent-amber, #a96e35);
  padding: 2px 8px;
  border-radius: 4px;
  flex-shrink: 0;
}

.sample-title {
  font-family: 'Noto Serif SC', serif;
  font-size: 1.15rem;
  font-weight: 700;
  color: var(--text-main, #1a1a1a);
  margin: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.sample-subtitle {
  font-size: 0.8rem;
  color: var(--text-soft, #888);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* ── Right side ── */
.header-right {
  flex-shrink: 0;
}

.clone-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: var(--text-main, #1a1a1a);
  color: var(--bg-panel, #fff);
  border: none;
  border-radius: 8px;
  padding: 8px 16px;
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  white-space: nowrap;
}
.clone-btn:hover:not(:disabled) {
  opacity: 0.85;
  transform: translateY(-1px);
}
.clone-btn:disabled {
  opacity: 0.5;
  cursor: default;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}
.spin {
  animation: spin 1s linear infinite;
}

/* ── Canvas ── */
.canvas-area {
  flex: 1;
  overflow: hidden;
  position: relative;
}

/* ── Bottom hint ── */
.preview-hint {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 8px 16px;
  font-size: 0.78rem;
  color: var(--text-soft, #888);
  border-top: 1px solid var(--border-color, rgba(0,0,0,0.06));
  background: var(--glass-panel-bg, rgba(255,255,255,0.4));
  flex-shrink: 0;
}
.preview-hint kbd {
  display: inline-block;
  padding: 1px 6px;
  font-family: inherit;
  font-size: 0.75rem;
  font-weight: 700;
  background: var(--bg-panel, #fff);
  border: 1px solid var(--border-color, rgba(0,0,0,0.12));
  border-radius: 4px;
  margin: 0 2px;
}

/* ── Dark theme overrides ── */
:global([data-theme="ink-wash"]) .preview-header,
:global([data-theme="rosewood"]) .preview-header,
:global([data-theme="star-sea"]) .preview-header {
  background: rgba(0, 0, 0, 0.4);
  border-color: rgba(255,255,255,0.06);
}
:global([data-theme="ink-wash"]) .back-btn,
:global([data-theme="rosewood"]) .back-btn,
:global([data-theme="star-sea"]) .back-btn {
  border-color: rgba(255,255,255,0.15);
  color: rgba(255,255,255,0.7);
}
:global([data-theme="ink-wash"]) .back-btn:hover,
:global([data-theme="rosewood"]) .back-btn:hover,
:global([data-theme="star-sea"]) .back-btn:hover {
  background: #fff;
  color: #000;
}
:global([data-theme="ink-wash"]) .preview-hint,
:global([data-theme="rosewood"]) .preview-hint,
:global([data-theme="star-sea"]) .preview-hint {
  background: rgba(0, 0, 0, 0.3);
}
:global([data-theme="ink-wash"]) .preview-hint kbd,
:global([data-theme="rosewood"]) .preview-hint kbd,
:global([data-theme="star-sea"]) .preview-hint kbd {
  background: rgba(0,0,0,0.4);
  border-color: rgba(255,255,255,0.15);
}
</style>
