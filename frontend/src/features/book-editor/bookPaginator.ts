import type {
  BookBlock,
  BookDocument,
  BookPageBlock,
  BookPageLayout,
  BookPageMetrics,
  BookPaginationResult,
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
  if (block.type === "generationHeading") return [block.text]
  if (block.type === "person") return textColumns(block.text, doc.layout)
  return []
}

function layoutBlock(block: BookBlock, blockIndex: number, doc: BookDocument): BookPageBlock {
  const columns = blockTextColumns(block, doc)
  const fontFamily = block.type === "cover" ? "qiji-combo" : doc.layout.fontFamily
  return {
    block,
    blockIndex,
    columnSpan: blockColumnSpan(block, columns),
    fontFamily,
    columns: columns.map((text) => ({
      text,
      runs: text ? [{ text, fontFamily }] : [],
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

export function paginateBook(doc: BookDocument): BookPaginationResult {
  const pages: BookPageLayout[] = []
  let page = makePage(pages)
  let used = 0
  const metrics = layoutMetrics(doc)

  doc.blocks.forEach((block, blockIndex) => {
    const item = layoutBlock(block, blockIndex, doc)
    if (block.type === "cover") {
      if (page.blocks.length > 0) page = makePage(pages)
      page.blocks.push(item)
      page = makePage(pages)
      used = 0
      return
    }

    if (block.type === "pageBreak") {
      if (page.blocks.length > 0) {
        page = makePage(pages)
        used = 0
      }
      return
    }

    if (page.blocks.length > 0 && used + item.columnSpan > metrics.columnsPerPage) {
      page = makePage(pages)
      used = 0
    }
    page.blocks.push(item)
    used += item.columnSpan
  })

  return {
    pages: pages.filter((page) => page.blocks.length > 0),
    metrics,
  }
}
