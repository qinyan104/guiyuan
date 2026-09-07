---
title: '恢复 CI/CD 绿色状态'
type: 'bugfix'
created: '2026-09-07'
status: 'completed'
review_loop_iteration: 0
baseline_commit: 'f65d292594d877b20369e95925f5c00e43617980'
context:
  - '{project-root}/AGENTS.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** 最新 main 上 GitHub Actions 的 CI 与 CD 都失败：Biome 检查仍有阻塞错误，后端测试依赖被忽略的 `application.properties`，CD 镜像构建假设已有后端 jar。CI/CD 不绿会阻塞后续安全重构和部署信心。

**Approach:** 只修复已确认的流水线失败点：让 Biome 检查通过，让后端测试不依赖未跟踪文件，让 CD 在镜像构建前产生或自带所需构建产物。保持业务行为不变，避免提交本地部署目录 `guiyuan/`。

## Boundaries & Constraints

**Always:** 保持改动局限在 CI/CD 失败修复；不得提交 `guiyuan/` 未跟踪部署目录；不得提交 `backend/src/main/resources/application.properties` 中的本地配置；优先改测试读取已跟踪配置或改工作流/Docker 构建顺序。

**Ask First:** 如果需要删除现有 CI job、跳过测试、降低 Biome/ESLint 规则、硬编码密钥或改变生产部署模式，必须暂停询问。

**Never:** 不用 ignore/disable 掩盖 Biome 错误；不把本地 `.env.local` 或构建产物目录纳入仓库；不做大规模格式化或重构。

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Biome CI | `frontend` 执行 `npm run biome:check` | 无 blocking error，命令成功 | 发现 warning 可后续治理，但不能有 error |
| Backend CI | CI checkout 中没有被 `.gitignore` 忽略的 `application.properties` | `backend` Maven 测试不因缺失该文件失败 | 测试应改查已跟踪 `application.yml` 或 example 文件 |
| CD image build | CI runner fresh checkout 中没有 `backend/target/*.jar` | CD 可在构建 Docker 镜像前生成 jar，或 Dockerfile 自行构建 jar | 不依赖本地未提交 jar |

</frozen-after-approval>

## Code Map

- `.github/workflows/ci.yml` -- CI 运行 `npm run lint`、`npm run biome:check`、前端测试/构建、后端 `./mvnw test -q`；最新 run 中 ESLint job 失败在 Biome，Backend Tests 失败在配置导入测试。
- `.github/workflows/cd.yml` -- CD 运行 Docker build/push；最新 run 的 backend image 在 `COPY backend/target/*.jar app.jar` 失败。
- `release/backend.Dockerfile` -- 当前运行时镜像假设构建上下文已有 `backend/target/*.jar`；fresh CI checkout 不满足。
- `backend/src/test/java/com/genealogy/server/config/LocalEnvConfigImportTest.java` -- 其中一个测试读取 `ClassPathResource("application.properties")`；该文件被 `.gitignore` 忽略，不在 CI checkout。
- `backend/src/main/resources/application.yml`、`backend/src/main/resources/application.properties.example` -- 已跟踪的配置文件，可作为测试断言来源。
- `frontend/src/features/book-editor/bookPublicationExport.ts` -- Biome 两个 error 均来自 `forEach` 回调隐式返回 `Map.set` / `Array.push` 返回值。
- `frontend/src/views/WorkbenchView.vue` 等 -- Biome 日志中还有大量 warning，但本任务的 CI blocker 是 error；不做大范围 warning 清理。

## Tasks & Acceptance

**Execution:**
- [x] `frontend/src/features/book-editor/bookPublicationExport.ts` -- 将两个 `forEach` 回调改为 block body 或等价无返回写法 -- 修复 Biome blocking error。
- [x] `backend/src/test/java/com/genealogy/server/config/LocalEnvConfigImportTest.java` -- 移除对未跟踪 `application.properties` 的依赖，改断言已跟踪配置 -- 修复 backend CI 配置测试。
- [x] `.github/workflows/cd.yml` 或 `release/backend.Dockerfile` -- 确保 fresh runner 构建 backend image 前有 jar 可 COPY，或改为多阶段构建 -- 修复 CD backend image 构建。

**Acceptance Criteria:**
- Given 当前 checkout，when 执行 `cd frontend && npm run biome:check`，then 命令成功且不再出现 Biome error。
- Given CI fresh checkout 不包含 `backend/src/main/resources/application.properties`，when 执行后端测试，then `LocalEnvConfigImportTest` 不因该文件缺失失败。
- Given CD fresh checkout，when 构建 backend Docker image，then 不再因 `backend/target` 缺失而失败。
- Given 本地仍有未跟踪 `guiyuan/`，when 提交本任务，then 该目录不进入 commit。

## Spec Change Log

- 2026-09-07: Completed scoped CI/CD repair implementation.

## Verification

**Commands:**
- `cd frontend && npm run biome:check` -- passed; Biome reported warnings only and no errors.
- `cd frontend && npm run lint` -- passed, 0 ESLint problems.
- `cd frontend && npm run test` -- passed, 63 test files / 293 tests.
- `cd frontend && npm run build` -- passed.
- `powershell.exe -NoProfile -Command "cd C:\\Users\\HX\\Desktop\\guiyuan\\backend; .\\mvnw.cmd -q -Dtest=LocalEnvConfigImportTest test"` -- passed.
- `powershell.exe -NoProfile -Command "cd C:\\Users\\HX\\Desktop\\guiyuan\\backend; .\\mvnw.cmd -q test"` -- passed locally under Windows Java 21; CI will run Java 17 with MySQL service.
- `powershell.exe -NoProfile -Command "cd C:\\Users\\HX\\Desktop\\guiyuan\\backend; .\\mvnw.cmd -q -DskipTests package"` -- passed and produced `target/genealogy-server-0.0.1-SNAPSHOT.jar`.
- `git status --short -- guiyuan` -- still reports `?? guiyuan/`; it remains unstaged/uncommitted.
