# Branch Mount & Merge UI/UX Optimization Design
**Date:** 2026-05-09

## Objective
Optimize the "Branch Mount and Physical Merge" section within the `PersonEditorDrawer` to reduce functional redundancy, improve visual hierarchy, and clearly isolate high-impact destructive operations.

## Key Files & Context
- `frontend/src/components/BranchMountManager.vue`: The component handling the mounting and merging logic.
- `frontend/src/components/PersonEditorDrawer.vue`: The parent drawer component where the manager is displayed.
- Types: `frontend/src/types/family.ts`
- APIs: `frontend/src/api/publication.ts`, `frontend/src/api/accessManage.ts`

## Proposed Solution

The redesign consists of three main structural changes:

### 1. Toggle Switch Consolidation
- **Current State:** The panel has both a top toggle switch and a bottom "设为挂载点 / 断开挂载" button doing the exact same thing.
- **Change:** Remove the redundant bottom button. The top Toggle Switch becomes the sole control for enabling/disabling a mount point on the current person.

### 2. Custom Target Publication Dropdown
- **Current State:** A standard HTML `<select>` element which becomes hard to read with many publications.
- **Change:** Replace `<select>` with a custom dropdown menu interface.
- **Features:** 
  - **Grouping:** Group publications into "我的族谱" (Owned) and "协作族谱" (Shared/Editable).
  - **Visual Badges:** Include icons or color-coded text/tags for access roles to improve scanning speed.

### 3. Separate Advanced Zone for Physical Merge
- **Current State:** The "执行物理合并" (Execute Physical Merge) button is located within the standard light-colored mount panel, right next to standard actions.
- **Change:** Extract the merge action completely out of the `branch-mount-panel`.
- **Placement:** Create a new distinct "高级操作" (Advanced Operations) or "物理合并" (Physical Merge) section below the mount panel. It will be visually distinct from the standard settings.
- **Behavior:** The merge button will only be active/visible if the person is currently a mount point AND has a valid target publication selected. It will include a clear warning text explaining that it irreversibly copies data and breaks the link.

## Implementation Steps
1. **Refactor `BranchMountManager.vue` Layout:**
   - Remove `.branch-mount-actions` container's first button.
   - Relocate the physical merge button and its descriptive text to a lower, separated section (`.advanced-merge-zone`).
2. **Build Custom Dropdown:**
   - Introduce local state (`isDropdownOpen`) for the dropdown UI.
   - Create a computed property to group `availablePublications` by `accessRole`.
   - Render a custom dropdown overlay overlaying the form, handling click-outside to close.
3. **Style Updates:**
   - Add new CSS classes for the custom dropdown, items, headers, and the new advanced zone.

## Verification & Testing
- Toggle the mount switch and verify it correctly assigns/removes `isMountPoint`.
- Open the custom dropdown and verify grouping of owned vs. shared publications.
- Select a target and verify the Physical Merge zone appears/activates correctly.
- Ensure the Physical Merge confirmation dialog still functions correctly when clicked.