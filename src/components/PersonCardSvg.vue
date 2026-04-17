<script setup lang="ts">
import { computed } from 'vue'

import type { Person, PositionedCard, PublicationSettings } from '../types/family'

const props = defineProps<{
  person: Person
  card: PositionedCard
  settings: PublicationSettings
  selected: boolean
}>()

const emit = defineEmits<{
  (event: 'select', personId: string): void
}>()

function findYear(raw?: string): number | undefined {
  const match = raw?.match(/(\d{4})/)
  return match ? Number(match[1]) : undefined
}

function normalizeAge(raw: string): string {
  return raw.endsWith('岁') ? raw : `${raw}岁`
}

const statusLabel = computed(() => (props.person.death ? '已故' : '在世'))

const detailRows = computed(() => {
  const rows: Array<{ label: string; value: string }> = []

  if (props.person.birth) {
    rows.push({ label: '生于', value: props.person.birth })
  }

  if (props.settings.showDeath && props.person.death) {
    rows.push({ label: '卒于', value: props.person.death })
  }

  if (props.settings.showAge) {
    if (props.person.age) {
      rows.push({ label: props.person.death ? '享年' : '今年', value: normalizeAge(props.person.age) })
    } else {
      const birthYear = findYear(props.person.birth)
      const deathYear = findYear(props.person.death)

      if (birthYear && deathYear && deathYear >= birthYear) {
        rows.push({ label: '享年', value: `${deathYear - birthYear}岁` })
      } else if (birthYear && !deathYear) {
        rows.push({ label: '今年', value: `${new Date().getFullYear() - birthYear}岁` })
      }
    }
  }

  if (rows.length === 0) {
    rows.push({ label: '待录', value: '补充生平信息' })
  }

  return rows.slice(0, 3)
})

const nameFontSize = computed(() => {
  const count = props.person.name.length
  if (count >= 7) return 21 * props.settings.fontScale
  if (count >= 5) return 24 * props.settings.fontScale
  return 28 * props.settings.fontScale
})

const noteFontSize = computed(() => 13 * props.settings.fontScale)
const statusFontSize = computed(() => 12 * props.settings.fontScale)
const detailFontSize = computed(() => 13.5 * props.settings.fontScale)

const detailStartY = computed(() => props.card.height - 98)
const noteY = computed(() => props.card.height * 0.47)

function handleSelect() {
  emit('select', props.person.id)
}
</script>

<template>
  <g
    class="person-card"
    :class="[`person-card--${person.gender}`, { 'person-card--selected': selected }]"
    :transform="`translate(${card.x}, ${card.y})`"
    @click="handleSelect"
  >
    <rect class="person-card__panel" :width="card.width" :height="card.height" rx="22" ry="22" />
    <rect class="person-card__inner" x="8" y="8" :width="card.width - 16" :height="card.height - 16" rx="18" ry="18" />
    <rect class="person-card__header" x="16" y="16" :width="card.width - 32" height="28" rx="14" ry="14" />

    <text
      class="person-card__status"
      :x="card.width / 2"
      y="35"
      text-anchor="middle"
      :style="{ fontSize: `${statusFontSize}px` }"
    >
      {{ statusLabel }}
    </text>

    <line class="person-card__divider" x1="18" y1="58" :x2="card.width - 18" y2="58" />

    <text
      class="person-card__name"
      :x="card.width / 2"
      y="96"
      text-anchor="middle"
      :style="{ fontSize: `${nameFontSize}px` }"
    >
      {{ person.name }}
    </text>

    <circle class="person-card__seal" :cx="card.width / 2" :cy="card.height * 0.42" :r="card.width * 0.18" />
    <path
      class="person-card__seal-mark"
      :d="`M ${card.width / 2 - 10} ${card.height * 0.42} Q ${card.width / 2} ${card.height * 0.42 - 16} ${card.width / 2 + 10} ${card.height * 0.42}`"
    />

    <g v-if="settings.showNote && person.note">
      <rect
        class="person-card__note-pill"
        x="24"
        :y="noteY - 14"
        :width="card.width - 48"
        height="28"
        rx="14"
        ry="14"
      />
      <text
        class="person-card__note"
        :x="card.width / 2"
        :y="noteY + 4"
        text-anchor="middle"
        :style="{ fontSize: `${noteFontSize}px` }"
      >
        {{ person.note }}
      </text>
    </g>

    <g v-for="(row, index) in detailRows" :key="`${person.id}-${row.label}`">
      <rect
        class="person-card__detail-band"
        x="14"
        :y="detailStartY + index * 28"
        :width="card.width - 28"
        height="22"
        rx="11"
        ry="11"
      />
      <text
        class="person-card__detail"
        :x="card.width / 2"
        :y="detailStartY + index * 28 + 15"
        text-anchor="middle"
        :style="{ fontSize: `${detailFontSize}px` }"
      >
        {{ `${row.label}${row.value}` }}
      </text>
    </g>
  </g>
</template>
