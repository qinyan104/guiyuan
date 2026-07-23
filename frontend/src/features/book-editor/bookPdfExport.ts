import { PDFDocument } from "pdf-lib"
import type { BookDocument, BookPageLayout } from "../../types/bookDocument"
import { BOOK_PAGE, bodyFontPx, columnGap, pageMargin, textColumns } from "./bookPageMetrics"

function sanitizeFileName(raw: string): string {
  return raw.replace(/[\\/:*?"<>|]/g, "-").trim() || "族谱"
}

function drawVerticalColumn(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, step: number) {
  Array.from(text).forEach((char, index) => {
    ctx.fillText(char, x, y + index * step)
  })
}

export async function exportBookPdf(doc: BookDocument, pages: BookPageLayout[]) {
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
    ctx.clearRect(0, 0, BOOK_PAGE.width, BOOK_PAGE.height)
    ctx.fillStyle = "#f8f0df"
    ctx.fillRect(0, 0, BOOK_PAGE.width, BOOK_PAGE.height)
    ctx.strokeStyle = "#8c6946"
    ctx.lineWidth = 2
    ctx.strokeRect(44, 44, BOOK_PAGE.width - 88, BOOK_PAGE.height - 88)
    ctx.strokeStyle = "rgba(140,105,70,0.32)"
    ctx.lineWidth = 1
    const innerInset = margin - 38
    ctx.strokeRect(innerInset, innerInset, BOOK_PAGE.width - innerInset * 2, BOOK_PAGE.height - innerInset * 2)
    ctx.fillStyle = "rgba(138,31,22,0.62)"
    ctx.font = `18px ${doc.layout.fontFamily}, SimSun, serif`
    ctx.fillText("◆", BOOK_PAGE.width / 2 - 9, 96)
    ctx.fillText("◆", BOOK_PAGE.width / 2 - 9, BOOK_PAGE.height - 128)
    ctx.fillStyle = "#21170f"
    ctx.textBaseline = "top"
    ctx.font = `${size}px ${doc.layout.fontFamily}, SimSun, serif`
    let x = BOOK_PAGE.width - margin
    const y = margin
    for (const item of pageLayout.blocks) {
      const block = item.block
      if (block.type === "cover") {
        ctx.textAlign = "center"
        ctx.font = `64px ${doc.layout.fontFamily}, SimSun, serif`
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
        x -= lineHeight * 1.7
      } else if (block.type === "person") {
        for (const column of textColumns(block.text, doc.layout)) {
          drawVerticalColumn(ctx, column, x, y, lineHeight)
          x -= lineHeight
        }
        x -= lineHeight * 0.5
      }
    }
    ctx.textAlign = "center"
    ctx.font = `20px ${doc.layout.fontFamily}, SimSun, serif`
    ctx.fillStyle = "#6e5136"
    ctx.fillText(`${pageLayout.pageNumber}`, BOOK_PAGE.width / 2, BOOK_PAGE.height - 74)
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
