# Archive Pro Homepage Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement a professional, minimalist "Digital Archive" homepage for genealogy management, replacing all previous abstract effects with a clean, museum-style grid.

**Architecture:** A highly structured CSS Grid layout using matte materials, precise typography, and generous whitespace.

**Tech Stack:** Vue 3, Vanilla CSS (Flexbox/Grid), Standard Transitions.

---

### Task 1: Foundation Cleanup & Layout Setup

**Files:**
- Modify: `frontend/src/views/PublicationListView.vue`

- [ ] **Step 1: Revert all Canvas and Star Map code.**
    - Remove the `<canvas>`, the `Star` and `Constellation` classes, and all animation loop logic.
    - Create a new root container `.archive-container` with background `#f9f9fb`.

- [ ] **Step 2: Define the "Archive Pro" Grid Structure.**

```vue
<div class="archive-container">
  <header class="archive-header">
    <div class="archive-header__title">
      <h1>DIGITAL ARCHIVE</h1>
      <span class="archive-stats">COLLECTION: {{ publications.length }} RECORDS</span>
    </div>
  </header>

  <div class="archive-grid">
    <!-- Grid Slot for New Project -->
    <div class="folio-card folio-card--new" @click="showCreateDialog = true">
      <div class="folio-card__plus">+</div>
      <div class="folio-card__label">INITIATE NEW RECORD</div>
    </div>

    <!-- Genealogy Folios -->
    <div 
      v-for="pub in publications" 
      :key="pub.id" 
      class="folio-card"
      @click="openPublication(pub.id)"
    >
      <!-- Folio Content -->
    </div>
  </div>
</div>
```

- [ ] **Step 3: Commit.**

```bash
git add frontend/src/views/PublicationListView.vue
git commit -m "chore: remove star map and setup archive pro grid foundation"
```

---

### Task 2: Folio Card Design & Typography

**Files:**
- Modify: `frontend/src/views/PublicationListView.vue`

- [ ] **Step 1: Implement the "Folio" Card Visuals.**

```css
.folio-card {
  position: relative;
  background: #ffffff;
  border: 1px solid #e5e5e7;
  border-radius: 4px;
  height: 480px; /* Tall folio shape */
  padding: 40px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  transition: transform 0.2s, border-color 0.2s;
  cursor: pointer;
}

.folio-card:hover {
  transform: translateY(-4px);
  border-color: #1a1a1a;
}
```

- [ ] **Step 2: Add Vertical Title & Technical Meta.**

```vue
<!-- Inside .folio-card -->
<div class="folio-card__header">
  <span class="folio-card__id">ID-{{ pub.id.toString().padStart(4, '0') }}</span>
</div>
<div class="folio-card__body">
  <h2 class="folio-card__title">{{ pub.title || 'UNTITLED LINEAGE' }}</h2>
</div>
<div class="folio-card__footer">
  <div class="folio-card__meta">
    <span>GEN: {{ pub.info?.ancestralOrigin ? 'DATA_ACTIVE' : 'DATA_EMPTY' }}</span>
    <span>UPDATED: {{ formatDate(pub.updatedAt) }}</span>
  </div>
</div>
```

- [ ] **Step 3: Commit.**

```bash
git commit -am "feat: implement folio card design with vertical typography"
```

---

### Task 3: Management Interface & Action Links

**Files:**
- Modify: `frontend/src/views/PublicationListView.vue`

- [ ] **Step 1: Add Text-based Action Links.**
    - Replace icons with clean "[ EDIT ]" and "[ DELETE ]" text links.

```vue
<!-- Inside .folio-card__footer -->
<div class="folio-card__actions">
  <button @click.stop="openEditDialog(pub)">[ EDIT ]</button>
  <button @click.stop="deleteConfirmId = pub.id" class="action-delete">[ DELETE ]</button>
</div>
```

- [ ] **Step 2: Style the Action Links.**

```css
.folio-card__actions button {
  font-family: 'Inter', monospace;
  font-size: 0.65rem;
  letter-spacing: 0.1em;
  color: #888;
  background: none;
  border: none;
  padding: 0 10px;
}

.folio-card__actions button:hover {
  color: #1a1a1a;
}

.folio-card__actions .action-delete:hover {
  color: #a12d2d;
}
```

- [ ] **Step 3: Commit.**

```bash
git commit -am "feat: add archival-style management links"
```

---

### Task 4: Template Reference & Final Polish

**Files:**
- Modify: `frontend/src/views/PublicationListView.vue`

- [ ] **Step 1: Implement "Reference Samples" Section.**
    - Group dynasty templates at the bottom with a distinct heading.

```vue
<div class="archive-section">
  <h3 class="section-label">REFERENCE SAMPLES / DYNASTY TEMPLATES</h3>
  <div class="archive-grid archive-grid--compact">
    <div 
      v-for="sample in builtinSamples" 
      :key="sample.id" 
      class="folio-card folio-card--compact"
      @click="handleCreateFromTemplate(sample)"
    >
       <!-- Sample content -->
    </div>
  </div>
</div>
```

- [ ] **Step 2: Final CSS Cleanup & Transition Polish.**
    - Ensure all dialogs (Create/Edit/Delete) match the new Studio White aesthetic.

- [ ] **Step 3: Commit.**

```bash
git commit -am "feat: finalize archive pro with reference samples and polished transitions"
```
