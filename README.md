# 归源 · 族谱管理系统

数字化家族族谱的创建、编辑与出版预览工具。现代界面，无限画布，所见即所得。

![image-20260526212025105](C:\Users\HX\Desktop\guiyuan\screenshots\image-20260526212025105.png)



![image-20260526211421777](C:\Users\HX\Desktop\guiyuan\screenshots\image-20260526211421777.png)

![image-20260526211511161](C:\Users\HX\Desktop\guiyuan\screenshots\image-20260526211511161.png)

![image-20260526211931699](C:\Users\HX\Desktop\guiyuan\screenshots\image-20260526211931699.png)

## 功能

### 🤝 协作与权限
- **站内协作** — OWNER / EDITOR / VIEWER 三级权限，协作者管理
- **分支挂载与合并** — 主谱可设挂载点链接分支族谱，支持选择性子树合并
- **乐观锁冲突处理** — 多人同时编辑不覆盖，冲突时弹窗提示刷新
- **字段级隐私** — 为 VIEWER 配置脱敏规则（生卒年 / 生平笔记 / 照片）

### 👨‍👩‍👧‍👦 族谱编辑
- **无限画布树形图** — 拖拽、缩放、平移，支持数千人规模
- **所见即所得** — 点击人物卡片编辑，双击画布弹出编辑浮层
- **亲属关系实时计算** — 任意两人之间自动推算称谓（爷爷、堂哥、外甥等）
- **Ego-Centered 视图** — 族人登录后自动定位到自己的卡片（金色高亮）
- **雅致吊线图** — 紧凑模式，隐藏卡片边框，姓名垂直书法排列，朱砂血脉结与金石印章

### 📤 导出与分享
- **自包含 HTML 分享** — 导出独立 HTML 文件，内嵌族谱树与交互，支持 AES-256-GCM 密码保护
- **SVG 导出** — 矢量族谱树，适合排版与外部设计加工
- **JSON 导入/导出** — 便携式跨环境迁移，头像自动内联 Base64
- **JSON 草稿** — 支持 File System Access API 原生文件操作

### 📚 出版工作室
- **世系录自动排版** — Token 化排版输出（行号 / 世代 / 姓名 / 生卒 / 配偶 / 子女）
- **传统书版预览** — 版框 / 版心 / 鱼尾 / 中缝，还原古籍刻本神韵
- **客户端排版引擎** — Canvas 2D + pdf-lib 生成仿古刻本 PDF
- **竖排列流** — 右→左，上→下，符合传统中文排版习惯
- **6 款字体** — qiji-combo、HanaMinA/B、小赖等宽宋体、文悦古体仿宋、苹线真宋

### 📊 数据分析
- **琥珀看板** — 世代分布、寿命统计、男女比例
- **双轨时间线** — 家族大事与人物生平对照
- **活动时间线** — 字段级变更 diff，红色删除线 + 绿色高亮

### 🔍 其他
- **全局搜索** — 搜索人物或族谱标题，前缀优先匹配，按族谱分组展示
- **双模式主题** — 浅色 / 暗色，基于 Yohaku 设计令牌体系
- **数据备份** — 超级管理员可一键备份并下载数据库
- **空状态引导** — Dashboard 和主要视图在无数据时显示引导卡片

## 快速开始

### 环境要求

- Java 17+
- Node.js 18+
- MySQL 8+

### 1. 数据库

```sql
CREATE DATABASE genealogy CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

### 2. 后端

```bash
cd backend
cp .env.example .env.local
# 编辑 .env.local 填写数据库连接信息
./mvnw spring-boot:run
```

后端运行在 `http://localhost:8080`，首次启动由 Flyway 自动建表。

### 3. 前端

```bash
cd frontend
npm install
npm run dev
```

浏览器打开 `http://localhost:5173`。默认管理员：`root` / `123456`。

### 4. 导入示例数据

系统自带两份测试数据，可快速体验完整功能：

| 文件 | 人数 | 适合 |
|------|------|------|
| [`samples/performance-test-100-persons.json`](samples/performance-test-100-persons.json) | 100 人 | 快速体验 |
| [`samples/performance-test-500-persons.json`](samples/performance-test-500-persons.json) | 500 人 | 性能测试 |

导入方式：Dashboard → 点击「导入族谱数据」→ 选择 JSON 文件。

### 5. 运行测试

```bash
# 前端单元测试
cd frontend && npm test

# 后端测试
cd backend && ./mvnw test

# E2E 测试（需后端+MySQL 运行中）
cd frontend && npm run test:e2e
```

## Docker 部署

支持 Docker Compose 一键部署，详见 [`release/README.md`](release/README.md)。

```bash
cp release/.env.example release/.env
# 编辑 release/.env，修改 JWT_SECRET 和数据库密码
docker compose --env-file release/.env -f release/docker-compose.yml up --build -d
```

部署完成后访问 `http://localhost:5173`。

## 技术栈

| 层 | 技术 |
|---|---|
| 前端 | Vue 3, Vite 6, TypeScript, Canvas 2D, pdf-lib |
| 后端 | Spring Boot 3.3, Spring Data JPA, Spring Security, Flyway |
| 数据库 | MySQL 8 |
| 测试 | Vitest (177 单元), Playwright (11 E2E), JUnit (122 后端) |
| 部署 | Docker, Docker Compose, Nginx |

## 项目结构

```
.
├── backend/                    # Spring Boot 后端
│   ├── src/main/java/          # Java 源码
│   │   └── com/genealogy/server/
│   │       ├── auth/           # 认证与授权
│   │       ├── config/         # 安全 / CORS / 异常处理
│   │       ├── controller/     # REST 控制器 (16 个)
│   │       ├── dto/            # 数据传输对象
│   │       ├── model/          # JPA 实体
│   │       ├── repository/     # 数据访问层
│   │       ├── security/       # JWT 过滤器
│   │       └── service/        # 业务逻辑层
│   └── src/main/resources/
│       └── db/migration/       # Flyway 数据库迁移
│
├── frontend/                   # Vue 3 前端
│   ├── src/
│   │   ├── api/                # API 调用层
│   │   ├── components/         # 通用组件
│   │   ├── composables/        # 状态管理
│   │   ├── features/           # 功能模块（导出/校验/历史/冲突）
│   │   ├── lib/                # 排版引擎 / 亲属关系算法 / 布局算法
│   │   ├── router/             # 路由配置
│   │   ├── types/              # TypeScript 类型
│   │   └── views/              # 页面组件
│   ├── e2e/                    # Playwright E2E 测试
│   └── public/vrain/fonts/     # 出版字体
│
├── release/                    # Docker 部署
│   ├── docker-compose.yml      # 源码部署
│   ├── backend.Dockerfile
│   ├── frontend.Dockerfile
│   └── nginx.conf
│
├── samples/                    # 示例族谱数据
│   ├── performance-test-100-persons.json
│   └── performance-test-500-persons.json
│
├── LICENSE                     # AGPL v3
└── README.md
```

## 开源协议

本项目采用 **GNU Affero General Public License v3 (AGPL v3)** 开源。

- ✅ 个人使用、学习、修改：完全自由
- ✅ 自己部署使用：完全自由
- ❌ 将修改后的代码作为闭源 SaaS 服务提供：**必须开源修改**
- 💼 商业授权（闭源使用）：请联系作者获取商业许可

详见 [LICENSE](LICENSE)。
