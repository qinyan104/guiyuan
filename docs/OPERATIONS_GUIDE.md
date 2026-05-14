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
- **数据库迁移**: Flyway (`ddl-auto=validate`, `baseline-on-migrate=true`)，迁移脚本在 `db/migration/`

### 前端 (Vue 3)
```bash
cd frontend
npm install
npm run dev
```
- **端口**: 5173
- **构建优化**: 已启用增量编译，正式构建运行 `npm run build`
- **E2E 测试** (需后端+MySQL): `npm run test:e2e`（11 个测试，Playwright + Chromium）

## 2. 核心 API 概览

### 族谱管理 (Publications)
- `GET /api/publications`: 获取列表 (含权限角色)
- `GET /api/publications/{id}`: 获取详情 (支持联邦缝合加载，对 VIEWER 自动应用脱敏)
- `PUT /api/publications/{id}/access/{userId}`: 更新协作者角色或脱敏配置 (`redactionProfile` 字段)
- `POST /api/publications/{id}/access/{personId}/merge`: 执行物理分支合并（BFS 子树克隆，支持回退全量）

### 导出与分享
- 前端正式入口保留 `JSON` 导出、`SVG` 导出与分享网页。
- `GET /api/shares/{token}`: 访问公开分享的族谱

### 1.0 正式版范围
- 前端正式入口仅保留 `JSON`、`SVG` 与 `分享网页`。
- `单页矢量 PDF` 与 `谱书 PDF` 不属于 1.0 正式前端面。
- 独立人物详情页已移除，人物查看与编辑统一回到工作台上下文。

### 健康检查
- `GET /api/health`: Docker 健康检查端点（无需认证，需在 SecurityConfig 放行）

### 数据安全与管理（SUPER_ADMIN）
- `GET /api/admin/backup`: 生成并下载数据库 mysqldump 备份
- `POST /api/admin/restore`: 上传 `.sql` 文件还原数据库（不可逆，需二次确认）
- `GET /api/admin/check-consistency`: 全库一致性扫描（孤立人物、日期矛盾、状态不一致、空家族）

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

### 3.4 Invalid CORS request / 403 Forbidden 登录失败
- **故障现象**: 登录请求返回 403，控制台或 Network 面板显示 `Invalid CORS request` 或 `Access Denied`。日志中可能出现 `Using generated security password` 警告。
- **根因分析**: 
    1. **配置冲突**: 同时在 `WebConfig` (addCorsMappings) 和 `SecurityConfig` 中配置了 CORS，导致过滤器冲突。
    2. **Auth 回退**: 缺少 `UserDetailsService` 导致 Spring Security 进入默认安全模式。
- **解决方案**:
    1. **统一配置**: 所有的 CORS 策略必须集中在 `SecurityConfig.java` 中。
    2. **放行 OPTIONS**: 必须显式允许 `HttpMethod.OPTIONS` 请求通过。
    3. **实现 UserDetailsService**: 确保 `CustomUserDetailsService` 已加载，消除随机密码生成。
    4. **重启**: 必须 **完全停止 (Stop)** 后端进程后再启动，不可直接使用热加载。

### 3.5 退出登录后刷新又回到主页
- **预期行为**: 不应回到主页。`/api/auth/logout` 已放行且豁免 CSRF，用于撤销 refresh token 并清除 `refresh_token` cookie。
- **排查重点**: 如果仍复现，查看 `POST /api/auth/logout` 是否为 200，以及响应头是否包含清除 `refresh_token` 的 `Set-Cookie`。

### 3.6 图片显示异常
- **原则**: 系统强制执行 **Uncropped Original Aspect Ratio**。
- **检查**: 确认 `photos` 表中数据完整，且前端 `PublicationCanvas` 的 `preserveAspectRatio` 属性正确。

### 3.7 Publication 保存冲突 (HTTP 409)
- **症状**：系统弹出全屏模态框，显示"并发修改冲突"或"数据版本冲突"，并提供"立即刷新"按钮。
- **原因**：另一位协作者抢先保存了更新的版本，当前客户端基于过期 revision 提交，后端通过 JPA `@Version` 拒绝了本次请求。
- **操作指引**：点击"立即刷新"按钮，页面将重新加载以获取服务器最新数据。
- **注意**：为防止数据覆盖，冲突发生后必须刷新。刷新前建议通过截图等方式备份当前未保存的重要改动，刷新后需手动重新应用。

### 3.8 数据校验被拒绝
- **症状**：保存人物时弹出错误提示"出生年份不能晚于去世年份"或"已故人物必须填写去世日期"或"检测到循环祖先引用"。
- **V1 出生 > 去世**：检查人物 birth/death 字段的年份是否正确填写。年份从自由文本中提取（支持 `2024`、`2024-01-15`、`2024年1月15日` 等格式）。同年生卒（如婴儿夭折）不会触发此错误。
- **V2 已故无日期**：标记为"已故"（deceased=true）时必须填写去世日期（death）。若不确定具体日期但知道已去世，建议至少填写一个估计年份。
- **V3 循环祖先**：添加父辈关系时检测到循环引用。例如：A 的父辈是 B，而 B 的祖先链中又包含 A。请检查家庭成员关系是否正确。

### 3.9 数据库还原失败
- **症状**：上传 .sql 文件后提示"数据库还原失败"。
- **原因**：
  1. 文件格式不正确（必须是合法的 .sql 文件）
  2. mysql 命令行工具未安装或不在 PATH 中
  3. 数据库连接参数与备份时不匹配
- **解决**：确认文件是从 `GET /api/admin/backup` 下载的备份文件；确认服务器已安装 MySQL 客户端工具；查看服务器日志获取详细错误信息。

### 3.10 数据一致性扫描
- **操作**：SUPER_ADMIN 在设置页点击"开始检查"，系统扫描全库数据。
- **检查项**：
  - 孤立人物：存在于 persons 表但未加入任何家庭
  - 生卒日期矛盾：出生年份晚于去世年份
  - 在世状态矛盾：标记为在世但填写了去世日期
  - 空家族：families 表中存在但无任何成员记录
- **结果**：按类别分组显示，可直接定位到具体人物或家族。

### 3.11 Flyway 校验和不匹配（Docker 部署）
- **症状**：Docker 容器 `guiyuan-backend` 启动失败，日志显示 `FlywayValidateException: Migration checksum mismatch for migration version N` 或 `Detected resolved migration not applied to database: N`。
- **原因**：本地 `db/migration/V*__xxx.sql` 迁移脚本被修改，但 MySQL 数据库中 `flyway_schema_history` 表记录的 checksum 仍是旧值。Docker volume 持久化了数据库，脚本变了但库没变。
- **修复步骤**：
  ```bash
  # 1. 查看当前 flyway_schema_history 记录
  docker compose exec db mysql -u root -p$MYSQL_ROOT_PASSWORD $MYSQL_DATABASE \
    -e "SELECT version, checksum, script FROM flyway_schema_history;"

  # 2. 删除对应版本记录（以 version=1 为例）
  docker compose exec db mysql -u root -p$MYSQL_ROOT_PASSWORD $MYSQL_DATABASE \
    -e "DELETE FROM flyway_schema_history WHERE version='1';"

  # 3. 重启后端，Flyway 将重新执行该迁移并记录新 checksum
  docker compose up -d --build backend
  ```
- **预防**：已执行过的迁移脚本不要直接修改，应创建新版本号的迁移文件（如 `V1.1__add_index.sql`）。若必须修改旧脚本，需同步修复数据库 `flyway_schema_history`。

### 3.12 Docker healthcheck 401（/api/health 未放行）
- **症状**：容器 `guiyuan-backend` 持续 unhealthy，日志显示应用已正常启动，但 healthcheck 超时。
- **原因**：`/api/health` 端点未加入 `SecurityConfig.java` 的 `permitAll()` 列表，curl 访问返回 401。
- **修复**：在 `SecurityConfig.java` 的 `.requestMatchers(...).permitAll()` 中加入 `/api/health`。

## 4. 数据库表结构
- `users`: 系统账号
- `publications`: 族谱元数据
- `persons` / `families`: 核心拓扑数据
- `publication_access`: 权限映射表 (OWNER/EDITOR/VIEWER)
- `audit_logs`: 操作审计

## 5. 分布式协作与分支合并
本系统支持多族谱间的“缝合”查看与数据迁入。

### 5.1 挂载点设置
在工作台编辑人物时，开启“分支挂载”。选择一个目标族谱，当前人物将成为该族谱的“入口”。

### 5.2 精细化子树选择 (2026-05-10 新增)
- **视觉化点选**: 在挂载配置区点击“视觉化指定起点”，可在弹窗中通过地图点选特定的祖先，实现仅挂载该祖先及其后代。
- **按需加载**: 后端 `PublicationTreeLoader` 会根据 `targetRootPersonId` 自动执行 BFS 剪枝，减少冗余数据传输。

### 5.3 物理合并
若具 `OWNER` 权限，可在侧边栏执行“物理合并”。
- **不可逆性**: 系统会将目标分支（全量或指定子树）的数据快照直接克隆至当前谱书，并自动清空挂载点。
- **完整性**: 合并过程会自动递归克隆人物、家庭关系及照片记录。

---
*本文档面向开发人员与系统管理员。*
