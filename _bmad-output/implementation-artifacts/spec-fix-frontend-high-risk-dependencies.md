---
title: '修复前端生产依赖高危漏洞'
type: 'chore'
created: '2026-09-08'
status: 'done'
review_loop_iteration: 0
baseline_commit: '0ce54fd661a2a7df616ffdc1b6b70cccdb2ab317'
context:
  - '{project-root}/AGENTS.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** `frontend` 的生产依赖审计当前有 5 个 high 级漏洞，涉及直接依赖 `axios`、`pdfjs-dist` 以及传递依赖 `form-data`、`nanoid`、`postcss`，会让安全门禁和发布信心下降。

**Approach:** 优先用最小依赖升级修复非破坏性漏洞；对 `pdfjs-dist` 这种需要 semver major 的修复，先按当前代码使用方式升级并用测试、类型检查和构建确认兼容。已按用户确认将本地部署包 `/guiyuan/` 加入 `.gitignore`，避免安全修复过程中误纳入本地 `.env.local` 与 jar。

## Boundaries & Constraints

**Always:** 保持业务行为不变；只修改 `frontend/package.json`、`frontend/package-lock.json` 和必要的兼容代码；保留 npm lockfile；每次依赖升级后运行前端测试、lint、build 和生产依赖 audit；不提交本地 `guiyuan/` 部署目录内容。

**Ask First:** 如果修复漏洞要求替换 HTTP 客户端、移除 PDF 功能、关闭审计、降低测试/构建要求、或 `pdfjs-dist` 6.x 导致需要大规模改造 PDF 预览/解析能力，必须暂停询问。

**Never:** 不使用 `npm audit fix --force` 盲目接受所有破坏性升级；不新增无关依赖；不改后端 Docker、compose 生产 profile、Biome warning 清理或后端 DTO/entity 重构，这些已拆为 deferred work；不把 `/guiyuan/`、`frontend/dist/`、`backend/target/` 纳入提交。

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| 生产依赖审计 | `cd frontend && npm audit --omit=dev --audit-level=moderate` | 不再报告 high/moderate 漏洞，命令成功 | 若 npm registry 暂时不可用，报告网络失败并保留 lockfile diff；若仅剩 dev 漏洞，不纳入本目标 |
| 直接 HTTP 客户端升级 | `axios` 升级到漏洞修复版本 | `src/api/http.ts`、`src/api/share.ts` 的 axios create/interceptor 行为保持，相关 API 测试通过 | 若类型签名变化导致编译失败，做最小兼容修复，不改业务语义 |
| PDF 库升级 | `pdfjs-dist` 从 5.x 升到安全版本 | 使用该库的前端代码仍可通过 `vue-tsc` 与构建 | 若 6.x ESM/worker API 不兼容且不能小改修复，暂停询问是否保留临时风险或重构 PDF 集成 |

</frozen-after-approval>

## Code Map

- `frontend/package.json` -- 生产依赖声明；当前将 `axios` 升至安全范围，并移除了源码未引用的 `pdfjs-dist` 以避免 Node 版本约束和无用攻击面。
- `frontend/package-lock.json` -- npm lockfile；当前锁定 `axios 1.20.0`、`form-data 4.0.6`、`postcss 8.5.28`、`nanoid 3.3.18`，并不再包含 `pdfjs-dist`。
- `frontend/src/api/http.ts` -- 主要 axios 实例，含 `withCredentials`、Bearer access token 注入、401 refresh 重试、业务错误解包；升级 axios 后必须保留这些行为。
- `frontend/src/api/share.ts` -- 分享页独立 axios 实例；升级 axios 后需要确保 baseURL 与拦截行为不受影响。
- `frontend/src/api/http.test.ts`、`frontend/src/api/*.test.ts` -- 覆盖 HTTP 错误分类、刷新重试和认证导航，是 axios 升级的重点回归。
- `frontend/src` -- 未搜索到直接业务代码引用 `nanoid`、`postcss`、`form-data`；它们是传递依赖，优先通过 lockfile 升级解决。
- `.gitignore` -- 已新增 `/guiyuan/` 以忽略本地部署包；这是继续安全修复的防误提交护栏，不代表本轮处理完整部署产物治理。
- `_bmad-output/implementation-artifacts/deferred-work.md` -- 已记录拆分出去的 Docker、部署产物治理、Biome warning、后端模型重构目标。

## Tasks & Acceptance

**Execution:**
- [x] `frontend/package.json` -- 将 `axios` 升级到安全版本范围，并移除源码未引用的 `pdfjs-dist` -- 消除直接依赖漏洞来源且避免引入 Node 22+ engine 约束。
- [x] `frontend/package.json` -- 增加 `postcss`、`nanoid` overrides -- 让生产依赖树解析到安全传递版本。
- [x] `frontend/package-lock.json` -- 使用 npm 重新解析并锁定安全传递依赖版本 -- 消除 `form-data`、`nanoid`、`postcss` 等传递漏洞。
- [x] `frontend/src/**` -- 确认无需源码兼容修复 -- 保持运行时行为不变。
- [x] `.gitignore` -- 保留 `/guiyuan/` 忽略规则 -- 防止本地部署包和密钥被误提交。

**Acceptance Criteria:**
- Given 当前前端依赖，when 执行 `cd frontend && npm audit --omit=dev --audit-level=moderate`，then 不再报告 moderate/high 生产依赖漏洞。
- Given 当前前端源码，when 执行 `cd frontend && npm run lint`，then ESLint 成功。
- Given 当前前端源码，when 执行 `cd frontend && npm run test`，then Vitest 成功。
- Given 当前前端源码，when 执行 `cd frontend && npm run build`，then `vue-tsc --noEmit && vite build` 成功。
- Given 工作区存在本地部署目录 `guiyuan/`，when 查看 `git status --short --ignored guiyuan`，then 目录被 ignore 而不是作为待提交文件出现。

## Spec Change Log

## Verification

**Commands:**
- `cd frontend && npm ci` -- passed: lockfile 可被干净安装。
- `cd frontend && npm audit --omit=dev --audit-level=moderate` -- passed: found 0 vulnerabilities。
- `cd frontend && npm run lint` -- passed: ESLint 命令成功。
- `cd frontend && npm run test` -- passed: 63 test files / 293 tests 全部通过。
- `cd frontend && npm run build` -- passed: `vue-tsc --noEmit && vite build` 成功。
- `git status --short --ignored -- guiyuan` -- passed: `!! guiyuan/`。
## Suggested Review Order

**生产依赖安全面**

- 入口依赖范围：升级 axios，并移除未使用 PDF.js。
  [`package.json:20`](../../frontend/package.json#L20)

- 传递依赖护栏：强制 postcss/nanoid 解析到安全版本。
  [`package.json:45`](../../frontend/package.json#L45)

- Lockfile 根声明：确保 CI 与本地解析一致。
  [`package-lock.json:10`](../../frontend/package-lock.json#L10)

- Lockfile 安全版本：确认 nanoid 已锁到修复版。
  [`package-lock.json:4059`](../../frontend/package-lock.json#L4059)

- Lockfile 安全版本：确认 postcss 已锁到修复版。
  [`package-lock.json:4378`](../../frontend/package-lock.json#L4378)

**误提交防护**

- 本地部署包忽略：防止 `.env.local` 和 jar 进入提交。
  [`.gitignore:35`](../../.gitignore#L35)
