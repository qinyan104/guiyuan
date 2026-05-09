# 族谱管理系统

Vue 3 + Spring Boot 全栈应用，用于创建、编辑和预览家族族谱出版物。

## 项目结构

```
backend/          Spring Boot 3.3 (Java 17, MySQL, JPA)
frontend/         Vue 3 + Vite 6 + TypeScript
```

## 常用命令

```bash
# 前端开发
cd frontend && npm run dev          # 启动 Vite 开发服务器 → http://localhost:5173

# 前端类型检查
cd frontend && npx vue-tsc --noEmit

# 前端构建
cd frontend && npm run build

# 后端
cd backend && ./mvnw spring-boot:run   # 启动后端 → http://localhost:8080
```

## 测试

```bash
# 后端全量测试
cd backend && ./mvnw test

# 后端指定测试类
cd backend && ./mvnw test -Dtest="JwtServiceTest,ShareLinkServiceTest"

# 前端全量测试
cd frontend && npx vitest run

# 前端监听模式
cd frontend && npx vitest
```

**测试现状：** 后端 96 个测试（含 2 个 `@Disabled` 需 MySQL），前端 74 个测试（含 Vue 组件测试。环境：jsdom + @vue/test-utils）。需 MySQL 的 `@SpringBootTest` 测试在无数据库环境自动跳过。

## 前端架构

- **路由**：`src/router/index.ts` — 12 条命名路由，含登录守卫和管理员权限守卫。后台壳层及后台四个主页面采用同步组件加载，避免登录后和后台页切换时出现异步子路由空白。
- **路由页结构约束**：直接挂在 `router-view` 下的页面组件若包含 `Teleport`，必须保持**单一根节点**；`AdminLayout` 不再对这类路由页套额外 `<transition>`。否则可能出现“接口成功、路由正常、但内容区空白”的渲染假象，尤其容易被误判为登录认证问题。
- **API 层**：`src/api/` — axios 封装，共享 `ApiResponse<T>` 类型（`types/api.ts`），使用 Vite Proxy (`/api` -> `8080`）
- **认证恢复**：`App.vue` 启动时先调用 `/api/auth/refresh` 恢复 access token，再渲染受保护路由；若旧 token 无法刷新，会清理本地会话并跳回登录页。`AdminLayout` 退出登录必须等待 `/api/auth/logout` 完成后再跳转登录页。
- **状态管理**：无全局 store，状态分布在 composables 中（usePublicationState、usePanelState 等）
- **核心管理**：`views/PublicationListView.vue` 负责族谱列表 CRUD、元数据管理及**王朝示例模板**（唐/明）的置顶展示与克隆。
- **详情编辑**：`views/PersonDetailView.vue` **纪传体个人志**。移除冗余关系，采用 860px 居中单列布局，提供宣纸纹理、八角头像及**原图不裁剪**渲染。
- **数据分析**：`views/PublicationStatsView.vue` (琥珀看板) 与 `TimelineView.vue` (双轨时间线) 提供深度家族洞察，支持月级精确排序。
- **空状态引导**：Dashboard、族谱列表、时间线、统计视图在无数据时展示引导卡片/提示文字和操作入口，降低首次使用门槛。
- **核心编辑器**：`views/WorkbenchView.vue` 专注排版。支持跨页面视角记忆，取消点击自动跳屏。
- **全局搜索**：`components/GlobalSearch.vue` 集成在 `AdminLayout` 顶栏，300ms debounce，搜索人物/族谱标题，结果分组展示，点击跳转对应视图。后端 `search/` 包（`SearchController` + `SearchService` + `SearchResult` DTO）提供 `GET /api/search?q=` 端点。**设计要点原则**：前缀匹配优先于子串匹配。
- **画布渲染**：`components/PublicationCanvas.vue` — **GPU 加速核心**。采用 `translate3d` 硬件加速，并在拖拽时动态停用阴影滤镜（Filter Culling）。图片强制采用 `meet` 比例展示。
- **数据上下文**：`views/PublicationLayout.vue` **单源事实提供者**。通过 Provide/Inject 共享内存数据与撤销历史，支持多视图秒开。
- **联邦协作**：支持“分支挂载点”系统。`PersonCardSvg.vue` 识别 `isMountPoint` 渲染门户节点（蓝色虚线/图标）；`BranchMountManager.vue`（集成在 `PersonEditorDrawer.vue`）负责管理挂载与触发合并。**UI 优化 (2026-05-09)**：采用定制的分组下拉菜单选择目标，并将高风险的“物理合并”操作隔离在独立的“高级合并操作”区块。
- **布局引擎**：`lib/layout.ts` — 树形布局算法，根据 settings 计算卡片位置 and 连线
- **草稿校验**：`features/validation/draftSchema.ts` — 校验 + 归一化（含设置范围 clamp）。另含**跨家庭重复校验**：一个人不能同时是多个家庭的 parents 或 children（但可同时是 parent 和 child，多代际正常）。`publicationOperations.ts` 中的关系操作自动调用 `deduplicateCrossFamily()` 清理。
- 草稿持久化：`features/persistence/draftPersistence.ts` — JSON 序列化/反序列化，并在便携式导出时将 `/api/photos/...` 与旧版 `/uploads/...` 头像尽量内联为 Base64
- **导出**：`features/export/publicationExport.ts` — SVG 导出和打印排版；`features/export/shareHtmlExport.ts` — 自包含 HTML 快照分享（AES-256-GCM 可选密码保护）；`features/export/ExportDialog.vue` 现在提供**单页矢量 PDF**（由后端生成）、多页谱书实验室与**分享网页**导出。

## 后端架构

- 12 个 Controller（含 `SearchController`、`SharePublicationController`、`PublicationAccessController`、`UserController`），全部 `/api/*` 前缀，依赖注入统一使用构造器注入
- Spring Security 完整 filter chain：`JwtAuthenticationFilter`（JWT 验签 + SecurityContext）、`LoginRateLimitFilter`（IP 限流 10次/5分钟）。`/api/auth/login`、`/api/auth/register`、`/api/auth/refresh`、`/api/auth/logout`、`GET /api/photos/**`、`/api/shares/**` 明确放行；其余 `/api/**` 需认证。未认证访问受保护 API 返回 HTTP 401，供前端触发 refresh/retry。CSRF 启用（`CookieCsrfTokenRepository`，auth 登录/注册/刷新/退出豁免）。安全头：X-Frame-Options DENY、X-Content-Type-Options、Referrer-Policy、Permissions-Policy
- **资源级授权**：`PublicationAuthorizationService` 基于 `publication_access` 表实现对象级权限控制。每个 publication 端点在执行前调用 `require(subject, pubId, permission)`，无权限均返回 403（IDOR 防护）。`auth` 包提供 `AccessSubject`（`UserSubject`/`ShareSubject`）、`AccessPermission`（9 个动作枚举）。创建族谱时自动写入 OWNER 记录，`AccessControlMigrationRunner` 启动时回填历史数据。
- 自定义异常体系：`NotFoundException`(404)、`ForbiddenException`(403)、`BadRequestException`(400)，`GlobalExceptionHandler` 统一映射；未捕获 RuntimeException 返回 500
- **JWT + Refresh Token 双 Token 体系**：Access Token (JWT, HS256, 15分钟) 通过 `Authorization: Bearer` 请求头传输；Refresh Token (SecureRandom 32字节, 30天) 存 `refresh_tokens` 表（仅存 SHA-256 哈希），通过 HttpOnly Cookie 传输。Refresh Token 单次使用（用后轮换）。`JwtService` 负责签发/验证，`RefreshTokenService` 负责生命周期管理
- 数据库：MySQL `genealogy`，ddl-auto=update，连接配置在 `application.properties`。表含 `publications`、`persons`、`families`、`family_members`、`photos`、`users`、`audit_logs`、`publication_access`、`refresh_tokens`
- **传输限制**：已提升至 **100MB** (Servlet, Tomcat Post/Swallow size) 以支持带 Base64 图片的族谱导入
- **PDF 生成**：集成 **iText 7** (kernel, io, layout, svg)。
    - `POST /api/publications/{id}/export/pdf`: 生成多页谱书 PDF（含标题、前言、成员志、切片图）。
    - `POST /api/publications/{id}/export/pdf/single-page`: 接收 `svgMarkup` 与宽高，生成**全尺寸、单页、无边框矢量 PDF**。
- **性能核心**：`PublicationService.loadPublication` 采用 Map 映射实现 **O(1)** 人物查找，支持海量数据极速加载。集成 `PublicationTreeLoader` 递归加载分支挂载数据。
- **照片服务**：`PhotoService` 统一管理 Base64 头像解析、`/api/photos/` 克隆、旧版 `/uploads/` 路径迁移。`PublicationService` 通过 `photoService` 委托照片操作。
- **合并引擎**：`PublicationService.mergeBranch` 实现物理数据迁入。使用 BFS 从根人物向后遍历收集子树，默认只克隆被遍历到的人物和家庭，未指定根人物时自动回退全量复制。使用 UUID 前缀 (`merged_{targetPubId}_*`) 进行 ID 重映射防冲突，递归克隆人物、家庭及照片记录。合并后会自动清空挂载点元数据。
- **照片导入链路**：`PublicationService.savePersonsAndFamilies` 委托 `PhotoService.handlePersonAvatar` 在新建/导入时支持 Base64、`/api/photos/{id}` 克隆、旧版 `/uploads/...` 文件迁移；更新时复用既有照片记录，避免重复插图
- **角色权限映射**：`OWNER` = 全部 9 权限，`EDITOR` = 读+编辑+历史+导出，`VIEWER` = 读+历史。匿名分享仅允许 `READ_REDACTED` / `EXPORT_REDACTED`。管理员端点使用 `@PreAuthorize("hasRole('ADMIN')")` / `hasRole('SUPER_ADMIN')` 声明式权限。分支合并要求对主族谱具 `OWNER` 权限，对分支具 `VIEWER` 权限。
- 文件上传限制：100MB；`FileController` 有扩展名白名单校验（图片/PDF），`PhotoController` 有 MIME 类型校验
- CORS：由 `app.cors.allowed-origins` 配置（默认 `http://localhost:5173`），允许凭据，暴露 `Set-Cookie` 响应头
- 审计日志列表使用 JPA `Pageable` 分页（默认每页 50，上限 200）

## 关键约定

- 草稿设置值有范围限制，导入时自动 clamp：cardWidth [142,176]、zoom [0.55,1.35]、fontScale [0.88,1.18] ···
- localStorage 操作必须包 try/catch（隐私模式可能不可用）
- 撤销/重做历史：使用 `structuredClone()` 进行状态深拷贝以确保性能，严禁使用 `JSON.parse(JSON.stringify())` 以防大型族谱卡顿。
- 撤销/重做历史不记录 zoom 变化（zoom 被视为视图状态，非编辑历史）
- 打印导出标题必须经 HTML 转义（`escapeHtml()` 已在 `publicationExport.ts` 中实现）
- 跨机器迁移优先使用“便携式 JSON 导出”；若草稿里仍保留旧版 `/uploads/...` 引用，只有源文件仍在 `backend/uploads/` 时才能在导入阶段补写入数据库
- **性能/UI 重构约定**：涉及核心性能优化或重大 UI 变更时，必须采用**增量提交 (Incremental Commits)** 策略。每完成一个逻辑单元（如计算逻辑、模板应用、清理）即进行一次提交，以便安全回退。
- **登录后空白页排查顺序**：先看路由组件结构和 `router-view` 包装层，再看接口与认证。若左侧导航/顶栏正常、`GET /api/publications` 已返回数据，但中间空白，优先检查页面是否为多根节点、是否带 `Teleport`、是否被过渡组件包裹。

## 已知限制

- JWT 密钥（`app.jwt.secret`）无默认值，必须通过 `JWT_SECRET` 环境变量配置（开发环境也需要）
