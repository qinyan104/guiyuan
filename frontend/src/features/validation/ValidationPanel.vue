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

const severityIcon: Record<Severity, string> = {
  ERROR: '🔴',
  WARNING: '🟡',
  INFO: '🔵',
}

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
    <header class="vp-header">
      <h3 class="vp-title">数据质量校验</h3>
      <button class="vp-refresh" :disabled="loading" @click="runValidation" title="重新校验">
        <svg :class="{ spinning: loading }" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M21 12a9 9 0 1 1-6.219-8.56"/><polyline points="21 3 21 9 15 9"/></svg>
      </button>
    </header>

    <!-- 摘要条 -->
    <div class="vp-summary">
      <button
        v-for="sev in (['ERROR', 'WARNING', 'INFO'] as Severity[])"
        :key="sev"
        class="vp-summary-chip"
        :class="[`chip--${sev.toLowerCase()}`, { active: activeSeverity === sev }]"
        @click="activeSeverity = activeSeverity === sev ? 'ALL' : sev"
      >
        <span class="chip-icon">{{ severityIcon[sev] }}</span>
        <span class="chip-count">{{ counts[sev] }}</span>
        <span class="chip-label">{{ severityLabel[sev] }}</span>
      </button>
    </div>

    <!-- 错误提示 -->
    <div v-if="error" class="vp-error">{{ error }}</div>

    <!-- 空状态 -->
    <div v-if="!loading && !error && counts.total === 0" class="vp-empty">
      <span class="vp-empty-icon">✅</span>
      <p>未发现数据质量问题</p>
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
        <span class="finding-icon">{{ severityIcon[finding.severity] }}</span>
        <div class="finding-body">
          <p class="finding-message">{{ finding.message }}</p>
          <p v-if="finding.suggestion" class="finding-suggestion">💡 {{ finding.suggestion }}</p>
          <span class="finding-rule">{{ finding.ruleId }}</span>
        </div>
        <button
          v-if="finding.personId"
          class="finding-locate"
          @click.stop="locatePerson(finding.personId)"
          title="定位到人物"
        >定位 →</button>
      </li>
    </ul>
  </div>
</template>

<style scoped>
.validation-panel {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 16px;
}

.vp-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.vp-title {
  margin: 0;
  font-size: 14px;
  font-weight: 600;
  color: var(--text-main, #241a10);
}

.vp-refresh {
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  border-radius: 6px;
  background: none;
  color: var(--text-soft, #8a6845);
  cursor: pointer;
  transition: background 0.15s;
}

.vp-refresh:hover { background: rgba(0,0,0,0.06); }
.vp-refresh:disabled { opacity: 0.4; cursor: not-allowed; }
.spinning { animation: spin 0.8s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }

/* Summary chips */
.vp-summary {
  display: flex;
  gap: 6px;
}

.vp-summary-chip {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 5px 10px;
  border: 1px solid var(--border-color, rgba(111,89,67,0.15));
  border-radius: 999px;
  background: none;
  font-size: 12px;
  color: var(--text-soft, #8a6845);
  cursor: pointer;
  transition: all 0.15s;
}

.vp-summary-chip.active { border-color: var(--accent-signal, #ab6d30); background: rgba(171,109,48,0.06); }
.chip--error.active { border-color: #ef4444; background: rgba(239,68,68,0.06); color: #dc2626; }
.chip--warning.active { border-color: #f59e0b; background: rgba(245,158,11,0.06); color: #d97706; }
.chip--info.active { border-color: #3b82f6; background: rgba(59,130,246,0.06); color: #2563eb; }

.chip-icon { font-size: 10px; }
.chip-count { font-weight: 700; }
.chip-label { font-size: 11px; }

/* Error */
.vp-error {
  padding: 10px 12px;
  background: rgba(239,68,68,0.08);
  border: 1px solid rgba(239,68,68,0.2);
  border-radius: 8px;
  font-size: 12px;
  color: #dc2626;
}

/* Empty */
.vp-empty {
  text-align: center;
  padding: 24px 16px;
  color: var(--text-soft, #8a6845);
}

.vp-empty-icon { font-size: 28px; }
.vp-empty p { margin: 8px 0 0; font-size: 13px; }

/* Findings list */
.vp-findings {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
  max-height: 50vh;
  overflow-y: auto;
}

.vp-finding {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 10px 12px;
  border-radius: 8px;
  border: 1px solid var(--border-color, rgba(111,89,67,0.1));
  background: rgba(0,0,0,0.015);
  transition: background 0.12s;
}

.vp-finding.finding--clickable { cursor: pointer; }
.vp-finding.finding--clickable:hover { background: rgba(0,0,0,0.04); }

.finding--error { border-left: 3px solid #ef4444; }
.finding--warning { border-left: 3px solid #f59e0b; }
.finding--info { border-left: 3px solid #3b82f6; }

.finding-icon { font-size: 12px; flex-shrink: 0; margin-top: 2px; }

.finding-body { flex: 1; min-width: 0; }

.finding-message {
  margin: 0;
  font-size: 13px;
  color: var(--text-main, #241a10);
  line-height: 1.5;
}

.finding-suggestion {
  margin: 4px 0 0;
  font-size: 12px;
  color: var(--text-soft, #8a6845);
  line-height: 1.4;
}

.finding-rule {
  display: inline-block;
  margin-top: 4px;
  font-family: monospace;
  font-size: 10px;
  color: var(--text-soft, #8a6845);
  opacity: 0.7;
}

.finding-locate {
  flex-shrink: 0;
  padding: 4px 10px;
  border: 1px solid var(--border-color, rgba(111,89,67,0.2));
  border-radius: 6px;
  background: none;
  font-size: 12px;
  color: var(--text-soft, #8a6845);
  cursor: pointer;
  transition: all 0.12s;
}

.finding-locate:hover {
  border-color: var(--accent-signal, #ab6d30);
  color: var(--accent-signal, #ab6d30);
}
</style>
