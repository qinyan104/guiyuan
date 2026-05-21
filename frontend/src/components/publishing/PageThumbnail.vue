<script setup lang="ts">
defineProps<{
  sheetNumber: number
  sheetType: string
  active: boolean
}>()

defineEmits<{
  select: []
  delete: []
}>()
</script>

<template>
  <div
    :class="['page-thumbnail', { active }]"
    @click="$emit('select')"
    @contextmenu.prevent="$emit('delete')"
  >
    <div class="thumb-preview">
      <span class="thumb-page-num">{{ sheetNumber }}</span>
    </div>
    <span class="thumb-label">{{ sheetType }}</span>
  </div>
</template>

<style scoped>
.page-thumbnail {
  width: 80px;
  margin: 0 auto 10px;
  cursor: pointer;
  text-align: center;
}
.page-thumbnail:hover .thumb-preview {
  background: #f5f0e8;
}
.page-thumbnail.active .thumb-preview {
  background: #fef3c7;
  border-color: #c43a31;
}

.thumb-preview {
  height: 110px;
  background: #fff;
  border: 1px solid #e0d8cc;
  border-radius: 3px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.15s, border-color 0.15s;
}

.thumb-page-num {
  font-size: 18px;
  color: #999;
}

.thumb-label {
  display: block;
  font-size: 11px;
  color: #aaa;
  margin-top: 4px;
}
</style>