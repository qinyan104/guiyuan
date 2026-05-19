# Compact Lineage Tree Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement a "Show Card" toggle that, when disabled, switches the canvas layout to a compact text-only lineage tree (吊线图) by hiding card decorations and compressing the physical layout dimensions.

**Architecture:** We will add a `showCard` boolean to `PublicationSettings` (default `true`). The layout engine (`layout.ts`) will drastically reduce the card height when `showCard` is false, forcing the layout grid to compress vertically and naturally adapting the connector lines. The view layer (`PersonCardSvg.vue`) will conditionally skip rendering all backgrounds, frames, and secondary details (photos, dates) when the toggle is off, leaving only the person's name centered in the compressed space.

**Tech Stack:** Vue 3, TypeScript, Vitest, SVG

---

### Task 1: Update Settings State and UI Controls

**Files:**
- Modify: `frontend/src/types/family.ts`
- Modify: `frontend/src/features/validation/draftSchema.ts`
- Modify: `frontend/src/components/WorkbenchPanels.vue`
- Modify: `frontend/e2e/specs/features.spec.ts`
- Modify: `frontend/src/data/sampleFamily.ts`
- Modify: `frontend/src/features/export/shareHtmlExport.test.ts`

- [ ] **Step 1: Add `showCard` to the data structures**

Modify `frontend/src/types/family.ts` to add `showCard: boolean` to `PublicationSettings`:

```ts
export interface PublicationSettings {
  paper: PublicationPaper
  layoutMode: 'modern' | 'su' | 'ou'
  cardWidth: number
  generationGap: number
  siblingGap: number
  partnerGap: number
  fontScale: number
  zoom: number
  showDeath: boolean
  showAge: boolean
  showNote: boolean
  showPhoto: boolean
  showCard: boolean
  paddingX: number
  paddingY: number
}
```

Modify `frontend/src/features/validation/draftSchema.ts` to include `showCard` in the validation loop (around line 313):

```ts
  ;(['showDeath', 'showAge', 'showNote', 'showPhoto', 'showCard'] as const).forEach((field) => {
    if (typeof settings[field] === 'boolean') {
      safeSettings[field] = settings[field]
    }
  })
```

- [ ] **Step 2: Add the UI toggle in `WorkbenchPanels.vue`**

Modify `frontend/src/components/WorkbenchPanels.vue` around line 211 (in the `.toggle-row` div) to add the `showCard` toggle first:

```vue
      <div class="toggle-row">
        <label class="toggle">
          <input :checked="settings.showCard" type="checkbox" @change="updateSetting('showCard', readCheckedValue($event))" />
          <span>显示卡片</span>
        </label>

        <label class="toggle" :class="{ 'is-disabled': !settings.showCard }">
          <input :checked="settings.showDeath" type="checkbox" :disabled="!settings.showCard" @change="updateSetting('showDeath', readCheckedValue($event))" />
          <span>显示卒年</span>
        </label>

        <label class="toggle" :class="{ 'is-disabled': !settings.showCard }">
          <input :checked="settings.showAge" type="checkbox" :disabled="!settings.showCard" @change="updateSetting('showAge', readCheckedValue($event))" />
          <span>显示年龄</span>
        </label>

        <label class="toggle" :class="{ 'is-disabled': !settings.showCard }">
          <input :checked="settings.showNote" type="checkbox" :disabled="!settings.showCard" @change="updateSetting('showNote', readCheckedValue($event))" />
          <span>显示注记</span>
        </label>

        <label class="toggle" :class="{ 'is-disabled': !settings.showCard }">
          <input :checked="settings.showPhoto" type="checkbox" :disabled="!settings.showCard" @change="updateSetting('showPhoto', readCheckedValue($event))" />
          <span>显示照片</span>
        </label>
      </div>
```

- [ ] **Step 3: Update Default Settings instances**

Modify `frontend/e2e/specs/features.spec.ts` (Line 7):
```ts
const DEF_SETTINGS = { paper: 'A3', layoutMode: 'modern', cardWidth: 160, generationGap: 100, siblingGap: 40, partnerGap: 20, fontScale: 1, zoom: 1, showDeath: true, showAge: true, showNote: true, showPhoto: true, showCard: true, paddingX: 40, paddingY: 40 }
```

Modify `frontend/src/data/sampleFamily.ts` (Line 165):
```ts
    showDeath: true,
    showAge: true,
    showNote: true,
    showPhoto: true,
    showCard: true,
```

Modify `frontend/src/features/export/shareHtmlExport.test.ts` (Line 62):
```ts
        showDeath: true,
        showAge: true,
        showNote: true,
        showPhoto: true,
        showCard: true,
```

- [ ] **Step 4: Commit**

```bash
git add frontend/src/types/family.ts frontend/src/features/validation/draftSchema.ts frontend/src/components/WorkbenchPanels.vue frontend/e2e/specs/features.spec.ts frontend/src/data/sampleFamily.ts frontend/src/features/export/shareHtmlExport.test.ts
git commit -m "feat(layout): add showCard setting and ui toggle"
```

### Task 2: Adapt Layout Engine

**Files:**
- Modify: `frontend/src/lib/layout.test.ts`
- Modify: `frontend/src/lib/layout.ts`

- [ ] **Step 1: Write a test verifying the layout compresses when showCard is false**

Add this to `frontend/src/lib/layout.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { layoutPublication } from './layout'

describe('layout engine showCard compression', () => {
  it('compresses vertical and horizontal gaps when showCard is false', () => {
    const data = {
      title: '',
      subtitle: '',
      focusFamilyId: 'f1',
      people: {
        p1: { id: 'p1', name: 'A', gender: 'male' },
        p2: { id: 'p2', name: 'B', gender: 'female' },
      },
      families: {
        f1: { id: 'f1', adults: ['p1', 'p2'], children: [] },
      },
    }

    const standardSettings = {
      paper: 'A4',
      layoutMode: 'modern',
      cardWidth: 160,
      generationGap: 100,
      siblingGap: 40,
      partnerGap: 20,
      fontScale: 1,
      zoom: 1,
      showDeath: true,
      showAge: true,
      showNote: true,
      showPhoto: true,
      showCard: true,
      paddingX: 0,
      paddingY: 0,
    } as any

    const standardLayout = layoutPublication(data as any, standardSettings)
    const cardHeightStandard = standardLayout.cards[0].height

    const compactSettings = { ...standardSettings, showCard: false }
    const compactLayout = layoutPublication(data as any, compactSettings)
    const cardHeightCompact = compactLayout.cards[0].height

    expect(cardHeightStandard).toBe(Math.round(160 * 1.84))
    expect(cardHeightCompact).toBe(100) // The expected compressed height for vertical text
    expect(compactLayout.cards[0].width).toBe(32) // The expected compressed width
    expect(compactLayout.height).toBeLessThan(standardLayout.height)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- src/lib/layout.test.ts`
Expected: FAIL because `cardHeightCompact` is still `160 * 1.84`.

- [ ] **Step 3: Modify the layout calculations in `layout.ts`**

In `frontend/src/lib/layout.ts`:

Replace the static `getCardHeight` function:

```ts
function getCardHeight(cardWidth: number): number {
  return Math.round(cardWidth * 1.84)
}
```

With one that knows about settings:

```ts
function getCardDimensions(settings: PublicationSettings): { width: number; height: number; partnerGap: number } {
  if (!settings.showCard) {
    return { width: 32, height: 100, partnerGap: 16 }
  }
  return { 
    width: settings.cardWidth, 
    height: Math.round(settings.cardWidth * 1.84),
    partnerGap: settings.partnerGap
  }
}
```

Replace all logic inside `measureNodeModern`, `placeNodeModern`, `measureNodeSu`, and `placeNodeSu` to use this new function instead of `settings.cardWidth`, `settings.partnerGap` and `getCardHeight`.

For example, in `measureNodeModern`:
```ts
function measureNodeModern(node: TreeNode, settings: PublicationSettings): { generations: number } {
  const dims = getCardDimensions(settings)
  const cardHeight = dims.height
  node.adultBlockWidth =
    node.adults.length * dims.width + Math.max(0, node.adults.length - 1) * dims.partnerGap
  const entryAdultIndex = node.entryPersonId ? node.adults.indexOf(node.entryPersonId) : -1
  node.adultAnchorOffset =
    entryAdultIndex >= 0
      ? entryAdultIndex * (dims.width + dims.partnerGap) + dims.width / 2
      : node.adultBlockWidth / 2
```

Make similar replacements for all width/gap physics in `placeNodeModern`, `measureNodeSu` (update `indent = dims.width * 0.75`), and `placeNodeSu`.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test -- src/lib/layout.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add frontend/src/lib/layout.test.ts frontend/src/lib/layout.ts
git commit -m "feat(layout): compress grid mathematically when showCard is false"
```

### Task 3: Adapt View Rendering

**Files:**
- Modify: `frontend/src/components/PersonCardSvg.vue`

- [ ] **Step 1: Implement conditional rendering in `PersonCardSvg.vue`**

In `frontend/src/components/PersonCardSvg.vue`, wrap all the visual background layers in `v-if="settings.showCard"`.

The root `<g>` element stays the same.

```vue
    <defs v-if="isSu && settings.showCard">
```

```vue
    <path
      v-if="isSu && settings.showCard"
      class="person-card__panel"
      :d="octagonalPath"
    />
    <rect
      v-else-if="settings.showCard"
      class="person-card__panel"
      :width="card.width"
      :height="card.height"
      :rx="isOu ? 4 : 22"
      :ry="isOu ? 4 : 22"
    />

    <foreignObject v-if="settings.showCard" x="0" y="0" :width="card.width" :height="card.height">
      <div xmlns="http://www.w3.org/1999/xhtml" class="person-card__glass-backdrop" :style="{ width: '100%', height: '100%', borderRadius: isOu ? '4px' : (isSu ? '0' : '22px') }"></div>
    </foreignObject>

    <rect v-if="settings.showCard" class="person-card__inner" x="8" y="8" :width="card.width - 16" :height="card.height - 16" :rx="isOu ? 2 : (isSu ? 14 : 18)" :ry="isOu ? 2 : (isSu ? 14 : 18)" />
```

For the Ou decorations:
```vue
    <!-- Ou Style Corner Decorations -->
    <g v-if="isOu && settings.showCard" class="ou-decorations" stroke="var(--accent-amber)" stroke-width="1.2" fill="none">
```
```vue
    <path
      v-if="isOu && settings.showCard"
      :d="`M ${card.width - 35} 8 L ${card.width - 8} 35 L ${card.width - 8} 8 Z`"
      fill="var(--accent-amber)"
      opacity="0.3"
    />
```

For the headers and badges:
```vue
    <rect
      v-if="imperialBadge && settings.showCard"
      class="person-card__accent-frame"
```
```vue
    <rect v-if="settings.showCard" class="person-card__header" x="16" y="16" :width="card.width - 32" height="28" rx="14" ry="14" />

    <!-- Ou Header Line -->
    <line v-if="isOu && settings.showCard" x1="16" y1="16" :x2="card.width - 16" y2="16" stroke="var(--accent-amber)" stroke-width="3" />
```

Update text positioning and visibility. The Name is the only thing always visible. If `!settings.showCard`, render it vertically:

```vue
    <g v-if="settings.showCard">
      <g v-if="imperialBadge">
        <!-- ... ribbon and label ... -->
      </g>
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
    </g>

    <!-- Always visible name -->
    <text
      class="person-card__name"
      :x="card.width / 2"
      :y="settings.showCard ? 96 : card.height / 2 - (person.name.length * 20 * settings.fontScale) / 2 + 15"
      text-anchor="middle"
      :style="{ fontSize: `${settings.showCard ? nameFontSize : 18 * settings.fontScale}px` }"
    >
      <tspan v-if="settings.showCard">{{ person.name }}</tspan>
      <tspan v-else v-for="(char, i) in person.name.split('')" :key="i" :x="card.width / 2" :dy="i === 0 ? 0 : 20 * settings.fontScale">
        {{ char }}
      </tspan>
    </text>
```

Wrap the rest in `<template v-if="settings.showCard">`:

```vue
    <!-- Su Style Name Seal -->
    <g v-if="isSu && settings.showCard" class="card-seal">
```
```vue
    <g v-if="lineageBadgeLines.length && settings.showCard">
```
```vue
    <template v-if="settings.showCard">
      <g v-if="settings.showPhoto && person.avatarUrl">
        <!-- ... photo ... -->
      </g>
      <g v-else>
        <!-- ... seal ... -->
      </g>

      <g v-if="settings.showNote && cardNote && !(settings.showPhoto && person.avatarUrl)">
        <!-- ... note ... -->
      </g>

      <g v-for="(row, index) in detailRows" :key="`${person.id}-${row.label}`">
        <!-- ... details ... -->
      </g>
    </template>
```

- [ ] **Step 2: Run full build and test suite**

Run: `npm run build && npm run test`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/PersonCardSvg.vue
git commit -m "feat(ui): conditionally render svg nodes to support compact lineage mode"
```
