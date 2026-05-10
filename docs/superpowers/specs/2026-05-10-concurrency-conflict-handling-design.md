# 并发冲突控制 (乐观锁) 设计方案

## 背景与动机
随着分布式协作（分支挂载与合并）的深入使用，系统允许多个具有 `EDITOR` 或 `OWNER` 权限的用户同时编辑同一个族谱项目。当前系统采用“最后写入者胜 (Last-Write-Wins)”策略，缺乏并发控制机制。如果两名用户同时编辑并保存同一个族谱，先保存的数据会被后保存的数据无声覆盖，导致严重的数据丢失。本项目旨在引入基于 JPA `@Version` 的乐观锁机制，从后端强制拦截并发覆写，并在前端给予明确的刷新提示。

## 方案范围与影响
* **受保护的聚合根**：`Publication` 实体作为整个族谱的聚合根。任何对其自身的修改（元数据、设置）或对其关联实体（人物、家庭关系）的修改，都必须联动触发 `Publication` 的版本号自增。
* **脱敏规则**：不影响现有的字段级脱敏规则（脱敏是在视图层处理的，不涉及写入）。
* **用户体验**：当冲突发生时，前端拦截用户的保存操作，并强制要求用户刷新页面以获取最新数据，不支持前端自动合并。

## 详细设计

### 1. 后端数据模型变更
* 修改 `backend/src/main/java/com/genealogy/server/model/Publication.java`：
  * 确保 `revision` 字段使用 `jakarta.persistence.Version` 注解标记。
  * `revision` 字段自动由 JPA 维护自增，初始值为 `0`。

### 2. DTO 与请求负载变更
所有会修改族谱内容的 API 端点，其请求体中必须包含 `expectedRevision` 字段。
* `PublicationSnapshot` (用于 `PUT /{id}` 全量更新)。
* `UpdateMetadataRequest` (用于 `PUT /{id}/metadata` 元数据更新)。
* `PUT /{pubId}/people/{personId}` (人物局部更新) 的请求体 Map 中需包含 `expectedRevision`。

### 3. Service 层联动逻辑 (PublicationService)
JPA 的 `@Version` 机制默认只在实体本身的字段被修改时才会触发自增。在我们的业务中，人物(`Person`) 的修改也必须算作族谱版本的变更。
* 在 `updatePublication` 和 `updatePublicationMetadata` 方法中：
  * JPA 会在保存时自动检查版本。我们在查询出 `Publication` 实体后，需要显式检查传入的 `expectedRevision` 是否与实体当前的 `revision` 匹配。如果不匹配，手动抛出自定义异常。
* 在 `updatePerson` 方法中：
  * 除了更新人物数据，**必须**显式加载对应的 `Publication` 实体。
  * 校验传入的 `expectedRevision`。
  * 调用 `publication.setUpdatedAt(LocalDateTime.now())` （或修改任意一个虚设字段）。这一动作会使 JPA 认为 `Publication` 实体被修改了，从而在事务提交时自动增加其 `revision` 值，触发关联的乐观锁校验。

### 4. 异常处理机制 (GlobalExceptionHandler)
* 捕获 `jakarta.persistence.OptimisticLockException` 或 `org.springframework.orm.ObjectOptimisticLockingFailureException`（JPA 自动抛出），以及我们自定义抛出的并发修改异常。
* 将异常统一转换为 `HTTP 409 Conflict` 状态码返回。
* 响应体包含明确的错误代码和中文提示消息（如：“数据已被其他人修改，您的操作未保存”）。

### 5. 前端适配与交互
* **状态管理**：在 `usePublicationState.ts` 中维护一个 `currentRevision` 响应式变量。在成功获取族谱（`getPublication`）时初始化它。
* **API 请求携带**：修改 `api/publication.ts` 中的更新接口，确保在调用 PUT 时将 `currentRevision` 作为 `expectedRevision` 传递给后端。
* **成功更新后的同步**：后端的 `PUT` 接口在成功保存后，需要在 `ApiResponse.success` 的 data 字段中返回新的 `newRevision`（例如 `{"newRevision": 5}`），前端接收到响应后，自动更新内存中的 `currentRevision`。
* **冲突拦截 UI**：在顶层 HTTP 拦截器或页面组件中捕获 `409` 响应。使用弹窗（Dialog）提示用户：“当前族谱已被其他协作者修改，您的数据已过期。为防止数据覆盖，请刷新页面以获取最新内容。” 提供唯一的“强制刷新”按钮（执行页面重载）。

## 替代方案考虑
* **细粒度实体锁**：为 `Person` 和 `Family` 实体单独增加 `@Version`。
  * 被拒绝原因：目前的高级编辑操作会导致全量的 `PUT /{id}` 请求覆盖保存。细粒度锁在这种全覆盖保存下无法保证完整的一致性，将整个族谱作为聚合根锁定更符合当前的接口架构。
* **前端合并冲突**：类似于 Git 的合并工具，让用户在前端决定采用哪个版本。
  * 被拒绝原因：实现极其复杂，对于目前的使用场景投入产出比过低。强制拦截并刷新是最安全的兜底策略。

## 测试策略
* 编写后端单元测试验证 `PublicationService` 中针对不同情况（全量更新、元数据更新、人物局部更新）在版本不匹配时能否正确抛出乐观锁异常。
* (可选) 编写/更新前台端到端测试，模拟发送包含旧版 `expectedRevision` 的请求，验证系统能否正确显示 409 并弹出刷新提示。
