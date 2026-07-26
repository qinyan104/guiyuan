import fontkit from "@pdf-lib/fontkit"
import { PDFDocument, rgb, type Color, type PDFFont, type PDFPage } from "pdf-lib"
import type { BookDocument, BookPageLayout } from "../../types/bookDocument"
import { BOOK_PAGE, bodyFontPx, charsPerColumn, columnGap, columnsPerPage, pageMargin, textColumns } from "./bookPageMetrics"

const FONT_URLS: Record<string, string> = {
  "qiji-combo": "/vrain/fonts/qiji-combo.ttf",
  "WenYue-GuTiFangSong": "/vrain/fonts/WenYue-GuTiFangSong-JRFC-2.otf",
  XiaolaiMonoSC: "/vrain/fonts/XiaolaiMonoSC-Regular.ttf",
  PingXianZhenSong: "/vrain/fonts/PingXianZhenSong.ttf",
  HanaMinA: "/vrain/fonts/HanaMinA.ttf",
}

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

function topY(top: number, height = 0): number {
  return BOOK_PAGE.height - top - height
}

function drawTopRect(
  page: PDFPage,
  x: number,
  y: number,
  width: number,
  height: number,
  options: { color?: Color; borderColor?: Color; borderWidth?: number; opacity?: number; borderOpacity?: number },
) {
  page.drawRectangle({
    x,
    y: topY(y, height),
    width,
    height,
    ...options,
  })
}

function drawVerticalColumn(page: PDFPage, font: PDFFont, text: string, x: number, y: number, step: number, size: number, color: Color) {
  Array.from(text).forEach((char, index) => {
    const charWidth = font.widthOfTextAtSize(char, size)
    page.drawText(char, {
      x: x - charWidth / 2,
      y: topY(y + index * step, size),
      size,
      font,
      color,
    })
  })
}

function drawColumnRules(page: PDFPage, margin: number, gap: number, columnCount: number, rowCount: number) {
  const gridWidth = columnCount * gap
  const gridHeight = rowCount * gap
  const left = BOOK_PAGE.width - margin - gridWidth
  const top = margin
  const bottom = topY(top, gridHeight)
  const right = left + gridWidth

  drawTopRect(page, left, top, gridWidth, gridHeight, {
    borderColor: COLORS.frame,
    borderWidth: 1,
    borderOpacity: 0.34,
  })

  for (let x = BOOK_PAGE.width - margin - gap; x > left; x -= gap) {
    page.drawLine({
      start: { x, y: bottom },
      end: { x, y: BOOK_PAGE.height - top },
      thickness: 0.7,
      color: COLORS.grid,
      opacity: 0.22,
    })
  }

  page.drawLine({
    start: { x: right, y: bottom },
    end: { x: right, y: BOOK_PAGE.height - top },
    thickness: 1,
    color: COLORS.frame,
    opacity: 0.32,
  })
}

function drawFishTail(page: PDFPage, x: number, centerY: number) {
  page.drawLine({ start: { x: x - 8, y: centerY + 18 }, end: { x, y: centerY + 30 }, thickness: 1, color: COLORS.red, opacity: 0.42 })
  page.drawLine({ start: { x: x + 8, y: centerY + 18 }, end: { x, y: centerY + 30 }, thickness: 1, color: COLORS.red, opacity: 0.42 })
  page.drawLine({ start: { x: x - 8, y: centerY - 18 }, end: { x, y: centerY - 30 }, thickness: 1, color: COLORS.red, opacity: 0.42 })
  page.drawLine({ start: { x: x + 8, y: centerY - 18 }, end: { x, y: centerY - 30 }, thickness: 1, color: COLORS.red, opacity: 0.42 })
}

function drawBookMouth(page: PDFPage, font: PDFFont, pageNumber: number) {
  const isRightPage = pageNumber % 2 === 0
  const x = isRightPage ? 42 : BOOK_PAGE.width - 42
  const centerY = BOOK_PAGE.height / 2
  drawFishTail(page, x, centerY)
  drawVerticalColumn(page, font, toHan(pageNumber), x, BOOK_PAGE.height / 2 - 18, 24, 18, COLORS.muted)
}

function drawCover(page: PDFPage, font: PDFFont, title: string, subtitle?: string) {
  page.drawRectangle({ x: 0, y: 0, width: BOOK_PAGE.width, height: BOOK_PAGE.height, color: COLORS.cover })
  page.drawLine({ start: { x: 54, y: 150 }, end: { x: 54, y: BOOK_PAGE.height - 150 }, thickness: 2, color: COLORS.coverLabel, opacity: 0.36 })
  for (const y of [BOOK_PAGE.height * 0.78, BOOK_PAGE.height * 0.58, BOOK_PAGE.height * 0.38]) {
    page.drawCircle({ x: 54, y, size: 11, color: rgb(0.04, 0.1, 0.12), opacity: 0.52 })
    page.drawCircle({ x: 54, y, size: 5, color: COLORS.coverLabel, opacity: 0.18 })
  }
  drawTopRect(page, BOOK_PAGE.width / 2 + 2, 330, 108, 920, {
    color: COLORS.coverLabel,
    borderColor: COLORS.red,
    borderWidth: 0.8,
    borderOpacity: 0.36,
  })
  drawVerticalColumn(page, font, title, BOOK_PAGE.width / 2 + 40, 412, 78, 66, COLORS.ink)
  if (subtitle) {
    drawVerticalColumn(page, font, subtitle, BOOK_PAGE.width / 2 - 42, 520, 40, 32, COLORS.coverLabel)
  }
}

function pageBackground(templateId: string): Color {
  if (templateId === "white") return COLORS.whitePaper
  if (templateId === "plain") return COLORS.plainPaper
  return COLORS.classicPaper
}

async function embedBookFont(pdf: PDFDocument, fontFamily: string): Promise<PDFFont> {
  pdf.registerFontkit(fontkit)
  const response = await fetch(FONT_URLS[fontFamily] ?? FONT_URLS["qiji-combo"])
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

export async function exportBookPdf(doc: BookDocument, pages: BookPageLayout[]) {
  const pdf = await PDFDocument.create()
  const font = await embedBookFont(pdf, doc.layout.fontFamily)
  const coverFont = doc.layout.fontFamily === "qiji-combo" ? font : await embedBookFont(pdf, "qiji-combo")
  const size = bodyFontPx(doc.layout)
  const margin = pageMargin(doc.layout)
  const lineHeight = columnGap(doc.layout)

  for (const pageLayout of pages) {
    const page = pdf.addPage([BOOK_PAGE.width, BOOK_PAGE.height])
    const isClassic = doc.layout.templateId === "classic"
    const coverBlock = pageLayout.blocks.find((item) => item.block.type === "cover")?.block

    if (coverBlock?.type === "cover") {
      drawCover(page, coverFont, coverBlock.title, coverBlock.subtitle)
      continue
    }

    page.drawRectangle({ x: 0, y: 0, width: BOOK_PAGE.width, height: BOOK_PAGE.height, color: pageBackground(doc.layout.templateId) })
    drawTopRect(page, 44, 44, BOOK_PAGE.width - 88, BOOK_PAGE.height - 88, {
      borderColor: COLORS.frame,
      borderWidth: 1,
      borderOpacity: 0.34,
    })
    if (isClassic) {
      const innerInset = margin - 38
      drawTopRect(page, innerInset, innerInset, BOOK_PAGE.width - innerInset * 2, BOOK_PAGE.height - innerInset * 2, {
        borderColor: COLORS.frame,
        borderWidth: 1,
        borderOpacity: 0.3,
      })
    }
    drawColumnRules(page, margin, lineHeight, columnsPerPage(doc.layout), charsPerColumn(doc.layout))
    drawBookMouth(page, font, pageLayout.pageNumber)

    let x = BOOK_PAGE.width - margin - lineHeight / 2
    const y = margin
    for (const item of pageLayout.blocks) {
      const block = item.block
      if (block.type === "generationHeading") {
        drawVerticalColumn(page, font, block.text, x, y, lineHeight, size + 8, COLORS.red)
        x -= lineHeight * 2
      } else if (block.type === "person") {
        for (const column of textColumns(block.text, doc.layout)) {
          drawVerticalColumn(page, font, column, x, y, lineHeight, size, COLORS.ink)
          x -= lineHeight
        }
      }
    }

  }

  downloadPdf(await pdf.save(), doc.title)
}
