/**
 * BookLayoutEngine — 古籍排版引擎类型定义
 *
 * 本文件定义排版引擎的所有接口，从字形到完整页面。
 * 排版引擎是纯 TypeScript 计算层，不依赖 DOM/React/Vue。
 */

// ── 外部依赖类型引用（不在此文件定义，仅声明引用） ──
import type { LineageEntry } from "../../types/publishing"

// ═══════════════════════════════════════════════════════════
// 字形 (Glyph) — 排版的最小单位
// ═══════════════════════════════════════════════════════════

/** 页面上的一个字符 */
export interface Glyph {
  /** Unicode 字符 */
  char: string
  /** 页面绝对 X 坐标（左上角原点） */
  x: number
  /** 页面绝对 Y 坐标（基线位置） */
  y: number
  /** 使用字体栈中的第几个字体（0-based） */
  fontIndex: number
  /** 字号（pt） */
  fontSize: number
  /** 字符颜色 */
  color: string
  /** 字符宽度（像素，用于 hit test） */
  width: number
  /** 字符高度（像素，含行距） */
  height: number
  /** 反向引用到原始条目（用于编辑交互） */
  sourceEntry?: LineageEntry
  /** 是否为批注/双行小字 */
  isAnnotation?: boolean
}

// ═══════════════════════════════════════════════════════════
// 列与页 — 排版的结构层次
// ═══════════════════════════════════════════════════════════

/** 一列文字（竖排，从右到左编号） */
export interface ColumnGlyphs {
  /** 列索引（0 = 最右列） */
  columnIndex: number
  /** 列左边界 X */
  x: number
  /** 列上边界 Y */
  y: number
  /** 列宽（像素） */
  width: number
  /** 列高（像素，可用文字区域） */
  height: number
  /** 该列中的所有字形 */
  glyphs: Glyph[]
}

/** 多行模式下的一行（族谱每行放一个人） */
export interface RowGlyphs {
  /** 行索引（0 = 最上行） */
  rowIndex: number
  /** 行上边界 Y */
  yTop: number
  /** 行下边界 Y */
  yBottom: number
  /** 该行中的字形（横向排布） */
  glyphs: Glyph[]
}

/** 多行模式下的列 */
export interface MultiRowColumnGlyphs {
  /** 列索引 */
  columnIndex: number
  /** 列左边界 X */
  x: number
  /** 列宽 */
  width: number
  /** 该列中的所有行 */
  rows: RowGlyphs[]
}

/** 一页排版数据（未装饰的原始状态） */
export interface PageGlyphs {
  /** 页码（1-based） */
  pageNumber: number
  /** 该页的列（普通模式）或 null */
  columns?: ColumnGlyphs[]
  /** 该页的多行列（多行模式）或 null */
  multiRowColumns?: MultiRowColumnGlyphs[]
  /** 代际标题标记 [{ generation, titleText, columnIndex, y }] */
  generationHeaders: GenHeader[]
}

/** 代际标题 */
export interface GenHeader {
  /** 世代数（0-based，如 0 = 第一世） */
  generation: number
  /** 标题文本（如 "@@第一世" 去掉标记后） */
  titleText: string
  /** 所在列索引 */
  columnIndex: number
  /** 标题 Y 坐标 */
  y: number
}

// ═══════════════════════════════════════════════════════════
// 页面合成 — 装饰 + 交互
// ═══════════════════════════════════════════════════════════

/** 渲染图层（用于 Canvas 绘制） */
export type RenderLayer =
  | BackgroundLayer
  | FrameLayer
  | FishTailLayer
  | HeaderLayer
  | FooterLayer
  | GlyphLayer
  | RowLineLayer

export interface BackgroundLayer {
  kind: "background"
  /** 背景色 */
  color: string
  /** 背景图 URL（可选） */
  textureUrl?: string
  /** 背景图不透明度 0-1 */
  textureOpacity?: number
}

export interface FrameLayer {
  kind: "frame"
  /** 内框 */
  inline: {
    x: number
    y: number
    width: number
    height: number
    lineWidth: number
    color: string
  }
  /** 外框（可选，为 null 则不绘制） */
  outline: {
    x: number
    y: number
    width: number
    height: number
    lineWidth: number
    color: string
  } | null
  /** 版心折叠线（可选） */
  centerFold?: {
    x: number
    yTop: number
    yBottom: number
    lineWidth: number
    color: string
  }
}

export interface FishTailLayer {
  kind: "fishTail"
  /** 位置 */
  position: "top" | "bottom"
  /** 中心 X */
  centerX: number
  /** 主体矩形 Y + 高度 */
  rectY: number
  rectHeight: number
  /** 三角形高度 */
  triaHeight: number
  /** 三角形方向（上下鱼尾不同） */
  triaDirection: "up" | "down"
  /** 颜色 */
  color: string
  /** 线宽 */
  lineWidth: number
  /** 是否为弧形鱼尾 */
  isFlower: boolean
  /** 弧形装饰图 URL（可选） */
  flowerImageUrl?: string
  /** 鱼尾连接线 */
  connectorLine?: {
    yTop: number
    yBottom: number
    lineWidth: number
    color: string
    margin: number
  }
}

export interface HeaderLayer {
  kind: "header"
  /** 书口标题文字 */
  title: string
  /** 位置 */
  x: number
  y: number
  /** 字体 */
  fontFamily: string
  fontSize: number
  color: string
}

export interface FooterLayer {
  kind: "footer"
  /** 页码 */
  pageNumber: number
  /** 总页数 */
  totalPages: number
  /** 位置 */
  x: number
  y: number
  fontFamily: string
  fontSize: number
  color: string
  /** 工作室名称 */
  logoText?: string
  logoX?: number
  logoY?: number
}

export interface GlyphLayer {
  kind: "glyph"
  glyphs: Glyph[]
}

export interface RowLineLayer {
  kind: "rowLine"
  lines: RowLine[]
}

export interface RowLine {
  x1: number
  y1: number
  x2: number
  y2: number
  lineWidth: number
  color: string
}

/** 可交互区域 */
export interface HitRegion {
  /** 唯一 ID（通常为 personId） */
  id: string
  /** 包围盒 */
  rect: { x: number; y: number; width: number; height: number }
  /** 关联的原始条目 */
  entry: LineageEntry
  /** 交互类型 */
  action: "edit" | "select" | "move"
}

/** 完整合成后的页面 */
export interface ComposedPage {
  /** 页码 */
  pageNumber: number
  /** 页面总宽度 */
  width: number
  /** 页面总高度 */
  height: number
  /** 渲染图层（按绘制顺序排列） */
  layers: RenderLayer[]
  /** 可交互区域 */
  hitRegions: HitRegion[]
  /** 原始排版数据引用 */
  glyphs: PageGlyphs
}

// ═══════════════════════════════════════════════════════════
// 画布/模板配置
// ═══════════════════════════════════════════════════════════

/** 画布模板完整配置（解析自 canvas/*.cfg） */
export interface CanvasConfig {
  /** 模板 ID */
  id: string
  /** 显示名称 */
  name: string
  /** 页面尺寸 */
  width: number
  height: number
  /** 背景色 */
  backgroundColor: string
  /** 背景纹理图（空字符串 = 无） */
  backgroundImage: string

  /** 页边距 */
  margins: {
    top: number
    bottom: number
    left: number
    right: number
  }

  /** 每页列数 */
  leafCol: number
  /** 版心折叠线宽度（0 = 无线） */
  leafCenterWidth: number

  /** 版框 */
  frame: FrameConfig

  /** 鱼尾 */
  fishTail: FishTailConfig | null

  /** 多行模式 */
  multiRows: MultiRowConfig | null

  /** 书房名 / Logo */
  logo: LogoConfig
}

export interface FrameConfig {
  /** 内框线宽 */
  inlineWidth: number
  /** 内框颜色 */
  inlineColor: string
  /** 外框线宽 */
  outlineWidth: number
  /** 外框颜色 */
  outlineColor: string
  /** 内外框水平间距 */
  outlineHMargin: number
  /** 内外框垂直间距 */
  outlineVMargin: number
}

export interface FishTailConfig {
  /** 上鱼尾 Y 位置 */
  topY: number
  /** 上鱼尾颜色 */
  topColor: string
  /** 上鱼尾矩形高度 */
  topRectHeight: number
  /** 上鱼尾三角形高度 */
  topTriaHeight: number
  /** 上鱼尾线宽 */
  topLineWidth: number
  /** 下鱼尾 Y 位置 */
  bottomY: number
  /** 下鱼尾颜色 */
  bottomColor: string
  /** 下鱼尾矩形高度 */
  bottomRectHeight: number
  /** 下鱼尾三角形高度 */
  bottomTriaHeight: number
  /** 下鱼尾线宽 */
  bottomLineWidth: number
  /** 下鱼尾方向：0=向下(顺)，1=向上(对) */
  bottomDirection: number
  /** 是否为弧形鱼尾 */
  isFlower: boolean
  /** 弧形鱼尾装饰图 */
  flowerImage: string
  /** 鱼尾连接线配置 */
  lineColor: string
  lineWidth: number
  lineMargin: number
}

export interface MultiRowConfig {
  /** 是否启用多行模式 */
  enabled: boolean
  /** 每列横向切分几行 */
  rowCount: number
  /** 分隔线宽度 */
  lineWidth: number
  /** 分隔线颜色 */
  lineColor: string
}

export interface LogoConfig {
  /** Logo 图片 */
  image: string
  /** Logo 文字 */
  text: string
  /** Logo Y 位置 */
  y: number
  /** Logo 颜色 */
  color: string
  /** Logo 字体 */
  fontFamily: string
  /** Logo 字号 */
  fontSize: number
}

// ═══════════════════════════════════════════════════════════
// 排版引擎输入
// ═══════════════════════════════════════════════════════════

/** 排版引擎输入 */
export interface LayoutInput {
  /** 已格式化的条目列表（来自 lineageText.ts 的 formatEntry） */
  entries: LineageEntry[]
  /** 画布模板配置 */
  canvas: CanvasConfig
  /** 用户可调参数 */
  options: LayoutOptions
}

/** 用户可调排版参数 */
export interface LayoutOptions {
  /** 字号 (pt)，默认 12 */
  fontSize: number
  /** 行距倍数，默认 1.9 */
  lineHeight: number
  /** 列数覆盖（1 = 单栏竖排，> 1 覆盖 canvas 的 leafCol） */
  columns: number
  /** 边距预设 */
  marginPreset: "compact" | "standard" | "loose"
}
