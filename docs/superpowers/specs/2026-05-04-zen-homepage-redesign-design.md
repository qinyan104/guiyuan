# Design Spec: Zen Minimalism Homepage Redesign (Ink Floating Style)

**Status**: Draft (2026-05-04)
**Context**: Replaces the standard card-based `PublicationListView.vue` with a high-end, artistic "Zen" interface featuring floating ink entities and an interactive canvas.

## 1. Visual Philosophy
- **Aesthetic**: Zen Minimalism.
- **Palette**: Warm Xuan paper base (#F4F2EB), varying ink tones (Black, Deep Grey, touch of Slate Blue), and minimal accent colors.
- **Typography**: Vertical serif fonts for titles (Noto Serif SC), small sans-serif for metadata.
- **Motion**: Floating gravity effect, liquid-like transitions, and organic hover interactions.

## 2. Interface Components

### 2.1 The Living Canvas (Background)
- **Texture**: Fine-grained paper fiber overlay (SVG filter).
- **Parallax**: Subtle background ink washes that shift slightly with mouse movement.
- **Atmosphere**: Absence of hard borders or scrollbars.

### 2.2 Floating Ink Entities (Publication Items)
- **Shape**: Procedural SVG blobs with `feGaussianBlur` and `feColorMatrix` filters to simulate ink-in-water diffusion.
- **Content**: 
    - **Title**: Large vertical text at the center of the blob.
    - **Metadata**: Faded horizontal text (Generation count, Last updated) floating around the title.
- **Animation**: 
    - **Floating**: CSS `translateY` animation with unique durations for each entity to simulate natural buoyancy.
    - **Hover**: Blobs become more opaque and "reach out" towards the cursor using CSS `transform`.

### 2.3 Interaction Model
- **Click-to-Enter**: Clicking a blob triggers a "Spreading Ink" transition where the blob expands to cover the entire screen, smoothly transitioning into the Workbench view.
- **Management Tools**: Floating radial menu or a discreet sidebar appearing only when a blob is active, using "Ripple" animations to reveal action icons (Edit, Delete, Stats).

## 3. Technical Implementation

### 3.1 Styling (Vanilla CSS)
- **Filters**: Extensive use of `backdrop-filter` for glassmorphism and `filter: url(#ink-filter)` for the organic edges.
- **Layout**: Absolute positioning with a "Golden Ratio" distribution or randomized-but-balanced scattering algorithm.

### 3.2 Performance
- **SVG Optimization**: Limit the number of active filter nodes to ensure 60fps on typical hardware.
- **Hardware Acceleration**: Use `will-change: transform` and `translate3d` for all floating animations.

## 4. User Workflow Changes
- **Creation**: "New Publication" becomes a floating brush icon at the corner. Clicking it drops a "New Ink Drop" into the canvas.
- **Management**: A Shift from "File Management" to "Artifact Curation".
