# 吊线图打印工作台（方案 A）建设计划

> 状态：Ready for implementation
> 日期：2026-08-04
> 原型依据：`prototype/drop-line-print-studio`，原型提交 `5c40e1a`，方案 A 决策提交 `2ee18b6`
> 生产基线：`main` / `bdceb67`

## 目标

在不增加工作台常驻按钮的前提下，为“只有姓名和线条”的吊线图提供一个独立、全屏、可实时预览的打印工作台。采用已确认的方案 A：顶部动作区、左侧内置样式、中间真实纸张预览、右侧精细设置。

首版必须解决人数多时的实际打印问题：既能将整张族谱缩放到一页，也能按 A4/A3 纸张分幅打印，并保证预览和最终打印来自同一份真实 SVG。

## 已确认的代码现状

- `frontend/src/components/WorkbenchHeader.vue` 已声明但尚未使用 `print-publication` 事件，适合作为现有“导出”菜单中的入口，不需要新增顶部按钮。
- `frontend/src/views/WorkbenchView.vue` 尚未接线打印事件。
- `frontend/src/composables/useFileOperations.ts` 中已有 `printPublication()`，但当前没有调用方。
- `frontend/src/features/export/publicationExport.ts` 中 `createPrintLayoutPages()` 无论人数多少都只返回一张与完整画布等大的连续页面，不是 A4/A3 分幅打印。
- `frontend/src/components/PublicationCanvas.vue` 是当前真实 SVG 来源；`PersonCardSvg.vue` 的 `showCard === false` 分支已负责吊线图姓名和竖线渲染。
- `frontend/src/lib/layout.ts` 已计算 `pageCount`、纸张像素尺寸和完整布局，现有布局能力应复用，不另建谱系布局算法。

## 产品决策

### 入口与信息架构

- 不增加工作台常驻按钮。
- 只在现有“导出”下拉菜单增加“打印吊线图”菜单项，复用现有 `print-publication` 事件。
- 打开 `/publication/:id/print` 子路由；该路由继续使用 `PublicationLayout.vue` 已提供的 `PUBLICATION_CONTEXT_KEY`，不重复请求族谱。
- 返回操作回到当前族谱工作台，浏览器后退同样有效。

### 首版设置范围

- 4 个不可变内置样式：传统谱牒、清简黑白、紧凑大谱、宽松阅览。
- 纸张：A4 / A3。
- 方向：横向 / 纵向。
- 姓名：系统字体栈、字号、颜色。
- 线条：颜色、粗细、实线 / 虚线。
- 布局：代际间距、同辈间距、配偶间距。
- 印刷：页边距、打印比例、分幅重叠量。
- “保存方案”只保存一份本机默认方案到 `localStorage`，并自动恢复；不建设账户级或云端方案库。

### 强制不变量

- 打印工作台始终是“姓名 + 线条”：强制关闭卡片、照片、生卒、年龄、注记、状态、世系标记、阴影和交互高亮。
- 打印设置是会话内的独立副本，不修改 `context.pub.settings`，也不触发族谱未保存状态。
- 预览 SVG 和最终打印 SVG 都从同一个 `PublicationCanvas` DOM 获取，禁止复制另一套人物/连线模板。
- 不从原型分支复制生产代码；原型只用于布局和交互决策。
- 只采用一套“可读性优先”的自动分页策略：可读时单页，否则自动分幅；所有页面使用真实 A4/A3 `@page` 尺寸。

## 首版明确不做

- 不做命名方案库、云同步、团队共享和后台表结构。
- 不上传或嵌入自定义字体，只使用系统中文字体栈。
- 不做横排姓名的第二套几何布局；现有传统竖排姓名已覆盖首版打印目标。只有用户实际需要横排姓名时，再扩展 `PersonCardSvg` 和紧凑布局尺寸模型。
- 不为分页重排族谱结构；只允许小幅移动裁切边界来避开姓名，连线可在重叠区跨页。
- 不新增 PDF 依赖；使用浏览器原生打印/另存为 PDF。

## 架构与数据流

```text
现有导出菜单
  -> print-publication
  -> /publication/:id/print
  -> DropLinePrintStudioView
       |- 本地 DropLinePrintProfile
       |- resolveDropLinePublicationSettings(base, profile)
       |- layoutPublication(publication, resolvedSettings)
       |- PublicationCanvas（唯一真实 SVG）
       |- createPrintLayoutPages(layout, printOptions)
       `- createStandalonePublicationSvg
            -> createPrintPageSvg × N
            -> createPrintDocument
            -> 浏览器 window.print()
```

打印工作台只持有展示配置；族谱数据仍由父路由的 publication context 管理。`DropLinePrintProfile` 转换为一个临时 `PublicationSettings` 副本后，继续调用现有 `layoutPublication()` 和 `PublicationCanvas`。

扩展现有 `PrintLayoutPage` 作为唯一的页面场景契约；不另建第二种 page 类型。分页纯函数生成的同一组 `PrintLayoutPage[]` 同时驱动预览 `viewBox`、纸张边界、页码和最终 `createPrintPageSvg()`，从而避免预览与打印各算一次分页。

## 分页规则

### 唯一自动分页策略

纸张毫米尺寸固定为 A4 `210×297`、A3 `297×420`，方向只交换宽高。设页边距为 `m`、打印比例为 `s`、CSS 像素换算常量为 `u = 96 / 25.4`：

- 可打印区：`printableW = paperW - 2m`、`printableH = paperH - 2m`。
- 单页适配比例：`fit = min(printableW * u / layout.width, printableH * u / layout.height)`。
- 有效姓名高度：`nameMm = compactNameSize * fit / u`。
- 当 `nameMm >= 2.8` 时只生成一页，使用统一比例 `fit`。
- 否则按用户打印比例 `s` 分幅；每页 SVG 容量为 `tileW = printableW * u / s`、`tileH = printableH * u / s`。
- 重叠毫米数 `o` 换算为 SVG 单位 `overlap = o * u / s`；步长为 `tileW - overlap`、`tileH - overlap`，行列数均使用向上取整。
- 横纵裁切位置优先移动到不与 `layout.cards` 姓名矩形相交的最近空隙；允许裁切连线，但不允许切开姓名。若可移动范围内没有空隙，页面场景返回显式 warning，禁止静默输出残缺姓名。
- 最后一行/列贴齐布局边界，禁止空白尾页；编号按从左到右、从上到下。

姓名矩形按 compact card bounds 外扩最大线宽的一半后参与碰撞判断。空布局返回 0 页并由 UI 阻止打印。

## 依赖图与实施顺序

```text
Step 1 设置领域模型
  -> Step 2 分页与页面场景核心
  -> Step 3 真实 SVG 分页预览复用
  -> Step 4 A 工作台路由、控件与入口
  -> Step 5 打印、保存与旧路径收口
  -> Step 6 端到端验收与文档
```

步骤按依赖串行实施。先稳定页面场景和真实预览，再建设工作台壳层，避免 UI 因分页契约返工。

---

## Step 1：建立打印设置领域模型

**模型档位：** 强推理；这是后续所有 PR 的稳定契约。
**分支：** `feat/drop-line-print-01-profile`
**依赖：** 无。

### 冷启动上下文

阅读：

- `frontend/src/types/family.ts`
- `frontend/src/data/sampleFamily.ts`
- `frontend/src/features/validation/draftSchema.ts`
- `frontend/src/lib/layout.ts`

打印设置不能写回 `PublicationSettings`，但必须能把现有设置转换成临时的吊线图设置。现有紧凑模式使用 `showCard=false`、`compactNameSize`、`compactNameColor`、`compactLineColor`、布局间距和 `paddingX/Y`。

### 文件

- 新增 `frontend/src/features/export/dropLinePrint.ts`
- 新增 `frontend/src/features/export/dropLinePrint.test.ts`

### 任务

1. 定义 `DropLinePrintProfile`、纸张方向和线型的联合类型。
2. 定义 4 个只读内置样式和默认方案；只保存真实可调字段，不复制族谱数据。
3. 实现 `resolveDropLinePublicationSettings(base, profile)`：返回新对象并强制关闭所有非姓名/线条内容。
4. 集中约束数值边界：字号、线宽、间距、页边距、比例和重叠量；非法本地数据回退默认值。
5. 提供有效字号毫米数和“文字过小”警告所需的纯计算函数。

### 最小验证

```powershell
Set-Location frontend
npm.cmd run test -- src/features/export/dropLinePrint.test.ts
```

测试至少覆盖：不修改基础设置、强制姓名/线条模式、4 个预设可解析、越界值归一化、过小文字警告阈值。

### 退出条件

- 纯函数无浏览器依赖。
- 没有新增 npm 依赖。
- profile 不进入后端 API 和草稿 schema。

### 回滚

删除两个新增文件即可，不影响现有导出。

---

## Step 2：把单张长页改造成真实分页核心

**模型档位：** 强推理；分页边界和物理单位换算容易产生隐蔽错误。
**分支：** `feat/drop-line-print-02-pagination`
**依赖：** Step 1 已合并。

### 冷启动上下文

阅读：

- `frontend/src/features/export/publicationExport.ts`
- `frontend/src/features/export/publicationExport.test.ts`
- Step 1 的 `dropLinePrint.ts`
- `frontend/src/lib/layout.ts` 中 `PAPER_PRESETS` 和 `layoutPublication()` 返回值

当前 `createPrintLayoutPages(layout, paper)` 固定返回 1 页，`createPrintDocument()` 又用完整布局毫米尺寸覆盖纸张大小。新实现必须保留 `createPrintPageSvg()` 的 viewBox 裁切方式，但改用真实纸张页面。

### 文件

- 修改 `frontend/src/features/export/publicationExport.ts`
- 修改 `frontend/src/features/export/publicationExport.test.ts`

### 任务

1. 扩展 `createPrintLayoutPages()` 输入，接收纸张、方向、页边距、比例和重叠量，并按本计划的唯一自动策略返回 `PrintLayoutPage[]`；无法避切时在对应 page 上带阻断性 warning。
2. 实现单页阈值、二维分幅、姓名避切和尾页贴边；保证所有 viewBox 在布局范围内，且无空白尾页。
3. 让 `createPrintDocument()` 输出固定 A4/A3 与方向的 `@page`，每个 section 强制分页。
4. 保留 `createPrintPageSvg()` 的 ID 作用域隔离，避免多页 SVG 的 filter/clipPath 冲突。
5. 页面标题和页码必须 HTML 转义；不引入 `innerHTML` 拼接用户输入以外的新入口。

### 最小验证

```powershell
Set-Location frontend
npm.cmd run test -- src/features/export/publicationExport.test.ts
```

测试至少覆盖：空布局、刚好一页、A4/A3 横竖纸、仅横向溢出、仅纵向溢出、双向溢出、重叠覆盖连续、姓名边界避切、无法避切 warning、最后一页贴边、页码总数一致、HTML 标题转义、SVG 内部 ID 每页唯一。

### 退出条件

- 分页计算是纯函数。
- 同一输入稳定返回同一页序。
- 现有 SVG/PNG/HTML 导出测试不回归。

### 回滚

恢复 `publicationExport.ts` 的旧函数签名；其他导出路径不应依赖新分页选项。

---

## Step 3：复用真实 SVG 建立分页预览

**模型档位：** 强推理；这里锁定预览与打印一致性。
**分支：** `feat/drop-line-print-03-preview`
**依赖：** Step 2 已合并。

### 冷启动上下文

阅读：

- `frontend/src/components/PublicationCanvas.vue`
- `frontend/src/components/PersonCardSvg.vue`
- `frontend/src/components/PersonCardSvg.style`
- Step 1 的 profile 解析
- Step 2 的 `PrintLayoutPage[]` 页面场景

预览必须复用 `PublicationCanvas` 作为唯一真实 SVG。打印 profile 解析为临时 `PublicationSettings` 后调用 `layoutPublication()`；页面预览和打印都消费 Step 2 返回的同一组 page viewBox。

### 文件

- 新增 `frontend/src/features/export/DropLinePrintPreview.vue`
- 新增 `frontend/src/features/export/DropLinePrintPreview.test.ts`
- 修改 `frontend/src/components/PersonCardSvg.vue`
- 修改 `frontend/src/components/PersonCardSvg.test.ts`

### 任务

1. 在预览组件中只渲染一个真实 `PublicationCanvas`，禁用人物选择、hover 高亮和阴影，并暴露 SVG ref 与 export lock。
2. 直接使用 Step 2 的 `PrintLayoutPage[]` 渲染各页纸张框、viewBox、页码和 warning；不得在组件中重新计算分页。
3. 让 compact 模式的帝王/世系等标记遵循已有显示开关，确保打印设置关闭后只剩姓名和线条。
4. 预览字体变量和最终 standalone SVG 使用同一系统字体栈与回退顺序。
5. 加入序列化一致性测试：预览页面声明的 viewBox、页序和字体变量必须等于 `createPrintPageSvg()`/打印文档使用的值。

### 最小验证

```powershell
Set-Location frontend
npm.cmd run test -- src/features/export/DropLinePrintPreview.test.ts src/components/PersonCardSvg.test.ts src/features/export/publicationExport.test.ts
```

### 退出条件

- 预览使用真实族谱数据，不含原型示例姓名。
- 预览和输出共享同一 page 数组、viewBox、字体和变换。
- 人物 hover/选中不会污染打印预览。

### 回滚

删除预览组件并恢复 compact 标记开关调整即可；现有工作台不受影响。

---

## Step 4：建立方案 A 工作台、设置控件和现有菜单入口

**模型档位：** 默认。
**分支：** `feat/drop-line-print-04-studio`
**依赖：** Step 3 已合并。

### 冷启动上下文

阅读：

- `frontend/src/router/index.ts`
- `frontend/src/views/PublicationLayout.vue`
- `frontend/src/types/family.ts` 中 `PUBLICATION_CONTEXT_KEY`
- `frontend/src/components/WorkbenchHeader.vue`
- `frontend/src/views/WorkbenchView.vue`
- 原型分支中的方案 A 与 `VERDICT.md`，只读其布局决策，不复制实现
- Step 1–3 的实现

`PublicationLayout.vue` 已在 `/publication/:id` 父路由加载数据并 provide context。新视图作为 child route 注入同一上下文，并组合 Step 3 的真实分页预览。

### 文件

- 修改 `frontend/src/router/index.ts`
- 新增 `frontend/src/features/export/DropLinePrintStudioView.vue`
- 新增 `frontend/src/features/export/DropLinePrintStudioView.test.ts`
- 修改 `frontend/src/components/WorkbenchHeader.vue`
- 修改 `frontend/src/components/WorkbenchHeader.test.ts`
- 修改 `frontend/src/views/WorkbenchView.vue`
- 修改 `frontend/src/views/WorkbenchView.test.ts`

### 任务

1. 增加命名子路由 `drop-line-print`，路径为 `print`，懒加载新视图。
2. 搭建 A 的顶部动作区、左预设、中预览、右检查器，并从 `PUBLICATION_CONTEXT_KEY` 建立本地 profile。
3. 左栏接入 4 个预设；右栏接入首版全部控件，并用原生 input/range/select/color，不新增 UI 依赖。
4. 设置变化只更新本地 profile、临时 layout 和 Step 2 page scenes；组件测试断言控件确实改变真实页面场景。
5. 实现返回工作台、Escape 返回和窄屏侧栏折叠；保留可访问标签与 focus-visible。
6. 在现有导出下拉中加入“打印吊线图”，触发已声明的 `print-publication`；`WorkbenchView` 是唯一负责路由跳转的位置，通用导出函数不依赖 router。
7. 不新增常驻顶部按钮，也不把打印控件塞回主工作台。

### 最小验证

```powershell
Set-Location frontend
npm.cmd run test -- src/features/export/DropLinePrintStudioView.test.ts src/features/export/DropLinePrintPreview.test.ts src/components/WorkbenchHeader.test.ts src/views/WorkbenchView.test.ts src/router/index.test.ts
```

### 退出条件

- 更改预设、字号、线条或间距时，布局和页数即时更新。
- 直接访问 `/publication/:id/print` 使用父级已加载数据，且不修改族谱未保存状态。
- 主工作台只有现有下拉菜单增加一项，没有新增常驻按钮。

### 回滚

先移除菜单接线即可隐藏功能；路由仍可保留用于继续开发。

---

## Step 5：完成打印动作、本机保存和旧路径收口

**模型档位：** 强推理；涉及弹窗时序、序列化和打印一致性。
**分支：** `feat/drop-line-print-05-output`
**依赖：** Step 4 已合并。

### 冷启动上下文

阅读：

- `frontend/src/composables/useFileOperations.ts`
- `frontend/src/composables/useFileOperations.test.ts`
- `frontend/src/features/export/publicationExport.ts`
- Step 1 的 profile 代码
- Step 4 的 studio/preview 代码

当前旧 `printPublication()` 在异步创建 SVG 后才调用 `window.open()`，容易失去用户手势并被浏览器拦截。新视图的点击处理必须先同步打开空白打印窗口，再异步生成文档；失败时关闭空窗并显示错误。

### 文件

- 修改 `frontend/src/features/export/dropLinePrint.ts`
- 修改 `frontend/src/features/export/dropLinePrint.test.ts`
- 修改 `frontend/src/features/export/DropLinePrintStudioView.vue`
- 修改 `frontend/src/features/export/DropLinePrintStudioView.test.ts`
- 修改 `frontend/src/composables/useFileOperations.ts`
- 修改 `frontend/src/composables/useFileOperations.test.ts`

### 任务

1. 点击打印时同步 `window.open()`，然后让 preview 渲染全部节点并获取 SVG。
2. 复用 `createStandalonePublicationSvg()`、`createPrintPageSvg()` 和 `createPrintDocument()` 生成自包含打印页；成功或失败都释放 export lock。
3. 写入打印文档后等待 `printWindow.document.fonts.ready` 与图片完成，再调用 `window.print()`；弹窗受阻、图片嵌入失败和空族谱均给出可恢复错误。
4. 实现版本化 localStorage 读写，只保存一份本机方案；解析失败或版本不符时回退默认，不影响进入页面。
5. 顶部“保存方案”保存当前本机默认；“重置”恢复选中预设，不修改族谱。
6. 删除 `useFileOperations.ts` 中无人调用的旧 `printPublication()` 及其测试 mock/import，确保项目只有一个打印入口。

### 最小验证

```powershell
Set-Location frontend
npm.cmd run test -- src/features/export/dropLinePrint.test.ts src/features/export/DropLinePrintStudioView.test.ts src/composables/useFileOperations.test.ts src/features/export/publicationExport.test.ts
```

手工检查：浏览器允许弹窗时只打开一个打印窗口；阻止弹窗时当前页面显示错误；取消系统打印后工作台仍可继续操作。

### 退出条件

- 预览与打印窗口复用同一 `PrintLayoutPage[]`，页数、viewBox 和页序一致。
- 打印窗口的姓名、线条、字体声明、颜色和间距与预览一致。
- 500 人以上时导出锁能确保所有虚拟裁剪节点进入最终 SVG。
- 旧打印函数已删除，无双轨逻辑。

### 回滚

移除菜单入口即可停止用户访问；localStorage 仅保存非敏感显示设置，无服务端数据回滚。

---

## Step 6：端到端验收、性能边界和交付文档

**模型档位：** 默认。
**分支：** `feat/drop-line-print-06-qa`
**依赖：** Step 5 已合并。

### 冷启动上下文

阅读：

- `frontend/e2e/playwright.config.ts`
- `frontend/e2e/specs/workbench.spec.ts`
- 所有 Step 1–5 变更
- 本文件的强制不变量和退出条件

### 文件

- 新增 `frontend/e2e/specs/drop-line-print.spec.ts`
- 必要时修改与打印入口直接相关的现有测试
- 修改本计划顶部状态为 `Implemented`，附最终提交/PR 链接

### 任务

1. E2E 覆盖：从现有导出菜单进入、切换预设、自动页数变化、保存并恢复本机方案、返回工作台。
2. 用小族谱和大族谱 fixture 检查姓名/线条模式；mock `window.open()`/`window.print()` 并截获 document，断言纸张尺寸、页数和 SVG viewBox，不依赖弹窗截图。
3. 键盘检查：菜单、左右栏控件、返回、保存和打印均可到达；focus-visible 清晰。
4. 性能检查：设置滑块更新不应反复序列化 SVG；只有点击打印才执行 standalone SVG 克隆和图片嵌入。
5. 删除只为原型或调试留下的条件代码；生产构建不得包含 prototype 路由。

### 完整验证

```powershell
Set-Location frontend
npm.cmd run test
npm.cmd run test:e2e -- e2e/specs/drop-line-print.spec.ts
npx.cmd vite build
npx.cmd vue-tsc --noEmit
```

基线说明：截至本计划创建时，完整 `vue-tsc --noEmit` 存在与本功能无关的既有错误 `frontend/src/views/PublicationLayout.vue:384 TS2367`。实施者必须确认没有新增类型错误，并在最终交付中单独列出该基线错误；不得借此顺手扩大本功能范围。

### 退出条件

- 单元、路由、组件与新增 E2E 测试通过。
- Vite 生产构建通过且不打包原型页面。
- 小族谱自动单页；文字过小的大族谱自动分幅且不切开姓名。
- 计划状态和 PR/提交链已登记。

### 回滚

菜单入口是总开关；出现严重问题时先移除该菜单项，保留内部路由和纯分页核心用于修复。

---

## 每个 PR 的共同检查

1. 从依赖步骤已合并的 `main` 创建分支；不要在 prototype 分支继续生产实现。
2. 先运行该步骤的最小测试，再运行受影响的现有测试。
3. `git diff` 只包含本步骤文件；不得顺手修复古籍编辑器或既有 `PublicationLayout.vue` 类型错误。
4. PR 描述写明：用户可见变化、验证命令、已知限制和回滚方式。
5. 合并后再启动下一依赖步骤，保持页面契约、预览和工作台按顺序收敛。

## 计划变更协议

- **拆分：** 单一步骤超过一个可审查 PR 时，拆成 `Step Na/Nb`，保留原依赖入口和最终出口。
- **插入：** 新发现的阻塞工作以 `Step N.1` 插入，并更新依赖图；不得把隐藏依赖写进后续步骤正文。
- **跳过：** 仅当已有代码完全满足退出条件时可跳过，并在本文件记录证据和提交。
- **改序：** 只有无共享文件、无输出依赖的步骤可并行；改序后必须更新分支基线。
- **放弃：** 移除现有导出菜单入口即可关闭功能；不得删除或覆盖用户族谱与已保存草稿。

## 最终验收清单

- [ ] 主工作台没有新增常驻按钮。
- [ ] A 的顶部/左预设/中预览/右检查器结构落地。
- [ ] 打印内容严格只有姓名和线条。
- [ ] 唯一自动策略对可读的小族谱单页、对大族谱分幅，并使用真实 A4/A3。
- [ ] 大族谱分幅页连续、可拼接且不静默切开姓名。
- [ ] 预览与打印共用真实 SVG，不存在第二套人物渲染。
- [ ] 打印设置不污染族谱设置或未保存状态。
- [ ] 一份本机方案可保存、恢复、损坏回退。
- [ ] 弹窗被阻止、空画布、图片失败都有错误反馈。
- [ ] 旧的无人调用打印路径已删除。
- [ ] 单元测试、E2E、Vite build 通过；类型检查无新增错误。
