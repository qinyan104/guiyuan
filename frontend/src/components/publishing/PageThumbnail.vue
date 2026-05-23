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
  background: var(--color-neutral-2);
}
.page-thumbnail.active .thumb-preview {
  background: var(--color-accent-muted);
  border-color: var(--color-accent);
}

.thumb-preview {
  height: 110px;
  background: #fff;
  border: 1px solid var(--color-neutral-4);
  border-radius: 3px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.15s, border-color 0.15s;
}

.thumb-page-num {
  font-size: 18px;
  color: var(--color-neutral-6);
}

.thumb-label {
  display: block;
  font-size: 11px;
  color: var(--color-neutral-5);
  margin-top: 4px;
}
</style>
