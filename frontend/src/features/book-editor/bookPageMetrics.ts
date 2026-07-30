import type { BookDocument, BookLayout } from "../../types/bookDocument"

export const BOOK_PAGE = {
  width: 1240,
  height: 1754,
}

export function pageMargin(layout: BookLayout): number {
  const base = layout.marginPreset === "compact" ? 138 : layout.marginPreset === "loose" ? 210 : 168
  if (layout.templateId === "white") return base + 32
  if (layout.templateId === "plain") return base + 18
  return base
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

export function textColumnSlices(text: string, layout: BookLayout): Array<{ text: string; start: number; end: number }> {
  const perColumn = charsPerColumn(layout)
  const columns: Array<{ text: string; start: number; end: number }> = []
  if (!text) return [{ text: "", start: 0, end: 0 }]
  let sourceOffset = 0
  text.split("\n").forEach((part, index, parts) => {
    const characters = Array.from(part)
    let partOffset = 0
    for (let i = 0; i < characters.length; i += perColumn) {
      const value = characters.slice(i, i + perColumn).join("")
      columns.push({ text: value, start: sourceOffset + partOffset, end: sourceOffset + partOffset + value.length })
      partOffset += value.length
    }
    sourceOffset += part.length
    if (index < parts.length - 1) {
      columns.push({ text: "", start: sourceOffset, end: sourceOffset + 1 })
      sourceOffset += 1
    }
  })
  return columns
}

export function textColumns(text: string, layout: BookLayout): string[] {
  return textColumnSlices(text, layout).map((column) => column.text)
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
