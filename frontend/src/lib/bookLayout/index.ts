/**
 * BookLayoutEngine — 古籍排版引擎
 *
 * 纯 TypeScript 实现，零 DOM 依赖（除 Canvas 度量）。
 * 提供从文本到完整页面的一站式排版能力。
 *
 * 导出：
 * - BookLayoutEngine / getBookLayoutEngine  — 排版引擎入口
 * - FontMetricsEngine / getFontMetricsEngine — 字体度量
 * - CanvasConfig / getCanvasConfig            — 画布模板
 * - 所有类型定义                              — 供外部消费
 */

export { BookLayoutEngine, getBookLayoutEngine, DEFAULT_LAYOUT_OPTIONS } from "./BookLayoutEngine"
export { FontMetricsEngine, getFontMetricsEngine } from "./FontMetricsEngine"
export type { FontMetric, MeasureRequest } from "./FontMetricsEngine"
export { CANVAS_CONFIGS, getCanvasConfig, getCanvasIds, getTextArea, getColumnWidth } from "./CanvasConfig"
export { layoutColumns } from "./ColumnFlowEngine"
export { layoutMultiRows } from "./MultiRowEngine"
export { composePage, composePages } from "./PageComposer"
export { CanvasRenderer, getCanvasRenderer } from "./CanvasRenderer"
export { PdfExporter, getPdfExporter } from "./PdfExporter"
export type { PdfExportOptions } from "./PdfExporter"

// 类型重导出
export type {
  Glyph,
  ColumnGlyphs,
  RowGlyphs,
  MultiRowColumnGlyphs,
  PageGlyphs,
  GenHeader,
  RenderLayer,
  BackgroundLayer,
  FrameLayer,
  FishTailLayer,
  HeaderLayer,
  FooterLayer,
  GlyphLayer,
  RowLineLayer,
  RowLine,
  HitRegion,
  ComposedPage,
  CanvasConfig,
  FrameConfig,
  FishTailConfig,
  MultiRowConfig,
  LogoConfig,
  LayoutInput,
  LayoutOptions,
} from "./types"
