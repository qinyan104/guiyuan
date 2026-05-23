<script setup lang="ts">
defineProps<{
  draftTitle: string
  draftStatus: string
  hasPendingSync: boolean
  paper?: string
}>()

defineEmits<{
  back: []
  autoLayout: []
  paperChange: [paper: "A4" | "A3"]
}>()

function statusClass(status: string): string {
  return status === "draft" ? "status-badge--draft" : status === "review" ? "status-badge--review" : "status-badge--final"
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
    <AppSelect v-bind="{ 'model-value': paper ?? 'A4' }" variant="compact" :options="[{value:'A4',label:'A4'},{value:'A3',label:'A3'}]" @change="(v: string) => $emit('paperChange', v as 'A4'|'A3')" />
    <span v-if="hasPendingSync" class="sync-warning" title="主数据有更新，需要同步">⚠ 待同步</span>
  </div>
</template>

<style scoped>
.studio-toolbar {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 12px 20px;
  border-bottom: 1px solid var(--color-neutral-3);
  background: var(--color-neutral-1);
  flex-shrink: 0;
}

.btn-back {
  background: transparent;
  border: none;
  color: var(--color-accent);
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
  color: var(--color-neutral-9);
}


.toolbar-spacer {
  flex: 1;
}

.btn-auto-layout {
  padding: 6px 16px;
  background: var(--color-accent);
  color: #fff;
  border: none;
  border-radius: 4px;
  font-size: 13px;
  cursor: pointer;
}
.btn-auto-layout:hover {
  background: var(--color-accent);
}


.sync-warning {
  font-size: 12px;
  color: var(--color-warning);
  background: var(--color-accent-muted);
  padding: 2px 8px;
  border-radius: 4px;
}
</style>
