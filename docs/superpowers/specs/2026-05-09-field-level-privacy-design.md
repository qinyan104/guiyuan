# 字段级隐私控制设计 (Field-Level Privacy Design)

## 1. 背景与动机
目前族谱系统的权限控制停留在“对象级”（OWNER/EDITOR/VIEWER）。为了保护家族中在世人员的敏感信息，我们需要引入“字段级隐私细化”。该功能允许 `OWNER` 在为特定协作者（特别是 `VIEWER`）分配权限时，精细控制哪些字段可见，从而防止敏感数据（如生卒年、联系方式、照片等）泄露。

## 2. 核心架构策略
采用 **后端强制抹除 (Backend Enforcement)** 方案。
当拥有特定 `redaction_profile` 的用户请求数据时，后端在生成最终的 JSON 树之前，主动将受限字段的数据置为 `null`。这确保了敏感数据绝对不会传输到客户端（浏览器内存）。

## 3. 数据库设计
修改表 `publication_access`，新增列 `redaction_profile`：
```sql
ALTER TABLE publication_access ADD COLUMN redaction_profile TEXT NULL;
```
该字段存储 JSON 格式的脱敏规则。规则采用“三态配置”（`NONE`, `LIVING`, `ALL`）：
```json
{
  "dates": "LIVING", // 涉及字段: birth, death, age
  "note": "ALL",     // 涉及字段: note (包括生平、现居地、联系方式等)
  "photo": "NONE"    // 涉及字段: photoId, avatarUrl
}
```
*   `NONE`: 不隐藏（完全公开）
*   `LIVING`: 仅当人物的 `deceased` 状态为 `false` (在世) 时隐藏
*   `ALL`: 无差别全部隐藏

## 4. 后端实现 (Backend)

### 4.1 数据传输对象 (DTO) 更新
更新 `com.genealogy.server.model.PublicationAccess` 实体类及相关 DTO，支持 `redactionProfile` 的序列化与反序列化。

### 4.2 拦截器改造 (`PublicationViewProjector`)
重构现有的 `PublicationViewProjector`，使其不再仅仅服务于匿名分享（Share Links），也能处理登录用户的访问。
*   在 `PublicationController.get()` 接口中，若当前用户是 `VIEWER` 且存在 `redaction_profile`，则调用投影器。
*   根据 `dates` 规则：抹除 `birth`, `death`, `age`。
*   根据 `note` 规则：抹除 `note`。
*   根据 `photo` 规则：抹除 `photoId`, `avatarUrl`（如果在主查询中带出的话）。

### 4.3 安全防线
`PublicationAuthorizationService` 已天然保障安全：只有 `EDITOR` 及以上权限才能调用 `PUT` 接口覆盖数据。即使 `VIEWER` 拿到了抹除后的（含 `null` 的）数据，他们也没有权限将这些数据回写到数据库，从根本上防止了“脱敏导致真实数据丢失”的风险。

## 5. 前端实现 (Frontend UI)

### 5.1 协作者管理界面 (`CollaboratorManager.vue`)
在管理员或 `OWNER` 查看/编辑协作者列表时：
*   如果协作者角色是 `VIEWER`（或新建时选择了 `VIEWER`），则展开一个“脱敏配置”表单区。
*   提供三组单选按钮或下拉菜单（对应 `dates`, `note`, `photo`）。
*   界面上提供友好说明，例如：“隐藏在世人员的生卒年”。

### 5.2 视图层的自动适应
因为是后端置 `null` 方案，所以前端渲染逻辑（如 `PersonCardSvg.vue` 和 `PersonDetailView.vue`）基本不需要改动。当它们拿到 `null` 时，原有的空状态逻辑（显示为空白或不渲染）将自然生效。

## 6. 边缘案例与测试点
*   **未配置规则兼容**：对于旧有数据，若 `redaction_profile` 为空，应默认视为全公开（或保持向下兼容）。
*   **逻辑自洽**：如果一个已被标为“离世”的人（`deceased: true`），但在“仅隐藏在世人员”策略下，他的数据是否确实完整下发？必须编写单元测试覆盖。
*   **权限升级处理**：当一个用户的角色从 `VIEWER` 升级为 `EDITOR` 时，为了防止因为先前的脱敏规则引起意外的数据抹除（因为 Editor 有权保存），原则上应当在升级为 Editor 时，清空或忽略其 `redaction_profile`。
