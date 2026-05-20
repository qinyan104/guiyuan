# Update Settings State and UI Controls Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add `showCard` setting to `PublicationSettings`, update validation, UI controls, and default values.

**Architecture:** Extend `PublicationSettings` interface and update all its usages in validation, default data, and UI.

**Tech Stack:** Vue 3, TypeScript, Vitest, Playwright.

---

### Task 1: Update Validation Logic

**Files:**
- Modify: `frontend/src/features/validation/draftSchema.ts`

- [ ] **Step 1: Add `showCard` to boolean validation loop**

```typescript
// frontend/src/features/validation/draftSchema.ts around line 313
  ;(['showCard', 'showDeath', 'showAge', 'showNote', 'showPhoto'] as const).forEach((field) => {
    if (typeof settings[field] !== 'boolean') {
      issues.push(issue('invalid-settings', `settings.${field}`, `${field} 必须是布尔值。`))
    }
  })
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/features/validation/draftSchema.ts
git commit -m "feat(layout): add showCard to validation schema"
```

### Task 2: Update UI Controls

**Files:**
- Modify: `frontend/src/components/WorkbenchPanels.vue`

- [ ] **Step 1: Add "显示卡片" toggle**

Place it at the top of the `.toggle-row` div.

```html
<!-- frontend/src/components/WorkbenchPanels.vue -->
      <div class="toggle-row">
        <label class="toggle">
          <input :checked="settings.showCard" type="checkbox" @change="updateSetting('showCard', readCheckedValue($event))" />
          <span>显示卡片</span>
        </label>
        <!-- ... other toggles -->
      </div>
```

- [ ] **Step 2: Disable other toggles when `showCard` is false**

Add `:disabled="!settings.showCard"` and `:class="{ 'toggle--disabled': !settings.showCard }"` to other toggles.

- [ ] **Step 3: Add CSS for disabled state**

```css
.toggle--disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.toggle--disabled input {
  pointer-events: none;
}
```

- [ ] **Step 4: Commit**

```bash
git add frontend/src/components/WorkbenchPanels.vue
git commit -m "feat(layout): add showCard ui toggle and conditional disabling"
```

### Task 3: Update Default Settings

**Files:**
- Modify: `frontend/e2e/specs/features.spec.ts`
- Modify: `frontend/src/data/sampleFamily.ts`
- Modify: `frontend/src/features/export/shareHtmlExport.test.ts`

- [ ] **Step 1: Update `frontend/e2e/specs/features.spec.ts`**

Add `showCard: true` to `DEF_SETTINGS`.

- [ ] **Step 2: Update `frontend/src/data/sampleFamily.ts`**

Add `showCard: true` to `defaultSettings`.

- [ ] **Step 3: Update `frontend/src/features/export/shareHtmlExport.test.ts`**

Add `showCard: true` to `sampleSettings`.

- [ ] **Step 4: Commit**

```bash
git add frontend/e2e/specs/features.spec.ts frontend/src/data/sampleFamily.ts frontend/src/features/export/shareHtmlExport.test.ts
git commit -m "feat(layout): update default settings to include showCard"
```

### Task 4: Verification

- [ ] **Step 1: Run unit tests**

Run: `npm test` in `frontend` directory.

- [ ] **Step 2: Run build**

Run: `npm run build` in `frontend` directory to check for type errors.
