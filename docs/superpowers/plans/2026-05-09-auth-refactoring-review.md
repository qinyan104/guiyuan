# 认证层重构 Review & 收尾计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Review and merge the auth layer refactoring that extracts session management into dedicated modules with comprehensive test coverage.

**Architecture:** The refactoring splits the monolith `auth.ts` into focused modules: `authSession.ts` (session refresh/bootstrap), `authNavigation.ts` (post-login navigation), `tokenStore.ts` (localStorage persistence), and `admin.ts` (admin API). `auth.ts` becomes a thin facade. `http.ts` gains refresh deduplication and CSRF support. `App.vue` uses `bootstrapAuthSession()` for startup. Router gets synchronous component imports.

**Tech Stack:** Vue 3 + TypeScript + Vitest + axios

---

### Task 1: Final code review — verify no stale imports or dead code

**Files:**
- Modify: `frontend/src/api/auth.ts`
- Modify: `frontend/src/views/AdminLayout.vue`
- Check: all files importing from `../api/auth`

- [ ] **Step 1: Verify `auth.ts` exports only what still exists**

The diff removed `setAccessToken`, `_setUsername`, `_setRole` imports, admin API functions, and the `admin` interface block. Run the build to confirm nothing is broken:

```bash
cd frontend && npx vue-tsc --noEmit
```

Expected: no errors.

- [ ] **Step 2: Verify `authSession.ts` handles the edge case where `http` interceptor also calls refresh**

The `http.ts` response interceptor also triggers `/auth/refresh` on 401. The `bootstrapAuthSession()` in `authSession.ts` also calls refresh on startup. Verify there's no double-refresh issue:
- `authSession.ts` has `hasBootstrapped` flag and `bootstrapPromise` dedup
- `http.ts` has separate `refreshPromise` dedup
- These are independent and don't interfere (different call paths).

No code change needed, but confirm in review.

- [ ] **Step 3: Verify `AdminLayout.vue` logout no longer has a race condition**

The diff makes `handleLogout` async and awaits `logout()` before navigation. Confirm the logout flow:
- Check `logout()` in `auth.ts` calls `clearSession()` and `clearAccessToken()`
- Check AdminLayout sets `userDropdownOpen.value = false` after logout

- [ ] **Step 4: Run full build and test suite**

```bash
cd frontend && npm run build
cd frontend && npx vitest run
```

Expected: build succeeds, all 74 tests pass.

- [ ] **Step 5: Commit the auth refactoring**

```bash
cd /c/Users/HX/Desktop/族谱管理系统 && git add \
  frontend/src/App.vue \
  frontend/src/App.test.ts \
  frontend/src/api/admin.ts \
  frontend/src/api/auth.ts \
  frontend/src/api/authNavigation.ts \
  frontend/src/api/authNavigation.test.ts \
  frontend/src/api/authSession.ts \
  frontend/src/api/authSession.test.ts \
  frontend/src/api/http.ts \
  frontend/src/api/http.test.ts \
  frontend/src/api/tokenStore.ts \
  frontend/src/router/index.ts \
  frontend/src/views/AdminLayout.vue \
  frontend/src/views/AdminLayout.test.ts \
  frontend/src/views/AdminUsersView.vue \
  frontend/src/views/DashboardView.vue \
  frontend/src/views/LoginView.vue \
  frontend/src/views/SettingsView.vue
git commit -m "$(cat <<'EOF'
refactor: extract auth session management into dedicated modules

- Create authSession.ts: bootstrap/refresh/apply session lifecycle
- Create authNavigation.ts: post-login full-page navigation
- Create admin.ts: admin API extracted from auth.ts
- Refactor auth.ts: thin facade, delegates to authSession/tokenStore
- Refactor http.ts: refresh dedup, CSRF config, formatHttpError
- Refactor tokenStore.ts: clean get/set/clear per field
- Refactor App.vue: bootstrapAuthSession + loading spinner + route guard
- Refactor router: sync admin imports, bootstrap in beforeEach guard
- Refactor AdminLayout: async logout with await, fallback loading state
- Add tests: authSession(3), authNavigation(1), http(2), App(4), AdminLayout(2)

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```
