<script setup lang="ts">
import { ref } from 'vue'
import { downloadGedcom } from './gedcom'

const props = defineProps<{
  pubId: number
}>()

const exporting = ref(false)
const exportError = ref<string | null>(null)

async function handleExport() {
  exporting.value = true
  exportError.value = null

  try {
    downloadGedcom(props.pubId)
  } catch (err: unknown) {
    exportError.value = err instanceof Error ? err.message : '导出失败'
  } finally {
    // downloadGedcom is async but fire-and-forget, so we just
    // clear the loading state after a short delay
    setTimeout(() => { exporting.value = false }, 1500)
  }
}
</script>

<template>
  <button
    class="gedcom-export-btn"
    :disabled="exporting"
    @click="handleExport"
    title="导出为 GEDCOM 格式（可导入其他族谱软件）"
  >
    <span class="btn-icon">📤</span>
    <span class="btn-text">{{ exporting ? '导出中...' : '导出 GEDCOM' }}</span>
  </button>
</template>

<style scoped>
.gedcom-export-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
  background: none;
  border: 1px solid var(--border-color, rgba(111, 89, 67, 0.2));
  border-radius: 7px;
  font-size: 13px;
  color: var(--text-soft, #8a6845);
  cursor: pointer;
  transition: all 0.15s;
}

.gedcom-export-btn:hover:not(:disabled) {
  border-color: var(--accent-signal, #ab6d30);
  color: var(--accent-signal, #ab6d30);
  background: rgba(171, 109, 48, 0.04);
}

.gedcom-export-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-icon {
  font-size: 14px;
}

.btn-text {
  font-weight: 500;
}
</style>
