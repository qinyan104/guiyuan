# Workbench Controls Polish Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Unify workbench control styling, remove the obstructive validation toast, and refine the centered kinship dialog without changing feature behavior.

**Architecture:** Keep the current Vue component boundaries and data flow. Make targeted template and scoped-CSS changes in the three existing components, deleting the redundant validation request/toast state instead of adding another feedback system.

**Tech Stack:** Vue 3 SFC, TypeScript, scoped CSS, Vitest, Vue Test Utils, Vite

---

### Task 1: Simplify validation feedback and stabilize button states

**Files:**
- Modify: `frontend/src/components/WorkbenchPanels.vue`
- Test: `frontend/src/views/WorkbenchView.test.ts`

- [ ] **Step 1: Add source-level assertions for the panel contract**

Extend the existing workbench test to assert that clicking the validation control emits only `toggle-validation`, and that no extra dialog is rendered:

```ts
expect(panels.emitted('toggle-validation')).toHaveLength(1)
expect(document.querySelector('.val-dialog-overlay')).toBeNull()
```

- [ ] **Step 2: Run the focused test and confirm the old notification contract fails**

Run:

```powershell
npm.cmd run test -- src/views/WorkbenchView.test.ts
```

Expected: the new notification-removal assertion fails before implementation.

- [ ] **Step 3: Delete the redundant validation toast path**

In `WorkbenchPanels.vue`:

- Remove `ref`, `toRef`, and `validatePublication` imports when no longer used.
- Remove `dialogVisible`, `dialogLoading`, `dialogError`, `dialogCounts`, `handleValidationClick`, and `closeValidationDialog`.
- Keep the validation button emitting `toggle-validation`.
- Remove the teleported `.val-dialog-overlay` template.
- Remove all `.val-dialog*` styles and transition rules.

- [ ] **Step 4: Fix button hover precedence and unify the left toolbar**

Use variant-specific selectors after the generic hover rule:

```css
.selection-chip__btn--accent:hover:not(:disabled) {
  background: var(--color-accent);
  color: var(--color-text-on-accent);
  border-color: var(--color-accent);
  filter: brightness(1.08);
}

.selection-chip__btn--danger:hover:not(:disabled) {
  background: #c43a31;
  color: var(--color-text-on-accent);
  border-color: #c43a31;
  filter: brightness(1.08);
}
```

Give all left controls the same height, radius, border, spacing, and default surface. Keep only `.tool-btn--active` filled with cinnabar; use a pale cinnabar hover for inactive controls.

- [ ] **Step 5: Run the focused workbench tests**

Run:

```powershell
npm.cmd run test -- src/views/WorkbenchView.test.ts
```

Expected: PASS.

### Task 2: Turn the top-right four controls into a segmented action group

**Files:**
- Modify: `frontend/src/components/WorkbenchHeader.vue`
- Test: `frontend/src/components/WorkbenchHeader.test.ts`

- [ ] **Step 1: Add a semantic test for the grouped actions**

Assert that the toolbar exposes one group containing the four primary actions:

```ts
const group = wrapper.get('[aria-label="谱系工具"]')
expect(group.text()).toContain('纪略')
expect(group.text()).toContain('编年')
expect(group.text()).toContain('考据')
expect(group.text()).toContain('付梓')
```

- [ ] **Step 2: Run the header test and verify it fails**

Run:

```powershell
npm.cmd run test -- src/components/WorkbenchHeader.test.ts
```

Expected: FAIL because the labelled action group does not exist yet.

- [ ] **Step 3: Add the grouped structure without changing handlers**

Wrap only the four actions in:

```html
<div class="topbar__primary-tools" role="group" aria-label="谱系工具">
  <!-- existing 纪略、编年、考据、付梓 controls -->
</div>
```

Keep collaborator management, theme switching, and account controls outside this group.

- [ ] **Step 4: Apply segmented-control styling**

Style the outer group as one warm panel. Remove individual pill gaps and round only the first and last visible segments. Use pale cinnabar hover and an active state for open dropdown triggers:

```css
.topbar__primary-tools .dropdown-trigger[aria-expanded='true'] {
  background: var(--color-accent-muted);
  color: var(--color-accent);
}
```

Keep dropdown menus positioned from their existing `.dropdown` wrappers.

- [ ] **Step 5: Run the header test**

Run:

```powershell
npm.cmd run test -- src/components/WorkbenchHeader.test.ts
```

Expected: PASS.

### Task 3: Refine the centered kinship dialog

**Files:**
- Modify: `frontend/src/components/KinshipCalculatorDialog.vue`

- [ ] **Step 1: Clarify the dialog hierarchy in the template**

Change the heading block to:

```html
<div class="kinship-dialog__title">
  <p>称谓推算</p>
  <h2>亲属关系</h2>
  <span>选择称呼者与被称呼者，查看族谱中的准确称谓。</span>
</div>
```

Rename selector labels from `人物 A` and `人物 B` to `称呼者` and `被称呼者`. Preserve all existing models, event handlers, result logic, and path rendering.

- [ ] **Step 2: Remove duplicate overlay declarations and tighten the shell**

Keep one `.kinship-overlay` declaration. Give the dialog a bounded viewport height and internal scrolling:

```css
.kinship-dialog {
  width: min(760px, 100%);
  max-height: min(760px, calc(100dvh - 48px));
  overflow: auto;
}
```

- [ ] **Step 3: Make the result primary and path secondary**

Reduce excess empty-state padding, use a restrained cinnabar result surface, and lower path contrast. Keep long paths horizontally scrollable. Add consistent `:focus-visible` styles for close, swap, search, and dropdown buttons.

- [ ] **Step 4: Verify template compilation through the production build**

Run:

```powershell
npm.cmd run build
```

Expected: `vue-tsc --noEmit` and `vite build` both succeed.

### Task 4: Final regression verification

**Files:**
- Verify: `frontend/src/components/WorkbenchPanels.vue`
- Verify: `frontend/src/components/WorkbenchHeader.vue`
- Verify: `frontend/src/components/KinshipCalculatorDialog.vue`

- [ ] **Step 1: Scan for removed notification code**

Run:

```powershell
rg -n "dialogVisible|dialogLoading|dialogCounts|val-dialog" frontend/src/components/WorkbenchPanels.vue
```

Expected: no matches.

- [ ] **Step 2: Run focused tests**

Run:

```powershell
npm.cmd run test -- src/views/WorkbenchView.test.ts src/components/WorkbenchHeader.test.ts src/lib/kinship.test.ts
```

Expected: all test files pass.

- [ ] **Step 3: Run the production build**

Run:

```powershell
npm.cmd run build
```

Expected: exit code 0. The existing large-chunk warning is acceptable.

- [ ] **Step 4: Check the final diff**

Run:

```powershell
git diff --check -- frontend/src/components/WorkbenchPanels.vue frontend/src/components/WorkbenchHeader.vue frontend/src/components/KinshipCalculatorDialog.vue
```

Expected: no whitespace errors.
