# Design Spec: Heritage Star Map Homepage Redesign

**Status**: Draft (2026-05-04)
**Context**: Replaces the failed Zen/Ink design with a high-end "Star Map" aesthetic. The homepage is reimagined as a cosmic navigation interface where genealogies are represented as rotating constellations.

## 1. Visual Philosophy
- **Aesthetic**: Cosmic Minimalism / High-Tech Heritage.
- **Palette**: Deep Obsidian (#050505), Pure White (#FFFFFF), Amber/Gold accents (#FFD700), and dim Nebula blues (#001233).
- **Typography**: Precision sans-serif (Inter/Roboto) for data; elegant serif (Noto Serif SC) for titles.
- **Atmosphere**: Professional, expansive, high-contrast, and "un-cluttered".

## 2. Key Visual Components

### 2.1 Deep Space Canvas (Background)
- **Background**: Solid #050505.
- **Starfield**: A multi-layered parallax system with thousands of tiny, sharp points. 
    - Layer 1: Distant, dim stars (static).
    - Layer 2: Middle-ground stars (slow drift).
    - Layer 3: Near-field "stardust" (responds to mouse movement with slight lag).

### 2.2 Genealogy Constellations (Entities)
- **Shape**: Instead of cards or blobs, each genealogy is a **rotating constellation**.
- **Visuals**:
    - **Ancestor Star**: A brighter, central core pulse.
    - **Descendant Nodes**: Tiny, sharp light points scattered around the core.
    - **Lineage Paths**: Extremely thin, faint lines (0.5px) connecting the nodes.
- **Motion**: Each constellation slowly rotates on its own axis. On hover, the lines and nodes brighten, and the "Ancestor Star" glows with an amber aura.

### 2.3 Interactive HUD (Interface)
- **Floating HUD**: Navigation and management tools are presented as a minimalist Head-Up Display.
- **Action Buttons**: Styled as "Tactical" UI elements—sharp corners, no fills, only thin borders and icons.
- **Warp Transition**: Clicking a constellation triggers a camera zoom-in effect where stars streak past (motion blur), transitioning into the Workbench view.

## 3. Technical Implementation

### 3.1 Background & Constellations (Canvas API)
- Use a single `<canvas>` covering the viewport for all stars and constellations to ensure 60FPS performance.
- **Optimization**: Use a pixel-density aware drawing loop. Static stars are drawn once to an offscreen buffer.

### 3.2 Hover & Collision Detection
- Implement a simple "Distance-based" hover check in the canvas `mousemove` event to identify which constellation is targeted.
- Provide a "Gravity" effect where the cursor slightly attracts the nearest constellation.

### 3.3 CSS & Transitions
- Use `backdrop-filter: blur(20px)` for the Edit/Create dialogs to maintain the "Glassmorphism" feel over the starfield.
- Transition from Homepage to Workbench: Animate `scale` and `opacity` of the canvas while triggering a "Motion Blur" CSS filter on the main container.

## 4. User Workflow Enhancements
- **The "Great Wall" Dynasty Templates**: Templates are represented as two distinct "Nebulae" at the corners, clearly separated from the user's "Star Map".
- **Creation**: "Initiate Lineage" (New) is a central command button that "ignites" a new star in the map.
