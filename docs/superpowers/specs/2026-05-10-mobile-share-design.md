# 长辈友好移动端浏览 — 设计文档

## 概述

为家族长辈在手机上浏览族谱提供优化体验，覆盖 ShareView SPA 页面和自包含 HTML 导出两种查看方式。不做编辑功能，不做新布局引擎。

---

## 子任务 1：ShareView.vue 移动端适配

### 1.1 响应式断点

目标断点 `@media (max-width: 640px)`。

### 1.2 具体变更

| 区域 | 桌面端（现状） | 移动端 |
|------|---------------|--------|
| Header | `padding: 16px 24px`, 标题 1.25rem | `padding: 12px 16px`, 标题 1rem |
| Footer | `padding: 8px 24px`, 统计信息横排 | `padding: 8px 16px`, 字号 0.78rem |
| 状态提示（加载中/错误） | 居中大卡片 | 全宽，间距缩小 |
| 密码门（如有密码） | 居中卡片 | 全宽，输入框字号 ≥16px（防 iOS 缩放） |

### 1.3 全局样式豁免

`frontend/src/style.css` 中 `@media (max-width: 1320px) { body { min-width: 1320px; } }` 对 ShareView 路由生效，导致横向滚动条。

**修改：** 将全局 `body` 的 `min-width: 1320px` 从 body 级改为仅作用于 `.admin-layout` 容器。这样后台保持桌面最小宽度，ShareView 自然适配手机。

### 1.4 画布交互

保持现有逻辑，不做改动：
- `touch-action: none` 已在全局 style.css 生效
- 双指缩放 + 单指平移已支持
- 点击卡片选中人物已支持

### 1.5 字体保障

在 640px 以下，`PublicationCanvas` 的 `fontScale` 最小值从 0.88 提升至 1.0，保证卡片文字在手机上可读。

---

## 子任务 2：分享 HTML 导出移动端增强

### 2.1 `shareHtmlExport.ts` 修改

| 改动 | 说明 |
|------|------|
| 字号保障 | `#tree-viewport` 内字体最小 14px（移动端 16px），卡片标题 1.1em |
| Detail panel 布局 | 640px 以下改为底部弹出（`top: auto; bottom: 0; height: 45vh; border-radius: 16px 16px 0 0`），带拖拽手柄 |
| 卡片点击目标 | 600px 以下卡片 `min-width: 120px; min-height: 80px` 确保手指能点到 |
| 双击放大 | 双击人物卡片 → 动画缩放至该人物居中（新增 JS 交互） |
| 密码输入 | 输入框 `font-size: 16px` 防 iOS 自动缩放 |
| 关闭按钮 | detail panel 关闭按钮增大至 44x44px（符合 iOS 触控推荐尺寸） |

### 2.2 CSS 修改（生成模板中）

```css
@media (max-width: 640px) {
  #pub-header { padding: 10px 14px; }
  #pub-header h1 { font-size: 1.1rem; }
  #detail-panel {
    top: auto; bottom: 0; left: 0; right: 0;
    width: 100vw; max-width: 100vw;
    height: 45vh;
    border-radius: 16px 16px 0 0;
  }
  #tree-viewport { font-size: 16px; }
  .person-card { min-width: 120px; min-height: 80px; }
  .detail-close { width: 44px; height: 44px; }
  #pub-footer { padding: 8px 12px; flex-direction: column; gap: 4px; font-size: 0.78rem; }
}
```

---

## 子任务 3：OG 标签（微信分享预览）

### 3.1 策略

**静态 OG 标签**，不做动态服务端渲染。微信爬虫抓取 `index.html` 的 `<head>` 内容，展示固定预览卡片。

### 3.2 修改

`frontend/index.html` 添加：

```html
<meta name="description" content="查看家族族谱，了解先祖源流与世代传承" />
<meta property="og:title" content="家族族谱" />
<meta property="og:description" content="点击查看家族族谱" />
<meta property="og:type" content="website" />
<meta property="og:image" content="/og-image.png" />
<meta name="twitter:card" content="summary" />
```

### 3.3 OG 图片

在 `frontend/public/og-image.png` 放置一张 1200×630 的默认图片（族谱主题图标，可用 SVGO 或 generate 后截图）。建议：深色背景 + 毛笔字"族谱" + 简约线条装饰。

---

## 安全分析

| 威胁 | 缓解 |
|------|------|
| 数据泄露 | 保持现有 token 验证 + AES-256-GCM + 脱敏逻辑，不做任何改动 |
| OG 标签泄露标题 | 使用静态通用文案，不包含任何族谱标题或用户数据 |
| 爬虫抓取敏感页面 | 所有 `/api/*` 端点保持认证要求；不带 token 无法访问数据 |
| 手机丢失导致数据暴露 | 密码保护（`shareLink.password`）已在后端强制校验，移动端密码门维持 |
| iOS 自动缩放导致 UI 错乱 | 输入框 `font-size: 16px` 最小值和 `viewport` meta 保持不变 |

**结论：** 本方案不引入任何新的安全风险。所有改动是 CSS/模板层，数据访问路径不变。

---

## 文件变更清单

| 文件 | 变更类型 | 子任务 |
|------|----------|--------|
| `frontend/src/views/ShareView.vue` | 修改（加 @media CSS） | 1 |
| `frontend/src/style.css` | 修改（min-width 从 body 移到 .admin-layout） | 1 |
| `frontend/src/features/export/shareHtmlExport.ts` | 修改（模板 CSS + JS 交互） | 2 |
| `frontend/index.html` | 修改（加 OG/描述 meta 标签） | 3 |
| `frontend/public/og-image.png` | 新建（1200×630 默认图片） | 3 |

---

## 实施顺序

1. **子任务 3**：OG 标签（无依赖，先做）
2. **子任务 1**：ShareView 移动端适配（依赖全局 CSS 豁免）
3. **子任务 2**：HTML 导出增强（独立，可与 1 并行）
