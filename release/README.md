# 归源 - Docker 部署说明

当前仓库同时提供两套部署方式：

1. 源码部署：服务器持有完整仓库源码，部署时本地构建镜像。
2. 镜像部署：服务器只拉取已发布镜像，不再本地编译源码。

你现在可以继续使用源码部署；镜像部署入口也已经预留好，等你以后有镜像仓库地址时，填入 `release/.env` 即可启用。

## 目录内容

```text
release/
  .env.example               # 环境变量模板
  docker-compose.yml         # 源码部署（build）
  docker-compose.deploy.yml  # 镜像部署（image）
  backend.Dockerfile         # 后端镜像构建文件
  frontend.Dockerfile        # 前端镜像构建文件
  nginx.conf                 # Nginx 配置
```

## 1. 准备环境变量

请在**仓库根目录**执行：

```powershell
Copy-Item release/.env.example release/.env
```

至少确认这些变量：`MYSQL_ROOT_PASSWORD`、`MYSQL_DATABASE`、`MYSQL_USER`、`MYSQL_PASSWORD`、`JWT_SECRET`、`APP_CORS_ALLOWED_ORIGINS`。

如果你要使用镜像部署，还需要填写 `BACKEND_IMAGE` 和 `FRONTEND_IMAGE`。

`JWT_SECRET` 至少 32 个字符，建议使用 64 个 hex 字符。

## 2. 源码部署

适用场景：当前默认方案。服务器上有完整仓库源码，更新时允许重新构建前后端镜像。

注意：在 Windows 上执行源码部署时，仓库路径不要包含中文或其他非 ASCII 字符。`docker compose up --build` 在这类路径下可能触发 BuildKit / Compose 会话错误，表现为 `x-docker-expose-session-sharedkey` 或类似 header 含非 ASCII 字符的报错。

启动：

```powershell
docker compose --env-file release/.env -f release/docker-compose.yml up --build -d
```

查看状态：

```powershell
docker compose --env-file release/.env -f release/docker-compose.yml ps
```

更新：

```powershell
git pull
docker compose --env-file release/.env -f release/docker-compose.yml up --build -d
```

如果你想少记命令，也可以直接在仓库根目录执行：

```powershell
.\update.ps1
```

这个脚本会优先尝试更新源码，然后执行 `docker compose ... up --build -d` 和 `docker compose ... ps`。

- 如果仓库配置了上游分支，它会直接执行 `git pull`。
- 如果仓库只有一个 remote，但当前分支没有设置 upstream，它会退化为 `git pull <remote> <当前分支>`。
- 如果仓库没有配置 remote，它会跳过 `git pull`，直接按当前本地源码重新部署。

停止：

```powershell
docker compose --env-file release/.env -f release/docker-compose.yml down
```

## 3. 镜像部署

适用场景：以后已有镜像仓库时使用。服务器不再本地编译源码，只负责拉取并运行镜像。

先在 `release/.env` 中填写真实镜像地址，例如：

```text
BACKEND_IMAGE=your-registry/guiyuan-backend:latest
FRONTEND_IMAGE=your-registry/guiyuan-frontend:latest
```

首次启动或切换到镜像部署：

```powershell
docker compose --env-file release/.env -f release/docker-compose.deploy.yml pull
docker compose --env-file release/.env -f release/docker-compose.deploy.yml up -d
```

更新：

```powershell
docker compose --env-file release/.env -f release/docker-compose.deploy.yml pull
docker compose --env-file release/.env -f release/docker-compose.deploy.yml up -d
```

查看状态：

```powershell
docker compose --env-file release/.env -f release/docker-compose.deploy.yml ps
```

停止：

```powershell
docker compose --env-file release/.env -f release/docker-compose.deploy.yml down
```

## 4. 切换方式

不要同时运行两套 compose 文件。

如果要从源码部署切到镜像部署，先停止源码部署：

```powershell
docker compose --env-file release/.env -f release/docker-compose.yml down
docker compose --env-file release/.env -f release/docker-compose.deploy.yml pull
docker compose --env-file release/.env -f release/docker-compose.deploy.yml up -d
```

如果要从镜像部署切回源码部署，顺序相反：

```powershell
docker compose --env-file release/.env -f release/docker-compose.deploy.yml down
docker compose --env-file release/.env -f release/docker-compose.yml up --build -d
```

## 5. 数据与访问

前端访问地址：

```text
http://localhost:5173
```

前端容器通过 Nginx 提供静态站点，端口映射为 `5173:80`。

默认管理员账号：

| 用户名 | 密码   |
|--------|--------|
| root   | 123456 |

> ⚠️ 首次登录后请及时修改密码。

`mysql-data` 和 `backend-uploads` 是命名卷。常规更新不会删除数据；只有执行 `down -v` 才会连同数据库和上传文件一起删除。

## 6. 说明

`docker-compose.yml` 适合当前阶段，依赖仓库源码本地构建。

`docker-compose.deploy.yml` 适合正式镜像发布，依赖 `BACKEND_IMAGE` / `FRONTEND_IMAGE` 指向已存在的镜像仓库地址。

两个 compose 文件使用同一组服务名、容器名和命名卷，因此切换部署方式前必须先停止另一套。

如果你在 Windows 上使用源码部署，建议把仓库放在纯英文路径下，例如 `C:\docker\guiyuan`。不要使用包含中文、全角字符或其他非 ASCII 字符的目录名。

后端使用 `eclipse-temurin:17-jre-alpine` 轻量镜像，以非 root 用户运行。

Nginx 已配置 gzip 压缩、安全头和静态资源缓存策略。

所有服务均配置了日志轮转，单文件 `10MB`，保留 `3` 个。

可通过 `release/.env` 中的 `JAVA_OPTS` 自定义 JVM 内存参数，默认 `-Xms256m -Xmx512m`。
