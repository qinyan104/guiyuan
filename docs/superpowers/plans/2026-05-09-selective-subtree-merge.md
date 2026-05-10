# Selective Subtree Merge Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement fine-grained control for branch merging and stitched loading, allowing users to select a specific person in the target publication as the root of the subtree to be merged/previewed.

**Architecture:** 
1.  **Backend**: Refactor `PublicationService` to extract a reusable BFS subtree collector. Update `PublicationTreeLoader` to use this collector when `targetRootPersonId` is present.
2.  **Frontend**: Create a new, isolated `SubtreeRootSelector` dialog that uses a read-only `PublicationCanvas` for visual selection. Integrate this into the `BranchMountManager`.

**Tech Stack:** Spring Boot 3.3 (Java 17, JPA), Vue 3 (TypeScript, SVG).

---

### Task 1: Reusable Subtree Collector (Backend)

**Files:**
- Modify: `backend/src/main/java/com/genealogy/server/service/PublicationService.java`
- Test: `backend/src/test/java/com/genealogy/server/service/SubtreeCollectorTest.java`

- [ ] **Step 1: Create unit test for subtree collection**
Create a test case that sets up a small family tree and verifies that BFS correctly collects only descendants and their families starting from a specific person.
```java
@Test
void shouldCollectOnlySubtree() {
    // Setup mock data and call the new private/protected method
}
```

- [ ] **Step 2: Extract BFS logic in PublicationService**
Extract the existing BFS logic from `mergeBranch` into a protected/public method `collectSubtreeIds(Long rootPersonDbId)`.
```java
public SubtreeResult collectSubtreeIds(Long rootPersonDbId) {
    Set<Long> personDbIds = new HashSet<>();
    Set<Long> familyDbIds = new HashSet<>();
    // BFS logic here...
    return new SubtreeResult(personDbIds, familyDbIds);
}
```

- [ ] **Step 3: Update mergeBranch to use the new collector**
Surgically replace the inline BFS in `mergeBranch` with a call to `collectSubtreeIds`.

- [ ] **Step 4: Commit**
```bash
git add backend/src/main/java/com/genealogy/server/service/PublicationService.java
git commit -m "refactor: extract reusable subtree BFS collector in backend"
```

---

### Task 2: Pruned Stitched Loading (Backend)

**Files:**
- Modify: `backend/src/main/java/com/genealogy/server/service/PublicationTreeLoader.java`

- [ ] **Step 1: Update PublicationTreeLoader**
In `loadRecursive`, if `person.getTargetRootPersonId()` is not null, call `publicationService.collectSubtreeIds()` and filter the people/families list before proceeding with the recursive load.
```java
if (person.getTargetRootPersonId() != null) {
    SubtreeResult result = publicationService.collectSubtreeIds(person.getTargetRootPersonId());
    // Only load entities in the result sets
}
```

- [ ] **Step 2: Commit**
```bash
git add backend/src/main/java/com/genealogy/server/service/PublicationTreeLoader.java
git commit -m "feat: implement pruned stitched loading based on targetRootPersonId"
```

---

### Task 3: Visual Root Selector UI (Frontend)

**Files:**
- Create: `frontend/src/components/SubtreeRootSelector.vue`

- [ ] **Step 1: Implement the Selector Component**
Create a Dialog component that:
1.  Receives `publicationId` as a prop.
2.  Fetches the target publication data.
3.  Calculates a layout for the target data.
4.  Renders `PublicationCanvas` in a read-only container.
5.  Emits `selected` with the `personId` when a node is clicked and "Confirm" is pressed.

- [ ] **Step 2: Style the Selector**
Ensure the dialog is large enough and has clear "Confirm/Cancel" actions.

- [ ] **Step 3: Commit**
```bash
git add frontend/src/components/SubtreeRootSelector.vue
git commit -m "feat: create SubtreeRootSelector component for visual pruning"
```

---

### Task 4: Integrate Selector into BranchMountManager

**Files:**
- Modify: `frontend/src/components/BranchMountManager.vue`

- [ ] **Step 1: Add "Select Subtree Root" button**
Show this button only when a target publication is selected.
```vue
<button @click="showSelector = true">指定合并范围</button>
<SubtreeRootSelector v-if="showSelector" :publicationId="..." @selected="handleRootSelected" />
```

- [ ] **Step 2: Handle Root Selection**
Update `props.person.mountPointTarget.rootPersonId` (which maps to the DB ID in target pub) when a selection is made.

- [ ] **Step 3: Show selected root name**
Display the name of the selected root person in the metadata area.

- [ ] **Step 4: Commit**
```bash
git add frontend/src/components/BranchMountManager.vue
git commit -m "feat: integrate subtree selector into branch mount manager"
```

---

### Task 5: Final End-to-End Verification

- [ ] **Step 1: Verify Stitched Loading**
1.  Mount a branch.
2.  Select a specific person as root.
3.  Confirm the main canvas only shows that person's branch.
- [ ] **Step 2: Verify Physical Merge**
1.  Perform a physical merge with the selected root.
2.  Confirm only the subtree data is cloned into the master publication.
- [ ] **Step 3: Check for regressions**
Run all tests: `npm test` and `./mvnw test`.
