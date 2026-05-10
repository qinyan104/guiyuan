# 族谱活动动态 — 设计文档

## 概述

增强现有审计日志，使每次人物编辑记录字段级变更（旧值→新值），并提供新的活动接口和 UI，让协作者能清楚看到谁改了什么。

## 子任务 1：增强审计日志

### 1.1 Diff 计算

在 `PublicationService.savePersonsAndFamilies()` 中，遍历传入的 `people` 数据，对每个已存在于数据库的人物，对比以下字段：

| 字段 | JSON key |
|------|----------|
| 姓名 | name |
| 性别 | gender |
| 出生 | birth |
| 去世 | death |
| 在世 | deceased |
| 年龄 | age |
| 字/号 | titleName |
| 氏族 | clan |
| 备注 | note |
| 头像 | avatarUrl（仅记录"已更新"或"已移除"）|

### 1.2 记录格式

构建 `List<Map<String, Object>>` 变更列表，每条包含：

```json
{
  "personName": "李世民",
  "personId": "p_abc123",
  "changes": [
    {"field": "birth", "fieldLabel": "出生", "old": "2024-01", "new": "2024-02"}
  ]
}
```

序列化为 JSON 字符串存入 `AuditLog.detail` 字段。若无变更则存空数组 `[]`。

### 1.3 限制

- 单次保存最多记录前 50 条人物变更（超过截断）
- 每人最多记录前 10 个变更字段
- `detail` 字段 VARCHAR(500)，超长时截断最后一个变更

---

## 子任务 2：活动接口

### 2.1 端点

```
GET /api/publications/{id}/activity
```

- 权限：`HISTORY_READ`（复用现有权限）
- 返回 50 条最近记录
- 响应：

```json
{
  "code": 200,
  "data": [
    {
      "id": 123,
      "username": "zhangsan",
      "action": "UPDATE_PERSON",
      "detail": "[{\"personName\":\"李世民\",\"personId\":\"p_abc\",\"changes\":[{\"field\":\"birth\",\"fieldLabel\":\"出生\",\"old\":\"2024-01\",\"new\":\"2024-02\"}]}]",
      "createdAt": "2026-05-10T15:30:00"
    }
  ]
}
```

- `detail` 字段：前端自行 `JSON.parse()` 解析

### 2.2 实现

- `PublicationController.getActivity()` — 新增端点
- 复用 `auditLogRepository.findByTargetTypeAndTargetIdOrderByCreatedAtDesc()`
- 过滤 `action` 为 `UPDATE_PERSON` 和 `UPDATE_PUB`（保留有 diff 的）

---

## 子任务 3：前端活动面板

### 3.1 修改位置

`frontend/src/views/PublicationStatsView.vue` 的"族谱修订志"部分（约 432-459 行）。

### 3.2 UI 改动

| 元素 | 现状 | 变更 |
|------|------|------|
| 条目行 | 显示 action tag + detail 文本 | 显示用户名 + 时间 + 动作描述 |
| 展开按钮 | 无 | 每条加"展开"按钮（仅当 detail 可解析为 JSON diff） |
| 变更列表 | 无 | 展开后显示字段级表格：字段名 | 旧值（红底）→ 新值（绿底） |
| 头像图标 | 无 | 颜色区分：super_admin → 金色，其他 → 默认色 |

### 3.3 数据流

1. 进入族谱详情 → 调用 `getPublicationActivity(id)` 获取活动列表
2. 每条记录的 `detail` 尝试 `JSON.parse()`
3. 解析成功且为数组 → 显示展开按钮
4. 解析失败或为空 → 仅显示 action tag（向后兼容）

---

## 文件变更清单

| 文件 | 变更类型 |
|------|----------|
| `backend/.../service/PublicationService.java` | 修改（savePersonsAndFamilies 加 diff 计算） |
| `backend/.../controller/PublicationController.java` | 修改（加 /activity 端点） |
| `frontend/src/api/publication.ts` | 修改（加 getPublicationActivity API） |
| `frontend/src/views/PublicationStatsView.vue` | 修改（改修订志 UI） |

---

## 安全

- 权限不变：复用 `HISTORY_READ`，仅 OWNER/EDITOR/VIEWER 可见
- 头像变更仅记录"已更新"，不暴露 URL
- 无新增数据收集
