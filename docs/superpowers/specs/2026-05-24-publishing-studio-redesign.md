# 出版工作室视觉 & 交互升级设计文档

**日期：** 2026-05-24  
**范围：** PublishingDashboard + PublishingStudio 全链路  
**目标：** Yohaku 设计令牌统一 + 交互体验升级（方案二）

---

## 一、Token 换血 & 全局琉璃化

将出版工作室全部硬编码颜色替换为 Yohaku 设计令牌，引入 `.card-glass` / `.panel-glass` 琉璃类，暗色模式自动适配。

### 涉及文件

| 文件 | 硬编码问题 |
|------|-----------|
| `PublishingDashboard.vue` | `rgba(255,253,248,0.96)`, `rgba(92,71,53,0.09)`, `#a8322a`, `font-weight:600` |
| `PublishingStudio.vue` | `radial-gradient(...)` 硬编码背景, `rgba(...)` 多处 |
| `EntryEditor.vue` | `rgba(253,250,244,0.92)`, `#a8322a`, `border` 硬编码 |
| `PageThumbnail.vue` | `rgba(255,255,255,0.92)`, 色值硬编码 |
| `PageThumbnailBar.vue` | `rgba(252,249,243,0.92)`, `dashed` 边框色 |
| `TweaksPanel.vue` | 面板背景/边框硬编码 |
| `StudioStatusBar.vue` | Chip 背景硬编码 |
| `StudioToolbar.vue` | 相对较好, 补全 |

### 替换映射表

| 旧值 | 新值 |
|------|------|
| `rgba(255,253,248,0.96)` 等暖纸底色 | `var(--color-neutral-1)` + `.card-glass` |
| `rgba(92,71,53,0.09)` 等边框 | `var(--color-card-stroke)` |
| `#a8322a` (hover/accent 深色) | `var(--color-accent)` (暗色自动提亮) |
| `box-shadow: 0 14px 28px rgba(...)` | `var(--shadow-whisper)` |
| `font-weight: 600` / `700` | `font-weight: 500` (CJK 禁止粗体) |
| `rgba(196,58,49,0.08)` 等强调背景 | `var(--color-accent-muted)` |

### Bug 修复

- `PublishingDashboard.handleBack()` 从 `/dashboard/publications` → `/publication/${effectivePublicationId}`

---

## 二、目录页（PublishingDashboard）重设计

### 页面整体
- 背景: `var(--color-neutral-1)`
- Header: 琉璃半透明条, 返回 `< 返回画布` 跳转 `/publication/${pubId}`
- 标题: `出版工作室 · {族谱名}`

### 卡片升级
- 应用 `.card-glass` 琉璃质感
- 内容: 封面缩略图(模板预览), 条目总数, 最后编辑相对时间
- hover: `translateY(-2px)` + `var(--shadow-whisper)`
- 状态胶囊: 草稿(amber) / 审校(accent) / 定稿(accent-filled)

### 搜索 & 排序
- Header 右侧: 搜索框(标题实时过滤) + 排序下拉(最新/最旧/按名称)

### 空状态
- 书卷 emoji + "还没有出版草稿" + "新建第一本草稿" 主按钮

### 新建弹窗
- 标题 + 副标题字段
- 应用 `.panel-glass` 琉璃弹窗

---

## 三、EntryEditor 重设计（核心交互升级）

### 3.1 面板整体
- 琉璃面板样式, 头部 "第 N 页 · X 条 · {模板名}"

### 3.2 条目卡片
- 琉璃小卡片, 信息层级: 序号 → 姓名(粗) → 性别标签 → 世代
- 右上角 ✏️ 编辑 + 🗑️ 删除图标按钮（显式可见）
- 点编辑原地展开 textarea, Ctrl+Enter 保存
- 双击保留为快捷方式

### 3.3 世代分组
- 按 generation 自动分组, 可折叠区块 ("第十八世 · 3 条")
- 折叠箭头 + 世代标签

### 3.4 拖拽排序
- 卡片左侧 ⠿ 拖拽手柄, 同页内拖拽重排
- 拖拽时蓝色插入指示线

### 3.5 移动条目
- 移除内联 `<select>`, 改为"移动到..."按钮
- 点击弹出浮层: 目标页缩略图网格, 点选完成移动

### 3.6 批量操作
- 顶部工具栏: 全选复选框 + "删除选中" + "移动到..." 按钮
- 每卡片左侧可选复选框

### 3.7 底部
- "保存并重新排版" 按钮保持, 状态反馈更清晰

---

## 四、缩略图导航（PageThumbnailBar）重设计

### 尺寸
- 缩略图: 92px → 160px 宽, 比例 4:5
- 导航栏: 228px → 240px

### 缩略图内容
- 应用 `.card-glass`
- 顶部: 页码大号水印(中文数字), 半透明
- 中间: 前 6 条姓名缩小预览
- 底部: 条目总数 + 页面类型胶囊(世系/序/跋)

### 选中态
- 朱砂色边框 + accent-muted 背景 + 右侧指示条
- 拖拽悬停: 虚线朱砂边框

### 新增页面按钮
- 列表底部大号虚线卡片 (+ 图标 + "新增页面")

### 空页缩略图
- 虚线框 + "空页" 提示

---

## 五、Toolbar 重设计 & 全局微交互

### Toolbar 结构
- 返回按钮 + 标题 + 状态胶囊 ｜ 自动排版 + 付梓导出  | 检查器 + 微调 + 模板 + 纸张

### 模板选择器
- 网格缩至 300px, `.panel-glass`
- 选中自动关闭

### 排版微调 → 内联抽屉
- 从浮动面板改为 Toolbar 下方可展开行
- 点击"微调"按钮后从 Toolbar 下滑出, 不遮挡画布
- 画布自动收缩高度

### 微交互
- 按钮 hover: `translateY(-1px)` + `var(--shadow-whisper)`
- 页面切换: 画布内容淡入淡出 200ms
- 编辑保存: 条目卡片绿色闪烁确认
- 通知动画: `var(--ease-breath)`

### 撤销/重做
- EntryEditor 内维护编辑历史栈(最多 20 步)
- Ctrl+Z 撤销, Ctrl+Shift+Z 重做
- 底部状态栏提示

---

## 六、实施顺序

1. **Bug 修复**: 返回按钮目标
2. **Token 换血**: 6 组件硬编码色 → Yohaku 令牌
3. **目录页重设计**: 卡片 + 搜索排序 + 空状态 + 弹窗
4. **EntryEditor 重设计**: 世代分组 + 拖拽 + 批量 + 移动弹窗 + 撤销
5. **缩略图导航重设计**: 尺寸 + 水印 + 空页
6. **Toolbar & 微交互**: 微调抽屉 + 动画 + hover 反馈
