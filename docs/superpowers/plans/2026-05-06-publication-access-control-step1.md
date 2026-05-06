# Publication Access Control — Step 1: Unified Authorization Abstraction

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Establish `PublicationAuthorizationService` and `publication_access` table so that every publication endpoint enforces object-level permission checks, closing the IDOR vulnerability where any authenticated user can access any publication.

**Architecture:** New `auth` package provides `AccessSubject` (who is requesting) and `AccessPermission` (what they want). `PublicationAuthorizationService` queries `publication_access` to decide. A `CommandLineRunner` backfills existing publications with OWNER records. Controllers call `require()` before any publication operation.

**Tech Stack:** Java 17, Spring Boot 3.3, Spring Data JPA, JUnit 5 + Mockito + AssertJ

---

## File Structure

| # | File | Action | Responsibility |
|---|------|--------|---------------|
| 1 | `backend/src/main/java/com/genealogy/server/model/PublicationAccess.java` | Create | JPA entity for `publication_access` table |
| 2 | `backend/src/main/java/com/genealogy/server/repository/PublicationAccessRepository.java` | Create | Spring Data JPA repository |
| 3 | `backend/src/main/java/com/genealogy/server/auth/AccessPermission.java` | Create | Enum of 9 permission actions |
| 4 | `backend/src/main/java/com/genealogy/server/auth/AccessSubject.java` | Create | Interface for request subject |
| 5 | `backend/src/main/java/com/genealogy/server/auth/UserSubject.java` | Create | Subject implementation for logged-in users |
| 6 | `backend/src/main/java/com/genealogy/server/auth/ShareSubject.java` | Create | Placeholder for share-link subjects |
| 7 | `backend/src/main/java/com/genealogy/server/service/PublicationAuthorizationService.java` | Create | Core authorization logic with IDOR protection |
| 8 | `backend/src/test/java/com/genealogy/server/service/PublicationAuthorizationServiceTest.java` | Create | Unit tests for authorization service |
| 9 | `backend/src/main/java/com/genealogy/server/config/AccessControlMigrationRunner.java` | Create | Backfill existing publications with OWNER records |
| 10 | `backend/src/main/java/com/genealogy/server/service/PublicationService.java:194-209` | Modify | Auto-create OWNER record in `createPublication()` |
| 11 | `backend/src/main/java/com/genealogy/server/controller/PublicationController.java` | Modify | Add `require()` calls before every endpoint |
| 12 | `backend/src/main/java/com/genealogy/server/controller/ExportController.java` | Modify | Add `require()` calls before export endpoints |

---

### Task 1: PublicationAccess Entity

**Files:**
- Create: `backend/src/main/java/com/genealogy/server/model/PublicationAccess.java`

- [ ] **Step 1: Create the entity**

```java
package com.genealogy.server.model;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "publication_access", uniqueConstraints = {
    @UniqueConstraint(columnNames = {"publication_id", "user_id"})
})
public class PublicationAccess {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "publication_id", nullable = false)
    private Long publicationId;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Column(nullable = false, length = 20)
    private String role;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @Column(name = "created_by")
    private Long createdBy;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public Long getPublicationId() { return publicationId; }
    public void setPublicationId(Long publicationId) { this.publicationId = publicationId; }
    public Long getUserId() { return userId; }
    public void setUserId(Long userId) { this.userId = userId; }
    public String getRole() { return role; }
    public void setRole(String role) { this.role = role; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
    public LocalDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; }
    public Long getCreatedBy() { return createdBy; }
    public void setCreatedBy(Long createdBy) { this.createdBy = createdBy; }
}
```

- [ ] **Step 2: Commit**

```bash
git add backend/src/main/java/com/genealogy/server/model/PublicationAccess.java
git commit -m "feat(auth): add PublicationAccess entity for resource-level permissions"
```

---

### Task 2: PublicationAccessRepository

**Files:**
- Create: `backend/src/main/java/com/genealogy/server/repository/PublicationAccessRepository.java`

- [ ] **Step 1: Create the repository**

```java
package com.genealogy.server.repository;

import com.genealogy.server.model.PublicationAccess;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface PublicationAccessRepository extends JpaRepository<PublicationAccess, Long> {
    Optional<PublicationAccess> findByPublicationIdAndUserId(Long publicationId, Long userId);
    List<PublicationAccess> findByUserId(Long userId);
    List<PublicationAccess> findByPublicationId(Long publicationId);
    void deleteByPublicationId(Long publicationId);
    long countByPublicationIdAndRole(Long publicationId, String role);
}
```

- [ ] **Step 2: Commit**

```bash
git add backend/src/main/java/com/genealogy/server/repository/PublicationAccessRepository.java
git commit -m "feat(auth): add PublicationAccessRepository"
```

---

### Task 3: AccessPermission Enum

**Files:**
- Create: `backend/src/main/java/com/genealogy/server/auth/AccessPermission.java`

- [ ] **Step 1: Create the enum**

```java
package com.genealogy.server.auth;

public enum AccessPermission {
    READ_FULL,
    READ_REDACTED,
    EDIT,
    DELETE,
    HISTORY_READ,
    EXPORT_FULL,
    EXPORT_REDACTED,
    MANAGE_ACCESS,
    MANAGE_SHARES
}
```

- [ ] **Step 2: Commit**

```bash
git add backend/src/main/java/com/genealogy/server/auth/AccessPermission.java
git commit -m "feat(auth): add AccessPermission enum with 9 permission actions"
```

---

### Task 4: AccessSubject Interface and Implementations

**Files:**
- Create: `backend/src/main/java/com/genealogy/server/auth/AccessSubject.java`
- Create: `backend/src/main/java/com/genealogy/server/auth/UserSubject.java`
- Create: `backend/src/main/java/com/genealogy/server/auth/ShareSubject.java`

- [ ] **Step 1: Create AccessSubject interface**

```java
package com.genealogy.server.auth;

public interface AccessSubject {
    enum SubjectType { USER, SHARE }

    SubjectType getType();
    Long getUserId();
    String getPlatformRole();
    Long getSharePublicationId();
}
```

- [ ] **Step 2: Create UserSubject**

```java
package com.genealogy.server.auth;

public class UserSubject implements AccessSubject {

    private final Long userId;
    private final String platformRole;
    private final String username;

    public UserSubject(Long userId, String platformRole, String username) {
        this.userId = userId;
        this.platformRole = platformRole;
        this.username = username;
    }

    @Override
    public SubjectType getType() { return SubjectType.USER; }

    @Override
    public Long getUserId() { return userId; }

    @Override
    public String getPlatformRole() { return platformRole; }

    @Override
    public Long getSharePublicationId() { return null; }

    public String getUsername() { return username; }
}
```

- [ ] **Step 3: Create ShareSubject (placeholder)**

```java
package com.genealogy.server.auth;

public class ShareSubject implements AccessSubject {

    private final Long shareLinkId;
    private final Long publicationId;

    public ShareSubject(Long shareLinkId, Long publicationId) {
        this.shareLinkId = shareLinkId;
        this.publicationId = publicationId;
    }

    @Override
    public SubjectType getType() { return SubjectType.SHARE; }

    @Override
    public Long getUserId() { return null; }

    @Override
    public String getPlatformRole() { return null; }

    @Override
    public Long getSharePublicationId() { return publicationId; }

    public Long getShareLinkId() { return shareLinkId; }
}
```

- [ ] **Step 4: Commit**

```bash
git add backend/src/main/java/com/genealogy/server/auth/
git commit -m "feat(auth): add AccessSubject interface with UserSubject and ShareSubject"
```

---

### Task 5: PublicationAuthorizationService

**Files:**
- Create: `backend/src/main/java/com/genealogy/server/service/PublicationAuthorizationService.java`

- [ ] **Step 1: Create the authorization service**

```java
package com.genealogy.server.service;

import com.genealogy.server.auth.AccessPermission;
import com.genealogy.server.auth.AccessSubject;
import com.genealogy.server.auth.ShareSubject;
import com.genealogy.server.auth.UserSubject;
import com.genealogy.server.exception.ForbiddenException;
import com.genealogy.server.exception.NotFoundException;
import com.genealogy.server.model.PublicationAccess;
import com.genealogy.server.repository.PublicationAccessRepository;
import org.springframework.stereotype.Service;

import java.util.EnumMap;
import java.util.Map;
import java.util.Optional;
import java.util.Set;

@Service
public class PublicationAuthorizationService {

    private static final Map<String, Set<AccessPermission>> ROLE_PERMISSIONS = new EnumMap<>(Map.of(
        "OWNER", Set.of(
            AccessPermission.READ_FULL,
            AccessPermission.READ_REDACTED,
            AccessPermission.EDIT,
            AccessPermission.DELETE,
            AccessPermission.HISTORY_READ,
            AccessPermission.EXPORT_FULL,
            AccessPermission.EXPORT_REDACTED,
            AccessPermission.MANAGE_ACCESS,
            AccessPermission.MANAGE_SHARES
        ),
        "EDITOR", Set.of(
            AccessPermission.READ_FULL,
            AccessPermission.READ_REDACTED,
            AccessPermission.EDIT,
            AccessPermission.HISTORY_READ,
            AccessPermission.EXPORT_FULL,
            AccessPermission.EXPORT_REDACTED
        ),
        "VIEWER", Set.of(
            AccessPermission.READ_FULL,
            AccessPermission.READ_REDACTED,
            AccessPermission.HISTORY_READ
        )
    ));

    private final PublicationAccessRepository accessRepository;

    public PublicationAuthorizationService(PublicationAccessRepository accessRepository) {
        this.accessRepository = accessRepository;
    }

    /**
     * Check if the subject has the given permission on the publication.
     * Returns false if no access record exists (IDOR protection).
     */
    public boolean can(AccessSubject subject, Long publicationId, AccessPermission permission) {
        if (subject instanceof ShareSubject share) {
            return canShare(share, publicationId, permission);
        }
        if (subject instanceof UserSubject user) {
            return canUser(user, publicationId, permission);
        }
        return false;
    }

    /**
     * Require the subject to have the given permission.
     * Throws NotFoundException if no access record exists (IDOR protection).
     * Throws ForbiddenException if access exists but permission is denied.
     */
    public void require(AccessSubject subject, Long publicationId, AccessPermission permission) {
        if (!can(subject, publicationId, permission)) {
            if (subject instanceof UserSubject user) {
                Optional<PublicationAccess> access = accessRepository.findByPublicationIdAndUserId(publicationId, user.getUserId());
                if (access.isEmpty()) {
                    throw new NotFoundException("族谱不存在");
                }
            }
            throw new ForbiddenException("权限不足，无法执行此操作");
        }
    }

    private boolean canUser(UserSubject user, Long publicationId, AccessPermission permission) {
        Optional<PublicationAccess> access = accessRepository.findByPublicationIdAndUserId(publicationId, user.getUserId());
        if (access.isEmpty()) {
            return false;
        }
        Set<AccessPermission> allowed = ROLE_PERMISSIONS.get(access.get().getRole());
        return allowed != null && allowed.contains(permission);
    }

    private boolean canShare(ShareSubject share, Long publicationId, AccessPermission permission) {
        if (!publicationId.equals(share.getSharePublicationId())) {
            return false;
        }
        return permission == AccessPermission.READ_REDACTED || permission == AccessPermission.EXPORT_REDACTED;
    }
}
```

- [ ] **Step 2: Commit**

```bash
git add backend/src/main/java/com/genealogy/server/service/PublicationAuthorizationService.java
git commit -m "feat(auth): add PublicationAuthorizationService with IDOR protection"
```

---

### Task 6: Unit Tests for PublicationAuthorizationService

**Files:**
- Create: `backend/src/test/java/com/genealogy/server/service/PublicationAuthorizationServiceTest.java`

- [ ] **Step 1: Write the tests**

```java
package com.genealogy.server.service;

import com.genealogy.server.auth.AccessPermission;
import com.genealogy.server.auth.ShareSubject;
import com.genealogy.server.auth.UserSubject;
import com.genealogy.server.exception.ForbiddenException;
import com.genealogy.server.exception.NotFoundException;
import com.genealogy.server.model.PublicationAccess;
import com.genealogy.server.repository.PublicationAccessRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class PublicationAuthorizationServiceTest {

    @Mock
    private PublicationAccessRepository accessRepository;

    private PublicationAuthorizationService service;

    private static final Long PUB_ID = 1L;
    private static final Long OWNER_USER_ID = 10L;
    private static final Long EDITOR_USER_ID = 20L;
    private static final Long VIEWER_USER_ID = 30L;
    private static final Long OUTSIDER_USER_ID = 40L;

    @BeforeEach
    void setUp() {
        service = new PublicationAuthorizationService(accessRepository);
    }

    private PublicationAccess makeAccess(Long pubId, Long userId, String role) {
        PublicationAccess a = new PublicationAccess();
        a.setPublicationId(pubId);
        a.setUserId(userId);
        a.setRole(role);
        return a;
    }

    // --- OWNER tests ---

    @Test
    void ownerCanReadFull() {
        when(accessRepository.findByPublicationIdAndUserId(PUB_ID, OWNER_USER_ID))
                .thenReturn(Optional.of(makeAccess(PUB_ID, OWNER_USER_ID, "OWNER")));
        assertThat(service.can(new UserSubject(OWNER_USER_ID, "USER", "owner"), PUB_ID, AccessPermission.READ_FULL)).isTrue();
    }

    @Test
    void ownerCanEdit() {
        when(accessRepository.findByPublicationIdAndUserId(PUB_ID, OWNER_USER_ID))
                .thenReturn(Optional.of(makeAccess(PUB_ID, OWNER_USER_ID, "OWNER")));
        assertThat(service.can(new UserSubject(OWNER_USER_ID, "USER", "owner"), PUB_ID, AccessPermission.EDIT)).isTrue();
    }

    @Test
    void ownerCanDelete() {
        when(accessRepository.findByPublicationIdAndUserId(PUB_ID, OWNER_USER_ID))
                .thenReturn(Optional.of(makeAccess(PUB_ID, OWNER_USER_ID, "OWNER")));
        assertThat(service.can(new UserSubject(OWNER_USER_ID, "USER", "owner"), PUB_ID, AccessPermission.DELETE)).isTrue();
    }

    @Test
    void ownerCanManageAccess() {
        when(accessRepository.findByPublicationIdAndUserId(PUB_ID, OWNER_USER_ID))
                .thenReturn(Optional.of(makeAccess(PUB_ID, OWNER_USER_ID, "OWNER")));
        assertThat(service.can(new UserSubject(OWNER_USER_ID, "USER", "owner"), PUB_ID, AccessPermission.MANAGE_ACCESS)).isTrue();
    }

    // --- EDITOR tests ---

    @Test
    void editorCanReadFull() {
        when(accessRepository.findByPublicationIdAndUserId(PUB_ID, EDITOR_USER_ID))
                .thenReturn(Optional.of(makeAccess(PUB_ID, EDITOR_USER_ID, "EDITOR")));
        assertThat(service.can(new UserSubject(EDITOR_USER_ID, "USER", "editor"), PUB_ID, AccessPermission.READ_FULL)).isTrue();
    }

    @Test
    void editorCanEdit() {
        when(accessRepository.findByPublicationIdAndUserId(PUB_ID, EDITOR_USER_ID))
                .thenReturn(Optional.of(makeAccess(PUB_ID, EDITOR_USER_ID, "EDITOR")));
        assertThat(service.can(new UserSubject(EDITOR_USER_ID, "USER", "editor"), PUB_ID, AccessPermission.EDIT)).isTrue();
    }

    @Test
    void editorCannotDelete() {
        when(accessRepository.findByPublicationIdAndUserId(PUB_ID, EDITOR_USER_ID))
                .thenReturn(Optional.of(makeAccess(PUB_ID, EDITOR_USER_ID, "EDITOR")));
        assertThat(service.can(new UserSubject(EDITOR_USER_ID, "USER", "editor"), PUB_ID, AccessPermission.DELETE)).isFalse();
    }

    @Test
    void editorCannotManageAccess() {
        when(accessRepository.findByPublicationIdAndUserId(PUB_ID, EDITOR_USER_ID))
                .thenReturn(Optional.of(makeAccess(PUB_ID, EDITOR_USER_ID, "EDITOR")));
        assertThat(service.can(new UserSubject(EDITOR_USER_ID, "USER", "editor"), PUB_ID, AccessPermission.MANAGE_ACCESS)).isFalse();
    }

    // --- VIEWER tests ---

    @Test
    void viewerCanReadFull() {
        when(accessRepository.findByPublicationIdAndUserId(PUB_ID, VIEWER_USER_ID))
                .thenReturn(Optional.of(makeAccess(PUB_ID, VIEWER_USER_ID, "VIEWER")));
        assertThat(service.can(new UserSubject(VIEWER_USER_ID, "USER", "viewer"), PUB_ID, AccessPermission.READ_FULL)).isTrue();
    }

    @Test
    void viewerCannotEdit() {
        when(accessRepository.findByPublicationIdAndUserId(PUB_ID, VIEWER_USER_ID))
                .thenReturn(Optional.of(makeAccess(PUB_ID, VIEWER_USER_ID, "VIEWER")));
        assertThat(service.can(new UserSubject(VIEWER_USER_ID, "USER", "viewer"), PUB_ID, AccessPermission.EDIT)).isFalse();
    }

    @Test
    void viewerCannotDelete() {
        when(accessRepository.findByPublicationIdAndUserId(PUB_ID, VIEWER_USER_ID))
                .thenReturn(Optional.of(makeAccess(PUB_ID, VIEWER_USER_ID, "VIEWER")));
        assertThat(service.can(new UserSubject(VIEWER_USER_ID, "USER", "viewer"), PUB_ID, AccessPermission.DELETE)).isFalse();
    }

    @Test
    void viewerCannotExport() {
        when(accessRepository.findByPublicationIdAndUserId(PUB_ID, VIEWER_USER_ID))
                .thenReturn(Optional.of(makeAccess(PUB_ID, VIEWER_USER_ID, "VIEWER")));
        assertThat(service.can(new UserSubject(VIEWER_USER_ID, "USER", "viewer"), PUB_ID, AccessPermission.EXPORT_FULL)).isFalse();
    }

    // --- Outsider (no access record) tests ---

    @Test
    void outsiderCannotRead() {
        when(accessRepository.findByPublicationIdAndUserId(PUB_ID, OUTSIDER_USER_ID))
                .thenReturn(Optional.empty());
        assertThat(service.can(new UserSubject(OUTSIDER_USER_ID, "USER", "outsider"), PUB_ID, AccessPermission.READ_FULL)).isFalse();
    }

    @Test
    void requireThrowsNotFoundForOutsider() {
        when(accessRepository.findByPublicationIdAndUserId(PUB_ID, OUTSIDER_USER_ID))
                .thenReturn(Optional.empty());
        UserSubject outsider = new UserSubject(OUTSIDER_USER_ID, "USER", "outsider");
        assertThatThrownBy(() -> service.require(outsider, PUB_ID, AccessPermission.READ_FULL))
                .isInstanceOf(NotFoundException.class)
                .hasMessage("族谱不存在");
    }

    @Test
    void requireThrowsForbiddenForInsufficientPermission() {
        when(accessRepository.findByPublicationIdAndUserId(PUB_ID, VIEWER_USER_ID))
                .thenReturn(Optional.of(makeAccess(PUB_ID, VIEWER_USER_ID, "VIEWER")));
        UserSubject viewer = new UserSubject(VIEWER_USER_ID, "USER", "viewer");
        assertThatThrownBy(() -> service.require(viewer, PUB_ID, AccessPermission.EDIT))
                .isInstanceOf(ForbiddenException.class)
                .hasMessage("权限不足，无法执行此操作");
    }

    // --- ShareSubject tests ---

    @Test
    void shareCanReadRedacted() {
        ShareSubject share = new ShareSubject(99L, PUB_ID);
        assertThat(service.can(share, PUB_ID, AccessPermission.READ_REDACTED)).isTrue();
    }

    @Test
    void shareCannotReadFull() {
        ShareSubject share = new ShareSubject(99L, PUB_ID);
        assertThat(service.can(share, PUB_ID, AccessPermission.READ_FULL)).isFalse();
    }

    @Test
    void shareCannotEdit() {
        ShareSubject share = new ShareSubject(99L, PUB_ID);
        assertThat(service.can(share, PUB_ID, AccessPermission.EDIT)).isFalse();
    }

    @Test
    void shareCannotAccessDifferentPublication() {
        ShareSubject share = new ShareSubject(99L, PUB_ID);
        assertThat(service.can(share, 999L, AccessPermission.READ_REDACTED)).isFalse();
    }
}
```

- [ ] **Step 2: Run tests to verify they pass**

Run: `cd backend && ./mvnw test -pl . -Dtest=PublicationAuthorizationServiceTest -q`
Expected: All 18 tests PASS

- [ ] **Step 3: Commit**

```bash
git add backend/src/test/java/com/genealogy/server/service/PublicationAuthorizationServiceTest.java
git commit -m "test(auth): add unit tests for PublicationAuthorizationService"
```

---

### Task 7: AccessControlMigrationRunner

**Files:**
- Create: `backend/src/main/java/com/genealogy/server/config/AccessControlMigrationRunner.java`

- [ ] **Step 1: Create the migration runner**

```java
package com.genealogy.server.config;

import com.genealogy.server.model.Publication;
import com.genealogy.server.model.PublicationAccess;
import com.genealogy.server.repository.PublicationAccessRepository;
import com.genealogy.server.repository.PublicationRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;

@Component
@Order(2)
public class AccessControlMigrationRunner implements CommandLineRunner {

    private static final Logger log = LoggerFactory.getLogger(AccessControlMigrationRunner.class);

    private final PublicationRepository publicationRepository;
    private final PublicationAccessRepository accessRepository;

    public AccessControlMigrationRunner(PublicationRepository publicationRepository,
                                         PublicationAccessRepository accessRepository) {
        this.publicationRepository = publicationRepository;
        this.accessRepository = accessRepository;
    }

    @Override
    public void run(String... args) {
        int migrated = 0;
        for (Publication pub : publicationRepository.findAll()) {
            if (accessRepository.findByPublicationIdAndUserId(pub.getId(), pub.getUserId()).isEmpty()) {
                PublicationAccess access = new PublicationAccess();
                access.setPublicationId(pub.getId());
                access.setUserId(pub.getUserId());
                access.setRole("OWNER");
                access.setCreatedBy(pub.getUserId());
                accessRepository.save(access);
                migrated++;
            }
        }
        if (migrated > 0) {
            log.info("权限回填完成：为 {} 份族谱创建了 OWNER 记录", migrated);
        } else {
            log.info("权限回填：所有族谱已有 OWNER 记录，无需回填");
        }
    }
}
```

- [ ] **Step 2: Commit**

```bash
git add backend/src/main/java/com/genealogy/server/config/AccessControlMigrationRunner.java
git commit -m "feat(auth): add AccessControlMigrationRunner to backfill OWNER records"
```

---

### Task 8: Modify PublicationService — Auto-create OWNER on Publication Creation

**Files:**
- Modify: `backend/src/main/java/com/genealogy/server/service/PublicationService.java:40-56` (constructor)
- Modify: `backend/src/main/java/com/genealogy/server/service/PublicationService.java:194-209` (createPublication)
- Modify: `backend/src/test/java/com/genealogy/server/service/PublicationServiceTest.java:39-66` (add mock + update setUp)

- [ ] **Step 1: Add PublicationAccessRepository dependency to constructor**

In `PublicationService.java`, add the import and field:

```java
import com.genealogy.server.model.PublicationAccess;
import com.genealogy.server.repository.PublicationAccessRepository;
```

Add field after `photoRepository`:

```java
private final PublicationAccessRepository publicationAccessRepository;
```

Update constructor to include the new dependency:

```java
public PublicationService(PublicationRepository publicationRepository, PersonRepository personRepository,
                          FamilyRepository familyRepository, FamilyMemberRepository familyMemberRepository,
                          PhotoRepository photoRepository, ObjectMapper objectMapper,
                          PublicationAccessRepository publicationAccessRepository) {
    this.publicationRepository = publicationRepository;
    this.personRepository = personRepository;
    this.familyRepository = familyRepository;
    this.familyMemberRepository = familyMemberRepository;
    this.photoRepository = photoRepository;
    this.objectMapper = objectMapper;
    this.publicationAccessRepository = publicationAccessRepository;
}
```

- [ ] **Step 2: Add OWNER record creation in createPublication()**

After `publication = publicationRepository.save(publication);` (line 205), add:

```java
PublicationAccess ownerAccess = new PublicationAccess();
ownerAccess.setPublicationId(publication.getId());
ownerAccess.setUserId(userId);
ownerAccess.setRole("OWNER");
ownerAccess.setCreatedBy(userId);
publicationAccessRepository.save(ownerAccess);
```

- [ ] **Step 3: Update existing PublicationServiceTest**

The existing test creates `PublicationService` with 6 constructor args. Add the mock and update `setUp()`.

Add field after `photoRepository` mock:

```java
@Mock
private PublicationAccessRepository publicationAccessRepository;
```

Update `setUp()` to pass the new dependency:

```java
@BeforeEach
void setUp() {
    publicationService = new PublicationService(
            publicationRepository,
            personRepository,
            familyRepository,
            familyMemberRepository,
            photoRepository,
            new ObjectMapper(),
            publicationAccessRepository
    );
}
```

- [ ] **Step 4: Run existing tests to verify they still pass**

Run: `cd backend && ./mvnw test -Dtest=PublicationServiceTest -q`
Expected: All 3 tests PASS

- [ ] **Step 5: Commit**

```bash
git add backend/src/main/java/com/genealogy/server/service/PublicationService.java
git commit -m "feat(auth): auto-create OWNER access record when creating publication"
```

---

### Task 9: Modify PublicationController — Add Authorization Checks

**Files:**
- Modify: `backend/src/main/java/com/genealogy/server/controller/PublicationController.java`

- [ ] **Step 1: Add imports and inject PublicationAuthorizationService**

Add imports:

```java
import com.genealogy.server.auth.AccessPermission;
import com.genealogy.server.auth.UserSubject;
import com.genealogy.server.service.PublicationAuthorizationService;
```

Add field after `objectMapper`:

```java
private final PublicationAuthorizationService authorizationService;
```

Update constructor:

```java
public PublicationController(PublicationService publicationService, UserRepository userRepository,
                             AuditLogRepository auditLogRepository, ObjectMapper objectMapper,
                             PublicationAuthorizationService authorizationService) {
    this.publicationService = publicationService;
    this.userRepository = userRepository;
    this.auditLogRepository = auditLogRepository;
    this.objectMapper = objectMapper;
    this.authorizationService = authorizationService;
}
```

- [ ] **Step 2: Add resolveSubject() helper method**

After `resolveUserId()`, add:

```java
private UserSubject resolveSubject(HttpServletRequest request) {
    String username = (String) request.getAttribute("currentUsername");
    User user = userRepository.findByUsername(username)
            .orElseThrow(() -> new RuntimeException("用户不存在"));
    return new UserSubject(user.getId(), user.getRole(), username);
}
```

- [ ] **Step 3: Add authorization to GET /{id}**

Change `get()` method — replace `resolveUserId(request);` with:

```java
UserSubject subject = resolveSubject(request);
authorizationService.require(subject, id, AccessPermission.READ_FULL);
```

- [ ] **Step 4: Add authorization to PUT /{id}**

Change `update()` method — replace `resolveUserId(request);` with:

```java
UserSubject subject = resolveSubject(request);
authorizationService.require(subject, id, AccessPermission.EDIT);
```

- [ ] **Step 5: Add authorization to PUT /{id}/metadata**

Change `updateMetadata()` method — replace `resolveUserId(request);` with:

```java
UserSubject subject = resolveSubject(request);
authorizationService.require(subject, id, AccessPermission.EDIT);
```

- [ ] **Step 6: Add authorization to PUT /{pubId}/people/{personId}**

Change `updatePerson()` method — replace `resolveUserId(request);` with:

```java
UserSubject subject = resolveSubject(request);
authorizationService.require(subject, pubId, AccessPermission.EDIT);
```

- [ ] **Step 7: Add authorization to DELETE /{id}**

Change `delete()` method — replace `resolveUserId(request);` with:

```java
UserSubject subject = resolveSubject(request);
authorizationService.require(subject, id, AccessPermission.DELETE);
```

- [ ] **Step 8: Add authorization to GET /{id}/history**

Change `history()` method — replace `resolveUserId(request);` with:

```java
UserSubject subject = resolveSubject(request);
authorizationService.require(subject, id, AccessPermission.HISTORY_READ);
```

- [ ] **Step 9: Commit**

```bash
git add backend/src/main/java/com/genealogy/server/controller/PublicationController.java
git commit -m "feat(auth): add authorization checks to all PublicationController endpoints"
```

---

### Task 10: Modify ExportController — Add Authorization Checks

**Files:**
- Modify: `backend/src/main/java/com/genealogy/server/controller/ExportController.java`

- [ ] **Step 1: Add imports and inject dependencies**

Add imports:

```java
import com.genealogy.server.auth.AccessPermission;
import com.genealogy.server.auth.UserSubject;
import com.genealogy.server.model.User;
import com.genealogy.server.repository.UserRepository;
import com.genealogy.server.service.PublicationAuthorizationService;
```

Add fields and update constructor:

```java
private final PdfExportService pdfExportService;
private final PublicationAuthorizationService authorizationService;
private final UserRepository userRepository;

public ExportController(PdfExportService pdfExportService,
                        PublicationAuthorizationService authorizationService,
                        UserRepository userRepository) {
    this.pdfExportService = pdfExportService;
    this.authorizationService = authorizationService;
    this.userRepository = userRepository;
}
```

- [ ] **Step 2: Add resolveSubject() helper**

```java
private UserSubject resolveSubject(HttpServletRequest request) {
    String username = (String) request.getAttribute("currentUsername");
    User user = userRepository.findByUsername(username)
            .orElseThrow(() -> new RuntimeException("用户不存在"));
    return new UserSubject(user.getId(), user.getRole(), username);
}
```

- [ ] **Step 3: Add authorization to exportPdf()**

At the start of `exportPdf()`, after the parameters, add:

```java
UserSubject subject = resolveSubject(servletRequest);
authorizationService.require(subject, Long.parseLong(id), AccessPermission.EXPORT_FULL);
```

- [ ] **Step 4: Add authorization to exportSinglePagePdf()**

At the start of `exportSinglePagePdf()`, after the parameters, add:

```java
UserSubject subject = resolveSubject(servletRequest);
authorizationService.require(subject, Long.parseLong(id), AccessPermission.EXPORT_FULL);
```

- [ ] **Step 5: Commit**

```bash
git add backend/src/main/java/com/genealogy/server/controller/ExportController.java
git commit -m "feat(auth): add authorization checks to ExportController endpoints"
```

---

### Task 11: Verify — Run All Tests and Build

- [ ] **Step 1: Run all backend tests**

Run: `cd backend && ./mvnw test -q`
Expected: All tests PASS (existing + new)

- [ ] **Step 2: Run frontend tests to confirm no regression**

Run: `cd frontend && npx vitest run`
Expected: All tests PASS

- [ ] **Step 3: Build backend to confirm compilation**

Run: `cd backend && ./mvnw package -DskipTests -q`
Expected: BUILD SUCCESS

- [ ] **Step 4: Final commit with all changes**

```bash
git add -A
git status
git commit -m "feat(auth): implement unified authorization abstraction (step 1)

- Add PublicationAccess entity and repository
- Add AccessPermission enum (9 permission actions)
- Add AccessSubject interface with UserSubject/ShareSubject
- Add PublicationAuthorizationService with IDOR protection
- Add AccessControlMigrationRunner for data backfill
- Auto-create OWNER record on publication creation
- Add authorization checks to PublicationController and ExportController
- Add unit tests for authorization service (18 tests)"
```
