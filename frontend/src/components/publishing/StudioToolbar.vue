<script setup lang="ts">
defineProps<{
  draftTitle: string
  draftStatus: string
  hasPendingSync: boolean
}>()

defineEmits<{
  back: []
  autoLayout: []
  paperChange: [paper: "A4" | "A3"]
}>()

function statusClass(status: string): string {
  return status === "draft" ? "badge-draft" : status === "review" ? "badge-review" : "badge-final"
}

function statusText(status: string): string {
  const map: Record<string, string> = { draft: "草稿", review: "审校", final: "定稿" }
  return map[status] || status
}
</script>

<template>
  <div class="studio-toolbar">
    <button class="btn-back" @click="$emit('back')">← 返回</button>
    <span class="toolbar-title">{{ draftTitle }}</span>
    <span :class="['status-badge', statusClass(draftStatus)]">{{ statusText(draftStatus) }}</span>
    <div class="toolbar-spacer" />
    <button class="btn-auto-layout" @click="$emit('autoLayout')">自动排版</button>
    <select class="paper-select" @change="$emit('paperChange', ($event.target as HTMLSelectElement).value as 'A4'|'A3')">
      <option value="A4">A4</option>
      <option value="A3">A3</option>
    </select>
    <span v-if="hasPendingSync" class="sync-warning" title="主数据有更新，需要同步">⚠ 待同步</span>
  </div>
</template>

<style scoped>
.studio-toolbar {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 12px 20px;
  border-bottom: 1px solid #e8e0d5;
  background: #fffdf8;
  flex-shrink: 0;
}

.btn-back {
  background: transparent;
  border: none;
  color: #c43a31;
  font-size: 14px;
  cursor: pointer;
  padding: 4px 0;
}
.btn-back:hover {
  text-decoration: underline;
}

.toolbar-title {
  font-size: 16px;
  font-weight: 600;
  color: #333;
}

.status-badge {
  padding: 2px 10px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 500;
}
.badge-draft {
  background: #fef3c7;
  color: #b45309;
}
.badge-review {
  background: #dbeafe;
  color: #1e40af;
}
.badge-final {
  background: #dcfce7;
  color: #166534;
}

.toolbar-spacer {
  flex: 1;
}

.btn-auto-layout {
  padding: 6px 16px;
  background: #c43a31;
  color: #fff;
  border: none;
  border-radius: 4px;
  font-size: 13px;
  cursor: pointer;
}
.btn-auto-layout:hover {
  background: #a8322a;
}

.paper-select {
  padding: 5px 8px;
  border: 1px solid #e0d8cc;
  border-radius: 4px;
  font-size: 13px;
  background: #fffdf8;
  outline: none;
}

.sync-warning {
  font-size: 12px;
  color: #b45309;
  background: #fef3c7;
  padding: 2px 8px;
  border-radius: 4px;
}
</style>