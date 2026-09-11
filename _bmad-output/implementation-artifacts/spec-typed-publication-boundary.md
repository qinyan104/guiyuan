---
title: '类型化族谱数据边界（Map → record）'
type: 'refactor'
created: '2026-09-11'
status: 'proposed'
review_loop_iteration: 0
baseline_commit: '74e9f74'
context:
  - '{project-root}/AGENTS.md'

---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** 族谱数据在后端以 `Map<String, Object>` 贯穿 controller、service、GEDCOM 与持久化层，同时存在多套并行模型：`model.Person`（JPA 实体）、`types.Person`（record）、`types.PublicationData`、`dto.PublicationSnapshot`，以及已经删掉的 `dto.PersonDTO`。它们字段名并不一致（`PersonDTO` 用 `birthday`/`deathday`，其余用 `birth`/`death`），且大量 `@SuppressWarnings("unchecked")` 强转只在运行时才会炸。`PersonDTO` 的删除和 `PublicationDataMapContractTest` 只是止血，结构性漂移风险仍在。

**Approach:** 分阶段把「族谱数据」这一个核心载荷从裸 Map 收敛到 record：先让 `PublicationSnapshot.publication` 与 service 层签名使用 `PublicationData`，再让 `PublicationViewProjector` 直接在类型化模型上做脱敏，最后评估是否保留 `toMap()` 作为纯序列化出口。全程要求前端拿到的 JSON 结构逐字节不变。

</frozen-after-approval>

## Boundaries & Constraints

**Always:** 保持前端可见的 JSON 结构（camelCase 键名、可选字段缺省行为）完全不变；每一阶段都必须有契约测试或快照测试证明往返等价；保持 Flyway 迁移与 `settings_json` / `publication_info_json` 的落库格式不变。

**Ask First:** 如果需要改动 `publication_data` 的落库 JSON 结构或需要数据迁移、需要改变 GEDCOM 导入对未知字段的处理策略、或需要拆分 `PublicationData` 为读写两种形态时，暂停并确认。

**Never:** 不做一次性大爆炸式替换；不在没有等价性测试的前提下删除 `Map` 入口；不用 `@JsonIgnoreProperties` 之类的配置去"吸收"字段漂移掩盖问题。

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|---|---|---|---|
| 加载族谱 | 存量 `publication_data` JSON（含未知字段） | 反序列化为 `PublicationData` 后返回给前端的 JSON 与改造前逐键一致 | 未知字段必须显式忽略并记录，不得导致 500 |
| 保存族谱 | 前端提交含新增字段的 publication 载荷 | 已建模字段落入实体，未建模字段不静默丢弃（要么报错要么显式忽略） | 类型不匹配返回 400 而非 500 |
| GEDCOM 合并 | 已有族谱 + GEDCOM 导入结果 | 存量人物的照片/挂载点元信息不被往返过程清空 | 缺失字段保持原值，不得写 null |
| 脱敏投影 | VIEWER 读取 | 脱敏规则在类型化模型上与原 Map 实现结果一致 | 规则键缺失时沿用现有默认值 |

## Code Map

- `backend/src/main/java/com/genealogy/server/types/PublicationData.java` -- 类型化载荷与 `fromMap`/`toMap` 边界，改造的收敛点。
- `backend/src/main/java/com/genealogy/server/dto/PublicationSnapshot.java` -- 请求体，`publication`/`settings`/`info` 目前都是裸 Map。
- `backend/src/main/java/com/genealogy/server/service/PublicationService.java`、`PublicationQueryService.java`、`PublicationPersonWriter.java` -- `Map<String, Object>` 的主要消费方（合计 50+ 处）。
- `backend/src/main/java/com/genealogy/server/service/PublicationViewProjector.java` -- 脱敏逻辑全部建立在 Map 强转之上。
- `backend/src/main/java/com/genealogy/server/gedcom/GedcomImportService.java`、`GedcomExportService.java` -- 通过 `PublicationData.fromMap` 进出，是往返丢失字段的高风险路径。
- `backend/src/test/java/com/genealogy/server/types/PublicationDataMapContractTest.java` -- 已建立的往返等价性守卫，改造期间必须持续为绿。

## Tasks & Acceptance

**Execution:**
- [ ] 为 `loadPublication` 的返回值建立黄金快照测试（改造前先固定当前 JSON 形状）。
- [ ] 让 `PublicationSnapshot.publication` 使用 `PublicationData` 反序列化，并保证未知字段被显式处理。
- [ ] 将 `PublicationService.createPublication/updatePublication` 与 `PublicationQueryService` 的载荷参数改为类型化。
- [ ] 让 `PublicationViewProjector` 在类型化模型上执行脱敏，保留现有 Map 入口作为过渡适配层。
- [ ] 收敛 `PublicationPersonWriter` 的字段读取到单一映射点，移除 `@SuppressWarnings("unchecked")`。
- [ ] 评估并移除过渡用的 `toMap()` 调用点，或在 `types` 包内标注其为唯一序列化出口。

**Acceptance Criteria:**
- Given 改造前后的同一份 `publication_data`，when 调用 `GET /api/publications/{id}`，then 响应 JSON 逐键一致（黄金快照测试）。
- Given 前端提交的出版载荷，when 经过一轮 save→load，then 所有已建模字段与改造前完全一致。
- Given GEDCOM 合并已有族谱，when 合并完成，then 存量人物的 `photo_id` 与挂载点元信息保持不变。
- Given VIEWER 访问，when 走脱敏路径，then `dates`/`note`/`photo`/`photoProxy` 规则结果与改造前一致。

## Verification

**Commands:**
- `cd backend && ./mvnw test` -- expected: 全绿，且 `PublicationDataMapContractTest` 在每一阶段通过。
- `cd frontend && npm test && npm run build` -- expected: 前端无需改动即可通过（证明 JSON 契约未变）。

## Suggested Review Order

**契约守卫**

- 先看往返等价性测试，确认改造有安全网。
  [`PublicationDataMapContractTest.java:1`](../../backend/src/test/java/com/genealogy/server/types/PublicationDataMapContractTest.java#L1)

- 再看类型化载荷边界。
  [`PublicationData.java:1`](../../backend/src/main/java/com/genealogy/server/types/PublicationData.java#L1)
