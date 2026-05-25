# 族谱管理系统 (Genealogy Management System) - 架构设计与开发手册

## 1. 项目愿景
打造一个高性能、高美学价值的数字化族谱编修与协作平台，支持分布式协作、矢量化出版以及安全的数据分享。

## 2. 核心技术栈
- **后端**: Spring Boot 3.3, Java 17, Hibernate/JPA, MySQL 8, iText 7 (PDF)
- **前端**: Vue 3, Vite 6, TypeScript, Vanilla CSS (自定义主题系统)
- **安全**: Spring Security, JWT + HttpOnly Refresh Token, AES-256-GCM (快照加密)
- **渲染**: SVG + Canvas (Minimap), GPU 加速 (`translate3d`)

## 3. 系统架构
项目采用**前后端分离**架构，前端通过 `PublicationLayout` 实现单源事实（Single Source of Truth），后端通过 `PublicationAuthorizationService` 提供对象级权限控制。

### 3.1 分布式协作逻辑 (Federated Architecture)
- **挂载点 (Mount Point)**: 允许将族谱中的某个节点标记为“门户”，链接到另一个独立的族谱。
- **缝合加载 (Stitched Loading)**: `PublicationTreeLoader` 负责在读取时递归（最大深度 3）合并分支数据。支持**精细化子树加载**：若挂载点指定了 `targetRootPersonId`，加载器会调用 BFS 收集器进行剪枝。
- **物理合并 (Physical Merge)**: `mergeBranch` 引擎支持将整个分支或**指定子树**及其照片、家庭关系物理克隆到主谱中。

### 3.2 导出与出版链路
- **单页矢量 PDF**: 采用后端 iText 引擎，直接将前端传递的 SVG 转换为原比例 PDF，支持超大尺寸（>14400pt）。
- **静态 HTML 分享**: 导出自包含 Vue 运行时的交互式 HTML 文件，支持离线查看。

### 3.3 认证与后台路由
- **双 Token 登录态**: Access Token 由前端放入 `Authorization: Bearer` 请求头，Refresh Token 存于 HttpOnly Cookie 并在 `/api/auth/refresh` 轮换。
- **启动恢复**: 前端入口在渲染受保护路由前先尝试 refresh，会话不可恢复时清理本地登录态并回到登录页。
- **后台页面稳定性**: 后台壳层与 Dashboard、馆藏谱目、用户管理、审计日志、设置页使用同步路由组件；`AdminLayout` 的子路由按 `route.fullPath` 重新挂载，并在组件未解析时显示占位态。

### 3.4 字段级隐私控制 (Field-Level Privacy)
- **拦截机制**: `PublicationViewProjector` 拦截 `PublicationController.get()` 接口。
- **三态配置**: 支持 `NONE` (公开)、`LIVING` (隐藏在世人员)、`ALL` (全部隐藏) 规则。
- **字段组**: 脱敏分为 `dates` (生卒年/年龄)、`note` (生平笔记/联系方式)、`photo` (头像照片)。
- **安全保障**: 后端置 `null` 方案。由于 `VIEWER` 角色被剥夺了 `EDIT` 权限，脱敏后的残缺数据无法被存回数据库。

### 3.5 并发冲突控制 (Concurrency Control)
- **机制**: 采用 **JPA `@Version`** 乐观锁机制。
- **聚合根保护**: `Publication` 实体作为整个族谱的聚合根。任何对人物 (`Person`) 或家庭 (`Family`) 的修改，都会联动触发 `Publication` 的 `updatedAt` 更新，从而迫使 `revision` 自增。
- **API 约束**: 所有写入 API (`PUT`) 必须携带 `expectedRevision` 负载。后端会校验传入版本与数据库版本是否一致，不匹配则抛出 `ConflictException` (HTTP 409)。
- **前端拦截**: `http.ts` 响应拦截器捕获 409 状态码，并触发全局 `concurrency-conflict` 事件，由 `App.vue` 弹出强制刷新模态框，确保用户不基于过期数据进行覆盖保存。

### 3.6 以我为中心的亲属关系视图 (Ego-Centered Kinship)
- **Ego 识别**：`PublicationLayout` 加载族谱后调用 `listAccounts` 匹配当前登录用户 → 找到对应 `personDbId` → 通过 `usePublicationState.setViewerPersonId()` 注入上下文。
- **称谓计算**：`usePublicationState.kinshipNotes`（computed）基于 `viewerPersonId` 遍历全谱人物，调用 `lib/kinship.ts` 的 `getKinshipLabel()` 生成 `Record<personId, 称谓>` 映射表。管理员或无匹配族人时 `viewerPersonId` 为 null，不计算称谓。
- **卡片渲染**：`PublicationCanvas` → `PersonCardSvg` 通过 `kinshipNote` prop 在卡片 note 区域优先显示称谓（如"爷爷"），Ego 自身显示"本人"并附加 `person-card--ego` 金色发光描边样式。
- **自动定位**：`WorkbenchView` 监听 `viewerPersonId` 首次非空，600ms 延迟后调用 `revealPersonInCanvas()` 滚动画布至 Ego 位置。


### 3.7 出版引擎 (Publishing Engine)
- **文字世系录**：`lineageText.ts` 替代旧 `traditionalLayout.ts`，Token 化排版输出（行号/世代/姓名/生卒/配偶/子女）。
- **传统书版渲染**：`PageCanvas.vue` 重写为书版模式（版框/版心/鱼尾/中缝），SVG 渲染世系录条目。
- **vRain 集成**：`VrainExportService.java` 将世系录文本→vRain 格式→`book.cfg`→Perl 脚本→古籍刻本 PDF。
- **模板系统**：12 个 vRain 画布模板（`canvas/{id}.cfg`），`canvasId` 参数动态选择排版样式。
- **字体**：`qiji-combo.ttf` (39MB CJK)，PDFBox 3.0.4 渲染。
- **环境依赖**：Strawberry Perl 5.40 + ImageMagick。

## 4. 数据库设计要点
- **对象级权限**: `publication_access` 表存储用户与族谱的 `OWNER/EDITOR/VIEWER` 关系，并存储 `redaction_profile` JSON 脱敏配置。
- **照片存储**: `photos` 表采用二进制存储（或文件映射），支持 Base64、URL 引用等多种导入模式。
- **审计日志**: `audit_logs` 记录关键修谱动作。

## 5. 开发约定
- **状态管理**: 优先使用 Composable (`usePublicationState`)。
- **历史记录**: 创建快照时使用 `JSON.parse(JSON.stringify())`（`structuredClone` 会因 Vue reactive 代理的 `[[ProxyHandler]]` 内部插槽抛出 `DataCloneError`）。
- **性能优化**: `PublicationAuthorizationService` 使用 **Request-Level Caching** 缓存权限对象，避免单次请求内重复查询数据库。
- **编译优化**: 已启用 `skipLibCheck` 和 `incremental` 模式，前端构建时间约 28s。

## 6. 后续路线图

- [x] **字段级权限**: 引入更细粒度的"字段级"隐私控制。
- [x] **按子树合并**: 支持物理合并时仅选择分支的某个子树。
- [x] **并发冲突处理**: 后端引入乐观锁（ETag/Version）防止多人同时编辑导致的覆盖。
- [x] **Ego-Centered 亲属视图**: 登录族人自动定位+亲属称谓实时显示。
- [x] **出版引擎**: vRain 古籍刻本 PDF 生成（文字世系录→传统书版→付梓导出）。
- [ ] **多端适配**: 进一步优化移动端沉浸式阅读体验。


---
*最后更新日期: 2026-05-24*
