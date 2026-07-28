import type {
  BookBlock,
  BookDocument,
  BookPageBlock,
  BookPageLayout,
  BookPageMetrics,
  BookPaginationResult,
  BookTextRun,
} from "../../types/bookDocument"
import {
  BOOK_PAGE,
  bodyFontPx,
  charsPerColumn,
  columnGap,
  columnsPerPage,
  headingColumnCount,
  pageMargin,
  textColumns,
} from "./bookPageMetrics"
import { CJK_FALLBACK_FONTS, resolveBookFontFamily, type BookFontSupport } from "./bookFonts"

function isCjkFallbackCharacter(char: string): boolean {
  const point = char.codePointAt(0) ?? -1
  return point >= 0x3000 && point <= 0x303f
    || point >= 0x3400 && point <= 0x4dbf
    || point >= 0x4e00 && point <= 0x9fff
    || point >= 0xf900 && point <= 0xfaff
    || point >= 0xfe10 && point <= 0xfe1f
    || point >= 0xfe30 && point <= 0xfe4f
    || point >= 0xff01 && point <= 0xff60
    || point >= 0xffe0 && point <= 0xffe6
    || point >= 0x20000 && point <= 0x2ee5f
    || point >= 0x2f800 && point <= 0x2fa1f
    || point >= 0x30000 && point <= 0x3347f
}

function blockColumnSpan(block: BookBlock, columns: string[]): number {
  switch (block.type) {
    case "cover":
      return 0
    case "generationHeading":
      return headingColumnCount()
    case "person":
      return columns.length
    case "pageBreak":
      return 0
  }
}

function blockTextColumns(block: BookBlock, doc: BookDocument): string[] {
  if (block.type === "cover") return [block.title, block.subtitle ?? ""]
  if (block.type === "generationHeading") return [block.text]
  if (block.type === "person") return textColumns(block.text, doc.layout)
  return []
}

function textRuns(text: string, fontFamily: string, supportsGlyph: BookFontSupport): BookTextRun[] {
  const runs: BookTextRun[] = []
  Array.from(text).forEach((char) => {
    let actualFont = fontFamily
    if (isCjkFallbackCharacter(char) && !supportsGlyph(fontFamily, char)) {
      const fallbackFont = CJK_FALLBACK_FONTS.find((family) => supportsGlyph(family, char))
      if (!fallbackFont) throw new Error(`后备字体缺少字形：${char}`)
      actualFont = fallbackFont
    }
    const previous = runs.at(-1)
    if (previous?.fontFamily === actualFont) previous.text += char
    else runs.push({ text: char, fontFamily: actualFont })
  })
  return runs
}

function layoutBlock(block: BookBlock, blockIndex: number, doc: BookDocument, supportsGlyph: BookFontSupport): BookPageBlock {
  const columns = blockTextColumns(block, doc)
  const fontFamily = block.type === "cover" ? "qiji-combo" : resolveBookFontFamily(doc.layout.fontFamily)
  return {
    block,
    blockIndex,
    columnSpan: blockColumnSpan(block, columns),
    fontFamily,
    columns: columns.map((text) => ({
      text,
      runs: textRuns(text, fontFamily, supportsGlyph),
    })),
  }
}

function layoutMetrics(doc: BookDocument): BookPageMetrics {
  return {
    pageWidth: BOOK_PAGE.width,
    pageHeight: BOOK_PAGE.height,
    pageMargin: pageMargin(doc.layout),
    bodyFontSize: bodyFontPx(doc.layout),
    columnGap: columnGap(doc.layout),
    charsPerColumn: charsPerColumn(doc.layout),
    columnsPerPage: columnsPerPage(doc.layout),
  }
}

function makePage(pages: BookPageLayout[]): BookPageLayout {
  const page = { pageNumber: pages.length + 1, blocks: [] as BookPageBlock[] }
  pages.push(page)
  return page
}

function hasPrintableBlock(page: BookPageLayout): boolean {
  return page.blocks.some((item) => item.block.type !== "pageBreak")
}

function withColumns(item: BookPageBlock, columns: BookPageBlock["columns"]): BookPageBlock {
  return { ...item, columnSpan: columns.length, columns }
}

export function paginateBook(doc: BookDocument, supportsGlyph: BookFontSupport = () => true): BookPaginationResult {
  const pages: BookPageLayout[] = []
  let page = makePage(pages)
  let used = 0
  const metrics = layoutMetrics(doc)

  doc.blocks.forEach((block, blockIndex) => {
    const item = layoutBlock(block, blockIndex, doc, supportsGlyph)
    if (block.type === "cover") {
      if (hasPrintableBlock(page)) page = makePage(pages)
      page.blocks.push(item)
      page = makePage(pages)
      used = 0
      return
    }

    if (block.type === "pageBreak") {
      if (hasPrintableBlock(page)) {
        page = makePage(pages)
        used = 0
      }
      page.blocks.push(item)
      return
    }

    const nextBlock = doc.blocks[blockIndex + 1]
    let reservedNextColumns = 0
    if (block.type === "generationHeading" && nextBlock?.type === "person") {
      const nextItem = layoutBlock(nextBlock, blockIndex + 1, doc, supportsGlyph)
      const availableAfterHeading = metrics.columnsPerPage - item.columnSpan
      reservedNextColumns = nextItem.columnSpan <= availableAfterHeading ? nextItem.columnSpan : 1
    }
    if (block.type !== "person" && hasPrintableBlock(page) && used + item.columnSpan + reservedNextColumns > metrics.columnsPerPage) {
      page = makePage(pages)
      used = 0
    }

    if (block.type === "person") {
      const followsHeading = page.blocks.at(-1)?.block.type === "generationHeading"
      const available = metrics.columnsPerPage - used
      if (item.columnSpan <= available) {
        page.blocks.push(item)
        used += item.columnSpan
        return
      }
      if (item.columnSpan <= metrics.columnsPerPage && !followsHeading) {
        page = makePage(pages)
        page.blocks.push(item)
        used = item.columnSpan
        return
      }

      if (hasPrintableBlock(page) && !followsHeading) {
        page = makePage(pages)
        used = 0
      }
      let remainingColumns = item.columns
      while (remainingColumns.length > 0) {
        const fragmentColumns = remainingColumns.slice(0, metrics.columnsPerPage - used)
        page.blocks.push(withColumns(item, fragmentColumns))
        used += fragmentColumns.length
        remainingColumns = remainingColumns.slice(fragmentColumns.length)
        if (remainingColumns.length > 0) {
          page = makePage(pages)
          used = 0
        }
      }
      return
    }

    page.blocks.push(item)
    used += item.columnSpan
  })

  const visiblePages = pages.filter(hasPrintableBlock)
  const orphanedPageBreaks = pages.flatMap((page) => hasPrintableBlock(page) ? [] : page.blocks)
  if (orphanedPageBreaks.length > 0) {
    const lastPage = visiblePages.at(-1)
    if (lastPage) lastPage.blocks.push(...orphanedPageBreaks)
    else visiblePages.push({ pageNumber: 1, blocks: orphanedPageBreaks })
  }

  return {
    pages: visiblePages,
    metrics,
  }
}
