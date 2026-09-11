---
title: '优化启动迁移与管理员查询性能'
type: 'refactor'
created: '2026-09-11'
status: 'done'
review_loop_iteration: 0
baseline_commit: 'a02a963c9fb2ccba450234ec2fe332ce9d70fc7f'
context:
  - '{project-root}/AGENTS.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** 应用每次启动都会扫描全部族谱并逐条检查权限，用户迁移也会读取全部用户；管理员用户列表还会为每个用户单独查询头像关联数据。数据量增长后，这些路径会造成启动变慢、数据库查询数线性放大，并增加多实例同时启动时的竞态风险。

**Approach:** 将一次性数据修复从启动热路径迁移到可追踪、幂等的 Flyway 数据迁移；把管理员列表的头像信息改为批量读取并在服务层组装，保持现有 API 返回结构不变。补充查询次数和迁移幂等性测试。

## Boundaries & Constraints

**Always:** 不改变现有权限语义、用户角色语义和管理员 API JSON 结构；迁移必须可重复执行且不会创建重复 OWNER 记录；查询必须使用批量 SQL/Repository 方法而非逐条查询；保留 Flyway 管理的数据库版本链；所有新增逻辑补充自动化测试。

**Ask First:** 如果发现历史数据库存在重复权限记录、缺失用户角色或无法安全自动修复，暂停并报告，不自行删除或选择数据。

**Never:** 不在每次应用启动时继续执行全表回填；不使用 Hibernate `ddl-auto=update/create`；不通过降低权限校验、删除外键或改变删除级联来解决问题；不改变前端协议或引入新的分页行为。

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| 已完成迁移的数据库 | Flyway 已执行新版本 | 应用启动不再运行权限/角色回填 Runner | 启动成功 |
| 旧数据库首次升级 | 缺少 OWNER 记录或用户角色为空 | Flyway 一次性补齐，重复执行无重复数据 | 迁移失败时阻止启动并保留明确错误 |
| 无头像用户列表 | 用户没有 person account 或 photo | `avatarUrl` 仍为 null，响应结构不变 | 不产生额外逐用户查询 |
| 大量用户列表 | N 个用户 | 头像关联查询为固定批次数，不随 N 线性增加 | 返回完整列表 |

</frozen-after-approval>

## Code Map

- `backend/src/main/java/com/genealogy/server/config/AccessControlMigrationRunner.java` -- 当前启动时扫描全部 Publication，并对每条记录执行存在性查询和保存；目标是删除或停用。
- `backend/src/main/java/com/genealogy/server/config/DataMigrationRunner.java` -- 当前启动时调用用户角色迁移；目标是删除或停用。
- `backend/src/main/java/com/genealogy/server/service/UserService.java:188-220` -- `listAllUsers` 与 `getAvatarUrl` 形成管理员列表的逐用户查询；保留服务职责，改为批量组装。
- `backend/src/main/java/com/genealogy/server/controller/AdminController.java:58-72` -- 管理员用户列表 API，必须保持字段与响应兼容。
- `backend/src/main/java/com/genealogy/server/repository/PublicationAccessRepository.java` -- 现有权限查询接口；迁移可使用原生/迁移 SQL，不把启动修复逻辑留在 Repository 调用链。
- `backend/src/main/java/com/genealogy/server/repository/PersonAccountRepository.java` -- 需要补充按用户集合批量查询的接口或等价查询。
- `backend/src/main/java/com/genealogy/server/repository/PersonRepository.java` -- 需要补充按人员 ID 集合查询以批量得到头像信息。
- `backend/src/main/resources/db/migration/V13__add_indexes_and_foreign_keys.sql` -- 现有迁移风格与外键约束参考；新增版本必须遵循 Flyway 顺序。
- `backend/src/test/java/com/genealogy/server/controller/AdminAccountControllerTest.java`、`backend/src/test/java/com/genealogy/server/controller/AdminControllerTest.java` -- 现有管理员 API 测试，扩展列表与批量查询行为。

## Tasks & Acceptance

**Execution:**
- [x] 新增 Flyway 迁移脚本，幂等补齐历史 OWNER 记录和缺失角色；确认必要唯一约束/索引；移除两个启动迁移 Runner。
- [x] 为人员账号与头像数据增加批量查询能力，重构 `UserService`/管理员列表组装逻辑，确保固定批次数并保持现有响应字段。
- [x] 增加迁移数据测试与管理员列表测试，验证无头像、多个用户、重复执行和旧数据升级场景。
- [x] 更新必要的启动/迁移说明，避免后续代码重新加入启动期数据修复。

**Acceptance Criteria:**
- Given 新数据库或已完成新迁移的数据库，when 应用启动，then 不执行 `AccessControlMigrationRunner` 或 `DataMigrationRunner` 的全表修复。
- Given 旧数据库存在缺失 OWNER 记录，when Flyway 执行新迁移，then 每个族谱最多有一个对应 OWNER 权限记录，且迁移重复执行不会增加记录。
- Given 管理员请求用户列表，when 返回 N 个用户，then avatar 关联查询不会按用户逐条执行，且 `id/username/nickname/role/createdAt/avatarUrl` 字段保持兼容。
- Given 用户没有关联人员或照片，when 查询管理员列表，then 该用户的 `avatarUrl` 为 null，其他用户数据不受影响。
- Given 自动化测试运行，when 执行后端测试，then 新增测试与现有测试全部通过。

## Verification

**Commands:**
- `cd backend && ./mvnw test -q` -- expected: all backend tests pass.
- `cd frontend && npm run test` -- expected: existing frontend tests remain passing because API shape is unchanged.
- `git diff --check` -- expected: no whitespace errors.

## Suggested Review Order

**查询入口与批量组装**

- 管理员列表先批量收集用户 ID，再保持原有响应字段。
  [`AdminController.java:62`](../../backend/src/main/java/com/genealogy/server/controller/AdminController.java#L62)

- 服务层通过两次批量查询替代逐用户头像查询。
  [`UserService.java:199`](../../backend/src/main/java/com/genealogy/server/service/UserService.java#L199)

**数据迁移**

- 角色补齐采用确定性最小 ID，并补齐历史 OWNER 权限。
  [`V16__move_startup_data_migrations.sql:4`](../../backend/src/main/resources/db/migration/V16__move_startup_data_migrations.sql#L4)

**测试与边界**

- 验证有头像、无头像及空输入不会退化为逐条查询。
  [`UserServiceTest.java:574`](../../backend/src/test/java/com/genealogy/server/service/UserServiceTest.java#L574)

- 验证管理员 API 仍能返回兼容结构。
  [`AdminControllerTest.java:75`](../../backend/src/test/java/com/genealogy/server/controller/AdminControllerTest.java#L75)
