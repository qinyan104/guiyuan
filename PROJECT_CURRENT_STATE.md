# 项目当前状态

更新日期：2026-04-26

## 1. 当前定位

当前项目更准确的定义是：

**一个以族谱可视化编辑为核心的本地工作台原型。**

它已经超出了单纯 demo 的范围，可以称为作品，但还没有完全进入产品化阶段。

## 2. 当前已完成的核心能力

### 前端

当前前端已经具备以下关键能力：

- 登录页与基础认证接入
- 族谱画布展示
- 人物选择与编辑
- 配偶、父母、子女等关系操作
- 族谱布局与视图控制
- 本地草稿保存与恢复
- 撤销重做
- JSON 导入导出
- SVG 导出
- 打印输出
- 样例族谱加载
- 头像图片上传

### 后端

当前后端已具备以下能力：

- 用户注册
- 用户登录
- MySQL 接入
- 文件上传
- 上传文件静态访问
- 基础跨域配置

## 3. 当前技术判断

当前项目的强项在前端可视化与编辑流程。

现阶段的主要事实是：

- 族谱核心内容仍主要存在前端状态中
- 前端的主要数据结构是 `people + families + focusFamilyId`
- 该结构很适合画布渲染和编辑
- 但该结构并不等于最终的业务主数据模型

因此，当前系统还不是一个真正的“族谱业务系统”，而更像一个“可视化族谱编辑器”。

## 4. 当前代码层面的大致结构

### 前端重点

关键入口：

- [App.vue](C:/Users/HX/Desktop/族谱管理系统/frontend/src/App.vue)

关键类型：

- [family.ts](C:/Users/HX/Desktop/族谱管理系统/frontend/src/types/family.ts)

关键编辑能力分布：

- `composables/`
- `features/`
- `components/`

样例数据：

- [sampleFamily.ts](C:/Users/HX/Desktop/族谱管理系统/frontend/src/data/sampleFamily.ts)

### 后端重点

认证接口：

- [AuthController.java](C:/Users/HX/Desktop/族谱管理系统/backend/src/main/java/com/genealogy/server/controller/AuthController.java)

上传接口：

- [FileController.java](C:/Users/HX/Desktop/族谱管理系统/backend/src/main/java/com/genealogy/server/controller/FileController.java)

认证逻辑：

- [UserService.java](C:/Users/HX/Desktop/族谱管理系统/backend/src/main/java/com/genealogy/server/service/UserService.java)

数据库配置：

- [application.properties](C:/Users/HX/Desktop/族谱管理系统/backend/src/main/resources/application.properties)

## 5. 当前未完成但最关键的缺口

项目接下来最重要的不是再堆几个页面，而是补齐产品底座。

当前关键缺口包括：

- 族谱项目没有真正的服务端保存模型
- 用户没有自己的“项目空间”
- 编辑内容没有真正进入后端持久化链路
- 族谱业务主数据尚未在后端建模
- 缺少清晰的项目级保存、打开、继续编辑能力
- 缺少正式的后台业务管理能力

## 6. 现阶段最合理的判断

当前项目已经证明了一件事：

**“可视化强、本地部署、数据自主”这个方向是成立的。**

后续的任务不是推翻重做，而是：

**在保留当前前端优势的前提下，为项目补上真正的产品和系统骨架。**

## 7. 当前推荐开发重心

如果继续推进，当前最推荐的优先级为：

1. 明确 1.0 的产品目标
2. 先做服务端持久化
3. 先做项目级保存与继续编辑
4. 再逐步走向业务主数据建模

## 8. 当前不建议的做法

现阶段不建议：

- 一次性重做成大而全平台
- 在 1.0 就把全部关系范式化到底
- 过早做复杂权限、审批、多组织协作
- 还没站稳保存链路就提前铺太多后台功能

## 9. 一句话总结

当前项目已经是一个很有方向感的作品，下一步应当优先推进产品化，而不是急着扩张成庞杂系统。
