import fontkit from "@pdf-lib/fontkit"
import { PDFDocument, rgb, type Color, type PDFFont, type PDFPage } from "pdf-lib"
import type { BookDocument, BookPageMetrics, BookPaginationResult, BookTextRun } from "../../types/bookDocument"
import { BOOK_FONT_URLS, resolveBookFontFamily } from "./bookFonts"

const COLORS = {
  ink: rgb(0.13, 0.09, 0.06),
  muted: rgb(0.43, 0.32, 0.21),
  red: rgb(0.54, 0.12, 0.09),
  frame: rgb(0.2, 0.15, 0.1),
  grid: rgb(0.24, 0.18, 0.12),
  cover: rgb(0.13, 0.22, 0.26),
  coverLabel: rgb(0.94, 0.86, 0.72),
  classicPaper: rgb(0.97, 0.94, 0.87),
  plainPaper: rgb(1, 0.98, 0.94),
  whitePaper: rgb(1, 1, 1),
}

function sanitizeFileName(raw: string): string {
  return raw.replace(/[\\/:*?"<>|]/g, "-").trim() || "族谱"
}

function toHan(value: number): string {
  const nums = ["零", "一", "二", "三", "四", "五", "六", "七", "八", "九", "十"]
  if (value <= 10) return nums[value]
  if (value < 20) return `十${nums[value - 10]}`
  const tens = Math.floor(value / 10)
  const ones = value % 10
  return `${nums[tens]}十${ones ? nums[ones] : ""}`
}

function topY(metrics: BookPageMetrics, top: number, height = 0): number {
  return metrics.pageHeight - top - height
}

function drawTopRect(
  page: PDFPage,
  metrics: BookPageMetrics,
  x: number,
  y: number,
  width: number,
  height: number,
  options: { color?: Color; borderColor?: Color; borderWidth?: number; opacity?: number; borderOpacity?: number },
) {
  page.drawRectangle({
    x,
    y: topY(metrics, y, height),
    width,
    height,
    ...options,
  })
}

function drawVerticalColumn(
  page: PDFPage,
  metrics: BookPageMetrics,
  fonts: ReadonlyMap<string, PDFFont>,
  runs: BookTextRun[],
  x: number,
  y: number,
  step: number,
  size: number,
  color: Color,
) {
  let index = 0
  runs.forEach((run) => {
    const font = fonts.get(run.fontFamily)
    if (!font) throw new Error("无法加载 PDF 字体")
    Array.from(run.text).forEach((char) => {
      const charWidth = font.widthOfTextAtSize(char, size)
      page.drawText(char, {
        x: x - charWidth / 2,
        y: topY(metrics, y + index * step, size),
        size,
        font,
        color,
      })
      index += 1
    })
  })
}

function drawColumnRules(page: PDFPage, metrics: BookPageMetrics) {
  const gridWidth = metrics.columnsPerPage * metrics.columnGap
  const gridHeight = metrics.charsPerColumn * metrics.columnGap
  const left = metrics.pageWidth - metrics.pageMargin - gridWidth
  const top = metrics.pageMargin
  const bottom = topY(metrics, top, gridHeight)
  const right = left + gridWidth

  drawTopRect(page, metrics, left, top, gridWidth, gridHeight, {
    borderColor: COLORS.frame,
    borderWidth: 1,
    borderOpacity: 0.34,
  })

  for (let x = metrics.pageWidth - metrics.pageMargin - metrics.columnGap; x > left; x -= metrics.columnGap) {
    page.drawLine({
      start: { x, y: bottom },
      end: { x, y: metrics.pageHeight - top },
      thickness: 0.7,
      color: COLORS.grid,
      opacity: 0.22,
    })
  }

  page.drawLine({
    start: { x: right, y: bottom },
    end: { x: right, y: metrics.pageHeight - top },
    thickness: 1,
    color: COLORS.frame,
    opacity: 0.32,
  })
}

function drawCover(
  page: PDFPage,
  metrics: BookPageMetrics,
  fonts: ReadonlyMap<string, PDFFont>,
  titleRuns: BookTextRun[],
  subtitleRuns: BookTextRun[],
) {
  page.drawRectangle({ x: 0, y: 0, width: metrics.pageWidth, height: metrics.pageHeight, color: COLORS.cover })
  page.drawLine({ start: { x: 54, y: 150 }, end: { x: 54, y: metrics.pageHeight - 150 }, thickness: 2, color: COLORS.coverLabel, opacity: 0.36 })
  for (const y of [metrics.pageHeight * 0.78, metrics.pageHeight * 0.58, metrics.pageHeight * 0.38]) {
    page.drawCircle({ x: 54, y, size: 11, color: rgb(0.04, 0.1, 0.12), opacity: 0.52 })
    page.drawCircle({ x: 54, y, size: 5, color: COLORS.coverLabel, opacity: 0.18 })
  }
  drawTopRect(page, metrics, metrics.pageWidth / 2 + 2, 330, 108, 920, {
    color: COLORS.coverLabel,
    borderColor: COLORS.red,
    borderWidth: 0.8,
    borderOpacity: 0.36,
  })
  drawVerticalColumn(page, metrics, fonts, titleRuns, metrics.pageWidth / 2 + 40, 412, 78, 66, COLORS.ink)
  if (subtitleRuns.length > 0) {
    drawVerticalColumn(page, metrics, fonts, subtitleRuns, metrics.pageWidth / 2 - 42, 520, 40, 32, COLORS.coverLabel)
  }
}

function pageBackground(templateId: string): Color {
  if (templateId === "white") return COLORS.whitePaper
  if (templateId === "plain") return COLORS.plainPaper
  return COLORS.classicPaper
}

async function embedBookFont(pdf: PDFDocument, fontFamily: string): Promise<PDFFont> {
  pdf.registerFontkit(fontkit)
  const response = await fetch(BOOK_FONT_URLS[resolveBookFontFamily(fontFamily)])
  if (!response.ok) throw new Error("无法加载 PDF 字体")
  return pdf.embedFont(await response.arrayBuffer(), { subset: true })
}

function downloadPdf(bytes: Uint8Array, fileName: string) {
  const blob = new Blob([bytes as BlobPart], { type: "application/pdf" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = `${sanitizeFileName(fileName)}.pdf`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

export async function exportBookPdf(doc: BookDocument, pagination: BookPaginationResult) {
  const pdf = await PDFDocument.create()
  const bodyFontFamily = resolveBookFontFamily(doc.layout.fontFamily)
  const fontFamilies = new Set<string>([bodyFontFamily])
  pagination.pages.forEach((page) => page.blocks.forEach((item) => {
    fontFamilies.add(item.fontFamily)
    item.columns.forEach((column) => column.runs.forEach((run) => fontFamilies.add(run.fontFamily)))
  }))
  const fonts = new Map<string, PDFFont>()
  for (const fontFamily of fontFamilies) fonts.set(fontFamily, await embedBookFont(pdf, fontFamily))
  const bodyFont = fonts.get(bodyFontFamily)!
  const metrics = pagination.metrics
  const size = metrics.bodyFontSize
  const margin = metrics.pageMargin
  const lineHeight = metrics.columnGap

  for (const pageLayout of pagination.pages) {
    if (pageLayout.blocks.every((item) => item.block.type === "pageBreak")) continue
    const page = pdf.addPage([metrics.pageWidth, metrics.pageHeight])
    const isClassic = doc.layout.templateId === "classic"
    const coverItem = pageLayout.blocks.find((item) => item.block.type === "cover")

    if (coverItem?.block.type === "cover") {
      drawCover(page, metrics, fonts, coverItem.columns[0]?.runs ?? [], coverItem.columns[1]?.runs ?? [])
      continue
    }

    page.drawRectangle({ x: 0, y: 0, width: metrics.pageWidth, height: metrics.pageHeight, color: pageBackground(doc.layout.templateId) })
    drawTopRect(page, metrics, 44, 44, metrics.pageWidth - 88, metrics.pageHeight - 88, {
      borderColor: COLORS.frame,
      borderWidth: 1,
      borderOpacity: 0.34,
    })
    if (isClassic) {
      const innerInset = margin - 38
      drawTopRect(page, metrics, innerInset, innerInset, metrics.pageWidth - innerInset * 2, metrics.pageHeight - innerInset * 2, {
        borderColor: COLORS.frame,
        borderWidth: 1,
        borderOpacity: 0.3,
      })
    }
    drawColumnRules(page, metrics)

    let x = metrics.pageWidth - margin - lineHeight / 2
    const y = margin
    for (const item of pageLayout.blocks) {
      const block = item.block
      if (block.type === "generationHeading") {
        for (const column of item.columns) {
          drawVerticalColumn(page, metrics, fonts, column.runs, x, y, lineHeight, size + 8, COLORS.red)
          x -= lineHeight
        }
        x -= lineHeight * Math.max(0, item.columnSpan - item.columns.length)
      } else if (block.type === "person") {
        for (const column of item.columns) {
          drawVerticalColumn(page, metrics, fonts, column.runs, x, y, lineHeight, size, COLORS.ink)
          x -= lineHeight
        }
      }
    }

    const pageNumber = `第 ${toHan(pageLayout.pageNumber)} 页`
    page.drawText(pageNumber, {
      x: metrics.pageWidth / 2 - bodyFont.widthOfTextAtSize(pageNumber, 20) / 2,
      y: 54,
      size: 20,
      font: bodyFont,
      color: COLORS.muted,
      opacity: 0.62,
    })
  }

  downloadPdf(await pdf.save(), doc.title)
}
