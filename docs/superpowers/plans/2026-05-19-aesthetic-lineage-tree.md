# Aesthetic Enhancement of Compact Lineage Tree Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transform the basic compact mode into an elegant, calligraphic "Literary Lineage" (雅致吊线图) by adding bloodline knots (朱砂结), optimizing vertical typography (行气), and adding calligraphic interactions (金石印章).

**Architecture:** We will refine `PersonCardSvg.vue` by adding new SVG elements for the "knot" and "seal" effects. Typography will be enhanced using dynamic `tspan` spacing based on name length. CSS will be updated to handle the hover-gold and selection-seal states specifically for the compact mode.

**Tech Stack:** Vue 3, SVG, CSS, TypeScript

---

### Task 1: Refine Typography and Bloodline Knots

**Files:**
- Modify: `frontend/src/components/PersonCardSvg.vue`

- [ ] **Step 1: Implement Dynamic Spacing (行气) and Bloodline Knot**

Modify the name rendering logic in `PersonCardSvg.vue`. 
1.  Calculate `charGap` based on `person.name.length`.
2.  Add a `<circle>` for the vermilion knot.
3.  Adjust the starting `y` to account for the knot and the new gap.

```vue
    <!-- Compact Mode Enhancements -->
    <template v-if="!settings.showCard">
      <!-- Bloodline Knot (朱砂结) -->
      <circle
        class="person-card__knot"
        :cx="card.width / 2"
        :cy="0"
        r="2.2"
        fill="#b33939"
      />

      <!-- Calligraphic Name -->
      <text
        class="person-card__name--compact"
        :x="card.width / 2"
        :y="18 * settings.fontScale"
        text-anchor="middle"
        :style="{ 
          fontSize: `${18 * settings.fontScale}px`,
          fontWeight: 700,
          fontFamily: '\"Noto Serif SC\", serif',
          fill: '#2f2318'
        }"
      >
        <tspan
          v-for="(char, index) in person.name"
          :key="index"
          :x="card.width / 2"
          :dy="index === 0 ? 0 : (person.name.length === 2 ? 28 : (person.name.length === 3 ? 22 : 18)) * settings.fontScale"
        >
          {{ char }}
        </tspan>
      </text>
    </template>
```

- [ ] **Step 2: Remove the old `!settings.showCard` block from the previous implementation.**

Ensure no duplicate text elements exist.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/PersonCardSvg.vue
git commit -m "feat(ui): optimize vertical typography and add bloodline knots to compact mode"
```

### Task 2: Implement "Seal Impression" Selection and Hover States

**Files:**
- Modify: `frontend/src/components/PersonCardSvg.vue`
- Modify: `frontend/src/style.css`

- [ ] **Step 1: Add Seal Backdrop in `PersonCardSvg.vue`**

Add a conditional `<rect>` behind the name in compact mode to represent the seal.

```vue
    <!-- Seal Impression Backdrop (选中态印章) -->
    <rect
      v-if="!settings.showCard && selected"
      class="person-card__seal-impression"
      :x="card.width / 2 - 12 * settings.fontScale"
      :y="6"
      :width="24 * settings.fontScale"
      :height="card.height - 12"
      fill="#b33939"
      fill-opacity="0.08"
      rx="2"
    />
```

- [ ] **Step 2: Add CSS for Hover and Selection in `style.css`**

Add specific styles for the calligraphic mode to `frontend/src/style.css`.

```css
/* Calligraphic Mode Specifics */
.person-card__name--compact {
  transition: fill 0.3s ease;
}

.person-card:hover .person-card__name--compact {
  fill: var(--accent-amber) !important; /* Calligraphic Gold */
}

.person-card--selected .person-card__name--compact {
  fill: #b33939 !important; /* Seal Vermilion */
}

.person-card__knot {
  transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.person-card:hover .person-card__knot {
  transform: scale(1.4);
}
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/PersonCardSvg.vue frontend/src/style.css
git commit -m "feat(ui): add seal impression selection and calligraphic hover states"
```

### Task 3: Final Polish and Verification

**Files:**
- Modify: `frontend/src/lib/layout.ts`

- [ ] **Step 1: Fine-tune Layout Height**

Ensure the `cardHeight` in `layout.ts` provides enough "breathable" space for the new dynamic gaps.

```ts
// In layout.ts -> getCardDimensions
if (!settings.showCard) {
  return { width: 32, height: 110, partnerGap: 16 } // Increased height to 110 for better vertical flow
}
```

- [ ] **Step 2: Run verification**

Run: `npm run build && npm run test`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add frontend/src/lib/layout.ts
git commit -m "style(layout): fine-tune compact mode height for breathable typography"
```
