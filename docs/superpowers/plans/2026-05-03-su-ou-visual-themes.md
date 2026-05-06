# Su & Ou Visual Themes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement high-fidelity "Su Style" and "Ou Style" traditional Chinese genealogy themes with unique textures, card designs, and connector logic.

**Architecture:** Use CSS custom properties for theme-wide tokens, SVG filters for physical paper textures, and conditional rendering in Vue components for style-specific decorations (seals, frames, grids).

**Tech Stack:** Vue 3, CSS (Filters, Variables), SVG.

---

### Task 1: Setup SVG Material Filters

**Files:**
- Modify: `frontend/src/App.vue`

- [ ] **Step 1: Define SVG filters for Su (Xuan paper) and Ou (Silk) textures**
  Add hidden SVG filters to the bottom of `App.vue` template.

```html
<!-- Inside <template> at the end -->
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
```

- [ ] **Step 2: Commit**
```bash
git add frontend/src/App.vue
git commit -m "feat(ui): add SVG material filters for Su and Ou themes"
```

---

### Task 2: Define Theme Variables

**Files:**
- Modify: `frontend/src/themes.css`

- [ ] **Step 1: Add [data-theme="su-style"] variables**
```css
[data-theme="su-style"] {
  --bg-shell: #f2ebdc;
  --bg-panel: rgba(255, 252, 246, 0.85);
  --bg-panel-strong: rgba(255, 253, 250, 0.95);
  --bg-paper: #fff9ef;
  --line-soft: rgba(117, 90, 57, 0.12);
  --text-main: #3a3226;
  --text-sub: #6b5035;
  --text-soft: #8a6845;
  --accent-amber: #a96e35;
  --accent-earth: #6a4b2f;
  --accent-ink: #3c5363;
  --tree-line-color: rgba(58, 50, 38, 0.8);
  --canvas-bg: var(--bg-shell);
  --card-panel-fill: var(--bg-panel);
  --card-panel-stroke: #6f5943;
  --card-selected-stroke: #ab6d30;
  --filter-paper: url(#su-paper-texture);
}
```

- [ ] **Step 2: Add [data-theme="ou-style"] variables**
```css
[data-theme="ou-style"] {
  --bg-shell: #e8d5b5;
  --bg-panel: rgba(255, 254, 252, 0.9);
  --bg-panel-strong: #fffefc;
  --bg-paper: #fcf8f0;
  --line-soft: rgba(178, 34, 34, 0.15); /* Cinnabar Red Grid */
  --text-main: #1a1a1a;
  --text-sub: #333333;
  --text-soft: #666666;
  --accent-amber: #b22222; /* Cinnabar */
  --accent-earth: #4a4a4a;
  --accent-ink: #1a1a1a;
  --tree-line-color: rgba(26, 26, 26, 0.9);
  --canvas-bg: var(--bg-shell);
  --card-panel-fill: var(--bg-panel);
  --card-panel-stroke: #1a1a1a;
  --card-selected-stroke: #b22222;
  --filter-paper: url(#ou-silk-texture);
}
```

- [ ] **Step 3: Commit**
```bash
git add frontend/src/themes.css
git commit -m "feat(ui): define CSS variables for Su and Ou themes"
```

---

### Task 3: Adapt Person Card Design

**Files:**
- Modify: `frontend/src/components/PersonCardSvg.vue`

- [ ] **Step 1: Implement Theme-Specific Card Shapes and Decorations**
  Add computed properties to detect theme and apply different `clip-path` or SVG elements (seals, headers).

```typescript
const currentTheme = computed(() => document.documentElement.getAttribute('data-theme'))
const isSu = computed(() => currentTheme.value === 'su-style')
const isOu = computed(() => currentTheme.value === 'ou-style')
```

- [ ] **Step 2: Update Card Template**
  - Su: Octagonal/Circle avatar, Red Name Seal.
  - Ou: Rectangular avatar, Cinnabar Header Line, Folded edge effect.

```html
<!-- Inside PersonCardSvg template -->
<!-- Example for Su Seal -->
<g v-if="isSu" class="card-seal">
  <rect :x="width - 32" :y="height - 32" width="24" height="24" fill="none" stroke="var(--accent-amber)" stroke-width="1.5" />
  <text :x="width - 20" :y="height - 15" font-size="8" text-anchor="middle" fill="var(--accent-amber)" font-family="KaiTi, serif">
    {{ person.name.slice(0, 2) }}
  </text>
</g>
```

- [ ] **Step 3: Commit**
```bash
git add frontend/src/components/PersonCardSvg.vue
git commit -m "feat(ui): implement theme-specific decorations in PersonCardSvg"
```

---

### Task 4: Adapt Canvas Connector and Grid

**Files:**
- Modify: `frontend/src/components/PublicationCanvas.vue`

- [ ] **Step 1: Implement Su-style "Pearl" connectors**
  Modify the connection path rendering to add a circle (`垂珠`) at junction points if theme is `su-style`.

```typescript
// In rendering logic
if (isSu.value) {
  // Add <circle> at (x, y) coordinates of the junction
}
```

- [ ] **Step 2: Implement Ou-style Grid and Sharp connectors**
  - Ensure `border-radius` of paths is 0 for `ou-style`.
  - Render background red grid using CSS background-image or SVG pattern.

- [ ] **Step 3: Commit**
```bash
git add frontend/src/components/PublicationCanvas.vue
git commit -m "feat(ui): adapt canvas connectors and grid for Su/Ou themes"
```

---

### Task 5: Integration and Switcher Update

**Files:**
- Modify: `frontend/src/components/ThemeSwitcher.vue`

- [ ] **Step 1: Add Su and Ou to ThemeSwitcher options**
```typescript
const themes = [
  { id: 'parchment', name: '宣纸 (默认)' },
  { id: 'su-style', name: '苏派 · 垂珠墨韵' },
  { id: 'ou-style', name: '欧派 · 绢本朱砂' },
  { id: 'ink-wash', name: '水墨 (深色)' },
  // ...
]
```

- [ ] **Step 2: Manual Verification**
  - Switch to Su: check octagonal avatar, pearl connectors, paper texture.
  - Switch to Ou: check red grid, rectangular avatar, sharp lines.

- [ ] **Step 3: Commit**
```bash
git add frontend/src/components/ThemeSwitcher.vue
git commit -m "feat(ui): integrate Su and Ou styles into ThemeSwitcher"
```
