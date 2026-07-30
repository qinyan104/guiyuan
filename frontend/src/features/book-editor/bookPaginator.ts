import type {
  BookBlock,
  BookDocument,
  BookPageBlock,
  BookPageLayout,
  BookPageMetrics,
  BookPaginationResult,
  BookPageColumn,
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
  textColumnSlices,
  textColumns,
} from "./bookPageMetrics"
import { BOOK_CALLIGRAPHY_FONT, CJK_FALLBACK_FONTS, resolveBookFontFamily, type BookFontSupport } from "./bookFonts"

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
    case "preface":
      return columns.length
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
  if (block.type === "preface") return [block.title, "", ...textColumns(block.text, doc.layout)]
  if (block.type === "generationHeading") return [block.text]
  if (block.type === "person") return textColumns(block.text, doc.layout)
  return []
}

function textRuns(
  text: string,
  fontFamily: string,
  supportsGlyph: BookFontSupport,
  format?: { sourceStart: number; nameStart: number; nameEnd: number; metadataStart: number; textEnd: number },
  ancientPunctuation = false,
): BookTextRun[] {
  const runs: BookTextRun[] = []
  let offset = 0
  Array.from(text).forEach((char) => {
    const sourceOffset = (format?.sourceStart ?? 0) + offset
    const isPunctuation = ancientPunctuation && /[，。、；：！？]/.test(char)
    const variant = isPunctuation
      ? (char === "。" && format && sourceOffset + char.length >= format.textEnd ? "sentenceEnd" : "punctuation")
      : format && sourceOffset >= format.nameStart && sourceOffset < format.nameEnd
      ? "name"
      : format && sourceOffset >= format.metadataStart ? "metadata" : undefined
    let actualFont = variant === "name" ? BOOK_CALLIGRAPHY_FONT : fontFamily
    if (isCjkFallbackCharacter(char) && !supportsGlyph(actualFont, char)) {
      const fallbackFont = CJK_FALLBACK_FONTS.find((family) => supportsGlyph(family, char))
      if (!fallbackFont) throw new Error(`后备字体缺少字形：${char}`)
      actualFont = fallbackFont
    }
    const previous = runs.at(-1)
    if (previous?.fontFamily === actualFont && previous.variant === variant) previous.text += char
    else runs.push({ text: char, fontFamily: actualFont, variant })
    offset += char.length
  })
  return runs
}

function layoutBlock(block: BookBlock, blockIndex: number, doc: BookDocument, supportsGlyph: BookFontSupport): BookPageBlock {
  const sourceColumns = block.type === "person" ? textColumnSlices(block.text, doc.layout) : null
  const columnTexts = sourceColumns?.map((column) => column.text) ?? blockTextColumns(block, doc)
  const fontFamily = block.type === "cover" || block.type === "generationHeading"
    ? BOOK_CALLIGRAPHY_FONT
    : resolveBookFontFamily(doc.layout.fontFamily)
  const firstSentenceEnd = block.type === "person" ? block.text.indexOf("。") : -1
  const nameMarkerStart = block.type === "person" ? block.text.indexOf(`公諱${block.personName}`) : -1
  let nameStart = block.type === "person"
    ? (nameMarkerStart >= 0 ? nameMarkerStart + 2 : block.text.indexOf(block.personName))
    : -1
  let nameEnd = nameStart + (block.type === "person" ? block.personName.length : 0)
  if (block.type === "person" && nameStart < 0) {
    nameStart = 0
    nameEnd = firstSentenceEnd >= 0 ? firstSentenceEnd : block.text.length
  }
  const columns: BookPageColumn[] = columnTexts.map((text, index) => ({
    text,
    runs: textRuns(
      text,
      block.type === "preface" && index === 0 ? BOOK_CALLIGRAPHY_FONT : fontFamily,
      supportsGlyph,
      block.type === "person" ? {
        sourceStart: sourceColumns?.[index]?.start ?? 0,
        nameStart,
        nameEnd,
        metadataStart: firstSentenceEnd >= 0 ? firstSentenceEnd + 1 : block.text.length,
        textEnd: block.text.length,
      } : undefined,
      doc.layout.templateId === "classic" && (block.type === "person" || block.type === "preface"),
    ),
    variant: block.type === "preface" ? (index === 0 ? "prefaceTitle" : index === 1 ? "prefaceSpacer" : undefined) : undefined,
    sourceStart: sourceColumns?.[index]?.start,
    sourceEnd: sourceColumns?.[index]?.end,
  }))
  if (block.type === "person" && block.note?.trim()) {
    const perLine = charsPerColumn(doc.layout)
    const characters = Array.from(block.note.trim())
    for (let index = 0; index < characters.length; index += perLine * 2) {
      const first = characters.slice(index, index + perLine).join("")
      const second = characters.slice(index + perLine, index + perLine * 2).join("")
      const text = first + second
      columns.push({
        text,
        runs: textRuns(text, fontFamily, supportsGlyph, undefined, doc.layout.templateId === "classic"),
        variant: "annotation",
        subcolumns: [first, second].filter(Boolean).map((line) => textRuns(line, fontFamily, supportsGlyph, undefined, doc.layout.templateId === "classic")),
      })
    }
  }
  return {
    block,
    blockIndex,
    columnSpan: blockColumnSpan(block, columns.map((column) => column.text)),
    fontFamily,
    columns,
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

    if (block.type === "preface") {
      if (hasPrintableBlock(page)) page = makePage(pages)
      let remainingColumns = item.columns
      while (remainingColumns.length > 0) {
        const fragmentColumns = remainingColumns.slice(0, metrics.columnsPerPage)
        page.blocks.push(withColumns(item, fragmentColumns))
        remainingColumns = remainingColumns.slice(fragmentColumns.length)
        if (remainingColumns.length > 0) page = makePage(pages)
      }
      page = makePage(pages)
      used = 0
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
  let sectionTitle: string | undefined
  visiblePages.forEach((visiblePage) => {
    const section = visiblePage.blocks.find((item) => item.block.type === "preface" || item.block.type === "generationHeading")?.block
    if (section?.type === "preface") sectionTitle = section.title
    if (section?.type === "generationHeading") sectionTitle = section.text
    visiblePage.sectionTitle = sectionTitle
  })
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
