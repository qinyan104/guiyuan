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

# 前端测试
cd frontend && npx vitest run       # 运行全部测试
cd frontend && npx vitest           # 监听模式

# 前端类型检查
cd frontend && npx vue-tsc --noEmit

# 前端构建
cd frontend && npm run build

# 后端
cd backend && ./mvnw spring-boot:run   # 启动后端 → http://localhost:8080
```

## 前端架构

- **路由**：`src/router/index.ts` — 7 条路由，含登录守卫和管理员权限守卫
- **API 层**：`src/api/` — axios 封装，使用 `VITE_API_BASE_URL` 环境变量及 Vite Proxy (`/api` -> `8080`)
- **状态管理**：无全局 store，状态分布在 composables 中（usePublicationState、usePanelState 等）
- **核心管理**：`views/PublicationListView.vue` 负责族谱列表 CRUD、元数据管理及**王朝示例模板**（唐/明）的置顶展示与克隆。
- **详情编辑**：`views/PersonDetailView.vue` **纪传体个人志**。移除冗余关系，采用 860px 居中单列布局，提供宣纸纹理、八角头像及**原图不裁剪**渲染。
- **数据分析**：`views/PublicationStatsView.vue` (琥珀看板) 与 `TimelineView.vue` (双轨时间线) 提供深度家族洞察，支持月级精确排序。
- **核心编辑器**：`views/WorkbenchView.vue` 专注排版。支持跨页面视角记忆，取消点击自动跳屏。
- **画布渲染**：`components/PublicationCanvas.vue` — **GPU 加速核心**。采用 `translate3d` 硬件加速，并在拖拽时动态停用阴影滤镜（Filter Culling）。图片强制采用 `meet` 比例展示。
- **数据上下文**：`views/PublicationLayout.vue` **单源事实提供者**。通过 Provide/Inject 共享内存数据与撤销历史，支持多视图秒开。
- **布局引擎**：`lib/layout.ts` — 树形布局算法，根据 settings 计算卡片位置和连线
- **草稿校验**：`features/validation/draftSchema.ts` — 校验 + 归一化（含设置范围 clamp）
- **草稿持久化**：`features/persistence/draftPersistence.ts` — JSON 序列化/反序列化，并在便携式导出时将 `/api/photos/...` 与旧版 `/uploads/...` 头像尽量内联为 Base64
- **导出**：`features/export/publicationExport.ts` — SVG 导出和打印排版

## 后端架构

- 7 个 Controller，全部 `/api/*` 前缀，依赖注入统一使用构造器注入
- Spring Security 放行所有请求，认证由 `AuthInterceptor`（Bearer token）处理；`/api/photos/**` 明确排除拦截，保证浏览器原生 `<img>` / SVG `<image>` 可直接加载头像
- 自定义异常体系：`NotFoundException`(404)、`ForbiddenException`(403)、`BadRequestException`(400)，`GlobalExceptionHandler` 统一映射；未捕获 RuntimeException 返回 500
- Token 存储在内存 `ConcurrentHashMap`，TTL 24 小时，`@Scheduled` 每 10 分钟清理过期 token（`@EnableScheduling` 在主启动类）
- 数据库：MySQL `genealogy`，ddl-auto=update，连接配置在 `application.properties`
- **传输限制**：已提升至 **100MB** (Servlet, Tomcat Post/Swallow size) 以支持带 Base64 图片的族谱导入
- **性能核心**：`PublicationService.loadPublication` 采用 Map 映射实现 **O(1)** 人物查找，支持海量数据极速加载
- **照片导入链路**：`PublicationService.savePersonsAndFamilies` 在新建/导入时支持 Base64、`/api/photos/{id}` 克隆、旧版 `/uploads/...` 文件迁移；更新时复用既有照片记录，避免重复插图
- 文件上传限制：100MB；`FileController` 有扩展名白名单校验（图片/PDF），`PhotoController` 有 MIME 类型校验
- CORS：`allowedOriginPatterns("http://localhost:5173")`，允许凭据
- 审计日志列表使用 JPA `Pageable` 分页（默认每页 50，上限 200）

## 关键约定

- 草稿设置值有范围限制，导入时自动 clamp：cardWidth [142,176]、zoom [0.55,1.35]、fontScale [0.88,1.18] ···
- localStorage 操作必须包 try/catch（隐私模式可能不可用）
- 撤销/重做历史：使用 `structuredClone()` 进行状态深拷贝以确保性能，严禁使用 `JSON.parse(JSON.stringify())` 以防大型族谱卡顿。
- 撤销/重做历史不记录 zoom 变化（zoom 被视为视图状态，非编辑历史）
- 打印导出标题必须经 HTML 转义（`escapeHtml()` 已在 `publicationExport.ts` 中实现）
- 跨机器迁移优先使用“便携式 JSON 导出”；若草稿里仍保留旧版 `/uploads/...` 引用，只有源文件仍在 `backend/uploads/` 时才能在导入阶段补写入数据库
- **性能/UI 重构约定**：涉及核心性能优化或重大 UI 变更时，必须采用**增量提交 (Incremental Commits)** 策略。每完成一个逻辑单元（如计算逻辑、模板应用、清理）即进行一次提交，以便安全回退。

## 已知限制

- Token 存内存，重启后全部失效；仅适合单实例部署
- 草稿关系校验不强制"一人只属于一个家庭"，业务代码默认该前提成立
