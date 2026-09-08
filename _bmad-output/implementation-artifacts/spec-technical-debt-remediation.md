---
title: '收敛项目技术债与现存问题'
type: 'chore'
created: '2026-09-08'
status: 'done'
review_loop_iteration: 0
baseline_commit: '47da9659faea0482c2999d92a07e24312e7e589c'
context:
  - '{project-root}/AGENTS.md'

---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** 当前项目虽然前后端测试和构建均能通过，但前端依赖仍有 1 个 critical、5 个 high 风险，后端存在永久跳过测试，配置中有无效 CORS 代码，生产环境默认公开 Swagger，Biome 在 Vue 单文件组件上产生大量无法直接行动的警告，持续掩盖真实问题。

**Approach:** 用现有工具和测试基础做一次小范围治理：升级锁定依赖，恢复可在 H2 运行的测试，删除死配置，增加 Swagger 的显式开关并保持本地开发可用，调整 Biome 的检查范围或规则以消除误报，同时保留 ESLint、类型检查、单元测试和构建作为有效门禁。

## Boundaries & Constraints

**Always:** 保持现有 API、认证流程、CORS 环境变量、Flyway/`ddl-auto: validate` 生产数据库策略和前端功能不变；所有安全相关改动必须默认收紧；依赖升级后必须重新执行测试、构建和审计。

**Ask First:** 若依赖升级需要改变主版本 API、Swagger 在生产环境必须公开、或 H2 无法覆盖真实仓储行为而必须引入 MySQL 容器测试，暂停并确认。

**Never:** 不进行超大 Vue 文件的整体重构；不删除导出 HTML 的安全转义；不把 `npm audit` 通过简单忽略或降低等级来“修绿”；不提交 `.env`、构建产物或本地数据库。

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|---|---|---|---|
| 依赖安装 | 全新 checkout，执行 `npm ci` | 使用锁文件安装成功，`npm audit --audit-level=moderate` 不再报告已知可修复高危项 | 安装或锁文件不一致时构建失败 |
| 后端测试 | 无 MySQL，仅使用仓库测试配置 | 两个原先跳过的测试可执行；仓储测试使用 H2 完成验证 | 需要真实 MySQL 的测试必须明确标记为集成测试，不得静默跳过 |
| Swagger | 未设置公开文档开关 | Swagger UI 与 OpenAPI 端点需要认证或返回未授权 | 本地开发通过配置显式开启后可访问 |
| Biome | Vue SFC 含仅在模板中使用的 script 标识符 | 检查不再因模板误报阻塞或制造大批无效警告 | 真实错误仍由 ESLint、`vue-tsc` 或 Biome 报告 |

</frozen-after-approval>

## Code Map

- `frontend/package.json`、`frontend/package-lock.json` -- 前端直接依赖与可复现安装入口；当前 Vite 6.4.2、Vitest 3.2.4 命中审计报告。
- `frontend/biome.json`、`.github/workflows/ci.yml` -- Biome 规则和 CI 门禁；当前 Vue 模板误报多，且 Biome 仅以警告退出成功。
- `backend/src/test/resources/application-test.properties` -- 已有 H2 测试配置，可作为恢复跳过测试的最小复用点。
- `backend/src/test/java/com/genealogy/server/GenealogyServerApplicationTests.java` -- 空的上下文测试，目前被永久跳过，应删除或改为可运行的最小测试。
- `backend/src/test/java/com/genealogy/server/repository/UserRepositoryTest.java` -- 真实仓储查询测试，目前只因环境说明被跳过，应移除 `@Disabled` 并验证 H2 兼容性。
- `backend/src/main/java/com/genealogy/server/config/WebConfig.java` -- CORS 空实现和未使用的 `allowedOrigins`，CORS 实际由 `SecurityConfig` 管理。
- `backend/src/main/java/com/genealogy/server/config/SecurityConfig.java`、`backend/src/main/resources/application.yml` -- Swagger 白名单和新增的显式公开开关。
- `backend/src/main/resources/application.properties.example` -- 示例配置应与 Flyway/`validate` 的实际策略保持一致。

## Tasks & Acceptance

**Execution:**
- [x] 升级前端受影响依赖并更新锁文件，保留现有版本兼容性。
- [x] 恢复 H2 可运行的仓储测试，删除空的永久跳过上下文测试或改为有效 smoke test。
- [x] 删除 `WebConfig` 中无效 CORS 字段、空方法和注释代码；同步示例配置的数据库迁移策略。
- [x] 增加 Swagger 文档公开访问配置，默认关闭公开访问；补充配置行为测试。
- [x] 调整 Biome 的 Vue 检查策略和 CI 命令，使真实错误可见且不再产生大批模板误报。

**Acceptance Criteria:**
- Given 全新安装依赖，when 执行 `npm audit --audit-level=moderate`，then 不存在可由当前直接依赖升级解决的 critical/high 漏洞。
- Given 默认后端配置，when 请求 Swagger UI 或 OpenAPI 端点，then 不绕过认证；开发者显式开启配置后端点可用。
- Given 后端测试环境，when 执行 `./mvnw test`，then 原先两个 `@Disabled` 测试不再被跳过且测试总数增加。
- Given CI 检查，when 执行 lint、Biome、前端测试构建和后端测试，then 全部成功且输出不再被已知模板误报淹没。

## Spec Change Log

- 2026-09-08: 实现阶段完成全部任务；保留 71 条 Biome 非 Vue 警告作为后续清理项，避免用批量自动修复扩大本次变更范围。

## Verification

**Commands:**
- `cd frontend && npm ci && npm audit --audit-level=moderate` -- expected: install succeeds and no actionable critical/high vulnerability remains.
- `cd frontend && npm run lint && npm run biome:check && npm run test && npm run build` -- expected: all commands succeed.
- `cd backend && ./mvnw test` -- expected: all tests pass, with no disabled tests from the two targeted files.

## Suggested Review Order

**安全边界**

- 默认保护 OpenAPI 文档，仅通过环境变量显式公开。
  [`SecurityConfig.java:38`](../../backend/src/main/java/com/genealogy/server/config/SecurityConfig.java#L38)

- 删除重复 CORS 配置，保留单一安全配置入口。
  [`WebConfig.java:13`](../../backend/src/main/java/com/genealogy/server/config/WebConfig.java#L13)

**测试与配置**

- 让原先跳过的上下文与仓储测试使用 H2 真正运行。
  [`GenealogyServerApplicationTests.java:8`](../../backend/src/test/java/com/genealogy/server/GenealogyServerApplicationTests.java#L8)

- 修正查询断言，反映数据库按用户记录去重的实际行为。
  [`UserRepositoryTest.java:48`](../../backend/src/test/java/com/genealogy/server/repository/UserRepositoryTest.java#L48)

- 用统一的生产迁移策略更新示例配置。
  [`application.properties.example:14`](../../backend/src/main/resources/application.properties.example#L14)

**依赖与质量门禁**

- 锁文件升级 Vite/Vitest 及传递依赖，消除已知漏洞。
  [`package-lock.json:1931`](../../frontend/package-lock.json#L1931)

- 排除 Biome 无法正确解析的 Vue SFC，避免模板误报淹没有效提示。
  [`biome.json:10`](../../frontend/biome.json#L10)
