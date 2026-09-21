---
title: '阶段一安全基线与族谱边界加固'
type: 'bugfix'
created: '2026-09-21'
status: 'done'
baseline_commit: 'e0e987c39d43a486270fdc2e41a49ad478e1f9a1'
review_loop_iteration: 0
context: ['{project-root}/AGENTS.md']
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** 当前系统存在高影响安全缺口：JWT 继续信任旧角色、密码变更不撤销 refresh token、部分族谱资源只按全局 ID 操作、GEDCOM 完整导出使用了读取权限，以及生产部署配置可能暴露默认凭据、明文 HTTP 或不可追溯镜像。

**Approach:** 在不重构整体认证和部署架构的前提下，补齐服务层族谱归属校验，使用数据库当前角色进行请求授权，收紧导出权限和会话生命周期，并修正可安全落地的生产部署基线。所有实际密钥只通过环境变量提供，不写入源码或模板。

## Boundaries & Constraints

**Always:** 族谱 A 的权限不得授权访问族谱 B 的人物、账号、审核记录或完整导出；Viewer 不得执行完整 GEDCOM 导出；密码变更/重置后已有 refresh token 必须失效；生产配置不得包含真实密钥、默认管理员密码或 `latest` 镜像；保留 `PROJECT_FACTS.md`，不修改或删除用户未跟踪文件。

**Ask First:** 若修复需要改变公开 API 错误码、引入新的 token 版本字段、改变外部 TLS 终止位置，先暂停并询问。

**Never:** 不把密钥硬编码进仓库；不删除现有脱敏规则；不通过放宽权限绕过测试；不修改与本阶段无关的前端性能、可访问性或低风险样式问题。

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|---|---|---|---|
| 降权旧 token | JWT 含 ADMIN，数据库角色已降级 | 管理员端点拒绝该请求 | 返回现有 401/403 语义 |
| 密码变更后刷新 | 已存在 refresh token，用户改密或管理员重置 | 旧 token 不能刷新 | 返回现有未授权错误 |
| 跨族谱账号操作 | A 的管理权限 + B 的 personDbId | 不修改 B 的账号 | 按现有资源错误语义拒绝 |
| 跨族谱审核操作 | A 的 URL + B 的 requestId | 不读取、不批准、不拒绝 B 的请求 | 按现有资源错误语义拒绝 |
| Viewer 导出 | Viewer 请求完整 GEDCOM | 导出服务不被调用 | 返回权限错误 |
| 生产部署模板 | 未提供实际 secret 或使用 latest | 配置检查/文档阻止不安全部署 | 不泄露 secret，不自动生成固定凭据 |

</frozen-after-approval>

## Code Map

- `backend/src/main/java/com/genealogy/server/security/JwtAuthenticationFilter.java` -- JWT 已解析角色的入口；改为以当前数据库用户角色建立权限。
- `backend/src/main/java/com/genealogy/server/service/UserService.java` -- 改密、重置密码和用户删除；复用 `RefreshTokenService.revokeAllForUser`。
- `backend/src/main/java/com/genealogy/server/service/RefreshTokenService.java` -- 已有批量撤销能力，保持 token hash 与 rotation 行为不变。
- `backend/src/main/java/com/genealogy/server/service/AccountDerivationService.java` -- 账号启停、删除、重置密码；所有目标人物查询必须限定 publication。
- `backend/src/main/java/com/genealogy/server/repository/PersonAccountRepository.java` -- 为账号资源提供族谱限定查询。
- `backend/src/main/java/com/genealogy/server/service/ReviewService.java` -- 审核详情与单条/批量操作；必须校验 request 与 publication 一致。
- `backend/src/main/java/com/genealogy/server/repository/ChangeRequestRepository.java` -- 增加按 requestId + publicationId 的读取边界。
- `backend/src/main/java/com/genealogy/server/gedcom/GedcomController.java` -- 完整导出改用 `EXPORT_FULL` 权限。
- `backend/src/main/java/com/genealogy/server/controller/AuthController.java` -- logout 同时支持 Cookie 与 Refresh Authorization header。
- `release/nginx.conf`, `release/frontend.Dockerfile`, `release/.env.example`, `release/docker-compose.deploy.yml` -- 修正安全头继承、前端运行用户和不可追溯镜像/生产模板风险；不在仓库写真实 secret。
- `backend/src/test/java/com/genealogy/server/security`, `.../service`, `.../controller`, `.../gedcom` -- 扩展降权 token、撤销、跨族谱和导出权限测试。

## Tasks & Acceptance

**Execution:**
- [x] `JwtAuthenticationFilter.java`, `UserService.java`, `AuthController.java` -- 使用当前角色、密码生命周期撤销 refresh token，并覆盖 header logout。
- [x] `AccountDerivationService.java`, `PersonAccountRepository.java` -- 对账号管理操作增加 publication 归属校验。
- [x] `ReviewService.java`, `ChangeRequestRepository.java` -- 对审核详情及修改操作增加 publication 归属校验。
- [x] `GedcomController.java` -- 完整 GEDCOM 导出改用 `EXPORT_FULL`。
- [x] `release/nginx.conf`, `release/frontend.Dockerfile`, `release/.env.example`, `release/docker-compose.deploy.yml` -- 修正可确认的部署安全问题并保持外部 TLS 终止边界清晰。
- [x] 相关测试文件 -- 为每个安全边界补充拒绝路径和成功路径测试。

**Acceptance Criteria:**
- Given 用户数据库角色已降级，when 使用降级前签发的 access token 请求管理员 API，then 请求不得获得旧管理员权限。
- Given 用户密码已修改或重置，when 使用变更前 refresh token 刷新，then 刷新失败。
- Given 用户仅拥有族谱 A 管理权限，when 传入族谱 B 的人物或审核 ID，then B 的数据不被读取或修改。
- Given 当前用户为 VIEWER，when 请求完整 GEDCOM 导出，then 返回权限错误且导出服务未执行。
- Given 生产 Compose 使用镜像部署，when 检查镜像变量，then 不要求使用 `latest`，且仓库不含真实 secret。
- Given 前端容器启动，when 检查运行用户，then 不以 root 运行 Nginx worker/application。

## Design Notes

服务层保留控制器已有的族谱级授权，并增加资源归属校验；不要用全局 ID 查询结果替代 URL 族谱边界。JWT 仍保持无状态，只是不再信任其中的 role claim，因此已签发 access token 的有效期仍由现有 TTL 决定；本阶段不引入 token version 数据库字段。

## Verification

**Commands:**
- `cd backend && ./mvnw -Dtest=JwtAuthenticationFilterCookieSessionTest,RefreshTokenServiceTest,UserServiceTest,AuthControllerLogoutSecurityTest,SecurityConfigUnauthorizedTest test` -- 相关后端安全测试通过。
- `cd backend && ./mvnw test` -- 后端测试通过。
- `cd frontend && npm run test` -- 前端回归测试通过。
- `docker compose --env-file release/.env.example -f release/docker-compose.deploy.yml config --quiet` -- Compose 配置可解析（不启动服务）。

**Manual checks (if no CLI):**
- 检查 `git diff` 不包含实际密钥，`PROJECT_FACTS.md` 保持未修改；检查生产镜像变量不是 `latest`，并确认 Nginx 安全头未因 location 级 `add_header` 丢失。

## Suggested Review Order

**认证与会话边界**

- 先确认请求权限始终来自数据库当前角色。
  [`JwtAuthenticationFilter.java:56`](../../backend/src/main/java/com/genealogy/server/security/JwtAuthenticationFilter.java#L56)

- 核对密码生命周期是否原子撤销全部 refresh token。
  [`UserService.java:172`](../../backend/src/main/java/com/genealogy/server/service/UserService.java#L172)

- 检查移动端 Refresh header 登出是否复用撤销逻辑。
  [`AuthController.java:148`](../../backend/src/main/java/com/genealogy/server/controller/AuthController.java#L148)

**族谱资源隔离**

- 从账号端点入口确认 URL 族谱 ID贯穿到服务层。
  [`AdminAccountController.java:73`](../../backend/src/main/java/com/genealogy/server/controller/AdminAccountController.java#L73)

- 检查账号查询是否强制绑定人物与族谱。
  [`AccountDerivationService.java:176`](../../backend/src/main/java/com/genealogy/server/service/AccountDerivationService.java#L176)

- 检查审核详情和审批不会跨族谱读取或修改。
  [`ReviewService.java:73`](../../backend/src/main/java/com/genealogy/server/service/ReviewService.java#L73)

- 确认完整 GEDCOM 导出使用专用导出权限。
  [`GedcomController.java:58`](../../backend/src/main/java/com/genealogy/server/gedcom/GedcomController.java#L58)

**部署基线与回归验证**

- 检查前端 Nginx 的非 root 用户、端口与健康检查一致。
  [`frontend.Dockerfile:23`](../../release/frontend.Dockerfile#L23)

- 检查静态响应安全头和 Compose 端口映射一致。
  [`nginx.conf:33`](../../release/nginx.conf#L33)

- 查看新增认证、边界与配置回归测试。
  [`JwtAuthenticationFilterCookieSessionTest.java:52`](../../backend/src/test/java/com/genealogy/server/security/JwtAuthenticationFilterCookieSessionTest.java#L52)
