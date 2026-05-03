# Person Detail View Enhancement Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transform the person detail page into a dignified "Digital Biography" with clear hierarchy and better editing ergonomics.

**Architecture:** Refactor `PersonDetailView.vue` into a modern grid-based layout. Use CSS `clip-path` for decorative frames, CSS variables for theme-consistent colors, and logical grouping for the editing interface.

**Tech Stack:** Vue 3, TypeScript, CSS (scoped).

---

### Task 1: Refactor Template Structure

**Files:**
- Modify: `frontend/src/views/PersonDetailView.vue`

- [ ] **Step 1: Reorganize main content into a grid**

```vue
<main v-else class="detail-content">
  <!-- Person Hero -->
  <section class="person-hero" :class="{ 'person-hero--deceased': person.deceased, 'person-hero--editing': isEditing }">
    <!-- ... hero content ... -->
  </section>

  <div class="content-grid">
    <!-- Left Column: Biography -->
    <div class="column-main">
      <section class="bio-card card">
        <h2 class="section-title">生平注记</h2>
        <div v-if="!isEditing" class="note-content">
          {{ person.note || '暂无详细记录' }}
        </div>
        <div v-else class="field field--full">
          <textarea v-model="editForm.note" rows="15"></textarea>
        </div>
      </section>
    </div>

    <!-- Right Column: Relationships -->
    <div class="column-sidebar" v-if="!isEditing">
      <section class="rel-card-group card">
        <h2 class="section-title">家族成员</h2>
        <!-- Relationships list ... -->
      </section>
    </div>
  </div>
</main>
```

- [ ] **Step 2: Update CSS Grid and Column styles**

```css
.content-grid {
  display: grid;
  grid-template-columns: 1fr 340px;
  gap: 2rem;
  align-items: start;
}

@media (max-width: 1024px) {
  .content-grid {
    grid-template-columns: 1fr;
  }
}

.card {
  background: var(--bg-panel-strong);
  border-radius: 24px;
  border: 1px solid var(--line-soft);
  box-shadow: 0 8px 30px rgba(0,0,0,0.04);
  padding: 2rem;
}
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/views/PersonDetailView.vue
git commit -m "ui(person): refactor layout to grid and cards"
```

---

### Task 2: Enhance Person Hero Section

**Files:**
- Modify: `frontend/src/views/PersonDetailView.vue`

- [ ] **Step 1: Implement Octagonal Frame and Hero Typography**

```vue
<section class="person-hero" :class="{ 'person-hero--deceased': person.deceased, 'person-hero--editing': isEditing }">
  <div class="hero-inner">
    <div class="person-avatar-frame">
      <div class="person-avatar" :class="genderClass(isEditing ? (editForm.gender as Gender) : person.gender)">
        <img v-if="person.avatarUrl" :src="photoUrl(person.avatarUrl)" :alt="person.name" />
        <span v-else class="avatar-text">{{ (isEditing ? editForm.name : person.name)?.slice(-1) || '?' }}</span>
      </div>
    </div>
    
    <div v-if="!isEditing" class="hero-info">
      <h1 class="hero-name">{{ person.name }}</h1>
      <div class="hero-dates">
        {{ person.birth || '?' }} — {{ person.death || (person.deceased ? '?' : '至今') }}
      </div>
      <div class="hero-badges">
        <span class="gender-badge" :class="genderClass(person.gender)">
          {{ genderIcon(person.gender) }} {{ genderLabel(person.gender) }}
        </span>
        <span v-if="person.deceased" class="status-badge status-badge--deceased">已故</span>
      </div>
    </div>
  </div>
</section>
```

- [ ] **Step 2: Add Hero styles (Octagon clip-path, grayscale, serif)**

```css
.person-hero {
  margin-bottom: 3rem;
  padding: 4rem 2rem;
  text-align: center;
  background: radial-gradient(circle at center, var(--bg-panel-strong) 0%, transparent 70%);
  border-radius: 40px;
}

.person-hero--deceased {
  filter: grayscale(0.4) sepia(0.2);
  opacity: 0.9;
}

.person-avatar-frame {
  display: inline-block;
  padding: 8px;
  background: var(--accent-amber);
  clip-path: polygon(30% 0%, 70% 0%, 100% 30%, 100% 70%, 70% 100%, 30% 100%, 0% 70%, 0% 30%);
  margin-bottom: 1.5rem;
}

.person-avatar {
  width: 160px;
  height: 160px;
  clip-path: polygon(30% 0%, 70% 0%, 100% 30%, 100% 70%, 70% 100%, 30% 100%, 0% 70%, 0% 30%);
  /* ... reset background ... */
}

.hero-name {
  font-family: 'Noto Serif SC', serif;
  font-size: 3.5rem;
  font-weight: 900;
  margin-bottom: 0.5rem;
  color: var(--text-main);
}

.hero-dates {
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--text-soft);
  letter-spacing: 0.1em;
  margin-bottom: 1rem;
}
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/views/PersonDetailView.vue
git commit -m "ui(person): enhance hero section with octagonal frame and serif typography"
```

---

### Task 3: Polishing Biography and Relationships

**Files:**
- Modify: `frontend/src/views/PersonDetailView.vue`

- [ ] **Step 1: Add Paper Texture and Typography to Bio**

```css
.note-content {
  font-size: 1.1rem;
  line-height: 1.85;
  color: var(--text-sub);
  padding: 2.5rem;
  background-color: var(--bg-paper);
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='4' height='4' viewBox='0 0 4 4'%3E%3Cpath fill='%23000' fill-opacity='0.03' d='M1 3h1v1H1V3zm2-2h1v1H2V1z'%3E%3C/path%3E%3C/svg%3E");
  border-radius: 16px;
  position: relative;
}

.note-content::before {
  content: "";
  position: absolute;
  inset: 0;
  border-radius: 16px;
  box-shadow: inset 0 0 60px rgba(0,0,0,0.02);
  pointer-events: none;
}
```

- [ ] **Step 2: Refine Relationship tiles with hover focus**

```css
.rel-card {
  /* ... existing ... */
  transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
  padding: 1rem;
  background: var(--bg-panel);
  margin-bottom: 0.75rem;
}

.rel-card:hover {
  transform: translateX(8px) scale(1.02);
  background: var(--bg-paper);
  box-shadow: 0 10px 25px rgba(0,0,0,0.05);
  border-color: var(--accent-amber);
}
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/views/PersonDetailView.vue
git commit -m "ui(person): apply paper texture to bio and polish relationship cards"
```

---

### Task 4: Optimize Editing Mode

**Files:**
- Modify: `frontend/src/views/PersonDetailView.vue`

- [ ] **Step 1: Group fields logically in Edit Mode**

```vue
<div v-else class="edit-mode-container">
  <div class="form-section">
    <h3 class="form-section-title">核心信息</h3>
    <div class="form-row">
      <!-- Name, Gender, Deceased ... -->
    </div>
  </div>
  
  <div class="form-section">
    <h3 class="form-section-title">身份与堂号</h3>
    <div class="form-row">
      <!-- Title, Clan ... -->
    </div>
  </div>

  <div class="form-section">
    <h3 class="form-section-title">重要日期</h3>
    <div class="form-row">
      <!-- Birth, Death ... -->
    </div>
  </div>
</div>
```

- [ ] **Step 2: Style minimalist inputs and pinned buttons**

```css
.field input, .field select, .field textarea {
  background: transparent;
  border: none;
  border-bottom: 2px solid var(--line-soft);
  border-radius: 0;
  padding: 0.75rem 0.25rem;
  transition: all 0.2s;
}

.field input:focus {
  border-bottom-color: var(--accent-amber);
  box-shadow: none;
}

.detail-nav__actions {
  position: sticky;
  top: 1rem;
  z-index: 110;
}
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/views/PersonDetailView.vue
git commit -m "ui(person): optimize editing mode with grouped fields and minimalist inputs"
```

---

### Task 5: Final Polish and Verification

**Files:**
- Modify: `frontend/src/views/PersonDetailView.vue`

- [ ] **Step 1: Add entrance animations**

```css
.detail-content {
  animation: fadeIn 0.6s ease-out;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
}
```

- [ ] **Step 2: Verify responsiveness and themes**
- [ ] **Step 3: Commit**

```bash
git add frontend/src/views/PersonDetailView.vue
git commit -m "ui(person): add entrance animations and final polish"
```
