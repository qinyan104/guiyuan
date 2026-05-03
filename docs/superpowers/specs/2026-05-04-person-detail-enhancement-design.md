# Design Spec: Person Detail View Enhancement (Digital Biography)

## 1. Goal
Transform the person detail page into a dignified "Digital Biography" with clear hierarchy and better editing ergonomics.

## 2. Layout Structure
- **Person Hero (Header)**: Grand, centered display of name and vital dates.
- **Content Grid**:
    - **Primary Column (Left, 65%)**: Biography Card (Long-form notes).
    - **Secondary Column (Right, 35%)**: Relationship Cards (Family connections).
- **Mobile Layout**: Single column stacking Hero -> Biography -> Relationships.

## 3. Visual Language
- **Ancestral Aesthetic**:
    - Use `Noto Serif SC` for names and titles.
    - Paper texture for the biography area.
    - Octagonal/Decorative framing for avatars.
- **Cards**:
    - `border-radius: 24px`.
    - Soft, layered shadows.
    - Subtle borders (`1px solid var(--line-soft)`).
- **Status Indicators**:
    - Grayscale filter for deceased individuals in the Hero section.
    - Muted, dignified color palette (Ink, Earth, Amber, Celadon).

## 4. Components Detail
### 4.1 Person Hero
- **Avatar**: Large (160px), octagonal frame (`clip-path: polygon(30% 0%, 70% 0%, 100% 30%, 100% 70%, 70% 100%, 30% 100%, 0% 70%, 0% 30%)`).
- **Name**: Centered, large serif font.
- **Dates**: "1920 - 2005" centered below the name.
- **Background**: Subtle radial gradient (`radial-gradient(circle, var(--bg-panel-strong) 0%, var(--bg-shell) 100%)`).

### 4.2 Biography Card
- **Note Content**: Line height `1.8`, slightly larger font size (`1.05rem`).
- **Paper Effect**: `background-image` using a subtle noise pattern or SVG parchment texture.

### 4.3 Relationship Cards
- **Hover**: `transform: translateY(-4px) scale(1.02)`, increased shadow.
- **Icons**: Explicit gender icons (♂/♀) and status chips.

## 5. Editing Ergonomics
- **Form Sections**:
    - **Section 1: Vital Stats** (Name, Gender, Status, Dates).
    - **Section 2: Identity & Lineage** (Clan, Title/Honorifics).
    - **Section 3: Biography** (Notes).
- **Pinned Actions**: Floating "Save" and "Cancel" buttons in the bottom right or pinned to the top nav.

## 6. Implementation Plan
1.  **Refactor Template**: Reorganize HTML into the new grid structure.
2.  **Add Styles**: Implement the new CSS for hero, cards, and paper texture.
3.  **Enhance Logic**: Group form fields and update editing state management.
4.  **Verify**: Test responsiveness and "ancestral" look.
