---
title: '恢复仓库质量门禁'
type: 'bugfix'
created: '2026-09-12'
status: 'done'
route: 'one-shot'
---

# 恢复仓库质量门禁

## Intent

**Problem:** 后端测试因缺少 AssertJ 静态导入而无法编译，前端有六处代码不符合 Biome 格式，生产 Compose 文件还包含 UTF-8 BOM，导致仓库自身无法完整通过既定质量检查。

**Approach:** 补齐测试导入，仅格式化 Biome 明确报告的文件，并移除 Compose BOM；将审查中发现但不属于本轮的工作登记到延期清单。

## Suggested Review Order

**验证恢复**

- 补齐 AssertJ 导入，让后端测试重新进入执行阶段。
  [`SecurityStartupCheckTest.java:15`](../../backend/src/test/java/com/genealogy/server/config/SecurityStartupCheckTest.java#L15)

- 移除生产 Compose 的 BOM，并保持配置内容不变。
  [`docker-compose.yml:1`](../../release/docker-compose.yml#L1)

**前端格式门禁**

- 按 Biome 输出格式化管理员列表调用边界。
  [`AdminUsersView.vue:106`](../../frontend/src/views/AdminUsersView.vue#L106)

- 按 Biome 输出展开拖拽组合函数结构。
  [`useChildDragAndDrop.ts:18`](../../frontend/src/composables/useChildDragAndDrop.ts#L18)

- 按 Biome 输出整理 SVG 清理条件，不改变安全逻辑。
  [`publicationExport.ts:606`](../../frontend/src/features/export/publicationExport.ts#L606)

**后续追踪**

- 记录上传、发布、配置、重构、文档及盲审延期项。
  [`deferred-work.md:16`](deferred-work.md#L16)
