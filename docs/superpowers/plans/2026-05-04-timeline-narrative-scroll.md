# Timeline Narrative Scroll Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Overhaul `TimelineView.vue` into a high-end "Narrative Scroll" experience with a dual-track layout, "Ancient Scroll" aesthetics, and refined event sorting.

**Architecture:** Utilize Vue 3 composition API and CSS Grid/Flexbox for a responsive dual-track timeline. Leverage `publication-context` for data and CSS animations for entrance effects.

**Tech Stack:** Vue 3, CSS (Variables, Animations, Grid), Noto Serif SC.

---

### Task 1: Refine Event Logic and Data Access

**Files:**
- Modify: `frontend/src/views/TimelineView.vue`

- [ ] **Step 1: Update data access and sorting logic**
  Update the `events` computed property to access data from `pub.publication.people` and implement the priority sorting: Birth > Events > Death.

```typescript
const events = computed<TimelineEvent[]>(() => {
  if (!pubData.value) return []
  const list: TimelineEvent[] = []
  // Use Object.values for safety and clarity
  const people = Object.values(pubData.value.people) as Person[]
  
  for (const p of people) {
    const by = parseYear(p.birth)
    if (by) {
      list.push({ 
        year: by, 
        label: p.birth!, 
        person: p, 
        type: 'birth', 
        century: Math.floor(by / 100) 
      })
    }
    const dy = parseYear(p.death)
    if (dy) {
      list.push({ 
        year: dy, 
        label: p.death!, 
        person: p, 
        type: 'death', 
        century: Math.floor(dy / 100) 
      })
    }
  }
  
  // Sort by year, then priority: Birth > Events > Death
  return list.sort((a, b) => {
    if (a.year !== b.year) return a.year - b.year
    const priority = { birth: 1, event: 2, death: 3 }
    return (priority[a.type] || 2) - (priority[b.type] || 2)
  })
})
```

- [ ] **Step 2: Update century label and marker logic**
  Refine `centuryLabel` to be more elegant and ensure century markers use the century number correctly (e.g., 19 for 19th century).

```typescript
function centuryLabel(c: number): string {
  const ordinal = c + 1
  return `${ordinal}世纪 (${c * 100}s)`
}
```

### Task 2: Redesign Template for Dual-Track Layout

**Files:**
- Modify: `frontend/src/views/TimelineView.vue`

- [ ] **Step 1: Update Template Structure**
  Implement the dual-track layout with a central spine and alternating cards.

```html
<template>
  <div class="timeline-page">
    <!-- Header remains mostly same but styled -->
    <header class="timeline-nav">...</header>

    <main class="timeline-content">
      <!-- Summary Cards -->
      <div class="timeline-summary">...</div>

      <div v-if="events.length === 0" class="empty-state">...</div>

      <div v-else class="timeline-container">
        <!-- The Spine -->
        <div class="timeline-spine"></div>

        <div v-for="[century, centuryEvents] in centuries" :key="century" class="tl-century-group">
          <!-- Century Marker -->
          <div class="tl-century-marker">
            <div class="tl-century-number">{{ century }}</div>
            <h2 class="tl-century-title">{{ centuryLabel(century) }}</h2>
          </div>

          <div 
            v-for="(event, idx) in centuryEvents" 
            :key="idx" 
            class="tl-event-wrapper"
            :class="idx % 2 === 0 ? 'tl-left' : 'tl-right'"
            @click="goToPerson(event.person.id)"
          >
            <div class="tl-event-card">
              <div class="tl-event-dot-container">
                <div class="tl-event-dot" :class="'tl-dot--' + event.type"></div>
              </div>
              <div class="tl-event-body">
                <div class="tl-event-header">
                  <span class="tl-event-year">{{ event.year }}年</span>
                  <span class="tl-event-type-tag" :class="'tl-tag--' + event.type">
                    {{ event.type === 'birth' ? '出生' : '去世' }}
                  </span>
                </div>
                <div class="tl-event-person">
                  <span :class="personGenderClass(event.person)">{{ event.person.name }}</span>
                </div>
                <div v-if="event.label !== event.year + '年'" class="tl-event-detail">
                  {{ event.label }}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>

    <button v-show="showBackToTop" class="back-to-top" @click="scrollToTop">...</button>
  </div>
</template>
```

### Task 3: Implement "Ancient Scroll" and "Dignified History" Styling

**Files:**
- Modify: `frontend/src/views/TimelineView.vue`

- [ ] **Step 1: Add Base Styles and Variables**
  Define colors and base typography.

- [ ] **Step 2: Implement Spine and Alternating Layout**
  Use CSS Grid and `nth-child` or custom classes to handle the dual-track alignment.

- [ ] **Step 3: Style Cards and Dots**
  Apply Emerald and Slate accents, Pulse animation, and Noto Serif SC.

- [ ] **Step 4: Add Entrance Animations**
  Implement scroll-triggered fade-in and slide animations.

### Task 4: Final Polishing and Verification

- [ ] **Step 1: Verify mobile responsiveness**
  Ensure cards stack on the right on small screens.
- [ ] **Step 2: Verify sorting and labels**
  Ensure events are correctly ordered and century markers are accurate.
- [ ] **Step 3: Final Aesthetic Check**
  Confirm the "Ancient Scroll" feel (colors, spacing, typography).

---

**Execution Options:**
1. Subagent-Driven
2. Inline Execution (selected)
