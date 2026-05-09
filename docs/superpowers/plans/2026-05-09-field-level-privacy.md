# Field-Level Privacy Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement fine-grained privacy controls for genealogy data, allowing owners to redact specific fields (dates, notes, photos) for individual collaborators.

**Architecture:** Backend-enforced redaction using a reusable `PublicationViewProjector`. Privacy rules are stored in a new `redaction_profile` column in the `publication_access` table.

**Tech Stack:** Spring Boot 3.3 (Java 17, JPA, MySQL), Vue 3 (TypeScript).

---

### Task 1: Database Schema Migration

**Files:**
- Create: `backend/src/main/resources/db/migration/V2__add_redaction_profile_to_access.sql`

- [ ] **Step 1: Create Flyway migration file**
Create the file with the SQL to add the new column.
```sql
ALTER TABLE publication_access ADD COLUMN redaction_profile TEXT NULL;
```

- [ ] **Step 2: Commit**
```bash
git add backend/src/main/resources/db/migration/V2__add_redaction_profile_to_access.sql
git commit -m "db: add redaction_profile to publication_access table"
```

---

### Task 2: Backend Model & DTO Updates

**Files:**
- Modify: `backend/src/main/java/com/genealogy/server/model/PublicationAccess.java`
- Modify: `backend/src/main/java/com/genealogy/server/dto/PublicationAccessSummary.java` (Check if exists, if not, check controller response)

- [ ] **Step 1: Update PublicationAccess Entity**
Add the `redactionProfile` field with getter and setter.
```java
// backend/src/main/java/com/genealogy/server/model/PublicationAccess.java

@Column(name = "redaction_profile")
private String redactionProfile;

public String getRedactionProfile() { return redactionProfile; }
public void setRedactionProfile(String redactionProfile) { this.redactionProfile = redactionProfile; }
```

- [ ] **Step 2: Update Data Access Layer if needed**
Verify if any DTOs returned by `PublicationAccessController` need updating to include `redactionProfile`.

- [ ] **Step 3: Commit**
```bash
git add backend/src/main/java/com/genealogy/server/model/PublicationAccess.java
git commit -m "feat: add redactionProfile field to PublicationAccess entity"
```

---

### Task 3: Refactor & Generalize PublicationViewProjector

**Files:**
- Modify: `backend/src/main/java/com/genealogy/server/service/PublicationViewProjector.java`

- [ ] **Step 1: Update Redaction Logic**
Modify `projectRedacted` to handle the three-state rules (`NONE`, `LIVING`, `ALL`) for dates, notes, and photos.
```java
public void redactPerson(Map<String, Object> person, Map<String, Object> profile) {
    String datesRule = (String) profile.getOrDefault("dates", "NONE");
    String noteRule = (String) profile.getOrDefault("note", "NONE");
    String photoRule = (String) profile.getOrDefault("photo", "NONE");
    boolean isDeceased = Boolean.TRUE.equals(person.get("deceased"));

    if (shouldRedact(datesRule, isDeceased)) {
        person.put("birth", null);
        person.put("death", null);
        person.put("age", null);
    }
    if (shouldRedact(noteRule, isDeceased)) {
        person.put("note", null);
    }
    if (shouldRedact(photoRule, isDeceased)) {
        person.put("photoId", null);
        person.put("avatarUrl", null);
    }
}

private boolean shouldRedact(String rule, boolean isDeceased) {
    if ("ALL".equals(rule)) return true;
    if ("LIVING".equals(rule) && !isDeceased) return true;
    return false;
}
```

- [ ] **Step 2: Update projectRedacted to accept general profile**
Refactor `projectRedacted` to be more generic, accepting a `token` (for shares) or `null` (for direct user access).

- [ ] **Step 3: Commit**
```bash
git add backend/src/main/java/com/genealogy/server/service/PublicationViewProjector.java
git commit -m "refactor: generalize PublicationViewProjector for field-level privacy"
```

---

### Task 4: Integrate Redaction into PublicationController

**Files:**
- Modify: `backend/src/main/java/com/genealogy/server/controller/PublicationController.java`
- Modify: `backend/src/main/java/com/genealogy/server/repository/PublicationAccessRepository.java`

- [ ] **Step 1: Update controller to apply redaction**
In `get(@PathVariable Long id)`, fetch the current user's access profile and apply redaction if they are a `VIEWER`.
```java
// backend/src/main/java/com/genealogy/server/controller/PublicationController.java

@GetMapping("/{id}")
public ApiResponse<Map<String, Object>> get(@PathVariable Long id, HttpServletRequest request) {
    UserSubject subject = resolveSubject(request);
    authorizationService.require(subject, id, AccessPermission.READ_FULL);
    
    Map<String, Object> data = publicationService.loadPublication(id);
    
    // Apply field-level redaction for VIEWERS
    Optional<PublicationAccess> accessOpt = accessRepository.findByPublicationIdAndUserId(id, subject.getUserId());
    if (accessOpt.isPresent() && "VIEWER".equals(accessOpt.get().getRole())) {
        data = viewProjector.projectRedacted(data, accessOpt.get().getRedactionProfile(), null);
    }
    
    return ApiResponse.success(data);
}
```

- [ ] **Step 2: Commit**
```bash
git add backend/src/main/java/com/genealogy/server/controller/PublicationController.java
git commit -m "feat: apply field-level redaction in PublicationController for VIEWERS"
```

---

### Task 5: Frontend UI - Collaborator Redaction Configuration

**Files:**
- Modify: `frontend/src/components/CollaboratorManager.vue`
- Modify: `frontend/src/api/accessManage.ts`

- [ ] **Step 1: Update API to handle redactionProfile**
Ensure `updateCollaboratorRole` or equivalent supports passing the `redactionProfile`.

- [ ] **Step 2: Add Redaction UI to CollaboratorManager**
Add a section to configure privacy rules when a user is a `VIEWER`.
```vue
<!-- frontend/src/components/CollaboratorManager.vue -->
<div v-if="editingRole === 'VIEWER'" class="privacy-config">
  <h4>隐私脱敏设置</h4>
  <div class="config-field">
    <span>生卒与年龄:</span>
    <select v-model="redactionProfile.dates">
      <option value="NONE">公开</option>
      <option value="LIVING">仅隐藏在世人员</option>
      <option value="ALL">全部隐藏</option>
    </select>
  </div>
  <!-- Repeat for note and photo -->
</div>
```

- [ ] **Step 3: Test and Commit**
Verify the UI allows saving and the backend correctly persists the JSON.
```bash
git add frontend/src/components/CollaboratorManager.vue frontend/src/api/accessManage.ts
git commit -m "feat: add UI for configuring collaborator redaction profile"
```

---

### Task 6: Final Verification & Testing

- [ ] **Step 1: Create a test user and a publication**
- [ ] **Step 2: Grant the test user VIEWER access with "LIVING" date redaction**
- [ ] **Step 3: Log in as the test user and verify that living people's dates are null, but deceased ones are visible**
- [ ] **Step 4: Verify that notes and photos follow their respective rules**
- [ ] **Step 5: Verify that OWNER and EDITOR still see everything**
- [ ] **Step 6: Run existing tests to ensure no regressions**
Run: `cd backend && ./mvnw test`
Expected: PASS
