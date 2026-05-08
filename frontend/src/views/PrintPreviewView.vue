<!-- src/views/PrintPreviewView.vue -->
<template>
  <div class="print-preview-container">
    <header class="preview-header">
      <div class="header-left">
        <button class="back-btn" @click="goBack">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15 18 9 12 15 6"></polyline></svg>
          返回画布
        </button>
        <h2>谱书实验室 <span class="badge">Beta</span></h2>
      </div>
      <div class="actions">
        <div class="status-indicator" v-if="isGenerating">
          <svg class="spinner" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
          正在生成 PDF...
        </div>
        <button class="btn btn--primary" @click="generatePdf" :disabled="isGenerating">
          确认无误，生成 PDF
        </button>
      </div>
    </header>

    <main class="preview-layout">
      <aside class="preview-sidebar">
        <section class="sidebar-section">
          <h3>页面管理</h3>
          <ul class="page-nav">
            <li :class="{ active: activeSection === 'preface' }" @click="scrollTo('preface')">家族简介</li>
            <li :class="{ active: activeSection === 'bios' }" @click="scrollTo('bios')">家族成员志</li>
            <li :class="{ active: activeSection === 'tree' }" @click="scrollTo('tree')">世系图预览</li>
          </ul>
        </section>

        <section class="sidebar-section">
          <h3>打印设置</h3>
          <div class="control-group">
            <label>纸张尺寸</label>
            <select disabled>
              <option>A4 (210 x 297 mm)</option>
            </select>
          </div>
          <div class="control-group">
            <label>字体风格</label>
            <select v-model="fontStyle">
              <option value="serif">传统衬线体 (宋体)</option>
              <option value="sans">现代黑体</option>
            </select>
          </div>
        </section>

        <div class="sidebar-info">
          <p>提示：在此处编辑的文字仅用于本次导出，不会修改原始族谱数据。</p>
        </div>
      </aside>

      <div class="preview-viewport" ref="viewport">
        <!-- 第1页：前言 -->
        <div class="a4-page" id="section-preface">
          <div class="page-content">
            <h1 class="page-title" contenteditable="true" @blur="onTitleBlur">{{ editedTitle }}</h1>
            <div class="divider"></div>
            <p class="section-hint">点击下方区域编辑家族前言或简介：</p>
            <textarea 
              v-model="editedPreface" 
              class="editable-text preface-text"
              placeholder="在此输入家族历史、祖训或导出说明..."
            ></textarea>
          </div>
          <div class="page-footer">第 1 页</div>
        </div>

        <!-- 第2页：成员志 -->
        <div class="a4-page" id="section-bios" v-if="exportData?.options.includeBios">
          <div class="page-content">
            <h2 class="section-title">家族成员志</h2>
            <div class="divider"></div>
            <p class="section-hint">已自动根据族谱生成名录，您可以手动微调排版或补充轶事：</p>
            <textarea 
              v-model="editedBios" 
              class="editable-text bios-text"
            ></textarea>
          </div>
          <div class="page-footer">第 2 页</div>
        </div>

        <!-- 第3页：世系图 -->
        <div class="a4-page a4-page--landscape" id="section-tree">
          <div class="page-content">
            <h2 class="section-title">世系全图 (切片预览)</h2>
            <div class="divider"></div>
            <div class="tree-preview-container">
              <img v-if="exportData?.base64Image" :src="exportData.base64Image" class="tree-img" />
              <div class="slicing-overlay">
                <div class="slice-grid"></div>
                <p class="slicing-hint">后端将自动按网格切分为 6-12 个页面</p>
              </div>
            </div>
          </div>
          <div class="page-footer">第 3 页 (及后续切片页)</div>
        </div>
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, inject, computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { buildAuthHeaders } from '../api/auth'
import type { Person } from '../types/family'
import { useExportState } from '../features/export/useExportState'

const router = useRouter()
const route = useRoute()
const { getExportData } = useExportState()

// Inject context from PublicationLayout
const context = inject<any>('publication-context')
const pub = context?.pub

const exportData = getExportData()
const isGenerating = ref(false)
const activeSection = ref('preface')
const fontStyle = ref('serif')

const editedTitle = ref('')
const editedPreface = ref('')
const editedBios = ref('')

onMounted(() => {
  if (!exportData) {
    alert('缺少导出数据，请返回画布重新点击“导出”')
    router.replace(`/publications/${route.params.id}`)
    return
  }

  // Initialize data from publication context
  editedTitle.value = pub?.publication?.title || '未命名族谱'
  editedPreface.value = `本文档由族谱管理系统于 ${new Date().toLocaleDateString()} 生成。\n\n这是一份关于 ${editedTitle.value} 的完整世系记录。`
  
  // Basic auto-generation of bios text if none exists
  if (pub?.publication?.people) {
    let biosString = ''
    const people = Object.values(pub.publication.people) as Person[]

    people.forEach(p => {
      biosString += `【${p.name}】`
      if (p.birth || p.death) biosString += ` (${p.birth || '?'} - ${p.death || '今'})`
      biosString += `\n${p.note || '暂无传记资料。'}\n\n`
    })
    editedBios.value = biosString
  }
})

function goBack() {
  router.replace(`/publications/${route.params.id}`)
}

function scrollTo(id: string) {
  activeSection.value = id
  document.getElementById(`section-${id}`)?.scrollIntoView({ behavior: 'smooth' })
}

function onTitleBlur(e: any) {
  editedTitle.value = e.target.innerText
}

async function generatePdf() {
  if (!exportData) return
  isGenerating.value = true
  
  try {
    const response = await fetch(`/api/publications/${route.params.id}/export/pdf`, {
      method: 'POST',
      headers: buildAuthHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({
        base64Image: exportData.base64Image,
        svgMarkup: exportData.svgMarkup,
        prefaceText: editedPreface.value,
        biosText: editedBios.value,
        title: editedTitle.value
      })
    })
    
    if (!response.ok) throw new Error('PDF Generation failed')
    
    const blob = await response.blob()
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `${editedTitle.value}-谱书.pdf`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    window.URL.revokeObjectURL(url)
    
  } catch (error) {
    console.error('PDF Export failed', error)
    alert('导出 PDF 失败，可能是图片过大或后端服务暂不可用。')
  } finally {
    isGenerating.value = false
  }
}
</script>

<style scoped>
.print-preview-container {
  height: 100vh;
  display: flex;
  flex-direction: column;
  background: #f0f0f0;
  color: #333;
}

.preview-header {
  height: 64px;
  background: #fff;
  border-bottom: 1px solid #ddd;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 24px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.05);
  z-index: 100;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 20px;
}

.back-btn {
  display: flex;
  align-items: center;
  gap: 4px;
  background: none;
  border: none;
  color: #666;
  cursor: pointer;
  font-weight: 600;
}

.back-btn:hover { color: #000; }

.badge {
  font-size: 0.7rem;
  background: var(--accent-amber);
  color: white;
  padding: 2px 6px;
  border-radius: 4px;
  vertical-align: middle;
  margin-left: 8px;
}

.actions {
  display: flex;
  align-items: center;
  gap: 16px;
}

.status-indicator {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.9rem;
  color: var(--accent-amber);
}

.preview-layout {
  flex: 1;
  display: flex;
  overflow: hidden;
}

.preview-sidebar {
  width: 280px;
  background: #fff;
  border-right: 1px solid #ddd;
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 32px;
}

.sidebar-section h3 {
  font-size: 0.85rem;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: #999;
  margin-bottom: 12px;
}

.page-nav {
  list-style: none;
  padding: 0;
  margin: 0;
}

.page-nav li {
  padding: 10px 12px;
  border-radius: 8px;
  cursor: pointer;
  font-weight: 600;
  color: #555;
  transition: all 0.2s;
}

.page-nav li:hover { background: #f5f5f5; }
.page-nav li.active { background: var(--accent-amber); color: white; }

.control-group label {
  display: block;
  font-size: 0.8rem;
  margin-bottom: 6px;
}

.control-group select {
  width: 100%;
  padding: 8px;
  border-radius: 6px;
  border: 1px solid #ddd;
}

.sidebar-info {
  margin-top: auto;
  font-size: 0.75rem;
  color: #999;
  line-height: 1.4;
}

.preview-viewport {
  flex: 1;
  overflow-y: auto;
  padding: 60px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 60px;
}

.a4-page {
  background: white;
  width: 210mm;
  min-height: 297mm;
  padding: 20mm;
  box-shadow: 0 10px 30px rgba(0,0,0,0.1);
  display: flex;
  flex-direction: column;
  position: relative;
  box-sizing: border-box;
}

.a4-page--landscape {
  width: 297mm;
  min-height: 210mm;
}

.page-content { flex: 1; }

.page-title {
  text-align: center;
  font-family: "Noto Serif SC", serif;
  font-size: 2.5rem;
  margin-bottom: 0.5rem;
  outline: none;
}

.section-title {
  font-family: "Noto Serif SC", serif;
  font-size: 1.8rem;
  margin-bottom: 1rem;
}

.divider {
  height: 2px;
  background: #333;
  margin-bottom: 2rem;
}

.section-hint {
  font-size: 0.8rem;
  color: #999;
  margin-bottom: 8px;
}

.editable-text {
  width: 100%;
  border: 1px dashed transparent;
  background: transparent;
  resize: none;
  font-family: inherit;
  font-size: 1rem;
  line-height: 1.8;
  padding: 8px;
  transition: all 0.2s;
}

.editable-text:hover { border-color: #ddd; background: #fafafa; }
.editable-text:focus { border-color: var(--accent-amber); background: #fff; outline: none; }

.preface-text { height: 400px; }
.bios-text { height: 600px; }

.tree-preview-container {
  position: relative;
  border: 1px solid #eee;
  overflow: hidden;
}

.tree-img { width: 100%; display: block; }

.slicing-overlay {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  pointer-events: none;
}

.slice-grid {
  position: absolute;
  inset: 0;
  background-image: linear-gradient(to right, rgba(169, 110, 53, 0.2) 1px, transparent 1px),
                    linear-gradient(to bottom, rgba(169, 110, 53, 0.2) 1px, transparent 1px);
  background-size: 25% 33.33%;
}

.slicing-hint {
  background: rgba(0,0,0,0.7);
  color: white;
  padding: 8px 16px;
  border-radius: 99px;
  font-size: 0.8rem;
}

.page-footer {
  text-align: center;
  font-size: 0.8rem;
  color: #999;
  margin-top: 20mm;
}

.btn {
  padding: 10px 20px;
  border-radius: 8px;
  font-weight: 700;
  cursor: pointer;
  border: none;
}

.btn--primary {
  background: var(--accent-amber);
  color: white;
}

.spinner {
  animation: rotate 1.5s linear infinite;
}

@keyframes rotate {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
</style>
