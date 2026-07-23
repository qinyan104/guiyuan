import { PDFDocument } from "pdf-lib"
import type { BookDocument, BookPageLayout } from "../../types/bookDocument"
import { BOOK_PAGE, bodyFontPx, charsPerColumn, columnGap, columnsPerPage, pageMargin, textColumns } from "./bookPageMetrics"

const FONT_URLS: Record<string, string> = {
  "qiji-combo": "/vrain/fonts/qiji-combo.ttf",
  "WenYue-GuTiFangSong": "/vrain/fonts/WenYue-GuTiFangSong-JRFC-2.otf",
  "XiaolaiMonoSC": "/vrain/fonts/XiaolaiMonoSC-Regular.ttf",
}

function sanitizeFileName(raw: string): string {
  return raw.replace(/[\\/:*?"<>|]/g, "-").trim() || "族谱"
}

function drawVerticalColumn(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, step: number) {
  Array.from(text).forEach((char, index) => {
    ctx.fillText(char, x, y + index * step)
  })
}

function toHan(value: number): string {
  const nums = ["零", "一", "二", "三", "四", "五", "六", "七", "八", "九", "十"]
  if (value <= 10) return nums[value]
  if (value < 20) return `十${nums[value - 10]}`
  const tens = Math.floor(value / 10)
  const ones = value % 10
  return `${nums[tens]}十${ones ? nums[ones] : ""}`
}

function drawColumnRules(ctx: CanvasRenderingContext2D, margin: number, gap: number, columnCount: number, rowCount: number) {
  const gridWidth = columnCount * gap
  const gridHeight = rowCount * gap
  const left = BOOK_PAGE.width - margin - gridWidth

  ctx.save()
  ctx.strokeStyle = "#000"
  ctx.lineWidth = 1
  ctx.strokeRect(left, margin, gridWidth, gridHeight)
  for (let x = BOOK_PAGE.width - margin - gap; x > left; x -= gap) {
    ctx.beginPath()
    ctx.moveTo(x, margin)
    ctx.lineTo(x, margin + gridHeight)
    ctx.stroke()
  }
  ctx.restore()
}

export async function exportBookPdf(doc: BookDocument, pages: BookPageLayout[]) {
  if (FONT_URLS[doc.layout.fontFamily]) {
    const font = new FontFace(doc.layout.fontFamily, `url(${FONT_URLS[doc.layout.fontFamily]})`)
    await font.load()
    document.fonts.add(font)
  }

  const pdf = await PDFDocument.create()
  const size = bodyFontPx(doc.layout)
  const margin = pageMargin(doc.layout)
  const lineHeight = columnGap(doc.layout)
  const canvas = document.createElement("canvas")
  canvas.width = BOOK_PAGE.width
  canvas.height = BOOK_PAGE.height
  const ctx = canvas.getContext("2d")
  if (!ctx) throw new Error("无法创建 PDF 画布")

  for (const pageLayout of pages) {
    const isClassic = doc.layout.templateId === "classic"
    const pageBackground = doc.layout.templateId === "white" ? "#fff" : doc.layout.templateId === "plain" ? "#fffaf0" : "#f8f0df"

    ctx.clearRect(0, 0, BOOK_PAGE.width, BOOK_PAGE.height)
    ctx.fillStyle = pageBackground
    ctx.fillRect(0, 0, BOOK_PAGE.width, BOOK_PAGE.height)
    if (isClassic) {
      ctx.fillStyle = "rgba(120,82,42,0.045)"
      ctx.beginPath()
      ctx.arc(BOOK_PAGE.width * 0.18, BOOK_PAGE.height * 0.22, 230, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillStyle = "rgba(110,74,38,0.035)"
      ctx.beginPath()
      ctx.arc(BOOK_PAGE.width * 0.76, BOOK_PAGE.height * 0.68, 260, 0, Math.PI * 2)
      ctx.fill()
    }
    ctx.strokeStyle = "#000"
    ctx.lineWidth = 2
    ctx.strokeRect(44, 44, BOOK_PAGE.width - 88, BOOK_PAGE.height - 88)
    ctx.strokeStyle = "#000"
    ctx.lineWidth = 1
    const innerInset = margin - 38
    ctx.strokeRect(innerInset, innerInset, BOOK_PAGE.width - innerInset * 2, BOOK_PAGE.height - innerInset * 2)
    if (!pageLayout.blocks.some((item) => item.block.type === "cover")) {
      drawColumnRules(ctx, margin, lineHeight, columnsPerPage(doc.layout), charsPerColumn(doc.layout))
    }
    ctx.fillStyle = "#21170f"
    ctx.textBaseline = "top"
    ctx.font = `${size}px ${doc.layout.fontFamily}, SimSun, serif`
    let x = BOOK_PAGE.width - margin - lineHeight / 2
    const y = margin
    for (const item of pageLayout.blocks) {
      const block = item.block
      if (block.type === "cover") {
        ctx.textAlign = "center"
        ctx.font = `64px ${doc.layout.fontFamily}, SimSun, serif`
        ctx.strokeStyle = "rgba(138,31,22,0.38)"
        ctx.strokeRect(BOOK_PAGE.width / 2 + 6, BOOK_PAGE.height / 2 - block.title.length * 36 - 30, 84, block.title.length * 72 + 60)
        drawVerticalColumn(ctx, block.title, BOOK_PAGE.width / 2 + 36, BOOK_PAGE.height / 2 - block.title.length * 36, 72)
        if (block.subtitle) {
          ctx.font = `32px ${doc.layout.fontFamily}, SimSun, serif`
          ctx.fillStyle = "#6e5136"
          drawVerticalColumn(ctx, block.subtitle, BOOK_PAGE.width / 2 - 28, BOOK_PAGE.height / 2 - block.subtitle.length * 18, 38)
          ctx.fillStyle = "#21170f"
        }
        ctx.textAlign = "left"
        ctx.font = `${size}px ${doc.layout.fontFamily}, SimSun, serif`
        continue
      }
      if (block.type === "generationHeading") {
        ctx.fillStyle = "#8a1f16"
        ctx.font = `${size + 8}px ${doc.layout.fontFamily}, SimSun, serif`
        drawVerticalColumn(ctx, block.text, x, y, lineHeight)
        ctx.fillStyle = "#21170f"
        ctx.font = `${size}px ${doc.layout.fontFamily}, SimSun, serif`
        x -= lineHeight * 2
      } else if (block.type === "person") {
        for (const column of textColumns(block.text, doc.layout)) {
          drawVerticalColumn(ctx, column, x, y, lineHeight)
          x -= lineHeight
        }
        x -= lineHeight
      }
    }
    ctx.textAlign = "center"
    ctx.font = `20px ${doc.layout.fontFamily}, SimSun, serif`
    ctx.fillStyle = "#6e5136"
    ctx.fillText(`第 ${toHan(pageLayout.pageNumber)} 页`, BOOK_PAGE.width / 2, BOOK_PAGE.height - 74)
    ctx.textAlign = "left"

    const png = await pdf.embedPng(canvas.toDataURL("image/png"))
    const page = pdf.addPage([BOOK_PAGE.width, BOOK_PAGE.height])
    page.drawImage(png, { x: 0, y: 0, width: BOOK_PAGE.width, height: BOOK_PAGE.height })
  }

  const bytes = await pdf.save()
  const blob = new Blob([bytes as BlobPart], { type: "application/pdf" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = `${sanitizeFileName(doc.title)}.pdf`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
