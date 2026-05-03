<script setup lang="ts">
import { useTheme } from './composables/useTheme'

const theme = useTheme()
</script>

<template>
  <router-view />

  <!-- Material Textures -->
  <svg style="position: absolute; width: 0; height: 0;" aria-hidden="true">
    <filter id="su-paper-texture">
      <feTurbulence type="fractalNoise" baseFrequency="0.04" numOctaves="5" result="noise" />
      <feColorMatrix in="noise" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.05 0" />
      <feBlend in="SourceGraphic" mode="multiply" />
    </filter>
    <filter id="ou-silk-texture">
      <feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves="3" result="noise" />
      <feDisplacementMap in="SourceGraphic" in2="noise" scale="1" />
    </filter>
  </svg>
</template>
