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

**客户端排版引擎**（2026-05-25 重构，替代 vRain Perl/Python 管线）。

### 核心文件

| 文件 | 作用 |
|------|------|
| `frontend/src/lib/bookLayout/BookLayoutEngine.ts` | 排版引擎入口，`layoutSync()` 同步排版 |
| `frontend/src/lib/bookLayout/ColumnFlowEngine.ts` | 竖排列流算法（右→左，上→下） |
| `frontend/src/lib/bookLayout/CanvasRenderer.ts` | Canvas 2D 渲染器（背景/版框/鱼尾/字形） |
| `frontend/src/lib/bookLayout/PageComposer.ts` | 页面合成（装饰元素 + 交互区域） |
| `frontend/src/lib/bookLayout/FontMetricsEngine.ts` | 字体度量（CJK 字符宽度/高度缓存） |
| `frontend/src/lib/bookLayout/types.ts` | 类型定义（Glyph/ComposedPage/LayoutOptions 等） |
| `frontend/src/lib/lineageText.ts` | 世系录文本生成（`computeLineageText` → `formatEntry` 古典格式化） |
| `frontend/src/lib/vrainTemplates.ts` | 12 个画布模板定义 + FONT_OPTIONS |
| `frontend/src/components/publishing/PageCanvas.vue` | Canvas 纸张预览组件（缩放/拖拽/双击编辑） |
| `frontend/src/components/publishing/EntryEditor.vue` | 左侧内容面板（编辑/设置/空白页添加） |
| `frontend/src/components/publishing/BookPageRenderer.vue` | DOM 竖排渲染器（备用，writing-mode: vertical-rl） |
| `frontend/src/components/publishing/StudioToolbar.vue` | 顶部工具栏（模板选择/检索数据/付梓导出/检查器/微调） |

### 排版参数

| 参数 | 默认值 | 范围 |
|------|--------|------|
| 字号 | 48pt | 14–72pt |
| 行距 | 1.4 | 1.0–4.0（步长 0.1） |
| 栏数 | 1 | 1–2 |
| 边距 | standard | compact/standard/loose |
| 默认缩放 | 60% | 10%–200%（滚轮调节） |

### 设置栏开关

| 开关 | 说明 |
|------|------|
| 女:独立 | 女性配偶独立成条目（开启）/ 附于主条目（关闭） |
| 地:隐藏 | 过滤地名信息 |
| 数:汉字 | 阿拉伯数字→汉字（1931→一九三一） |

### 排版控制符

| 字符 | 作用 |
|------|------|
| `\n`（回车） | 换行 |
| `¶`（Pilcrow） | 换列 |
| `§`（Section） | 换页 |

### 文本格式（formatEntry）

古典族谱体例：諱/享壽/元配繼配/長次排行。`branchMode: "uxorilocal"` 时显示"招/贅"。

### 字体

`frontend/public/vrain/fonts/` 下 6 款预加载字体：qiji-combo、HanaMinA/B、小赖等宽宋体、文悦古体仿宋、苹线真宋。

### 关键约定

- 缩放锁定：调字号/行距时 fitScale+center 不变，页面不跳
- Canvas 只渲染当前页条目，溢出自动合并为高页
- 左侧编辑 200ms 去抖后触发右侧刷新
- 双击 Canvas 文字弹出编辑浮层
- PDF 导出使用全部页面条目统一排版

## 测试

- 后端 122 测试（H2 内存库，全通过）
- 前端 115 单元测试（vitest，0 失败）
- 前端 11 E2E 测试（Playwright，需后端+MySQL）