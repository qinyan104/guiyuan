<!-- src/features/export/ExportDialog.vue -->
<template>
  <div
    v-if="modelValue"
    class="export-dialog-backdrop"
    @click.self="$emit('update:modelValue', false)"
    @keydown.escape="$emit('update:modelValue', false)"
  >
    <div class="export-dialog panel-glass" role="dialog" aria-modal="true" aria-label="导出与分享">
      <header class="dialog-header">
        <div class="dialog-header__text">
          <h2 class="dialog-header__title">导出与分享</h2>
          <p class="dialog-header__desc">将当前世系图导出为图片、无损矢量图或独立离线网页</p>
        </div>
        <button
          class="close-btn"
          aria-label="关闭"
          type="button"
          @click="$emit('update:modelValue', false)"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </header>

      <div class="tabs">
        <button
          :class="['tab-btn', { active: activeTab === 'png' }]"
          type="button"
          @click="activeTab = 'png'"
        >
          <svg class="tab-btn__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
            <circle cx="8.5" cy="8.5" r="1.5" />
            <polyline points="21 15 16 10 5 21" />
          </svg>
          PNG 图片
        </button>
        <button
          :class="['tab-btn', { active: activeTab === 'svg' }]"
          type="button"
          @click="activeTab = 'svg'"
        >
          <svg class="tab-btn__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="6" cy="6" r="3" />
            <circle cx="18" cy="18" r="3" />
            <path d="M6 9v3a3 3 0 0 0 3 3h6" />
          </svg>
          矢量 SVG
        </button>
        <button
          :class="['tab-btn', { active: activeTab === 'share' }]"
          type="button"
          @click="activeTab = 'share'"
        >
          <svg class="tab-btn__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="10" />
            <line x1="2" y1="12" x2="22" y2="12" />
            <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
          </svg>
          分享网页
        </button>
      </div>

      <div v-if="activeTab === 'png'" class="tab-content">
        <div class="format-card">
          <div class="format-tags">
            <span class="format-tag">高清位图</span>
            <span class="format-tag">族人传阅</span>
            <span class="format-tag">插入文档</span>
          </div>
          <p class="description">导出为高分辨率 PNG 位图图片，便于直接发到微信群与族人交流，或插入汇报文档中快速预览。</p>
        </div>
        <div class="actions">
          <button class="btn btn--primary" :disabled="isProcessing" type="button" @click="$emit('export-png')">
            <svg class="btn__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            {{ isProcessing ? '正在生成 PNG...' : '立即下载 PNG' }}
          </button>
        </div>
      </div>

      <div v-if="activeTab === 'svg'" class="tab-content">
        <div class="format-card">
          <div class="format-tags">
            <span class="format-tag">无限无损缩放</span>
            <span class="format-tag">专业出图印刷</span>
            <span class="format-tag">矢量几何源件</span>
          </div>
          <p class="description">导出为无限放大的标准 SVG 矢量文件。线条与文字永不模糊失真，适合专业排版、大型挂幅喷绘或作为原始数字档案备份。</p>
        </div>
        <div class="actions">
          <button class="btn btn--primary" :disabled="isProcessing" type="button" @click="$emit('export-svg')">
            <svg class="btn__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            {{ isProcessing ? '正在生成 SVG...' : '立即下载矢量 SVG' }}
          </button>
        </div>
      </div>

      <div v-if="activeTab === 'share'" class="tab-content">
        <div class="format-card">
          <div class="format-tags">
            <span class="format-tag">离线自包含</span>
            <span class="format-tag">交互平移缩放</span>
            <span class="format-tag">支持密码加密</span>
          </div>
          <p class="description">生成一个独立的 HTML 文件，无需网络或安装任何软件，族人只需双击即可在任何浏览器中平移、缩放与查阅交互式世系。</p>
        </div>

        <div class="options-group">
          <label class="field-label">
            <span>访问保护密码</span>
            <span class="field-label__extra">可选</span>
          </label>
          <div class="share-password-wrapper">
            <svg class="share-password-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
            <input
              v-model="sharePassword"
              type="password"
              placeholder="留空则不加密，直接打开"
              class="share-password-input"
            />
          </div>
          <p class="field-hint">设置密码后，打开该独立文件时须输入对应密码方可解密显示内容。</p>
          <div v-if="passwordStrength" class="strength-indicator">
            <div class="strength-bar">
              <div
                class="strength-fill"
                :style="{ width: passwordStrength.percent + '%', backgroundColor: passwordStrength.color }"
              ></div>
            </div>
            <span class="strength-label" :style="{ color: passwordStrength.color }">
              密码强度：{{ passwordStrength.label }}
            </span>
          </div>
        </div>

        <div class="actions">
          <button class="btn btn--primary" :disabled="isProcessing" type="button" @click="emitExportShareHtml">
            <svg class="btn__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="12" r="10" />
              <line x1="2" y1="12" x2="22" y2="12" />
              <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
            </svg>
            {{ isProcessing ? '正在生成分享网页...' : '生成分享网页' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'

defineProps<{
  modelValue: boolean
  isProcessing?: boolean
}>()

const emit = defineEmits(['update:modelValue', 'export-png', 'export-svg', 'export-share-html'])

const activeTab = ref<'png' | 'svg' | 'share'>('png')
const sharePassword = ref('')

const passwordStrength = computed(() => {
  const pwd = sharePassword.value
  if (!pwd) return null

  let score = 0
  if (pwd.length >= 6) score++
  if (pwd.length >= 10) score++
  if (/[a-z]/.test(pwd) && /[A-Z]/.test(pwd)) score++
  if (/\d/.test(pwd)) score++
  if (/[^a-zA-Z0-9]/.test(pwd)) score++

  if (score <= 1) return { level: 'weak', label: '弱', color: 'var(--color-error, #d9383a)', percent: 25 }
  if (score <= 2) return { level: 'fair', label: '一般', color: 'var(--color-warning, #e67e22)', percent: 50 }
  if (score <= 3) return { level: 'medium', label: '中等', color: 'var(--color-caution, #2e7d32)', percent: 75 }
  return { level: 'strong', label: '强', color: 'var(--color-success, #1b8a4b)', percent: 100 }
})

function emitExportShareHtml() {
  emit('export-share-html', { password: sharePassword.value })
}
</script>

<style scoped>
.export-dialog-backdrop {
  position: fixed;
  inset: 0;
  background: var(--scrim-bg, rgba(8, 10, 16, 0.45));
  backdrop-filter: blur(5px);
  -webkit-backdrop-filter: blur(5px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: var(--z-modal, 1000);
  animation: fadeIn 0.18s ease-out;
}

.export-dialog {
  position: relative;
  width: 100%;
  max-width: 490px;
  margin: 16px;
  padding: 24px 28px 28px;
  background: var(--bg-paper-raised, #fcfbfa);
  border: 1px solid var(--line-soft, rgba(122, 95, 65, 0.16));
  border-radius: 12px;
  box-shadow: var(--shadow-modal, 0 16px 36px rgba(24, 18, 12, 0.14));
  animation: slideUp 0.22s cubic-bezier(0.16, 1, 0.3, 1);
  box-sizing: border-box;
}

.dialog-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 20px;
}

.dialog-header__text {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.dialog-header__title {
  margin: 0;
  font-family: var(--font-serif, "Noto Serif SC", serif);
  font-size: 1.15rem;
  font-weight: 600;
  color: var(--text-main, #241a10);
  letter-spacing: 0.02em;
}

.dialog-header__desc {
  margin: 0;
  font-size: 0.8rem;
  color: var(--text-soft, #8f8878);
  line-height: 1.4;
}

.close-btn {
  width: 30px;
  height: 30px;
  border-radius: 8px;
  background: transparent;
  border: 1px solid transparent;
  color: var(--text-soft, #8f8878);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.15s ease;
  flex-shrink: 0;
  margin-top: -2px;
  margin-right: -4px;
}

.close-btn:hover {
  background: var(--fill-subtle, rgba(0, 0, 0, 0.05));
  border-color: var(--line-subtle, rgba(122, 95, 65, 0.1));
  color: var(--text-main, #241a10);
}

.tabs {
  display: flex;
  gap: 4px;
  margin-bottom: 20px;
  background: var(--fill-subtle, rgba(0, 0, 0, 0.035));
  border: 1px solid var(--line-subtle, rgba(122, 95, 65, 0.08));
  border-radius: 10px;
  padding: 3px;
}

.tab-btn {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 8px 12px;
  border: none;
  background: transparent;
  border-radius: 8px;
  font-size: 12.5px;
  font-weight: 500;
  color: var(--text-sub, #6b5e52);
  cursor: pointer;
  transition: all 0.15s ease;
  white-space: nowrap;
}

.tab-btn__icon {
  width: 14px;
  height: 14px;
  opacity: 0.75;
  flex-shrink: 0;
}

.tab-btn:hover:not(.active) {
  color: var(--text-main, #241a10);
  background: rgba(255, 255, 255, 0.5);
}

.tab-btn.active {
  background: var(--bg-paper, #ffffff);
  color: var(--text-main, #241a10);
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.08);
  font-weight: 600;
}

.tab-btn.active .tab-btn__icon {
  opacity: 1;
  stroke: var(--color-accent, #724f2e);
}

.tab-content {
  animation: fadeIn 0.15s ease-out;
}

.format-card {
  background: var(--fill-subtlest, rgba(122, 95, 65, 0.04));
  border: 1px solid var(--line-subtle, rgba(122, 95, 65, 0.1));
  border-radius: 10px;
  padding: 14px 16px;
  margin-bottom: 20px;
}

.format-tags {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
  margin-bottom: 8px;
}

.format-tag {
  font-size: 11px;
  font-weight: 500;
  padding: 2px 7px;
  border-radius: 6px;
  background: var(--bg-paper, #ffffff);
  border: 1px solid var(--line-subtle, rgba(122, 95, 65, 0.12));
  color: var(--text-sub, #6b5e52);
}

.description {
  margin: 0;
  font-size: 0.82rem;
  color: var(--text-sub, #6b5e52);
  line-height: 1.6;
}

.options-group {
  margin-bottom: 20px;
}

.field-label {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 12px;
  font-weight: 500;
  color: var(--text-main, #241a10);
  margin-bottom: 8px;
}

.field-label__extra {
  font-size: 11px;
  color: var(--text-soft, #8f8878);
}

.share-password-wrapper {
  position: relative;
  display: flex;
  align-items: center;
}

.share-password-icon {
  position: absolute;
  left: 12px;
  width: 15px;
  height: 15px;
  color: var(--text-soft, #8f8878);
  pointer-events: none;
}

.share-password-input {
  width: 100%;
  padding: 10px 14px 10px 36px;
  border-radius: 8px;
  border: 1px solid var(--line-soft, rgba(122, 95, 65, 0.18));
  background: var(--bg-paper, #ffffff);
  color: var(--text-main, #241a10);
  font-size: 0.85rem;
  outline: none;
  transition: border-color 0.15s, box-shadow 0.15s;
  box-sizing: border-box;
}

.share-password-input:focus {
  border-color: var(--color-accent, #724f2e);
  box-shadow: 0 0 0 3px rgba(114, 79, 46, 0.1);
}

.field-hint {
  font-size: 0.75rem;
  color: var(--text-soft, #8f8878);
  margin-top: 6px;
  margin-bottom: 0;
  line-height: 1.4;
}

.strength-indicator {
  margin-top: 10px;
  display: flex;
  align-items: center;
  gap: 10px;
}

.strength-bar {
  flex: 1;
  height: 4px;
  border-radius: 999px;
  background: var(--fill-subtle, rgba(0, 0, 0, 0.08));
  overflow: hidden;
}

.strength-fill {
  height: 100%;
  border-radius: 999px;
  transition: width 0.3s ease, background-color 0.3s ease;
}

.strength-label {
  font-size: 0.72rem;
  font-weight: 500;
  white-space: nowrap;
}

.actions {
  margin-top: 20px;
}

.btn {
  width: 100%;
  padding: 11px 20px;
  border-radius: 9px;
  font-size: 13.5px;
  font-weight: 500;
  cursor: pointer;
  border: none;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  transition: transform 120ms ease, box-shadow 150ms ease, opacity 150ms ease, background 150ms ease;
  box-sizing: border-box;
}

.btn__icon {
  width: 16px;
  height: 16px;
  flex-shrink: 0;
}

.btn:active:not(:disabled) {
  transform: scale(0.98);
}

.btn--primary {
  background: var(--btn-primary-bg, #241a10);
  color: var(--btn-primary-color, #fff8ee);
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.12);
}

.btn--primary:hover:not(:disabled) {
  opacity: 0.93;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.18);
}

.btn--primary:disabled {
  opacity: 0.45;
  cursor: not-allowed;
  box-shadow: none;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes slideUp {
  from { opacity: 0; transform: translateY(10px) scale(0.98); }
  to { opacity: 1; transform: translateY(0) scale(1); }
}

@media (prefers-reduced-motion) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
</style>
