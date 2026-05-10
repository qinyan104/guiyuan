<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { getPublication } from '../api/publication'
import PublicationCanvas from './PublicationCanvas.vue'
import type { PublicationData, Person } from '../types/family'

const props = defineProps<{
  modelValue: boolean
  publicationId: number
  publicationTitle?: string
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  selected: [personDbId: number, personName: string]
  cancel: []
}>()

const loading = ref(true)
const error = ref<string | null>(null)
const publicationData = ref<PublicationData | null>(null)
const selectedPersonId = ref<string | null>(null)
const selectedPersonName = ref<string | null>(null)
// The selectedPersonDbId is hidden in the person object's metadata or derived from the person ID
// Actually, our API returns the person entities with their "id" being the personId (string).
// We need to find the database ID (Long) for Task 2/4.
// Let's check how the backend sends it. The backend currently doesn't include the DB ID in the JSON people objects.
// Wait, I might need to update the PublicationTreeLoader to include the DB ID in a hidden field.

function onNodeClick(person: Person) {
  selectedPersonId.ref = person.id
  selectedPersonName.value = person.name
}

async function loadData() {
  loading.value = true
  error.value = null
  try {
    const result = await getPublication(props.publicationId)
    publicationData.value = result.publication
  } catch (e: any) {
    error.value = e.message || '加载族谱失败'
  } finally {
    loading.value = false
  }
}

function onConfirm() {
  if (selectedPersonId.value && publicationData.value) {
    // We need the DB ID. We'll have to get it from the person object if we add it, 
    // or the backend needs to provide a way to map personId -> dbId.
    // Let's assume for now we'll add 'dbId' to the person JSON in PublicationTreeLoader.
    const person = publicationData.value.people[selectedPersonId.value]
    const dbId = (person as any).dbId 
    if (dbId) {
      emit('selected', dbId, person.name)
      emit('update:modelValue', false)
    } else {
      // Fallback: If dbId is missing (legacy/not yet updated), we might have an issue.
      // But we just updated the backend to support selective loading, let's update TreeLoader too.
      console.error('Missing dbId for person', selectedPersonId.value)
    }
  }
}

function onCancel() {
  emit('cancel')
  emit('update:modelValue', false)
}

onMounted(() => {
  if (props.modelValue) {
    loadData()
  }
})
</script>

<template>
  <Teleport to="body">
    <div v-if="modelValue" class="selector-overlay" @click.self="onCancel">
      <div class="selector-dialog">
        <header class="selector-header">
          <div class="header-main">
            <h3>选择子树起点</h3>
            <span class="pub-title" v-if="publicationTitle">{{ publicationTitle }}</span>
          </div>
          <p class="header-hint">
            请在下方预览图中选择一个人物作为合并或查看的起点。选定后，将仅包含该人物及其后代。
          </p>
        </header>

        <main class="selector-content">
          <div v-if="loading" class="state-placeholder">
            <div class="spinner"></div>
            <p>正在加载族谱数据...</p>
          </div>
          <div v-else-if="error" class="state-placeholder error">
            <p>{{ error }}</p>
            <button @click="loadData" class="retry-btn">重试</button>
          </div>
          <div v-else-if="publicationData" class="canvas-container">
            <PublicationCanvas 
              :publication="publicationData" 
              read-only
              :highlight-person-id="selectedPersonId"
              @node-click="onNodeClick"
            />
          </div>
        </main>

        <footer class="selector-footer">
          <div class="selection-status">
            <template v-if="selectedPersonName">
              已选中：<span class="selected-name">{{ selectedPersonName }}</span>
            </template>
            <template v-else>
              未选择任何人物
            </template>
          </div>
          <div class="actions">
            <button class="action-btn cancel" @click="onCancel">取消</button>
            <button 
              class="action-btn confirm" 
              :disabled="!selectedPersonId"
              @click="onConfirm"
            >
              确认选择
            </button>
          </div>
        </footer>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.selector-overlay {
  position: fixed;
  inset: 0;
  z-index: 9999;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(4px);
}

.selector-dialog {
  background: #fdfaf6; /* Ancient paper color */
  width: 90vw;
  height: 90vh;
  border-radius: 16px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  box-shadow: 0 12px 48px rgba(0, 0, 0, 0.3);
  border: 1px solid #e0d5c1;
}

.selector-header {
  padding: 20px 24px;
  background: #fff;
  border-bottom: 1px solid #eee;
}

.header-main {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 4px;
}

.header-main h3 {
  margin: 0;
  font-size: 1.25rem;
  color: #333;
}

.pub-title {
  font-size: 0.9rem;
  color: #888;
  background: #f5f5f5;
  padding: 2px 8px;
  border-radius: 4px;
}

.header-hint {
  margin: 0;
  font-size: 0.85rem;
  color: #666;
}

.selector-content {
  flex: 1;
  position: relative;
  overflow: hidden;
  background: #fcf9f2;
}

.state-placeholder {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: #888;
}

.spinner {
  width: 40px;
  height: 40px;
  border: 3px solid #f3f3f3;
  border-top: 3px solid #8b4513;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 12px;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.canvas-container {
  width: 100%;
  height: 100%;
}

.selector-footer {
  padding: 16px 24px;
  background: #fff;
  border-top: 1px solid #eee;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.selection-status {
  font-size: 0.95rem;
  color: #555;
}

.selected-name {
  color: #8b4513;
  font-weight: 700;
}

.actions {
  display: flex;
  gap: 12px;
}

.action-btn {
  padding: 10px 24px;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  border: 1px solid transparent;
}

.action-btn.cancel {
  background: #f5f5f5;
  color: #666;
}

.action-btn.cancel:hover {
  background: #eee;
}

.action-btn.confirm {
  background: #8b4513;
  color: #fff;
}

.action-btn.confirm:hover:not(:disabled) {
  background: #6f3710;
}

.action-btn.confirm:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.retry-btn {
  margin-top: 12px;
  padding: 6px 16px;
  background: #8b4513;
  color: #fff;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}
</style>
