---
title: '前端 lint 清零与项目文档同步'
type: 'chore'
created: '2026-09-07'
status: 'done'
review_loop_iteration: 0
baseline_commit: '1b8720ce8dc696d5559bada4e11c272e5192f6a3'
context:
  - '{project-root}/AGENTS.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** 前端 `npm run lint` 当前有 1 个阻塞 error 与大量 warning，导致质量门禁不可用；同时 README/AGENTS 对 `docs/`、`CONTEXT.md`、`miniapp/` 和产品边界的描述与当前仓库不一致。两者都会降低项目可维护性与新成员接手效率。

**Approach:** 以不改变业务行为为原则，修复 ESLint error 并尽量清理所有 warning；同步 README 与 AGENTS 的项目结构和说明，使文档只描述当前仓库真实存在或明确规划中的内容。

## Boundaries & Constraints

**Always:** 保持改动局限在前端 lint 修复与文档同步；不得重写核心业务逻辑；不得覆盖 dirty worktree 中与本任务无关的既有改动；所有自动修复后都要运行 lint/test/build 验证。

**Ask First:** 如果需要修改 ESLint 规则来“压掉” warning、删除功能代码、重命名公开 API、或发现某个 warning 的修复会改变运行时行为，必须暂停询问。

**Never:** 不做大文件拆分；不修后端业务问题；不新增依赖；不使用 blanket disable 注释掩盖问题；不恢复或回滚用户已有未提交改动。

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Lint clean | `frontend` 中执行 `npm run lint` | 命令成功，0 error，目标为 0 warning | 若残留 warning，报告具体原因；不得通过降低规则绕过 |
| Docs sync | 仓库当前没有 `docs/`、`CONTEXT.md`、`miniapp/` 目录 | README/AGENTS 不再把这些路径写成当前存在的模块；如保留规划说明需明确是规划/历史上下文 | 若不确定是否为规划内容，优先删除“当前存在”表述 |
| Behavior safety | lint 修复涉及 Vue 模板属性顺序、未使用变量、`any` 类型收窄、`const` 替换 | UI 与业务行为保持等价 | 类型收窄失败或行为有风险时，保留最小安全修复并说明 |

</frozen-after-approval>

## Code Map

- `frontend/eslint.config.js` -- 当前 lint 规则来源；`no-explicit-any`、`vue/attribute-hyphenation`、`vue/attributes-order` 等为 warning，不能通过改规则规避。
- `frontend/src/features/export/publicationExport.ts` -- 当前唯一 ESLint error：`canvasBg` 应从 `let` 改为 `const`；同文件还有导出相关 warning。
- `frontend/src/**/*.vue`、`frontend/src/**/*.ts` -- `npm run lint` 报告的 warning 分布范围；优先使用 `eslint --fix` 处理格式/属性顺序，再人工处理剩余未使用变量、空块、`any` 和 XSS warning。
- `README.md` -- 项目主文档；当前产品边界仍称复杂书稿版面不保存，但代码已有 `/book-editor/publication/:publicationId` 和书稿导出相关功能，需要调整为“轻量书稿草稿/导出”。
- `AGENTS.md` -- 智能体项目说明；当前写明有 miniapp、`docs/`、`CONTEXT.md`，但仓库当前未见对应目录/文件，应改为与现状一致，并保留 dirty worktree 保护要求。
- `.github/workflows/ci.yml` -- CI 运行 `npm run lint`、`npm run test`、`npm run build`；本任务验证应覆盖这些前端命令。

## Tasks & Acceptance

**Execution:**
- [x] `frontend/src/**/*` -- 运行安全自动修复并人工处理剩余 lint 报告 -- 恢复前端 lint 门禁可信度。
- [x] `README.md` -- 同步产品边界、项目结构和实际模块描述 -- 消除不存在目录/过时功能边界造成的误导。
- [x] `AGENTS.md` -- 同步当前仓库模块与领域文档要求 -- 防止后续智能体按不存在路径工作。

**Acceptance Criteria:**
- Given 当前前端源码，when 在 `frontend` 执行 `npm run lint`，then 命令成功且不再输出 error/warning。
- Given 当前前端源码，when 执行 `npm run test` 和 `npm run build`，then 两个命令均成功。
- Given 新成员阅读 README/AGENTS，when 按“项目结构/Where things are”查找目录，then 不会被指向当前不存在的 `docs/`、`CONTEXT.md`、`miniapp/` 作为现有模块。

## Spec Change Log


## Verification

**Commands:**
- `cd frontend && npm run lint` -- expected: 0 problems。
- `cd frontend && npm run test` -- expected: 63 test files / 293 tests 全部通过或等价通过数。
- `cd frontend && npm run build` -- expected: `vue-tsc --noEmit && vite build` 成功。

## Suggested Review Order

**错误处理与类型收窄**

- Axios 与测试替身都走同一 URL 提取路径。
  [`http.ts:30`](../../frontend/src/api/http.ts#L30)

- 全局冲突事件改用类型化 CustomEvent 读取。
  [`App.vue:21`](../../frontend/src/App.vue#L21)

- 共享 HTML 主题来源限制为合法主题枚举。
  [`shareHtmlExport.ts:1212`](../../frontend/src/features/export/shareHtmlExport.ts#L1212)

**Vue 安全与模板 lint**

- 诗句换行改为文本渲染，避免 v-html。
  [`PoeticHeader.vue:111`](../../frontend/src/components/PoeticHeader.vue#L111)

- 注入上下文按实际可选字段建模。
  [`WorkbenchHeader.vue:14`](../../frontend/src/components/WorkbenchHeader.vue#L14)

**文档同步**

- 产品边界改为轻量 Markdown 出版数据。
  [`README.md:7`](../../README.md#L7)

- 智能体说明不再声明当前存在 miniapp。
  [`AGENTS.md:5`](../../AGENTS.md#L5)

- 不存在的 docs/CONTEXT 路径明确为当前缺失。
  [`AGENTS.md:46`](../../AGENTS.md#L46)
