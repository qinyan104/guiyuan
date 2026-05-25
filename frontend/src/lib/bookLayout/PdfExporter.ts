/**
 * PdfExporter — PDF 导出核心
 *
 * 使用 pdf-lib 将 ComposedPage[] 导出为 PDF。
 * 与 CanvasRenderer 共享同一套排版数据，保证 100% 布局一致。
 *
 * 坐标系转换：
 *   Canvas: Y 轴向下 (0 = top)
 *   PDF:    Y 轴向上 (0 = bottom)
 *   转换公式: pdfY = pageHeight - canvasY - glyphHeight
 *
 * 使用方式：
 *   const exporter = new PdfExporter()
 *   const pdfBytes = await exporter.export(pages, fontPath)
 */

import { PDFDocument, type PDFPage, type PDFFont, rgb, StandardFonts } from "pdf-lib"
import type { ComposedPage, RenderLayer } from "./types"

/** 导出选项 */
export interface PdfExportOptions {
  /** 字体文件路径（Node.js）或 ArrayBuffer（浏览器） */
  fontSource: string | ArrayBuffer
  /** 默认字号 */
  defaultFontSize?: number
  /** 默认颜色 */
  defaultColor?: { r: number; g: number; b: number }
}

export class PdfExporter {
  /**
   * 导出 ComposedPage[] 为 PDF Uint8Array
   */
  async export(pages: ComposedPage[], options: PdfExportOptions): Promise<Uint8Array> {
    const doc = await PDFDocument.create()
    const fontSize = options.defaultFontSize ?? 12

    // 嵌入中文字体
    let font: PDFFont
    try {
      if (typeof options.fontSource === "string") {
        // Node.js: 从文件系统读取
        const fs = await import("fs")
        const fontBytes = fs.readFileSync(options.fontSource)
        font = await doc.embedFont(fontBytes)
      } else {
        // 浏览器: 从 ArrayBuffer
        font = await doc.embedFont(options.fontSource)
      }
    } catch {
      // 字体加载失败，回退到标准字体（不支持中文，仅用于降级）
      font = await doc.embedFont(StandardFonts.Helvetica)
    }

    for (const page of pages) {
      const pdfPage = doc.addPage([page.width, page.height])
      await this.renderPage(pdfPage, page, font, fontSize)
    }

    return doc.save()
  }

  /**
   * 渲染单页到 PDF
   */
  private async renderPage(
    pdfPage: PDFPage,
    composed: ComposedPage,
    font: PDFFont,
    defaultFontSize: number,
  ): Promise<void> {
    for (const layer of composed.layers) {
      await this.renderLayer(pdfPage, layer, composed, font, defaultFontSize)
    }
  }

  /**
   * 渲染单个图层
   */
  private async renderLayer(
    pdfPage: PDFPage,
    layer: RenderLayer,
    composed: ComposedPage,
    font: PDFFont,
    defaultFontSize: number,
  ): Promise<void> {
    switch (layer.kind) {
      case "background":
        await this.renderBackground(pdfPage, layer, composed)
        break
      case "frame":
        this.renderFrame(pdfPage, layer, composed)
        break
      case "fishTail":
        this.renderFishTail(pdfPage, layer, composed)
        break
      case "header":
        this.renderHeader(pdfPage, layer, composed, font)
        break
      case "footer":
        this.renderFooter(pdfPage, layer, composed, font)
        break
      case "glyph":
        this.renderGlyphs(pdfPage, layer, composed, font, defaultFontSize)
        break
      case "rowLine":
        this.renderRowLines(pdfPage, layer, composed)
        break
    }
  }

  // ── 坐标转换 ──

  /** Canvas Y → PDF Y */
  private toPdfY(canvasY: number, pageHeight: number, glyphHeight = 0): number {
    return pageHeight - canvasY - glyphHeight
  }

  /** 解析颜色字符串为 RGB */
  private parseColor(color: string): { r: number; g: number; b: number } {
    if (!color || color === "black") return { r: 0, g: 0, b: 0 }
    if (color === "white") return { r: 1, g: 1, b: 1 }

    // rgb(r,g,b) 格式
    const rgbMatch = color.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/)
    if (rgbMatch) {
      return {
        r: parseInt(rgbMatch[1]) / 255,
        g: parseInt(rgbMatch[2]) / 255,
        b: parseInt(rgbMatch[3]) / 255,
      }
    }

    // #hex 格式
    const hexMatch = color.match(/^#?([a-f0-9]{2})([a-f0-9]{2})([a-f0-9]{2})$/i)
    if (hexMatch) {
      return {
        r: parseInt(hexMatch[1], 16) / 255,
        g: parseInt(hexMatch[2], 16) / 255,
        b: parseInt(hexMatch[3], 16) / 255,
      }
    }

    return { r: 0, g: 0, b: 0 }
  }

  // ── 各图层渲染 ──

  private async renderBackground(
    pdfPage: PDFPage,
    layer: import("./types").BackgroundLayer,
    composed: ComposedPage,
  ): Promise<void> {
    const c = this.parseColor(layer.color)
    pdfPage.drawRectangle({
      x: 0,
      y: 0,
      width: composed.width,
      height: composed.height,
      color: rgb(c.r, c.g, c.b),
    })
  }

  private renderFrame(
    pdfPage: PDFPage,
    layer: import("./types").FrameLayer,
    composed: ComposedPage,
  ): void {
    const pageH = composed.height

    // 外框
    if (layer.outline) {
      const o = layer.outline
      const c = this.parseColor(o.color)
      pdfPage.drawRectangle({
        x: o.x,
        y: this.toPdfY(o.y + o.height, pageH),
        width: o.width,
        height: o.height,
        borderColor: rgb(c.r, c.g, c.b),
        borderWidth: o.lineWidth,
      })
    }

    // 内框
    {
      const i = layer.inline
      if (i.lineWidth > 0) {
        const c = this.parseColor(i.color)
        pdfPage.drawRectangle({
          x: i.x,
          y: this.toPdfY(i.y + i.height, pageH),
          width: i.width,
          height: i.height,
          borderColor: rgb(c.r, c.g, c.b),
          borderWidth: i.lineWidth,
        })
      }
    }

    // 版心折叠线
    if (layer.centerFold) {
      const cf = layer.centerFold
      const c = this.parseColor(cf.color)
      pdfPage.drawLine({
        start: { x: cf.x, y: this.toPdfY(cf.yBottom, pageH) },
        end: { x: cf.x, y: this.toPdfY(cf.yTop, pageH) },
        thickness: cf.lineWidth,
        color: rgb(c.r, c.g, c.b),
      })
    }
  }

  private renderFishTail(
    pdfPage: PDFPage,
    layer: import("./types").FishTailLayer,
    composed: ComposedPage,
  ): void {
    const pageH = composed.height
    const c = this.parseColor(layer.color)
    const color = rgb(c.r, c.g, c.b)
    const halfW = 12

    // 矩形
    pdfPage.drawRectangle({
      x: layer.centerX - halfW,
      y: this.toPdfY(layer.rectY + layer.rectHeight, pageH),
      width: halfW * 2,
      height: layer.rectHeight,
      borderColor: color,
      borderWidth: layer.lineWidth,
    })

    // 三角形（用三条线近似）
    const triaBase = layer.triaDirection === "up"
      ? layer.rectY
      : layer.rectY + layer.rectHeight
    const triaTip = layer.triaDirection === "up"
      ? layer.rectY - layer.triaHeight
      : layer.rectY + layer.rectHeight + layer.triaHeight

    pdfPage.drawLine({
      start: { x: layer.centerX - halfW - 6, y: this.toPdfY(triaBase, pageH) },
      end: { x: layer.centerX, y: this.toPdfY(triaTip, pageH) },
      thickness: layer.lineWidth,
      color,
    })
    pdfPage.drawLine({
      start: { x: layer.centerX, y: this.toPdfY(triaTip, pageH) },
      end: { x: layer.centerX + halfW + 6, y: this.toPdfY(triaBase, pageH) },
      thickness: layer.lineWidth,
      color,
    })

    // 连接线
    if (layer.connectorLine) {
      const cl = layer.connectorLine
      const clc = this.parseColor(cl.color)
      pdfPage.drawLine({
        start: { x: layer.centerX, y: this.toPdfY(cl.yBottom, pageH) },
        end: { x: layer.centerX, y: this.toPdfY(cl.yTop, pageH) },
        thickness: cl.lineWidth,
        color: rgb(clc.r, clc.g, clc.b),
      })
    }
  }

  private renderHeader(
    pdfPage: PDFPage,
    layer: import("./types").HeaderLayer,
    composed: ComposedPage,
    font: PDFFont,
  ): void {
    const pageH = composed.height
    const c = this.parseColor(layer.color)
    const pdfY = this.toPdfY(layer.y, pageH, layer.fontSize)

    pdfPage.drawText(layer.title, {
      x: layer.x,
      y: pdfY,
      font,
      size: layer.fontSize,
      color: rgb(c.r, c.g, c.b),
    })
  }

  private renderFooter(
    pdfPage: PDFPage,
    layer: import("./types").FooterLayer,
    composed: ComposedPage,
    font: PDFFont,
  ): void {
    if (!layer.logoText) return

    const pageH = composed.height
    const c = this.parseColor(layer.color)
    const logoY = layer.logoY ?? layer.y
    const pdfY = this.toPdfY(logoY, pageH, layer.fontSize)

    pdfPage.drawText(layer.logoText, {
      x: layer.x,
      y: pdfY,
      font,
      size: layer.fontSize,
      color: rgb(c.r, c.g, c.b),
    })
  }

  private renderGlyphs(
    pdfPage: PDFPage,
    layer: import("./types").GlyphLayer,
    composed: ComposedPage,
    font: PDFFont,
    defaultFontSize: number,
  ): void {
    const pageH = composed.height

    for (const glyph of layer.glyphs) {
      const c = this.parseColor(glyph.color)
      const fontSize = glyph.fontSize || defaultFontSize
      const pdfY = this.toPdfY(glyph.y, pageH, fontSize)

      try {
        pdfPage.drawText(glyph.char, {
          x: glyph.x,
          y: pdfY,
          font,
          size: fontSize,
          color: rgb(c.r, c.g, c.b),
        })
      } catch {
        // 跳过字体中不存在的字符
      }
    }
  }

  private renderRowLines(
    pdfPage: PDFPage,
    layer: import("./types").RowLineLayer,
    composed: ComposedPage,
  ): void {
    const pageH = composed.height

    for (const line of layer.lines) {
      const c = this.parseColor(line.color)
      pdfPage.drawLine({
        start: { x: line.x1, y: this.toPdfY(line.y1, pageH) },
        end: { x: line.x2, y: this.toPdfY(line.y2, pageH) },
        thickness: line.lineWidth,
        color: rgb(c.r, c.g, c.b),
      })
    }
  }
}

/** 默认导出实例 */
let defaultExporter: PdfExporter | null = null

export function getPdfExporter(): PdfExporter {
  if (!defaultExporter) {
    defaultExporter = new PdfExporter()
  }
  return defaultExporter
}
