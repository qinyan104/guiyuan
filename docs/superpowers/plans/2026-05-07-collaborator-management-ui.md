# Collaborator Management UI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the frontend UI and backend endpoints to allow publication owners to invite users and manage collaborator roles (`EDITOR`, `VIEWER`).

**Architecture:** 
- Add backend controllers for user search (`UserController`) and access management (`PublicationAccessController`).
- Create a frontend API client `accessManage.ts`.
- Build a ElevenLabs-styled `CollaboratorManager.vue` modal component.
- Integrate it into `WorkbenchHeader.vue` for `OWNER` role only.

**Tech Stack:** Java 17, Spring Boot, Vue 3, TypeScript

---

## File Structure

| # | File | Action | Responsibility |
|---|------|--------|---------------|
| 1 | `backend/src/main/java/com/genealogy/server/repository/UserRepository.java` | Modify | Add search by username or nickname |
| 2 | `backend/src/main/java/com/genealogy/server/controller/UserController.java` | Create | Expose user search endpoint |
| 3 | `backend/src/main/java/com/genealogy/server/controller/PublicationAccessController.java` | Create | Expose access CRUD endpoints |
| 4 | `backend/src/test/java/com/genealogy/server/controller/PublicationAccessControllerTest.java` | Create | Test access endpoints |
| 5 | `frontend/src/api/accessManage.ts` | Create | Frontend HTTP client |
| 6 | `frontend/src/components/CollaboratorManager.vue` | Create | The UI Modal for managing access |
| 7 | `frontend/src/components/WorkbenchHeader.vue` | Modify | Add trigger button and modal inclusion |

---

### Task 1: UserRepository & UserController

**Files:**
- Modify: `backend/src/main/java/com/genealogy/server/repository/UserRepository.java`
- Create: `backend/src/main/java/com/genealogy/server/controller/UserController.java`

- [ ] **Step 1: Add search method to UserRepository**

Update `UserRepository.java`:

```java
// backend/src/main/java/com/genealogy/server/repository/UserRepository.java
package com.genealogy.server.repository;

import com.genealogy.server.model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface UserRepository extends JpaRepository<User, Long> {
    Optional<User> findByUsername(String username);
    boolean existsByUsername(String username);
    List<User> findByUsernameContainingIgnoreCaseOrNicknameContainingIgnoreCase(String username, String nickname);
}
```

- [ ] **Step 2: Create UserController**

```java
// backend/src/main/java/com/genealogy/server/controller/UserController.java
package com.genealogy.server.controller;

import com.genealogy.server.model.User;
import com.genealogy.server.repository.UserRepository;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/users")
public class UserController {

    private final UserRepository userRepository;

    public UserController(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    @GetMapping("/search")
    public List<Map<String, Object>> searchUsers(@RequestParam String q) {
        if (q == null || q.trim().isEmpty()) {
            return List.of();
        }
        return userRepository.findByUsernameContainingIgnoreCaseOrNicknameContainingIgnoreCase(q, q)
                .stream()
                .map(user -> Map.of(
                        "id", (Object) user.getId(),
                        "username", user.getUsername(),
                        "nickname", user.getNickname() != null ? user.getNickname() : user.getUsername()
                ))
                .collect(Collectors.toList());
    }
}
```

- [ ] **Step 3: Commit**

```bash
git add backend/src/main/java/com/genealogy/server/repository/UserRepository.java backend/src/main/java/com/genealogy/server/controller/UserController.java
git commit -m "feat(auth): add user search endpoint for collaborator invites"
```

---

### Task 2: PublicationAccessController

**Files:**
- Create: `backend/src/main/java/com/genealogy/server/controller/PublicationAccessController.java`

- [ ] **Step 1: Create the controller**

```java
// backend/src/main/java/com/genealogy/server/controller/PublicationAccessController.java
package com.genealogy.server.controller;

import com.genealogy.server.auth.AccessPermission;
import com.genealogy.server.auth.AccessSubject;
import com.genealogy.server.auth.UserSubject;
import com.genealogy.server.exception.ForbiddenException;
import com.genealogy.server.exception.NotFoundException;
import com.genealogy.server.model.PublicationAccess;
import com.genealogy.server.model.User;
import com.genealogy.server.repository.PublicationAccessRepository;
import com.genealogy.server.repository.UserRepository;
import com.genealogy.server.service.PublicationAuthorizationService;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/publications/{id}/access")
public class PublicationAccessController {

    private final PublicationAuthorizationService authorizationService;
    private final PublicationAccessRepository accessRepository;
    private final UserRepository userRepository;

    public PublicationAccessController(PublicationAuthorizationService authorizationService,
                                       PublicationAccessRepository accessRepository,
                                       UserRepository userRepository) {
        this.authorizationService = authorizationService;
        this.accessRepository = accessRepository;
        this.userRepository = userRepository;
    }

    private UserSubject getSubject(HttpServletRequest request) {
        User user = (User) request.getAttribute("user");
        if (user == null) throw new ForbiddenException("未登录");
        return new UserSubject(user.getId(), user.getRole(), user.getUsername());
    }

    @GetMapping
    public List<Map<String, Object>> listAccess(@PathVariable Long id, HttpServletRequest request) {
        authorizationService.require(getSubject(request), id, AccessPermission.MANAGE_ACCESS);
        return accessRepository.findByPublicationId(id).stream().map(access -> {
            User user = userRepository.findById(access.getUserId()).orElse(null);
            return Map.of(
                    "id", (Object) access.getId(),
                    "userId", access.getUserId(),
                    "role", access.getRole(),
                    "createdAt", access.getCreatedAt() != null ? access.getCreatedAt().toString() : "",
                    "username", user != null ? user.getUsername() : "未知",
                    "nickname", user != null && user.getNickname() != null ? user.getNickname() : (user != null ? user.getUsername() : "未知")
            );
        }).collect(Collectors.toList());
    }

    @PostMapping
    public Map<String, Object> addAccess(@PathVariable Long id, @RequestBody Map<String, Object> body, HttpServletRequest request) {
        authorizationService.require(getSubject(request), id, AccessPermission.MANAGE_ACCESS);
        
        Long targetUserId = Long.valueOf(body.get("userId").toString());
        String role = body.get("role").toString();
        
        if ("OWNER".equals(role)) {
            throw new ForbiddenException("不能添加OWNER角色");
        }
        
        if (accessRepository.findByPublicationIdAndUserId(id, targetUserId).isPresent()) {
            throw new ForbiddenException("该用户已在协作者列表中");
        }

        PublicationAccess access = new PublicationAccess();
        access.setPublicationId(id);
        access.setUserId(targetUserId);
        access.setRole(role);
        access.setCreatedBy(getSubject(request).getUserId());
        access = accessRepository.save(access);

        return Map.of("success", true, "id", access.getId());
    }

    @PutMapping("/{userId}")
    public Map<String, Object> updateAccess(@PathVariable Long id, @PathVariable Long userId, @RequestBody Map<String, String> body, HttpServletRequest request) {
        authorizationService.require(getSubject(request), id, AccessPermission.MANAGE_ACCESS);
        
        String newRole = body.get("role");
        if ("OWNER".equals(newRole)) {
            throw new ForbiddenException("不能更改为OWNER角色");
        }

        PublicationAccess access = accessRepository.findByPublicationIdAndUserId(id, userId)
                .orElseThrow(() -> new NotFoundException("找不到该用户的权限记录"));

        if ("OWNER".equals(access.getRole())) {
            throw new ForbiddenException("不能修改OWNER的权限");
        }

        access.setRole(newRole);
        accessRepository.save(access);

        return Map.of("success", true);
    }

    @DeleteMapping("/{userId}")
    public Map<String, Object> removeAccess(@PathVariable Long id, @PathVariable Long userId, HttpServletRequest request) {
        authorizationService.require(getSubject(request), id, AccessPermission.MANAGE_ACCESS);
        
        PublicationAccess access = accessRepository.findByPublicationIdAndUserId(id, userId)
                .orElseThrow(() -> new NotFoundException("找不到该用户的权限记录"));

        if ("OWNER".equals(access.getRole())) {
            throw new ForbiddenException("不能移除OWNER");
        }

        accessRepository.delete(access);

        return Map.of("success", true);
    }
}
```

- [ ] **Step 2: Commit**

```bash
git add backend/src/main/java/com/genealogy/server/controller/PublicationAccessController.java
git commit -m "feat(auth): add endpoints for managing publication access"
```

---

### Task 3: Frontend API Client

**Files:**
- Create: `frontend/src/api/accessManage.ts`

- [ ] **Step 1: Create the API client**

```typescript
// frontend/src/api/accessManage.ts
import { request } from './base'

export interface UserSearchResult {
  id: number
  username: string
  nickname: string
}

export interface AccessRecord {
  id: number
  userId: number
  username: string
  nickname: string
  role: 'OWNER' | 'EDITOR' | 'VIEWER'
  createdAt: string
}

export async function searchUsers(query: string): Promise<UserSearchResult[]> {
  return request<UserSearchResult[]>(`/users/search?q=${encodeURIComponent(query)}`)
}

export async function listAccessRecords(publicationId: number): Promise<AccessRecord[]> {
  return request<AccessRecord[]>(`/publications/${publicationId}/access`)
}

export async function addAccessRecord(publicationId: number, userId: number, role: string): Promise<{ id: number }> {
  return request<{ id: number }>(`/publications/${publicationId}/access`, {
    method: 'POST',
    body: JSON.stringify({ userId, role })
  })
}

export async function updateAccessRole(publicationId: number, userId: number, role: string): Promise<void> {
  return request<void>(`/publications/${publicationId}/access/${userId}`, {
    method: 'PUT',
    body: JSON.stringify({ role })
  })
}

export async function removeAccessRecord(publicationId: number, userId: number): Promise<void> {
  return request<void>(`/publications/${publicationId}/access/${userId}`, {
    method: 'DELETE'
  })
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/api/accessManage.ts
git commit -m "feat(auth): add frontend api client for access management"
```

---

### Task 4: CollaboratorManager UI Component

**Files:**
- Create: `frontend/src/components/CollaboratorManager.vue`

- [ ] **Step 1: Create the component**

```vue
<!-- frontend/src/components/CollaboratorManager.vue -->
<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import {
  searchUsers,
  listAccessRecords,
  addAccessRecord,
  updateAccessRole,
  removeAccessRecord,
  type UserSearchResult,
  type AccessRecord
} from '../api/accessManage'

const props = defineProps<{
  publicationId: number
}>()

const records = ref<AccessRecord[]>([])
const loading = ref(true)
const error = ref<string | null>(null)

const searchQuery = ref('')
const searchResults = ref<UserSearchResult[]>([])
const selectedUserId = ref<number | null>(null)
const newRole = ref<'EDITOR' | 'VIEWER'>('EDITOR')
const searching = ref(false)
const adding = ref(false)

async function load() {
  loading.value = true
  error.value = null
  try {
    records.value = await listAccessRecords(props.publicationId)
  } catch (err: any) {
    error.value = err.message || '加载协作者失败'
  } finally {
    loading.value = false
  }
}

let searchTimeout: any = null
function handleSearchInput() {
  if (searchTimeout) clearTimeout(searchTimeout)
  if (!searchQuery.value.trim()) {
    searchResults.value = []
    selectedUserId.value = null
    return
  }
  searchTimeout = setTimeout(async () => {
    searching.value = true
    try {
      const results = await searchUsers(searchQuery.value)
      // Filter out existing users
      const existingUserIds = new Set(records.value.map(r => r.userId))
      searchResults.value = results.filter(u => !existingUserIds.has(u.id))
      if (searchResults.value.length > 0 && !searchResults.value.find(u => u.id === selectedUserId.value)) {
        selectedUserId.value = searchResults.value[0].id
      }
    } catch (err) {
      console.error('Search failed', err)
    } finally {
      searching.value = false
    }
  }, 300)
}

function selectUser(user: UserSearchResult) {
  selectedUserId.value = user.id
  searchQuery.value = `${user.nickname} (@${user.username})`
  searchResults.value = []
}

async function handleAdd() {
  if (!selectedUserId.value) return
  adding.value = true
  error.value = null
  try {
    await addAccessRecord(props.publicationId, selectedUserId.value, newRole.value)
    searchQuery.value = ''
    selectedUserId.value = null
    searchResults.value = []
    await load()
  } catch (err: any) {
    error.value = err.message || '添加失败'
  } finally {
    adding.value = false
  }
}

async function handleRoleChange(userId: number, role: 'EDITOR' | 'VIEWER') {
  error.value = null
  try {
    await updateAccessRole(props.publicationId, userId, role)
    await load()
  } catch (err: any) {
    error.value = err.message || '修改失败'
    await load() // reset
  }
}

async function handleRemove(userId: number) {
  if (!confirm('确定要移除该协作者吗？')) return
  error.value = null
  try {
    await removeAccessRecord(props.publicationId, userId)
    await load()
  } catch (err: any) {
    error.value = err.message || '移除失败'
  }
}

const roleLabels: Record<string, string> = {
  OWNER: '所有者',
  EDITOR: '编辑者',
  VIEWER: '浏览者'
}

onMounted(load)
</script>

<template>
  <div class="collab-manager">
    <div v-if="error" class="error-strip">{{ error }}</div>

    <div class="invite-section">
      <div class="search-box">
        <input 
          type="text" 
          class="form-input" 
          placeholder="搜索用户名或昵称邀请..." 
          v-model="searchQuery" 
          @input="handleSearchInput" 
        />
        <div v-if="searchResults.length > 0" class="search-dropdown">
          <div 
            v-for="u in searchResults" 
            :key="u.id" 
            class="search-item" 
            @click="selectUser(u)"
          >
            <div class="avatar">{{ u.nickname.charAt(0).toUpperCase() }}</div>
            <div class="user-details">
              <div class="name">{{ u.nickname }}</div>
              <div class="username">@{{ u.username }}</div>
            </div>
          </div>
        </div>
      </div>
      <div class="invite-actions">
        <select v-model="newRole" class="form-select">
          <option value="EDITOR">编辑者 (可修改)</option>
          <option value="VIEWER">浏览者 (仅查看)</option>
        </select>
        <button class="btn btn--primary pill" @click="handleAdd" :disabled="!selectedUserId || adding">
          添加
        </button>
      </div>
    </div>

    <div class="list-section">
      <div v-if="loading" class="loading-state">加载中...</div>
      <div v-else class="user-list">
        <div v-for="record in records" :key="record.id" class="user-row">
          <div class="user-info">
            <div class="avatar">{{ record.nickname.charAt(0).toUpperCase() }}</div>
            <div class="user-details">
              <div class="name">{{ record.nickname }}</div>
              <div class="username">@{{ record.username }}</div>
            </div>
          </div>
          <div class="user-actions">
            <template v-if="record.role === 'OWNER'">
              <span class="role-badge owner">所有者</span>
            </template>
            <template v-else>
              <select 
                class="form-select inline" 
                :value="record.role" 
                @change="e => handleRoleChange(record.userId, (e.target as HTMLSelectElement).value as any)"
              >
                <option value="EDITOR">编辑者</option>
                <option value="VIEWER">浏览者</option>
              </select>
              <button class="btn btn--ghost icon-btn" @click="handleRemove(record.userId)" title="移除">
                &times;
              </button>
            </template>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.collab-manager {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.error-strip {
  padding: 8px 12px;
  background: #fef2f2;
  color: #dc2626;
  border-radius: 4px;
  font-family: var(--font-inter);
  font-size: 14px;
}

.invite-section {
  display: flex;
  gap: 12px;
  align-items: flex-start;
  position: relative;
}

.search-box {
  flex: 1;
  position: relative;
}

.form-input, .form-select {
  background: var(--surface-card-white, #ffffff);
  border: 1px solid var(--color-chalk, #e5e5e5);
  border-radius: 0;
  padding: 8px 12px;
  font-family: var(--font-inter);
  font-size: 14px;
  color: var(--color-obsidian, #000000);
  height: 36px;
  box-sizing: border-box;
}

.form-input {
  width: 100%;
}

.invite-actions {
  display: flex;
  gap: 8px;
}

.search-dropdown {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  background: #ffffff;
  border: 1px solid #e5e5e5;
  box-shadow: 0 4px 12px rgba(0,0,0,0.1);
  z-index: 100;
  max-height: 200px;
  overflow-y: auto;
}

.search-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 12px;
  cursor: pointer;
}

.search-item:hover {
  background: #f5f3f1;
}

.avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: #e5e5e5;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 500;
  color: #000;
  font-size: 14px;
  flex-shrink: 0;
}

.user-details {
  display: flex;
  flex-direction: column;
}

.name {
  font-family: var(--font-inter);
  font-weight: 500;
  font-size: 14px;
  color: #000;
}

.username {
  font-family: var(--font-inter);
  font-size: 12px;
  color: #777169;
}

.btn.pill {
  border-radius: 9999px;
  padding: 0 16px;
  height: 36px;
  background: #000;
  color: #fff;
  border: none;
  font-weight: 500;
  font-family: var(--font-inter);
  cursor: pointer;
}

.btn.pill:disabled {
  background: #e5e5e5;
  color: #a59f97;
  cursor: not-allowed;
}

.list-section {
  border-top: 1px solid #e5e5e5;
  padding-top: 24px;
}

.user-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.user-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.user-info {
  display: flex;
  align-items: center;
  gap: 12px;
}

.user-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

.role-badge {
  font-family: var(--font-inter);
  font-size: 12px;
  color: #777169;
  padding: 4px 8px;
  background: #f5f3f1;
  border-radius: 12px;
}

.role-badge.owner {
  color: #0447ff;
  background: rgba(4, 71, 255, 0.1);
}

.form-select.inline {
  border: none;
  background: transparent;
  padding: 4px 24px 4px 8px;
  height: auto;
  cursor: pointer;
}

.icon-btn {
  background: transparent;
  border: none;
  font-size: 20px;
  color: #a59f97;
  cursor: pointer;
  padding: 0 4px;
}

.icon-btn:hover {
  color: #dc2626;
}
</style>
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/components/CollaboratorManager.vue
git commit -m "feat(auth): add CollaboratorManager modal component"
```

---

### Task 5: Integration in WorkbenchHeader

**Files:**
- Modify: `frontend/src/components/WorkbenchHeader.vue`

- [ ] **Step 1: Add modal trigger and component**

Update `frontend/src/components/WorkbenchHeader.vue`. Add imports and state:

```html
<!-- Add inside <script setup> after other imports -->
import CollaboratorManager from './CollaboratorManager.vue'

// Add state
const showCollabDialog = ref(false)

// Extract isOwner from context
const isOwner = computed(() => context?.currentAccessRole?.value === 'OWNER')
```

Modify the template to add the button in the `.topbar__action-strip` (before the Export dropdown):

```html
<!-- Inside .topbar__action-strip -->
        <div class="dropdown" v-if="isOwner">
          <button class="btn btn--secondary" type="button" @click="showCollabDialog = true">协作者</button>
        </div>
```

Add the Modal markup at the end of the template (before `</header>` or outside):

```html
    <!-- Add at the end of the template, inside the <header> or adjacent root -->
    <Teleport defer to="body">
      <transition name="sheet-slide">
        <div v-if="showCollabDialog" class="glass-modal-overlay" @click.self="showCollabDialog = false">
          <div class="glass-sheet" style="max-width: 560px;">
            <header class="sheet-header">
              <h2 class="sheet-title" style="font-family: var(--font-waldenburg); font-weight: 300;">管理协作者</h2>
              <button class="sheet-close" @click="showCollabDialog = false">&times;</button>
            </header>
            <div class="sheet-body">
              <CollaboratorManager :publicationId="Number(route.params.id)" />
            </div>
          </div>
        </div>
      </transition>
    </Teleport>
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/components/WorkbenchHeader.vue
git commit -m "feat(auth): integrate collaborator manager into workbench header"
```
