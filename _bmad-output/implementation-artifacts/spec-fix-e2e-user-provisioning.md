---
title: '修复 E2E 测试用户全局初始化'
type: 'bugfix'
created: '2026-09-12'
status: 'in-progress'
review_loop_iteration: 0
baseline_commit: '18404051baced294ac8d075a5fcfc3b72dc3601b'
context:
  - '{project-root}/AGENTS.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** CI 的全新数据库只包含默认管理员，而多个 Playwright spec 在负责创建 `e2e_test` 的 `login.spec.ts` 之前就尝试登录，导致浏览器登录返回 404。现有惰性初始化还误读分页用户响应、使用不满足密码策略的默认密码，并把所有 400 当作可忽略结果。

**Approach:** 将共享测试用户初始化提升为 Playwright 全局 setup，在任何 spec 执行前通过管理员 API 确保账号存在且密码确定；登录 helper 只负责认证。集中共享凭据并严格检查初始化响应，消除文件顺序、旧密码和静默失败造成的不稳定性。

## Boundaries & Constraints

**Always:** 保持生产认证、用户管理 API 和业务代码不变；兼容 `PLAYWRIGHT_BASE_URL`、`E2E_API_BASE_URL`、`E2E_USERNAME`、`E2E_PASSWORD`；默认测试密码必须满足后端强度策略；全局请求上下文必须释放；账号初始化失败应在 spec 开始前给出明确错误。

**Ask First:** 如果需要修改后端密码策略、Flyway 默认数据、公开注册状态或 CI 数据库结构，暂停确认。

**Never:** 不依赖 spec 文件发现顺序；不忽略创建或重置接口的 400/500；不以重试递归掩盖无法创建的账号；不在仓库硬编码生产凭据；本轮不修改 CD 触发与部署门禁。

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| 全新 CI 数据库 | 只有 `root`，共享测试用户不存在 | global setup 创建用户并验证凭据，随后所有 spec 可登录 | 创建或验证失败时终止 E2E 并报告状态码 |
| 重复或中断后运行 | 测试用户存在但密码已漂移 | global setup 重置为配置密码并验证 | 重置失败时终止，不吞掉 400 |
| 自定义环境 | 提供 E2E 用户名、密码或独立 API 基址 | 初始化和所有 spec 使用同一组配置 | 密码不合规时由初始化错误明确暴露 |
| 普通认证失败 | 登录不存在用户或密码错误 | login helper 直接报告失败 | 不自动递归创建用户 |

</frozen-after-approval>

## Code Map

- `frontend/e2e/playwright.config.ts:3-19` -- 当前无 `globalSetup`；所有 CLI 与 CI E2E 均加载此配置。
- `frontend/e2e/global-setup.ts` -- 新增一次性生命周期入口；以 Playwright request context 调用共享初始化并在 `finally` 释放。
- `frontend/e2e/helpers/auth.ts:3-104` -- 修正 `/api/admin/users` 的 `data.items` 契约；集中共享凭据；将 `ensureTestUser` 改为创建或重置后验证，将 `loginViaApi` 收敛为纯认证。
- `frontend/e2e/specs/login.spec.ts:1-18` -- 移除仅对单文件生效的初始化 hook，改用共享凭据。
- `frontend/e2e/specs/features.spec.ts:1-16`、`performance.spec.ts:1-5`、`publication.spec.ts:1-18`、`workbench.spec.ts:1-52` -- 消除重复且不合规的 `e2e_test/test1234` 默认值，统一引用 helper 配置。
- `backend/src/main/java/com/genealogy/server/controller/AdminController.java:64-146` -- 只读契约证据：列表返回分页 `items`，已有用户可经 `PUT /users/{id}/password` 重置。
- `.github/workflows/ci.yml:88-167` -- 只读执行环境；后端与前端就绪后直接运行同一 Playwright 配置，本轮无需增加 shell 初始化步骤。

## Tasks & Acceptance

**Execution:**
- [ ] `frontend/e2e/helpers/auth.ts` -- 集中凭据、修正分页响应并实现严格且幂等的创建/重置/验证协议。
- [ ] `frontend/e2e/global-setup.ts`、`frontend/e2e/playwright.config.ts` -- 在所有 spec 前运行共享用户初始化并可靠释放请求上下文。
- [ ] `frontend/e2e/specs/{login,features,performance,publication,workbench}.spec.ts` -- 统一使用共享凭据，移除文件级顺序依赖。

**Acceptance Criteria:**
- Given 仅含默认管理员的全新数据库，when 单独执行任一依赖 `e2e_test` 的 spec，then spec 开始前账号已创建且浏览器/API 登录不返回 404。
- Given 测试用户已存在但密码不同，when 启动新一轮 Playwright，then 密码被恢复为当前 E2E 配置且认证成功。
- Given 初始化接口返回校验错误，when global setup 执行，then E2E 立即失败并显示具体阶段与 HTTP 状态，不进入递归重试。
- Given 执行前端 lint、类型构建和 Playwright 测试发现，when 加载新增 setup 与 imports，then 命令成功且无未使用代码或配置解析错误。

## Spec Change Log

## Design Notes

全局 setup 负责环境前置条件，spec hook 只负责各自场景数据。共享账号如果已存在也执行密码重置，以恢复上次中断或人工运行留下的状态；`root` 仅用于管理 API，不被自动创建或重置。

## Verification

**Commands:**
- `cd frontend && npm run lint && npm run biome:check && npm run build` -- expected: 静态检查和 TypeScript 构建通过。
- `cd frontend && npx playwright test --config=e2e/playwright.config.ts --list` -- expected: global setup 与配置可加载，测试可发现。
- 在后端、前端及全新数据库运行时执行 `cd frontend && CI=true npx playwright test --config=e2e/playwright.config.ts` -- expected: 不再出现 `E2E browser login failed for e2e_test: 404`，完整 E2E 通过。
