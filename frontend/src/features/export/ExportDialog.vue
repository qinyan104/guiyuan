<!-- src/features/export/ExportDialog.vue -->
<template>
  <div v-if="modelValue" class="export-dialog-backdrop" @click.self="$emit('update:modelValue', false)">
    <div class="export-dialog">
      <header class="dialog-header">
        <h2>导出与发布</h2>
        <button class="close-btn" @click="$emit('update:modelValue', false)">&times;</button>
      </header>

      <div class="tabs">
        <button 
          @click="activeTab = 'pdf-single'" 
          :class="['tab-btn', { active: activeTab === 'pdf-single' }]"
        >
          单页矢量 PDF
        </button>
        <button 
          @click="activeTab = 'svg'" 
          :class="['tab-btn', { active: activeTab === 'svg' }]"
        >
          矢量 SVG
        </button>
        <button 
          @click="activeTab = 'pdf'" 
          :class="['tab-btn', { active: activeTab === 'pdf' }]"
        >
          谱书 PDF
        </button>
      </div>
      
      <div v-if="activeTab === 'pdf-single'" class="tab-content">
         <p class="description">导出为全尺寸、单页的无损矢量 PDF。无论怎么放大都不会模糊，非常适合在电脑和平板上全景拖拽浏览，或直接发给专业打印店。</p>
         <div class="actions">
           <button class="btn btn--primary" @click="emitExportPdfSingle" :disabled="isProcessing">
             {{ isProcessing ? '正在生成 PDF...' : '一键导出 PDF' }}
           </button>
         </div>
      </div>

      <div v-if="activeTab === 'svg'" class="tab-content">
         <p class="description">导出为无限放大的矢量文件。这是最保真的格式，适合专业排版、印刷或作为原始备份。</p>
         <div class="actions">
           <button class="btn btn--primary" @click="$emit('export-svg')" :disabled="isProcessing">
             立即下载矢量 SVG
           </button>
         </div>
      </div>

      <div v-if="activeTab === 'pdf'" class="tab-content">
         <p class="description">进入“谱书实验室”，在线预览、修改文字内容，并生成多页 A4 格式的 PDF 电子谱书。</p>
         <div class="options-group">
           <label class="checkbox-label">
             <input type="checkbox" v-model="pdfOptions.includeBios"> 包含人物传记
           </label>
         </div>
         <div class="actions">
           <button class="btn btn--primary" @click="emitPreviewPdf">
             进入打印预览与编辑
           </button>
         </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue'

defineProps<{ 
  modelValue: boolean,
  isProcessing?: boolean 
}>()

const emit = defineEmits(['update:modelValue', 'export-pdf-single', 'export-svg', 'preview-pdf'])

const activeTab = ref<'pdf-single' | 'svg' | 'pdf'>('pdf-single')

const pdfOptions = reactive({
  includeBios: true
})

function emitExportPdfSingle() {
  emit('export-pdf-single')
}

function emitPreviewPdf() {
  emit('preview-pdf', { ...pdfOptions })
}
</script>

<style scoped>
.export-dialog-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(255, 255, 255, 0.85);
  backdrop-filter: blur(8px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2000;
  animation: fadeIn 0.3s ease-out;
}

.export-dialog {
  background: #ffffff;
  padding: 60px;
  border-radius: 2px;
  min-width: 520px;
  max-width: 600px;
  box-shadow: 0 40px 100px rgba(0, 0, 0, 0.03), 0 10px 30px rgba(0, 0, 0, 0.02);
  border: 1px solid #f0f0f2;
  animation: slideUp 0.4s cubic-bezier(0.165, 0.84, 0.44, 1);
}

.dialog-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 40px;
}

.dialog-header h2 {
  margin: 0;
  font-size: 1.25rem;
  font-weight: 900;
  letter-spacing: 0.1em;
  color: #000;
  text-transform: uppercase;
}

.close-btn {
  background: none;
  border: none;
  font-size: 2rem;
  color: #ccc;
  cursor: pointer;
  padding: 0;
  line-height: 1;
  transition: color 0.2s;
}

.close-btn:hover {
  color: #000;
}

.tabs {
  display: flex;
  gap: 4px;
  margin-bottom: 40px;
  border-bottom: 1px solid #f0f0f2;
  padding-bottom: 0;
}

.tab-btn {
  padding: 12px 24px;
  border: none;
  background: none;
  font-size: 0.75rem;
  font-weight: 800;
  letter-spacing: 0.1em;
  color: #bbb;
  cursor: pointer;
  transition: all 0.2s;
  border-bottom: 2px solid transparent;
  text-transform: uppercase;
}

.tab-btn.active {
  color: #000;
  border-bottom-color: #000;
}

.tab-btn:hover:not(.active) {
  color: #888;
}

.description {
  font-size: 0.85rem;
  color: #888;
  line-height: 1.8;
  margin-bottom: 32px;
}

.options-group {
  margin-bottom: 24px;
}

.options-group label {
  display: block;
  font-size: 0.7rem;
  font-weight: 800;
  color: #999;
  letter-spacing: 0.1em;
  margin-bottom: 12px;
  text-transform: uppercase;
}

.options-group select {
  width: 100%;
  padding: 14px 20px;
  border-radius: 2px;
  border: none;
  background: #f8f8f9;
  color: #000;
  font-weight: 600;
  outline: none;
}

.checkbox-label {
  display: flex !important;
  align-items: center;
  gap: 12px;
  cursor: pointer;
  font-size: 0.85rem;
  font-weight: 600;
  color: #666;
}

.checkbox-label input {
  accent-color: #000;
}

.actions {
  margin-top: 48px;
}

.btn {
  width: 100%;
  padding: 18px;
  border-radius: 2px;
  font-size: 0.75rem;
  font-weight: 800;
  letter-spacing: 0.1em;
  cursor: pointer;
  transition: all 0.2s;
  border: none;
  text-transform: uppercase;
}

.btn--primary {
  background: #000;
  color: white;
}

.btn--primary:hover {
  opacity: 0.9;
}

.btn--primary:disabled {
  background: #eee;
  color: #ccc;
  cursor: not-allowed;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes slideUp {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}
</style>

