<script setup lang="ts">
import { ref, reactive, computed, onMounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import { getSharePublication, getShareMeta, getSharePhotoUrl } from '../api/share'
import { usePublicationState } from '../composables/usePublicationState'
import { layoutPublication } from '../lib/layout'
import PublicationCanvas from '../components/PublicationCanvas.vue'
import type { PublicationData, PublicationSettings } from '../types/family'

const route = useRoute()
const token = computed(() => route.params.token as string)

const loading = ref(true)
const error = ref<string | null>(null)
const errorCode = ref<number | null>(null)
const meta = ref<{ title?: string; subtitle?: string; expiresAt?: string; allowExport?: boolean } | null>(null)

const DEFAULT_SETTINGS: PublicationSettings = {
  paper: 'A3',
  layoutMode: 'modern',
  cardWidth: 160,
  generationGap: 100,
  siblingGap: 40,
  partnerGap: 20,
  fontScale: 1,
  zoom: 1,
  showDeath: true,
  showAge: true,
  showNote: true,
  showPhoto: true,
  paddingX: 40,
  paddingY: 40,
}

const EMPTY_PUBLICATION: PublicationData = {
  title: '',
  subtitle: '',
  focusFamilyId: '',
  people: {},
  families: {},
}

const pub = usePublicationState(EMPTY_PUBLICATION, DEFAULT_SETTINGS)
const layout = computed(() => pub.layout.value)
const panX = ref(0)
const panY = ref(0)

async function load() {
  loading.value = true
  error.value = null
  errorCode.value = null
  try {
    const [data, metaData] = await Promise.all([
      getSharePublication(token.value),
      getShareMeta(token.value),
    ])
    meta.value = metaData
    const publicationData = data.publication as PublicationData
    const settingsData = (data.settings || DEFAULT_SETTINGS) as PublicationSettings

    // Rewrite photo URLs to use share proxy
    for (const person of Object.values(publicationData.people)) {
      if (person.avatarUrl && person.avatarUrl.startsWith('/api/photos/')) {
        const photoId = person.avatarUrl.split('/').pop()
        if (photoId) {
          person.avatarUrl = getSharePhotoUrl(token.value, Number(photoId))
        }
      }
    }

    pub.replaceReactiveObject(pub.publication, publicationData)
    pub.replaceReactiveObject(pub.settings, settingsData)
    pub.selectedPersonId.value = pub.getDefaultSelectedPersonId(publicationData)
  } catch (err: any) {
    const status = err.response?.status
    errorCode.value = status ?? null
    if (status === 404) {
      error.value = '分享链接不存在或已失效。'
    } else if (status === 410) {
      error.value = '分享链接已过期或已被撤销。'
    } else {
      error.value = err.message || '加载失败，请稍后重试。'
    }
  } finally {
    loading.value = false
  }
}

onMounted(load)
watch(token, load)

function handleSelectPerson(personId: string) {
  pub.selectedPersonId.value = personId
}
</script>

<template>
  <div class="share-view">
    <!-- Loading -->
    <div v-if="loading" class="share-overlay">
      <div class="spinner"></div>
      <p>正在加载族谱...</p>
    </div>

    <!-- Error -->
    <div v-else-if="error" class="share-overlay share-error">
      <div class="error-icon">
        <template v-if="errorCode === 404">🔗</template>
        <template v-else-if="errorCode === 410">⏰</template>
        <template v-else>⚠️</template>
      </div>
      <h2>{{ errorCode === 404 ? '链接无效' : errorCode === 410 ? '链接已失效' : '加载失败' }}</h2>
      <p>{{ error }}</p>
    </div>

    <!-- Content -->
    <template v-else>
      <header class="share-header">
        <div class="share-header-content">
          <h1>{{ pub.publication.title || '未命名族谱' }}</h1>
          <p v-if="pub.publication.subtitle" class="subtitle">{{ pub.publication.subtitle }}</p>
          <div v-if="meta" class="meta-tags">
            <span v-if="pub.publication.info?.ancestralOrigin" class="tag">{{ pub.publication.info.ancestralOrigin }}</span>
            <span v-if="pub.publication.info?.hallName" class="tag">{{ pub.publication.info.hallName }}</span>
            <span v-if="pub.publication.info?.familyMotto" class="tag">{{ pub.publication.info.familyMotto }}</span>
          </div>
        </div>
      </header>

      <div class="share-canvas-wrapper">
        <PublicationCanvas
          :publication="pub.publication"
          :settings="pub.settings"
          :layout="layout"
          :selectedPersonId="pub.selectedPersonId.value"
          :panX="panX"
          :panY="panY"
          @select-person="handleSelectPerson"
          @update:panX="panX = $event"
          @update:panY="panY = $event"
        />
      </div>

      <footer class="share-footer">
        <span>{{ pub.totalPeople }} 人</span>
        <span v-if="meta?.expiresAt">· 有效期至 {{ new Date(meta.expiresAt).toLocaleDateString() }}</span>
      </footer>
    </template>
  </div>
</template>

<style scoped>
.share-view {
  width: 100vw;
  height: 100vh;
  display: flex;
  flex-direction: column;
  background: var(--canvas-bg, #f8f6f0);
  overflow: hidden;
}

.share-overlay {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;
  color: var(--text-secondary, #666);
}

.spinner {
  width: 32px;
  height: 32px;
  border: 3px solid var(--border-light, #e0e0e0);
  border-top-color: var(--accent, #4a90d9);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.share-error {
  text-align: center;
}

.error-icon {
  font-size: 48px;
  line-height: 1;
}

.share-error h2 {
  margin: 0;
  font-size: 1.25rem;
  color: var(--text-primary, #333);
}

.share-error p {
  margin: 0;
  color: var(--text-secondary, #666);
}

.share-header {
  padding: 16px 24px;
  background: var(--glass-panel-bg, rgba(255,255,255,0.85));
  backdrop-filter: blur(12px);
  border-bottom: 1px solid var(--border-light, #e8e6e0);
  z-index: 10;
}

.share-header-content h1 {
  margin: 0;
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--text-primary, #333);
}

.share-header-content .subtitle {
  margin: 4px 0 0;
  font-size: 0.875rem;
  color: var(--text-secondary, #666);
}

.meta-tags {
  display: flex;
  gap: 8px;
  margin-top: 8px;
  flex-wrap: wrap;
}

.tag {
  padding: 2px 10px;
  font-size: 0.75rem;
  background: var(--tag-bg, rgba(0,0,0,0.04));
  border-radius: 12px;
  color: var(--text-secondary, #666);
}

.share-canvas-wrapper {
  flex: 1;
  position: relative;
  overflow: hidden;
}

.share-footer {
  padding: 8px 24px;
  text-align: center;
  font-size: 0.75rem;
  color: var(--text-tertiary, #999);
  background: var(--glass-panel-bg, rgba(255,255,255,0.85));
  border-top: 1px solid var(--border-light, #e8e6e0);
}
</style>
