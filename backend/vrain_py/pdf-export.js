/**
 * pdf-export.js — PDF 导出 Node.js 脚本
 *
 * 替代 vrain.py，使用 pdf-lib 生成古籍刻本 PDF。
 *
 * 用法:
 *   node pdf-export.js <input.json> <output.pdf> [font.ttf]
 *
 * input.json 格式:
 *   {
 *     "pages": [ ComposedPage, ... ],
 *     "fontPath": "fonts/qiji-combo.ttf"  // 可选，默认使用内置路径
 *   }
 */

const { PDFDocument, rgb, StandardFonts } = require("pdf-lib")
const fontkit = require("@pdf-lib/fontkit")
const fs = require("fs")
const path = require("path")

async function main() {
  const args = process.argv.slice(2)
  if (args.length < 2) {
    console.error("Usage: node pdf-export.js <input.json> <output.pdf> [font.ttf]")
    process.exit(1)
  }

  const inputPath = args[0]
  const outputPath = args[1]
  const fontPath = args[2] || path.join(__dirname, "fonts", "qiji-combo.ttf")

  // ── 读取输入 ──
  let input
  try {
    const raw = fs.readFileSync(inputPath, "utf-8")
    input = JSON.parse(raw)
  } catch (e) {
    console.error("Failed to read input:", e.message)
    process.exit(1)
  }

  const pages = input.pages
  if (!pages || !Array.isArray(pages) || pages.length === 0) {
    console.error("Input must contain a non-empty 'pages' array")
    process.exit(1)
  }

  // ── 创建 PDF ──
  const doc = await PDFDocument.create()
  doc.registerFontkit(fontkit)

  // ── 加载字体 ──
  /** @type {import('pdf-lib').PDFFont} */
  let font
  try {
    const fontBytes = fs.readFileSync(fontPath)
    font = await doc.embedFont(fontBytes)
    console.log(`Font loaded: ${fontPath}`)
  } catch (e) {
    console.warn(`Font not found at ${fontPath}, falling back to Helvetica (no Chinese support):`, e.message)
    font = await doc.embedFont(StandardFonts.Helvetica)
  }

  for (const page of pages) {
    await renderPage(doc, page, font)
  }

  // ── 保存 ──
  const pdfBytes = await doc.save()
  fs.mkdirSync(path.dirname(outputPath), { recursive: true })
  fs.writeFileSync(outputPath, pdfBytes)
  console.log(`PDF saved: ${outputPath} (${(pdfBytes.length / 1024).toFixed(1)} KB, ${pages.length} pages)`)
}

/**
 * 渲染单页到 PDF
 */
async function renderPage(doc, composed, font) {
  const pdfPage = doc.addPage([composed.width, composed.height])
  const pageH = composed.height

  for (const layer of composed.layers) {
    switch (layer.kind) {
      case "background":
        drawBackground(pdfPage, layer, composed)
        break
      case "frame":
        drawFrame(pdfPage, layer, pageH)
        break
      case "fishTail":
        drawFishTail(pdfPage, layer, pageH)
        break
      case "header":
        drawTextLayer(pdfPage, layer, pageH, font)
        break
      case "footer":
        drawFooter(pdfPage, layer, pageH, font)
        break
      case "glyph":
        drawGlyphs(pdfPage, layer, pageH, font)
        break
      case "rowLine":
        drawRowLines(pdfPage, layer, pageH)
        break
    }
  }
}

// ── 坐标转换 ──
function toPdfY(canvasY, pageHeight, h = 0) {
  return pageHeight - canvasY - h
}

function parseColor(color) {
  if (!color || color === "black") return { r: 0, g: 0, b: 0 }
  if (color === "white") return { r: 1, g: 1, b: 1 }

  const rgbMatch = color.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/)
  if (rgbMatch) {
    return { r: parseInt(rgbMatch[1]) / 255, g: parseInt(rgbMatch[2]) / 255, b: parseInt(rgbMatch[3]) / 255 }
  }

  const hexMatch = color.match(/^#?([a-f0-9]{2})([a-f0-9]{2})([a-f0-9]{2})$/i)
  if (hexMatch) {
    return { r: parseInt(hexMatch[1], 16) / 255, g: parseInt(hexMatch[2], 16) / 255, b: parseInt(hexMatch[3], 16) / 255 }
  }

  return { r: 0, g: 0, b: 0 }
}

// ── 图层绘制 ──

function drawBackground(pdfPage, layer, composed) {
  const c = parseColor(layer.color)
  pdfPage.drawRectangle({
    x: 0, y: 0,
    width: composed.width, height: composed.height,
    color: rgb(c.r, c.g, c.b),
  })
}

function drawFrame(pdfPage, layer, pageH) {
  // 外框
  if (layer.outline) {
    const o = layer.outline
    const c = parseColor(o.color)
    pdfPage.drawRectangle({
      x: o.x, y: toPdfY(o.y + o.height, pageH),
      width: o.width, height: o.height,
      borderColor: rgb(c.r, c.g, c.b), borderWidth: o.lineWidth,
    })
  }

  // 内框
  const i = layer.inline
  if (i.lineWidth > 0) {
    const c = parseColor(i.color)
    pdfPage.drawRectangle({
      x: i.x, y: toPdfY(i.y + i.height, pageH),
      width: i.width, height: i.height,
      borderColor: rgb(c.r, c.g, c.b), borderWidth: i.lineWidth,
    })
  }

  // 版心折叠线
  if (layer.centerFold) {
    const cf = layer.centerFold
    const c = parseColor(cf.color)
    pdfPage.drawLine({
      start: { x: cf.x, y: toPdfY(cf.yBottom, pageH) },
      end: { x: cf.x, y: toPdfY(cf.yTop, pageH) },
      thickness: cf.lineWidth, color: rgb(c.r, c.g, c.b),
    })
  }
}

function drawFishTail(pdfPage, layer, pageH) {
  const c = parseColor(layer.color)
  const color = rgb(c.r, c.g, c.b)
  const halfW = 12

  pdfPage.drawRectangle({
    x: layer.centerX - halfW,
    y: toPdfY(layer.rectY + layer.rectHeight, pageH),
    width: halfW * 2, height: layer.rectHeight,
    borderColor: color, borderWidth: layer.lineWidth,
  })

  const triaBase = layer.triaDirection === "up" ? layer.rectY : layer.rectY + layer.rectHeight
  const triaTip = layer.triaDirection === "up" ? layer.rectY - layer.triaHeight : layer.rectY + layer.rectHeight + layer.triaHeight

  pdfPage.drawLine({
    start: { x: layer.centerX - halfW - 6, y: toPdfY(triaBase, pageH) },
    end: { x: layer.centerX, y: toPdfY(triaTip, pageH) },
    thickness: layer.lineWidth, color,
  })
  pdfPage.drawLine({
    start: { x: layer.centerX, y: toPdfY(triaTip, pageH) },
    end: { x: layer.centerX + halfW + 6, y: toPdfY(triaBase, pageH) },
    thickness: layer.lineWidth, color,
  })

  if (layer.connectorLine) {
    const cl = layer.connectorLine
    const clc = parseColor(cl.color)
    pdfPage.drawLine({
      start: { x: layer.centerX, y: toPdfY(cl.yBottom, pageH) },
      end: { x: layer.centerX, y: toPdfY(cl.yTop, pageH) },
      thickness: cl.lineWidth, color: rgb(clc.r, clc.g, clc.b),
    })
  }
}

function drawTextLayer(pdfPage, layer, pageH, font) {
  const c = parseColor(layer.color)
  pdfPage.drawText(layer.title, {
    x: layer.x, y: toPdfY(layer.y, pageH, layer.fontSize),
    font, size: layer.fontSize, color: rgb(c.r, c.g, c.b),
  })
}

function drawFooter(pdfPage, layer, pageH, font) {
  if (!layer.logoText) return
  const c = parseColor(layer.color)
  const logoY = layer.logoY || layer.y
  pdfPage.drawText(layer.logoText, {
    x: layer.x, y: toPdfY(logoY, pageH, layer.fontSize),
    font, size: layer.fontSize, color: rgb(c.r, c.g, c.b),
  })
}

function drawGlyphs(pdfPage, layer, pageH, font) {
  for (const glyph of layer.glyphs) {
    const c = parseColor(glyph.color)
    const fs = glyph.fontSize || 12
    try {
      pdfPage.drawText(glyph.char, {
        x: glyph.x, y: toPdfY(glyph.y, pageH, fs),
        font, size: fs, color: rgb(c.r, c.g, c.b),
      })
    } catch (e) {
      // 跳过字体不支持的字符
    }
  }
}

function drawRowLines(pdfPage, layer, pageH) {
  for (const line of layer.lines) {
    const c = parseColor(line.color)
    pdfPage.drawLine({
      start: { x: line.x1, y: toPdfY(line.y1, pageH) },
      end: { x: line.x2, y: toPdfY(line.y2, pageH) },
      thickness: line.lineWidth, color: rgb(c.r, c.g, c.b),
    })
  }
}

main().catch((e) => {
  console.error("Export failed:", e)
  process.exit(1)
})
