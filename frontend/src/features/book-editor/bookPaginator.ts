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

function withColumns(item: BookPageBlock, columns: BookPageBlock["columns"]): BookPageBlock {
  return { ...item, columnSpan: columns.length, columns }
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

    const nextBlock = doc.blocks[blockIndex + 1]
    let reservedNextColumns = 0
    if (block.type === "generationHeading" && nextBlock?.type === "person") {
      const nextItem = layoutBlock(nextBlock, blockIndex + 1, doc)
      const availableAfterHeading = metrics.columnsPerPage - item.columnSpan
      reservedNextColumns = nextItem.columnSpan <= availableAfterHeading ? nextItem.columnSpan : 1
    }
    if (block.type !== "person" && page.blocks.length > 0 && used + item.columnSpan + reservedNextColumns > metrics.columnsPerPage) {
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

      if (page.blocks.length > 0 && !followsHeading) {
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

  return {
    pages: pages.filter((page) => page.blocks.length > 0),
    metrics,
  }
}
