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
- **缝合加载 (Stitched Loading)**: `PublicationTreeLoader` 负责在读取时递归（最大深度 3）合并分支数据，并自动处理 ID 命名空间以防冲突。
- **物理合并 (Physical Merge)**: `mergeBranch` 引擎支持将整个分支及其照片、家庭关系物理克隆到主谱中。

### 3.2 导出与出版链路
- **单页矢量 PDF**: 采用后端 iText 引擎，直接将前端传递的 SVG 转换为原比例 PDF，支持超大尺寸（>14400pt）。
- **静态 HTML 分享**: 导出自包含 Vue 运行时的交互式 HTML 文件，支持离线查看。

### 3.3 认证与后台路由
- **双 Token 登录态**: Access Token 由前端放入 `Authorization: Bearer` 请求头，Refresh Token 存于 HttpOnly Cookie 并在 `/api/auth/refresh` 轮换。
- **启动恢复**: 前端入口在渲染受保护路由前先尝试 refresh，会话不可恢复时清理本地登录态并回到登录页。
- **后台页面稳定性**: 后台壳层与 Dashboard、馆藏谱目、用户管理、审计日志、设置页使用同步路由组件；`AdminLayout` 的子路由按 `route.fullPath` 重新挂载，并在组件未解析时显示占位态。

## 4. 数据库设计要点
- **对象级权限**: `publication_access` 表存储用户与族谱的 `OWNER/EDITOR/VIEWER` 关系。
- **照片存储**: `photos` 表采用二进制存储（或文件映射），支持 Base64、URL 引用等多种导入模式。
- **审计日志**: `audit_logs` 记录关键修谱动作。

## 5. 开发约定
- **状态管理**: 优先使用 Composable (`usePublicationState`)。
- **历史记录**: 使用 `structuredClone()` 进行快照，严禁使用 `JSON.parse`。
- **编译优化**: 已启用 `skipLibCheck` 和 `incremental` 模式，前端构建时间约 28s。

## 6. 后续路线图
- [ ] **按子树合并**: 支持物理合并时仅选择分支的某个子树。
- [ ] **权限细化**: 引入更细粒度的“字段级”权限控制（如隐藏生卒年份）。
- [ ] **多端适配**: 进一步优化移动端沉浸式阅读体验。

---
*最后更新日期: 2026-05-08*
