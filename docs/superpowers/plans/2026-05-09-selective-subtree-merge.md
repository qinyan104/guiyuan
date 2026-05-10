# Selective Subtree Merge Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement fine-grained control for branch merging and stitched loading, allowing users to select a specific person in the target publication as the root of the subtree to be merged/previewed.

**Architecture:** 
1.  **Backend**: Refactor `PublicationService` to extract a reusable BFS subtree collector. Update `PublicationTreeLoader` to use this collector when `targetRootPersonId` is present.
2.  **Frontend**: Create a new, isolated `SubtreeRootSelector` dialog that uses a read-only `PublicationCanvas` for visual selection. Integrate this into the `BranchMountManager`.

**Tech Stack:** Spring Boot 3.3 (Java 17, JPA), Vue 3 (TypeScript, SVG).

---

### Task 1: Reusable Subtree Collector (Backend) [DONE]

**Files:**
- Modify: `backend/src/main/java/com/genealogy/server/service/PublicationService.java`
- Test: `backend/src/test/java/com/genealogy/server/service/SubtreeCollectorTest.java`

- [x] **Step 1: Create unit test for subtree collection**
- [x] **Step 2: Extract BFS logic in PublicationService**
- [x] **Step 3: Update mergeBranch to use the new collector**
- [x] **Step 4: Commit**

---

### Task 2: Pruned Stitched Loading (Backend) [DONE]

**Files:**
- Modify: `backend/src/main/java/com/genealogy/server/service/PublicationTreeLoader.java`

- [x] **Step 1: Update PublicationTreeLoader**
- [x] **Step 2: Commit**

---

### Task 3: Visual Root Selector UI (Frontend) [DONE]

**Files:**
- Create: `frontend/src/components/SubtreeRootSelector.vue`

- [x] **Step 1: Implement the Selector Component**
- [x] **Step 2: Style the Selector**
- [x] **Step 3: Commit**

---

### Task 4: Integrate Selector into BranchMountManager [DONE]

**Files:**
- Modify: `frontend/src/components/BranchMountManager.vue`

- [x] **Step 1: Add "Select Subtree Root" button**
- [x] **Step 2: Handle Root Selection**
- [x] **Step 3: Show selected root name**
- [x] **Step 4: Commit**

---

### Task 5: Final End-to-End Verification [DONE]

- [x] **Step 1: Verify Stitched Loading**
- [x] **Step 2: Verify Physical Merge**
- [x] **Step 3: Check for regressions**
Run all tests: `npm test` and `./mvnw test`.
