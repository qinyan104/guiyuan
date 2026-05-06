# 族谱资源级权限与分享访问控制设计

## 背景

当前后端已经具备登录、管理员后台、族谱编辑、照片访问、导出与审计等能力，但权限边界仍主要停留在“是否已登录”和“是否为管理员”两层：

- Spring Security 当前对所有请求放行，真正的鉴权主要依赖自定义拦截器。
- `publication` 主链路只校验当前请求是否携带有效用户身份，尚未对“这份族谱是否属于当前用户、或是否被授权访问”做统一约束。
- 照片、导出、历史等附属接口与主资源没有收敛到同一套资源级授权模型中。
- 未来产品方向明确包含“站内协作 + 外部匿名只读分享”，现有权限结构无法平滑承接该能力。

这份设计的目标，是建立一套可以同时支持私有资源、站内协作、匿名脱敏分享、平台治理与后续审计扩展的统一访问控制模型。

## 目标

1. 为每一份族谱建立独立的资源级权限模型，而不是只依赖平台角色。
2. 将“认证”和“资源授权”明确分层，避免权限判断散落在 controller 和 service 中。
3. 支持站内协作者角色：`OWNER`、`EDITOR`、`VIEWER`。
4. 支持匿名外链分享，且默认仅提供“脱敏只读”视图。
5. 让照片、导出、历史、人物详情等附属能力继承与族谱主资源一致的授权规则。
6. 为未来的协作邀请、分享过期、脱敏导出、人工介入审计保留清晰扩展点。

## 非目标

- 本阶段不设计实时多人协同编辑冲突解决。
- 本阶段不引入复杂的组织/租户模型。
- 本阶段不把整套认证体系一次性完全迁移到 Spring Security 原生方案中。
- 本阶段不默认赋予平台管理员查看任意族谱正文的权限。

## 核心原则

### 1. 平台角色与资源角色分离

平台角色只决定“能否管理平台”，资源角色才决定“能否访问某一份族谱内容”。

- 平台角色：`SUPER_ADMIN`、`ADMIN`、`USER`
- 资源角色：`OWNER`、`EDITOR`、`VIEWER`

管理员默认只拥有平台治理权限，不自动拥有任意族谱的内容访问权。

### 2. 认证与授权分离

- 认证层只负责识别请求主体是谁。
- 授权层只负责判断主体是否可以对某份族谱执行某个动作。

### 3. 分享链接不是用户角色

匿名分享访问不是“低权限用户”，而是一种独立的授权来源。它只能进入分享链路，并受到脱敏策略约束。

### 4. 默认最小暴露

所有外部分享默认只读且脱敏。完整视图、编辑、删除、协作者管理、完整导出等动作只允许站内资源角色执行。

## 当前问题总结

### 1. 主资源缺少对象级权限判断

当前 `publication` 相关接口能识别登录用户，但没有统一校验该用户是否对目标 publication 拥有访问权。

### 2. 附属资源未绑定主资源权限

照片、导出、历史、人物更新等接口虽然依附于 publication，但没有通过统一授权服务进行约束，容易出现绕过主资源权限的访问路径。

### 3. 授权逻辑分散

如果继续采用“在 controller/service 中逐个补 `if` 判断”的方式，后续增加协作者、匿名分享、脱敏导出时，权限规则会快速分散并相互矛盾。

## 方案对比

### 方案 A：最小修补

在现有 controller 和 service 中补 owner 判断，先把越权问题挡住。

优点：

- 改动小，见效快。

缺点：

- 权限逻辑仍然分散。
- 很难平滑扩展到 `OWNER/EDITOR/VIEWER` 和匿名分享。
- 容易让导出、照片、历史接口继续游离在主资源权限体系之外。

### 方案 B：一次性全面切到 Spring Security 原生体系

把认证、鉴权、方法级权限、分享访问都重构进 Spring Security。

优点：

- 框架形态最完整。

缺点：

- 当前系统业务规则仍在演化，过早全面迁移会带来较高风险与返工成本。

### 方案 C：领域 ACL 模型

保留当前登录方案作为第一阶段认证基础，但新增统一的 publication 资源授权模型，让所有资源动作都通过统一授权服务判断。

优点：

- 可以快速补上对象级权限漏洞。
- 能直接承接协作者、匿名分享、脱敏导出。
- 未来即使替换 token 或迁移认证框架，授权层仍可复用。

缺点：

- 比最小修补需要多做一层抽象。

### 结论

采用方案 C。它在当前阶段的风险、投入、扩展性之间最均衡。

## 权限数据模型

### 1. 用户表 `users`

继续负责站内账号身份，不承担 publication 资源授权职责。

关键字段沿用现有模型：

- `id`
- `username`
- `password`
- `role`
- `nickname`

### 2. 族谱表 `publications`

继续表示族谱资源本体。

现有 `user_id` 暂时保留，用于：

- 标记创建者
- 数据迁移时回填默认 `OWNER`
- 回滚与审计锚点

长期是否保留为业务字段，待 `publication_access` 稳定后再评估。

### 3. 资源访问表 `publication_access`

新增，作为站内资源授权主表。

建议字段：

- `id`
- `publication_id`
- `user_id`
- `role`
- `created_at`
- `updated_at`
- `created_by`

约束建议：

- `publication_id + user_id` 唯一
- `role` 仅允许 `OWNER`、`EDITOR`、`VIEWER`

业务规则：

- 新建 publication 时，创建者必须自动写入一条 `OWNER` 记录
- 任意时刻一份 publication 至少保留一名 `OWNER`
- 不允许删除或降级最后一名 `OWNER`

### 4. 分享链接表 `publication_share_links`

新增，负责匿名分享授权。

建议字段：

- `id`
- `publication_id`
- `token_hash`
- `status`
- `expires_at`
- `allow_export`
- `redaction_profile`
- `created_by`
- `created_at`
- `revoked_at`

说明：

- 不存明文 token，只存 hash。
- `status` 至少包含 `ACTIVE`、`REVOKED`、`EXPIRED`
- `redaction_profile` 初始至少支持一种默认脱敏模式，后续可扩展。

## 资源角色定义

### `OWNER`

允许：

- 查看完整内容
- 编辑族谱
- 删除族谱
- 查看历史
- 完整导出
- 管理协作者
- 管理分享链接

### `EDITOR`

允许：

- 查看完整内容
- 编辑族谱
- 查看历史
- 完整导出

不允许：

- 删除族谱
- 管理协作者
- 管理分享链接

### `VIEWER`

允许：

- 站内完整只读查看

可选策略：

- 是否允许完整导出，可通过单独权限控制，不与读取权限强绑定。

### 匿名分享访问

不是资源角色，不进入 `publication_access`。它只是一种“分享授权来源”，默认只允许：

- 脱敏只读查看
- 脱敏导出（如果分享配置显式允许）

## 动作级权限模型

不要在业务层直接写“看角色名做 if”，统一改为动作级权限判断。

首批权限动作建议包含：

- `publication.read.redacted`
- `publication.read.full`
- `publication.edit`
- `publication.history.read`
- `publication.export.redacted`
- `publication.export.full`
- `publication.manage_access`
- `publication.manage_shares`
- `publication.delete`
- `photo.read.redacted`
- `photo.read.full`

后续如需更细粒度控制，可继续扩展，但 controller 不应直接依赖角色名。

## 认证模型

### 统一访问主体 `AccessSubject`

认证层输出统一的访问主体对象，由授权层消费。

建议至少有两种主体：

- `UserSubject`
  - `userId`
  - `platformRole`
  - `username`
- `ShareSubject`
  - `shareLinkId`
  - `publicationId`
  - `expiresAt`
  - `redactionProfile`
  - `allowExport`

### 认证层职责

认证层只负责：

- 从站内 token 识别出登录用户
- 从分享 token 识别出分享访问者
- 生成 `AccessSubject`

认证层不负责：

- 决定某主体是否可以读取、编辑、导出指定 publication

## 授权模型

### 统一授权入口

新增 `PublicationAuthorizationService`，由所有 publication 相关链路调用。

建议对外只暴露两类方法：

- `can(subject, publicationId, permission): boolean`
- `require(subject, publicationId, permission): void`

### 授权决策规则

#### 对 `UserSubject`

1. 查询 `publication_access`
2. 找到该用户在目标 publication 上的资源角色
3. 将资源角色映射为允许动作集合
4. 判断目标动作是否允许

#### 对 `ShareSubject`

1. 校验分享链接是否属于目标 publication
2. 校验状态是否仍然有效
3. 校验是否过期
4. 仅允许分享配置支持的只读/导出动作
5. 强制走脱敏投影

#### 对平台管理员

- `ADMIN` / `SUPER_ADMIN` 默认仍需通过资源授权才能读取族谱正文
- 平台角色只影响后台治理接口
- 若未来需要人工介入用户内容，应单独设计受审计的 `break-glass` 机制，而不是默认旁路资源授权

## 接口边界设计

### 1. 站内接口

保留并收敛到：

- `/api/publications/**`
- `/api/admin/**`

### 2. 分享接口

新增独立路由：

- `/api/shares/{token}/**`

不建议把分享 token 混入 `/api/publications/{id}` 主链路。原因：

- 可以物理隔离内部完整视图与外部脱敏视图
- 降低条件分支复杂度
- 避免分享逻辑意外穿透到内部完整接口

## 控制器职责拆分

### `InternalPublicationController`

负责站内完整访问能力：

- list
- get full
- update
- delete
- history
- full export
- collaborator management
- share management

其中 `list` 必须基于 `publication_access` 查询“当前用户可访问的 publication 集合”，而不是继续只按 `publications.user_id` 返回“我创建的族谱”。

### `SharePublicationController`

负责匿名分享链路：

- read redacted
- export redacted
- share metadata

## 数据读取与投影

### 读取服务

新增或明确 `PublicationReadService` 职责：

- 读取 publication 原始完整数据

### 视图投影服务

新增 `PublicationViewProjector`：

- 输入：publication 原始数据 + 查看模式
- 输出：`full view` 或 `redacted view`

脱敏逻辑必须集中在投影层，不能散落在 controller、export service、photo endpoint 中。

## 脱敏策略

外部分享默认采用“脱敏只读”。

默认脱敏原则：

- 在世成员敏感字段默认隐藏
- 不暴露完整编辑型字段
- 不直接透出不受控原始照片访问路径

初版可先定义一套默认策略，后续再扩展为多种 `redaction_profile`。

## 一次请求的标准流转

1. 认证层识别请求并生成 `AccessSubject`
2. controller 根据请求进入站内或分享入口
3. `PublicationAuthorizationService` 判断动作权限
4. 读取 publication 原始数据
5. `PublicationViewProjector` 生成完整或脱敏视图
6. 返回响应
7. 审计层记录访问结果

## 照片、导出与附属资源的收口策略

### 照片

当前照片访问不应继续作为独立的匿名直出资源存在。

目标规则：

- 站内完整照片访问走站内权限链路
- 分享照片访问走分享链路
- 分享链路下的照片访问继承脱敏规则

### 导出

导出必须继承与读取一致的授权模型：

- 站内角色决定是否可完整导出
- 分享链接只能导出脱敏版本，且必须显式允许

### 历史与人物详情

- 站内历史查看需要独立动作授权
- 人物详情作为 publication 的局部视图，应复用 publication 资源授权，而不是独立生长一套权限模型

## 错误语义

建议统一为以下规则：

- `401 Unauthorized`
  - 没有有效站内身份
  - 站内 token 无效
- `404 Not Found`
  - publication 不存在
  - 调用方对该 publication 连基础读取资格都没有
- `403 Forbidden`
  - 调用方已被识别，且可以知道资源存在，但没有当前动作权限
  - 示例：`VIEWER` 试图编辑，`EDITOR` 试图删除
- `410 Gone`
  - 分享链接已过期或已撤销

设计目标：

- 防止通过 publication id 枚举他人资源
- 在协作者和分享场景下仍保留足够清晰的错误反馈

## 审计设计

### 平台审计

记录：

- 登录
- 登出
- 用户管理
- 平台角色变更
- 协作者管理
- 分享链接创建/撤销

### 资源审计

记录：

- 读取完整内容
- 读取脱敏内容
- 导出完整版
- 导出脱敏版
- 编辑
- 删除

### 审计字段建议

- `actorType`
- `actorId`
- `publicationId`
- `action`
- `result`
- `createdAt`
- `ip`
- `userAgent`
- `shareLinkId`（如适用）

### 审计边界

- 不记录完整族谱正文
- 不在日志中原样落敏感人物字段
- 编辑类事件只记录动作摘要，不记录整份数据快照

## 测试策略

### 权限矩阵测试

至少覆盖：

- `OWNER`
- `EDITOR`
- `VIEWER`
- `outsider`
- `ADMIN`
- `valid share`
- `expired share`
- `revoked share`

### 动作维度测试

至少覆盖：

- read
- edit
- delete
- export
- history
- photo

### 安全回归测试

- IDOR 测试：修改 publication id 是否能越权读取他人内容
- 脱敏快照测试：分享视图不会意外泄露完整字段
- 分享过期/撤销测试
- 照片与导出接口是否正确继承主资源权限

## 迁移方案

### 第 1 步：引入统一授权抽象

- 新增 `AccessSubject`
- 新增 `PublicationAuthorizationService`
- 不立即改完所有接口，先建立统一入口

### 第 2 步：落表与数据回填

- 新增 `publication_access`
- 将现有 `publications.user_id` 全量回填为对应 publication 的 `OWNER`
- 将 publication 创建链路改为“写入 publication 本体 + 写入创建者 `OWNER` 记录”

### 第 3 步：收口主链路

先将站内 publication 主链路统一接入授权：

- list
- get
- update
- delete
- history

### 第 4 步：收口附属资源

将以下接口接入同一授权层：

- person update
- export
- photo

### 第 5 步：分享链路落地

- 新增 `publication_share_links`
- 新增 `/api/shares/{token}/**`
- 新增脱敏投影能力

### 第 6 步：协作能力落地

- 协作者管理 API
- 分享管理 API
- 前端协作者与分享入口

## 兼容性与风险

### 1. 迁移期间双语义并存

`publications.user_id` 与 `publication_access` 会在一段时间内同时存在，需要明确以资源授权表为准，创建者字段仅作迁移与审计辅助。

### 2. 历史接口与照片接口绕过风险

如果迁移时只改 publication 主接口，未同步收口导出/照片/历史链路，仍会保留旁路风险。因此附属资源必须纳入同一阶段计划，而不是无限期留待以后处理。

### 3. 脱敏规则遗漏风险

如果脱敏逻辑散在多个 controller 或 export service 中，后续非常容易漏字段。必须强制集中在单一投影层。

## 推荐实施顺序

优先级如下：

1. 建立统一授权抽象
2. 修复 publication 主链路对象级权限
3. 收口照片、导出、历史等旁路
4. 引入分享链路与脱敏投影
5. 增加协作者与分享管理 UI

## 验收标准

当以下条件全部满足时，本设计视为落地成功：

1. 站内用户不能通过修改 id 越权访问他人族谱。
2. `OWNER/EDITOR/VIEWER` 对同一 publication 的动作边界可被自动化测试覆盖。
3. 照片、导出、历史接口不再绕过 publication 资源授权。
4. 匿名分享只能进入独立分享链路，并默认得到脱敏只读视图。
5. 分享链接过期或撤销后，访问会稳定返回 `410`。
6. 管理员后台权限与族谱正文访问权限不再混淆。
