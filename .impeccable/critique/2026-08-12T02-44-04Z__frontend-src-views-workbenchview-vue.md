---
target: frontend/src/views/WorkbenchView.vue
total_score: 26
max_score: 40
na_heuristics: 
p0_count: 0
p1_count: 3
timestamp: 2026-08-12T02-44-04Z
slug: frontend-src-views-workbenchview-vue
---
# Workbench design critique

Method: dual-agent (A: /root/workbench_design_review · B: /root/workbench_detector_evidence)

## Design Health Score

| # | Heuristic | Score | Key issue |
|---|---|---:|---|
| 1 | Visibility of System Status | 3 | Sync states and feedback exist; failure recovery is incomplete. |
| 2 | Match System / Real World | 3 | Genealogy language is grounded, but terms such as 适人、赘婿、主支 need explanation. |
| 3 | User Control and Freedom | 3 | Undo/redo, history and confirmations exist; some high-impact changes lack outcome preview. |
| 4 | Consistency and Standards | 3 | Tokens and surface patterns are cohesive; the ordinary Edit action is styled like a danger action. |
| 5 | Error Prevention | 3 | Destructive actions are confirmed, but relationship consequences are not previewed. |
| 6 | Recognition Rather Than Recall | 2 | Selection is visible, but canvas gestures, branch mode and layout outcomes are not taught in context. |
| 7 | Flexibility and Efficiency | 3 | Canvas controls and history help; no discoverable shortcut, person-jump or batch workflow. |
| 8 | Aesthetic and Minimalist Design | 3 | Material language is restrained; selected-person card, left panel, top tools, zoom and canvas compete. |
| 9 | Error Recovery | 2 | Failure messages lack retry, cause and next-step actions. |
| 10 | Help and Documentation | 1 | No first-use help, terminology explanation, shortcut reference or task help. |
| **Total** | | **26/40** | **Acceptable — solid foundation, significant first-use and risk-reduction work needed.** |

## Design Specificity Verdict

The visual system is product-authored rather than category-interchangeable: warm paper, ink, rare cinnabar, serif headings and language such as 誊录、落卷、校勘 and 同修编委 make the surface a 新中式数字档案室. The canvas, floating toolbars and drawer interactions, however, still read like a polished generic data editor more than a place where young people collaboratively bring a family story to life.

The deterministic scan returned zero findings for `frontend/src/views/WorkbenchView.vue` (exit 0). That clean scan only means no rules in the mechanical detector fired; it does not contradict the review's semantic, task-flow and accessibility concerns. No ignore list exists.

## Overall Impression

The workbench has credible visual restraint and robust editing foundations. Its largest opportunity is to turn a powerful canvas from a surface users must learn by trial-and-error into a guided, reversible genealogy task flow.

## What's Working

- Product language, warm paper surfaces and restrained cinnabar create a coherent genealogy-specific identity without decorative overreach.
- Sync status, feedback strip, history, undo/redo and confirmation chains provide a strong safety baseline for high-value family records.
- Canvas drag, zoom, pinch, locate and overview controls support large family trees with a pleasing sense of direct manipulation.

## Priority Issues

### P1 — Edit is incorrectly styled as danger

**What:** The selected-person Edit action uses the same strong cinnabar/danger treatment as destructive behavior, while Delete is visually quieter.

**Why it matters:** New users can misread ordinary editing as risky and underweight deletion.

**Fix:** Use an ink-based primary action or light cinnabar outline for Edit. Put deletion and relationship removal in a distinct dangerous area with irreversible-consequence language.

**Suggested command:** `$impeccable clarify`

### P1 — The first interaction with the canvas is not explained

**What:** The source provides no contextual cue for dragging the canvas, selecting a person, selecting again to edit, zooming or using branch focus.

**Why it matters:** A first-time young editor will experiment while fearing that a valuable family tree can be damaged.

**Fix:** Add a dismissible three-step first-use cue: pan canvas, select a person, then complete a relationship. After first selection, show one suggested next action rather than all capabilities.

**Suggested command:** `$impeccable onboard`

### P1 — Basic biography and high-impact genealogy changes are mixed together

**What:** A single editor exposes personal details, parents, spouses, children, sorting, main branch, 适人/赘婿, mounted branches and deletion together.

**Why it matters:** Editing a birth date becomes cognitively entangled with operations that can restructure a lineage.

**Fix:** Progressively disclose Basic details, Relationships and Lineage settings. Preview every relationship change in plain language, and isolate deletion in a second-level danger area.

**Suggested command:** `$impeccable harden`

### P2 — Layout controls are a professional console, not a collaborative default

**What:** Seven fine-grained controls and eight display toggles appear without visual presets or recovery to a recommended setup.

**Why it matters:** Most collaborators cannot predict how spacing and styling controls combine, which creates accidental inconsistency.

**Fix:** Start with three visual presets—清雅阅读、亲友分享、细节考据—then place individual controls under Advanced. Add result-oriented helper text and per-control restore-default actions.

**Suggested command:** `$impeccable distill`

### P2 — Failures are visible but not recoverable

**What:** Upload and sync failures are reported, but no retry, cause, conflict path or local-draft decision is visible.

**Why it matters:** Users cannot distinguish a network issue, permission error, conflict or malformed data; repeated clicks risk more confusion.

**Fix:** Add action-led feedback such as Retry sync, View conflict and Keep local draft. For collaboration conflicts, name the affected people and present merge choices.

**Suggested command:** `$impeccable harden`

## Cognitive Load

Five of eight checklist conditions fail, indicating high cognitive load for the first edit.

- Single focus fails when the selected-person card, editing, locating and setting a main branch compete with the canvas.
- Chunking fails in layout settings, which presents seven continuous controls.
- Visual hierarchy fails because cinnabar mixes ordinary editing, activation and emphasis.
- One-thing-at-a-time and minimal-choices fail in the person editor, which exposes 10+ decisions at once.
- Progressive disclosure fails for advanced layout and relationship settings.

Decision points over four options include the top tools (statistics, timeline, import, export, collaboration, theme, account), the six-output export menu, the seven-control layout panel plus eight toggles, and the all-in-one person editor.

## Persona Red Flags

### Alex — frequent collaborator

- No discoverable keyboard system for search/jump, adding relationships, switching panels, overview or save.
- Child sorting relies on drag interaction and no bulk editing path is evident.
- The 6-output export menu and 7-category top tool area force repeated menu parsing.

### Sam — keyboard and screen-reader user

- Evidence does not establish a keyboard-operable, named path from canvas person card to selection and editing.
- Feedback has no evident `aria-live` or `role=status` announcement path.
- Custom switches visually hide native inputs without clear focus evidence; the editor drawer lacks clear evidence of focus trap, initial focus and Escape handling.

### Young first-time genealogy editor

- 适人、赘婿、设为主支 and mounted branches are high-consequence choices without short explanation, preview or clear recommended next step.
- The top-level action categories are reasonable but not organized as a beginner's “organize a family tree” sequence.

## Minor Observations

- On narrow screens the sticky toolbar becomes horizontally scrollable, so right-side actions can be undiscoverable.
- Canvas zoom controls are 28px square, below the usual 44px touch target.
- Large-tree context lacks a persistent path such as 主谱 > 第 X 支 > 某人.
- A few components use hardcoded cinnabar values, risking semantic and theme drift from the token system.
- “无涯画布” is used as a return-to-list action without an explicit return label or icon.

## Questions to Consider

- If the first task became “put one relative back into the family story” rather than “edit an infinite canvas”, what should the entry state show?
- Should 设为主支、适人 and 赘婿 be modeled as lineage decisions with preview and explanation instead of immediate peer actions?
- Is the most meaningful completion moment “saved successfully” or “this branch is now complete together”, and how should the UI reveal that progress?
