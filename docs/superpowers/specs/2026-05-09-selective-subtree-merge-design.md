# 精细化子树合并设计 (Selective Subtree Merge Design)

## 1. 背景与动机
目前系统的“分布式协作”功能允许将一个族谱挂载到另一个族谱的人物节点上。然而，目前的“缝合加载”和“物理合并”默认都是全量加载目标族谱。在实际应用中，用户往往只想合并目标族谱中的某一个支系（子树）。为了提高协作的精准度，我们需要引入“子树起点选择”机制，并实现画布的实时剪枝预览。

## 2. 核心架构策略
采用 **“后端剪枝加载 + 前端视觉点选”** 的方案。

*   **后端支撑**：重构 `PublicationTreeLoader`，使其支持根据 `targetRootPersonId` 进行 BFS 遍历收集。
*   **前端点选**：在挂载管理界面引入“子树起点选择器”，复用 `PublicationCanvas` 展示目标族谱。
*   **实时反馈**：一旦选定起点，主画布通过“缝合加载”机制立刻更新，仅显示选中的支系。

## 3. 详细设计

### 3.1 后端逻辑优化 (`PublicationTreeLoader`)
目前 `loadRecursive` 会查询该族谱的所有人物。我们将引入一个子方法 `collectSubtreePeopleAndFamilies`：
1.  如果 `rootPersonId` 存在：
    *   以该人物为根执行 BFS 遍历。
    *   收集该人物的所有直系后代及其配偶。
    *   仅返回被收集到的人物和家庭数据。
2.  如果 `rootPersonId` 不存在：
    *   维持原样，返回全量数据。

同时，确保 `PublicationService.mergeBranch`（物理合并）复用该逻辑，保证“预览”与“合并”的结果严格一致。

### 3.2 数据库与 DTO 变更
*   **模型层**：`Person` 实体中的 `targetRootPersonId` 字段已存在，无需新增。
*   **API 接口**：`PUT /api/publications/{id}/metadata` 或相关接口需确保能正确接收并持久化 `targetRootPersonId`。

### 3.3 前端 UI 实现

#### 3.3.1 子树起点选择器 (`SubtreeRootSelector.vue`)
*   **形态**：全屏或大尺寸对话框（Dialog）。
*   **内容**：加载目标族谱的 `PublicationData`，渲染一个只读的 `PublicationCanvas`。
*   **交互**：用户点击画布上的某个节点时，高亮选中，并点击“确认”返回该人物在目标谱中的真实 ID。

#### 3.3.2 挂载管理器增强 (`BranchMountManager.vue`)
*   **操作入口**：在“目标族谱”选择框下方，增加 **“指定合并范围（子树起点）”** 按钮。
*   **状态展示**：如果已选起点，显示起点的姓名。增加“清除起点”功能。
*   **保存逻辑**：当用户在选择器中确认后，前端立即调用 API 将 `targetRootPersonId` 更新到服务器。

### 3.4 流程联动 (Option C: 实时剪枝)
1.  用户在 `BranchMountManager` 选定子树起点。
2.  前端触发保存并刷新 `PublicationLayout`（主上下文）。
3.  后端 `loadPublication` 被调用，`PublicationTreeLoader` 识别到 `targetRootPersonId`，在缝合时只“切取”该子树。
4.  主画布渲染刷新，挂载点下方的蓝色虚线分支立刻缩小到仅包含选定范围。

## 4. 实施阶段规划
1.  **阶段一：后端重构**。提取 BFS 逻辑为通用组件，使 `PublicationTreeLoader` 支持按起点加载。
2.  **阶段二：基础 UI**。在挂载界面增加字段展示，支持手动输入（或清除）起点 ID。
3.  **阶段三：视觉选择器**。实现弹窗画布，打通视觉点选流程。

## 5. 风险与考量
*   **性能**：大族谱的 BFS 遍历耗时。由于 BFS 结果不涉及复杂计算，通常在毫秒级，风险较低。
*   **数据一致性**：如果目标族谱删除了作为起点的那个节点，主谱应能优雅降级（如显示“无效起点”并回退到全量显示）。
