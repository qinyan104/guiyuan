# Design Spec: Dynasty Templates Section

## Goal
Add a pinned section of pre-defined dynasty templates (Tang and Ming) to the `PublicationListView.vue` to allow users to quickly create large genealogies for testing and exploration.

## Architecture
- **View**: `frontend/src/views/PublicationListView.vue`
- **Data Source**: `frontend/src/data/builtinDynastySamples.ts`
- **Logic**: Use `createPublication` from `../api/publication.ts` to clone the template data into a new user-owned publication.

## State Management
- `creatingTemplate`: A boolean `ref` to track the cloning process.
- `builtinSamples`: The imported array of samples.

## UI Components
### Template Section
- Position: Between `.list-header` and `.publication-grid`.
- Layout: Grid or Flexbox depending on the number of items.
- Header: "王朝世系模板" with a brief description.

### Template Card
- Displays: `sample.publication.title`, `sample.publication.subtitle`.
- Interaction: Click to trigger `handleCreateFromTemplate`.
- Visuals: 
    - Gold/Amber border to signify "Premium/System" content.
    - Subtle parchment-like background or gold gradient.
    - Hover transition for feedback.

## Logic Flow
1. User clicks a template card.
2. `handleCreateFromTemplate(sample)` is called.
3. `creatingTemplate` becomes `true`.
4. `createPublication` is invoked with:
    - Data: `sample.publication`
    - Settings: `defaultSettings` (from `sampleFamily.ts`)
    - Title: `sample.publication.title + ' (副本)'`
5. On success, redirect to `/workbench/:id`.
6. On failure, reset state and show error message.

## Verification Plan
- [ ] Templates are visible at the top of the list.
- [ ] Clicking a template creates a new entry and redirects to the workbench.
- [ ] Loading state is visible during creation.
- [ ] Styling is consistent with the Noto Serif SC theme.
