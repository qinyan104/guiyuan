# 族谱活动动态 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Show field-level edit history — who changed which person's what field, with old→new diff.

**Architecture:** Backend computes a JSON diff during `savePersonsAndFamilies()` by comparing incoming data against existing DB records, stores it in `AuditLog.detail`. A new `/activity` endpoint returns parsed logs. Frontend expands the existing timeline UI to show field-level changes.

**Tech Stack:** Java 17, Spring Boot 3.3, JPA, Vue 3 + TypeScript

---

## File Structure

| File | Purpose |
|------|---------|
| `backend/.../service/PublicationService.java` | Add `computePersonDiff()` and call it in `savePersonsAndFamilies()` |
| `backend/.../controller/PublicationController.java` | Add `GET /{id}/activity` endpoint |
| `frontend/src/api/publication.ts` | Add `getPublicationActivity()` API call |
| `frontend/src/views/PublicationStatsView.vue` | Expand timeline to show field-level diff |

---

### Task 1: Backend — Person Diff Computation in savePersonsAndFamilies

**Files:**
- Modify: `backend/src/main/java/com/genealogy/server/service/PublicationService.java`

- [ ] **Step 1: Add diff computation method**

Read `PublicationService.java` first. Find the `savePersonsAndFamilies` method (around line 466). It has:
- `personIdToDbId` map: maps personId → database ID
- Person data loaded from DB early in the method (the `people` variable)

Add this method at the end of `PublicationService` (before the closing `}`), near the other validation methods:

```java
private String computePersonDiff(Map<String, Object> people, Map<String, Long> personIdToDbId,
        Map<String, Object> existingPeopleData, java.util.Map<Long, com.genealogy.server.model.Person> dbPersonCache) {
    if (people == null || people.isEmpty()) return "[]";
    if (dbPersonCache == null || dbPersonCache.isEmpty()) return "[]";

    java.util.List<Map<String, Object>> personChanges = new java.util.ArrayList<>();

    for (Map.Entry<String, Object> entry : people.entrySet()) {
        if (personChanges.size() >= 50) break; // cap at 50 persons

        String personId = entry.getKey();
        @SuppressWarnings("unchecked")
        Map<String, Object> incoming = (Map<String, Object>) entry.getValue();
        Long dbId = personIdToDbId.get(personId);
        if (dbId == null) continue; // new person, no diff

        com.genealogy.server.model.Person existing = dbPersonCache.get(dbId);
        if (existing == null) continue;

        java.util.List<Map<String, String>> fieldChanges = new java.util.ArrayList<>();

        diffField(fieldChanges, "name", "姓名", existing.getName(), (String) incoming.get("name"));
        diffField(fieldChanges, "gender", "性别",
            existing.getGender() != null ? existing.getGender().name() : null,
            (String) incoming.get("gender"));
        diffField(fieldChanges, "birth", "出生", existing.getBirth(), (String) incoming.get("birth"));
        diffField(fieldChanges, "death", "去世", existing.getDeath(), (String) incoming.get("death"));
        diffField(fieldChanges, "deceased", "在世",
            existing.getDeceased() != null ? String.valueOf(existing.getDeceased()) : null,
            incoming.get("deceased") != null ? String.valueOf(incoming.get("deceased")) : null);
        diffField(fieldChanges, "age", "年龄", existing.getAge(), (String) incoming.get("age"));
        diffField(fieldChanges, "titleName", "字/号", existing.getTitleName(), (String) incoming.get("titleName"));
        diffField(fieldChanges, "clan", "氏族", existing.getClan(), (String) incoming.get("clan"));
        diffField(fieldChanges, "note", "备注", existing.getNote(), (String) incoming.get("note"));
        diffAvatarField(fieldChanges, existing.getAvatarUrl(), (String) incoming.get("avatarUrl"));

        if (!fieldChanges.isEmpty()) {
            Map<String, Object> changeEntry = new java.util.LinkedHashMap<>();
            changeEntry.put("personName", existing.getName() != null ? existing.getName() : personId);
            changeEntry.put("personId", personId);
            changeEntry.put("changes", fieldChanges.subList(0, Math.min(fieldChanges.size(), 10)));
            personChanges.add(changeEntry);
        }
    }

    try {
        String json = new com.fasterxml.jackson.databind.ObjectMapper().writeValueAsString(personChanges);
        if (json.length() > 500) {
            // Truncate: drop the last entry and re-serialize
            personChanges.remove(personChanges.size() - 1);
            json = new com.fasterxml.jackson.databind.ObjectMapper().writeValueAsString(personChanges);
            if (json.length() > 500) return "[]";
        }
        return json;
    } catch (Exception e) {
        return "[]";
    }
}

private void diffField(java.util.List<Map<String, String>> changes, String field, String label,
        String oldVal, String newVal) {
    String o = oldVal != null ? oldVal : "";
    String n = newVal != null ? newVal : "";
    if (!o.equals(n)) {
        Map<String, String> c = new java.util.LinkedHashMap<>();
        c.put("field", field);
        c.put("fieldLabel", label);
        c.put("old", o);
        c.put("new", n);
        changes.add(c);
    }
}

private void diffAvatarField(java.util.List<Map<String, String>> changes, String oldUrl, String newUrl) {
    String o = oldUrl != null ? oldUrl : "";
    String n = newUrl != null ? newUrl : "";
    if (!o.equals(n)) {
        Map<String, String> c = new java.util.LinkedHashMap<>();
        c.put("field", "avatarUrl");
        c.put("fieldLabel", "头像");
        c.put("old", o.isEmpty() ? "" : "已有头像");
        c.put("new", n.isEmpty() ? "已移除" : "已更新");
        changes.add(c);
    }
}
```

- [ ] **Step 2: Wire diff computation into savePersonsAndFamilies**

In `savePersonsAndFamilies()`, the person entities are created and saved in a loop around line 471-511. After that loop, the `personIdToDbId` map is fully populated and `dbPersonCache` should already have the existing persons loaded from DB.

Find WHERE the existing person data is loaded. The method already queries existing persons for photoIdMap purposes. You need to build a `Map<Long, Person> dbPersonCache` from the existing persons BEFORE the person save loop.

Look for code like:
```java
// Existing person query for photo mapping
Map<Long, Long> photoIdMap = new HashMap<>();
if (!cloneReferencedPhotos) { ... }
```

Add BEFORE the person iteration loop (around line 471), to build the cache:

```java
// Build cache of existing persons for diff computation
java.util.Map<Long, com.genealogy.server.model.Person> dbPersonCache = new java.util.HashMap<>();
var existingPersons = personRepository.findByPublicationId(publicationId);
for (com.genealogy.server.model.Person p : existingPersons) {
    dbPersonCache.put(p.getId(), p);
}
```

Then, at the END of `savePersonsAndFamilies()`, after ALL persons and families are saved (where the method returns or ends), replace the `logAction()` call. Find where the method's caller (`createPublication`, `updatePublication`) calls `logAction()`.

Actually, the cleaner approach: `savePersonsAndFamilies` should RETURN the diff string. Change the method from `void` to return `String`, and return `diffJson` at the end.

Then in `updatePublication()`, after calling `savePersonsAndFamilies()`, use the returned diff string when calling `logAction()`.

Simpler approach: pass the diff string back. 

**Pragmatic approach:** Store the computed diff as a local variable and include it in the audit log. The `savePersonsAndFamilies` method already has access to `auditLogRepository`? No — the caller (`updatePublication`) creates the audit log. Let's just compute and store it in the method.

Actually, the simplest approach is: compute the diff STRING in `savePersonsAndFamilies` and return it. Then the caller uses it.

Change the method signature from `private void savePersonsAndFamilies(...)` to return `String` (the diff JSON).

At the end of the method, after all saving is done, compute and return the diff. If something goes wrong, return `"[]"`.

Then in `updatePublication()` (around line 199-242), capture the return value and pass it to `logAction()`.

Find the existing `logAction` call in `updatePublication`:
```java
logAction(username, "UPDATE_PUB", "保存族谱「..."」", id);
```

Change to:
```java
String personDiff = savePersonsAndFamilies(...); // capture diff
logAction(username, "UPDATE_PUB", personDiff, id); // use diff as detail
```

Also in `updatePerson()` (around line 258-332) — this updates a single person directly. For this endpoint, compute a simple single-person diff there.

OK, this is getting complex for a single step. Let me simplify: just compute the diff as a local variable, and modify the callers to use it.

- [ ] **Step 2 (simplified): Wire diff into callers**

In `savePersonsAndFamilies`, change return type from `void` to `String`. At the end, compute and return the diff:

```java
// At the very end of savePersonsAndFamilies, after all saving is done:
Map<String, Object> people = (Map<String, Object>) data.get("people");
return computePersonDiff(people, personIdToDbId, null, dbPersonCache);
```

In `updatePublication()` (around line 199-242), find:
```java
savePersonsAndFamilies(publicationId, data, photoIdMap, false);
logAction(username, "UPDATE_PUB", "保存族谱「" + (title != null ? title : "未命名") + "」", id);
```

Change to:
```java
String personDiff = savePersonsAndFamilies(publicationId, data, photoIdMap, false);
logAction(username, "UPDATE_PUB", personDiff, id);
```

In `createPublication()` (around line 176-197), find:
```java
savePersonsAndFamilies(pubId, data, photoIdMap, true);
logAction(username, "CREATE_PUB", "创建族谱「" + (title != null ? title : "未命名") + "」", pubId);
```

Change to:
```java
savePersonsAndFamilies(pubId, data, photoIdMap, true); // no diff for creation
logAction(username, "CREATE_PUB", "创建族谱「" + (title != null ? title : "未命名") + "」", pubId);
```

Note: `createPublication` doesn't need diff because all persons are new.

Also need to handle `updatePerson()` — this method updates a single person directly without going through `savePersonsAndFamilies`. Add a simple diff there too.

Find `updatePerson()` (around line 258-332) and locate where it calls `logAction`:

```java
logAction(username, "UPDATE_PERSON", "更新人物「" + ... + "」的详细信息", pubId);
```

Replace with a simple single-person diff:

```java
String singleDiff = computeSinglePersonDiff(pubId, personId, body);
logAction(username, "UPDATE_PERSON", singleDiff, pubId);
```

And add the helper:

```java
private String computeSinglePersonDiff(Long pubId, String personId, Map<String, Object> body) {
    var personOpt = personRepository.findByPublicationIdAndPersonId(pubId, personId);
    if (personOpt.isEmpty()) return "[]";
    com.genealogy.server.model.Person existing = personOpt.get();
    
    java.util.List<Map<String, String>> changes = new java.util.ArrayList<>();
    diffField(changes, "name", "姓名", existing.getName(), (String) body.get("name"));
    diffField(changes, "birth", "出生", existing.getBirth(), (String) body.get("birth"));
    diffField(changes, "death", "去世", existing.getDeath(), (String) body.get("death"));
    diffField(changes, "deceased", "在世", 
        existing.getDeceased() != null ? String.valueOf(existing.getDeceased()) : null,
        body.get("deceased") != null ? String.valueOf(body.get("deceased")) : null);
    diffField(changes, "note", "备注", existing.getNote(), (String) body.get("note"));
    
    if (changes.isEmpty()) return "[]";
    
    Map<String, Object> entry = new java.util.LinkedHashMap<>();
    entry.put("personName", existing.getName() != null ? existing.getName() : personId);
    entry.put("personId", personId);
    entry.put("changes", changes);
    
    try {
        return new com.fasterxml.jackson.databind.ObjectMapper().writeValueAsString(
            java.util.List.of(entry));
    } catch (Exception e) {
        return "[]";
    }
}
```

You'll need to add the repository query method or use an existing one. Check if `personRepository.findByPublicationIdAndPersonId()` exists. If not, use `personRepository.findByPublicationId()` and filter.

- [ ] **Step 3: Run backend tests**

Run: `cd backend && ./mvnw test --batch-mode`
Expected: 124 tests pass, BUILD SUCCESS

If compilation errors due to method signature changes, fix `updatePublicationMetadata()` which also calls `savePersonsAndFamilies` — same treatment: capture return but don't use diff for metadata-only updates.

- [ ] **Step 4: Commit**

```bash
git add backend/src/main/java/com/genealogy/server/service/PublicationService.java
git commit -m "feat: compute person diff on save and store in audit log"
```

---

### Task 2: Backend — Activity Endpoint

**Files:**
- Modify: `backend/src/main/java/com/genealogy/server/controller/PublicationController.java`

- [ ] **Step 1: Add getActivity endpoint**

Read `PublicationController.java` first. Find the existing `history()` method for reference.

Add this method after the `history()` method:

```java
@GetMapping("/{id}/activity")
public ApiResponse<List<Map<String, Object>>> activity(@PathVariable Long id, HttpServletRequest request) {
    UserSubject subject = resolveSubject(request);
    authorizationService.require(subject, id, AccessPermission.HISTORY_READ);
    List<Map<String, Object>> logs = auditLogRepository
            .findByTargetTypeAndTargetIdOrderByCreatedAtDesc("publication", id)
            .stream()
            .limit(50)
            .map(log -> {
                Map<String, Object> m = new java.util.LinkedHashMap<>();
                m.put("id", log.getId());
                m.put("username", log.getUsername());
                m.put("action", log.getAction());
                m.put("detail", log.getDetail());
                m.put("createdAt", log.getCreatedAt());
                return m;
            })
            .collect(java.util.stream.Collectors.toList());
    return ApiResponse.success(logs);
}
```

Note: This is essentially identical to the existing `history()` method. The difference is that the frontend will now parse `detail` as JSON to show field-level changes. The existing `history()` method is used by the stats page; the new `activity()` method has the same logic but the frontend will handle it differently.

Actually, to avoid code duplication, just DELEGATE: have `history()` call `activity()` internally, or vice versa. Or just modify the existing `history()` to return the same format (since `detail` is already JSON) and let the frontend handle parsing.

Simplest approach: modify the EXISTING `history()` method to include a human-readable summary derived from the JSON diff. The current format already returns `detail` — it just needs the frontend to parse it differently.

For this task, just change the existing `history()` endpoint to include richer data:

```java
@GetMapping("/{id}/history")
public ApiResponse<List<Map<String, Object>>> history(@PathVariable Long id, HttpServletRequest request) {
    UserSubject subject = resolveSubject(request);
    authorizationService.require(subject, id, AccessPermission.HISTORY_READ);
    List<Map<String, Object>> logs = auditLogRepository.findByTargetTypeAndTargetIdOrderByCreatedAtDesc("publication", id)
            .stream()
            .limit(50)
            .map(log -> {
                Map<String, Object> m = new java.util.LinkedHashMap<>();
                m.put("id", log.getId());
                m.put("username", log.getUsername());
                m.put("action", log.getAction());
                m.put("detail", log.getDetail());
                m.put("createdAt", log.getCreatedAt());
                return m;
            })
            .collect(java.util.stream.Collectors.toList());
    return ApiResponse.success(logs);
}
```

The existing code already works. The key change is in the CALLER — `updatePublication` and `updatePerson` now store JSON diff in `detail` instead of plain text. No changes needed to this endpoint itself.

So this task is actually: modify the logAction calls in updatePublication and updatePerson to store JSON diff. Wait, we already did that in Task 1.

**Conclusion: No additional backend changes needed for the endpoint itself.** The existing `history()` endpoint already returns `detail` — it just now contains JSON instead of plain text. The frontend handles parsing.

- [ ] **Step 1: Run backend tests to verify Task 1 changes don't break anything**

Run: `cd backend && ./mvnw test --batch-mode`
Expected: 124 tests pass, BUILD SUCCESS

- [ ] **Step 2: Update existing tests if needed**

If the `PublicationServiceTest` mocks `savePersonsAndFamilies` with a specific signature, update it to match the new return type. Check if any test breaks.

- [ ] **Step 3: Commit** (only if changes were needed)

```bash
git add backend/src/main/java/com/genealogy/server/controller/PublicationController.java
git commit -m "feat: activity endpoint returns JSON diff in audit detail"
```

---

### Task 3: Frontend — Activity Timeline with Field-Level Diff

**Files:**
- Modify: `frontend/src/api/publication.ts`
- Modify: `frontend/src/views/PublicationStatsView.vue`

- [ ] **Step 1: Add TypeScript types and API function**

Read `frontend/src/api/publication.ts`. Find the existing `getPublicationHistory()` function for reference.

Add after `getPublicationHistory()`:

```typescript
export interface ActivityEntry {
  id: number
  username: string
  action: string
  detail: string
  createdAt: string
}

export interface ParsedActivity extends ActivityEntry {
  parsedDetail: PersonChangeEntry[] | null
}

export interface PersonChangeEntry {
  personName: string
  personId: string
  changes: FieldChange[]
}

export interface FieldChange {
  field: string
  fieldLabel: string
  old: string
  new: string
}

export async function getPublicationActivity(id: number): Promise<ParsedActivity[]> {
  const resp = await http.get<ApiResponse<ActivityEntry[]>>(`/publications/${id}/history`)
  if (resp.data.code !== 200) throw new Error(resp.data.message || '获取活动记录失败')
  return (resp.data.data || []).map((entry) => ({
    ...entry,
    parsedDetail: tryParseDetail(entry.detail),
  }))
}

function tryParseDetail(detail: string): PersonChangeEntry[] | null {
  try {
    const parsed = JSON.parse(detail)
    if (Array.isArray(parsed) && parsed.length > 0 && parsed[0].personName) {
      return parsed
    }
    return null
  } catch {
    return null
  }
}
```

- [ ] **Step 2: Update PublicationStatsView.vue activity timeline**

Read `frontend/src/views/PublicationStatsView.vue`. Find the timeline section (around lines 432-459).

Current code shows action tag + detail. Replace the timeline item rendering to:

```html
<article
  v-for="log in publicationHistory"
  :key="log.id"
  class="audit-entry"
>
  <div class="audit-entry__meta">
    <span class="audit-entry__username">{{ log.username }}</span>
    <time class="audit-entry__time" :datetime="log.createdAt">
      {{ formatRelativeTime(log.createdAt) }}
    </time>
    <span class="audit-entry__action-tag" :class="actionClass(log.action)">
      {{ actionLabel(log.action) }}
    </span>
  </div>

  <!-- Field-level diff (only when parsedDetail exists) -->
  <div v-if="log.parsedDetail" class="audit-entry__diff">
    <div v-for="person in log.parsedDetail" :key="person.personId" class="diff-person">
      <strong class="diff-person__name">{{ person.personName }}</strong>
      <div v-for="change in person.changes" :key="change.field" class="diff-field">
        <span class="diff-field__label">{{ change.fieldLabel }}</span>
        <span class="diff-field__old">{{ change.old || '（空）' }}</span>
        <span class="diff-field__arrow">→</span>
        <span class="diff-field__new">{{ change.new || '（空）' }}</span>
      </div>
    </div>
  </div>

  <!-- Fallback for legacy audit entries without parsed diff -->
  <p v-else class="audit-entry__detail">{{ log.detail }}</p>
</article>
```

Add computed helpers in the script section:

```typescript
import { getPublicationHistory, type ParsedActivity } from '../api/publication'

// Replace existing publicationHistory ref typing:
const publicationHistory = ref<ParsedActivity[]>([])

function actionLabel(action: string): string {
  const labels: Record<string, string> = {
    CREATE_PUB: '创建族谱',
    UPDATE_PUB: '保存修改',
    DELETE_PUB: '删除族谱',
    UPDATE_PUB_META: '修改信息',
    UPDATE_PERSON: '编辑人物',
  }
  return labels[action] || action
}

function actionClass(action: string): string {
  if (action === 'DELETE_PUB') return 'tag--danger'
  if (action === 'CREATE_PUB') return 'tag--success'
  return 'tag--info'
}

function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMin = Math.floor(diffMs / 60000)
  if (diffMin < 1) return '刚刚'
  if (diffMin < 60) return `${diffMin} 分钟前`
  const diffHour = Math.floor(diffMin / 60)
  if (diffHour < 24) return `${diffHour} 小时前`
  const diffDay = Math.floor(diffHour / 24)
  if (diffDay < 30) return `${diffDay} 天前`
  return date.toLocaleDateString('zh-CN')
}
```

Add styles for the diff display in the `<style scoped>` section:

```css
.audit-entry__diff {
  margin-top: 8px;
  padding: 8px 12px;
  background: rgba(0, 0, 0, 0.02);
  border-radius: 8px;
  font-size: 0.85rem;
}

.diff-person {
  margin-bottom: 4px;
}

.diff-person__name {
  color: var(--accent-amber);
}

.diff-field {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 2px 0;
}

.diff-field__label {
  min-width: 48px;
  color: var(--text-soft);
  font-size: 0.78rem;
}

.diff-field__old {
  text-decoration: line-through;
  color: #c0392b;
  background: rgba(192, 57, 43, 0.06);
  padding: 1px 6px;
  border-radius: 3px;
}

.diff-field__arrow {
  color: var(--text-soft);
}

.diff-field__new {
  color: #27ae60;
  background: rgba(39, 174, 96, 0.06);
  padding: 1px 6px;
  border-radius: 3px;
}

.audit-entry__action-tag {
  font-size: 0.72rem;
  padding: 1px 8px;
  border-radius: 10px;
  font-weight: 500;
}

.tag--info { background: rgba(59, 130, 246, 0.1); color: #3b82f6; }
.tag--success { background: rgba(39, 174, 96, 0.1); color: #27ae60; }
.tag--danger { background: rgba(192, 57, 43, 0.1); color: #c0392b; }
```

Update the `loadHistory()` function to use `getPublicationHistory()` (which now returns `ParsedActivity[]`):

```typescript
async function loadHistory() {
  if (!publicationId.value) return
  try {
    publicationHistory.value = await getPublicationHistory(publicationId.value)
  } catch {
    // silently ignore — history is non-critical
  }
}
```

Note: `getPublicationHistory` already exists in `publication.ts`. Rename the import to `getPublicationActivity` or just use the existing function name. Check the existing import and function name.

- [ ] **Step 3: Run frontend verification**

Run: `cd frontend && npx vue-tsc --noEmit`
Expected: PASS (0 errors)

Run: `cd frontend && npx vitest run`
Expected: 85 passed

- [ ] **Step 4: Commit**

```bash
git add frontend/src/api/publication.ts \
        frontend/src/views/PublicationStatsView.vue
git commit -m "feat: add field-level diff display to activity timeline"
```
