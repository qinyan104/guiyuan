<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  errorMessage: string
  statusMessage: string
}>()

defineEmits<{
  (event: 'dismiss'): void
}>()

const message = computed(() => props.errorMessage || props.statusMessage)
const isError = computed(() => Boolean(props.errorMessage))
</script>

<template>
  <div v-if="message" class="feedback-strip" :class="{ 'feedback-strip--error': isError }">
    <strong>{{ isError ? '需要处理' : '操作完成' }}</strong>
    <span>{{ message }}</span>
    <button type="button" @click="$emit('dismiss')">关闭</button>
  </div>
</template>
