---
title: '恢复人物照片的认证加载'
type: 'bugfix'
created: '2026-09-15'
status: 'done'
baseline_commit: 'a1d72a50654559487f285e72ed03799834c941c1'
review_loop_iteration: 0
context:
  - '{project-root}/AGENTS.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** 安全收紧后普通照片接口只接受 Bearer，但画布与人物编辑面板仍使用图片标签直连，造成照片加载失败。

**Approach:** 私有照片通过现有认证客户端获取后供界面显示，共用资源生命周期管理，并保持照片导出兼容。

## Boundaries & Constraints

**Always:** 保留后端照片权限；原始 avatarUrl 保持不变；只将 Blob URL 用于显示；保留 PROJECT_FACTS.md。范围是人物照片及其共享请求、会话和导出依赖。

**Ask First:** 新依赖、后端认证变更、数据库迁移、改变吊线图显示规则。

**Never:** 公开私人照片接口、恢复 refresh cookie 认证普通请求、将 token 写入 URL、修改真实资料、借机优化画布或重做账号头像。

## I/O & Edge-Case Matrix

| 场景 | 输入 | 预期 | 异常处理 |
|---|---|---|---|
| 私有照片 | 同源 /api/photos/数字，含查询参数或绝对地址 | 带认证下载并显示 | 失败不显示旧照片、不永久缓存失败 |
| 非私有图片 | 分享、外域、data、已有 blob 地址 | 显示透传；分享和外域下载不带本地认证 | 不接管外部 Blob 的释放 |
| 多处显示 | 同一私有地址 | 合并请求、共享资源 | 最后使用者释放后回收 |
| 切换与卸载 | 请求未完成即换图或卸载 | 旧结果不得覆盖或泄漏 | 丢弃过期结果 |
| 会话结束 | 退出或刷新失败 | 清空受保护缓存和显示 | 在途结果不得恢复旧照片 |
| 导出 | 照片未加载完或显示使用 Blob | 从原始地址生成可移植输出 | 失败按现有导出流程报错 |

</frozen-after-approval>

## Code Map

- `frontend/src/api/http.ts`：fetchBinaryResource 可复用；同源分享图片目前可能误带认证。
- `frontend/src/api/tokenStore.ts`：会话清理入口；普通 token 续期不能引发全量照片重载。
- `frontend/src/components/PersonCardSvg.vue`：照片节点；保留原始地址供导出读取。
- `frontend/src/components/PersonEditorDrawer.vue`：照片上传后发出原始 URL，显示需接入资源解析。
- `frontend/src/features/export/publicationExport.ts`：SVG 克隆、图片地址校验与嵌入；不能依赖易失效 Blob。
- `frontend/src/views/ShareView.vue`：已将照片改写为分享代理，保留此行为。
- `backend/src/main/java/com/genealogy/server/security/JwtAuthenticationFilter.java`：只读，必须保留 Bearer 边界。

## Tasks & Acceptance

**Execution:**
- [x] `frontend/src/api/http.ts` 及测试：限定资源凭证范围，分享与外域资源不带本地凭证。
- [x] `frontend/src/api/personPhotoResource.ts`、`frontend/src/api/tokenStore.ts` 及测试：实现引用计数、并发复用、失败重试、会话失效回收。
- [x] `frontend/src/composables/usePersonPhoto.ts` 及测试：处理地址变化、启用状态、卸载及异步竞态。
- [x] `frontend/src/components/PersonCardSvg.vue`、`PersonEditorDrawer.vue` 及对应测试：接入显示，不持久化临时地址。
- [x] `frontend/src/features/export/publicationExport.ts` 及测试：使用原始地址补齐图片，覆盖嵌入及非嵌入输出。
- [x] `frontend/e2e/specs/`：增加浏览器回归，模拟受保护图片服务，断言实际认证请求和图片成功加载。

**Acceptance Criteria:**
- Given 有照片且开启卡片照片显示，when 打开画布或编辑面板，then 图片通过认证请求成功显示。
- Given 上传返回新照片地址，when 更新人物并重新加载相同资料，then 显示新照片且原始数据仍为稳定地址。
- Given 残留本地 token，when 获取分享或外域图片，then 不注入 Bearer、不触发认证刷新。
- Given 同时显示与导出，when 换图、卸载或会话结束，then 无旧结果覆盖、无临时地址持久化，导出遵守原始权限。

## Spec Change Log

## Design Notes

显示层租用 Blob，数据层持有原始 URL。按同源私有路径识别，不把任意图片地址送入带认证请求。查询参数保留，以支持换图。会话失效通过轻量通知解耦，避免 tokenStore 反向依赖 HTTP。首选引用归零回收，不引入无界缓存。

## Verification

- `cd frontend && npm run test`：回归测试通过。
- `cd frontend && npm run build`：类型检查与构建通过。
- `cd frontend && npm run lint && npm run biome:check`：检查新增问题，区分既有失败。
- 浏览器隔离验证：模拟照片接口只接受 Bearer，确认图片解码成功；不访问或更改真实族谱。

### 本次执行结果

- 全量 Vitest：80 个文件、383 项测试通过。
- `vue-tsc --noEmit` 与 Vite 构建通过；ESLint、Biome lint 与 format 全部通过。
- `npm run test:e2e:photos`（即 `playwright test --config=e2e/person-photos.config.ts`）：2 项隔离浏览器测试通过，覆盖真实组件照片下载/解码/清理，以及分享、外域请求不带 Bearer/Cookie、不刷新。
- 矩阵覆盖：资源/组合式函数测试覆盖合并、引用释放、失败重试、切换与卸载竞态、会话失效及续期；组件测试覆盖上传稳定地址及显示租用；导出测试覆盖未加载和旧 Blob 的嵌入/非嵌入输出。
- 后端认证、分享代理改写、吊线图规则与 `PROJECT_FACTS.md` 未改动。

### 评审修复（step-04）
- `frontend/src/api/http.ts`：凭证判定改为「同源且非公开分享资源」才带凭证，避免其它同源受保护资源因路径不是 `/api/photos/数字` 而丢失认证；`isSameOriginUrl` 重新成为实际判定依据。
- `frontend/src/api/tokenStore.ts`、`auth.ts`：清理监听器逐个隔离异常，logout 不再重复广播（`clearSession` 已包含）。
- `frontend/src/api/errorClassifier.ts`：识别 fetch 适配器的 `ETIMEDOUT`。
- `frontend/src/components/PersonEditorDrawer.vue`：占位文案按是否有头像区分，避免把「加载中」误示为「未上传」。
- 测试：分享地址改用真实 `/api/shares/{token}/photos/{id}` 形状并直接验证拦截器行为；新增 `src/test-utils/objectUrl.ts` 替代污染全局 `URL` 的 `Object.assign` 写法；头像 `data-original-photo-url` 契约补充注释。
- `frontend/e2e/`：隔离用例改由 `test:e2e:photos` 运行，默认 e2e 配置忽略它们；Cookie 断言改为按 baseURL 推导，并断言 Cookie 确实存在。

## Suggested Review Order

**真实故障点：图片标签拿不到凭证**

- 显示层不再直接使用 `avatarUrl`，而是租用认证下载后的 Blob 地址。
  [`PublicationCanvas/PersonCardSvg.vue:19`](../../frontend/src/components/PersonCardSvg.vue#L19)

- 编辑抽屉同样接入，且占位文案不再把「加载中」说成「未上传」。
  [`PersonEditorDrawer.vue:50`](../../frontend/src/components/PersonEditorDrawer.vue#L50)

**资源请求与凭证边界**

- 私有照片判定只用于「是否需要走认证下载」，不当作通用安全边界。
  [`http.ts:147`](../../frontend/src/api/http.ts#L147)

- 只有跨域或公开分享资源才省略凭证，避免其它同源资源被动降级成匿名请求。
  [`http.ts:176`](../../frontend/src/api/http.ts#L176)

- 凭证判定依赖真实分享路径前缀，而不是把任意非照片地址当作公开资源。
  [`http.ts:157`](../../frontend/src/api/http.ts#L157)

**Blob 生命周期**

- 同地址合并请求、引用计数归零后回收，避免重复下载与泄露。
  [`personPhotoResource.ts:30`](../../frontend/src/api/personPhotoResource.ts#L30)

- 会话失效时统一回收所有租用资源。
  [`personPhotoResource.ts:25`](../../frontend/src/api/personPhotoResource.ts#L25)

- 组合式函数处理地址变化、启用状态与异步竞态。
  [`usePersonPhoto.ts:6`](../../frontend/src/composables/usePersonPhoto.ts#L6)

**会话通知**

- 清理监听器逐个隔离异常，单个监听器报错不会阻断会话清理。
  [`tokenStore.ts:55`](../../frontend/src/api/tokenStore.ts#L55)

- logout 只走 `clearSession()`，不再重复广播监听器。
  [`tokenStore.ts:94`](../../frontend/src/api/tokenStore.ts#L94)

**导出链路**

- 卡片额外保留原始地址，导出不会内嵌已失效的 `blob:`。
  [`PersonCardSvg.vue:492`](../../frontend/src/components/PersonCardSvg.vue#L492)

- 导出优先使用原始地址，并把该属性从输出中移除。
  [`publicationExport.ts:534`](../../frontend/src/features/export/publicationExport.ts#L534)

**附带修复**

- fetch 适配器的超时错误码也归类为超时。
  [`errorClassifier.ts:122`](../../frontend/src/api/errorClassifier.ts#L122)

**测试与守卫**

- 用真实分享路径与拦截器断言替代自说自话的 mock 断言。
  [`http.test.ts:74`](../../frontend/src/api/http.test.ts#L74)

- 新增 URL 桩助手，不再污染全局 `URL` 构造函数。
  [`objectUrl.ts:16`](../../frontend/src/test-utils/objectUrl.ts#L16)

- 隔离用例改由专用脚本运行，默认 e2e 配置不再误收。
  [`playwright.config.ts:6`](../../frontend/e2e/playwright.config.ts#L6)

- 新增 `test:e2e:photos` 入口，让隔离回归可被发现。
  [`package.json:15`](../../frontend/package.json#L15)
