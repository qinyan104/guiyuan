/**
 * ColumnFlowEngine — 古籍竖排列流引擎
 *
 * 实现传统线装书竖排文字的列流算法：
 * - 文字从右向左排列（右→左），每列从上到下填充（上→下）
 * - 代际标题自动识别并插入
 * - 列满自动换列，页满自动换页
 *
 * 这是 BookLayoutEngine 的核心排版算法。
 */

import type { LineageEntry } from "../../types/publishing"
import type { CanvasConfig, ColumnGlyphs, GenHeader, Glyph, LayoutInput, LayoutOptions, PageGlyphs } from "./types"
import { getTextArea } from "./CanvasConfig"
import { getFontMetricsEngine } from "./FontMetricsEngine"

// ── 内部状态 ──

interface ColumnCursor {
  /** 当前列索引（0 = 最右列） */
  colIndex: number
  /** 当前列的文字区域上边界 Y */
  colY: number
  /** 当前光标 Y（下一个字符将放置的位置） */
  cursorY: number
}

interface PageState {
  page: PageGlyphs
  columns: ColumnGlyphs[]
  cursor: ColumnCursor
  pageIndex: number
}

// ── 公开 API ──

/**
 * 执行竖排列流排版
 * @returns 排版后的页面数组
 */
export function layoutColumns(input: LayoutInput): PageGlyphs[] {
  const { entries, canvas, options } = input
  const metrics = getFontMetricsEngine()
  const rawTextArea = getTextArea(canvas)
  const colWidth = getColumnWidthInternal(canvas)
  const { fontSize, lineHeight } = options
  const pxFontSize = fontSize * 4 / 3 // pt → px
  const lineStep = pxFontSize * lineHeight
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

  const pages: PageGlyphs[] = []
  let state = createPage(pages.length, canvas)

  // 按世代分组
  const genGroups = groupByGeneration(entries)

  for (const [gen, genEntries] of genGroups) {
    // ── 代际标题 ──
    const headerSpace = lineStep * 3 // 标题占 3 行高
    if (!advanceCursor(headerSpace, state, canvas, lineStep)) {
      pages.push(state.page)
      state = createPage(pages.length, canvas)
    }

    const headerText = genToChineseText(gen)
    const header: GenHeader = {
      generation: gen,
      titleText: headerText,
      columnIndex: state.cursor.colIndex,
      y: state.cursor.cursorY,
    }
    state.page.generationHeaders.push(header)
    state.cursor.cursorY += headerSpace

    // ── 逐条目排版 ──
    for (const entry of genEntries) {
      const text = buildEntryText(entry)
      let i = 0

      while (i < text.length) {
        const ch = text[i]

        // ── 排版控制：换行符 ──
        if (ch === "\n") { i++; continue }

        // ── 排版控制：¶ = 换列 ──
        if (ch === "\u00B6") {
          i++
          state.cursor.cursorY = textArea.y
          if (!advanceCol(state, canvas)) {
            pages.push(state.page)
            state = createPage(pages.length, canvas)
          }
          continue
        }

        // ── 排版控制：§ = 换页 ──
        if (ch === "\u00A7") {
          i++
          pages.push(state.page)
          state = createPage(pages.length, canvas)
          continue
        }

        if (!advanceCursor(lineStep, state, canvas, lineStep)) {
          pages.push(state.page)
          state = createPage(pages.length, canvas)
        }

        const m = metrics.measure(ch, fontFamily, fontSize)
        const col = state.columns[state.cursor.colIndex]

        const glyph: Glyph = {
          char: ch,
          x: col.x + colWidth / 2 - m.width / 2,
          y: state.cursor.cursorY,
          fontIndex: 0,
          fontSize,
          color: "black",
          width: m.width,
          height: m.height,
          sourceEntry: entry,
        }

        col.glyphs.push(glyph)
        state.cursor.cursorY += lineStep
        i++
      }

      // 条目间留一个空行
      state.cursor.cursorY += lineStep * 0.5
    }

    // 世代间额外间距
    state.cursor.cursorY += lineStep
  }

  // 保存最后一页
  if (state.columns.some((c) => c.glyphs.length > 0)) {
    pages.push(state.page)
  }

  return pages
}

// ── 内部函数 ──

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
  // 格式：姓名 + 正文
  // 这里使用 lineageText.ts 中已格式化的 formattedText
  // 如果 formattedText 已包含姓名，直接用；否则在前面加姓名
  const text = entry.formattedText
  if (text.startsWith(entry.personName)) return text
  return entry.personName + text
}

function genToChineseText(gen: number): string {
  const labels = [
    "第一世", "第二世", "第三世", "第四世", "第五世",
    "第六世", "第七世", "第八世", "第九世", "第十世",
    "十一世", "十二世", "十三世", "十四世", "十五世",
    "十六世", "十七世", "十八世", "十九世", "二十世",
  ]
  if (gen >= 0 && gen < labels.length) return labels[gen]
  return `第${gen + 1}世`
}

function getColumnWidthInternal(config: CanvasConfig): number {
  const textArea = getTextArea(config)
  const colCount = Math.max(1, config.leafCol)
  return textArea.width / colCount
}

function createPage(
  pageIndex: number,
  config: CanvasConfig,
): PageState {
  const textArea = getTextArea(config)
  const colWidth = getColumnWidthInternal(config)
  const colCount = config.leafCol

  const columns: ColumnGlyphs[] = []
  for (let i = 0; i < colCount; i++) {
    columns.push({
      columnIndex: i,
      x: textArea.x + (colCount - 1 - i) * colWidth, // 右→左：最右列 index 0
      y: textArea.y,
      width: colWidth,
      height: textArea.height,
      glyphs: [],
    })
  }

  const page: PageGlyphs = {
    pageNumber: pageIndex + 1,
    columns,
    generationHeaders: [],
  }

  return {
    page,
    columns,
    cursor: {
      colIndex: 0, // 从最右列开始
      colY: textArea.y,
      cursorY: textArea.y,
    },
    pageIndex,
  }
}

/**
 * 确保当前列有足够空间放置下一个字符
 * 如果空间不足，换列或换页
 * @returns true 如果成功确保空间，false 如果需要换页（调用者应保存当前页后创建新页）
 */
function advanceCursor(
  neededHeight: number,
  state: PageState,
  config: CanvasConfig,
  lineStep: number,
): boolean {
  const textArea = getTextArea(config)
  const colBottom = textArea.y + textArea.height

  // 当前列还有空间
  const col = state.columns[state.cursor.colIndex]
  if (state.cursor.cursorY + neededHeight <= colBottom) {
    return true
  }

  // 换到下一列（左侧）
  const nextColIndex = state.cursor.colIndex + 1
  if (nextColIndex < config.leafCol) {
    state.cursor.colIndex = nextColIndex
    state.cursor.cursorY = textArea.y
    return true
  }

  // 所有列用完，需要新页
  return false
}

/** 强制换到下一列（排版控制 ¶ 使用） */
function advanceCol(state: PageState, config: CanvasConfig): boolean {
  const nextColIndex = state.cursor.colIndex + 1
  if (nextColIndex < config.leafCol) {
    state.cursor.colIndex = nextColIndex
    state.cursor.cursorY = getTextArea(config).y
    return true
  }
  return false
}
