# PublishingStudio 四项核心修复 — 设计文档

**日期**: 2026-05-25
**状态**: 已确认

## 背景

PublishingStudio 编辑预览页面经过多轮迭代，存在四个结构性债务：

1. 左侧条目面板和右侧 Canvas 渲染使用两套独立分页逻辑，导致左右内容不一致
2. 12 个画布模板维护成本高，多数模板排版效果不佳
3. `BookPageRenderer.vue`（DOM 竖排渲染器）从未完整集成，与 Canvas 并行维护浪费精力
4. 条目数据到 Canvas 渲染之间缺少清晰的中间表示，左右需各自计算

## 修复 1：统一分页逻辑

### 问题
`computeLineageText()` 用 `calcEntriesPerPage()` 简单按条目数分页，`BookLayoutEngine` 按实际版面分页。两套系统经常产生不同的页数，导致左侧显示 N 条、右侧只渲染 M 条。

### 方案（混合 C）
- 默认：排版引擎说了算 — 全部条目跑 `layoutSync()`，引擎分出几页就几页
- 覆盖：用户可用 `§` 强制分页（ColumnFlowEngine 已支持）
- 去掉 `lineageText.ts` 中的 `paginate()`/`calcEntriesPerPage()` 调用

### 改动
1. `PublishingStudio.runLayout()` 重写：`computeLineageText()` 只生成条目（不分页）→ `BookLayoutEngine.layoutSync(全部entries)` → 按引擎 `ComposedPage[]` 结果重建 `layoutPages`
2. 删除 `lineageText.ts` 中 `computeLineageText` 对 `paginate()` 的调用，直接返回条目数组
3. `computeLineageText` 签名改为返回 `LineageEntry[]` 而非 `LineagePage[]`

## 修复 2：模板瘦身

### 问题
12 个模板多数排版效果不佳（上下留白过大、文字溢出边界）。

### 方案
保留 4 个核心模板，删除 8 个：

| 保留 | ID | 特点 |
|------|-----|------|
| 宣纸鱼尾五栏 | `mr_5` | 经典古籍，宣纸纹理+鱼尾 |
| 极简竖版 | `simple` | 干净现代，适合预览 |
| 黑底碑帖 | `24_black` | 白字黑底，视觉冲击力 |
| 竹简 | `bamboo` | 仿古竹简纹理 |

### 改动
1. `vrainTemplates.ts`：`CANVAS_TEMPLATES` 数组从 12 砍到 4
2. `CanvasConfig.ts`：删除对应 8 个模板配置
3. 确认现有草稿的 `canvasId` 回退逻辑（若选中已删除模板 → 自动回退 `mr_5`）

## 修复 3：清除 DOM 渲染分支

### 问题
`BookPageRenderer.vue` 提供 CSS `writing-mode: vertical-rl` 的 DOM 竖排方案。曾尝试替换 Canvas，但视觉效果不如 Canvas，且内容编辑体验差。未完整集成，是死代码。

### 改动
1. 删除 `frontend/src/components/publishing/BookPageRenderer.vue`
2. 检查并移除所有 import 引用
3. 清理相关 CSS 变量（如有）

## 修复 4：中间布局层

### 问题
条目数据到 Canvas 渲染之间缺少统一中间表示。左侧需知道"当前页有哪些条目"，右侧需知道"渲染哪些条目"。目前两边各自计算。

### 方案（A：只记分页）
轻量包装，不涉及列/坐标信息：

```typescript
interface LayoutResult {
  pages: {
    pageNumber: number
    entries: LineageEntry[]
    composedPage: ComposedPage
  }[]
}
```

`LayoutResult` 在 `PublishingStudio` 中生成，同时传给 `EntryEditor` 和 `PageCanvas`。

### 改动
1. 新增 `frontend/src/types/publishing.ts` 中的 `LayoutResult` 类型
2. `PublishingStudio` 生成 `LayoutResult` 作为 `layoutPages` 的替代
3. `EntryEditor` 和 `PageCanvas` 从 `LayoutResult` 读数据，不再各自计算
4. `PageCanvas` 去掉内部 `runLayout()` — 直接从 `LayoutResult.pages[n].composedPage` 渲染

## 范围外

- 字体选择功能修复（当前只有 qiji-combo 真正生效）
- PDF 导出标点符号修复
- 世代独占一页功能
- 提示浮层位置调整

## 验收标准

1. 「检索数据」后左右条目数量一致
2. 使用 `§` 分页的文档，左右页数一致
3. 模板选择器只有 4 个选项
4. `BookPageRenderer.vue` 文件已删除，无引用残留
5. 切换到 LayoutResult 后，翻页/编辑/预览功能正常
