<script setup lang="ts">
defineProps<{
  selectedElementId: string | null
}>()
</script>

<template>
  <div class="element-inspector">
    <template v-if="selectedElementId">
      <h4 class="inspector-title">属性面板</h4>
      <p class="inspector-id">{{ selectedElementId }}</p>
      <p class="inspector-hint">选择页面上的文本块或图片以编辑属性</p>
    </template>
    <template v-else>
      <p class="inspector-empty">选择一个元素以编辑属性</p>
    </template>
  </div>
</template>

<style scoped>
.element-inspector {
  width: 220px;
  padding: 16px;
  border-left: 1px solid #e8e0d5;
  background: #faf7f2;
  flex-shrink: 0;
  overflow-y: auto;
}

.inspector-title {
  font-size: 14px;
  font-weight: 600;
  color: #333;
  margin: 0 0 8px;
}

.inspector-id {
  font-size: 12px;
  color: #c43a31;
  font-family: monospace;
  margin: 0 0 12px;
  word-break: break-all;
}

.inspector-hint {
  font-size: 12px;
  color: #999;
  margin: 0;
}

.inspector-empty {
  font-size: 13px;
  color: #bbb;
  text-align: center;
  padding-top: 40px;
}
</style>