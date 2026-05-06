# Design Spec: Distributed Genealogy Collaboration & Aggregation System

**Status**: Draft (2026-05-04)
**Context**: Enables multiple branch editors to independently maintain their own lineage while a SuperAdmin aggregates them into a "Main Trunk" publication with automatic real-time synchronization.

## 1. Problem Statement
Genealogy research is inherently collaborative but sensitive. Centralized editing leads to data conflicts and accidental overrides. Branch-based collaboration allows local expertise (e.g., a grandson knowing his immediate family) to be captured independently and "grafted" onto the main family tree safely.

## 2. Architecture & Data Model

### 2.1 Role-Based Access Control (RBAC)
- **SUPER_ADMIN**: Full access to all publications. Can perform "Mount" operations to link branch publications to the main trunk.
- **BRANCH_EDITOR**: Can only create, read, and update publications they own. They have no visibility into the main trunk or other branches.

### 2.2 Data Entities
#### `publication_mounts` (New Table)
Records the linkage between a trunk node and a branch publication.
| Field | Type | Description |
| :--- | :--- | :--- |
| `id` | Long (PK) | Unique identifier |
| `parent_pub_id` | Long (FK) | ID of the Trunk Publication |
| `anchor_person_id` | Long (FK) | ID of the person in the Trunk where the branch attaches |
| `child_pub_id` | Long (FK) | ID of the independent Branch Publication |
| `mount_date` | Timestamp | When the link was established |
| `is_active` | Boolean | Whether the link is currently active |

### 2.3 Automatic Aggregation Engine (Backend)
When `GET /api/publications/{id}` is called for a Trunk publication:
1. **Fetch Primary Data**: Load all persons and families belonging to the trunk.
2. **Scan Mounts**: Query `publication_mounts` for any linked `child_pub_id` attached to the trunk's persons.
3. **Recursive Fetch**: For each mount, recursively fetch the branch data.
4. **Namespace Management**: To prevent ID collisions (e.g., Person #1 exists in both Trunk and Branch), the aggregator must prefix branch IDs (e.g., `B12_P1`) before returning the unified JSON to the frontend.
5. **Grafting**: The aggregator "stitches" the branch's root nodes to the trunk's `anchor_person_id` in the memory model.

## 3. User Workflow

### 3.1 Branch Entry (The Collaborator)
1. Collaborator logs in to their `BRANCH_EDITOR` account.
2. Creates a new publication (e.g., "Third Branch of Li Family").
3. Starts from the earliest known ancestor (usually a grandfather) and builds the tree downwards.
4. Sends the Publication ID to the SuperAdmin.

### 3.2 Aggregation (The SuperAdmin)
1. SuperAdmin opens the Main Trunk publication.
2. Identifies the "Grafting Point" (the node representing the branch's ancestor).
3. Uses the "Mount Branch" tool to input the Collaborator's Publication ID.
4. System validates the link and performs a "Dry Run" visualization.
5. Once confirmed, the branch is permanently "mounted".

### 3.3 Automatic Sync
- Since the Trunk **references** the Branch ID rather than copying its data, any changes made by the Collaborator (fixing a date, adding a photo) are immediately reflected in the Main Trunk upon next reload.

## 4. Security & Constraints
- **Trunk Integrity**: Branch editors cannot modify the Trunk.
- **Grafting Logic**: A branch can only be grafted to a leaf or internal node of the trunk. The trunk node acts as a read-only "Header" for the branch data.
- **Circular Reference Protection**: The system must prevent mounting a trunk into its own branch.

## 5. Frontend Requirements
- **Mount Indicator**: In the Workbench, mounted branches should have a subtle visual distinction (e.g., a faint color background or a "Syncing" icon) to inform the Admin that this data comes from an external source.
- **Merge Tool**: A dedicated UI for SuperAdmins to manage, update, or detach mounts.
