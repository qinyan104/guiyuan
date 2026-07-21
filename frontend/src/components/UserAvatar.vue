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
  background: linear-gradient(135deg, #787670, #5c5a55);
  color: var(--color-text-on-accent);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.12);
}

.user-avatar.sm {
  width: 28px;
  height: 28px;
  font-size: 0.8rem;
  font-weight: 800;
}

.user-avatar.md {
  width: 42px;
  height: 42px;
  font-size: var(--text-title-18);
  font-weight: 500;
}

.user-avatar.lg {
  width: 112px;
  height: 112px;
  font-size: 34px;
  font-weight: 700;
}

.user-avatar.super_admin {
  background: linear-gradient(135deg, #c43a31, #a8322b);
  box-shadow: 0 2px 8px rgba(196, 58, 49, 0.3);
}

.user-avatar.admin {
  background: linear-gradient(135deg, #3d6896, #2d5178);
  box-shadow: 0 2px 8px rgba(61, 104, 150, 0.25);
}

.user-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
</style>
