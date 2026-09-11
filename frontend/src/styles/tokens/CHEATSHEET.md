# 归源 · 设计速查表 (Cheatsheet)

一页速查。写 mockup、改组件、审样式之前先看这里。完整规范见 `references/`。

## 十条不变量

1. 中性灰只有 10 级：n-1~4 表面，n-5~7 边框/图标/次要文字，n-8~10 正文/标题
2. **n-5 禁止用于文字**——它在任何背景下对比度都不够
3. n-6 仅限极小字号（≤12px）使用
4. 强调色（朱砂 `#C63C2E`）覆盖不超过任何表面的 5%
5. 默认正文色为 n-9，暗色模式自动反转
6. 只有三种字体角色：sans（UI）、serif（标题/正文）、mono（代码）
7. 字号用 role+px 体系（`text-copy-14`），禁止裸名（`text-sm`）和硬编码（`text-[15px]`）
8. 阴影只允许 whisper（柔光）和 ring（描边），以及朱砂着色阴影 `shadow-accent`
9. 圆角上限 `radius-2xl`（24px），hero 表面封顶
10. 暗色模式通过 `[data-theme="dark"]` 触发，中性色反转为纯灰玄墨，暖意由生宣/墨玉承载

## 色板速览

### 中性色

| Token | 浅色 (生宣纸境) | 暗色 (玄墨夜景) | 层级 | 用途 |
|-------|------|------|------|------|
| n-1 | `#FAF9F6` | `#0C0C0B` | 表面 | 页面底色 |
| n-2 | `#F3F1EB` | `#161513` | 表面 | 卡片/面板底色 |
| n-3 | `#E6E2D8` | `#242220` | 表面 | 悬停表面 |
| n-4 | `#D5CFC2` | `#383633` | 表面 | 强填充 |
| n-5 | `#B0A99A` | `#54524F` | 边框 | **边框 (禁止用于文字)** |
| n-6 | `#8C8473` | `#807E7A` | 图标 | 图标 / 极小标签 (黛褐) |
| n-7 | `#6B6252` | `#A3A19D` | 次要 | 次要文字、说明 (深黛褐) |
| n-8 | `#463E32` | `#C4C2BE` | 正文 | 正文备选 (松烟黑) |
| n-9 | `#1C1A17` | `#E3E1DB` | 正文 | **默认正文色 (玄青墨黑)** |
| n-10 | `#0E0D0B` | `#F3F2EE` | 标题 | 最强强调 (漆黑) |

### 语义色

| Token | 浅色 | 暗色 | 用途 |
|-------|------|------|------|
| accent | `#C63C2E` | `#E85D4B` | 主CTA、聚焦环、印章标记 (朱砂) |
| info | `#2E5C8A` | `#578BBF` | 信息提示 (黛蓝) |
| success | `#3D7F5E` | `#63B287` | 成功状态 (若竹) |
| warning | `#B48A44` | `#DFB15B` | 警告状态 (古銅金) |
| error | `#B53D58` | `#DC6C85` | 错误/危险操作 (胭脂红) |

### 族谱专用

| Token | 浅色 | 暗色 | 用途 |
|-------|------|------|------|
| male | `#2E5C8A` | `#578BBF` | 男性标识 (黛蓝) |
| female | `#B53D58` | `#DC6C85` | 女性标识 (胭脂红) |
| alive | `#3D7F5E` | `#63B287` | 在世状态 (若竹) |
| deceased | `#8C8473` | `#807E7A` | 已故状态 (黛褐) |
| tree-line | n-6 @ 60% | n-6 @ 50% | 族谱树连线 |
| tree-line-selected | accent | accent | 选中连线 |

## 字号体系

| Role | Size | 用途 |
|------|------|------|
| caption-10 | 10px | 极少用的眼眉标签 |
| label-12 | 12px | 元信息、小标签 |
| copy-13 | 13px | 正文小号 |
| **copy-14** | **14px** | **默认正文基准** |
| copy-15 | 15px | 正文大号 |
| copy-16 | 16px | 引导文字 |
| title-20 | 20px | 段落标题 |
| title-24 | 24px | 页面标题 |
| title-28 | 28px | 主标题 |
| display-36 | 36px | Hero 标题 |
| display-48 | 48px | Hero 超大 |

**禁止**：`font-size: 15px` 硬编码 → 用 `var(--text-copy-15)`

## 间距速查

- `sm: 4px` · `md: 8px` · `lg: 12px` · `xl: 16px` · `2xl: 24px`
- 组件内用 `gap` / `padding` 引用间距变量
- 页面最大内容宽度：960px（阅读舒适区）

## 阴影与材质规则

```css
/* ✅ whisper — 柔光，卡片用 */
box-shadow: var(--shadow-whisper);

/* ✅ ring — 描边，面板用 */
box-shadow: var(--shadow-ring);

/* ✅ card-glass / panel-glass — 琉璃磨砂材质，浮动层与对话框用 */
background: var(--color-glass-bg);
backdrop-filter: blur(18px);

/* ❌ 禁止 — 硬阴影让设计看起来像 SaaS 后台 */
box-shadow: 0 8px 30px rgba(0,0,0,0.15);
```

## 动效与交互

- 缓动：`cubic-bezier(0.22, 1, 0.36, 1)` — 呼吸式
- 弹性：`var(--ease-spring-gentle)` — 悬停/卡片回弹；`var(--ease-spring-stiff)` — 菜单展开/点击
- 时长：fast 150ms / normal 250ms / slow 400ms
- 按钮触压：`:active` 状态下使用 `scale(0.97)`，伴随 `80ms` 清脆释出。
- 内容入场用 `opacity` + `transform: translateY(4px)`，不是 scale 弹出

## 禁止事项

- ❌ 裸色值（`#xxxxxx`）出现在任何 `.vue` 或 `.css` 中（唯一例外是 `design-tokens.css` 作为变量源）
- ❌ `font-weight: bold` 用于中文——CJK 字体没有 700 字重，浏览器会伪造模糊粗体，统一用 `500` 或 `normal`
- ❌ 硬阴影（`box-shadow` 透明度 > 0.1）
- ❌ 圆角超过 24px
- ❌ 强调色作正文颜色
- ❌ inline `style=""` 中写颜色/字体
