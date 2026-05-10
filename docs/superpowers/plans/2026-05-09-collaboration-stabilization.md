# Collaboration Stabilization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add optimistic concurrency protection, conflict-aware autosave UX, and explicit confirmation flows for high-risk collaboration actions so small family collaborators cannot silently overwrite one another.

**Architecture:** Add a publication revision counter on the backend, require the latest revision on write APIs, return a structured conflict response when the client is stale, and teach the Vue workbench to pause autosave and surface a recovery path. In the same phase, replace ad-hoc browser confirms for destructive collaboration actions with consistent dialog-driven confirmation and clearer feedback.

**Tech Stack:** Spring Boot 3.3, Spring Data JPA, Flyway, Vue 3, TypeScript, Vitest, Playwright

---

## File Map

### Backend

- Create: `backend/src/main/resources/db/migration/V3__add_publication_revision.sql`
- Create: `backend/src/main/java/com/genealogy/server/exception/ConflictException.java`
- Modify: `backend/src/main/java/com/genealogy/server/config/GlobalExceptionHandler.java`
- Modify: `backend/src/main/java/com/genealogy/server/model/Publication.java`
- Modify: `backend/src/main/java/com/genealogy/server/dto/PublicationSnapshot.java`
- Modify: `backend/src/main/java/com/genealogy/server/controller/PublicationController.java`
- Modify: `backend/src/main/java/com/genealogy/server/service/PublicationService.java`
- Modify: `backend/src/test/java/com/genealogy/server/service/PublicationServiceTest.java`
- Modify: `backend/src/test/java/com/genealogy/server/controller/PublicationAccessControllerTest.java`
- Create: `backend/src/test/java/com/genealogy/server/controller/PublicationControllerConflictTest.java`

### Frontend

- Modify: `frontend/src/types/family.ts`
- Modify: `frontend/src/api/publication.ts`
- Modify: `frontend/src/api/accessManage.ts`
- Modify: `frontend/src/api/http.ts`
- Create: `frontend/src/api/conflict.ts`
- Create: `frontend/src/api/conflict.test.ts`
- Create: `frontend/src/components/ConfirmDialog.vue`
- Create: `frontend/src/components/ConfirmDialog.test.ts`
- Modify: `frontend/src/components/CollaboratorManager.vue`
- Modify: `frontend/src/components/BranchMountManager.vue`
- Modify: `frontend/src/views/PublicationListView.vue`
- Modify: `frontend/src/views/PublicationLayout.vue`
- Create: `frontend/src/views/PublicationLayout.conflict.test.ts`
- Modify: `frontend/src/api/accessManage.test.ts`
- Modify: `frontend/src/App.test.ts` or create targeted test if conflict handling needs isolated coverage

### Docs

- Modify: `README.md`
- Modify: `docs/OPERATIONS_GUIDE.md`

## Task 1: Add Publication Revision and Conflict Exception

**Files:**
- Create: `backend/src/main/resources/db/migration/V3__add_publication_revision.sql`
- Create: `backend/src/main/java/com/genealogy/server/exception/ConflictException.java`
- Modify: `backend/src/main/java/com/genealogy/server/config/GlobalExceptionHandler.java`
- Modify: `backend/src/main/java/com/genealogy/server/model/Publication.java`
- Test: `backend/src/test/java/com/genealogy/server/service/PublicationServiceTest.java`

- [ ] **Step 1: Write the failing backend service test for stale revision rejection**

```java
@Test
void updatePublicationRejectsStaleRevision() {
    Publication publication = new Publication();
    publication.setId(7L);
    publication.setTitle("Current");
    publication.setRevision(5L);

    when(publicationRepository.findById(7L)).thenReturn(Optional.of(publication));

    assertThatThrownBy(() -> publicationService.updatePublication(
            7L,
            4L,
            "Updated",
            "",
            Map.of("focusFamilyId", "", "people", Map.of(), "families", Map.of()),
            "{}",
            "{}"))
        .isInstanceOf(ConflictException.class)
        .hasMessageContaining("stale");
}
```

- [ ] **Step 2: Run the focused backend test to verify it fails**

Run:

```bash
cd backend
./mvnw.cmd -Dtest=PublicationServiceTest test
```

Expected: FAIL because `Publication` has no `revision` field, `updatePublication(...)` has no expected-revision argument, and `ConflictException` does not exist yet.

- [ ] **Step 3: Add the revision column migration**

```sql
ALTER TABLE publications
    ADD COLUMN revision BIGINT NOT NULL DEFAULT 0 AFTER publication_info_json;

UPDATE publications
SET revision = 0
WHERE revision IS NULL;
```

- [ ] **Step 4: Add the conflict exception and wire it into the global exception handler**

```java
package com.genealogy.server.exception;

public class ConflictException extends RuntimeException {
    public ConflictException(String message) {
        super(message);
    }
}
```

```java
@ExceptionHandler(ConflictException.class)
@ResponseStatus(HttpStatus.CONFLICT)
public ApiResponse<Void> handleConflict(ConflictException e) {
    return ApiResponse.error(409, e.getMessage());
}
```

- [ ] **Step 5: Add the revision field to the publication entity**

```java
@Column(name = "revision", nullable = false)
private Long revision = 0L;

public Long getRevision() { return revision; }
public void setRevision(Long revision) { this.revision = revision; }
```

- [ ] **Step 6: Run the focused backend test again**

Run:

```bash
cd backend
./mvnw.cmd -Dtest=PublicationServiceTest test
```

Expected: still FAIL because the service method has not enforced the expected revision yet.

- [ ] **Step 7: Commit**

```bash
git add backend/src/main/resources/db/migration/V3__add_publication_revision.sql backend/src/main/java/com/genealogy/server/exception/ConflictException.java backend/src/main/java/com/genealogy/server/config/GlobalExceptionHandler.java backend/src/main/java/com/genealogy/server/model/Publication.java backend/src/test/java/com/genealogy/server/service/PublicationServiceTest.java
git commit -m "feat(backend): add publication revision conflict foundation"
```

## Task 2: Enforce Conflict Checks in Publication Write APIs

**Files:**
- Modify: `backend/src/main/java/com/genealogy/server/dto/PublicationSnapshot.java`
- Modify: `backend/src/main/java/com/genealogy/server/controller/PublicationController.java`
- Modify: `backend/src/main/java/com/genealogy/server/service/PublicationService.java`
- Create: `backend/src/test/java/com/genealogy/server/controller/PublicationControllerConflictTest.java`
- Modify: `backend/src/test/java/com/genealogy/server/service/PublicationServiceTest.java`

- [ ] **Step 1: Write the failing controller test for HTTP 409 on stale update**

```java
@Test
void updateReturnsConflictWhenClientRevisionIsStale() throws Exception {
    doThrow(new ConflictException("Publication is stale. Reload before saving."))
        .when(publicationService)
        .updatePublication(eq(100L), eq(3L), any(), any(), any(), any(), any());

    mockMvc.perform(put("/api/publications/100")
            .requestAttr("currentUsername", "testuser")
            .contentType(MediaType.APPLICATION_JSON)
            .content("""
                {
                  "title": "Clan Book",
                  "subtitle": "",
                  "revision": 3,
                  "publication": { "focusFamilyId": "", "people": {}, "families": {} },
                  "settings": {},
                  "info": {}
                }
                """))
        .andExpect(status().isConflict())
        .andExpect(jsonPath("$.code").value(409));
}
```

- [ ] **Step 2: Run the focused controller test to verify it fails**

Run:

```bash
cd backend
./mvnw.cmd -Dtest=PublicationControllerConflictTest test
```

Expected: FAIL because the DTO lacks `revision`, the controller still calls the old service signature, and no conflict test scaffold exists yet.

- [ ] **Step 3: Extend the publication snapshot DTO with revision**

```java
private Long revision;

public Long getRevision() { return revision; }
public void setRevision(Long revision) { this.revision = revision; }
```

- [ ] **Step 4: Return revision on publication load and require it on update**

```java
response.put("revision", publication.getRevision());
```

```java
publicationService.updatePublication(
    id,
    body.getRevision(),
    body.getTitle(),
    body.getSubtitle(),
    body.getPublication(),
    settingsJson,
    infoJson
);
```

- [ ] **Step 5: Enforce optimistic concurrency in the service**

```java
public void updatePublication(Long publicationId, Long expectedRevision, String title, String subtitle,
                              Map<String, Object> publicationData, String settingsJson, String infoJson) {
    Publication publication = publicationRepository.findById(publicationId)
            .orElseThrow(() -> new NotFoundException("Publication not found"));

    long clientRevision = expectedRevision == null ? -1L : expectedRevision;
    long serverRevision = publication.getRevision() == null ? 0L : publication.getRevision();
    if (clientRevision != serverRevision) {
        throw new ConflictException("Publication is stale. Reload before saving.");
    }

    publication.setRevision(serverRevision + 1);
    // existing title/subtitle/settings/info/focusFamilyId updates remain here
}
```

- [ ] **Step 6: Also bump revision on metadata-only updates**

```java
public void updatePublicationMetadata(Long publicationId, Long expectedRevision, String title, String subtitle, String infoJson) {
    Publication publication = publicationRepository.findById(publicationId)
            .orElseThrow(() -> new NotFoundException("Publication not found"));

    long clientRevision = expectedRevision == null ? -1L : expectedRevision;
    long serverRevision = publication.getRevision() == null ? 0L : publication.getRevision();
    if (clientRevision != serverRevision) {
        throw new ConflictException("Publication is stale. Reload before saving.");
    }

    publication.setRevision(serverRevision + 1);
    publication.setTitle(title);
    publication.setSubtitle(subtitle);
    publication.setPublicationInfoJson(infoJson);
    publicationRepository.save(publication);
}
```

- [ ] **Step 7: Run the focused backend tests**

Run:

```bash
cd backend
./mvnw.cmd "-Dtest=PublicationControllerConflictTest,PublicationServiceTest" test
```

Expected: PASS with explicit 409 behavior and revision increments.

- [ ] **Step 8: Commit**

```bash
git add backend/src/main/java/com/genealogy/server/dto/PublicationSnapshot.java backend/src/main/java/com/genealogy/server/controller/PublicationController.java backend/src/main/java/com/genealogy/server/service/PublicationService.java backend/src/test/java/com/genealogy/server/controller/PublicationControllerConflictTest.java backend/src/test/java/com/genealogy/server/service/PublicationServiceTest.java
git commit -m "feat(backend): enforce optimistic publication concurrency"
```

## Task 3: Teach the Frontend API Layer About Revisions and Conflicts

**Files:**
- Modify: `frontend/src/types/family.ts`
- Modify: `frontend/src/api/publication.ts`
- Modify: `frontend/src/api/http.ts`
- Create: `frontend/src/api/conflict.ts`
- Create: `frontend/src/api/conflict.test.ts`

- [ ] **Step 1: Write the failing frontend test that normalizes 409 publication conflicts**

```ts
import { describe, expect, it } from 'vitest'
import { asPublicationConflict } from './conflict'

describe('asPublicationConflict', () => {
  it('maps a 409 response into a typed conflict object', () => {
    const conflict = asPublicationConflict({
      response: {
        status: 409,
        data: { code: 409, message: 'Publication is stale. Reload before saving.' },
      },
      config: { method: 'put', url: '/publications/7' },
    })

    expect(conflict?.kind).toBe('publication-conflict')
    expect(conflict?.publicationId).toBe(7)
  })
})
```

- [ ] **Step 2: Run the focused frontend test to verify it fails**

Run:

```bash
cd frontend
npm run test -- src/api/conflict.test.ts
```

Expected: FAIL because `conflict.ts` does not exist.

- [ ] **Step 3: Add revision to the publication load contract**

```ts
export interface PublicationLoadResult {
  id: number
  revision: number
  publication: PublicationData
  settings: PublicationSettings
}
```

- [ ] **Step 4: Add a typed conflict helper**

```ts
export interface PublicationConflict {
  kind: 'publication-conflict'
  publicationId: number | null
  message: string
}

export function asPublicationConflict(error: any): PublicationConflict | null {
  const status = error?.response?.status
  const url = error?.config?.url ?? ''
  if (status !== 409 || !url.includes('/publications/')) return null

  const match = url.match(/\/publications\/(\d+)/)
  return {
    kind: 'publication-conflict',
    publicationId: match ? Number(match[1]) : null,
    message: error?.response?.data?.message || 'Publication is stale. Reload before saving.',
  }
}
```

- [ ] **Step 5: Send revision with write calls**

```ts
export async function updatePublication(
  id: number,
  revision: number,
  publication: PublicationData,
  settings: PublicationSettings,
): Promise<void> {
  await http.put(`/publications/${id}`, {
    revision,
    title: publication.title,
    subtitle: publication.subtitle,
    publication,
    settings,
    info: publication.info,
  })
}
```

```ts
export async function updatePublicationMetadata(
  id: number,
  revision: number,
  title: string,
  subtitle: string,
  info: PublicationInfo | null,
): Promise<void> {
  await http.put(`/publications/${id}/metadata`, {
    revision,
    title,
    subtitle,
    info,
  })
}
```

- [ ] **Step 6: Make the HTTP formatter preserve API 409 messages cleanly**

```ts
export function formatHttpError(error: any): string {
  const apiMessage = error?.response?.data?.message
  if (error?.response?.status === 409 && apiMessage) {
    return apiMessage
  }
  // existing formatter logic stays below
}
```

- [ ] **Step 7: Run the focused frontend tests**

Run:

```bash
cd frontend
npm run test -- src/api/conflict.test.ts src/api/http.test.ts
```

Expected: PASS with typed conflict mapping and clean 409 formatting.

- [ ] **Step 8: Commit**

```bash
git add frontend/src/types/family.ts frontend/src/api/publication.ts frontend/src/api/http.ts frontend/src/api/conflict.ts frontend/src/api/conflict.test.ts
git commit -m "feat(frontend): add publication revision and conflict typing"
```

## Task 4: Make Autosave Conflict-Aware in the Workbench

**Files:**
- Modify: `frontend/src/views/PublicationLayout.vue`
- Create: `frontend/src/views/PublicationLayout.conflict.test.ts`
- Modify: `frontend/src/App.test.ts` if shared auth bootstrap helpers are reused

- [ ] **Step 1: Write the failing view test for conflict-paused autosave**

```ts
it('switches to conflict state and stops autosave retries until reload', async () => {
  vi.mocked(updatePublication).mockRejectedValueOnce({
    response: { status: 409, data: { message: 'Publication is stale. Reload before saving.' } },
    config: { method: 'put', url: '/publications/7' },
  } as never)

  const wrapper = mount(PublicationLayout, {
    global: { mocks: { $route: { params: { id: '7' } } } },
  })

  await flushPromises()
  expect(wrapper.text()).toContain('Reload before saving')
})
```

- [ ] **Step 2: Run the focused view test to verify it fails**

Run:

```bash
cd frontend
npm run test -- src/views/PublicationLayout.conflict.test.ts
```

Expected: FAIL because the layout has no revision state, no conflict state, and no reload flow.

- [ ] **Step 3: Track server revision and add a conflict sync status**

```ts
const serverRevision = ref<number | null>(null)
const syncStatus = ref<'saved' | 'pending' | 'syncing' | 'error' | 'conflict'>('saved')
const conflictMessage = ref('')
```

- [ ] **Step 4: Persist and refresh revision on load and save**

```ts
const result = await getPublication(targetId)
serverPublicationId.value = result.id
serverRevision.value = result.revision
```

```ts
await updatePublication(serverPublicationId.value, serverRevision.value!, pub.publication, pub.settings)
serverRevision.value += 1
syncStatus.value = 'saved'
```

- [ ] **Step 5: Pause autosave on conflict and surface a reload action**

```ts
import { asPublicationConflict } from '../api/conflict'

const conflict = asPublicationConflict(err)
if (conflict) {
  syncStatus.value = 'conflict'
  conflictMessage.value = conflict.message
  feedback.errorMessage.value = conflict.message
  if (serverSaveTimeout) clearTimeout(serverSaveTimeout)
  return
}
```

```ts
async function reloadFromServerAfterConflict() {
  conflictMessage.value = ''
  await load()
  syncStatus.value = 'saved'
}
```

- [ ] **Step 6: Render a visible conflict banner instead of silent error state**

```vue
<div v-if="syncStatus === 'conflict'" class="sync-conflict-banner">
  <span>{{ conflictMessage }}</span>
  <button type="button" @click="reloadFromServerAfterConflict">Reload latest version</button>
</div>
```

- [ ] **Step 7: Run the focused frontend test**

Run:

```bash
cd frontend
npm run test -- src/views/PublicationLayout.conflict.test.ts src/App.test.ts
```

Expected: PASS with autosave pausing on 409 instead of looping or collapsing into a generic sync error.

- [ ] **Step 8: Commit**

```bash
git add frontend/src/views/PublicationLayout.vue frontend/src/views/PublicationLayout.conflict.test.ts frontend/src/App.test.ts
git commit -m "feat(workbench): pause autosave on publication conflict"
```

## Task 5: Replace Ad-Hoc Confirms with a Shared Confirmation Dialog

**Files:**
- Create: `frontend/src/components/ConfirmDialog.vue`
- Create: `frontend/src/components/ConfirmDialog.test.ts`
- Modify: `frontend/src/components/CollaboratorManager.vue`
- Modify: `frontend/src/components/BranchMountManager.vue`
- Modify: `frontend/src/views/PublicationListView.vue`
- Modify: `frontend/src/api/accessManage.ts`
- Modify: `frontend/src/api/accessManage.test.ts`

- [ ] **Step 1: Write the failing component test for confirmation dialog events**

```ts
it('emits confirm and cancel separately', async () => {
  const wrapper = mount(ConfirmDialog, {
    props: { modelValue: true, title: 'Delete publication', confirmLabel: 'Delete' },
  })

  await wrapper.get('button[data-role="confirm"]').trigger('click')
  expect(wrapper.emitted('confirm')).toHaveLength(1)
})
```

- [ ] **Step 2: Run the focused component test to verify it fails**

Run:

```bash
cd frontend
npm run test -- src/components/ConfirmDialog.test.ts
```

Expected: FAIL because the dialog component does not exist.

- [ ] **Step 3: Build a shared confirmation dialog component**

```vue
<script setup lang="ts">
defineProps<{
  modelValue: boolean
  title: string
  message: string
  confirmLabel?: string
  tone?: 'danger' | 'warning'
}>()

const emit = defineEmits<{
  'update:modelValue': [boolean]
  confirm: []
  cancel: []
}>()
</script>
```

```vue
<button data-role="cancel" type="button" @click="emit('cancel'); emit('update:modelValue', false)">Cancel</button>
<button data-role="confirm" type="button" @click="emit('confirm')">{{ confirmLabel || 'Confirm' }}</button>
```

- [ ] **Step 4: Replace browser `confirm()` in collaborator removal**

```ts
const pendingRemovalUserId = ref<number | null>(null)

function requestRemove(userId: number) {
  pendingRemovalUserId.value = userId
}

async function confirmRemove() {
  if (pendingRemovalUserId.value == null) return
  await removeAccessRecord(props.publicationId, pendingRemovalUserId.value)
  pendingRemovalUserId.value = null
  await load(true)
}
```

- [ ] **Step 5: Replace browser `confirm()` in branch merge and publication delete**

```ts
const showMergeConfirm = ref(false)

function requestMerge() {
  showMergeConfirm.value = true
}
```

```ts
function requestDelete(id: number) {
  deleteConfirmId.value = id
}
```

- [ ] **Step 6: Add explicit action messages to the access API tests**

```ts
it('posts to the branch merge endpoint', async () => {
  await mergeBranch(7, 'person-9')
  expect(http.post).toHaveBeenCalledWith('/publications/7/access/person-9/merge')
})
```

Keep this test and add a sibling test for removal callers only after the component state changes; do not move confirmation behavior into the API layer.

- [ ] **Step 7: Run the focused frontend tests**

Run:

```bash
cd frontend
npm run test -- src/components/ConfirmDialog.test.ts src/api/accessManage.test.ts
```

Expected: PASS and no remaining direct browser `confirm()` calls in the targeted collaboration views.

- [ ] **Step 8: Commit**

```bash
git add frontend/src/components/ConfirmDialog.vue frontend/src/components/ConfirmDialog.test.ts frontend/src/components/CollaboratorManager.vue frontend/src/components/BranchMountManager.vue frontend/src/views/PublicationListView.vue frontend/src/api/accessManage.ts frontend/src/api/accessManage.test.ts
git commit -m "feat(ui): standardize high-risk collaboration confirmations"
```

## Task 6: Add Focused Docs and Regression Coverage

**Files:**
- Modify: `README.md`
- Modify: `docs/OPERATIONS_GUIDE.md`
- Modify: `backend/src/test/java/com/genealogy/server/controller/PublicationAccessControllerTest.java`
- Optional create if absent: `frontend/e2e/specs/collaboration-conflict.spec.ts`

- [ ] **Step 1: Write the failing controller test for merge audit/permission path staying intact**

```java
@Test
void mergeBranchStillRequiresManageAccess() throws Exception {
    mockMvc.perform(post("/api/publications/100/access/person-9/merge")
            .requestAttr("currentUsername", "testuser")
            .contentType(MediaType.APPLICATION_JSON))
        .andExpect(status().isOk());

    verify(authorizationService).require(any(UserSubject.class), eq(100L), eq(AccessPermission.MANAGE_ACCESS));
}
```

- [ ] **Step 2: Run the backend regression test**

Run:

```bash
cd backend
./mvnw.cmd -Dtest=PublicationAccessControllerTest test
```

Expected: PASS before docs changes. If it fails after the conflict work, fix the behavior before proceeding.

- [ ] **Step 3: Update README collaboration behavior notes**

Add a short section that states:

```md
- Publication saves now carry a server revision.
- If two collaborators edit the same publication, stale saves are rejected instead of silently overwriting data.
- When a conflict occurs, reload the latest publication state before retrying edits.
```

- [ ] **Step 4: Update the operations guide with the new recovery-lite workflow**

Add a troubleshooting block such as:

```md
### Publication save conflict (409)
- Symptom: the editor shows a stale-save conflict instead of saving.
- Cause: another collaborator saved a newer revision first.
- Operator action: reload the publication, verify the latest content, then retry the edit.
```

- [ ] **Step 5: Add or extend an end-to-end stale-edit smoke test**

```ts
test('stale collaborator save shows conflict reload guidance', async ({ browser }) => {
  const pageA = await browser.newPage()
  const pageB = await browser.newPage()
  // log in both sessions, open same publication, save from A, then save stale state from B
  await expect(pageB.getByText(/Reload latest version/i)).toBeVisible()
})
```

- [ ] **Step 6: Run the verification suite**

Run:

```bash
cd backend
./mvnw.cmd "-Dtest=PublicationServiceTest,PublicationControllerConflictTest,PublicationAccessControllerTest" test
```

Run:

```bash
cd frontend
npm run test -- src/api/conflict.test.ts src/api/http.test.ts src/components/ConfirmDialog.test.ts src/views/PublicationLayout.conflict.test.ts src/api/accessManage.test.ts
```

Run if environment is available:

```bash
cd frontend
npm run test:e2e
```

Expected:

- Backend targeted tests PASS
- Frontend targeted tests PASS
- E2E PASS if backend + MySQL are running; otherwise document that it was not run

- [ ] **Step 7: Commit**

```bash
git add README.md docs/OPERATIONS_GUIDE.md backend/src/test/java/com/genealogy/server/controller/PublicationAccessControllerTest.java frontend/e2e/specs/collaboration-conflict.spec.ts
git commit -m "docs(test): cover collaboration conflict behavior"
```

## Self-Review

### Spec coverage

- Workstream A from the approved spec is covered here: optimistic concurrency, conflict feedback, high-risk action confirmation, and collaborator-facing clarity.
- Workstream B (restore points/audit readability expansion) is intentionally excluded and needs its own plan.
- Workstream C (delivery/operations hardening beyond conflict docs) is intentionally excluded and needs its own plan.

### Placeholder scan

- No `TBD`, `TODO`, or “similar to task N” placeholders remain.
- The only optional item is the E2E file creation because the suite may already have a better file to extend; the behavior itself is still explicitly defined.

### Type consistency

- Backend uses `revision` as the persisted concurrency field.
- Frontend uses `revision` on `PublicationLoadResult` and sends the same field back on writes.
- Conflict handling always maps to HTTP `409`.

## Follow-up Plans

After this plan ships, write two separate plans instead of extending this file:

1. `P2 Recovery and Trust`
2. `P3 Delivery and Operations`

Those should remain independent so implementation stays reviewable and testable.
