# Docker 部署说明

使用 Docker Compose 一键部署族谱管理系统，包含 MySQL、后端、前端三个服务。

## 目录内容

```text
release/
  .env.example               # 环境变量模板
  .env                        # 你的环境变量（不提交到 Git）
  docker-compose.yml          # 源码部署（本地构建镜像）
  docker-compose.deploy.yml   # 镜像部署（拉取已发布镜像）
  backend.Dockerfile          # 后端镜像构建文件
  frontend.Dockerfile         # 前端镜像构建文件
  nginx.conf                  # Nginx 配置
```

## 1. 准备环境变量

```bash
cp release/.env.example release/.env
```

编辑 `release/.env`，至少修改以下变量：

| 变量 | 说明 | 示例 |
|------|------|------|
| `MYSQL_ROOT_PASSWORD` | MySQL root 密码 | `your-root-password` |
| `MYSQL_PASSWORD` | 应用数据库密码 | `your-db-password` |
| `JWT_SECRET` | JWT 签名密钥（≥32字符） | `openssl rand -base64 64` |
| `APP_CORS_ALLOWED_ORIGINS` | 允许的跨域来源 | `http://localhost:5173` |

> ⚠️ 不要使用 `.env.example` 中的默认值，特别是 `JWT_SECRET`。

## 2. 源码部署（推荐）

适合有完整仓库源码的场景，更新时重新构建镜像。

```bash
docker compose --env-file release/.env -f release/docker-compose.yml up --build -d
```

查看运行状态：

```bash
docker compose --env-file release/.env -f release/docker-compose.yml ps
```

更新：

```bash
git pull
docker compose --env-file release/.env -f release/docker-compose.yml up --build -d
```

停止：

```bash
docker compose --env-file release/.env -f release/docker-compose.yml down
```

## 3. 镜像部署

适合已有镜像仓库时使用，不本地编译源码。

先在 `release/.env` 中填写镜像地址：

```text
BACKEND_IMAGE=your-registry/guiyuan-backend:latest
FRONTEND_IMAGE=your-registry/guiyuan-frontend:latest
```

```bash
docker compose --env-file release/.env -f release/docker-compose.deploy.yml pull
docker compose --env-file release/.env -f release/docker-compose.deploy.yml up -d
```

## 4. 访问

部署完成后，浏览器打开：

```
http://localhost:5173
```

**默认管理员账号：**

| 用户名 | 密码 |
|--------|------|
| root | 123456 |

> ⚠️ 首次登录后请立即修改密码。

## 5. 数据与备份

- `mysql-data` 卷：数据库数据
- `backend-uploads` 卷：上传的照片文件

常规更新不删除数据。只有执行 `down -v` 才会清除数据卷。

## 6. 技术说明

- 后端使用 `eclipse-temurin:17-jre-alpine`，以非 root 用户运行
- 前端通过 Nginx 提供静态站点，已配置 gzip 压缩和安全头
- 所有服务已设置日志轮转（单文件 10MB，保留 3 个）
- 可通过 `JAVA_OPTS` 自定义 JVM 内存参数（默认 `-Xms256m -Xmx512m`）

## 7. 注意事项

- Windows 用户：仓库路径不要包含中文或非 ASCII 字符
- 不要同时运行两套 compose 文件（源码部署和镜像部署互斥）
- 切换部署方式前先停止当前运行的 compose
