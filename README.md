# 族谱管理系统

家族族谱的创建、编辑与出版预览工具。

## 功能

- 可视化族谱树编辑器，支持添加配偶、子女、父母关系
- 多主题切换（古卷、水墨、青瓷、檀木等 7 套）
- **便携式 JSON 导入/导出**：导出时自动将 `/api/photos/...` 与旧版 `/uploads/...` 人物头像转换为 Base64 嵌入，支持跨环境完整迁移
- JSON 草稿导入/导出，支持 File System Access API 原生文件操作
- SVG 导出、单页全尺寸矢量 PDF 导出及 A3/A4 多页打印排版
- **自包含 HTML 快照分享**：导出独立 HTML 文件，无需服务器即可在任何浏览器查看交互式族谱，支持 AES-256-GCM 可选密码保护
- 族谱信息管理（简介、起源地、堂号、家训）
- 数据分析与可视化（世代分布、寿命统计、家族大事时间线）
- 用户登录、管理员后台（用户管理、审计日志）
- **站内协作与分支合并**：支持 `OWNER` / `EDITOR` / `VIEWER` 协作者授权；主谱可把人物设为挂载点，选择目标族谱，并按快照执行人物、家庭与照片的物理合并
- **全局搜索**：在顶栏搜索人物或族谱标题，前缀优先匹配，按族谱分组展示结果
- **空状态引导**：Dashboard 和主要视图在无数据时显示引导卡片和操作入口
- **头像设置**：个人设置页支持上传自定义头像
- **数据备份**：超级管理员可在设置页一键备份并下载数据库

## 环境要求

- Java 17+
- Node.js 18+
- MySQL 8+

## 快速开始

### 1. 数据库

创建 MySQL 数据库：

```sql
CREATE DATABASE genealogy CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

默认连接 `localhost:3306/genealogy`，用户名 `root`（均可通过环境变量覆盖）。**必须配置 `DB_PASSWORD` 环境变量**，无默认密码：

```bash
export DB_USERNAME=root
export DB_PASSWORD=your_password
# 开发和生产环境都必须配置，IDEA 启动配置中也要保持一致：
export JWT_SECRET=your-256-bit-secret-key
```

### 2. 启动后端

```bash
cd backend
./mvnw spring-boot:run
```

后端运行在 `http://localhost:8080`，首次启动自动建表。

**注意：** 为了支持 PDF 导出中的中文字体，服务器环境需安装中文字体（如微软雅黑、宋体或思源黑体）。系统会自动尝试从 Windows/macOS/Linux 标准路径加载常用字体。

### 3. 启动前端

```bash
cd frontend
npm install
npm run dev
```

前端运行在 `http://localhost:5173`，打开浏览器访问即可。API 请求将自动代理至 `localhost:8080`。如需更改后端地址，可修改 `frontend/.env.development` 中的 `VITE_API_BASE_URL`。

**前端结构约束：** 作为 `router-view` 直接承载的页面组件如果内部使用了 `Teleport`（例如弹窗、浮层），必须保持**单一根节点**。不要再用额外的路由过渡层去包裹这类页面，否则可能出现“登录后接口已成功、左侧导航正常、但中间内容区空白”的假性认证问题。

### 4. 导出说明

- **单页矢量 PDF**：替换了原有的像素 PNG 导出。它会根据族谱实际宽高动态生成一个 PDF 页面，保证无限放大不失真，适合专业打印或跨端浏览。
- **谱书实验室**：支持多页 A4 导出，包含前言和成员志，适合打印装订成册。
- **分享网页**：生成一个独立的自包含 HTML 文件，内嵌 SVG 族谱树、人物照片（Base64）和交互脚本（缩放/平移/点击详情）。可选 AES-256-GCM 密码保护（PBKDF2 10 万次迭代派生密钥）。无需服务器，直接用浏览器打开即可查看。

### 5. 导入导出照片说明

- 便携式 JSON 导出会优先把可访问的人物头像内联为 Base64，包括数据库照片接口 `/api/photos/{id}` 和旧版上传目录 `/uploads/...`。
- 导入 JSON 时，后端支持三类头像来源：Base64、当前库内的 `/api/photos/{id}` 引用、旧版 `/uploads/...` 文件路径。
- 若导入文件里的头像仍指向旧版 `/uploads/...`，则对应源文件必须仍存在于后端 `backend/uploads/` 目录，导入时才可迁移进 `photos` 表。

## 技术栈

| 层 | 技术 |
|---|---|
| 前端 | Vue 3, Vite 6, TypeScript, vue-router, axios |
| 后端 | Spring Boot 3.3, Spring Data JPA, Spring Security, iText 7 |
| 数据库 | MySQL 8 |
| 构建 | Maven (后端), Vite (前端) |
