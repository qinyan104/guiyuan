import type { BookDocument, BookPageLayout, BookPageBlock, BookBlock } from "../../types/bookDocument"
import { headingColumnCount, maxColumns, textColumnCount } from "./bookPageMetrics"

function blockColumns(block: BookBlock, doc: BookDocument): number {
  switch (block.type) {
    case "cover":
      return 0
    case "generationHeading":
      return headingColumnCount()
    case "person":
      return textColumnCount(block.text, doc.layout) + 1
    case "pageBreak":
      return 0
  }
}

function makePage(pages: BookPageLayout[]): BookPageLayout {
  const page = { pageNumber: pages.length + 1, blocks: [] as BookPageBlock[] }
  pages.push(page)
  return page
}

export function paginateBook(doc: BookDocument): BookPageLayout[] {
  const pages: BookPageLayout[] = []
  let page = makePage(pages)
  let used = 0
  const max = maxColumns(doc)

  doc.blocks.forEach((block, blockIndex) => {
    if (block.type === "cover") {
      if (page.blocks.length > 0) page = makePage(pages)
      page.blocks.push({ block, blockIndex })
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

    const columns = blockColumns(block, doc)
    if (page.blocks.length > 0 && used + columns > max) {
      page = makePage(pages)
      used = 0
    }
    page.blocks.push({ block, blockIndex })
    used += columns
  })

  return pages.filter((p) => p.blocks.length > 0)
}
