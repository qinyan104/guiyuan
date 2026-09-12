---
title: '加固上传鉴权与失败清理'
type: 'bugfix'
created: '2026-09-12'
status: 'done'
review_loop_iteration: 1
baseline_commit: 'f41c77920eee329e239431c6d6fa9546f4712916'
context:
  - '{project-root}/AGENTS.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** `FileController.uploadFile` 在解析用户和检查族谱编辑权限之前把附件写入最终目录；鉴权、数据库保存或文件复制失败时也没有可靠删除已创建文件。攻击者或运行时故障因此可能制造无数据库记录的孤儿文件并持续消耗磁盘。

**Approach:** 将用户解析和可选的族谱编辑权限检查移动到任何文件系统副作用之前；使用受控上传根目录创建文件，并在复制或数据库保存失败时执行尽力补偿删除。通过隔离的临时目录测试验证拒绝请求和持久化失败均不留下文件。

## Boundaries & Constraints

**Always:** 保持 `/api/upload` 的成功响应、文件 URL、允许格式、大小限制及下载授权语义不变；`publicationId` 为空时仍允许认证用户上传个人附件；所有失败清理只能作用于本次生成且位于上传根目录内的随机文件；测试不得写入仓库 `uploads/`。

**Ask First:** 如果实现需要新增运行时依赖、修改数据库结构、改变无 `publicationId` 上传权限或引入外部对象存储，暂停确认。

**Never:** 不降低内容签名和图片尺寸校验；不允许鉴权前落盘；不吞掉数据库运行时异常；不删除其他请求或历史记录关联的文件。

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| 有权族谱上传 | 已认证且拥有 EDIT，合法附件与 publicationId | 保存文件和 UploadedFile 记录，返回原有 URL | N/A |
| 个人附件上传 | 已认证、publicationId 为空、合法附件 | 文件归当前用户所有并正常返回 | N/A |
| 无权族谱上传 | 已认证但无 EDIT | 文件系统与 repository 均无副作用 | 返回 403 |
| 数据库保存失败 | 文件复制成功，repository 抛 RuntimeException | 删除本次文件，不生成可访问记录 | 保留异常并由全局处理器返回 500 |
| 文件复制失败 | 目录或目标不可写、复制中断 | 尽力删除本次部分文件，不保存记录 | 返回现有上传失败响应 |

</frozen-after-approval>

## Code Map

- `backend/src/main/java/com/genealogy/server/controller/FileController.java:72-138` -- 上传入口；当前在 117 行复制文件，121–124 行才鉴权，且保存失败没有补偿。调整副作用顺序并集中清理本次目标路径。
- `backend/src/main/java/com/genealogy/server/controller/FileController.java:140-158` -- 下载端已通过数据库记录和规范化路径授权；保持此契约不变，并复用同样的上传根目录边界。
- `backend/src/test/java/com/genealogy/server/controller/FileControllerTest.java:34-160` -- 现有 WebMvc 上传测试；使用 `@TempDir` 与动态属性隔离磁盘，增加权限拒绝和 repository 失败断言。
- `backend/src/main/java/com/genealogy/server/config/GlobalExceptionHandler.java:24-91` -- `ForbiddenException` 映射 403、运行时异常映射 500；实现应让这些异常继续到统一处理器。
- `backend/src/main/java/com/genealogy/server/service/PublicationAuthorizationService.java` -- 现有 `require(subject, publicationId, EDIT)` 权限边界；必须在文件写入前调用。

## Tasks & Acceptance

**Execution:**
- [x] `backend/src/main/java/com/genealogy/server/controller/FileController.java` -- 先解析用户并授权，再创建上传目录和目标文件；复制或 repository 保存失败时仅清理本次目标文件。
- [x] `backend/src/test/java/com/genealogy/server/controller/FileControllerTest.java` -- 将上传目录切换到测试临时目录，覆盖无权上传、持久化失败清理和正常上传行为。

**Acceptance Criteria:**
- Given 用户无目标族谱 EDIT 权限，when 提交合法附件，then 返回 403、repository 不被调用且上传目录为空。
- Given repository 在文件复制后抛出运行时异常，when 提交合法附件，then 返回 500 且上传目录为空。
- Given 已认证用户提交合法个人附件或有权族谱附件，when 上传成功，then 响应契约不变且数据库记录保存正确的 owner 与 publicationId。
- Given 后端测试执行，when 运行完整 Maven 测试，then 所有测试通过且仓库根目录不产生测试附件。

## Design Notes

本轮不引入新的存储抽象，避免把安全修复扩大成架构重构。控制器在生成随机目标路径后维护该路径的单请求所有权，并以 `Files.deleteIfExists` 做补偿；删除失败记录日志但不覆盖原始异常。未来接入对象存储时可再把这段协议提取为存储服务。

## Verification

**Commands:**
- `cd backend && ./mvnw test` -- expected: 全部后端测试通过。
- `git diff --check` -- expected: 无空白与换行错误。

**Manual checks:**
- 检查测试前后项目根目录的 `backend/uploads` 没有新增测试文件。

**Verification notes:** `FileControllerTest` 11 个场景全部通过；完整后端测试 407 个场景通过，0 failures、0 errors、0 skipped；`git diff --check` 通过，且测试未在仓库 `backend/uploads` 中产生附件。

## Review Resolution

- **Patched:** 使用 `CREATE_NEW` 创建目标，避免覆盖既有文件或符号链接；仅在目标成功创建后取得清理所有权。
- **Patched:** 清理前重新验证目标是上传根目录的直接子项，并在清理遇到 `SecurityException` 时保留原始异常。
- **Patched:** 权限拒绝测试现在断言上传根目录不会被创建；复制中断测试会在写入部分内容后抛出 `IOException`；repository 失败测试会验证无关既有文件不受影响。
- **Rejected:** 将 publication 鉴权后移到附件验证之后。鉴权优先是本规格的安全边界，且不会产生文件系统副作用。
- **Deferred:** 针对具有本地文件系统修改能力的攻击者防御上传根目录 junction/symlink 替换，需要目录句柄或独立存储模块，超出本轮控制器级修复范围。

## Suggested Review Order

1. [`FileController.java`](../../backend/src/main/java/com/genealogy/server/controller/FileController.java) — 检查鉴权顺序、独占创建、异常传播和受限补偿删除。
2. [`FileControllerTest.java`](../../backend/src/test/java/com/genealogy/server/controller/FileControllerTest.java) — 检查无权请求无落盘、复制中断清理、repository 失败清理与无关文件保留。
3. [`deferred-work.md`](deferred-work.md) — 查看需要存储模块设计才能解决的本地文件系统链接替换威胁。
