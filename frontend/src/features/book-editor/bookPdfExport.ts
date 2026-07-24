import fontkit from "@pdf-lib/fontkit"
import { PDFDocument, rgb, type Color, type PDFFont, type PDFPage } from "pdf-lib"
import type { BookDocument, BookPageLayout } from "../../types/bookDocument"
import { BOOK_PAGE, bodyFontPx, charsPerColumn, columnGap, columnsPerPage, pageMargin, textColumns } from "./bookPageMetrics"

const FONT_URLS: Record<string, string> = {
  "qiji-combo": "/vrain/fonts/qiji-combo.ttf",
  "WenYue-GuTiFangSong": "/vrain/fonts/WenYue-GuTiFangSong-JRFC-2.otf",
  XiaolaiMonoSC: "/vrain/fonts/XiaolaiMonoSC-Regular.ttf",
}

const COLORS = {
  ink: rgb(0.13, 0.09, 0.06),
  muted: rgb(0.43, 0.32, 0.21),
  red: rgb(0.54, 0.12, 0.09),
  black: rgb(0, 0, 0),
  grid: rgb(0, 0, 0),
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
    borderColor: COLORS.black,
    borderWidth: 1,
  })

  for (let x = BOOK_PAGE.width - margin - gap; x > left; x -= gap) {
    page.drawLine({
      start: { x, y: bottom },
      end: { x, y: BOOK_PAGE.height - top },
      thickness: 0.7,
      color: COLORS.grid,
      opacity: 0.34,
    })
  }

  page.drawLine({
    start: { x: right, y: bottom },
    end: { x: right, y: BOOK_PAGE.height - top },
    thickness: 1,
    color: COLORS.black,
  })
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
  const size = bodyFontPx(doc.layout)
  const margin = pageMargin(doc.layout)
  const lineHeight = columnGap(doc.layout)

  for (const pageLayout of pages) {
    const page = pdf.addPage([BOOK_PAGE.width, BOOK_PAGE.height])
    const isClassic = doc.layout.templateId === "classic"

    page.drawRectangle({
      x: 0,
      y: 0,
      width: BOOK_PAGE.width,
      height: BOOK_PAGE.height,
      color: pageBackground(doc.layout.templateId),
    })
    drawTopRect(page, 44, 44, BOOK_PAGE.width - 88, BOOK_PAGE.height - 88, {
      borderColor: COLORS.black,
      borderWidth: 2,
    })
    if (isClassic) {
      const innerInset = margin - 38
      drawTopRect(page, innerInset, innerInset, BOOK_PAGE.width - innerInset * 2, BOOK_PAGE.height - innerInset * 2, {
        borderColor: COLORS.black,
        borderWidth: 1,
      })
    }
    if (!pageLayout.blocks.some((item) => item.block.type === "cover")) {
      drawColumnRules(page, margin, lineHeight, columnsPerPage(doc.layout), charsPerColumn(doc.layout))
    }

    let x = BOOK_PAGE.width - margin - lineHeight / 2
    const y = margin
    for (const item of pageLayout.blocks) {
      const block = item.block
      if (block.type === "cover") {
        const titleSize = 64
        const titleTop = BOOK_PAGE.height / 2 - block.title.length * 36
        drawTopRect(page, BOOK_PAGE.width / 2 + 6, titleTop - 30, 84, block.title.length * 72 + 60, {
          borderColor: COLORS.red,
          borderWidth: 1,
          borderOpacity: 0.38,
        })
        drawVerticalColumn(page, font, block.title, BOOK_PAGE.width / 2 + 36, titleTop, 72, titleSize, COLORS.ink)
        if (block.subtitle) {
          drawVerticalColumn(page, font, block.subtitle, BOOK_PAGE.width / 2 - 28, BOOK_PAGE.height / 2 - block.subtitle.length * 18, 38, 32, COLORS.muted)
        }
        continue
      }
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

    const pageNumber = `第 ${toHan(pageLayout.pageNumber)} 页`
    page.drawText(pageNumber, {
      x: BOOK_PAGE.width / 2 - font.widthOfTextAtSize(pageNumber, 20) / 2,
      y: 54,
      size: 20,
      font,
      color: COLORS.muted,
    })
  }

  downloadPdf(await pdf.save(), doc.title)
}
