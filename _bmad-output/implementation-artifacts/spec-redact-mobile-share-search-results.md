---
title: '移动端分享搜索结果脱敏'
type: 'chore'
created: '2026-09-10'
status: 'done'
review_loop_iteration: 0
baseline_commit: '3b4d55dbfe8a7042b6c3d8fa8bff38a1d7e3f4f8'
context:
  - '{project-root}/AGENTS.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** `/api/mobile/publications/{pubId}/search` 支持通过 `shareToken` 搜索人物，但当前在权限通过后直接从 `publicationService.loadPublication(pubId)` 的完整数据中筛选并返回 person map；这会绕过分享链接的 redaction profile，把在世人物生日、备注、照片 URL 等字段暴露给移动端分享访问者。

**Approach:** 当请求使用 `shareToken` 时，移动端搜索必须先投影为分享脱敏视图，再从脱敏后的 people 中搜索；已登录用户路径保持现状，仍按其现有权限返回搜索结果。

## Boundaries & Constraints

**Always:** 保持移动端搜索 URL、参数和响应形状不变；保持分享 token 校验和 publicationId 匹配权限判断；分享搜索结果的字段应与同一 token 下分享族谱 JSON 中的人物字段一致。

**Ask First:** 如果需要改变移动端 API 路径/响应结构、调整分享 redaction profile 语义、修改数据库 schema、或统一重构移动端认证，暂停确认。

**Never:** 不放宽分享权限；不让前端/小程序自行过滤敏感字段；不改变已登录用户搜索结果语义；不修改普通 Web 分享页行为。

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| 分享搜索在世人物 | `shareToken` 有效，profile 默认或 `dates:LIVING,note:LIVING`，命中在世人物 | 返回命中人物，但生日、死亡、年龄、备注按 profile 置空；照片按 photo 规则处理 | N/A |
| 分享搜索已故人物 | `shareToken` 有效，命中 `deceased=true` 人物 | 保留默认允许的已故人物日期与备注 | N/A |
| 分享 token 族谱不匹配 | URL `pubId` 与 token 绑定族谱不同 | 保持 403 | 返回现有 ApiResponse 错误格式 |
| 已登录搜索 | 无 `shareToken`，有效登录用户有权限 | 保持现有完整搜索结果行为 | 无权限保持 403 |
| 空搜索词 | `q` 为空白 | 返回空数组，且不泄露任何人物字段 | N/A |

</frozen-after-approval>

## Code Map

- `backend/src/main/java/com/genealogy/server/controller/MobileController.java` -- 移动端搜索入口；已构造 `ShareSubject`，但随后总是搜索 `publicationService.loadPublication(pubId)` 的完整 people。
- `backend/src/main/java/com/genealogy/server/service/PublicationViewProjector.java` -- 已有 `projectRedacted(fullData, ShareSubject, token)` 分享脱敏投影，应用到搜索前即可复用同一策略。
- `backend/src/test/java/com/genealogy/server/controller/MobileControllerTest.java` -- 如存在移动端控制器测试，应在其中增加分享搜索脱敏覆盖；若不存在则新增最小 WebMvcTest。
- `backend/src/test/java/com/genealogy/server/integration/PublicationPrivacyIntegrationTest.java`、`FieldLevelPrivacyTest.java` -- 可作为断言字段脱敏语义的参考。

## Tasks & Acceptance

**Execution:**
- [x] `backend/src/main/java/com/genealogy/server/controller/MobileController.java` -- shareToken 路径在搜索前调用 `PublicationViewProjector.projectRedacted` -- 让移动端分享搜索复用同一脱敏策略。
- [x] `backend/src/test/java/com/genealogy/server/controller/MobileControllerTest.java` -- 增加或更新分享搜索脱敏测试 -- 覆盖在世人物、已故人物、族谱不匹配和空搜索词。
- [x] `backend/src/test/java/com/genealogy/server/controller/MobileControllerTest.java` -- 覆盖已登录用户路径不调用分享脱敏投影 -- 防止误伤完整权限用户体验。

**Acceptance Criteria:**
- Given 有效分享 token 和默认脱敏 profile，when 移动端搜索命中在世人物，then 返回结果不包含其生日、死亡、年龄、备注等敏感字段值。
- Given 有效分享 token 搜索已故人物，when 默认 profile 只脱敏在世人物，then 已故人物的日期与备注仍可见。
- Given URL pubId 与分享 token 绑定族谱不同，when 调用移动端搜索，then 返回 403。
- Given 当前后端代码，when 执行 `cd backend && ./mvnw test`，then 所有后端测试通过。

## Spec Change Log

## Verification

**Commands:**
- `cd backend && ./mvnw test` -- expected: 所有后端单元与集成测试通过。

## Suggested Review Order

**移动端分享搜索脱敏**

- shareToken 路径加载后先投影为脱敏视图。
  [`MobileController.java:170`](../../backend/src/main/java/com/genealogy/server/controller/MobileController.java#L170)

- 搜索只遍历已脱敏 people，避免返回完整 person map。
  [`MobileController.java:178`](../../backend/src/main/java/com/genealogy/server/controller/MobileController.java#L178)

**回归测试**

- 在世人物搜索返回空敏感字段。
  [`MobileControllerTest.java:78`](../../backend/src/test/java/com/genealogy/server/controller/MobileControllerTest.java#L78)

- 已故人物在默认分享策略下保留日期备注。
  [`MobileControllerTest.java:110`](../../backend/src/test/java/com/genealogy/server/controller/MobileControllerTest.java#L110)

- token 族谱不匹配保持 403。
  [`MobileControllerTest.java:140`](../../backend/src/test/java/com/genealogy/server/controller/MobileControllerTest.java#L140)

- 空查询返回空数组，不泄露人物字段。
  [`MobileControllerTest.java:155`](../../backend/src/test/java/com/genealogy/server/controller/MobileControllerTest.java#L155)

- 已登录用户路径跳过分享脱敏并保留完整字段。
  [`MobileControllerTest.java:177`](../../backend/src/test/java/com/genealogy/server/controller/MobileControllerTest.java#L177)
