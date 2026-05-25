# 族谱管理系统 — Agent 指令

Vue 3 + Spring Boot 全栈应用，用于创建、编辑和预览家族族谱出版物。

## 项目结构

```
backend/          Spring Boot 3.3 (Java 17, MySQL, JPA)
frontend/         Vue 3 + Vite 6 + TypeScript
```

## 常用命令

```bash
# 前端开发
cd frontend && npm run dev          # → http://localhost:5173
# 前端类型检查
cd frontend && npx vue-tsc --noEmit
# 前端构建
cd frontend && npm run build
# 后端启动
cd backend && ./mvnw spring-boot:run   # → http://localhost:8080
```

## 关键架构

- **路由**：`src/router/index.ts` — 12 条命名路由，含登录守卫和权限守卫
- **API 层**：`src/api/` — axios 封装，共享 `ApiResponse<T>`，Vite Proxy `/api` → `:8080`
- **状态管理**：Composable 模式（`usePublicationState`、`usePanelState`）
- **认证**：JWT + HttpOnly Refresh Token，`App.vue` 启动时 refresh
- **权限**：OWNER/EDITOR/VIEWER 三态 + 字段级脱敏
- **并发**：JPA `@Version` 乐观锁，409 冲突弹窗
- **以我为中心**：`usePublicationState.setViewerPersonId()` → 亲属称谓实时显示

## 出版引擎

vRain Perl 古籍刻本 PDF 引擎。关键文件：

| 文件 | 作用 |
|------|------|
| `backend/vrain/vrain_mr.pl` | vRain 主脚本 |
| `backend/vrain/canvas/*.cfg` | 12 个画布模板 |
| `backend/.../VrainExportService.java` | Java → vRain 集成 |
| `frontend/src/lib/vrainTemplates.ts` | 前端模板定义 |
| `frontend/src/components/publishing/EntryEditor.vue` | 内容编辑侧面板 |

模板系统：`canvasId` → `generateBookCfg(draft, canvasId)` → 读取 `canvas/{id}.cfg`。

## 关键约定

- 撤销/重做快照使用 `JSON.parse(JSON.stringify())`（`structuredClone` 对 Vue `reactive()` 代理抛出 `DataCloneError`，不得用于快照创建）
- 撤销历史不记录 zoom 变化
- localStorage 操作必须包 try/catch
- 性能/UI 重构采用增量提交策略
- 登录后空白页：先查路由结构+Teleport，再查接口与认证

## 测试

- 后端 122 测试（H2 内存库，全通过）
- 前端 115 单元测试（vitest，0 失败）
- 前端 11 E2E 测试（Playwright，需后端+MySQL）

## 出版引擎开发记录（2026-05-24）

- ✅ 后端：修复 JwtAuthenticationFilter 缺少 userId → 解决创建草稿 500
- ✅ 前端：PublishingDashboard 动态族谱选择器
- ✅ 前端：lineageText.ts 文字世系录 + PageCanvas.vue 传统书版渲染
- ✅ 集成：vRain v1.4 multirows → 世系录→perl→古籍刻本 PDF
- ✅ Windows Perl 环境适配（PATH/DLL/中文文件名）
- 🔵 踩坑记录：`docs/troubleshooting/vrain-integration-pitfalls.md`