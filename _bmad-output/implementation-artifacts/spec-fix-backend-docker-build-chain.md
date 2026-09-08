---
title: '修复后端 Docker 构建链路'
type: 'chore'
created: '2026-09-08'
status: 'in-review'
review_loop_iteration: 0
baseline_commit: '69c0d67dcbb0a92f18feeebb5688262943d020ac'
context:
  - '{project-root}/AGENTS.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** `release/backend.Dockerfile` 当前直接 `COPY backend/target/*.jar app.jar`，fresh checkout 或本地未先 Maven package 时，`docker compose --build` 会因缺少 jar 失败；这让 README 中的一键 Docker 发布命令不可靠。

**Approach:** 让后端 Docker image 自己在构建阶段产出 jar，再把 jar 复制到轻量运行时镜像；保留运行时依赖、非 root 用户、健康检查和现有 compose 入口，不改变应用运行配置或部署拓扑。

## Boundaries & Constraints

**Always:** 保持 `release/docker-compose.yml` 的服务名、端口、volume、environment 与健康检查语义不变；Docker build 必须能在没有 `backend/target/*.jar` 的 fresh checkout 上成功；最终运行时镜像仍基于 JRE 而不是完整 JDK；构建阶段可使用 Maven wrapper 或 Maven 镜像，但不能依赖本地 jar。

**Ask First:** 如果需要改变数据库/后端端口、compose 部署模式、生产 profile/cookie 安全策略、后端业务代码、或跳过后端编译，必须暂停询问。

**Never:** 不把 `backend/target/`、`guiyuan/`、`.env.local` 或其他本地产物加入提交；不修改前端依赖或继续清理 Biome warnings；不移除 healthcheck、非 root 用户或上传目录 volume；不通过 README 要求用户手动 package 来代替修复 Dockerfile。

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Fresh Docker build | checkout 中不存在 `backend/target/*.jar` | `docker build -f release/backend.Dockerfile .` 在镜像内构建 jar 并生成可运行 image | 若 Maven 下载网络失败，构建以 Maven 错误失败，不回退到本地 jar |
| Runtime image | 构建完成的 backend image 启动 | 仍以非 root 用户运行，`/app/uploads` 存在，`java $JAVA_OPTS -jar /app/app.jar` 为入口 | 若 app.jar 缺失，Docker build 阶段失败而非运行时才失败 |
| Compose build | `docker compose --env-file release/.env -f release/docker-compose.yml build backend` | 不要求宿主机预先执行 `./mvnw package` | 若 `.env` 缺失，仅 compose 变量解析失败；不属于 Dockerfile jar 链路 |

</frozen-after-approval>

## Code Map

- `release/backend.Dockerfile` -- 当前核心问题文件；已改为 Maven build stage 编译 jar，再在 JRE runtime stage 从 build stage 复制 `/build/backend/target/*.jar`；未依赖 BuildKit-only cache mount。
- `release/frontend.Dockerfile` -- 已采用 build/runtime 两阶段模式，可作为后端 Dockerfile 的结构参考：先复制 lock/manifest 利用缓存，再复制源码构建，再复制产物到运行时镜像。
- `.dockerignore` -- 当前排除 `**/test`、整个 `backend/target/` 和 `frontend/dist`；多阶段构建只需要 `backend/pom.xml`、`backend/src/main/` 及 release 配置进入 context。
- `release/docker-compose.yml` -- 本地 build 部署入口，backend 使用 `context: ..` 和 `dockerfile: release/backend.Dockerfile`；本任务应让该入口不依赖宿主机 jar。
- `.github/workflows/cd.yml` -- CI/CD 当前已有 “Build backend jar” 前置步骤来配合旧 Dockerfile；若 Dockerfile 自构建 jar，该步骤可保留为额外编译验证，也可移除以避免重复构建。为降低范围，优先不改 workflow，除非 Dockerfile 改动使该步骤冲突。
- `backend/pom.xml` -- Docker build 阶段编译后端所需 Maven 项目入口。
- `release/maven-settings.xml` -- Docker build 阶段使用的 Maven mirror 配置，用于提升受限网络下依赖下载成功率。

## Tasks & Acceptance

**Execution:**
- [x] `release/backend.Dockerfile` -- 改为构建阶段编译后端 jar、运行阶段只复制 jar 并启动 -- 消除对宿主机 `backend/target/*.jar` 的依赖。
- [x] `.dockerignore` -- 调整 backend target 规则，使 fresh build 不需要本地产物且 context 不包含无关构建输出 -- 保持 Docker build context 正确且轻量。
- [x] `release/maven-settings.xml` -- 新增 Maven mirror 配置供 Docker build stage 使用 -- 降低受限网络下 Maven Central TLS 失败概率。
- [x] `.github/workflows/cd.yml` -- 确认无需调整；现有 jar 前置构建可保留为额外编译验证，Dockerfile 已不依赖该产物 -- 保持 CD backend image 构建可用。

**Acceptance Criteria:**
- Given 删除或不存在 `backend/target/*.jar`，when 执行 `docker build -f release/backend.Dockerfile .`，then backend image 构建成功。
- Given 通过新 Dockerfile 构建 backend image，when 检查 Dockerfile 运行阶段，then 仍安装 `curl` 与 `mariadb-client`、使用 `appuser`、创建 `/app/uploads`、保留 healthcheck 和 `java $JAVA_OPTS -jar /app/app.jar` 入口。
- Given 当前源码，when 执行后端 Maven package（如 `cd backend && ./mvnw -q -DskipTests package` 或 Windows 等价命令），then 编译成功。
- Given 当前 git 工作区，when 查看待提交文件，then 不包含 `backend/target/`、`guiyuan/` 或 `.env.local`。

## Spec Change Log

## Verification

**Commands:**
- `powershell.exe -NoProfile -Command "cd C:\\Users\\HX\\Desktop\\guiyuan; docker build -f release/backend.Dockerfile ."` -- attempted: Dockerfile successfully entered image-local Maven build stage, but dependency download failed with remote TLS handshake errors; no fallback to host jar occurred。
- `powershell.exe -NoProfile -Command "cd C:\\Users\\HX\\Desktop\\guiyuan\\backend; .\\mvnw.cmd -q -DskipTests package"` -- passed: 后端 jar 编译成功。
- `grep -n "FROM\\|COPY\\|RUN\\|USER\\|HEALTHCHECK\\|ENTRYPOINT\\|backend/target" release/backend.Dockerfile .dockerignore release/maven-settings.xml` -- passed: Dockerfile 从 build stage 复制 jar，`.dockerignore` 排除宿主机 `backend/target/`。
- `git status --short --ignored -- backend/target guiyuan backend/.env.local release/.env` -- passed: 本地产物与密钥均为 ignored。