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
- **API 层**：`src/api/` — axios 封装，baseURL 硬编码 `http://localhost:8080/api`，无 Vite proxy
- **状态管理**：无全局 store，状态分布在 composables 中（usePublicationState、usePanelState 等）
- **核心编辑器**：`views/WorkbenchView.vue` 协调 composables（历史、持久化、文件操作、关系编辑）
- **布局引擎**：`lib/layout.ts` — 树形布局算法，根据 settings 计算卡片位置和连线
- **草稿校验**：`features/validation/draftSchema.ts` — 校验 + 归一化（含设置范围 clamp）
- **草稿持久化**：`features/persistence/draftPersistence.ts` — JSON 序列化/反序列化
- **导出**：`features/export/publicationExport.ts` — SVG 导出和打印排版

## 后端架构

- 7 个 Controller，全部 `/api/*` 前缀，依赖注入统一使用构造器注入
- Spring Security 放行所有请求，认证由 `AuthInterceptor`（Bearer token）处理
- 自定义异常体系：`NotFoundException`(404)、`ForbiddenException`(403)、`BadRequestException`(400)，`GlobalExceptionHandler` 统一映射；未捕获 RuntimeException 返回 500
- Token 存储在内存 `ConcurrentHashMap`，TTL 24 小时，`@Scheduled` 每 10 分钟清理过期 token（`@EnableScheduling` 在主启动类）
- 数据库：MySQL `genealogy`，ddl-auto=update，连接配置在 `application.properties`
- 文件上传限制：10MB；`FileController` 有扩展名白名单校验（图片/PDF），`PhotoController` 有 MIME 类型校验
- CORS：`allowedOriginPatterns("http://localhost:5173")`，允许凭据
- 审计日志列表使用 JPA `Pageable` 分页（默认每页 50，上限 200）

## 关键约定

- 草稿设置值有范围限制，导入时自动 clamp：cardWidth [142,176]、zoom [0.55,1.35]、fontScale [0.88,1.18]、paddingX [72,220]、paddingY [48,180]
- localStorage 操作必须包 try/catch（隐私模式可能不可用）
- 撤销/重做历史：使用 `structuredClone()` 进行状态深拷贝以确保性能，严禁使用 `JSON.parse(JSON.stringify())` 以防大型族谱卡顿。
- 撤销/重做历史不记录 zoom 变化（zoom 被视为视图状态，非编辑历史）
- 打印导出标题必须经 HTML 转义（`escapeHtml()` 已在 `publicationExport.ts` 中实现）

## 已知限制

- 前端 API baseURL 硬编码为 `http://localhost:8080/api`，无环境变量切换机制
- Token 存内存，重启后全部失效；仅适合单实例部署
- 草稿关系校验不强制"一人只属于一个家庭"，业务代码默认该前提成立
