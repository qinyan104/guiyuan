# 族谱管理系统

家族族谱的创建、编辑与出版预览工具。

## 功能

- 可视化族谱树编辑器，支持添加配偶、子女、父母关系
- 多主题切换（古卷、水墨、青瓷、檀木等 7 套）
- **便携式 JSON 导入/导出**：导出时自动将 `/api/photos/...` 与旧版 `/uploads/...` 人物头像转换为 Base64 嵌入，支持跨环境完整迁移
- JSON 草稿导入/导出，支持 File System Access API 原生文件操作
- SVG 导出和 A3/A4 打印排版
- 族谱信息管理（简介、起源地、堂号、家训）
- 数据分析与可视化（世代分布、寿命统计、家族大事时间线）
- 用户登录、管理员后台（用户管理、审计日志）

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

默认连接 `localhost:3306/genealogy`，用户名 `root`，密码 `123456`。可通过环境变量覆盖：

```bash
export DB_USERNAME=your_user
export DB_PASSWORD=your_password
```

### 2. 启动后端

```bash
cd backend
./mvnw spring-boot:run
```

后端运行在 `http://localhost:8080`，首次启动自动建表。

### 3. 启动前端

```bash
cd frontend
npm install
npm run dev
```

前端运行在 `http://localhost:5173`，打开浏览器访问即可。API 请求将自动代理至 `localhost:8080`。如需更改后端地址，可修改 `frontend/.env.development` 中的 `VITE_API_BASE_URL`。

### 4. 导入导出照片说明

- 便携式 JSON 导出会优先把可访问的人物头像内联为 Base64，包括数据库照片接口 `/api/photos/{id}` 和旧版上传目录 `/uploads/...`。
- 导入 JSON 时，后端支持三类头像来源：Base64、当前库内的 `/api/photos/{id}` 引用、旧版 `/uploads/...` 文件路径。
- 若导入文件里的头像仍指向旧版 `/uploads/...`，则对应源文件必须仍存在于后端 `backend/uploads/` 目录，导入时才可迁移进 `photos` 表。

## 技术栈

| 层 | 技术 |
|---|---|
| 前端 | Vue 3, Vite 6, TypeScript, vue-router, axios |
| 后端 | Spring Boot 3.3, Spring Data JPA, Spring Security |
| 数据库 | MySQL 8 |
| 构建 | Maven (后端), Vite (前端) |
