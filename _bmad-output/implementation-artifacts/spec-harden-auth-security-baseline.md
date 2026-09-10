---
title: '收紧认证安全基线'
type: 'chore'
created: '2026-09-10'
status: 'done'
review_loop_iteration: 0
baseline_commit: '9eaf18c759344a1b9c68fcd14007607146945426'
context:
  - '{project-root}/AGENTS.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** 当前认证链路已有 refresh token 轮换、内存 access token、默认管理员生产阻断等安全意识，但密码复杂度校验没有接入主要 DTO，且 `JwtAuthenticationFilter` 会把 refresh cookie 当作普通接口认证凭证，扩大了长期凭证的可用范围。

**Approach:** 在不改变登录/刷新 API 形状和前端调用方式的前提下，把已有强密码约束接到账号创建、注册、重置等入口，并让 refresh token 只服务于 `/api/auth/refresh`，普通受保护接口必须依赖有效 access token 或测试显式 mock 的认证上下文。

## Boundaries & Constraints

**Always:** 保持 `/api/auth/login`、`/api/auth/refresh`、`/api/auth/logout` 响应结构兼容；保留 refresh token hash 存储与轮换行为；保留生产环境默认管理员密码阻断；新增/修改安全逻辑必须有后端测试覆盖。

**Ask First:** 如果需要改变前端认证流程、取消默认管理员迁移、修改数据库结构、引入新安全依赖、或强制所有现有弱密码用户立即失效，暂停确认。

**Never:** 不放宽现有 JWT 校验、CORS、Swagger 默认保护或 SameSite/HttpOnly refresh cookie；不把 access token 持久化回 localStorage；不借机重构无关用户、权限、出版物业务。

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| 强密码注册/创建/重置 | 密码满足 8-100 位且包含大小写字母和数字 | 请求 DTO 校验通过，业务逻辑按原流程执行 | N/A |
| 弱密码注册/创建/重置 | 密码过短或缺少大小写/数字 | Bean Validation 拦截并返回 400/错误响应，不进入保存密码逻辑 | 返回现有全局异常格式 |
| 普通接口仅带 refresh cookie | 请求 `/api/users/search` 等受保护接口，无 Bearer token，有有效 refresh cookie | 不建立认证上下文，返回 401 | refresh token 不被撤销；用户可继续调用 `/auth/refresh` 换 access token |
| 刷新接口带有效 refresh cookie | 请求 `/api/auth/refresh`，cookie 有效 | 仍能换发新 access token 并轮换 refresh cookie | 无效 cookie 保持现有 401 ApiResponse 行为 |

</frozen-after-approval>

## Code Map

- `backend/src/main/java/com/genealogy/server/security/ValidPassword.java`、`PasswordValidator.java` -- 已有强密码注解和校验器；当前未接入主要请求 DTO，规则为 8-100 位、含小写/大写/数字。
- `backend/src/main/java/com/genealogy/server/dto/RegisterRequest.java`、`CreateUserRequest.java`、`ResetPasswordRequest.java` -- 当前密码字段仅 `@Size(min = 4)`，应改用或叠加 `@ValidPassword`；`LoginRequest` 只校验输入形状，不应因新策略阻断旧密码登录尝试。
- `backend/src/main/java/com/genealogy/server/service/UserService.java` -- 账号创建、注册、管理员重置、用户改密最终编码保存密码；执行时检查是否有未经过 DTO 的服务级调用需要补充防线或测试。
- `backend/src/main/java/com/genealogy/server/security/JwtAuthenticationFilter.java` -- 当前 Bearer 缺失后调用 `authenticateWithRefreshCookie`，普通请求可被 refresh cookie 认证；目标是限制该行为或删除普通认证分支，同时不破坏 `/api/auth/refresh` 控制器读取 cookie。
- `backend/src/main/java/com/genealogy/server/controller/AuthController.java` -- `/refresh` 自行从 cookie 或 `Authorization: Refresh` 读取 refresh token 并轮换；应保持兼容。
- `backend/src/main/java/com/genealogy/server/config/SecurityConfig.java` -- 认证白名单与过滤器注册入口；普通受保护接口仍应由 Spring Security 返回 401。
- `backend/src/test/java/com/genealogy/server/security/JwtAuthenticationFilterCookieSessionTest.java` -- 当前断言 refresh cookie 可认证普通请求；需反转为安全收紧测试，并补充 `/api/auth/refresh` 不受影响的覆盖。
- `backend/src/test/java/com/genealogy/server/config/SecurityConfigUnauthorizedTest.java`、相关 controller/service 测试 -- 可复用 MockMvc 和 validation 断言，验证弱密码 DTO 输入被拒绝。

## Tasks & Acceptance

**Execution:**
- [x] `backend/src/main/java/com/genealogy/server/dto/RegisterRequest.java`、`CreateUserRequest.java`、`ResetPasswordRequest.java` -- 接入 `@ValidPassword` 并保留清晰中文错误信息 -- 让账号入口真正执行既有强密码策略。
- [x] `backend/src/main/java/com/genealogy/server/security/JwtAuthenticationFilter.java` -- 禁止 refresh cookie 为普通受保护请求建立认证上下文 -- 收窄长期凭证用途。
- [x] `backend/src/test/java/com/genealogy/server/security/JwtAuthenticationFilterCookieSessionTest.java` -- 更新测试为“refresh cookie 不认证普通接口/过滤器请求” -- 锁定新安全边界。
- [x] `backend/src/test/java/com/genealogy/server/controller/AuthControllerLogoutSecurityTest.java` 或新增认证控制器测试 -- 覆盖有效 refresh cookie 仍可刷新 access token -- 防止误伤会话续期。
- [x] `backend/src/test/java/com/genealogy/server/controller/*` 或 DTO validation 测试 -- 覆盖注册、创建用户、重置密码弱密码失败 -- 防止注解未生效或未来回退。

**Acceptance Criteria:**
- Given 用户提交弱密码注册、管理员创建用户或重置密码，when 请求进入后端校验，then 返回校验错误且不会保存弱密码。
- Given 只有有效 refresh cookie 没有 Bearer token，when 访问受保护 API，then 返回未授权且不会设置 `SecurityContext`。
- Given 有效 refresh cookie，when 调用 `/api/auth/refresh`，then 仍返回新 access token 并设置新的 refresh cookie。
- Given 当前后端代码，when 执行 `cd backend && ./mvnw test`，then 所有后端测试通过。

## Spec Change Log

## Verification

**Commands:**
- `cd backend && ./mvnw test` -- expected: 所有后端单元与集成测试通过。

## Suggested Review Order

**认证凭证边界**

- 入口只接受 Bearer，refresh cookie 不再参与普通认证。
  [`JwtAuthenticationFilter.java:37`](../../backend/src/main/java/com/genealogy/server/security/JwtAuthenticationFilter.java#L37)

- 普通接口带 refresh cookie 仍返回未授权。
  [`SecurityConfigUnauthorizedTest.java:45`](../../backend/src/test/java/com/genealogy/server/config/SecurityConfigUnauthorizedTest.java#L45)

- refresh 接口保留 cookie 轮换与新 access token。
  [`AuthControllerLogoutSecurityTest.java:79`](../../backend/src/test/java/com/genealogy/server/controller/AuthControllerLogoutSecurityTest.java#L79)

**密码强度入口**

- 统一强密码错误文案，覆盖长度与复杂度。
  [`ValidPassword.java:12`](../../backend/src/main/java/com/genealogy/server/security/ValidPassword.java#L12)

- 注册 DTO 从长度下限改为强密码约束。
  [`RegisterRequest.java:12`](../../backend/src/main/java/com/genealogy/server/dto/RegisterRequest.java#L12)

- 管理员创建用户 DTO 复用同一约束。
  [`CreateUserRequest.java:12`](../../backend/src/main/java/com/genealogy/server/dto/CreateUserRequest.java#L12)

- 管理员重置密码 DTO 复用同一约束。
  [`ResetPasswordRequest.java:7`](../../backend/src/main/java/com/genealogy/server/dto/ResetPasswordRequest.java#L7)

**测试护栏**

- DTO 级测试覆盖弱密码、超长密码与强密码。
  [`PasswordRequestValidationTest.java:29`](../../backend/src/test/java/com/genealogy/server/dto/PasswordRequestValidationTest.java#L29)

- 管理员接口测试验证弱密码不进入服务层。
  [`AdminControllerTest.java:136`](../../backend/src/test/java/com/genealogy/server/controller/AdminControllerTest.java#L136)

- 注册接口测试验证 Bean Validation 实际生效。
  [`AuthControllerLogoutSecurityTest.java:67`](../../backend/src/test/java/com/genealogy/server/controller/AuthControllerLogoutSecurityTest.java#L67)
