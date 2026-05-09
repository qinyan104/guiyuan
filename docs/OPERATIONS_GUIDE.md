# 族谱管理系统 (Genealogy Management System) - 运维与开发手册

## 1. 快速启动

### 后端 (Spring Boot)
```bash
cd backend
./mvnw spring-boot:run
```
- **端口**: 8080
- **关键配置**: `src/main/resources/application.properties` (MySQL 连接, JWT Secret)
- **数据库**: MySQL 8.0, 库名 `genealogy`

### 前端 (Vue 3)
```bash
cd frontend
npm install
npm run dev
```
- **端口**: 5173
- **构建优化**: 已启用增量编译，正式构建运行 `npm run build`

## 2. 核心 API 概览

### 族谱管理 (Publications)
- `GET /api/publications`: 获取列表 (含权限角色)
- `GET /api/publications/{id}`: 获取详情 (支持联邦缝合加载)
- `POST /api/publications/{id}/access/{personId}/merge`: 执行物理分支合并（BFS 子树克隆，支持回退全量）

### 导出与分享
- `POST /api/publications/{id}/export/pdf/single-page`: 生成矢量 PDF
- `GET /api/shares/{token}`: 访问公开分享的族谱

## 3. 常见问题排查 (Troubleshooting)

### 3.1 构建缓慢
- **原因**: TypeScript 全量类型检查。
- **方案**: 确保 `tsconfig.json` 中 `skipLibCheck: true`。开发时始终使用 `npm run dev` 而非反复 `build`。

### 3.2 登录后没有数据
- **原因**: 可能是新账号。
- **解决**: 查看“馆藏谱目”下方的经典王朝模板（唐/明），一键克隆即可生成测试数据。

### 3.3 登录后页面空白或切页后内容消失
- **先确认**: 后端进程已经使用同一份 `JWT_SECRET` 重启；如果在 IDEA 中配置了环境变量，必须重启 Spring Boot 进程。
- **检查请求**: 浏览器 Network 中 `POST /api/auth/login` 应返回 200；受保护接口未认证时应返回 HTTP 401；`POST /api/auth/refresh` 成功时会返回新的 access token。
- **前端机制**: `App.vue` 会先完成 refresh 登录态恢复再渲染页面；后台四个主页面在路由中同步加载，并在子路由未就绪时显示 `Loading page...` 占位，不应出现整块空白。
- **清理旧会话**: 若怀疑历史 token 或 cookie 污染，清理 `authToken` / `authUsername` / `authRole` localStorage 项，以及 `refresh_token` / `XSRF-TOKEN` cookie 后重新登录。
- **2026-05-09 已确认的根因模式**: 若“左侧导航和顶部栏正常，但中间内容区空白”，并且 `/api/publications` 已返回 200 且有数据，这通常**不是认证问题**。优先检查路由页结构：
  - 路由页面是否直接挂在 `router-view` 下
  - 页面内部是否使用了 `Teleport`
  - 该页面是否是**多根节点**
  - 外层布局是否又用 `<transition>` 包裹了该路由页
- **修复原则**: 带 `Teleport` 的路由页必须改成**单根节点**；不要在 `AdminLayout` 这类壳层上对整页路由组件再套过渡动画。
- **受影响过的页面类型**: Dashboard、族谱列表、管理员用户页。这类页面都有弹窗/对话框，后续新增后台页时按同一规则设计。

### 3.4 退出登录后刷新又回到主页
- **预期行为**: 不应回到主页。`/api/auth/logout` 已放行且豁免 CSRF，用于撤销 refresh token 并清除 `refresh_token` cookie。
- **排查重点**: 如果仍复现，查看 `POST /api/auth/logout` 是否为 200，以及响应头是否包含清除 `refresh_token` 的 `Set-Cookie`。

### 3.5 图片显示异常
- **原则**: 系统强制执行 **Uncropped Original Aspect Ratio**。
- **检查**: 确认 `photos` 表中数据完整，且前端 `PublicationCanvas` 的 `preserveAspectRatio` 属性正确。

## 4. 数据库表结构
- `users`: 系统账号
- `publications`: 族谱元数据
- `persons` / `families`: 核心拓扑数据
- `publication_access`: 权限映射表 (OWNER/EDITOR/VIEWER)
- `audit_logs`: 操作审计

---
*本文档面向开发人员与系统管理员。*
