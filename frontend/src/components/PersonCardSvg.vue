<script setup lang="ts">
import { computed } from 'vue'

import { getPersonStatusLabel, isPersonDeceased } from '../lib/personStatus'
import type { Person, PositionedCard, PublicationSettings } from '../types/family'

const props = defineProps<{
  person: Person
  card: PositionedCard
  settings: PublicationSettings
  selected: boolean
  showGlass?: boolean  // 方案三: false 时跳过 foreignObject 毛玻璃（拖拽降质）
  kinshipNote?: string | null  // 当前查看者与此人的亲属关系称谓
}>()

const emit = defineEmits<{
  (event: 'select', personId: string): void
  (event: 'hover', personId: string | null): void
}>()

function findYear(raw?: string): number | undefined {
  const match = raw?.match(/(前)?(\d{1,4})/)
  if (!match) return undefined

  const year = Number(match[2])
  return match[1] ? 1 - year : year
}

function normalizeAge(raw: string): string {
  return raw.endsWith('岁') ? raw : `${raw}岁`
}

const personIsDeceased = computed(() => isPersonDeceased(props.person))
const statusLabel = computed(() => getPersonStatusLabel(props.person))
const cardNote = computed(() => {
  // 有亲属称谓时优先显示（族人视角）
  if (props.kinshipNote) return props.kinshipNote
  return props.person.titleName || props.person.note || ''
})

const cardClasses = computed(() => [
  `person-card--${props.person.gender}`,
  props.person.highlightRole ? `person-card--${props.person.highlightRole}` : '',
  props.selected ? 'person-card--selected' : '',
  props.kinshipNote === '本人' ? 'person-card--ego' : '',
  props.person.isMountPoint ? 'is-mount-point' : '',
])

const imperialBadge = computed(() => {
  if (props.person.highlightRole === 'emperor') {
    return { kind: 'emperor' as const, label: '继位' }
  }

  if (props.person.highlightRole === 'heir') {
    return { kind: 'heir' as const, label: '储君' }
  }

  return null
})

const lineageBadge = computed(() => {
  if (props.card.lineageRole === 'married-out') {
    return '外嫁'
  }

  if (props.card.lineageRole === 'uxorilocal') {
    return '招婿'
  }

  if (props.card.lineageRole === 'in-law') {
    return props.person.gender === 'male' ? '婿' : '配偶'
  }

  return ''
})

const lineageBadgeLines = computed(() => {
  if (!lineageBadge.value) {
    return []
  }

  return lineageBadge.value.length > 1 ? lineageBadge.value.split('') : [lineageBadge.value]
})

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
      rows.push({ label: personIsDeceased.value ? '享年' : '今年', value: normalizeAge(props.person.age) })
    } else {
      const birthYear = findYear(props.person.birth)
      const deathYear = findYear(props.person.death)

      if (birthYear !== undefined && deathYear !== undefined && deathYear >= birthYear) {
        rows.push({ label: '享年', value: `${deathYear - birthYear}岁` })
      } else if (birthYear !== undefined && deathYear === undefined && !personIsDeceased.value) {
        rows.push({ label: '今年', value: `${new Date().getFullYear() - birthYear}岁` })
      }
    }
  }

  if (rows.length < 3 && props.person.clan) {
    rows.push({ label: '宗族', value: props.person.clan })
  }

  if (rows.length === 0) {
    rows.push(personIsDeceased.value ? { label: '状态', value: '已故' } : { label: '待录', value: '补充生平信息' })
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
const imperialBadgeFontSize = computed(() => 11.5 * props.settings.fontScale)

const octagonalPath = computed(() => {
  const w = props.card.width
  const h = props.card.height
  const c = 18 // corner cut size
  return `M ${c} 0 L ${w - c} 0 L ${w} ${c} L ${w} ${h - c} L ${w - c} ${h} L ${c} ${h} L 0 ${h - c} L 0 ${c} Z`
})

const photoWidth = computed(() => props.card.width * 0.46)
const photoHeight = computed(() => photoWidth.value * 1.25)
const photoY = 106

const detailStartY = computed(() => {
  if (props.settings.showPhoto && props.person.avatarUrl) {
    return photoY + photoHeight.value + 6
  }
  return props.card.height - 98
})

const noteY = computed(() => props.card.height * 0.47)

const currentTheme = computed(() => document.documentElement.getAttribute('data-theme'))
const isSu = computed(() => currentTheme.value === 'su-style')
const isOu = computed(() => currentTheme.value === 'ou-style')

function handleSelect() {
  emit('select', props.person.id)
}

function handleMouseEnter() {
  emit('hover', props.person.id)
}

function handleMouseLeave() {
  emit('hover', null)
}
</script>

<template>
  <g
    class="person-card"
    :class="cardClasses"
    :data-person-id="person.id"
    :transform="`translate(${card.x}, ${card.y})`"
    @click="handleSelect"
    @mouseenter="handleMouseEnter"
    @mouseleave="handleMouseLeave"
  >
    <defs v-if="isSu">
      <clipPath :id="`avatar-clip-su-${person.id}`">
        <circle :cx="card.width / 2" :cy="photoY + photoHeight / 2" :r="photoWidth / 2" />
      </clipPath>
    </defs>

    <path
      v-if="settings.showCard && isSu"
      class="person-card__panel"
      :d="octagonalPath"
    />
    <rect
      v-if="settings.showCard && !isSu"
      class="person-card__panel"
      :width="card.width"
      :height="card.height"
      :rx="isOu ? 4 : 22"
      :ry="isOu ? 4 : 22"
    />

    <foreignObject v-if="settings.showCard && showGlass !== false" x="0" y="0" :width="card.width" :height="card.height">
      <div xmlns="http://www.w3.org/1999/xhtml" class="person-card__glass-backdrop" :style="{ width: '100%', height: '100%', borderRadius: isOu ? '4px' : (isSu ? '0' : '22px') }"></div>
    </foreignObject>

    <rect v-if="settings.showCard" class="person-card__inner" x="8" y="8" :width="card.width - 16" :height="card.height - 16" :rx="isOu ? 2 : (isSu ? 14 : 18)" :ry="isOu ? 2 : (isSu ? 14 : 18)" />

    <!-- Branch Mount Point Icon -->
    <g v-if="settings.showCard && person.isMountPoint" transform="translate(10, 10)">
      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z" fill="#2d59a2" transform="scale(0.8)" />
    </g>

    <!-- Ou Style Corner Decorations -->
    <g v-if="settings.showCard && isOu" class="ou-decorations" stroke="var(--accent-amber)" stroke-width="1.2" fill="none">
      <path d="M 12 20 L 12 12 L 20 12" />
      <path :d="`M ${card.width - 20} 12 L ${card.width - 12} 12 L ${card.width - 12} 20`" />
      <path :d="`M 12 ${card.height - 20} L 12 ${card.height - 12} L 20 ${card.height - 12}`" />
      <path :d="`M ${card.width - 20} ${card.height - 12} L ${card.width - 12} ${card.height - 12} L ${card.width - 12} ${card.height - 20}`" />
    </g>

    <!-- Ou Style Folded Edge Effect -->
    <path
      v-if="settings.showCard && isOu"
      :d="`M ${card.width - 35} 8 L ${card.width - 8} 35 L ${card.width - 8} 8 Z`"
      fill="var(--accent-amber)"
      opacity="0.3"
    />

    <rect
      v-if="settings.showCard && imperialBadge"
      class="person-card__accent-frame"
      :class="`person-card__accent-frame--${imperialBadge.kind}`"
      x="5"
      y="5"
      :width="card.width - 10"
      :height="card.height - 10"
      rx="20"
      ry="20"
    />
    <rect v-if="settings.showCard" class="person-card__header" x="16" y="16" :width="card.width - 32" height="28" rx="14" ry="14" />

    <!-- Ou Header Line -->
    <line v-if="settings.showCard && isOu" x1="16" y1="16" :x2="card.width - 16" y2="16" stroke="var(--accent-amber)" stroke-width="3" />

    <g v-if="settings.showCard && imperialBadge">
      <rect
        class="person-card__imperial-ribbon"
        :class="`person-card__imperial-ribbon--${imperialBadge.kind}`"
        :x="card.width - 74"
        y="20"
        width="56"
        height="24"
        rx="12"
        ry="12"
      />
      <text
        class="person-card__imperial-label"
        :class="`person-card__imperial-label--${imperialBadge.kind}`"
        :x="card.width - 46"
        y="36"
        text-anchor="middle"
        :style="{ fontSize: `${imperialBadgeFontSize}px` }"
      >
        {{ imperialBadge.label }}
      </text>
    </g>

    <text
      v-if="settings.showCard"
      class="person-card__status"
      :x="card.width / 2"
      y="35"
      text-anchor="middle"
      :style="{ fontSize: `${statusFontSize}px` }"
    >
      {{ statusLabel }}
    </text>

    <line v-if="settings.showCard" class="person-card__divider" x1="18" y1="58" :x2="card.width - 18" y2="58" />

    <!-- Compact Mode (Drop-line diagram / 吊线图) -->
    <g v-if="!settings.showCard" class="person-card--compact-mode">
      <!-- Invisible Clickable Area to make the entire card selectable -->
      <rect
        x="0"
        y="0"
        :width="card.width"
        :height="card.height"
        fill="transparent"
      />

      <!-- Continuous Drop Line Behind Name -->
      <line
        class="person-card__drop-line"
        :x1="card.width / 2"
        y1="0"
        :x2="card.width / 2"
        :y2="card.height - 10"
        stroke="var(--line-soft, rgba(0,0,0,0.15))"
        stroke-width="1.5"
      />

      <!-- Elegant Bloodline Knot -->
      <circle
        class="person-card__knot-ring"
        :cx="card.width / 2"
        cy="0"
        r="4.5"
        fill="var(--bg-panel, #ffffff)"
        :stroke="selected ? '#b33939' : 'var(--accent-amber, #0071e3)'"
        stroke-width="1.5"
      />
      <circle
        class="person-card__knot-core"
        :cx="card.width / 2"
        cy="0"
        r="2"
        :fill="selected ? '#b33939' : 'var(--accent-amber, #0071e3)'"
      />

      <!-- Refined Compact Name (Solemn and Grand Typography) -->
      <text
        class="person-card__name--compact"
        :x="card.width / 2"
        :y="32 * settings.fontScale"
        text-anchor="middle"
        :style="{
          fontSize: `${22 * settings.fontScale}px`,
          fontWeight: 500,
          fontFamily: '\'Noto Serif SC\', \'Songti SC\', \'STZhongsong\', serif',
          fill: selected ? '#b33939' : 'var(--text-main, #1d1d1f)',
          transition: 'fill 0.2s ease'
        }"
      >
        <tspan
          v-for="(char, index) in person.name"
          :key="index"
          :x="card.width / 2"
          :dy="index === 0 ? 0 : (
            person.name.length === 2 ? 42 * settings.fontScale :
            person.name.length === 3 ? 34 * settings.fontScale :
            28 * settings.fontScale
          )"
        >
          {{ char }}
        </tspan>
      </text>

      <!-- Lineage Badge (Compact Vertical Tag at Top Right) -->
      <g v-if="lineageBadge">
        <rect
          :x="card.width / 2 + 16 * settings.fontScale"
          :y="12 * settings.fontScale"
          :width="14 * settings.fontScale"
          :height="lineageBadge.length * 12 * settings.fontScale + 8"
          fill="var(--bg-panel, #ffffff)"
          stroke="var(--line-soft, #cccccc)"
          stroke-width="0.8"
          rx="2"
        />
        <text
          :x="card.width / 2 + 23 * settings.fontScale"
          :y="22 * settings.fontScale"
          text-anchor="middle"
          :style="{
            fontSize: `${10 * settings.fontScale}px`,
            fontWeight: 500,
            fontFamily: '\'Noto Serif SC\', \'Songti SC\', \'STZhongsong\', serif',
            fill: 'var(--text-soft, #86868b)'
          }"
        >
          <tspan
            v-for="(char, index) in lineageBadge.split('')"
            :key="index"
            :x="card.width / 2 + 23 * settings.fontScale"
            :dy="index === 0 ? 0 : 12 * settings.fontScale"
          >
            {{ char }}
          </tspan>
        </text>
      </g>

      <!-- Imperial/Heir Indicator (Compact Vertical Tag at Top Left) -->
      <g v-if="imperialBadge">
        <rect
          :x="card.width / 2 - 30 * settings.fontScale"
          :y="12 * settings.fontScale"
          :width="14 * settings.fontScale"
          :height="imperialBadge.label.length * 12 * settings.fontScale + 8"
          fill="var(--bg-panel, #ffffff)"
          stroke="var(--accent-amber, #0071e3)"
          stroke-width="0.8"
          rx="2"
        />
        <text
          :x="card.width / 2 - 23 * settings.fontScale"
          :y="22 * settings.fontScale"
          text-anchor="middle"
          :style="{
            fontSize: `${10 * settings.fontScale}px`,
            fontWeight: 500,
            fontFamily: '\'Noto Serif SC\', \'Songti SC\', \'STZhongsong\', serif',
            fill: 'var(--accent-amber, #0071e3)'
          }"
        >
          <tspan
            v-for="(char, index) in imperialBadge.label.split('')"
            :key="index"
            :x="card.width / 2 - 23 * settings.fontScale"
            :dy="index === 0 ? 0 : 12 * settings.fontScale"
          >
            {{ char }}
          </tspan>
        </text>
      </g>
    </g>

    <text
      v-if="settings.showCard"
      class="person-card__name"
      :x="card.width / 2"
      y="96"
      text-anchor="middle"
      :style="{ fontSize: `${nameFontSize}px` }"
    >
      {{ person.name }}
    </text>



    <!-- Su Style Name Seal -->
    <g v-if="settings.showCard && isSu" class="card-seal">
      <rect :x="card.width - 42" :y="85" width="24" height="24" fill="none" stroke="var(--accent-amber)" stroke-width="1.5" />
      <text :x="card.width - 30" :y="102" font-size="8" text-anchor="middle" fill="var(--accent-amber)" font-family="KaiTi, serif">
        {{ person.name.slice(0, 2) }}
      </text>
    </g>

    <g v-if="settings.showCard && lineageBadgeLines.length">
      <rect
        class="person-card__lineage-pill"
        x="18"
        y="68"
        width="26"
        :height="lineageBadgeLines.length > 1 ? 44 : 28"
        rx="13"
        ry="13"
      />
      <text
        class="person-card__lineage-text"
        x="31"
        :y="lineageBadgeLines.length > 1 ? 83 : 86"
        text-anchor="middle"
        :style="{ fontSize: `${noteFontSize}px` }"
      >
        <tspan v-for="(line, index) in lineageBadgeLines" :key="`${lineageBadge}-${index}`" x="31" :dy="index === 0 ? 0 : 14">
          {{ line }}
        </tspan>
      </text>
    </g>

    <g v-if="settings.showCard && settings.showPhoto && person.avatarUrl">
      <rect
        :x="card.width / 2 - photoWidth / 2"
        :y="photoY"
        :width="photoWidth"
        :height="photoHeight"
        fill="rgba(169, 110, 53, 0.05)"
        :rx="isOu ? 0 : 4"
        :ry="isOu ? 0 : 4"
      />
      <image
        :href="person.avatarUrl"
        :x="card.width / 2 - photoWidth / 2"
        :y="photoY"
        :width="photoWidth"
        :height="photoHeight"
        preserveAspectRatio="xMidYMid meet"
        :clip-path="isSu ? `url(#avatar-clip-su-${person.id})` : undefined"
      />
      <rect
        :x="card.width / 2 - photoWidth / 2"
        :y="photoY"
        :width="photoWidth"
        :height="photoHeight"
        fill="none"
        stroke="var(--border-color)"
        stroke-width="1.5"
        :rx="isOu ? 0 : (isSu ? photoWidth / 2 : 4)"
        :ry="isOu ? 0 : (isSu ? photoWidth / 2 : 4)"
      />
    </g>
    <g v-else-if="settings.showCard">
      <circle class="person-card__seal" :cx="card.width / 2" :cy="card.height * 0.42" :r="card.width * 0.18" />
      <path
        class="person-card__seal-mark"
        :d="`M ${card.width / 2 - 10} ${card.height * 0.42} Q ${card.width / 2} ${card.height * 0.42 - 16} ${card.width / 2 + 10} ${card.height * 0.42}`"
      />
    </g>

    <g v-if="settings.showCard && settings.showNote && cardNote && !(settings.showPhoto && person.avatarUrl)">
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
        {{ cardNote }}
      </text>
    </g>

    <g v-if="settings.showCard">
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
  </g>
</template>
