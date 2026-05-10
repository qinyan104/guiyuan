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

## 4. 数据库设计要点
- **对象级权限**: `publication_access` 表存储用户与族谱的 `OWNER/EDITOR/VIEWER` 关系，并存储 `redaction_profile` JSON 脱敏配置。
- **照片存储**: `photos` 表采用二进制存储（或文件映射），支持 Base64、URL 引用等多种导入模式。
- **审计日志**: `audit_logs` 记录关键修谱动作。

## 5. 开发约定
- **状态管理**: 优先使用 Composable (`usePublicationState`)。
- **历史记录**: 使用 `structuredClone()` 进行快照，严禁使用 `JSON.parse`。
- **性能优化**: `PublicationAuthorizationService` 使用 **Request-Level Caching** 缓存权限对象，避免单次请求内重复查询数据库。
- **编译优化**: 已启用 `skipLibCheck` 和 `incremental` 模式，前端构建时间约 28s。

## 6. 后续路线图
- [x] **字段级权限**: 引入更细粒度的“字段级”隐私控制。
- [x] **按子树合并**: 支持物理合并时仅选择分支的某个子树。
- [x] **并发冲突处理**: 后端引入乐观锁（ETag/Version）防止多人同时编辑导致的覆盖。
- [ ] **多端适配**: 进一步优化移动端沉浸式阅读体验。


---
*最后更新日期: 2026-05-10*
