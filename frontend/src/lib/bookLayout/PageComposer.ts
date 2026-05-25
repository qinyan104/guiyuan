/**
 * PageComposer — 页面合成器
 *
 * 将排版后的原始页面 (PageGlyphs) 合成为完整的渲染页面 (ComposedPage)。
 * 添加所有装饰元素：背景、版框、鱼尾、页眉、页码、字形、分隔线。
 *
 * 输出可直接用于 Canvas 渲染或 PDF 导出。
 */

import type {
  BackgroundLayer,
  CanvasConfig,
  ComposedPage,
  FishTailLayer,
  FooterLayer,
  FrameLayer,
  GlyphLayer,
  HeaderLayer,
  HitRegion,
  PageGlyphs,
  RenderLayer,
  RowLine,
  RowLineLayer,
} from "./types"
import { getTextArea } from "./CanvasConfig"

/**
 * 将原始排版数据合成为完整页面
 */
export function composePage(
  glyphs: PageGlyphs,
  config: CanvasConfig,
  totalPages: number,
): ComposedPage {
  const layers: RenderLayer[] = []
  const hitRegions: HitRegion[] = []

  // 1. 背景
  layers.push(createBackground(config))

  // 2. 版框（双层线 + 版心折叠线）
  const frame = createFrame(config)
  if (frame) layers.push(frame)

  // 3. 鱼尾装饰
  const topFish = createFishTail(config, "top")
  if (topFish) layers.push(topFish)
  const btmFish = createFishTail(config, "bottom")
  if (btmFish) layers.push(btmFish)

  // 4. 页眉（书口标题 + 页码）
  const header = createHeader(config, glyphs.pageNumber, totalPages)
  if (header) layers.push(header)

  // 5. 字形
  if (glyphs.columns) {
    const allGlyphs = glyphs.columns.flatMap((c) => c.glyphs)
    layers.push({ kind: "glyph", glyphs: allGlyphs } as GlyphLayer)
  }

  if (glyphs.multiRowColumns) {
    const allGlyphs = glyphs.multiRowColumns.flatMap((c) =>
      c.rows.flatMap((r) => r.glyphs),
    )
    layers.push({ kind: "glyph", glyphs: allGlyphs } as GlyphLayer)

    // 多行分隔线
    const rowLines = createRowLines(glyphs, config)
    if (rowLines) layers.push(rowLines)
  }

  // 6. 列分隔线（版心内的淡色竖线）
  const colLines = createColumnLines(config)
  if (colLines) layers.push(colLines)

  // 7. 页脚
  const footer = createFooter(config, glyphs.pageNumber)
  if (footer) layers.push(footer)

  // 7. 构建交互区域
  if (glyphs.columns) {
    for (const col of glyphs.columns) {
      for (const g of col.glyphs) {
        if (g.sourceEntry) {
          hitRegions.push({
            id: g.sourceEntry.personId,
            rect: { x: g.x - 2, y: g.y - 2, width: g.width + 4, height: g.height + 4 },
            entry: g.sourceEntry,
            action: "edit",
          })
        }
      }
    }
  }

  if (glyphs.multiRowColumns) {
    for (const col of glyphs.multiRowColumns) {
      for (const row of col.rows) {
        for (const g of row.glyphs) {
          if (g.sourceEntry) {
            hitRegions.push({
              id: g.sourceEntry.personId,
              rect: { x: g.x - 2, y: g.y - 2, width: g.width + 4, height: g.height + 4 },
              entry: g.sourceEntry,
              action: "edit",
            })
          }
        }
      }
    }
  }

  return {
    pageNumber: glyphs.pageNumber,
    width: config.width,
    height: config.height,
    layers,
    hitRegions,
    glyphs,
  }
}

function createColumnLines(config: CanvasConfig): RowLineLayer | null {
  const textArea = getTextArea(config)
  const colCount = config.leafCol
  if (colCount <= 1) return null

  const colWidth = textArea.width / colCount
  const lines: RowLine[] = []

  // 列间竖线（从第一列到倒数第二列的右边）
  for (let i = 1; i < colCount; i++) {
    const x = textArea.x + i * colWidth
    lines.push({
      x1: x, y1: textArea.y,
      x2: x, y2: textArea.y + textArea.height,
      lineWidth: 0.5,
      color: "#d0c8b8",
    })
  }

  return { kind: "rowLine", lines }
}

// ── 装饰元素创建 ──

function createBackground(config: CanvasConfig): BackgroundLayer {
  return {
    kind: "background",
    color: config.backgroundColor,
    textureUrl: config.backgroundImage
      ? `/vrain/canvas/${config.backgroundImage}`
      : undefined,
    textureOpacity: config.backgroundImage ? 0.3 : 0,
    pageWidth: config.width,
    pageHeight: config.height,
  }
}

function createFrame(config: CanvasConfig): FrameLayer | null {
  const frame = config.frame
  if (frame.inlineWidth === 0 && frame.outlineWidth === 0) return null

  const margin = Math.max(frame.inlineWidth, frame.outlineWidth) + frame.outlineHMargin

  const inlineRect = {
    x: config.margins.left + margin,
    y: config.margins.top + margin,
    width: config.width - config.margins.left - config.margins.right - margin * 2,
    height: config.height - config.margins.top - config.margins.bottom - margin * 2,
  }

  let outlineRect = null
  if (frame.outlineWidth > 0) {
    outlineRect = {
      x: inlineRect.x - frame.outlineHMargin,
      y: inlineRect.y - frame.outlineVMargin,
      width: inlineRect.width + frame.outlineHMargin * 2,
      height: inlineRect.height + frame.outlineVMargin * 2,
    }
  }

  const centerFold =
    config.leafCenterWidth > 0
      ? {
          x: config.width / 2,
          yTop: inlineRect.y,
          yBottom: inlineRect.y + inlineRect.height,
          lineWidth: 1,
          color: frame.inlineColor || "black",
        }
      : undefined

  return {
    kind: "frame",
    inline: {
      ...inlineRect,
      lineWidth: frame.inlineWidth,
      color: frame.inlineColor,
    },
    outline: outlineRect
      ? {
          ...outlineRect,
          lineWidth: frame.outlineWidth,
          color: frame.outlineColor,
        }
      : null,
    centerFold,
  }
}

function createFishTail(
  config: CanvasConfig,
  position: "top" | "bottom",
): FishTailLayer | null {
  const ft = config.fishTail
  if (!ft) return null

  const isTop = position === "top"
  const centerX = config.width / 2

  if (isTop) {
    return {
      kind: "fishTail",
      position: "top",
      centerX,
      rectY: ft.topY,
      rectHeight: ft.topRectHeight,
      triaHeight: ft.topTriaHeight,
      triaDirection: "up",
      color: ft.topColor,
      lineWidth: ft.topLineWidth,
      isFlower: ft.isFlower,
      flowerImageUrl: ft.isFlower ? `/vrain/canvas/${ft.flowerImage}` : undefined,
      connectorLine: ft.lineWidth > 0
        ? {
            yTop: ft.topY + ft.topRectHeight + ft.topTriaHeight,
            yBottom: ft.topY + ft.topRectHeight + ft.topTriaHeight + ft.lineMargin,
            lineWidth: ft.lineWidth,
            color: ft.lineColor,
            margin: ft.lineMargin,
          }
        : undefined,
    }
  } else {
    return {
      kind: "fishTail",
      position: "bottom",
      centerX,
      rectY: ft.bottomY,
      rectHeight: ft.bottomRectHeight,
      triaHeight: ft.bottomTriaHeight,
      triaDirection: ft.bottomDirection === 1 ? "up" : "down",
      color: ft.bottomColor,
      lineWidth: ft.bottomLineWidth,
      isFlower: ft.isFlower,
      flowerImageUrl: ft.isFlower ? `/vrain/canvas/${ft.flowerImage}` : undefined,
      connectorLine: ft.lineWidth > 0
        ? {
            yTop: ft.bottomY - ft.lineMargin,
            yBottom: ft.bottomY,
            lineWidth: ft.lineWidth,
            color: ft.lineColor,
            margin: ft.lineMargin,
          }
        : undefined,
    }
  }
}

function createHeader(
  config: CanvasConfig,
  pageNumber: number,
  totalPages: number,
): HeaderLayer | null {
  const textArea = getTextArea(config)

  return {
    kind: "header",
    title: `世系錄 · ${pageNumber}`,
    x: config.width / 2,
    y: textArea.y - 8,
    fontFamily: "Noto Serif SC",
    fontSize: 10,
    color: config.frame.inlineColor || "#8b7355",
  }
}

function createFooter(
  config: CanvasConfig,
  pageNumber: number,
): FooterLayer | null {
  if (!config.logo.text && !config.logo.image) return null

  const textArea = getTextArea(config)

  return {
    kind: "footer",
    pageNumber,
    totalPages: 0, // 将在批量合成时更新
    x: config.width / 2,
    y: textArea.y + textArea.height + 16,
    fontFamily: config.logo.fontFamily || "Noto Serif SC",
    fontSize: config.logo.fontSize || 8,
    color: config.logo.color || "#8b7355",
    logoText: config.logo.text,
    logoY: config.logo.y,
  }
}

function createRowLines(
  glyphs: PageGlyphs,
  config: CanvasConfig,
): RowLineLayer | null {
  if (!glyphs.multiRowColumns || !config.multiRows?.enabled) return null

  const lines: RowLine[] = []
  const colWidth = getColumnWidth(glyphs, config)

  for (const col of glyphs.multiRowColumns) {
    for (let i = 1; i < col.rows.length; i++) {
      const row = col.rows[i]
      lines.push({
        x1: col.x + 4,
        y1: row.yTop,
        x2: col.x + colWidth - 4,
        y2: row.yTop,
        lineWidth: config.multiRows.lineWidth || 1,
        color: config.multiRows.lineColor || "#ccc",
      })
    }
  }

  if (lines.length === 0) return null
  return { kind: "rowLine", lines }
}

// ── 批量合成 ──

/**
 * 批量合成多页（用于补全 totalPages 信息）
 */
export function composePages(
  glyphPages: PageGlyphs[],
  config: CanvasConfig,
): ComposedPage[] {
  return glyphPages.map((gp) => composePage(gp, config, glyphPages.length))
}

// ── 辅助 ──

function getColumnWidth(glyphs: PageGlyphs, config: CanvasConfig): number {
  if (glyphs.columns && glyphs.columns.length > 0) {
    return glyphs.columns[0].width
  }
  if (glyphs.multiRowColumns && glyphs.multiRowColumns.length > 0) {
    return glyphs.multiRowColumns[0].width
  }
  const textArea = getTextArea(config)
  return textArea.width / Math.max(1, config.leafCol)
}
