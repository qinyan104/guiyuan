# Design Spec: Archive Pro - Digital Heritage Gallery

**Status**: Draft (2026-05-04)
**Context**: Replaces failed abstract designs with a professional, minimalist museum-style interface. Focuses on industrial design, high-end typography, and precise spacing to convey value and history.

## 1. Visual Philosophy
- **Aesthetic**: Industrial Minimalism / Modern Museum Archive.
- **Palette**: Studio White (#F9F9FB), Deep Charcoal (#1A1A1A), Muted Silver (#E5E5E7), and a singular "heritage red" accent (#A12D2D) for critical actions.
- **Typography**: 
    - Titles: Noto Serif SC (Bold, vertical where appropriate but structured).
    - Data/Meta: Inter or SF Pro (Precision-aligned, uppercase for labels).
- **Materiality**: Matte surfaces, razor-sharp edges (4px radius), and zero "cheap" effects (no glow, no blur).

## 2. Interface Components

### 2.1 The Archive Grid (Layout)
- **Structure**: A rigorous, balanced grid with massive whitespace (40px+ gutters).
- **Header**: A clean, technical header with a large "Archive" title and a mono-spaced stats counter (e.g., "COLLECTION: 12 PROJECTS").

### 2.2 Genealogy Folios (The Cards)
- **Concept**: Each project is presented as a "Folio"—a physical folder sitting on a gallery table.
- **Visuals**:
    - **Face**: A large, centered vertical title in Noto Serif SC.
    - **Top Edge**: A subtle "tab" indicating the project ID or category.
    - **Bottom Bar**: Technical data (Generations: 24 | Members: 1,202) in a small, mono-spaced font.
- **Interaction**: Hover triggers a very fast, subtle lift (2px) and a sharpening of the border color. No floating, no spinning.

### 2.3 The Creation Command
- **Visual**: Instead of a "brush" or "seal", the "New Project" action is a dedicated, empty grid slot with a clean "+" and the text "INITIATE NEW RECORD". 
- **Style**: Dashed border, low contrast until hovered.

## 3. Technical Implementation
- **Layout**: CSS Grid with `grid-template-columns: repeat(auto-fill, minmax(360px, 1fr))`.
- **Styling**: Standard CSS, prioritizing `border-left` for vertical accents and `padding` for hierarchy.
- **Transitions**: 0.2s ease-out for all hover states.

## 4. User Workflow Enhancements
- **Metadata Management**: Edit and Delete actions are presented as small, text-based links (e.g., "[ EDIT ]", "[ DELETE ]") rather than icons, emphasizing the "archival" nature.
- **Templates**: Dynasty templates are grouped at the very end of the collection as "REFERENCE SAMPLES", styled with a distinct muted background color.
