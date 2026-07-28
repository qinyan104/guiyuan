import type { BookDocument, BookLayout } from "../../types/bookDocument"

export const BOOK_PAGE = {
  width: 1240,
  height: 1754,
}

export function pageMargin(layout: BookLayout): number {
  if (layout.marginPreset === "compact") return 138
  if (layout.marginPreset === "loose") return 210
  return 168
}

export function bodyFontPx(layout: BookLayout): number {
  return Math.max(22, Math.min(46, layout.fontSize * 1.7))
}

export function columnGap(layout: BookLayout): number {
  return bodyFontPx(layout) * 1.55
}

export function charsPerColumn(layout: BookLayout): number {
  const margin = pageMargin(layout)
  return Math.max(16, Math.floor((BOOK_PAGE.height - margin * 2) / columnGap(layout)))
}

export function columnsPerPage(layout: BookLayout): number {
  const margin = pageMargin(layout)
  return Math.max(8, Math.floor((BOOK_PAGE.width - margin * 2) / columnGap(layout)))
}

export function textColumns(text: string, layout: BookLayout): string[] {
  const perColumn = charsPerColumn(layout)
  const columns: string[] = []
  if (!text) return [""]
  text.split("\n").forEach((part, index, parts) => {
    const characters = Array.from(part)
    for (let i = 0; i < characters.length; i += perColumn) columns.push(characters.slice(i, i + perColumn).join(""))
    if (index < parts.length - 1) columns.push("")
  })
  return columns
}

export function textColumnCount(text: string, layout: BookLayout): number {
  return Math.max(1, textColumns(text, layout).length)
}

export function headingColumnCount(): number {
  return 2
}

export function maxColumns(doc: BookDocument): number {
  return columnsPerPage(doc.layout)
}
