/**
 * MultiRowEngine — 族谱多行分割引擎
 *
 * 当画布启用多行模式 (multiRows.enabled=true) 时，
 * 每列横向切分为 N 行，每行放置一个 LineageEntry。
 * 行间用分隔线隔开。
 *
 * 这是族谱排版区别于普通古籍的核心特征。
 */

import type { LineageEntry } from "../../types/publishing"
import type {
  CanvasConfig,
  Glyph,
  LayoutInput,
  MultiRowColumnGlyphs,
  PageGlyphs,
  RowGlyphs,
} from "./types"
import { getTextArea } from "./CanvasConfig"
import { getFontMetricsEngine } from "./FontMetricsEngine"

/**
 * 执行多行模式排版
 * @returns 排版后的页面数组（使用 multiRowColumns 字段）
 */
export function layoutMultiRows(input: LayoutInput): PageGlyphs[] {
  const { entries, canvas, options } = input
  if (!canvas.multiRows?.enabled) {
    // 回退到普通列流模式
    const { layoutColumns } = require("./ColumnFlowEngine")
    return layoutColumns(input)
  }

  const metrics = getFontMetricsEngine()
  const rawTextArea = getTextArea(canvas)
  const colWidth = getColumnWidthInternal(canvas)
  const { fontSize, lineHeight } = options
  const fontFamily = options.fontFamily || "qiji-combo"
  // 边距缩放
  const marginScale = options.marginPreset === "compact" ? 0.7 : options.marginPreset === "loose" ? 1.3 : 1.0
  const marginPadX = (rawTextArea.width * (1 - marginScale)) / 2
  const marginPadY = (rawTextArea.height * (1 - marginScale)) / 2
  const textArea = {
    x: rawTextArea.x + marginPadX,
    y: rawTextArea.y + marginPadY,
    width: rawTextArea.width * marginScale,
    height: rawTextArea.height * marginScale,
  }
  const rowCount = canvas.multiRows.rowCount
  const rowHeight = textArea.height / rowCount
  const lineStep = fontSize * lineHeight

  const pages: PageGlyphs[] = []
  let currentPage = createMultiRowPage(0, canvas)
  let currentColIndex = 0
  let currentRowIndex = 0

  // 按世代分组
  const genGroups = groupByGeneration(entries)

  for (const [gen, genEntries] of genGroups) {
    for (const entry of genEntries) {
      // 当前列满了 → 换列
      if (currentRowIndex >= rowCount) {
        currentColIndex++
        currentRowIndex = 0

        // 所有列满了 → 换页
        if (currentColIndex >= canvas.leafCol) {
          pages.push(currentPage)
          currentPage = createMultiRowPage(pages.length, canvas)
          currentColIndex = 0
        }
      }

      // 确保该列存在足够的行
      while (currentPage.multiRowColumns!.length <= currentColIndex) {
        currentPage.multiRowColumns!.push({
          columnIndex: currentColIndex,
          x: textArea.x + (canvas.leafCol - 1 - currentColIndex) * colWidth,
          width: colWidth,
          rows: [],
        })
      }

      const column = currentPage.multiRowColumns![currentColIndex]
      while (column.rows.length <= currentRowIndex) {
        column.rows.push({
          rowIndex: column.rows.length,
          yTop: textArea.y + column.rows.length * rowHeight,
          yBottom: textArea.y + (column.rows.length + 1) * rowHeight,
          glyphs: [],
        })
      }

      // 在该行中横向排版
      const row = column.rows[currentRowIndex]
      const text = buildEntryText(entry)
      const rowMidY = (row.yTop + row.yBottom) / 2
      let cursorX = column.x + 4 // 左边距

      for (const char of text) {
        const m = metrics.measure(char, fontFamily, fontSize)
        const glyph: Glyph = {
          char,
          x: cursorX,
          y: rowMidY + fontSize * 0.35, // 基线偏移
          fontIndex: 0,
          fontSize,
          color: "black",
          width: m.width,
          height: m.height,
          sourceEntry: entry,
        }

        row.glyphs.push(glyph)
        cursorX += m.width + 1 // 字间距 1px
      }

      currentRowIndex++
    }
  }

  if (
    currentPage.multiRowColumns &&
    currentPage.multiRowColumns.some((c) => c.rows.some((r) => r.glyphs.length > 0))
  ) {
    pages.push(currentPage)
  }

  return pages
}

// ── 内部函数（与 ColumnFlowEngine 共享） ──

function groupByGeneration(
  entries: LineageEntry[],
): Map<number, LineageEntry[]> {
  const map = new Map<number, LineageEntry[]>()
  for (const entry of entries) {
    const gen = entry.generation ?? 0
    if (!map.has(gen)) map.set(gen, [])
    map.get(gen)!.push(entry)
  }
  return map
}

function buildEntryText(entry: LineageEntry): string {
  const text = entry.formattedText
  if (text.startsWith(entry.personName)) return text
  return entry.personName + text
}

function getColumnWidthInternal(config: CanvasConfig): number {
  const textArea = getTextArea(config)
  const colCount = Math.max(1, config.leafCol)
  return textArea.width / colCount
}

function createMultiRowPage(pageIndex: number, config: CanvasConfig): PageGlyphs {
  return {
    pageNumber: pageIndex + 1,
    multiRowColumns: [],
    generationHeaders: [],
  }
}
