import type { PublicationLayout, PublicationPaper } from '../../types/family'

const SVG_NAMESPACE = 'http://www.w3.org/2000/svg'
const XLINK_NAMESPACE = 'http://www.w3.org/1999/xlink'
const XML_HEADER = '<?xml version="1.0" encoding="UTF-8"?>'
const PDF_SERIF_FONT_STACK = "'SimSun', 'Songti SC', 'STSong', serif"
const PDF_SANS_FONT_STACK = "'Microsoft YaHei', 'PingFang SC', 'Noto Sans CJK SC', sans-serif"
const SVG_THEME_VARIABLES = [
  '--canvas-bg',
  '--bg-paper',
  '--bg-shell',
  '--text-main',
  '--text-soft',
  '--tree-line-color',
  '--card-panel-fill',
  '--card-panel-stroke',
  '--card-inner-stroke',
  '--card-header-fill',
  '--card-selected-stroke',
  '--card-status-fill',
  '--card-name-fill',
  '--card-detail-fill',
  '--card-male-header',
  '--card-female-header',
  '--accent-amber',
  '--border-color',
  '--line-soft',
  '--shell-bg-image',
  '--bg-panel',
  '--text-sub',
] as const

const PAPER_SIZE_NAMES: Record<PublicationPaper, string> = {
  A4: 'A4 landscape',
  A3: 'A3 landscape',
}

const PAPER_MM: Record<PublicationPaper, { width: number; height: number }> = {
  A4: { width: 297, height: 210 },
  A3: { width: 420, height: 297 },
}

const EXPORT_SVG_STYLE = `
  @import url('https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800&family=Noto+Serif+SC:wght@400;500;600;700&display=swap');

  .publication-svg {
    background: var(--canvas-bg, var(--bg-paper, #fff9ef));
    color: var(--text-main, #241a10);
    font-family: 'Noto Serif SC', 'Songti SC', serif;
    overflow: visible;
    text-rendering: geometricPrecision;
    shape-rendering: geometricPrecision;
  }

  .tree-lines line {
    stroke: var(--tree-line-color, rgba(95, 73, 50, 0.88));
    stroke-width: 2.2;
    stroke-linecap: round;
  }

  .person-card {
    cursor: default;
  }

  .person-card text {
    pointer-events: none;
    user-select: none;
  }

  .person-card__panel {
    fill: var(--card-panel-fill, rgba(248, 244, 237, 0.97));
    stroke: var(--card-panel-stroke, #6f5943);
    stroke-width: 1.2;
  }

  .person-card__inner {
    fill: none;
    stroke: var(--card-inner-stroke, rgba(120, 94, 63, 0.16));
    stroke-width: 1;
  }

  .person-card__accent-frame {
    fill: none;
    stroke: transparent;
    stroke-width: 0;
  }

  .person-card__header {
    fill: var(--card-header-fill, rgba(119, 90, 56, 0.08));
  }

  .person-card__divider {
    stroke: rgba(126, 101, 74, 0.24);
    stroke-width: 1;
  }

  .person-card__seal {
    fill: rgba(170, 138, 103, 0.08);
    stroke: rgba(143, 113, 78, 0.16);
    stroke-width: 1;
  }

  .person-card__seal-mark {
    fill: none;
    stroke: rgba(126, 90, 49, 0.56);
    stroke-width: 1.4;
    stroke-linecap: round;
  }

  .person-card__status {
    font-family: 'Manrope', sans-serif;
    font-weight: 700;
    letter-spacing: 0.16em;
    fill: var(--card-status-fill, #6b5338);
  }

  .person-card__name {
    font-family: 'Noto Serif SC', 'Songti SC', serif;
    font-weight: 600;
    fill: var(--card-name-fill, #24170d);
    letter-spacing: 0.08em;
  }

  .person-card__note-pill {
    fill: var(--card-header-fill);
  }

  .person-card__lineage-pill {
    fill: var(--card-header-fill);
    stroke: var(--card-inner-stroke);
    stroke-width: 0.8;
  }

  .person-card__imperial-ribbon {
    stroke: rgba(255, 255, 255, 0.16);
    stroke-width: 0.8;
  }

  .person-card__imperial-ribbon--emperor {
    fill: #c6932f;
  }

  .person-card__imperial-ribbon--heir {
    fill: #9a4d36;
  }

  .person-card__imperial-label {
    font-family: 'Manrope', sans-serif;
    font-weight: 800;
    letter-spacing: 0.12em;
    fill: #fffaf0;
  }

  .person-card__note,
  .person-card__detail,
  .person-card__lineage-text {
    font-family: 'Noto Serif SC', 'Songti SC', serif;
    fill: var(--card-detail-fill, #463425);
  }

  .person-card__note {
    letter-spacing: 0.1em;
  }

  .person-card__lineage-text {
    font-weight: 600;
    letter-spacing: 0.08em;
  }

  .person-card__detail-band {
    fill: var(--card-header-fill);
    stroke: var(--card-inner-stroke);
    stroke-width: 0.8;
  }

  .person-card--male .person-card__header,
  .person-card--male .person-card__note-pill,
  .person-card--male .person-card__detail-band {
    fill: var(--card-male-header);
  }

  .person-card--female .person-card__header,
  .person-card--female .person-card__note-pill,
  .person-card--female .person-card__detail-band {
    fill: var(--card-female-header);
  }

  .person-card--emperor .person-card__accent-frame--emperor {
    stroke: rgba(198, 147, 47, 0.92);
    stroke-width: 2.6;
  }

  .person-card--emperor .person-card__panel {
    stroke: rgba(198, 147, 47, 0.56);
    stroke-width: 2.2;
  }

  .person-card--emperor .person-card__header,
  .person-card--emperor .person-card__note-pill,
  .person-card--emperor .person-card__detail-band,
  .person-card--emperor .person-card__lineage-pill {
    fill: rgba(198, 147, 47, 0.18);
    stroke: rgba(198, 147, 47, 0.26);
  }

  .person-card--heir .person-card__accent-frame--heir {
    stroke: rgba(154, 77, 54, 0.82);
    stroke-width: 2.2;
    stroke-dasharray: 8 5;
  }

  .person-card--heir .person-card__panel {
    stroke: rgba(154, 77, 54, 0.48);
    stroke-width: 2;
  }

  .person-card--heir .person-card__header,
  .person-card--heir .person-card__note-pill,
  .person-card--heir .person-card__detail-band,
  .person-card--heir .person-card__lineage-pill {
    fill: rgba(154, 77, 54, 0.15);
    stroke: rgba(154, 77, 54, 0.22);
  }

  .person-card--selected .person-card__panel {
    stroke: var(--card-selected-stroke, #ab6d30);
    stroke-width: 2.4;
  }

  .person-card--selected .person-card__inner {
    stroke: rgba(171, 109, 48, 0.28);
  }
`


export interface PdfExportHeader {
  title: string
  subtitle?: string
  lines?: string[]
}

export interface CreateStandaloneSvgOptions {
  svgElement: SVGSVGElement
  layout: PublicationLayout
  title: string
  includeSelection?: boolean
  pdfFriendly?: boolean
  embedImages?: boolean
  resourceBaseUrl?: string
  exportHeader?: PdfExportHeader
}

export interface PrintLayoutPage {
  index: number
  total: number
  row: number
  column: number
  x: number
  y: number
  width: number
  height: number
  widthMm: number
  heightMm: number
}

export interface CreatePrintDocumentOptions {
  title: string
  paper: PublicationPaper
  pages: PrintLayoutPage[]
  pageSvgMarkups: string[]
}

function formatNumber(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(2).replace(/\.?0+$/, '')
}

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function getOrCreateDefs(svg: SVGSVGElement): SVGDefsElement {
  const existingDefs = svg.querySelector('defs')
  if (existingDefs) {
    return existingDefs
  }

  const defs = document.createElementNS(SVG_NAMESPACE, 'defs')
  svg.insertBefore(defs, svg.firstChild)
  return defs
}

function insertExportTitle(svg: SVGSVGElement, title: string) {
  svg.querySelector(':scope > title')?.remove()

  const titleElement = document.createElementNS(SVG_NAMESPACE, 'title')
  titleElement.textContent = title
  svg.insertBefore(titleElement, svg.firstChild)
}

export function getSvgThemeMap(): Record<string, string> {
  if (typeof window === 'undefined') return {}
  const root = document.documentElement
  const computed = getComputedStyle(root)
  const themeValues: Record<string, string> = {}
  for (const v of SVG_THEME_VARIABLES) {
    const val = computed.getPropertyValue(v).trim()
    if (val) {
      themeValues[v] = val
    }
  }
  return themeValues
}

function getSvgThemeVariables(): string {
  const themeValues = getSvgThemeMap()
  let css = ':root {\n'
  for (const v of SVG_THEME_VARIABLES) {
    const val = themeValues[v]
    if (val) css += `  ${v}: ${val};\n`
  }
  css += '}\n'
  return css
}

function resolveCssValue(value: string, themeValues: Record<string, string>): string {
  let resolved = value

  while (resolved.includes('var(')) {
    const next = resolved.replace(/var\(\s*(--[a-zA-Z0-9-]+)\s*(?:,\s*([^)]+))?\)/g, (_, variableName: string, fallback?: string) => {
      const themeValue = themeValues[variableName]
      if (themeValue) {
        return themeValue
      }

      return fallback ? resolveCssValue(fallback.trim(), themeValues) : ''
    })

    if (next === resolved) {
      break
    }
    resolved = next
  }

  return resolved
}

function buildExportStyle(pdfFriendly = false): string {
  if (!pdfFriendly) {
    return getSvgThemeVariables() + '\n' + EXPORT_SVG_STYLE
  }

  const themeValues = getSvgThemeMap()
  return resolveCssValue(
    EXPORT_SVG_STYLE
      .replace(/^\s*@import\s+url\([^)]*\)\s*;\s*/m, '\n')
      .replaceAll("'Noto Serif SC', 'Songti SC', serif", PDF_SERIF_FONT_STACK)
      .replaceAll("'Manrope', sans-serif", PDF_SANS_FONT_STACK),
    themeValues,
  )
}

function insertExportStyles(svg: SVGSVGElement, pdfFriendly = false) {
  const defs = getOrCreateDefs(svg)
  defs.querySelector('[data-export-style="publication"]')?.remove()

  const style = document.createElementNS(SVG_NAMESPACE, 'style')
  style.setAttribute('data-export-style', 'publication')
  style.textContent = buildExportStyle(pdfFriendly)
  defs.insertBefore(style, defs.firstChild)
}

function insertExportHeader(svg: SVGSVGElement, header?: PdfExportHeader) {
  svg.querySelector('[data-export-header="publication"]')?.remove()

  if (!header) {
    return
  }

  const existingTitle = svg.querySelector(':scope > title')
  if (existingTitle) {
    existingTitle.remove()
  }

  const headerGroup = document.createElementNS(SVG_NAMESPACE, 'g')
  headerGroup.setAttribute('data-export-header', 'publication')
  headerGroup.setAttribute('transform', 'translate(72 56)')

  const title = document.createElementNS(SVG_NAMESPACE, 'text')
  title.setAttribute('x', '0')
  title.setAttribute('y', '0')
  title.setAttribute('fill', 'var(--text-main, #241a10)')
  title.setAttribute('font-size', '28')
  title.setAttribute('font-weight', '700')
  title.setAttribute('font-family', "'Noto Serif SC', 'Songti SC', serif")
  title.textContent = header.title
  headerGroup.appendChild(title)

  let currentY = 34
  if (header.subtitle) {
    const subtitle = document.createElementNS(SVG_NAMESPACE, 'text')
    subtitle.setAttribute('x', '0')
    subtitle.setAttribute('y', String(currentY))
    subtitle.setAttribute('fill', 'var(--text-soft, #8a6845)')
    subtitle.setAttribute('font-size', '15')
    subtitle.setAttribute('font-family', "'Noto Serif SC', 'Songti SC', serif")
    subtitle.textContent = header.subtitle
    headerGroup.appendChild(subtitle)
    currentY += 24
  }

  header.lines?.forEach((line) => {
    const text = document.createElementNS(SVG_NAMESPACE, 'text')
    text.setAttribute('x', '0')
    text.setAttribute('y', String(currentY))
    text.setAttribute('fill', 'var(--text-soft, #8a6845)')
    text.setAttribute('font-size', '12')
    text.setAttribute('font-family', "'Noto Serif SC', 'Songti SC', serif")
    text.textContent = line
    headerGroup.appendChild(text)
    currentY += 20
  })

  svg.insertBefore(headerGroup, svg.firstChild)
}

function insertBackground(svg: SVGSVGElement, layout: PublicationLayout) {
  svg.querySelector('[data-export-background="publication"]')?.remove()
  svg.querySelector('#canvas-bg-gradient')?.remove()

  const root = document.documentElement
  const computed = getComputedStyle(root)
  let canvasBg = computed.getPropertyValue('--canvas-bg').trim()
  if (!canvasBg) {
    canvasBg = computed.getPropertyValue('--bg-paper').trim() || '#fff9ef'
  }

  let fillValue = canvasBg
  if (canvasBg.includes('linear-gradient') || canvasBg.includes('radial-gradient')) {
    const colorRegex = /(rgba?\([^)]+\)|hsla?\([^)]+\)|#[0-9a-fA-F]{3,8})/g
    const colors = canvasBg.match(colorRegex)
    
    if (colors && colors.length >= 2) {
      const defs = getOrCreateDefs(svg)
      const gradient = document.createElementNS(SVG_NAMESPACE, 'linearGradient')
      gradient.id = 'canvas-bg-gradient'
      gradient.setAttribute('x1', '0%')
      gradient.setAttribute('y1', '0%')
      gradient.setAttribute('x2', '0%')
      gradient.setAttribute('y2', '100%')
      
      const stop1 = document.createElementNS(SVG_NAMESPACE, 'stop')
      stop1.setAttribute('offset', '0%')
      stop1.setAttribute('stop-color', colors[0])
      
      const stop2 = document.createElementNS(SVG_NAMESPACE, 'stop')
      stop2.setAttribute('offset', '100%')
      stop2.setAttribute('stop-color', colors[colors.length - 1])
      
      gradient.appendChild(stop1)
      gradient.appendChild(stop2)
      defs.appendChild(gradient)
      
      fillValue = 'url(#canvas-bg-gradient)'
    } else {
      fillValue = computed.getPropertyValue('--bg-shell').trim() || '#e8ddc8'
    }
  }

  const background = document.createElementNS(SVG_NAMESPACE, 'rect')
  background.setAttribute('data-export-background', 'publication')
  background.setAttribute('class', 'publication-svg__background')
  background.setAttribute('x', '0')
  background.setAttribute('y', '0')
  background.setAttribute('width', formatNumber(layout.width))
  background.setAttribute('height', formatNumber(layout.height))
  
  background.style.fill = fillValue

  const defs = svg.querySelector(':scope > defs')
  svg.insertBefore(background, defs?.nextSibling ?? svg.firstChild)
}

function removeSelectionState(svg: SVGSVGElement) {
  svg.querySelectorAll('.person-card--selected').forEach((element) => {
    element.classList.remove('person-card--selected')
  })
}

function resolveCssVariablesInAttributes(svg: SVGSVGElement) {
  const themeValues = getSvgThemeMap()
  const elements = [svg, ...Array.from(svg.querySelectorAll<SVGElement>('*'))]

  elements.forEach((element) => {
    Array.from(element.attributes).forEach((attribute) => {
      if (!attribute.value.includes('var(')) {
        return
      }

      element.setAttribute(attribute.name, resolveCssValue(attribute.value, themeValues))
    })
  })
}

function stripPdfUnsupportedFilters(svg: SVGSVGElement) {
  svg.querySelectorAll('filter').forEach((element) => element.remove())
  svg.querySelectorAll<SVGElement>('[filter]').forEach((element) => element.removeAttribute('filter'))
}

function scopeInternalIds(svg: SVGSVGElement, suffix: string) {
  const idMap = new Map<string, string>()
  const elementsWithIds = Array.from(svg.querySelectorAll<SVGElement>('[id]'))

  elementsWithIds.forEach((element) => {
    const nextId = `${element.id}-${suffix}`
    idMap.set(element.id, nextId)
    element.id = nextId
  })

  if (idMap.size === 0) {
    return
  }

  const scopedElements = [svg, ...Array.from(svg.querySelectorAll<SVGElement>('*'))]
  const referenceAttributes = ['filter', 'clip-path', 'mask', 'fill', 'stroke', 'href', 'xlink:href']

  scopedElements.forEach((element) => {
    referenceAttributes.forEach((attribute) => {
      const value = element.getAttribute(attribute)
      if (!value) {
        return
      }

      let nextValue = value
      idMap.forEach((nextId, previousId) => {
        nextValue = nextValue.replaceAll(`url(#${previousId})`, `url(#${nextId})`).replaceAll(`#${previousId}`, `#${nextId}`)
      })

      if (nextValue !== value) {
        element.setAttribute(attribute, nextValue)
      }
    })
  })
}

export function absolutizeExportResourceUrl(href: string, baseUrl?: string): string {
  if (!href || href.startsWith('data:') || href.startsWith('blob:')) {
    return href
  }

  if (/^[a-zA-Z][a-zA-Z\d+.-]*:/.test(href)) {
    return href
  }

  if (!baseUrl) {
    return href
  }

  try {
    return new URL(href, baseUrl).toString()
  } catch {
    return href
  }
}

function setImageHref(image: SVGImageElement, value: string) {
  image.setAttribute('href', value)
  image.setAttributeNS(XLINK_NAMESPACE, 'xlink:href', value)
}

export async function createStandalonePublicationSvg(options: CreateStandaloneSvgOptions): Promise<SVGSVGElement> {
  const svg = options.svgElement.cloneNode(true) as SVGSVGElement
  const headerHeight = options.exportHeader ? 120 : 0
  const totalHeight = options.layout.height + headerHeight

  svg.setAttribute('xmlns', SVG_NAMESPACE)
  svg.setAttribute('xmlns:xlink', XLINK_NAMESPACE)
  svg.setAttribute('version', '1.1')
  svg.setAttribute('role', 'img')
  svg.setAttribute('aria-label', options.title)
  svg.setAttribute('viewBox', `0 0 ${formatNumber(options.layout.width)} ${formatNumber(totalHeight)}`)
  svg.setAttribute('width', formatNumber(options.layout.width))
  svg.setAttribute('height', formatNumber(totalHeight))
  svg.removeAttribute('style')

  if (!options.includeSelection) {
    removeSelectionState(svg)
  }

  if (headerHeight > 0) {
    const contentGroup = document.createElementNS(SVG_NAMESPACE, 'g')
    contentGroup.setAttribute('data-export-content', 'publication')
    contentGroup.setAttribute('transform', `translate(0, ${headerHeight})`)

    while (svg.firstChild) {
      contentGroup.appendChild(svg.firstChild)
    }

    svg.appendChild(contentGroup)
    insertExportHeader(svg, options.exportHeader)
  }

  insertExportTitle(svg, options.title)
  insertExportStyles(svg, options.pdfFriendly)
  insertBackground(svg, { ...options.layout, height: totalHeight })

  // Embed images as base64 to ensure they are visible in standalone files
  const images = Array.from(svg.querySelectorAll('image'))
  const shouldEmbedImages = options.embedImages ?? true
  await Promise.all(images.map(async (img) => {
    const href = img.getAttribute('href') || img.getAttribute('xlink:href')
    if (!href || href.startsWith('data:')) {
      if (href) {
        setImageHref(img, href)
      }
      return
    }

    if (!shouldEmbedImages) {
      setImageHref(img, absolutizeExportResourceUrl(href, options.resourceBaseUrl))
      return
    }

    try {
      const response = await fetch(href)
      const blob = await response.blob()
      const reader = new FileReader()
      const base64 = await new Promise<string>((resolve) => {
        reader.onloadend = () => resolve(reader.result as string)
        reader.readAsDataURL(blob)
      })
      setImageHref(img, base64)
    } catch (err) {
      console.error('Failed to embed image in SVG export', href, err)
    }
  }))

  if (options.pdfFriendly) {
    stripPdfUnsupportedFilters(svg)
    resolveCssVariablesInAttributes(svg)
  }

  return svg
}

export function createPrintPageSvg(sourceSvg: SVGSVGElement, page: PrintLayoutPage, title: string): SVGSVGElement {
  const svg = sourceSvg.cloneNode(true) as SVGSVGElement

  svg.setAttribute('aria-label', `${title} ${page.index}/${page.total}`)
  svg.setAttribute(
    'viewBox',
    `${formatNumber(page.x)} ${formatNumber(page.y)} ${formatNumber(page.width)} ${formatNumber(page.height)}`,
  )
  svg.setAttribute('width', formatNumber(page.width))
  svg.setAttribute('height', formatNumber(page.height))
  svg.querySelector(':scope > title')?.replaceChildren(`${title} ${page.index}/${page.total}`)
  scopeInternalIds(svg, `print-${page.index}`)

  return svg
}

export function serializeSvg(svg: SVGSVGElement, includeXmlHeader = true): string {
  const serialized = new XMLSerializer().serializeToString(svg)
  return includeXmlHeader ? `${XML_HEADER}\n${serialized}\n` : serialized
}

export function createPrintLayoutPages(layout: PublicationLayout, paper: PublicationPaper): PrintLayoutPage[] {
  // To print on a single continuous PDF page, we output exactly one page matching the full layout
  const paperMm = PAPER_MM[paper]
  const scale = paperMm.width / layout.paperPixelWidth

  return [{
    index: 1,
    total: 1,
    row: 0,
    column: 0,
    x: 0,
    y: 0,
    width: layout.width,
    height: layout.height,
    widthMm: layout.width * scale,
    heightMm: layout.height * scale,
  }]
}

export function createPrintDocument(options: CreatePrintDocumentOptions): string {
  const escapedTitle = escapeHtml(options.title)
  
  const singlePage = options.pages[0]
  const pageWidth = singlePage ? `${formatNumber(singlePage.widthMm)}mm` : PAPER_SIZE_NAMES[options.paper]
  const pageHeight = singlePage ? `${formatNumber(singlePage.heightMm)}mm` : 'auto'

  const pagesHtml = options.pages
    .map((page, index) => {
      const svgMarkup = options.pageSvgMarkups[index] ?? ''

      return `
        <section class="print-sheet" aria-label="排版画布">
          <div
            class="print-canvas"
            style="width: ${formatNumber(page.widthMm)}mm; height: ${formatNumber(page.heightMm)}mm;"
          >
            ${svgMarkup}
          </div>
        </section>
      `
    })
    .join('\n')

  return `<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapedTitle} - 打印排版</title>
    <style>
      ${getSvgThemeVariables()}
      @import url('https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800&family=Noto+Serif+SC:wght@400;500;600;700&display=swap');

      @page {
        size: ${pageWidth} ${pageHeight};
        margin: 0;
      }

      * {
        box-sizing: border-box;
      }

      html,
      body {
        margin: 0;
        min-height: 100%;
        background: var(--bg-shell, #e8ddc8);
      }

      body {
        color: var(--text-main, #241a10);
        font-family: 'Manrope', 'Noto Serif SC', sans-serif;
      }

      .print-sheet {
        position: relative;
        width: ${singlePage ? formatNumber(singlePage.widthMm) : 'auto'}mm;
        height: ${singlePage ? formatNumber(singlePage.heightMm) : 'auto'}mm;
        overflow: hidden;
        background: var(--canvas-bg, var(--bg-paper, #fff9ef));
        break-after: page;
        page-break-after: always;
        print-color-adjust: exact;
        -webkit-print-color-adjust: exact;
      }

      .print-sheet:last-child {
        break-after: auto;
        page-break-after: auto;
      }

      .print-canvas {
        display: block;
        overflow: hidden;
      }

      .print-canvas > svg {
        display: block;
        width: 100%;
        height: 100%;
      }

      .print-page-label {
        position: absolute;
        right: 5mm;
        bottom: 4mm;
        padding: 1.5mm 2.4mm;
        border-radius: 999px;
        background: rgba(255, 249, 239, 0.82);
        border: 0.2mm solid rgba(117, 90, 57, 0.16);
        color: rgba(87, 66, 43, 0.62);
        font-size: 8pt;
        font-weight: 700;
        letter-spacing: 0.08em;
      }

      @media screen {
        body {
          display: grid;
          gap: 14px;
          justify-content: center;
          padding: 18px;
        }

        .print-sheet {
          box-shadow: 0 18px 48px rgba(70, 48, 24, 0.18);
        }
      }
    </style>
  </head>
  <body>
    ${pagesHtml}
    <script>
      const runPrint = () => {
        window.focus();
        window.setTimeout(() => window.print(), 120);
      };

      if (document.readyState === 'complete') {
        runPrint();
      } else {
        window.addEventListener('load', runPrint, { once: true });
      }
    </script>
  </body>
</html>
`
}
