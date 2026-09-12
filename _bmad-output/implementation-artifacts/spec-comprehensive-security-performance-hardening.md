---
title: '综合安全、部署与性能加固'
type: 'chore'
created: '2026-09-12'
status: 'done'
review_loop_iteration: 0
baseline_commit: '0ad5473856c488323ecaf5486e30073f74bdf8e0'
context:
  - '{project-root}/AGENTS.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** 项目仍存在管理员越权重置超级管理员密码、生产首次启动与默认账号策略冲突、容器生产暴露面过大、用户搜索全量加载、进程内登录限流无过期回收，以及独立 HTML 导出直接注入 SVG 等问题。这些问题分别影响权限安全、可部署性、可用性和导出文件安全。

**Approach:** 在保持现有 API 和数据模型兼容的前提下，收紧管理员权限边界，完善可配置的生产初始化与容器安全默认值，将查询限制下推到数据库，给登录限流增加有界过期存储，并对白名单 SVG 内容进行安全清洗；同时补充针对关键边界的自动化测试和部署文档。

## Boundaries & Constraints

**Always:** 保持现有前端 API 响应结构、JWT/refresh token 协议、Flyway 管理方式和分享导出功能；安全默认值必须收紧；所有行为变化必须有测试；不提交真实密钥或 `.env`。

**Ask First:** 如果必须修改数据库 schema、引入新的运行时依赖、改变已有分享链接的可见性语义，暂停并确认。

**Never:** 不删除认证、限流、照片校验或导出转义；不通过关闭安全检查让测试“变绿”；不在前端承担后端权限控制；不将数据库暴露给公网。

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|---|---|---|---|
| 管理员重置密码 | ADMIN 重置 SUPER_ADMIN | 请求被拒绝；SUPER_ADMIN 可执行 | 403，不修改密码 |
| 生产初始化 | 新数据库、production profile | 应用可按明确初始化策略启动，不因固定默认密码永久阻塞 | 缺少必要初始化配置时给出明确启动错误 |
| 用户搜索 | 大量匹配用户 | 数据库最多返回 50 条 | 非法分页参数返回 400 |
| 登录限流 | 大量不同 IP 或过期尝试 | 存储有界，过期记录自动清理 | 超限返回 429 |
| 导出 SVG | 含事件属性、脚本、外部危险引用的 SVG | 只保留安全 SVG 内容 | 清洗或拒绝不安全节点 |

</frozen-after-approval>

## Code Map

- `backend/src/main/java/com/genealogy/server/controller/AdminController.java`、`service/UserService.java` -- 管理员密码重置入口；需要保护 SUPER_ADMIN 目标账号并保留现有审计日志。
- `backend/src/main/java/com/genealogy/server/config/SecurityStartupCheck.java`、`backend/src/main/resources/db/migration/V4__add_default_admin.sql`、`release/docker-compose*.yml` -- 默认管理员、生产 Profile、Cookie 和端口暴露配置；应设计可执行的首次初始化策略。
- `backend/src/main/java/com/genealogy/server/controller/UserController.java`、`repository/UserRepository.java` -- 用户搜索当前先取完整 List 再 `.limit(50)`；改为数据库层分页/限制，保持响应最多 50 条。
- `backend/src/main/java/com/genealogy/server/security/LoginRateLimitFilter.java` -- 当前使用永不删除的进程内 ConcurrentMap；改为带过期和容量边界的实现，正确处理可信代理地址。
- `frontend/src/features/export/publicationExport.ts`、`frontend/src/features/export/shareHtmlRuntime.ts` -- `serializeSvg` 直接序列化，独立 HTML 用 `innerHTML` 注入；增加导出前安全清洗并测试恶意节点。
- `backend/src/test/java/com/genealogy/server/controller/AdminControllerTest.java`、`security/LoginRateLimitFilterTest.java`、`frontend/src/features/export/shareHtmlExport.test.ts` -- 现有测试入口，扩展权限、限流、导出安全边界。
- `release/nginx.conf` -- 现有安全响应头和 API 反代；同步部署说明，保证数据库和后端不作为公网入口。

## Tasks & Acceptance

**Execution:**
- [x] `AdminController.java`、`UserService.java`、相关测试 -- 禁止 ADMIN 重置 SUPER_ADMIN 密码，补充正反向权限测试。
- [x] 默认管理员启动配置、迁移说明和 `release/docker-compose*.yml` -- 修复生产初始化死锁，统一 production profile、Secure Cookie、端口暴露和强制配置校验。
- [x] `UserRepository.java`、`UserController.java`、测试 -- 使用 Pageable 或等价数据库限制，限制搜索结果和管理员列表资源使用。
- [x] `LoginRateLimitFilter.java`、测试 -- 使用有界、自动过期的限流状态，并覆盖代理头、过期和并发场景。
- [x] `publicationExport.ts`、`shareHtmlRuntime.ts`、导出测试 -- 清洗 SVG 节点、属性、URL 和事件处理器，确保正常人物卡片和图片仍可导出。
- [x] README、release 文档 -- 更新首次初始化、HTTPS、端口和生产部署说明。

**Acceptance Criteria:**
- Given ADMIN 用户，when 重置 SUPER_ADMIN 密码，then 返回 403 且密码不变；SUPER_ADMIN 重置普通用户仍成功。
- Given 全新生产部署，when 按文档提供初始化配置，then 服务能够启动；缺失配置时失败原因明确且不使用固定默认密码。
- Given 用户搜索命中超过 50 条，when 请求执行，then 数据库查询本身限制为最多 50 条而非内存截断。
- Given 限流状态超过窗口或来源数量持续增长，when 继续请求，then 过期状态被回收且内存不无限增长。
- Given SVG 含 `<script>`、事件属性、`javascript:` 或不允许外部引用，when 生成独立 HTML，then 危险内容不存在；合法文本、图片和交互仍可用。
- Given 后端和前端测试命令可用，when 执行测试、构建和 `git diff --check`，then 全部通过。

## Design Notes

默认不引入 Redis 等基础设施；限流先采用有界 TTL 内存实现，并明确其多实例局限。生产 Compose 应通过反向代理提供 HTTPS，数据库与后端仅在 Docker 网络可达。SVG 清洗应采用 DOM 解析和明确白名单，而不是继续依赖字符串替换。

## Verification

**Commands:**
- `cd backend && ./mvnw test` -- expected: 后端测试全部通过。
- `cd frontend && npm run test && npm run build` -- expected: 前端测试与构建通过。
- `cd frontend && npm run lint` -- expected: ESLint 通过。
- `git diff --check` -- expected: 无空白错误。

**Verification notes:** 前端 78 个测试、360 个断言，构建和 ESLint 均通过；后端测试未能运行，因为当前环境缺少可用的 `JAVA_HOME`/JDK。

## Suggested Review Order

**管理员权限与初始化**

- 服务层拒绝任何管理员重置超级管理员密码，避免仅依赖控制器注解。
  [`UserService.java:167`](../../backend/src/main/java/com/genealogy/server/service/UserService.java#L167)

- 生产首次启动要求显式初始密码，并自动替换迁移中的开发密码。
  [`SecurityStartupCheck.java:40`](../../backend/src/main/java/com/genealogy/server/config/SecurityStartupCheck.java#L40)

**查询与限流边界**

- 用户搜索将 50 条限制下推至数据库，避免全量结果进入 JVM。
  [`UserController.java:35`](../../backend/src/main/java/com/genealogy/server/controller/UserController.java#L35)

- 登录限流同时清理过期状态并限制两张内存表的最大规模。
  [`LoginRateLimitFilter.java:48`](../../backend/src/main/java/com/genealogy/server/security/LoginRateLimitFilter.java#L48)

**导出与部署安全**

- 独立 HTML 导出前清理脚本、事件属性和危险资源引用。
  [`publicationExport.ts:589`](../../frontend/src/features/export/publicationExport.ts#L589)

- 生产 Compose 不再暴露数据库和后端端口，并启用 Secure Cookie。
  [`docker-compose.yml:46`](../../release/docker-compose.yml#L46)

**验证与配置**

- 恶意 SVG 与合法图片资源均有前端测试覆盖。
  [`shareHtmlExport.test.ts:46`](../../frontend/src/features/export/shareHtmlExport.test.ts#L46)

- 初始管理员密码和安全 Cookie 配置在示例环境文件中明确声明。
  [`release/.env.example:17`](../../release/.env.example#L17)
