# Final Polish and Verification Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fine-tune the compact lineage tree layout height and verify project integrity.

**Architecture:** Update the `getCardDimensions` helper in the layout library to increase breathing space for vertical names in compact mode. Update corresponding tests and perform a full build.

**Tech Stack:** TypeScript, Vue 3, Vitest, Vite

---

### Task 1: Update Layout Constants

**Files:**
- Modify: `frontend/src/lib/layout.ts`

- [ ] **Step 1: Increase compact mode height from 100 to 110**

Modify `getCardDimensions` function:
```typescript
function getCardDimensions(settings: PublicationSettings): { width: number; height: number; partnerGap: number } {
  if (settings.showCard) {
    const width = settings.cardWidth
    const height = Math.round(width * 1.84)
    return { width, height, partnerGap: settings.partnerGap }
  }
  return { width: 32, height: 110, partnerGap: 16 }
}
```

- [ ] **Step 2: Commit changes**

```bash
git add frontend/src/lib/layout.ts
git commit -m "style(layout): fine-tune compact mode height for breathable typography"
```

### Task 2: Update and Verify Tests

**Files:**
- Modify: `frontend/src/lib/layout.test.ts`

- [ ] **Step 1: Update the test expectation for compact card height**

```typescript
    // Verify compact card dimensions
    compactLayout.cards.forEach((card) => {
      expect(card.width).toBe(32)
      expect(card.height).toBe(110)
    })
```

- [ ] **Step 2: Run tests in frontend directory**

Run: `npm run test` in `frontend`
Expected: All tests PASS

- [ ] **Step 3: Commit test updates**

```bash
git add frontend/src/lib/layout.test.ts
git commit -m "test(layout): update compact mode height expectation"
```

### Task 3: Final Verification

- [ ] **Step 1: Run full build in frontend**

Run: `npm run build` in `frontend`
Expected: Build SUCCESS

- [ ] **Step 2: Final commit (if any small fixes were needed)**

```bash
git commit -m "chore: final verification and build success"
```
