<script setup lang="ts">
defineProps<{
  currentPage: number
  totalPages: number
  hasPendingSync: boolean
}>()
</script>

<template>
  <div class="studio-status-bar">
    <span class="status-page">页 {{ currentPage }} / {{ totalPages }}</span>
    <div class="status-spacer" />
    <span v-if="hasPendingSync" class="status-sync-warning">⚠ 主数据有更新</span>
    <span class="status-version-label">传统出版引擎 v1.0</span>
  </div>
</template>

<style scoped>
.studio-status-bar {
  display: flex;
  align-items: center;
  padding: 6px 20px;
  border-top: 1px solid #e8e0d5;
  background: #faf7f2;
  font-size: 12px;
  color: #888;
  flex-shrink: 0;
}

.status-spacer {
  flex: 1;
}

.status-sync-warning {
  color: #b45309;
  margin-right: 16px;
}

.status-version-label {
  color: #bbb;
}
</style>