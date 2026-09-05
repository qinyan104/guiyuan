<script setup lang="ts">
import { ref, onMounted, watch, computed } from 'vue'
import { validatePublication, type ValidationFinding, type Severity } from './validationApi'

const props = defineProps<{
  pubId: number | null
  selectedPersonId?: string | null
}>()

const emit = defineEmits<{
  (e: 'locate-person', personId: string): void
}>()

const findings = ref<ValidationFinding[]>([])
const loading = ref(false)
const error = ref<string | null>(null)
const activeSeverity = ref<Severity | 'ALL'>('ALL')

const filteredFindings = computed(() => {
  if (activeSeverity.value === 'ALL') return findings.value
  return findings.value.filter((f) => f.severity === activeSeverity.value)
})

const counts = computed(() => ({
  ERROR: findings.value.filter((f) => f.severity === 'ERROR').length,
  WARNING: findings.value.filter((f) => f.severity === 'WARNING').length,
  INFO: findings.value.filter((f) => f.severity === 'INFO').length,
  total: findings.value.length,
}))

const severityLabel: Record<Severity, string> = {
  ERROR: '错误',
  WARNING: '警告',
  INFO: '建议',
}

async function runValidation() {
  if (!props.pubId) return
  loading.value = true
  error.value = null
  try {
    findings.value = await validatePublication(props.pubId)
  } catch (err: unknown) {
    error.value = err instanceof Error ? err.message : '校验失败'
  } finally {
    loading.value = false
  }
}

function locatePerson(personId: string | null) {
  if (personId) emit('locate-person', personId)
}

onMounted(runValidation)

watch(() => props.pubId, runValidation)
</script>

<template>
  <div class="validation-panel">
    <!-- 顶部工具条：分类筛选与刷新 -->
    <div class="vp-toolbar">
      <div class="vp-summary">
        <button
          class="vp-summary-chip"
          :class="{ active: activeSeverity === 'ALL' }"
          type="button"
          @click="activeSeverity = 'ALL'"
        >
          <span class="chip-label">全部</span>
          <span class="chip-count">{{ counts.total }}</span>
        </button>
        <button
          v-for="sev in (['ERROR', 'WARNING', 'INFO'] as Severity[])"
          :key="sev"
          class="vp-summary-chip"
          :class="[`chip--${sev.toLowerCase()}`, { active: activeSeverity === sev }]"
          type="button"
          @click="activeSeverity = activeSeverity === sev ? 'ALL' : sev"
        >
          <span class="chip-dot" />
          <span class="chip-label">{{ severityLabel[sev] }}</span>
          <span class="chip-count">{{ counts[sev] }}</span>
        </button>
      </div>

      <button class="vp-refresh-btn" :disabled="loading" type="button" @click="runValidation" title="重新校验数据">
        <svg :class="{ spinning: loading }" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M21 12a9 9 0 1 1-6.219-8.56" />
          <polyline points="21 3 21 9 15 9" />
        </svg>
        <span>{{ loading ? '校验中' : '重新校验' }}</span>
      </button>
    </div>

    <!-- 错误提示 -->
    <div v-if="error" class="vp-error">{{ error }}</div>

    <!-- 空状态 -->
    <div v-if="!loading && !error && counts.total === 0" class="vp-empty">
      <div class="vp-empty-icon-wrap">
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
          <polyline points="22 4 12 14.01 9 11.01" />
        </svg>
      </div>
      <p class="vp-empty-title">谱牒数据完整合规</p>
      <span class="vp-empty-desc">未发现世系断层、生卒逆差或重名冲突等逻辑瑕疵</span>
    </div>

    <!-- 发现列表 -->
    <ul v-if="filteredFindings.length > 0" class="vp-findings">
      <li
        v-for="(finding, i) in filteredFindings"
        :key="finding.ruleId + '-' + i"
        class="vp-finding"
        :class="[`finding--${finding.severity.toLowerCase()}`, { 'finding--clickable': finding.personId }]"
        @click="locatePerson(finding.personId)"
      >
        <span class="finding-badge" :class="`finding-badge--${finding.severity.toLowerCase()}`">
          {{ severityLabel[finding.severity] }}
        </span>
        <div class="finding-body">
          <p class="finding-message">{{ finding.message }}</p>
          <p v-if="finding.suggestion" class="finding-suggestion">
            <span class="suggestion-tag">建议</span>
            {{ finding.suggestion }}
          </p>
          <span class="finding-rule">{{ finding.ruleId }}</span>
        </div>
        <button
          v-if="finding.personId"
          class="finding-locate"
          type="button"
          @click.stop="locatePerson(finding.personId)"
          title="在画布中定位此人"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="3" />
            <path d="M3 12h3m12 0h3M12 3v3m0 12v3" />
          </svg>
          <span>定位</span>
        </button>
      </li>
    </ul>

    <!-- 筛选后为空 -->
    <div v-else-if="!loading && !error && counts.total > 0" class="vp-filter-empty">
      当前级别暂无问题
    </div>
  </div>
</template>

<style scoped>
.validation-panel {
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding: 18px 24px 24px;
}

/* Toolbar */
.vp-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
}

.vp-summary {
  display: flex;
  gap: 6px;
  align-items: center;
}

.vp-summary-chip {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 4px 10px;
  border: 1px solid var(--color-card-stroke);
  border-radius: 999px;
  background: var(--color-panel-bg);
  font-size: 12px;
  color: var(--color-neutral-7);
  cursor: pointer;
  transition: all var(--duration-fast, 150ms) var(--ease-breath);
}

.vp-summary-chip:hover {
  background: var(--color-neutral-3);
  color: var(--color-neutral-9);
}

.vp-summary-chip.active {
  border-color: var(--color-neutral-8);
  background: var(--color-neutral-9);
  color: #ffffff;
}

.chip-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: currentColor;
}

.chip--error .chip-dot { background: #e04138; }
.chip--error.active {
  border-color: #e04138;
  background: #e04138;
  color: #ffffff;
}
.chip--error:not(.active):hover {
  color: #e04138;
  border-color: rgba(224, 65, 56, 0.3);
}

.chip--warning .chip-dot { background: #d97706; }
.chip--warning.active {
  border-color: #d97706;
  background: #d97706;
  color: #ffffff;
}
.chip--warning:not(.active):hover {
  color: #d97706;
  border-color: rgba(217, 119, 6, 0.3);
}

.chip--info .chip-dot { background: #2563eb; }
.chip--info.active {
  border-color: #2563eb;
  background: #2563eb;
  color: #ffffff;
}
.chip--info:not(.active):hover {
  color: #2563eb;
  border-color: rgba(37, 99, 235, 0.3);
}

.chip-count {
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  font-size: 11px;
  opacity: 0.85;
}

.vp-refresh-btn {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 4px 10px;
  border: 1px solid var(--color-card-stroke);
  border-radius: 6px;
  background: transparent;
  font-size: 12px;
  color: var(--color-neutral-7);
  cursor: pointer;
  transition: all var(--duration-fast, 150ms);
}

.vp-refresh-btn:hover:not(:disabled) {
  background: var(--color-accent-muted);
  border-color: color-mix(in srgb, var(--color-accent) 25%, transparent);
  color: var(--color-accent);
}

.vp-refresh-btn:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.spinning {
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* Error */
.vp-error {
  padding: 10px 14px;
  background: rgba(224, 65, 56, 0.08);
  border: 1px solid rgba(224, 65, 56, 0.2);
  border-radius: 8px;
  font-size: 12px;
  color: #e04138;
}

/* Empty State */
.vp-empty {
  text-align: center;
  padding: 36px 16px;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.vp-empty-icon-wrap {
  width: 52px;
  height: 52px;
  border-radius: 50%;
  background: rgba(46, 133, 64, 0.1);
  color: #2e8540;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 12px;
}

.vp-empty-title {
  margin: 0 0 4px;
  font-size: 15px;
  font-weight: 600;
  color: var(--color-neutral-9);
}

.vp-empty-desc {
  font-size: 12px;
  color: var(--color-neutral-6);
}

.vp-filter-empty {
  text-align: center;
  padding: 28px 16px;
  font-size: 13px;
  color: var(--color-neutral-6);
}

/* Findings list */
.vp-findings {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-height: 440px;
  overflow-y: auto;
  scrollbar-gutter: stable;
}

.vp-finding {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 12px 14px;
  border-radius: 10px;
  border: 1px solid var(--color-card-stroke);
  background: var(--color-panel-bg);
  transition: all var(--duration-fast, 150ms);
}

.vp-finding.finding--clickable {
  cursor: pointer;
}

.vp-finding.finding--clickable:hover {
  background: var(--color-neutral-2);
  border-color: var(--color-neutral-5);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
}

.finding--error {
  border-left: 3px solid #e04138;
}

.finding--warning {
  border-left: 3px solid #d97706;
}

.finding--info {
  border-left: 3px solid #2563eb;
}

.finding-badge {
  font-size: 11px;
  font-weight: 600;
  padding: 2px 6px;
  border-radius: 4px;
  flex-shrink: 0;
  margin-top: 1px;
}

.finding-badge--error {
  background: rgba(224, 65, 56, 0.12);
  color: #e04138;
}

.finding-badge--warning {
  background: rgba(217, 119, 6, 0.12);
  color: #b45309;
}

.finding-badge--info {
  background: rgba(37, 99, 235, 0.12);
  color: #1d4ed8;
}

.finding-body {
  flex: 1;
  min-width: 0;
}

.finding-message {
  margin: 0;
  font-size: 13px;
  font-weight: 500;
  color: var(--color-neutral-9);
  line-height: 1.5;
}

.finding-suggestion {
  margin: 5px 0 0;
  font-size: 12px;
  color: var(--color-neutral-7);
  line-height: 1.45;
  display: flex;
  align-items: baseline;
  gap: 4px;
}

.suggestion-tag {
  font-size: 10px;
  font-weight: 600;
  background: var(--color-accent-muted);
  color: var(--color-accent);
  padding: 1px 4px;
  border-radius: 3px;
  flex-shrink: 0;
}

.finding-rule {
  display: inline-block;
  margin-top: 6px;
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: 10.5px;
  color: var(--color-neutral-5);
}

.finding-locate {
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 9px;
  border: 1px solid var(--color-card-stroke);
  border-radius: 6px;
  background: transparent;
  font-size: 11.5px;
  color: var(--color-neutral-7);
  cursor: pointer;
  transition: all var(--duration-fast, 150ms);
}

.finding-locate:hover {
  border-color: var(--color-accent);
  background: var(--color-accent-muted);
  color: var(--color-accent);
}
</style>
