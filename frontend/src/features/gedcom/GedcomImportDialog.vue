<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { importGedcom, mergeGedcom, type GedcomImportResult, type GedcomMergeResult } from './gedcom'

const props = defineProps<{
  visible: boolean
  currentPubId?: number | null
}>()

const emit = defineEmits<{
  (e: 'update:visible', value: boolean): void
  (e: 'imported', result: GedcomImportResult | GedcomMergeResult): void
}>()

const router = useRouter()
const fileInput = ref<HTMLInputElement | null>(null)
const selectedFile = ref<File | null>(null)
const importMode = ref<'new' | 'merge'>('new')
const loading = ref(false)
const error = ref<string | null>(null)
const result = ref<GedcomImportResult | GedcomMergeResult | null>(null)
const isDragOver = ref(false)

const displayVisible = computed({
  get: () => props.visible,
  set: (v: boolean) => emit('update:visible', v),
})

function onFileSelect(e: Event) {
  const input = e.target as HTMLInputElement
  if (input.files && input.files.length > 0) {
    const file = input.files[0]
    if (file.size > 10 * 1024 * 1024) { error.value = '文件过大，请上传 10MB 以内的文件'; return }
    selectedFile.value = file
    error.value = null
    result.value = null
  }
}

function onDrop(e: DragEvent) {
  isDragOver.value = false
  const files = e.dataTransfer?.files
  if (files && files.length > 0) {
    const file = files[0]
    if (file.size > 10 * 1024 * 1024) { error.value = '文件过大，请上传 10MB 以内的文件'; return }
    selectedFile.value = file
    error.value = null
    result.value = null
  }
}

function onDragOver(e: DragEvent) {
  e.preventDefault()
  isDragOver.value = true
}

function onDragLeave() {
  isDragOver.value = false
}

async function handleImport() {
  if (!selectedFile.value) return

  loading.value = true
  error.value = null
  result.value = null

  try {
    if (importMode.value === 'merge' && props.currentPubId) {
      result.value = await mergeGedcom(props.currentPubId, selectedFile.value)
    } else {
      result.value = await importGedcom(selectedFile.value)
    }
    emit('imported', result.value)
  } catch (err: unknown) {
    error.value = err instanceof Error ? err.message : '导入失败，请检查文件格式'
  } finally {
    loading.value = false
  }
}

function goToPublication() {
  if (result.value && 'pubId' in result.value) {
    displayVisible.value = false
    router.push(`/publication/${result.value.pubId}`)
  }
}

function reset() {
  selectedFile.value = null
  error.value = null
  result.value = null
  loading.value = false
}

function handleClose() {
  reset()
  displayVisible.value = false
}
</script>

<template>
  <Teleport to="body">
    <Transition name="dialog-fade">
      <div
        v-if="displayVisible"
        class="gedcom-overlay"
        role="dialog"
        aria-modal="true"
        aria-label="GEDCOM 导入"
        @click.self="handleClose"
        @keydown.escape="handleClose"
      >
        <div class="gedcom-dialog">
          <header class="gedcom-dialog__header">
            <h2>导入 GEDCOM 文件</h2>
            <button class="close-btn" @click="handleClose" aria-label="关闭">×</button>
          </header>

          <div class="gedcom-dialog__body">
            <!-- 未选择文件：显示上传区域 -->
            <div
              v-if="!selectedFile && !result"
              class="drop-zone"
              :class="{ 'drop-zone--active': isDragOver }"
              @drop.prevent="onDrop"
              @dragover="onDragOver"
              @dragleave="onDragLeave"
              @click="fileInput?.click()"
            >
              <input
                ref="fileInput"
                type="file"
                accept=".ged,.GED"
                style="display: none"
                @change="onFileSelect"
              />
              <div class="drop-zone__icon">📄</div>
              <p class="drop-zone__text">
                拖拽 .ged 文件到此处，或点击选择文件
              </p>
              <p class="drop-zone__hint">
                支持 GEDCOM 5.5 格式，兼容大多数族谱软件导出的文件
              </p>
            </div>

            <!-- 已选择文件：显示文件信息和导入选项 -->
            <div v-if="selectedFile && !result" class="file-info">
              <div class="file-info__detail">
                <span class="file-info__icon">📄</span>
                <div>
                  <p class="file-info__name">{{ selectedFile.name }}</p>
                  <p class="file-info__size">
                    {{ (selectedFile.size / 1024).toFixed(1) }} KB
                  </p>
                </div>
              </div>

              <button class="change-file-btn" @click="selectedFile = null">
                更换文件
              </button>

              <!-- 导入模式选择 -->
              <div class="import-mode">
                <label class="mode-option">
                  <input
                    v-model="importMode"
                    type="radio"
                    value="new"
                  />
                  <span class="mode-option__label">
                    <strong>创建新族谱</strong>
                    <small>从 GEDCOM 文件创建一个全新的族谱</small>
                  </span>
                </label>

                <label
                  class="mode-option"
                  :class="{ 'mode-option--disabled': !currentPubId }"
                >
                  <input
                    v-model="importMode"
                    type="radio"
                    value="merge"
                    :disabled="!currentPubId"
                  />
                  <span class="mode-option__label">
                    <strong>合并到当前族谱</strong>
                    <small>将 GEDCOM 中的人物和家庭添加到当前族谱（跳过已存在的）</small>
                  </span>
                </label>
              </div>

              <!-- 错误提示 -->
              <div v-if="error" class="error-message">
                <span class="error-icon">⚠️</span>
                {{ error }}
              </div>

              <!-- 导入按钮 -->
              <button
                class="import-btn"
                :disabled="loading"
                @click="handleImport"
              >
                {{ loading ? '导入中...' : '开始导入' }}
              </button>
            </div>

            <!-- 导入成功：显示结果 -->
            <div v-if="result" class="import-result">
              <div class="result-header">
                <span class="result-icon">✅</span>
                <h3>导入成功</h3>
              </div>

              <div class="result-stats">
                <div class="stat">
                  <span class="stat__value">{{ 'personCount' in result ? result.personCount : result.newPersons }}</span>
                  <span class="stat__label">个人物</span>
                </div>
                <div class="stat">
                  <span class="stat__value">{{ 'familyCount' in result ? result.familyCount : result.newFamilies }}</span>
                  <span class="stat__label">个家庭</span>
                </div>
              </div>

              <!-- 警告信息 -->
              <div v-if="result.warnings.length > 0" class="warnings">
                <p class="warnings__title">⚠️ {{ result.warnings.length }} 条提醒：</p>
                <ul class="warnings__list">
                  <li v-for="(w, i) in result.warnings" :key="i">{{ w }}</li>
                </ul>
              </div>

              <div class="result-actions">
                <button
                  v-if="'pubId' in result"
                  class="go-btn"
                  @click="goToPublication"
                >
                  查看族谱 →
                </button>
                <button class="again-btn" @click="reset">
                  继续导入
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.gedcom-overlay {
  position: fixed;
  inset: 0;
  z-index: var(--z-modal);
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--color-overlay);
  backdrop-filter: blur(4px);
}

.gedcom-dialog {
  width: 480px;
  max-width: 92vw;
  max-height: 85vh;
  overflow-y: auto;
  background: var(--color-neutral-1);
  border: 1px solid var(--border-color, rgba(111, 89, 67, 0.2));
  border-radius: var(--radius-lg);
  box-shadow: 0 24px 64px rgba(0, 0, 0, 0.2);
}

.gedcom-dialog__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 24px 16px;
  border-bottom: 1px solid var(--border-color, rgba(111, 89, 67, 0.12));
}

.gedcom-dialog__header h2 {
  margin: 0;
  font-size: 18px;
  font-weight: 700;
  color: var(--text-main, #241a10);
}

.close-btn {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: none;
  border: none;
  border-radius: 6px;
  font-size: 20px;
  color: var(--text-soft, #8a6845);
  cursor: pointer;
  transition: background 0.15s;
}

.close-btn:hover {
  background: rgba(0, 0, 0, 0.06);
}

.gedcom-dialog__body {
  padding: 20px 24px 24px;
}

/* 拖拽上传区域 */
.drop-zone {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px 24px;
  border: 2px dashed var(--border-color, rgba(111, 89, 67, 0.25));
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.2s;
  text-align: center;
}

.drop-zone:hover,
.drop-zone--active {
  border-color: var(--color-accent);
  background: color-mix(in srgb, var(--color-accent) 4%, transparent);
}

.drop-zone__icon {
  font-size: 40px;
  margin-bottom: 12px;
}

.drop-zone__text {
  margin: 0 0 8px;
  font-size: 15px;
  font-weight: 600;
  color: var(--text-main, #241a10);
}

.drop-zone__hint {
  margin: 0;
  font-size: 13px;
  color: var(--text-soft, #8a6845);
}

/* 文件信息 */
.file-info {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.file-info__detail {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 16px;
  background: rgba(0, 0, 0, 0.03);
  border-radius: 8px;
}

.file-info__icon {
  font-size: 28px;
}

.file-info__name {
  margin: 0;
  font-size: 14px;
  font-weight: 600;
  color: var(--text-main, #241a10);
  word-break: break-all;
}

.file-info__size {
  margin: 2px 0 0;
  font-size: 12px;
  color: var(--text-soft, #8a6845);
}

.change-file-btn {
  align-self: flex-start;
  padding: 6px 12px;
  background: none;
  border: 1px solid var(--border-color, rgba(111, 89, 67, 0.2));
  border-radius: 6px;
  font-size: 13px;
  color: var(--text-soft, #8a6845);
  cursor: pointer;
}

.change-file-btn:hover {
  border-color: var(--color-accent);
  color: var(--color-accent);
}

/* 导入模式 */
.import-mode {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.mode-option {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 12px 14px;
  border: 1px solid var(--border-color, rgba(111, 89, 67, 0.15));
  border-radius: 8px;
  cursor: pointer;
  transition: border-color 0.15s;
}

.mode-option:hover {
  border-color: var(--color-accent);
}

.mode-option--disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.mode-option input[type="radio"] {
  margin-top: 3px;
  accent-color: var(--color-accent);
}

.mode-option__label {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.mode-option__label strong {
  font-size: 14px;
  color: var(--text-main, #241a10);
}

.mode-option__label small {
  font-size: 12px;
  color: var(--text-soft, #8a6845);
}

/* 错误提示 */
.error-message {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 10px 14px;
  background: rgba(220, 53, 69, 0.08);
  border: 1px solid rgba(220, 53, 69, 0.2);
  border-radius: 8px;
  font-size: 13px;
  color: #a71d2a;
}

.error-icon {
  flex-shrink: 0;
}

/* 导入按钮 */
.import-btn {
  width: 100%;
  padding: 12px;
  background: var(--color-accent);
  border: none;
  border-radius: 8px;
  font-size: 15px;
  font-weight: 600;
  color: white;
  cursor: pointer;
  transition: opacity 0.15s;
}

.import-btn:hover:not(:disabled) {
  opacity: 0.9;
}

.import-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

/* 导入结果 */
.import-result {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.result-header {
  display: flex;
  align-items: center;
  gap: 10px;
}

.result-icon {
  font-size: 24px;
}

.result-header h3 {
  margin: 0;
  font-size: 18px;
  color: var(--text-main, #241a10);
}

.result-stats {
  display: flex;
  gap: 24px;
}

.stat {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 16px 24px;
  background: rgba(0, 0, 0, 0.03);
  border-radius: 8px;
}

.stat__value {
  font-size: 28px;
  font-weight: 700;
  color: var(--color-accent);
}

.stat__label {
  font-size: 13px;
  color: var(--text-soft, #8a6845);
}

/* 警告 */
.warnings {
  padding: 12px 14px;
  background: rgba(255, 193, 7, 0.08);
  border: 1px solid rgba(255, 193, 7, 0.2);
  border-radius: 8px;
}

.warnings__title {
  margin: 0 0 8px;
  font-size: 13px;
  font-weight: 600;
  color: #856404;
}

.warnings__list {
  margin: 0;
  padding-left: 18px;
  font-size: 12px;
  color: #856404;
  line-height: 1.6;
}

/* 结果操作按钮 */
.result-actions {
  display: flex;
  gap: 10px;
}

.go-btn {
  flex: 1;
  padding: 10px 16px;
  background: var(--color-accent);
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
  color: white;
  cursor: pointer;
}

.go-btn:hover {
  opacity: 0.9;
}

.again-btn {
  padding: 10px 16px;
  background: none;
  border: 1px solid var(--border-color, rgba(111, 89, 67, 0.2));
  border-radius: 8px;
  font-size: 14px;
  color: var(--text-soft, #8a6845);
  cursor: pointer;
}

.again-btn:hover {
  border-color: var(--color-accent);
  color: var(--color-accent);
}

/* 过渡动画 */
.dialog-fade-enter-active,
.dialog-fade-leave-active {
  transition: opacity 0.2s ease;
}

.dialog-fade-enter-from,
.dialog-fade-leave-to {
  opacity: 0;
}

@media (prefers-reduced-motion: reduce) {
  .close-btn,
  .drop-zone,
  .mode-option,
  .import-btn {
    transition: none;
  }

  .dialog-fade-enter-active,
  .dialog-fade-leave-active {
    transition: none;
  }
}
</style>
