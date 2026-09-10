---
title: '强制分享照片遵守脱敏策略'
type: 'chore'
created: '2026-09-10'
status: 'done'
review_loop_iteration: 0
baseline_commit: 'bc63c90d830c85e119964b49299c5ce314002dd0'
context:
  - '{project-root}/AGENTS.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** 分享族谱数据会按 redaction profile 移除在世人物照片字段，但 `/api/shares/{token}/photos/{photoId}` 只校验照片属于同一族谱；如果外部访问者拿到或猜到 photoId，仍可能绕过分享脱敏策略读取在世人物照片。

**Approach:** 让分享照片代理端点在返回二进制照片前复用同一套照片脱敏规则：照片所属人物、分享族谱与 redaction profile 必须同时允许访问；默认兼容现有 `photo:NONE`，但 `photo:LIVING` 禁止在世人物照片，`photo:ALL` 禁止所有分享照片。

## Boundaries & Constraints

**Always:** 保持分享族谱 JSON 的现有脱敏行为、分享 token 校验、不同族谱照片禁止访问和照片响应格式不变；新增逻辑只影响分享照片代理端点；所有策略判断必须有后端测试覆盖。

**Ask First:** 如果需要改变 redaction profile JSON 结构、修改数据库 schema、移除照片代理能力、或调整前端分享链接配置语义，暂停确认。

**Never:** 不放宽任何已有分享权限；不让前端承担敏感照片访问控制；不修改普通已登录照片 API、出版导出或 GEDCOM 导出。

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| 默认分享照片 | share profile 为空或 `photo:NONE`，照片属于该族谱人物 | `/api/shares/{token}/photos/{photoId}` 返回原照片二进制 | N/A |
| 在世照片脱敏 | share profile `photo:LIVING`，照片所属人物 `deceased=false` 或未标记已故 | 返回 403，不暴露照片内容 | 返回现有 ApiResponse 错误格式 |
| 已故照片允许 | share profile `photo:LIVING`，照片所属人物 `deceased=true` | 返回原照片二进制 | N/A |
| 全部照片脱敏 | share profile `photo:ALL` | 返回 403，不暴露照片内容 | 返回现有 ApiResponse 错误格式 |
| 族谱不匹配 | 照片存在但人物不属于分享族谱 | 保持 403 | 返回现有“无权访问该照片”语义 |

</frozen-after-approval>

## Code Map

- `backend/src/main/java/com/genealogy/server/service/PublicationViewProjector.java` -- 现有 JSON 视图脱敏中心；`redactLivingSensitive` 和 `shouldRedact` 已定义 `photo` 规则，但 `shouldRedact` 为 private，照片端点无法复用。
- `backend/src/main/java/com/genealogy/server/controller/SharePublicationController.java` -- `/api/shares/{token}/photos/{photoId}` 当前只校验分享 token、photo 存在、person 属于 publication；缺少 redaction profile 的照片规则校验。
- `backend/src/main/java/com/genealogy/server/auth/ShareSubject.java` -- 分享上下文携带 `redactionProfileJson`，照片端点已可从 resolver 获得策略输入。
- `backend/src/test/java/com/genealogy/server/service/FieldLevelPrivacyTest.java` -- 已覆盖 JSON 视图中 `photo:LIVING` 的 avatarUrl 脱敏，可补充公开 helper 或默认规则测试。
- `backend/src/test/java/com/genealogy/server/controller/SharePublicationControllerTest.java` -- 已覆盖分享照片成功、未找到、跨族谱禁止；应新增 `photo:LIVING` 在世禁止、已故允许、`photo:ALL` 禁止。

## Tasks & Acceptance

**Execution:**
- [x] `backend/src/main/java/com/genealogy/server/service/PublicationViewProjector.java` -- 暴露一个只读照片访问判断方法，复用 profile 解析和 `photo` 规则 -- 避免分享 JSON 与二进制照片策略漂移。
- [x] `backend/src/main/java/com/genealogy/server/controller/SharePublicationController.java` -- 在照片返回前调用照片访问判断，不允许时返回 403 -- 堵住绕过脱敏读取照片的路径。
- [x] `backend/src/test/java/com/genealogy/server/controller/SharePublicationControllerTest.java` -- 增加分享照片策略测试 -- 覆盖矩阵中的默认、在世、已故、全部脱敏和跨族谱场景。
- [x] `backend/src/test/java/com/genealogy/server/service/FieldLevelPrivacyTest.java` -- 如新增 helper，补充或调整服务级测试 -- 锁定 profile 解析默认值与 photo 规则。

**Acceptance Criteria:**
- Given 分享链接配置 `photo:LIVING`，when 外部访问在世人物照片代理 URL，then 返回 403 且不返回照片字节。
- Given 分享链接配置 `photo:LIVING`，when 外部访问已故人物照片代理 URL，then 仍返回照片二进制。
- Given 分享链接配置 `photo:ALL`，when 外部访问任意分享照片代理 URL，then 返回 403。
- Given 当前后端代码，when 执行 `cd backend && ./mvnw test`，then 所有后端测试通过。

## Spec Change Log

## Verification

**Commands:**
- `cd backend && ./mvnw test` -- expected: 所有后端单元与集成测试通过。

## Suggested Review Order

**分享照片访问控制**

- 照片代理返回前强制套用 redaction profile。
  [`SharePublicationController.java:103`](../../backend/src/main/java/com/genealogy/server/controller/SharePublicationController.java#L103)

- 照片可见性复用现有 profile 解析和 photo 规则。
  [`PublicationViewProjector.java:117`](../../backend/src/main/java/com/genealogy/server/service/PublicationViewProjector.java#L117)

**策略行为测试**

- 默认配置保持分享照片代理兼容可用。
  [`SharePublicationControllerTest.java:176`](../../backend/src/test/java/com/genealogy/server/controller/SharePublicationControllerTest.java#L176)

- `photo:LIVING` 禁止在世人物照片。
  [`SharePublicationControllerTest.java:202`](../../backend/src/test/java/com/genealogy/server/controller/SharePublicationControllerTest.java#L202)

- `photo:LIVING` 允许已故人物照片。
  [`SharePublicationControllerTest.java:228`](../../backend/src/test/java/com/genealogy/server/controller/SharePublicationControllerTest.java#L228)

- `photo:ALL` 禁止所有分享照片。
  [`SharePublicationControllerTest.java:254`](../../backend/src/test/java/com/genealogy/server/controller/SharePublicationControllerTest.java#L254)

- 服务级测试锁定默认、LIVING、ALL 规则。
  [`FieldLevelPrivacyTest.java:97`](../../backend/src/test/java/com/genealogy/server/service/FieldLevelPrivacyTest.java#L97)
