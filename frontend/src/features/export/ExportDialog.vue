<!-- src/features/export/ExportDialog.vue -->
<template>
  <div v-if="modelValue" class="export-dialog-backdrop" @click.self="$emit('update:modelValue', false)">
    <div class="export-dialog">
      <button class="close-btn" @click="$emit('update:modelValue', false)">&times;</button>
      <header class="dialog-header">
        <span class="dialog-eyebrow">导出</span>
        <h2>导出与分享</h2>
      </header>

      <div class="tabs">
        <button
          @click="activeTab = 'svg'"
          :class="['tab-btn', { active: activeTab === 'svg' }]"
        >
          矢量 SVG
        </button>
        <button
          @click="activeTab = 'share'"
          :class="['tab-btn', { active: activeTab === 'share' }]"
        >
          分享网页
        </button>
      </div>

      <div v-if="activeTab === 'svg'" class="tab-content">
        <p class="description">导出为无限放大的矢量文件。这是最保真的格式，适合专业排版、印刷或作为原始备份。</p>
        <div class="actions">
          <button class="btn btn--primary" @click="$emit('export-svg')" :disabled="isProcessing">
            立即下载矢量 SVG
          </button>
        </div>
      </div>

      <div v-if="activeTab === 'share'" class="tab-content">
        <p class="description">生成一个独立的 HTML 文件，无需服务器即可在任何浏览器中打开查看交互式族谱。支持可选的密码保护。</p>
        <div class="options-group">
          <label class="field-label">密码保护（可选）</label>
          <input
            v-model="sharePassword"
            type="password"
            placeholder="留空则不加密"
            class="share-password-input"
          />
          <p class="field-hint">设置密码后，打开文件时需要输入密码才能查看内容。</p>
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
          <button class="btn btn--primary" @click="emitExportShareHtml" :disabled="isProcessing">
            {{ isProcessing ? '正在生成...' : '生成分享网页' }}
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

const emit = defineEmits(['update:modelValue', 'export-svg', 'export-share-html'])

const activeTab = ref<'svg' | 'share'>('svg')
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

  if (score <= 1) return { level: 'weak', label: '弱', color: '#e74c3c', percent: 25 }
  if (score <= 2) return { level: 'fair', label: '一般', color: '#f39c12', percent: 50 }
  if (score <= 3) return { level: 'medium', label: '中等', color: '#e67e22', percent: 70 }
  return { level: 'strong', label: '强', color: '#27ae60', percent: 100 }
})

function emitExportShareHtml() {
  emit('export-share-html', { password: sharePassword.value })
}
</script>

<style scoped>
.export-dialog-backdrop {
  position: fixed;
  inset: 0;
  background: var(--scrim-bg, rgba(8, 10, 16, 0.3));
  backdrop-filter: blur(4px);
  -webkit-backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2000;
  animation: fadeIn 0.2s ease-out;
}

.export-dialog {
  position: relative;
  background: var(--glass-panel-bg, rgba(255, 255, 255, 0.72));
  backdrop-filter: blur(24px) saturate(180%);
  -webkit-backdrop-filter: blur(24px) saturate(180%);
  padding: 36px 40px;
  border-radius: 20px;
  min-width: 480px;
  max-width: 540px;
  border: 1px solid var(--glass-border-highlight, rgba(255, 255, 255, 0.8));
  box-shadow:
    0 24px 48px rgba(0, 0, 0, 0.06),
    0 8px 24px rgba(0, 0, 0, 0.04),
    inset 0 1px 0 rgba(255, 255, 255, 0.5);
  animation: slideUp 0.3s cubic-bezier(0.165, 0.84, 0.44, 1);
}

:global([data-theme="ink-wash"]) .export-dialog,
:global([data-theme="rosewood"]) .export-dialog,
:global([data-theme="star-sea"]) .export-dialog {
  background: rgba(20, 20, 20, 0.6);
  border-color: rgba(255, 255, 255, 0.1);
  box-shadow: 0 24px 48px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.06);
}

.dialog-header {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin-bottom: 28px;
}

.dialog-eyebrow {
  font-family: monospace;
  font-size: 10px;
  font-weight: 400;
  letter-spacing: 0.2em;
  color: var(--text-soft, #8f8878);
  text-transform: uppercase;
}

.dialog-header h2 {
  margin: 0;
  font-family: 'Noto Serif SC', 'Songti SC', serif;
  font-size: 1.4rem;
  font-weight: 700;
  letter-spacing: 0.05em;
  color: var(--text-main, #241a10);
}

.close-btn {
  position: absolute;
  top: 16px;
  right: 16px;
  width: 32px;
  height: 32px;
  border-radius: 999px;
  background: rgba(0, 0, 0, 0.04);
  border: none;
  font-size: 1.1rem;
  color: var(--text-soft, #8f8878);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.15s ease;
  line-height: 1;
}

:global([data-theme="ink-wash"]) .close-btn,
:global([data-theme="rosewood"]) .close-btn,
:global([data-theme="star-sea"]) .close-btn {
  background: rgba(255, 255, 255, 0.06);
}

.close-btn:hover {
  background: rgba(0, 0, 0, 0.08);
  color: var(--text-main, #241a10);
}

.tabs {
  display: flex;
  gap: 6px;
  margin-bottom: 28px;
  background: rgba(0, 0, 0, 0.03);
  border-radius: 14px;
  padding: 4px;
}

:global([data-theme="ink-wash"]) .tabs,
:global([data-theme="rosewood"]) .tabs,
:global([data-theme="star-sea"]) .tabs {
  background: rgba(255, 255, 255, 0.04);
}

.tab-btn {
  flex: 1;
  padding: 10px 12px;
  border: none;
  background: transparent;
  border-radius: 12px;
  font-family: 'Manrope', sans-serif;
  font-size: 0.78rem;
  font-weight: 600;
  letter-spacing: 0.02em;
  color: var(--text-soft, #8f8878);
  cursor: pointer;
  transition: all 0.15s ease;
  white-space: nowrap;
}

.tab-btn.active {
  background: var(--bg-paper, #fff9ef);
  color: var(--text-main, #241a10);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
  font-weight: 700;
}

:global([data-theme="ink-wash"]) .tab-btn.active,
:global([data-theme="rosewood"]) .tab-btn.active,
:global([data-theme="star-sea"]) .tab-btn.active {
  background: rgba(255, 255, 255, 0.08);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
}

.tab-btn:hover:not(.active) {
  color: var(--text-sub, #6b5e52);
}

.tab-content {
  animation: fadeIn 0.15s ease-out;
}

.description {
  font-family: 'Manrope', sans-serif;
  font-size: 0.85rem;
  color: var(--text-sub, #6b5e52);
  line-height: 1.7;
  margin-bottom: 24px;
}

.options-group {
  margin-bottom: 20px;
}

.options-group .field-label {
  display: block;
  font-family: monospace;
  font-size: 10px;
  font-weight: 400;
  letter-spacing: 0.2em;
  color: var(--text-soft, #8f8878);
  text-transform: uppercase;
  margin-bottom: 10px;
}

.share-password-input {
  width: 100%;
  padding: 12px 14px;
  border-radius: 12px;
  border: 1px solid var(--line-soft, rgba(122, 95, 65, 0.18));
  background: var(--bg-paper, rgba(255, 255, 252, 0.92));
  color: var(--text-main, #241a10);
  font-family: 'Manrope', sans-serif;
  font-size: 0.85rem;
  font-weight: 500;
  outline: none;
  transition: border-color 0.15s, box-shadow 0.15s;
}

.share-password-input:focus {
  border-color: var(--accent-amber, rgba(114, 79, 46, 0.45));
  box-shadow: 0 0 0 4px var(--line-soft, rgba(130, 99, 68, 0.12));
  background: var(--bg-paper, #fffdf9);
}

.field-hint {
  font-family: 'Manrope', sans-serif;
  font-size: 0.75rem;
  color: var(--text-soft, #8f8878);
  margin-top: 8px;
  line-height: 1.5;
}

.strength-indicator {
  margin-top: 12px;
  display: flex;
  align-items: center;
  gap: 12px;
}

.strength-bar {
  flex: 1;
  height: 4px;
  border-radius: 999px;
  background: rgba(0, 0, 0, 0.06);
  overflow: hidden;
}

:global([data-theme="ink-wash"]) .strength-bar,
:global([data-theme="rosewood"]) .strength-bar,
:global([data-theme="star-sea"]) .strength-bar {
  background: rgba(255, 255, 255, 0.08);
}

.strength-fill {
  height: 100%;
  border-radius: 999px;
  transition: width 0.3s ease, background-color 0.3s ease;
}

.strength-label {
  font-family: 'Manrope', sans-serif;
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.02em;
  white-space: nowrap;
}

.actions {
  margin-top: 28px;
}

.btn {
  width: 100%;
  padding: 14px 24px;
  border-radius: 999px;
  font-family: 'Manrope', sans-serif;
  font-size: 0.82rem;
  font-weight: 700;
  letter-spacing: 0.04em;
  cursor: pointer;
  transition: transform 150ms cubic-bezier(0.2, 0, 0, 1), box-shadow 150ms ease, opacity 150ms ease;
  border: none;
}

.btn:active:not(:disabled) {
  transform: scale(0.97);
  transition-duration: 50ms;
}

.btn--primary {
  background: var(--btn-primary-bg, linear-gradient(135deg, #3e2a18 0%, #7f5631 100%));
  color: var(--btn-primary-color, #fff8ee);
  box-shadow: 0 12px 24px rgba(70, 46, 24, 0.18);
}

.btn--primary:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 16px 32px rgba(70, 46, 24, 0.24);
}

.btn--primary:disabled {
  opacity: 0.44;
  cursor: not-allowed;
  box-shadow: none;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes slideUp {
  from { opacity: 0; transform: translateY(12px) scale(0.98); }
  to { opacity: 1; transform: translateY(0) scale(1); }
}
</style>
