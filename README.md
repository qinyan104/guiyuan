# 归源

**整理家族资料，梳理世系关系，协作修订家谱。**

归源是一款可自行部署的 Web 族谱工作台。你可以录入人物与家庭关系，在世系图中查看和修改资料，邀请协作者参与修订，再将整理结果导出为谱牒正文、图片或离线网页。

适合正在整理家谱的个人、家族修谱负责人，以及需要共同录入和核对资料的小团队。

[功能概览](#功能概览) · [本地体验](#本地体验) · [源码开发](#源码开发) · [生产部署](#生产部署)

![归源工作台：世系图与人物资料编辑](screenshots/工作台.png)

<details>
<summary>查看首页与登录页截图</summary>

![项目首页](screenshots/介绍页1.png)
![首页世系树预览](screenshots/介绍页2.png)
![登录页](screenshots/登录页.png)

</details>

## 功能概览

| 你要完成的事 | 归源提供的功能 |
| --- | --- |
| 整理人物资料 | 录入姓名、生卒、字号、备注和照片，维护配偶、父母与子女关系 |
| 梳理家族世系 | 拖拽、缩放世系图，通过微缩地图定位人物，查看亲属称谓，挂载和合并分支 |
| 检查录入问题 | 检查年龄跨度、出生顺序、世代关系、疑似重复人物与孤立分支 |
| 共同修订 | 管理族谱协作者及访问权限，审核资料变更，查看修改记录；编辑支持撤销、重做和冲突提示 |
| 核对与分享 | 生成分享链接，按配置隐藏在世人物的敏感信息，或导出图片与离线网页 |
| 查看家族概况 | 浏览人物时间线、世代与人口统计，切换界面主题 |

### 从一支家谱开始

1. **建立族谱**：新建一份族谱，或导入已有的归源 JSON 文件。
2. **整理资料**：从主干人物开始补充配偶、父母和子女，在工作台修改人物档案。
3. **核对关系**：查看校验提示，结合原始资料人工核对；需要共同修订时添加协作者。
4. **导出成果**：在工作台的「导出」菜单中选择出版数据、图片、网页或数据文件。

## 导出成果与使用范围

| 格式 | 适合的用途 |
| --- | --- |
| JSON | 保存族谱数据与版式设置，供归源再次导入 |
| Markdown | 按世代、人物、配偶与子女关系生成谱牒正文草稿，继续校订和排版 |
| PNG / SVG | 将世系图用于交流、文档插图或后续排版 |
| 自包含 HTML | 在浏览器中离线查看交互式世系图，可设置访问密码 |
| GEDCOM | 与其他族谱工具交换数据；导入和合并的当前限制见下文 |

工作台的「导出 → 出版数据」页面可以预览和下载 Markdown。后续可在 Typora、Obsidian 中编辑，或将内容整理到 Word、WPS 等工具中完成排版；专业古籍的页式、字体、印刷与装帧由后续工具处理。

当前版本有以下使用边界：

- **复杂家庭关系**：目前限制同一人物作为多个家庭的父母或多个家庭的子女，再婚、收养、过继等关系尚不能完整表达。
- **GEDCOM 导入与合并**：导入文件会作为新人物和新家庭追加到当前族谱，并自动避让现有编号。重复导入会产生重复人物；复杂 GEDCOM 扩展字段仍建议先在测试副本中验证。
- **校验与协作**：规则检查用于发现疑点，仍需结合原始资料核对；多人编辑发生版本冲突时，需要处理冲突后再继续保存。
- **数据保管**：JSON、图片和网页导出各有用途。完整部署的备份还应覆盖数据库与上传文件，见[部署说明](release/README.md#6-数据与备份)。

## 本地体验

使用 Docker Compose 可以一起启动数据库、后端和前端，无需在本机分别安装 Java、Node.js 和 MySQL。首次构建需要联网下载依赖和镜像。

在仓库根目录复制本地开发配置：

```bash
cp release/.env.dev.example release/.env.dev
```

Windows PowerShell 使用：

```powershell
Copy-Item release/.env.dev.example release/.env.dev
```

然后启动服务：

```bash
docker compose --env-file release/.env.dev -f release/docker-compose.dev.yml up --build -d
docker compose --env-file release/.env.dev -f release/docker-compose.dev.yml ps
```

服务就绪后，打开 [http://localhost:5173](http://localhost:5173)。首次初始化的开发管理员账号为 `root`，密码为 `123456`。

> 本地体验配置使用开发凭据和 HTTP，仅用于本地测试。对外部署请使用下文的生产配置。

### 用示例数据试一遍

登录后新建族谱，进入工作台，选择「导入 → 导入 JSON」，载入以下任一文件：

- [100 人示例](samples/performance-test-100-persons.json)：适合熟悉人物编辑、关系查看与导出。
- [500 人示例](samples/performance-test-500-persons.json)：适合体验更多节点下的导航与缩放。

[samples/](samples/) 还包含千人至万人规模的生成数据，用于测试。示例规模不代表已验证的生产性能上限。

停止本地服务：

```bash
docker compose --env-file release/.env.dev -f release/docker-compose.dev.yml down
```

此命令保留数据卷；添加 `-v` 会删除卷中的数据库和上传文件。

## 源码开发

需要修改代码时，可以分别启动后端和前端。

### 环境要求

| 工具 | 版本要求 |
| --- | --- |
| Java | 17 |
| Node.js | 20.19+（20.x）、22.13+（22.x）或 24.x，与当前锁文件中的工具依赖一致 |
| MySQL | 8.0 |
| Maven | 使用仓库自带的 Maven Wrapper，无需单独安装 |

### 1. 准备数据库与配置

在本地 MySQL 中创建数据库：

```sql
CREATE DATABASE genealogy CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

在仓库根目录将 [backend/.env.example](backend/.env.example) 复制为 `backend/.env.local`：

```bash
cp backend/.env.example backend/.env.local
```

PowerShell 对应命令为 `Copy-Item backend/.env.example backend/.env.local`。

编辑 `.env.local`，填写本机的 `DB_URL`、`DB_USERNAME`、`DB_PASSWORD`，并设置 `JWT_SECRET`。签名密钥按原始 UTF-8 文本读取，至少需要 32 字节；不要提交本地配置文件。

后端会自动读取该配置，并由 Flyway 执行数据库迁移。

### 2. 启动后端

在一个终端中，从仓库根目录执行：

```bash
cd backend
./mvnw spring-boot:run
```

Windows PowerShell 将最后一行替换为 `./mvnw.cmd spring-boot:run`。

后端默认监听 `http://localhost:8080`，健康检查地址为 `/api/health`。

### 3. 启动前端

另开一个终端，从仓库根目录执行：

```bash
cd frontend
npm ci
npm run dev
```

打开 [http://localhost:5173](http://localhost:5173)。Vite 将 `/api` 请求代理到本地后端。使用默认端口时，请先停止前面的 Docker 体验环境。

## 生产部署

在仓库根目录将 [release/.env.example](release/.env.example) 复制为 `release/.env`，填写数据库密码、`JWT_SECRET`、实际访问域名对应的 `APP_CORS_ALLOWED_ORIGINS` 和首次管理员密码 `INITIAL_ADMIN_PASSWORD`。

首次管理员密码须为 8–100 个字符，包含大写字母、小写字母和数字。生产配置启用安全 Cookie，需要通过 HTTPS 反向代理访问。

```bash
docker compose --env-file release/.env -f release/docker-compose.yml up --build -d
docker compose --env-file release/.env -f release/docker-compose.yml ps
```

生产管理员用户名为 `root`；首次初始化时使用配置的 `INITIAL_ADMIN_PASSWORD`。数据库和后端通过容器内部网络通信。

源码构建、镜像部署、更新、回滚及备份的操作说明见 [release/README.md](release/README.md)。本地开发与生产 Compose 配置共用服务名和数据卷；切换环境前应确认数据用途并停止现有服务。

## 开发检查

前端命令在 `frontend/` 下执行：

```bash
npm run test           # Vitest 测试
npm run test:coverage  # 覆盖率检查
npm run build          # TypeScript 检查与生产构建
npm run lint           # ESLint 检查
npm run biome:check    # Biome 检查与格式校验
```

后端命令在 `backend/` 下执行；PowerShell 使用 `./mvnw.cmd`：

```bash
./mvnw test
./mvnw package
```

部分后端测试需要 MySQL。完整环境变量与服务配置以 [CI workflow](.github/workflows/ci.yml) 为准。

E2E 测试需要先启动前后端，并准备独立的测试数据库；测试会创建和修改数据。在 `frontend/` 下执行：

```bash
npx playwright install chromium
npm run test:e2e
```

## 技术与目录

- **前端**：Vue 3、TypeScript、Vite、Pinia、Vue Router。
- **后端**：Java 17、Spring Boot 3.3、Spring Security、Spring Data JPA、Flyway。
- **存储与部署**：MySQL 8、Docker Compose、Nginx；部分测试使用 H2。

```text
guiyuan/
├── frontend/
│   ├── src/features/       # 导出、历史、冲突处理、校验等功能模块
│   ├── src/components/     # 工作台与通用组件
│   ├── src/views/          # 页面
│   ├── src/lib/            # 世系布局与亲属计算
│   └── e2e/               # Playwright 测试
├── backend/
│   ├── src/main/java/      # API 与业务逻辑
│   ├── src/main/resources/ # 应用配置与数据库迁移
│   └── src/test/           # 后端测试
├── release/               # 部署配置与操作说明
├── samples/               # 生成的示例与性能测试数据
└── screenshots/           # 项目截图
```

## 反馈与贡献

欢迎通过仓库 Issues 反馈问题或提出建议。复现问题时，请附上操作步骤、预期结果、实际结果和运行环境；涉及族谱数据时，使用脱敏的最小样例，不要上传真实亲属资料或本地密钥。

提交代码变更时，请说明解决的问题、验证方式，以及是否涉及数据格式或数据库迁移。

## 开源协议

本项目采用 GNU Affero General Public License v3（AGPL v3），详见 [LICENSE](LICENSE)。
