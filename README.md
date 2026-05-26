# 归源 · 族谱管理系统

数字化家族族谱的创建、编辑与出版预览工具。现代界面，无限画布，所见即所得。

> 🖼️ *截图即将添加 — 请将截图放入仓库后替换此处*

## 功能

- **可视化族谱编辑** — 无限画布树形图，支持添加配偶、子女、父母关系，拖拽平移缩放
- **双模式主题** — 浅色 / 暗色，一键切换
- **雅致吊线图** — 紧凑模式，隐藏卡片边框，姓名垂直书法排列，朱砂血脉结与金石印章
- **以我为中心** — 族人登录后自动定位，所有卡片实时显示亲戚称谓（爷爷、堂哥、外甥等）
- **站内协作** — OWNER / EDITOR / VIEWER 权限，分支挂载与合并，乐观锁冲突处理
- **字段级隐私** — 为 VIEWER 配置脱敏规则，支持生卒年、生平笔记、照片三组字段
- **全局搜索** — 搜索人物或族谱标题，前缀优先匹配
- **出版工作室** — 世系录自动排版，传统书版预览（版框/版心/鱼尾），Canvas 2D + pdf-lib 生成仿古刻本 PDF
- **自包含 HTML 分享** — 导出独立 HTML 文件，支持 AES-256-GCM 可选密码保护
- **便携式 JSON 导入/导出** — 头像自动内联 Base64，跨环境完整迁移
- **SVG 导出** — 保留矢量结构，适合排版、审阅
- **数据分析** — 世代分布、寿命统计、家族大事时间线
- **数据备份** — 一键备份并下载数据库

## 环境要求

- Java 17+
- Node.js 18+
- MySQL 8+

## 快速开始（开发）

### 1. 数据库

```sql
CREATE DATABASE genealogy CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

默认连接 `localhost:3306/genealogy`。复制环境变量模板：

```bash
cd backend
cp .env.example .env.local
# 编辑 .env.local 填写数据库连接信息
```

### 2. 启动后端

```bash
cd backend
./mvnw spring-boot:run
```

后端运行在 `http://localhost:8080`，首次启动由 Flyway 自动建表。

### 3. 启动前端

```bash
cd frontend
npm install
npm run dev
```

前端运行在 `http://localhost:5173`，API 自动代理至后端。

### 4. 运行测试

```bash
# 前端单元测试
cd frontend && npm test

# 后端测试
cd backend && ./mvnw test

# E2E 测试（需后端+MySQL 运行中）
cd frontend && npm run test:e2e
```

## Docker 部署

支持 Docker Compose 一键部署，详见 [`release/README.md`](./release/README.md)。

```bash
cp release/.env.example release/.env
# 编辑 release/.env 填写密钥和密码
docker compose --env-file release/.env -f release/docker-compose.yml up --build -d
```

## 技术栈

| 层 | 技术 |
|---|---|
| 前端 | Vue 3, Vite 6, TypeScript, Canvas 2D, pdf-lib |
| 后端 | Spring Boot 3.3, Spring Data JPA, Spring Security, Flyway |
| 数据库 | MySQL 8 |
| 测试 | Vitest, Playwright, JUnit |
| 部署 | Docker, Nginx |

## 导出说明

- **JSON** — 跨环境迁移与备份，头像自动内联 Base64
- **SVG** — 矢量族谱树，适合排版与外部设计加工
- **分享网页** — 自包含 HTML 文件，内嵌族谱树与交互，支持可选密码保护
- **PDF** — 客户端排版引擎生成古籍刻本风格 PDF

## 开源协议

本项目采用 **GNU Affero General Public License v3 (AGPL v3)** 开源。

- ✅ 个人使用、学习、修改：完全自由
- ✅ 自己部署使用：完全自由
- ❌ 将修改后的代码作为闭源 SaaS 服务提供：必须开源修改
- 💼 商业授权（闭源使用）：请联系作者获取商业许可

详见 [LICENSE](./LICENSE)。
