# 归源 - Docker 发布包

这个目录是可独立部署的 Docker 发布包，不依赖仓库中的前后端源码。

## 目录内容

```text
release/
  .env.example          # 环境变量模板
  .dockerignore         # Docker 构建忽略文件
  docker-compose.yml    # 服务编排
  backend.Dockerfile    # 后端镜像
  frontend.Dockerfile   # 前端镜像
  nginx.conf            # Nginx 配置
  backend/app.jar       # 预构建的后端 JAR
  frontend/dist/        # 预构建的前端静态资源
```

## 使用步骤

### 1. 复制环境变量

```powershell
Copy-Item .env.example .env
```

### 2. 按需修改 `.env`

至少确认：
- `MYSQL_ROOT_PASSWORD` — 数据库 root 密码
- `MYSQL_DATABASE` — 数据库名
- `MYSQL_USER` / `MYSQL_PASSWORD` — 应用数据库用户
- `JWT_SECRET` — JWT 签名密钥（**至少 32 个字符**，建议 64 个 hex 字符）
- `APP_CORS_ALLOWED_ORIGINS` — 允许跨域的前端地址

### 3. 启动

请在 `release/` 目录下执行，确保读取同目录的 `.env`：

```powershell
docker compose up --build -d
```

如果从仓库根目录启动，请显式指定文件：

```powershell
docker compose --env-file release/.env -f release/docker-compose.yml up --build -d
```

### 4. 检查健康状态

```powershell
docker compose ps
```

当 `db`（healthy）、`backend`（healthy）、`frontend`（healthy）就绪后，访问前端：

```text
http://localhost:5173
```

前端容器通过 Nginx 提供静态站点，映射端口为 `5173:80`。

### 5. 首次使用

默认管理员账号：

| 用户名 | 密码   |
|--------|--------|
| root   | 123456 |

> ⚠️ 首次登录后请及时修改密码。

### 6. 停止

```powershell
docker compose down
```

如果需要连数据卷一起删除：

```powershell
docker compose down -v
```

## 说明

- 前端静态资源已经预先构建完成（Vite build）。
- 后端 `app.jar` 已经预先打包完成（Maven package）。
- 整个 `release/` 目录可以直接复制到另一台机器，只要那台机器安装了 Docker 和 Docker Compose，就可以启动。
- 后端使用 `eclipse-temurin:17-jre-alpine` 轻量镜像，以非 root 用户运行。
- Nginx 已配置 gzip 压缩、安全头和静态资源缓存策略。
- 所有服务均配置了日志轮转（单文件 10MB，保留 3 个）。
- 可通过 `.env` 中的 `JAVA_OPTS` 自定义 JVM 内存参数，默认 `-Xms256m -Xmx512m`。
