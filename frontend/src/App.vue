<script setup lang="ts">
import { useTheme } from './composables/useTheme'

const theme = useTheme()
</script>

<template>
  <router-view />
</template>
