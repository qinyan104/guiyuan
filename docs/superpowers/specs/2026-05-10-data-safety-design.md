# 数据安全兜底 — 设计文档

## 概述

为家族真实使用场景加固数据安全性：录入时实时校验、误操作后可还原数据库、手工触发全量数据一致性诊断。

## 子任务 1：数据校验

### 1.1 日期提取

`Person` 实体的 `birth` / `death` 字段为 `VARCHAR(50)` 自由文本，不做结构变更。创建 `DateTextParser` 工具类，从自由文本中提取年份：

- 支持格式：`2024`、`2024-01-15`、`2024年1月15日`、`康熙六十年`（仅识别纯数字年份）
- 返回 `Optional<Integer>` 年份
- 无法解析时返回 `Optional.empty()`（不报错，仅跳过该条校验）

### 1.2 校验规则

| # | 规则 | 触发时机 | 处理方式 |
|---|------|----------|----------|
| V1 | `birth` 年份 > `death` 年份 | 保存人物 | `BadRequestException` — 拦截，提示"出生年份不能晚于去世年份" |
| V2 | `deceased=true` 且 `death` 文本为空 | 保存人物 | `BadRequestException` — 拦截，提示"已故人物必须填写去世日期" |
| V3 | 循环祖先：添加 parent 关系时向上遍历，若目标后代已在祖先链上则拒绝 | 保存家族关系 | `BadRequestException` — 拦截，提示"检测到循环祖先引用" |

### 1.3 实现位置

- `DateTextParser` — `backend/src/main/java/com/genealogy/server/util/`
- `PublicationService.savePersonsAndFamilies()` — 在现有的跨家庭重复校验之后执行 V1/V2
- `PublicationService` 关系保存逻辑 — 在添加 family members 时执行 V3

### 1.4 循环祖先检测算法

```
添加 parent 关系：A 的父辈设为 B
1. 从 B 出发，沿 B 的所有 parent 边向上遍历（BFS 或递归）
2. 若在 B 的祖先集合中发现 A，则 A 是 B 的祖先 → 拒绝
3. 若遍历完未发现 A → 允许
4. 遍历深度上限：50 代（防止数据错误导致无限循环）
```

### 1.5 测试

- `DateTextParserTest` — 至少 8 个用例覆盖各格式
- `DataValidationTest` — 新增 Service 测试覆盖 V1/V2/V3 正例与反例
- 与现有 `PublicationServiceTest` 不冲突

---

## 子任务 2：数据库一键还原

### 2.1 后端端点

```
POST /api/admin/restore
```
- 权限：`@PreAuthorize("hasRole('SUPER_ADMIN')")`
- 请求：`multipart/form-data`，字段 `file`（`.sql` 文件）
- 文件大小限制：50MB
- 校验：文件扩展名 `.sql`，MIME 类型检测
- 执行：`Runtime.exec("mysql ... < file")` 使用当前数据库连接参数
- 返回：`ApiResponse.success("数据库已还原")` 或错误信息
- 审计日志：记录 `RESTORE_DB` 动作

### 2.2 安全措施

- 仅 SUPER_ADMIN 可调用
- 还原前检查文件是否以有效的 SQL 语句开头（`CREATE`、`INSERT`、`--` 等）
- 还原操作记录审计日志
- `BackupService` 扩展 `restoreDatabase(InputStream)` 方法

### 2.3 前端

- `AdminSettings.vue`（设置页）新增"数据库还原"区域
- 文件选择器（仅 `.sql`）
- 点击"还原数据库" → `ConfirmDialog`（`danger` tone，消息："此操作不可逆，将覆盖当前全部数据。请确保已备份。"）
- 二次确认：输入"确认还原"四个字
- 执行中显示 spinner，完成后刷新页面

---

## 子任务 3：数据一致性扫描

### 3.1 后端端点

```
GET /api/admin/check-consistency
```
- 权限：`@PreAuthorize("hasRole('SUPER_ADMIN')")`
- 返回：`ApiResponse<ConsistencyReport>`
- `ConsistencyReport` 是一个包含多个检查结果的 DTO

### 3.2 检查项

| 检查 | 说明 | 输出 |
|------|------|------|
| 孤立人物 | `persons` 中存在但 `family_members` 中无记录的人物 | 人物 ID + 姓名列表 |
| 生卒日期矛盾 | `birth` 年份 > `death` 年份 | 人物 ID + 姓名 + birth + death |
| 在世状态矛盾 | `deceased=false` 但有 `death` 日期 | 人物 ID + 姓名 |
| 空家族 | `families` 中存在但 `family_members` 中无 `adults` 也无 `children` | 家族 ID 列表 |

### 3.3 实现位置

- `ConsistencyReport` DTO — `backend/src/main/java/com/genealogy/server/dto/`
- `ConsistencyService` — `backend/src/main/java/com/genealogy/server/service/`
- `AdminController.consistencyCheck()` — 新端点

### 3.4 前端

- 设置页新增"数据一致性检查"按钮
- 结果以可折叠列表展示，按检查类别分组
- 人物 ID 可点击跳转到对应人物的编辑页

---

## 实施顺序

1. **子任务 1**：数据校验（DateTextParser + V1/V2/V3 + 测试）
2. **子任务 2**：数据库还原（BackupService 扩展 + 端点 + 前端）
3. **子任务 3**：一致性扫描（ConsistencyService + 端点 + 前端）

---

## 文件变更清单

| 文件 | 变更类型 | 子任务 |
|------|----------|--------|
| `backend/.../util/DateTextParser.java` | 新建 | 1 |
| `backend/.../service/PublicationService.java` | 修改（加校验调用） | 1 |
| `backend/.../service/BackupService.java` | 修改（加 restore 方法） | 2 |
| `backend/.../controller/AdminController.java` | 修改（加两个端点） | 2, 3 |
| `backend/.../dto/ConsistencyReport.java` | 新建 | 3 |
| `backend/.../service/ConsistencyService.java` | 新建 | 3 |
| `backend/.../util/DateTextParserTest.java` | 新建 | 1 |
| `backend/.../service/DataValidationTest.java` | 新建 | 1 |
| `backend/.../service/BackupServiceTest.java` | 修改（加 restore 测试） | 2 |
| `frontend/src/api/admin.ts` | 修改（加 API 调用） | 2, 3 |
| `frontend/src/views/AdminSettings.vue` | 修改（加 UI 入口） | 2, 3 |
