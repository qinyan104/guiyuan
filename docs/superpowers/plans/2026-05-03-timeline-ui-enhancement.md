# Timeline UI Enhancement Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create a visually engaging and readable family history timeline by enhancing summary cards, century headers, vertical tracks, and event layouts.

**Architecture:** Enhancement of an existing Vue 3 component (`TimelineView.vue`) with CSS-driven animations, SVG icons, and improved spatial composition.

**Tech Stack:** Vue 3 (Composition API), CSS (Scoped), SVG.

---

### Task 1: Enhance Timeline Summary

**Files:**
- Modify: `frontend/src/views/TimelineView.vue`

- [ ] **Step 1: Update Summary HTML with Icons**

Replace the existing `.timeline-summary` block with:

```html
      <div class="timeline-summary">
        <div class="tl-summary-card">
          <div class="tl-summary-icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
          </div>
          <span class="tl-summary-num">{{ totalEvents }}</span>
          <span class="tl-summary-label">历史事件</span>
        </div>
        <div class="tl-summary-card" v-if="earliestYear">
          <div class="tl-summary-icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
          </div>
          <span class="tl-summary-num">{{ earliestYear }}</span>
          <span class="tl-summary-label">最早年份</span>
        </div>
        <div class="tl-summary-card" v-if="latestYear">
          <div class="tl-summary-icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15.5V17a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-1.5"/><path d="M7 7l5 5 5-5"/><path d="M12 12V3"/></svg>
          </div>
          <span class="tl-summary-num">{{ latestYear }}</span>
          <span class="tl-summary-label">最晚年份</span>
        </div>
      </div>
```

- [ ] **Step 2: Update Summary CSS**

Replace `.timeline-summary`, `.tl-summary-card`, `.tl-summary-num`, `.tl-summary-label` styles.

```css
/* ── Summary ── */
.timeline-summary {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1rem;
  margin-bottom: 3rem;
}

.tl-summary-card {
  background: var(--bg-panel, #fff);
  border: 1px solid var(--line-soft, rgba(117, 90, 57, 0.1));
  border-radius: 20px;
  padding: 1.5rem 1.25rem;
  text-align: center;
  position: relative;
  overflow: hidden;
  transition: transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.2s ease;
  box-shadow: 0 4px 12px rgba(62, 41, 22, 0.04);
}

.tl-summary-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 12px 24px rgba(62, 41, 22, 0.08);
}

.tl-summary-icon {
  margin: 0 auto 0.75rem;
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 12px;
  background: var(--bg-shell, #f5f0e8);
  color: var(--accent-amber, #a96e35);
}

.tl-summary-num {
  display: block;
  font-size: 1.75rem;
  font-weight: 900;
  color: var(--text-main, #1a1a1a);
  line-height: 1.1;
  font-family: 'Noto Serif SC', serif;
}

.tl-summary-label {
  font-size: 0.75rem;
  color: var(--text-soft, #888);
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  margin-top: 0.25rem;
}
```

### Task 2: Improve Century Headers and Track

**Files:**
- Modify: `frontend/src/views/TimelineView.vue`

- [ ] **Step 1: Update Century Header HTML**

Modify the `.tl-century__header` block:

```html
          <div class="tl-century__header">
            <div class="tl-century__bg-num">{{ Math.floor(century / 100) + 1 }}</div>
            <span class="tl-century__label">{{ centuryLabel(century) }}</span>
            <span class="tl-century__count">{{ centuryEvents.length }} 件事件</span>
          </div>
```

- [ ] **Step 2: Update Century and Track CSS**

Update styles for `.tl-century`, `.tl-century__header`, `.tl-century__label`, `.tl-century__count`, `.tl-century__track`, `.tl-century__line`.

```css
.tl-century {
  position: relative;
  margin-bottom: 4rem;
}

.tl-century__header {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 2rem;
  position: relative;
  padding-bottom: 0.5rem;
}

.tl-century__header::after {
  content: "";
  position: absolute;
  bottom: 0;
  left: 0;
  width: 60px;
  height: 3px;
  background: var(--accent-amber, #a96e35);
  border-radius: 99px;
}

.tl-century__bg-num {
  position: absolute;
  left: -1rem;
  top: -1.5rem;
  font-size: 5rem;
  font-weight: 900;
  color: var(--accent-amber, #a96e35);
  opacity: 0.05;
  font-family: 'Noto Serif SC', serif;
  user-select: none;
  pointer-events: none;
}

.tl-century__label {
  font-size: 1.25rem;
  font-weight: 900;
  color: var(--text-main, #1a1a1a);
  font-family: 'Noto Serif SC', serif;
  z-index: 1;
}

.tl-century__count {
  font-size: 0.75rem;
  font-weight: 800;
  color: var(--accent-earth, #6a4b2f);
  background: var(--bg-panel, #fff);
  padding: 0.2rem 0.75rem;
  border-radius: 999px;
  border: 1px solid var(--line-soft, rgba(0,0,0,0.06));
  z-index: 1;
}

.tl-century__track {
  position: relative;
  padding-left: 40px;
  display: flex;
  flex-direction: column;
}

.tl-century__line {
  position: absolute;
  left: 10px;
  top: 0;
  bottom: 0;
  width: 1px;
  background: var(--line-soft, rgba(0,0,0,0.1));
}

.tl-century__line::after {
  content: "";
  position: absolute;
  left: 4px;
  top: 0;
  bottom: 0;
  width: 1px;
  border-left: 1px dashed var(--line-soft, rgba(0,0,0,0.2));
}
```

### Task 3: Refine Event Layout and Dot

**Files:**
- Modify: `frontend/src/views/TimelineView.vue`

- [ ] **Step 1: Update Event CSS**

Update styles for `.tl-event`, `.tl-event__dot`, `.tl-event__year`, `.tl-event__info`, `.tl-person`, `.tl-event__type`, `.tl-event__date`.

```css
/* ── Event ── */
.tl-event {
  position: relative;
  padding: 1.25rem 1.5rem;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.2, 0, 0, 1);
  border-radius: 16px;
  margin-bottom: 0.5rem;
  animation: tl-fade-in 0.5s ease-out both;
}

@keyframes tl-fade-in {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}

.tl-event:nth-child(2) { animation-delay: 0.05s; }
.tl-event:nth-child(3) { animation-delay: 0.1s; }
.tl-event:nth-child(4) { animation-delay: 0.15s; }
.tl-event:nth-child(5) { animation-delay: 0.2s; }

.tl-event:hover {
  background: var(--bg-panel, #fff);
  box-shadow: 0 8px 24px rgba(62, 41, 22, 0.06);
  transform: translateX(8px);
}

.tl-event__dot {
  position: absolute;
  left: -38px;
  top: 1.75rem;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  border: 4px solid var(--bg-shell, #efe3cf);
  z-index: 2;
  transition: transform 0.2s, box-shadow 0.2s;
}

.tl-event:hover .tl-event__dot {
  transform: scale(1.3);
  box-shadow: 0 0 15px currentColor;
}

.tl-event__dot--birth {
  background: #10b981;
  color: rgba(16, 185, 129, 0.4);
}

.tl-event__dot--death {
  background: #6b7280;
  color: rgba(107, 114, 128, 0.4);
}

@keyframes tl-pulse {
  0% { transform: scale(1); opacity: 1; }
  100% { transform: scale(2); opacity: 0; }
}

.tl-event:hover .tl-event__dot::after {
  content: "";
  position: absolute;
  inset: -4px;
  border-radius: 50%;
  background: inherit;
  opacity: 0.4;
  z-index: -1;
  animation: tl-pulse 1.2s infinite;
}

.tl-event__content {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.tl-event__year {
  font-size: 1.1rem;
  font-weight: 900;
  color: var(--text-main, #1a1a1a);
  font-family: 'Noto Serif SC', serif;
}

.tl-event__info {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.tl-person {
  font-size: 1rem;
  font-weight: 800;
  color: var(--text-main, #1a1a1a);
  transition: color 0.2s;
}

.tl-person--male { color: #3b82f6; }
.tl-person--female { color: #ec4899; }

.tl-event:hover .tl-person {
  text-decoration: underline;
  text-underline-offset: 4px;
}

.tl-event__type {
  font-size: 0.7rem;
  font-weight: 800;
  padding: 0.2rem 0.6rem;
  border-radius: 6px;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.tl-event__type--birth {
  background: rgba(16, 185, 129, 0.1);
  color: #10b981;
}

.tl-event__type--death {
  background: rgba(107, 114, 128, 0.1);
  color: #6b7280;
}

.tl-event__date {
  font-size: 0.8rem;
  color: var(--text-soft, #aaa);
  font-style: italic;
  opacity: 0.8;
}
```

### Task 4: Interaction and Responsive Polish

**Files:**
- Modify: `frontend/src/views/TimelineView.vue`

- [ ] **Step 1: Add "Back to Top" functionality**

Add the script logic and HTML for the "Back to Top" button.

```typescript
// Script
const showBackToTop = ref(false)
onMounted(() => {
  window.addEventListener('scroll', () => {
    showBackToTop.value = window.scrollY > 400
  })
})

function scrollToTop() {
  window.scrollTo({ top: 0, behavior: 'smooth' })
}
```

```html
<!-- HTML -->
    <button 
      v-show="showBackToTop" 
      class="back-to-top" 
      @click="scrollToTop"
    >
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"><polyline points="18 15 12 9 6 15"/></svg>
    </button>
```

- [ ] **Step 2: Add CSS for Back to Top and Responsive Fixes**

```css
.back-to-top {
  position: fixed;
  right: 2rem;
  bottom: 2rem;
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: var(--bg-panel, #fff);
  border: 1px solid var(--line-soft, rgba(0,0,0,0.1));
  color: var(--accent-amber, #a96e35);
  box-shadow: 0 8px 24px rgba(0,0,0,0.1);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s;
  z-index: 60;
}

.back-to-top:hover {
  transform: translateY(-5px);
  background: var(--accent-amber, #a96e35);
  color: #fff;
}

@media (max-width: 600px) {
  .timeline-content { padding: 1rem; }
  .timeline-summary { grid-template-columns: 1fr; }
  .tl-century__track { padding-left: 30px; }
  .tl-event__dot { left: -28px; }
}
```

---

## Commit Message
`ui(timeline): enhance narrative and visual flow`
