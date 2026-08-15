<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(defineProps<{
  src?: string
  name?: string
  size?: 'sm' | 'md' | 'lg'
  tone?: string
}>(), {
  src: '',
  name: '',
  size: 'sm',
  tone: '',
})

const initial = computed(() => (props.name.trim() || '总').charAt(0).toUpperCase())
</script>

<template>
  <span class="user-avatar" :class="[size, tone]">
    <img v-if="src" :src="src" alt="" />
    <span v-else>{{ initial }}</span>
  </span>
</template>

<style scoped>
.user-avatar {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  flex-shrink: 0;
  border-radius: 50%;
  background: var(--color-neutral-6, #8C8473);
  color: var(--color-text-on-accent, #ffffff);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.12);
  border: 1px solid rgba(255, 255, 255, 0.25);
}

.user-avatar.sm {
  width: 28px;
  height: 28px;
  font-size: var(--text-label-12, 12px);
  font-weight: 700;
}

.user-avatar.md {
  width: 42px;
  height: 42px;
  font-size: var(--text-copy-16, 16px);
  font-weight: 600;
}

.user-avatar.lg {
  width: 112px;
  height: 112px;
  font-size: var(--text-display-36, 36px);
  font-weight: 700;
}

.user-avatar.super_admin {
  background: var(--color-accent-gradient);
  box-shadow: var(--shadow-accent);
}

.user-avatar.admin {
  background: linear-gradient(135deg, var(--color-info), var(--color-male));
  box-shadow: 0 2px 10px rgba(37, 99, 235, 0.25);
}

.user-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
</style>
