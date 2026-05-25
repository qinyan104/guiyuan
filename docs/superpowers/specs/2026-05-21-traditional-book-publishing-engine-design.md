# 传统谱书出版引擎 (Traditional Book Publishing Engine) 设计文档

> **状态**: 已确认  
> **日期**: 2026-05-21  
> **版本**: 1.0  

---

## 1. 项目定位

### 1.1 核心愿景
超越市面"电子树状图"，实现专业级、可直接交付印刷厂的宣纸线装书 PDF 导出。支持大家族长篇传记编纂与小家庭精美长卷打印。

### 1.2 业务定位
出版服务平台（A+C 混合模式）：你作为出版方，为特定家族制作专业谱书，需要多版本草稿和审校能力。不是一个面向所有用户的 SaaS 功能。

### 1.3 关键产品决策

| 维度 | 决策 |
|------|------|
| 首批交付物 | A4 线装书页 + 人物传记长卷 |
| 用户自由度 | 自动初稿 → 完全自由排版 |
| 数据同步 | 智能合并（user_modified 标记 + 哈希对比）+ 差分通知 |
| PDF 生成 | 前端 DOM 渲染 + SVG 装饰层 → 导出 |
| 技术架构 | Route 3 分层工作室：DOM 文本层 + SVG 装饰层 |

---

## 2. 技术架构

### 2.1 分层架构图

```
┌──────────────────────────────────────┐
│  SVG 装饰层（鱼尾/印章/朱砂线/锚点）   │  ← 自动跟随
├──────────────────────────────────────┤
│  DOM 文本层（姓名/传记/夹注）         │  ← 用户可拖拽编辑
├──────────────────────────────────────┤
│  CSS 版心布局（页框/版心）            │  ← 固定模板
└──────────────────────────────────────┘
```

选型理由：DOM 文字编辑体验好（原生光标/输入法），SVG 连线可实现手绘抖动感，分层架构清晰可独立测试，垂排用 CSS `writing-mode: vertical-rl` 天然支持。

### 2.2 独立草稿系统
出版内容与主族谱数据解耦。`publication_book_drafts` 存储书名、序言、样式配置；`book_person_details` 存储该版本专用的人物传记。确保用户排版修改不污染核心关系网。

---

## 3. 数据模型

### 3.1 核心表

**publication_book_drafts**（草稿主表）

| 字段 | 类型 | 说明 |
|------|------|------|
| id | BIGINT PK | |
| publication_id | FK → publications | 关联哪个族谱 |
| title | VARCHAR(255) | 谱书名 |
| subtitle | VARCHAR(255) | 副标题 |
| preface | TEXT | 序言（富文本） |
| epilogue | TEXT | 跋/后记 |
| style_config | JSON | 版式配置（纸张、字体、鱼尾样式等） |
| status | ENUM(draft/review/final) | |
| version | INT | 版本号 |
| snapshot_revision | INT | 快照时的族谱 revision |
| created_by | BIGINT | |
| updated_by | BIGINT | |
| created_at | TIMESTAMP | |
| updated_at | TIMESTAMP | |

**book_sheets**（页面表）

| 字段 | 类型 | 说明 |
|------|------|------|
| id | BIGINT PK | |
| draft_id | FK | |
| sheet_number | INT | 页码（从1开始） |
| sheet_type | ENUM(genealogy/biography/preface/mixed) | |
| layout_data | JSON | 该页完整布局描述（BookSheetLayout） |
| auto_generated_at | TIMESTAMP | 自动排版生成时间 |

**book_person_details**（人物传记表）

| 字段 | 类型 | 说明 |
|------|------|------|
| id | BIGINT PK | |
| draft_id | FK | |
| person_id | VARCHAR | 对应 people.id |
| biography | TEXT | 万字传记（富文本） |
| interlinear_notes | JSON | 夹注数据 [{position, text}] |
| seal_style | VARCHAR | 印章样式名 |
| user_modified | BOOLEAN DEFAULT FALSE | ★ 是否被用户修改过 |
| source_fields_hash | VARCHAR(32) | ★ 主数据关键字段哈希（用于比对） |

### 3.2 覆盖层与同步表

**sheet_element_overrides**（自由排版覆盖层）

| 字段 | 类型 | 说明 |
|------|------|------|
| id | BIGINT PK | |
| sheet_id | FK → book_sheets | |
| element_key | VARCHAR(64) | "personCard:abc123" |
| override_x | DECIMAL | 手动位移 X |
| override_y | DECIMAL | 手动位移 Y |
| override_scale | DECIMAL(3,2) | 手动缩放 |
| override_visible | BOOLEAN | 是否隐藏 |
| is_manual | BOOLEAN DEFAULT FALSE | ★ 手动模式标记 |

**draft_sync_log**（差分追踪）

| 字段 | 类型 | 说明 |
|------|------|------|
| id | BIGINT PK | |
| draft_id | FK | |
| person_id | VARCHAR | |
| change_type | ENUM(added/removed/updated) | |
| old_values | JSON | |
| new_values | JSON | |
| acknowledged | BOOLEAN DEFAULT FALSE | 用户是否已处理 |

### 3.3 关键设计决策
- **user_modified + source_fields_hash** 实现智能合并：未修改的自动更新，已修改的保留并通知
- **sheet_element_overrides 与 layout_data 分离**：自动排版重跑时覆盖 layout_data，overrides 保留用户手动调整
- **snapshot_revision** 记录版本号，用于检测主数据变更

---

## 4. 五世一表切分引擎

### 4.1 算法概述

纯函数 `traditionalLayout.ts`，输入全量 `PublicationData`，输出 `BookSheetLayout[]`。五步流水线：

```
Step 1: 扫描始祖 → Step 2: 构建代际树 → Step 3: 五代切分 → Step 4: 横向溢出 → Step 5: 交叉锚点
```

### 4.2 Step 1 — 扫描始祖
遍历所有 people，找出**没有作为 children 出现在任何 FamilyUnit 中**的人。不依赖焦点人物，全量扫描。一个族谱可能有多个分支始祖。

### 4.3 Step 2 — 构建代际树
从每个始祖出发递归构建 GenNode，generation 从 0（始祖层）起算。一个人可能出现在多个 FamilyUnit（多配偶）。

GenNode 接口：
```typescript
interface GenNode {
  personId: string; partnerId?: string;
  generation: number; children: GenNode[];
  siblingIndex: number; totalSiblings: number;
}
```

### 4.4 Step 3 — 五代切分
递归遍历代际树，generation >= 5 的子节点切到新页（作为新页根，generation 重置为 0）。第 4 代节点同时出现在当前页底部和新页顶部。

### 4.5 Step 4 — 横向溢出
检测单代兄弟总宽度 > 页面可用宽度时自动分组切页，生成"左承""右续"标记。

### 4.6 Step 5 — 交叉锚点

| 方向 | 触发条件 | 标签模板 |
|------|----------|----------|
| 上 | 本页根节点有父 | "父见第{页}页" |
| 下 | 本页末代有子 | "子转第{页}页" |
| 左 | 承接左侧兄弟页 | "左承第{页}页" |
| 右 | 兄弟延续到右侧 | "右续第{页}页" |

### 4.7 输出结构
```typescript
interface BookSheetLayout {
  sheetNumber: number; sheetType: 'genealogy';
  dimensions: { width: number; height: number };
  rootPersonIds: string[];
  elements: {
    personCards: PersonCardPlacement[];
    connectionLines: LinePlacement[];
    anchors: PageAnchor[];
  };
  continuationOf?: number;
  continuesTo?: number[];
}
```

### 4.8 单元测试场景
单始祖三代（1页）/ 单始祖八代（2页）/ 三始祖各三代 / 单代20兄弟（横向溢出）/ 空族谱 / 环形引用防御 / 锚点双向一致

---

## 5. 中式出版美学

### 5.1 版心结构
- 天头 30mm+，地脚 25mm+
- 版框包围正文区，版缝（中缝）放置鱼尾、书名、卷号、页码
- 鱼尾以 SVG 对鱼尾实现（上下镜像等腰三角形）

### 5.2 垂排引擎
- 全页面 `writing-mode: vertical-rl`
- 通过 `.publishing-studio` CSS scope 隔离，不污染全局
- PersonCard 通过 `verticalMode` prop 控制是否竖排
- 字体：Noto Serif SC / SimSun

### 5.3 朱砂红线
- 颜色 #C43A31，1.2px 线宽
- 基于种子的伪随机路径抖动算法（mulberry32 PRNG）
- 节点处添加"血脉结"：3.5px 半径圆点

### 5.4 动态印章
- Canvas 组件，输入族谱名自动生成
- 朱砂底色 + Perlin/随机腐蚀斑驳纹理
- 双线边框（内粗外细）+ 竖排仿篆文字
- 米白文字色模拟刻痕露出底色效果

### 5.5 夹注
- 双行 inline-flex 嵌入正文
- 字号为正文一半（0.5em），灰色
- 竖排上下文中表现为正文右侧的双行细字
- 用户在传记编辑器中选中文字 → 右键 → "添加夹注"

### 5.6 分页翻页动画
- 可选，低优先级
- CSS 3D transform：perspective + rotateY 过渡

### 5.7 元素映射到分层架构

| 元素 | 实现层 | 来源 |
|------|--------|------|
| 版框 + 版缝 | CSS (.book-page) | 固定模板 |
| 鱼尾标记 | SVG overlay | 固定模板 |
| 人名块 | DOM | 排版算法产出 |
| 传记文本 | DOM (contenteditable) | 用户编辑 |
| 朱砂连线 | SVG overlay | 排版算法 + 抖动函数 |
| 血脉结 | SVG circle | 自动计算 |
| 印章 | Canvas → SVG image | 动态生成 |
| 夹注 | DOM (inline-flex) | 用户编辑 |
| 交叉锚点 | DOM (页边距) | 算法产出 |

---

## 6. 前端 UI 架构

### 6.1 路由设计
```
/publishing                    → PublishingDashboard.vue    总览页
/publishing/:draftId           → PublishingStudio.vue       工作室主界面
/publishing/:draftId/biography/:personId → BiographyEditor.vue  传记编辑器
```

### 6.2 PublishingStudio 三栏布局
- **左侧**: 页面缩略图栏（PageThumbnailBar），可拖拽排序、右键删除
- **中央**: 画布区（PageCanvas），SVG 装饰层 + DOM 内容层 + 版框层
- **右侧**: 属性面板（ElementInspector），编辑选中元素的坐标/样式/重置
- **顶部**: 工具栏（StudioToolbar），返回、排版、纸张、印章、导出
- **底部**: 状态栏（StudioStatusBar），页码、同步状态、撤销/重做

### 6.3 组件树
```
PublishingStudio.vue
├── StudioToolbar.vue
├── PageThumbnailBar.vue
│   └── PageThumbnail.vue × N
├── PageCanvas.vue
│   ├── SVG 装饰层
│   │   ├── FishTailMark.vue
│   │   ├── VermilionLines.vue
│   │   └── PageAnchors.vue
│   ├── DOM 内容层
│   │   ├── PersonCard.vue × N
│   │   ├── BiographyBlock.vue
│   │   └── FreeTextBlock.vue
│   └── 版框层
│       ├── PageBorder.vue
│       └── SealStamp.vue
├── ElementInspector.vue
└── StudioStatusBar.vue
```

### 6.4 状态管理：usePublishingStudio
单文件 composable 管理：草稿数据、页面列表、当前活动页、选中元素、覆盖层 Map、同步日志、撤销历史

### 6.5 拖拽系统
基于原生 Pointer Events 实现：pointerdown 记录起始坐标 → pointermove 计算偏移更新 CSS transform → pointerup 写入 overrides。支持 8px 吸附网格和边界约束。拖拽时显示橙色对齐辅助线。

### 6.6 BiographyEditor（传记编辑器）
左编辑右预览布局。富文本 contenteditable 编辑。夹注通过选中文字 → 右键菜单 → "添加夹注" → 弹出双行输入框。字数统计 + 自动保存。

### 6.7 PublishingDashboard（总览页）
草稿列表卡片：显示书名、页数、版本号、最后编辑时间、同步状态。每个草稿有"继续编辑"和"导出PDF"按钮。顶部"新建草稿"按钮。

### 6.8 Provide/Inject 兜底
出版工作室路由入口处检测 inject 是否可用，不可用时主动从 API 拉取族谱数据，防止直接 URL 跳转或刷新后白屏。

---

## 7. 实施路线图

### Phase 1: 后端 CRUD + 前端路由 + 数据库
- 创建 5 张新表
- 后端 DTO / Repository / Service / Controller
- 前端三个页面路由 + 基础组件骨架
- PublishingDashboard 草稿列表可 CRUD

### Phase 2: traditionalLayout.ts + 单元测试
- 实现五步算法
- 覆盖超深、超宽族谱等 7 个边界测试场景
- 输出可渲染的 BookSheetLayout[]

### Phase 3: 视觉注入
- 3a: 鱼尾标记 + 垂排引擎 + 朱砂连线
- 3b: 动态印章 + 夹注编辑 + 翻页动画

### Phase 4: 导出
- 高质量 PDF 导出（优先功能性，非 PDF/X 认证）
- 可选图片导出

---

## 8. 前车之鉴（实施注意）

1. **数据注入失效**：出版工作室独立路由需确保 Provide/Inject 活跃，增加主动拉取兜底
2. **全局组件污染**：PersonCardSvg 垂直排版必须用 Props 控制，严禁修改全局 CSS
3. **根节点扫描**：切分算法必须扫描全量 people 找出所有始祖，不能只从焦点人物开始

---

## 8. 实际实施记录（2026-05-24）

### 8.1 与设计文档的差异

| 设计文档（5/21） | 实际实施（5/24） | 原因 |
|------|------|------|
| "前端 DOM 渲染 + SVG 装饰层 → 导出" | 前端世系录文字预览 + vRain Perl 引擎生成 PDF | vRain 古籍排版效果远好于自己做，且开源免费 |
| A4 线装书页 | vRain mr_5 背景（2480×1860px） | vRain 自带多款古籍背景模板 |
| 卡片坐标布局（traditionalLayout.ts） | 文字世系录（lineageText.ts） | 出版工作室不做图谱（WorkbenchView 已做）而是做谱书正文 |
| BookSheetLayout 存储卡片坐标 | LineagePage 存储文字条目 | 数据结构与渲染目标对齐 |
| 无第三方依赖 | 引入 vRain（Perl + PDF::Builder + ImageMagick） | 自己造古籍排版引擎不划算 |

### 8.2 当前技术栈

```
前端预览层:  Vue 3 + PageCanvas.vue (CSS 版框/鱼尾/中缝)
文字生成:    lineageText.ts (Person → 世系录格式化文本)
PDF 导出:    vRain v1.4 multirows (Perl 脚本, 后台调用)
Java 桥接:   VrainExportService (数据转换 + ProcessBuilder 调用)
存储:        MySQL book_sheets (layoutData JSON 存 LineagePage)
```

### 8.3 踩坑记录

详见 `docs/troubleshooting/vrain-integration-pitfalls.md`

### 8.4 待优化

- [ ] 竖排支持（目前横排，vRain 原生支持竖排）
- [ ] 字体选择（目前 qiji-combo + HanaMin A/B）
- [ ] 封面自定义
- [ ] 预览直接看 PDF（目前 PDF 生成后需手动打开）
- [ ] 多栏族谱格式（vRain 的 multirows 特性）

---
## 2026-05-24 实施状态更新

### 已完成
- [x] 前后端模板系统：12 个 vRain canvas 模板可选，canvasId 全链路传递
- [x] 单视图架构：VrainPreview 垂直滚动预览 + 编辑功能集成
- [x] EntryEditor 侧面板：条目文本编辑、排序、跨页移动、删除
- [x] PDFBox 3.0.4 集成：PDF→PNG 预览渲染
- [x] 后端 canvasId 感知：动态读取 canvas/{id}.cfg 生成正确的 book.cfg
- [x] Perl 环境适配：Windows Strawberry Perl PATH/DLL 配置
- [x] book.cfg 字段补全：title/pager/cover/comma 等必备字段

### 已知限制
- [ ] PDF 渲染：部分模板（如 18_blue/18_red 有色版框）的 PDF→图像可能不完全准确
- [ ] 字体回退：qiji-combo.ttf 的 Format 14 cmap 在 PDFBox 3.x 中仍会触发 warning
- [ ] Ghostscript 备选：未安装，可作为更可靠的 PDF→图像方案