# Design Spec: Distributed Genealogy Collaboration & Aggregation System

**Status**: Partially implemented (2026-05-07)
**Current shipped slice**: owner-managed branch mounts plus one-shot physical merge
**Deferred**: automatic live aggregation, subtree-aware grafting, circular mount validation

## 1. Problem Statement

Genealogy collaboration needs two separate capabilities:

1. Independent branch maintenance, so different family members can edit their own lineage safely.
2. Controlled aggregation, so a trunk owner can either keep a branch as a logical mount target or permanently copy it into the main publication.

The current system now supports the second step as an explicit owner action. It does **not** yet implement automatic live aggregation across publications.

## 2. Current Architecture & Data Model

### 2.1 Authorization Model

- Collaboration is enforced by `publication_access`.
- `OWNER` can manage access and operate branch mounts from the trunk publication UI.
- Physical merge currently requires:
  - `MANAGE_ACCESS` on the master publication
  - `READ_FULL` on the target publication

### 2.2 Mount Metadata Storage

The current implementation does **not** use a dedicated `publication_mounts` table.

Instead, mount metadata is stored directly on the trunk-side `persons` row:

| Field | Type | Meaning |
| :--- | :--- | :--- |
| `is_mount_point` | Boolean | Whether this person acts as a branch mount point |
| `target_publication_id` | Long | Which publication is mounted or merge-targeted |
| `target_root_person_id` | Long | Reserved anchor/root metadata for future subtree-aware merging |

On the frontend, this is exposed as:

```ts
person.isMountPoint
person.mountPointTarget = {
  publicationId,
  publicationTitle,
  rootPersonId,
}
```

### 2.3 Backend Behavior

#### Publication Loading

`PublicationService.loadPublication(...)` returns normal publication data plus mount metadata for each mounted person. This supports:

- mount-point icon rendering in the canvas
- editor-side mount management
- reloading the latest mount target metadata after merge

#### Publication Saving

Mount metadata is persisted through both flows:

- full publication snapshot save: `savePersonsAndFamilies(...)`
- single-person edit: `updatePerson(...)`

This matters because the editor currently autosaves the whole publication snapshot rather than relying only on person-level PATCH calls.

#### Physical Merge

`POST /api/publications/{id}/access/{personId}/merge`

This endpoint calls `PublicationService.mergeBranch(...)`, which:

1. validates that the selected trunk person is an active mount point
2. authorizes read access to the target publication
3. deep-clones all target people into the master publication using `merged_{targetPubId}_*` ID prefixes
4. deep-clones all target families and remaps family members to the newly created master-side person rows
5. deep-clones referenced photos
6. clears mount metadata on the original trunk mount point

This is a **snapshot merge**, not a live reference.

## 3. Current User Workflow

### 3.1 Branch Preparation

1. A user creates or owns a separate publication for a branch.
2. They populate that publication independently.

### 3.2 Mount Setup in the Trunk

1. Open the trunk publication.
2. Open a person in `PersonEditorDrawer.vue`.
3. Use `BranchMountManager.vue` to mark that trunk person as a mount point.
4. Choose a target publication from the current user's owned publication list.

At this stage, the trunk only stores metadata. No target branch data is copied yet.

### 3.3 Physical Merge

1. From the same mount panel, trigger "physical merge".
2. The backend copies the entire target publication snapshot into the master publication.
3. The original mount-point flag is removed from the trunk person.

## 4. Constraints & Known Gaps

- There is no automatic recursive aggregation on `GET /api/publications/{id}`.
- The current UI only lists publications owned by the current user; collaborator-accessible publications are not yet surfaced as mount targets.
- `targetRootPersonId` is stored and round-tripped, but the physical merge engine does not yet use it to limit the merge to a subtree.
- There is no dedicated circular-reference detector yet because mounts are not executed as a persistent graph traversal system today.

## 5. Frontend Status

The implemented UI pieces are:

- `components/BranchMountManager.vue`
  - toggle mount status
  - select target publication
  - trigger physical merge
  - refresh shared publication context after merge
- `components/PersonEditorDrawer.vue`
  - hosts the mount manager inside the person editor
- `components/PersonCardSvg.vue`
  - shows a visual mount-point indicator
- `src/api/accessManage.ts`
  - exposes `mergeBranch(publicationId, personId)`

## 6. Future Path

If the product later needs the original "live grafting" vision, the next design step should be a separate architecture pass that introduces:

- persistent mount graph modeling
- live recursive aggregation on load
- subtree-aware root selection
- circular mount validation
- conflict and refresh semantics for already merged snapshots
