# 苏派与欧派传统视觉主题设计规格书 (Su & Ou Visual Themes Design Spec)

**日期**: 2026-05-03
**目标**: 在族谱管理系统中实现“苏派”与“欧派”两套高保真传统美学主题，增强系统的文化底蕴与视觉表现力。

---

## 1. 审美愿景 (Aesthetic Vision)

采用“高保真数字文物”方案。不仅仅是颜色的切换，而是通过材质纹理、线条逻辑和装饰元素的差异，模拟真实的古籍阅读体验。

### 1.1 苏派：生宣墨韵 (Su Style: Raw Xuan & Ink)
*   **性格**: 温润、流动、亲切、家族血脉的延续。
*   **视觉隐喻**: “垂珠式”。连绵不绝的墨线如珠帘垂挂，象征祖荫。

### 1.2 欧派：绢本朱砂 (Ou Style: Silk & Cinnabar)
*   **性格**: 肃穆、整齐、严谨、官方史实的秩序。
*   **视觉隐喻**: “五世表”。朱砂界格内的纵横经纬，象征族史的严谨。

---

## 2. 视觉规范 (Visual Specifications)

### 2.1 色彩与材质 (Colors & Textures)

| 变量名 | 苏派 (Su Style) | 欧派 (Ou Style) |
| :--- | :--- | :--- |
| `--bg-shell` | `#F2EBDC` (生宣色) | `#E8D5B5` (古绢色) |
| `--line-soft` | `rgba(117,90,57,0.12)` | `rgba(178,34,34,0.15)` (朱砂红) |
| `--text-main` | `#3A3226` (松烟墨) | `#1A1A1A` (漆黑) |
| `--accent-amber` | `#A96E35` (赭石) | `#B22222` (朱砂) |
| `--tree-line-color`| `rgba(58,50,38,0.8)` (水墨感) | `rgba(26,26,26,0.9)` (硬朗) |
| `--canvas-grid` | 无 (强调自然留白) | `0.5px` 细红网格 (界格) |

### 2.2 材质滤镜 (SVG Filters)

在 `App.vue` 或全局入口定义 SVG 滤镜，用于背景层：
*   **Su Filter**: `feTurbulence` (baseFrequency="0.04") + `feColorMatrix`。模拟宣纸的纤维杂质。
*   **Ou Filter**: `feTurbulence` (type="fractalNoise", baseFrequency="0.8") + `feDisplacementMap`。模拟绢布的织物纹路。

---

## 3. 组件设计 (Component Specs)

### 3.1 人物卡片 (Person Cards)

#### **苏派卡片**
*   **头像框**: 八角形或圆形裁剪 (`clip-path`)，边框带有 1px 的墨迹边缘（虚化）。
*   **背景**: 使用 `--bg-panel` (略透明)，呈现宣纸叠加感。
*   **印章**: 底部显著位置放置红色的“姓名私印”（CSS 生成：正方形边框 + 仿宋体名字）。

#### **欧派卡片**
*   **头像框**: 规整的长方形，顶部带有 3px 的朱砂红装饰横线。
*   **边框**: `1px solid var(--accent-ink)`，模拟古籍折页。
*   **装饰**: 四角采用极简的“回纹”或“丁字纹”装饰图标。

### 3.2 连线逻辑 (Connector Logic)

#### **苏派：垂珠连线**
*   **转折**: `border-radius: 12px` (圆润)。
*   **垂珠**: 在分支点处增加一个 `::after` 伪元素：直径 `4px` 的实心圆点。
*   **质感**: 使用 CSS `filter: blur(0.3px)` 模拟墨水在宣纸上的微小晕染。

#### **欧派：纵横连线**
*   **转折**: `border-radius: 0` (绝对直角)。
*   **对齐**: 线条强制对齐背景的朱砂格（通过 `grid-gap` 步长实现同步）。
*   **质感**: 实线，无任何虚化。

---

## 4. 实施策略 (Implementation Strategy)

1.  **CSS 变量注入**: 在 `themes.css` 中增加 `[data-theme="su-style"]` 和 `[data-theme="ou-style"]` 段落。
2.  **组件多态支持**: 修改 `PersonCardSvg.vue`，使其能够根据当前主题应用不同的 `clip-path` 和装饰元素。
3.  **画布适配**: 在 `PublicationCanvas.vue` 中，根据主题动态渲染“垂珠”圆点或“朱砂”背景网格。
4.  **字体注入**: 引用 `Google Fonts` 的 `ZCOOL XiaoWei` (宋体感) 或 `Noto Serif SC`。

---

## 5. 验收标准 (Acceptance Criteria)

*   [ ] 主题切换后，背景材质有明显的纹理差异（宣纸 vs 绢布）。
*   [ ] 苏派连线呈现圆角并带有交汇处的“垂珠”点。
*   [ ] 欧派背景呈现朱砂红格，且连线为绝对直角。
*   [ ] 人物头像在苏派下为八角/圆，欧派下为方正矩形。
