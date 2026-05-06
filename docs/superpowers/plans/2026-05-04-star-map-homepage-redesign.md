# Heritage Star Map Homepage Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the current homepage with a high-end "Star Map" interface where genealogies are represented as interactive, rotating constellations on an obsidian canvas.

**Architecture:** A fullscreen HTML5 Canvas for the starfield and constellations (for performance), with a Vue 3 overlay for HUD-style management tools (Edit/Delete/Templates).

**Tech Stack:** Vue 3, Canvas API, CSS3 Transitions.

---

### Task 1: Cleanup & Canvas Foundation

**Files:**
- Modify: `frontend/src/views/PublicationListView.vue`

- [ ] **Step 1: Revert all Zen/Ink styles and templates.**
    - Remove the `.zen-container`, `.ink-entity`, and SVG filters.
    - Create a new root container `.star-map-container` with `#050505` background.

- [ ] **Step 2: Add the Canvas element and resize logic.**
    - Add `<canvas ref="canvasRef"></canvas>` to the template.
    - Implement a `resizeCanvas` function in `onMounted` and `window.onresize`.

```typescript
const canvasRef = ref<HTMLCanvasElement | null>(null);
function resizeCanvas() {
  if (canvasRef.value) {
    canvasRef.value.width = window.innerWidth;
    canvasRef.value.height = window.innerHeight;
  }
}
```

- [ ] **Step 3: Commit.**

```bash
git add frontend/src/views/PublicationListView.vue
git commit -m "chore: cleanup zen styles and initialize star map canvas"
```

---

### Task 2: Background Starfield Engine

**Files:**
- Modify: `frontend/src/views/PublicationListView.vue`

- [ ] **Step 1: Define the `Star` class and parallax logic.**

```typescript
class Star {
  x: number; y: number; z: number; size: number;
  constructor() { /* randomize x, y, z */ }
  draw(ctx: CanvasRenderingContext2D, mouseX: number, mouseY: number) {
    // Apply parallax based on z-depth and mouse position
  }
}
```

- [ ] **Step 2: Implement the Animation Loop.**
    - Create an array of 500+ stars.
    - Use `requestAnimationFrame` to draw the stars each frame.

- [ ] **Step 3: Commit.**

```bash
git commit -am "feat: implement parallax starfield background"
```

---

### Task 3: Constellation Rendering (The Lineages)

**Files:**
- Modify: `frontend/src/views/PublicationListView.vue`

- [ ] **Step 1: Define the `Constellation` class.**
    - Should contain a core point (Ancestor) and surrounding nodes (Descendants).
    - Map each `Publication` to a `Constellation` instance.

```typescript
class Constellation {
  pub: PublicationSummary;
  rotation: number = 0;
  nodes: {x: number, y: number}[] = [];
  constructor(pub: PublicationSummary) { /* generate random nodes based on pub data */ }
  draw(ctx: CanvasRenderingContext2D) {
    // Draw central star, nodes, and faint connecting lines
  }
}
```

- [ ] **Step 2: Handle Hover/Click detection.**
    - Calculate distance between mouse and constellation center.
    - If hovered, brighten the constellation and show the title HUD.

- [ ] **Step 3: Commit.**

```bash
git commit -am "feat: implement rotating constellations for genealogies"
```

---

### Task 4: HUD & Management UI (The Controls)

**Files:**
- Modify: `frontend/src/views/PublicationListView.vue`

- [ ] **Step 1: Re-implement Edit/Delete as a "Tactical HUD".**
    - Show a floating UI near the hovered constellation.
    - Use thin borders and amber highlights.

- [ ] **Step 2: Restore "Dynasty Templates" as Corner Nebulae.**
    - Styled as glowing, ethereal light sources at the corners.

- [ ] **Step 3: Implement Warp-Drive Transition.**
    - When a constellation is clicked, accelerate the star speed and scale the canvas up before routing to `workbench`.

- [ ] **Step 4: Commit.**

```bash
git commit -am "feat: add tactical HUD and warp-drive transition"
```
