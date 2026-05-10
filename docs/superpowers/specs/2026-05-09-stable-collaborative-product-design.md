# Stable Collaborative Product Design

## Context

The project has already moved beyond a demo editor. It includes publication editing, account/auth flows, collaborator roles, branch mounting and merge, share links, export, admin pages, field-level privacy, backups, and a growing operations guide. The next planning cycle should not expand breadth indiscriminately. It should turn the current feature set into a stable product that small family or clan groups can use with low risk.

This spec repositions the product as a small-scale collaborative genealogy system for browser-based use, with local/offline-compatible escape hatches through export, backup, and snapshot workflows.

## Product Positioning

### Target user

- A small number of family or clan collaborators
- Mixed technical ability
- Primary usage through a browser-hosted deployment
- Secondary need for local/offline portability and recovery

### Product promise

Users should be able to create, browse, edit, share, and collaborate on a genealogy publication without fear of silent overwrite, accidental destructive actions, or irrecoverable data loss.

### Non-goals for this phase

- Building a large-organization governance system
- Adding social/community features such as comments or activity feeds
- Expanding the theme catalog or marketing-style surface polish
- Building a full mobile editor
- Prioritizing broad import ecosystem work ahead of collaboration stability

## Phase Goal

Turn the current system into a trustworthy collaborative product by improving three areas in sequence:

1. Collaboration safety
2. Recovery and trust
3. Lightweight delivery and operations

The phase is complete when first-time collaborators can use the system with low confusion and low risk, and the maintainer can recover from problems without relying on tribal knowledge.

## Recommended Approach

Use a product-hardening approach rather than a feature-expansion approach.

The system already has enough surface area to be useful. The main risk is not missing features; it is inconsistent or unsafe behavior around concurrent edits, destructive operations, unclear permissions, and recovery paths. The right next step is to make collaboration reliable, make data recovery visible, and reduce maintenance fragility.

## Architecture Direction

The existing split architecture remains valid:

- Vue frontend continues to own interaction flow, status messaging, and destructive-action affordances
- Spring Boot backend continues to own permission checks, persistence, merge rules, audit records, and export/backup endpoints
- MySQL remains the source of truth

This phase adds three product-level control layers on top of the current architecture:

### 1. Edit consistency layer

Add explicit edit-version checks to publication writes and other high-risk update paths so the backend can reject stale writes instead of allowing silent overwrite.

### 2. Recovery layer

Expose publication-level restore points and readable recovery workflows, rather than leaving safety entirely at the infrastructure backup level.

### 3. Operational clarity layer

Tighten docs, diagnostics, and health checks so deploy/recover/debug flows are repeatable.

## Workstream A: Collaboration Safety

### Objective

Prevent silent overwrite, reduce accidental destructive actions, and make collaborator boundaries understandable.

### Scope

- Introduce version-aware edit submission for publication updates
- Reject stale writes with a clear API error contract
- Surface conflict feedback in the frontend with actionable next steps
- Add explicit confirmation flows for high-risk actions such as delete, merge, collaborator role changes, and privacy-impacting changes
- Improve role/permission messaging so collaborators understand what actions are allowed

### Expected behavior

- Two users editing the same publication do not silently overwrite each other
- A stale client receives a conflict response and is guided to refresh or reload the latest state
- Merge and permission changes are always framed as explicit, high-signal operations

### Design constraints

- Keep the collaborator model simple: `OWNER`, `EDITOR`, `VIEWER`
- Do not introduce complex real-time sync in this phase
- Prefer optimistic concurrency with graceful conflict handling over live collaborative editing

## Workstream B: Recovery and Trust

### Objective

Make users confident that data can be recovered after mistakes, and make administrators able to trace meaningful changes.

### Scope

- Add publication-level restore points or snapshots that users can understand
- Define the minimum metadata for a restore point: publication identifier, timestamp, actor, reason/label
- Present restore and rollback actions with strong guardrails
- Improve audit readability around high-risk operations
- Align backup, restore, and privacy documentation with actual product behavior

### Expected behavior

- A maintainer can restore a publication to a recent safe state
- Users can distinguish between normal save behavior, restore points, and infrastructure backup
- High-risk actions leave readable audit traces

### Design constraints

- Do not attempt full event sourcing in this phase
- Use a pragmatic restore model that fits the current persistence structure
- Recovery UX must stay understandable for non-technical users

## Workstream C: Lightweight Delivery and Operations

### Objective

Reduce maintenance friction so the system can be deployed and supported consistently.

### Scope

- Consolidate startup, environment, and security configuration guidance
- Define a small health-check and deployment verification checklist
- Tighten troubleshooting around auth, CORS, refresh, merge, export, and recovery flows
- Make recovery drills explicit in operations docs

### Expected behavior

- A new environment can be brought up from docs without hidden assumptions
- The maintainer has a short, repeatable checklist to verify a deployment
- Common production-like failures have documented diagnosis paths

### Design constraints

- Favor documentation and targeted diagnostics over infrastructure expansion
- Do not introduce new runtime dependencies unless clearly necessary

## Data and API Direction

### Concurrency contract

Write APIs that mutate publication state should carry a version marker from the last loaded state. The backend should compare that marker with the current persisted version and reject stale writes with a conflict status and structured error payload.

At minimum, the payload should tell the frontend:

- The operation failed because the client state is stale
- Which publication was affected
- What the current server version is
- Whether the client should reload before retrying

### Recovery contract

Recovery workflows should operate at publication scope. A restore point should preserve enough state to reconstruct the publication and its relevant editable graph consistently. The design intentionally avoids full system-wide rollback.

### Audit contract

Audit records should become more user-facing for critical actions:

- collaborator added/removed
- role changed
- merge executed
- restore point created
- restore executed
- publication deleted

## UX Direction

### UX priorities

1. High-risk actions must feel high-risk
2. Failures must be legible
3. Safe recovery options must be visible
4. Permission boundaries must be understandable without reading documentation

### UI patterns to prefer

- Inline status strips for non-blocking status
- Explicit destructive confirmation dialogs for irreversible or high-impact actions
- Clear conflict banners or dialogs for stale-edit rejection
- `Last updated` and actor context where it reduces ambiguity

### UI patterns to avoid

- Silent fallback after rejected writes
- Ambiguous success states after merge or permission changes
- Overloading the editor with heavy admin workflows

## Testing Strategy

### Backend

- Unit tests for version conflict detection
- Controller/service tests for stale write rejection and response contract
- Tests for restore-point creation and restore execution
- Security tests confirming role boundaries remain intact

### Frontend

- API-layer tests for conflict and recovery error handling
- View/component tests for conflict messaging and destructive confirmation flows
- Regression tests for auth/session interactions during conflict resolution

### End-to-end

- Two-user stale-edit scenario
- Collaborator role change flow
- Merge confirmation and result messaging flow
- Restore workflow smoke test

## Rollout Sequence

### Stage P1: Collaboration Stabilization

Deliver optimistic concurrency checks, clearer high-risk action feedback, and stronger collaborator-facing permission UX.

### Stage P2: Recovery and Trust

Deliver publication restore points, restore workflows, and readable audit trails around critical actions.

### Stage P3: Delivery and Operations

Deliver deployment verification, recovery drills, and consolidated troubleshooting and maintenance guidance.

## Risks and Mitigations

### Risk: concurrency checks create user friction

Mitigation: keep the conflict path simple and explicit. Reject stale writes only where the risk of overwrite is meaningful, and provide immediate refresh guidance.

### Risk: recovery model becomes too complex

Mitigation: scope recovery to publication-level restore points instead of global rollback or event sourcing.

### Risk: this phase appears light on visible features

Mitigation: frame the deliverable as trust and maintainability work that unlocks safe real-world usage. This is a productization phase, not a surface-expansion phase.

## Success Criteria

The phase succeeds when all of the following are true:

- Small family collaborators can use the browser-hosted product without frequent confusion about permissions or save behavior
- Concurrent edits do not silently overwrite one another
- High-risk actions are confirmed and audited
- The maintainer can restore a publication from a recent safe point
- Deployment and recovery workflows are documented well enough to run without memory-based steps

## Decision Summary

- Build toward a stable collaborative product, not a breadth expansion
- Keep the small-collaborator model and avoid enterprise complexity
- Prefer optimistic concurrency over real-time co-editing
- Prioritize restore confidence before new import/ecosystem expansion
- Treat operations clarity as product work, not afterthought
