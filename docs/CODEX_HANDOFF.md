# Codex Handoff

## 1. 项目定位

当前项目不是“完整后台管理系统”，而是：

**本地单机版族谱编辑与出谱工作台**

核心目标是让用户在本地完成：

- 导入族谱 JSON
- 编辑人物与关系
- 自动保存与恢复草稿
- 导出 JSON / SVG
- 打印排版

## 2. 当前阶段

当前已完成一轮“从原型到本地闭环工具”的重构，重点补齐了：

- 数据校验
- 草稿持久化
- JSON 导入导出
- 统一关系操作层
- 历史记录模块
- 最小测试体系

用户已手动验证，反馈“没有问题”。

## 3. 已完成内容

### 3.1 测试与工程基础

- 已在 `package.json` 中加入：
  - `npm run test`
  - `npm run test:watch`
- 已新增 `vitest.config.ts`

### 3.2 领域类型

已扩展 `src/types/family.ts`，补充：

- `DRAFT_PACKAGE_VERSION`
- `DraftPackage`
- `LocalDraftState`
- `ValidationIssue`
- `ValidationResult`
- `PublicationOperationResult`

### 3.3 新增模块

已新增以下模块：

- `src/features/validation/draftSchema.ts`
  - 校验 publication 数据结构
  - 校验 settings
  - 归一化 publication

- `src/features/persistence/draftPersistence.ts`
  - 草稿包创建
  - JSON 解析
  - 本地草稿序列化与恢复

- `src/features/editor/publicationOperations.ts`
  - 配偶、子女、父母操作
  - 删除人物
  - 子女顺序调整
  - 分支聚焦
  - 删除影响摘要

- `src/features/history/historyCore.ts`
  - 纯历史工具函数

- `src/features/history/useEditorHistory.ts`
  - 撤销 / 重做 / 快照跟踪

### 3.4 App 集成

`src/App.vue` 已完成以下改造：

- 关系编辑改为通过 `applyRelationshipAction` 统一执行
- 历史逻辑改为使用 `useEditorHistory`
- 本地恢复改为使用 `parseLocalDraftState`
- 自动保存改为使用 `serializeLocalDraftState`
- 已增加：
  - 导入 JSON
  - 导出 JSON
  - 错误反馈条
  - 导入覆盖确认

### 3.5 样式

`src/style.css` 已新增：

- `.visually-hidden`
- `.feedback-strip`
- `.feedback-strip--error`

## 4. 当前验证状态

自动验证已通过：

```powershell
npm.cmd run test
npm.cmd run build
```

当前结果：

- `vitest` 13 个测试通过
- `vite build` 通过

用户手动验证也已通过。

## 5. 当前工作树状态

当前改动**尚未提交**。

本轮主要变更文件：

- `package.json`
- `package-lock.json`
- `vitest.config.ts`
- `src/App.vue`
- `src/style.css`
- `src/types/family.ts`
- `src/features/**`

最近一次已提交的历史仍是：

```text
e4f1101 chore: capture existing genealogy workbench
```

如果新窗口接手，先确认这些未提交改动是否仍存在。

## 6. 关键约束

- 当前范围仍然是“本地单机工作台”
- 暂不做：
  - 登录与权限
  - 后端接口
  - 数据库
  - 多人协作
  - 审批流
  - 复杂运营后台
  - 外部系统集成

如果要扩需求，先确认是否还在这个范围内。

## 7. 建议下一步

如果继续推进，优先顺序建议是：

1. 先提交当前这一轮改动
2. 补少量集成层测试或交互细节测试
3. 继续拆分 `src/App.vue` 中剩余的视图编排逻辑
4. 视需要补更细的错误展示和空状态文案

## 8. 新窗口标准启动语

新开一个窗口时，建议直接这样发：

```text
继续这个项目。先读 docs/CODEX_HANDOFF.md、docs/superpowers/specs/2026-04-17-local-genealogy-workbench-design.md、docs/superpowers/plans/2026-04-17-local-genealogy-workbench.md，再看 git status 和最近一次改动，然后继续做 xxx。
```

如果只想最省 token，可以再短一点：

```text
继续这个项目。先读 docs/CODEX_HANDOFF.md 和 git status，不要重新全量扫仓库；只在需要时再读相关文件。接着做 xxx。
```

## 9. 接手优先读取顺序

新窗口接手时，建议按这个顺序读取：

1. `docs/CODEX_HANDOFF.md`
2. `git status --short`
3. `docs/superpowers/specs/2026-04-17-local-genealogy-workbench-design.md`
4. `docs/superpowers/plans/2026-04-17-local-genealogy-workbench.md`
5. `src/App.vue`
6. `src/features/**` 相关模块

这样通常比重新扫描整个仓库更省。
