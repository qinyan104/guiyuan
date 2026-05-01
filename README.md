# 族谱管理系统

一个以族谱可视化编辑为核心、支持本地部署与数据自主掌控的家族记忆系统项目。

当前项目处于“从作品走向产品”的过渡阶段：前端已经具备较强的谱图编辑与展示能力，后端已经具备基础账号与文件上传能力，后续将逐步补齐服务端持久化、业务主数据、资料归档与长期演进能力。

## 项目目标

- 做出真正符合中文家族场景的族谱工具
- 保持强可视化体验，而不是退化成普通后台
- 支持本地部署，让数据归用户自己所有
- 逐步从编辑器演进为家族记忆系统

## 当前目录结构

```text
backend/     Spring Boot 后端
frontend/    Vue 3 + TypeScript 前端
```

根目录下的重要文档：

- [PROJECT_FUTURE_ROADMAP.md](C:/Users/HX/Desktop/族谱管理系统/PROJECT_FUTURE_ROADMAP.md)：中长期路线规划
- [PRODUCT_VISION.md](C:/Users/HX/Desktop/族谱管理系统/PRODUCT_VISION.md)：产品愿景、定位与用户视角
- [PROJECT_CURRENT_STATE.md](C:/Users/HX/Desktop/族谱管理系统/PROJECT_CURRENT_STATE.md)：当前阶段总结
- [ARCHITECTURE.md](C:/Users/HX/Desktop/族谱管理系统/ARCHITECTURE.md)：架构说明
- [HANDOFF.md](C:/Users/HX/Desktop/族谱管理系统/HANDOFF.md)：接手说明与当前开发建议

## 技术栈

### 前端

- Vue 3
- TypeScript
- Vite
- Vitest
- Axios

### 后端

- Spring Boot 3
- Spring Web
- Spring Data JPA
- MySQL

## 当前阶段概览

当前最核心的成果在前端：

- 族谱可视化画布
- 人物编辑
- 关系维护
- 本地草稿恢复
- 导入导出
- SVG 输出
- 打印支持
- 撤销重做与编辑历史

当前后端主要能力：

- 用户注册与登录
- 图片上传
- MySQL 基础接入

当前仍未完成的关键能力：

- 族谱项目服务端持久化
- 族谱主数据的后端建模
- 项目级保存/打开/继续编辑
- 真正意义上的后台管理能力

## 本地启动

### 启动后端

进入 [backend](C:/Users/HX/Desktop/族谱管理系统/backend) 目录后运行：

```powershell
./mvnw spring-boot:run
```

默认端口：

- `http://localhost:8080`

注意：

- 需要本地 MySQL
- 数据库名当前为 `genealogy`
- 相关配置见 [application.properties](C:/Users/HX/Desktop/族谱管理系统/backend/src/main/resources/application.properties)

### 启动前端

进入 [frontend](C:/Users/HX/Desktop/族谱管理系统/frontend) 目录后运行：

```powershell
npm install
npm run dev
```

Vite 默认开发地址通常为：

- `http://localhost:5173`

## 测试与构建

前端：

```powershell
npm run test
npm run build
```

后端：

```powershell
./mvnw test
```

## 后续开发建议

如果要继续推进项目，建议先阅读以下文档：

1. [PROJECT_FUTURE_ROADMAP.md](C:/Users/HX/Desktop/族谱管理系统/PROJECT_FUTURE_ROADMAP.md)
2. [PRODUCT_VISION.md](C:/Users/HX/Desktop/族谱管理系统/PRODUCT_VISION.md)
3. [PROJECT_CURRENT_STATE.md](C:/Users/HX/Desktop/族谱管理系统/PROJECT_CURRENT_STATE.md)
4. [ARCHITECTURE.md](C:/Users/HX/Desktop/族谱管理系统/ARCHITECTURE.md)
5. [HANDOFF.md](C:/Users/HX/Desktop/族谱管理系统/HANDOFF.md)

再查看当前代码与 `git status`，这样最容易快速接上上下文。
