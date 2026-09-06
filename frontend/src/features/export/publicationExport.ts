import type { PublicationLayout, PublicationPaper } from '../../types/family'
import PERSON_CARD_STYLE from '../../components/PersonCardSvg.style?raw'
import {
  DEFAULT_DROP_LINE_PRINT_PROFILE,
  isPrintedNameTooSmall,
  normalizeDropLinePrintProfile,
  type DropLinePrintOrientation,
  type DropLinePrintProfile,
} from './dropLinePrint'
import {
  buildExportThemeCss,
  getThemeCssVariables,
  type ThemeMode,
} from './exportTheme'

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
  '--card-hover-fill',
  '--card-hover-stroke',
  '--card-inner-stroke',
  '--card-header-fill',
  '--card-selected-stroke',
  '--card-status-fill',
  '--card-name-fill',
  '--card-detail-fill',
  '--card-male-header',
  '--card-female-header',
  '--accent-signal',
  '--border-color',
  '--line-soft',
  '--shell-bg-image',
  '--bg-panel',
  '--text-sub',
] as const

const PAPER_MM: Record<PublicationPaper, { width: number; height: number }> = {
  A4: { width: 210, height: 297 },
  A3: { width: 297, height: 420 },
}
const PX_PER_MM = 96 / 25.4

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

  .tree-lines path {
    fill: none;
    stroke: var(--tree-line-color, #000);
    stroke-width: 2.2;
    stroke-linecap: round;
  }

  ${PERSON_CARD_STYLE.replace(/:global\(([^)]+)\)/g, '$1')}

  .person-card {
    cursor: help;
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
  theme?: ThemeMode
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
  scale?: number
  warning?: 'name-cut' | 'name-too-small'
}

export type PrintLayoutOptions = Pick<
  DropLinePrintProfile,
  'paper' | 'orientation' | 'nameSize' | 'lineWidth' | 'marginMm' | 'scale' | 'overlapMm'
>

export interface RasterExportSize {
  width: number
  height: number
  pixelRatio: number
}

export interface CreatePrintDocumentOptions {
  title: string
  paper: PublicationPaper
  orientation?: DropLinePrintOrientation
  pages: PrintLayoutPage[]
  pageSvgMarkups: string[]
}

const DEFAULT_RASTER_PIXEL_RATIO = 2
const MAX_RASTER_SIDE = 8192
const MAX_RASTER_PIXELS = 32 * 1024 * 1024

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
    const next = resolved.replace(
      /var\(\s*(--[a-zA-Z0-9-]+)\s*(?:,\s*([^)]+))?\)/g,
      (_, variableName: string, fallback?: string) => {
        const themeValue = themeValues[variableName]
        if (themeValue) {
          return themeValue
        }

        return fallback ? resolveCssValue(fallback.trim(), themeValues) : ''
      },
    )

    if (next === resolved) {
      break
    }
    resolved = next
  }

  return resolved
}

function buildExportStyle(pdfFriendly = false, theme: ThemeMode = 'paper'): string {
  const themeCss = buildExportThemeCss(theme)
  if (!pdfFriendly) {
    return themeCss + '\n' + EXPORT_SVG_STYLE
  }

  const themeValues = getThemeCssVariables(theme)
  return resolveCssValue(
    (themeCss + '\n' + EXPORT_SVG_STYLE).replace(/^\s*@import\s+url\([^)]*\)\s*;\s*/m, '\n')
      .replaceAll("'Noto Serif SC', 'Songti SC', serif", PDF_SERIF_FONT_STACK)
      .replaceAll("'Manrope', sans-serif", PDF_SANS_FONT_STACK),
    themeValues,
  )
}

function insertExportStyles(svg: SVGSVGElement, pdfFriendly = false, theme: ThemeMode = 'paper') {
  const defs = getOrCreateDefs(svg)
  defs.querySelector('[data-export-style="publication"]')?.remove()

  const style = document.createElementNS(SVG_NAMESPACE, 'style')
  style.setAttribute('data-export-style', 'publication')
  style.textContent = buildExportStyle(pdfFriendly, theme)
  defs.insertBefore(style, defs.firstChild)
}

function insertExportHeader(svg: SVGSVGElement, header?: PdfExportHeader, theme: ThemeMode = 'paper') {
  svg.querySelector('[data-export-header="publication"]')?.remove()

  if (!header) {
    return
  }

  const existingTitle = svg.querySelector(':scope > title')
  if (existingTitle) {
    existingTitle.remove()
  }

  const themeVars = getThemeCssVariables(theme)
  const headerGroup = document.createElementNS(SVG_NAMESPACE, 'g')
  headerGroup.setAttribute('data-export-header', 'publication')
  headerGroup.setAttribute('transform', 'translate(72 56)')

  const title = document.createElementNS(SVG_NAMESPACE, 'text')
  title.setAttribute('x', '0')
  title.setAttribute('y', '0')
  title.setAttribute('fill', themeVars['--text-main'] || 'var(--text-main, #241a10)')
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
    subtitle.setAttribute('fill', themeVars['--text-soft'] || 'var(--text-soft, #8a6845)')
    subtitle.setAttribute('font-size', '15')
    subtitle.setAttribute('font-family', "'Noto Serif SC', 'Songti SC', serif")
    subtitle.textContent = header.subtitle
    headerGroup.appendChild(subtitle)
    currentY += 24
  }

  header.lines?.forEach(line => {
    const text = document.createElementNS(SVG_NAMESPACE, 'text')
    text.setAttribute('x', '0')
    text.setAttribute('y', String(currentY))
    text.setAttribute('fill', themeVars['--text-soft'] || 'var(--text-soft, #8a6845)')
    text.setAttribute('font-size', '12')
    text.setAttribute('font-family', "'Noto Serif SC', 'Songti SC', serif")
    text.textContent = line
    headerGroup.appendChild(text)
    currentY += 20
  })

  svg.insertBefore(headerGroup, svg.firstChild)
}

function insertBackground(svg: SVGSVGElement, layout: PublicationLayout, theme: ThemeMode = 'paper') {
  svg.querySelector('[data-export-background="publication"]')?.remove()
  svg.querySelector('#canvas-bg-gradient')?.remove()

  const themeVars = getThemeCssVariables(theme)
  let canvasBg = themeVars['--canvas-bg'] || themeVars['--bg-paper'] || '#FAF9F6'

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
      fillValue = themeVars['--bg-shell'] || '#FAF9F6'
    }
  }

  const background = document.createElementNS(SVG_NAMESPACE, 'rect')
  background.setAttribute('data-export-background', 'publication')
  background.setAttribute('class', 'publication-svg__background')
  background.setAttribute('x', '0')
  background.setAttribute('y', '0')
  background.setAttribute('width', formatNumber(layout.width))
  background.setAttribute('height', formatNumber(layout.height))

  background.setAttribute('fill', fillValue)
  background.style.fill = fillValue

  const defs = svg.querySelector(':scope > defs')
  svg.insertBefore(background, defs?.nextSibling ?? svg.firstChild)
}

function removeTransientState(svg: SVGSVGElement, includeSelection = false) {
  svg.querySelectorAll('.person-card').forEach(element => {
    if (!includeSelection) element.classList.remove('person-card--selected')
    element.classList.remove('person-card--hovered', 'person-card--subdued')
  })
}

function insertCardTitles(svg: SVGSVGElement) {
  svg.querySelectorAll<SVGGElement>('.person-card').forEach(card => {
    const labels = Array.from(card.querySelectorAll<SVGTextElement>('text'))
      .map(text => text.textContent?.replace(/\s+/g, ' ').trim())
      .filter((text): text is string => Boolean(text))
    const label = [...new Set(labels)].join(' · ')
    if (!label) return

    const title = document.createElementNS(SVG_NAMESPACE, 'title')
    title.textContent = label
    card.prepend(title)
    card.setAttribute('role', 'img')
    card.setAttribute('aria-label', label)
  })
}

function resolveCssVariablesInAttributes(svg: SVGSVGElement) {
  const themeValues = getSvgThemeMap()
  const elements = [svg, ...Array.from(svg.querySelectorAll<SVGElement>('*'))]

  elements.forEach(element => {
    Array.from(element.attributes).forEach(attribute => {
      if (!attribute.value.includes('var(')) {
        return
      }

      element.setAttribute(attribute.name, resolveCssValue(attribute.value, themeValues))
    })
  })
}

function stripPdfUnsupportedFilters(svg: SVGSVGElement) {
  svg.querySelectorAll('filter').forEach(element => {
    element.remove()
  })
  svg.querySelectorAll<SVGElement>('[filter]').forEach(element => {
    element.removeAttribute('filter')
  })
}

function scopeInternalIds(svg: SVGSVGElement, suffix: string) {
  const idMap = new Map<string, string>()
  const elementsWithIds = Array.from(svg.querySelectorAll<SVGElement>('[id]'))

  elementsWithIds.forEach(element => {
    const nextId = `${element.id}-${suffix}`
    idMap.set(element.id, nextId)
    element.id = nextId
  })

  if (idMap.size === 0) {
    return
  }

  const scopedElements = [svg, ...Array.from(svg.querySelectorAll<SVGElement>('*'))]
  const referenceAttributes = ['filter', 'clip-path', 'mask', 'fill', 'stroke', 'href', 'xlink:href']

  scopedElements.forEach(element => {
    referenceAttributes.forEach(attribute => {
      const value = element.getAttribute(attribute)
      if (!value) {
        return
      }

      let nextValue = value
      if (value.startsWith('#')) {
        const nextId = idMap.get(value.slice(1))
        if (nextId) nextValue = `#${nextId}`
      } else {
        nextValue = value.replace(/url\(#([^)]+)\)/g, (reference, id: string) => {
          const nextId = idMap.get(id)
          return nextId ? `url(#${nextId})` : reference
        })
      }

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
  const targetTheme: ThemeMode =
    options.theme ||
    (typeof document !== 'undefined'
      ? (document.documentElement.getAttribute('data-theme') as ThemeMode)
      : undefined) ||
    'paper'
  const svg = options.svgElement.cloneNode(true) as SVGSVGElement
  const headerHeight = options.exportHeader ? 120 : 0
  const totalHeight = options.layout.height + headerHeight

  svg.setAttribute('xmlns', SVG_NAMESPACE)
  svg.setAttribute('xmlns:xlink', XLINK_NAMESPACE)
  svg.setAttribute('version', '1.1')
  svg.setAttribute('role', 'img')
  svg.setAttribute('data-theme', targetTheme)
  svg.setAttribute('class', `publication-svg theme-${targetTheme}`)
  svg.setAttribute('aria-label', options.title)
  svg.setAttribute('viewBox', `0 0 ${formatNumber(options.layout.width)} ${formatNumber(totalHeight)}`)
  svg.setAttribute('width', formatNumber(options.layout.width))
  svg.setAttribute('height', formatNumber(totalHeight))
  svg.removeAttribute('style')

  removeTransientState(svg, options.includeSelection)
  insertCardTitles(svg)

  if (headerHeight > 0) {
    const contentGroup = document.createElementNS(SVG_NAMESPACE, 'g')
    contentGroup.setAttribute('data-export-content', 'publication')
    contentGroup.setAttribute('transform', `translate(0, ${headerHeight})`)

    while (svg.firstChild) {
      contentGroup.appendChild(svg.firstChild)
    }

    svg.appendChild(contentGroup)
    insertExportHeader(svg, options.exportHeader, targetTheme)
  }

  insertExportTitle(svg, options.title)
  insertExportStyles(svg, options.pdfFriendly, targetTheme)
  insertBackground(svg, { ...options.layout, height: totalHeight }, targetTheme)

  // Embed images as base64 to ensure they are visible in standalone files
  const images = Array.from(svg.querySelectorAll('image'))
  const shouldEmbedImages = options.embedImages ?? true
  await Promise.all(
    images.map(async img => {
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
        if (!response.ok) throw new Error(`HTTP ${response.status}`)
        const blob = await response.blob()
        const reader = new FileReader()
        const base64 = await new Promise<string>(resolve => {
          reader.onloadend = () => resolve(reader.result as string)
          reader.readAsDataURL(blob)
        })
        setImageHref(img, base64)
      } catch (err) {
        throw new Error(`导出图片嵌入失败：${href}`, { cause: err })
      }
    }),
  )

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

export function getRasterExportSize(
  layout: Pick<PublicationLayout, 'width' | 'height'>,
  pixelRatio = DEFAULT_RASTER_PIXEL_RATIO,
  maxSide = MAX_RASTER_SIDE,
): RasterExportSize {
  const width = Math.max(1, layout.width)
  const height = Math.max(1, layout.height)
  const ratio = Math.min(pixelRatio, maxSide / width, maxSide / height, Math.sqrt(MAX_RASTER_PIXELS / (width * height)))
  const safeRatio = Math.max(Number.EPSILON, ratio)

  return {
    width: Math.max(1, Math.floor(width * safeRatio)),
    height: Math.max(1, Math.floor(height * safeRatio)),
    pixelRatio: safeRatio,
  }
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error('PNG 导出图片加载失败'))
    image.src = src
  })
}

export async function rasterizeSvgToPngBlob(
  svg: SVGSVGElement,
  layout: Pick<PublicationLayout, 'width' | 'height'>,
): Promise<Blob> {
  const size = getRasterExportSize(layout)
  const svgBlob = new Blob([serializeSvg(svg)], { type: 'image/svg+xml;charset=utf-8' })
  const url = URL.createObjectURL(svgBlob)

  try {
    const image = await loadImage(url)
    const canvas = document.createElement('canvas')
    canvas.width = size.width
    canvas.height = size.height

    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('当前浏览器不支持 PNG 导出')

    ctx.drawImage(image, 0, 0, size.width, size.height)

    return await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(blob => {
        if (blob) resolve(blob)
        else reject(new Error('PNG 导出失败'))
      }, 'image/png')
    })
  } finally {
    URL.revokeObjectURL(url)
  }
}

function getPaperSize(paper: PublicationPaper, orientation: DropLinePrintOrientation) {
  const size = PAPER_MM[paper]
  return orientation === 'portrait' ? size : { width: size.height, height: size.width }
}

interface AxisRange {
  start: number
  end: number
  warning?: 'name-cut'
}

function boundaryCutsName(
  boundary: number,
  cards: PublicationLayout['cards'],
  axis: 'x' | 'y',
  padding: number,
): boolean {
  return cards.some(card => {
    const start = card[axis] - padding
    const end = card[axis] + (axis === 'x' ? card.width : card.height) + padding
    return boundary > start && boundary < end
  })
}

function createAxisRanges(
  total: number,
  tile: number,
  overlap: number,
  cards: PublicationLayout['cards'],
  axis: 'x' | 'y',
  padding: number,
): AxisRange[] {
  if (total <= tile) return [{ start: 0, end: total }]

  const step = tile - overlap
  const count = Math.ceil((total - overlap) / step)
  const ranges: AxisRange[] = Array.from({ length: count }, (_, index) => ({
    start: index * step,
    end: Math.min(total, index * step + tile),
  }))

  for (let index = 0; index < ranges.length - 1; index += 1) {
    const left = ranges[index]
    const right = ranges[index + 1]
    let offset: number | undefined

    for (let distance = 0; distance <= Math.ceil(overlap); distance += 1) {
      for (const candidate of distance === 0 ? [0] : [-distance, distance]) {
        if (
          !boundaryCutsName(left.end + candidate, cards, axis, padding)
          && !boundaryCutsName(right.start + candidate, cards, axis, padding)
        ) {
          offset = candidate
          break
        }
      }
      if (offset !== undefined) break
    }

    if (offset === undefined) {
      left.warning = 'name-cut'
      right.warning = 'name-cut'
    } else {
      left.end += offset
      right.start += offset
    }
  }

  return ranges
}

export function createPrintLayoutPages(
  layout: PublicationLayout,
  options: PrintLayoutOptions | PublicationPaper,
): PrintLayoutPage[] {
  if (layout.width <= 0 || layout.height <= 0) return []

  const profile = normalizeDropLinePrintProfile(
    typeof options === 'string' ? { ...DEFAULT_DROP_LINE_PRINT_PROFILE, paper: options } : options,
  )
  const paper = getPaperSize(profile.paper, profile.orientation)
  const printableWidthMm = paper.width - profile.marginMm * 2
  const printableHeightMm = paper.height - profile.marginMm * 2
  const fit = Math.min(
    printableWidthMm * PX_PER_MM / layout.width,
    printableHeightMm * PX_PER_MM / layout.height,
  )

  if (!isPrintedNameTooSmall(profile.nameSize, fit)) {
    return [{
      index: 1,
      total: 1,
      row: 0,
      column: 0,
      x: 0,
      y: 0,
      width: layout.width,
      height: layout.height,
      widthMm: layout.width * fit / PX_PER_MM,
      heightMm: layout.height * fit / PX_PER_MM,
      scale: fit,
    }]
  }

  const tileWidth = printableWidthMm * PX_PER_MM / profile.scale
  const tileHeight = printableHeightMm * PX_PER_MM / profile.scale
  const overlap = profile.overlapMm * PX_PER_MM / profile.scale
  const padding = profile.lineWidth / 2
  const columns = createAxisRanges(layout.width, tileWidth, overlap, layout.cards, 'x', padding)
  const rows = createAxisRanges(layout.height, tileHeight, overlap, layout.cards, 'y', padding)
  const nameTooSmall = isPrintedNameTooSmall(profile.nameSize, profile.scale)
  const pages = rows.flatMap((row, rowIndex) => columns.map((column, columnIndex) => ({
    index: 0,
    total: 0,
    row: rowIndex,
    column: columnIndex,
    x: column.start,
    y: row.start,
    width: column.end - column.start,
    height: row.end - row.start,
    widthMm: (column.end - column.start) * profile.scale / PX_PER_MM,
    heightMm: (row.end - row.start) * profile.scale / PX_PER_MM,
    scale: profile.scale,
    warning: column.warning ?? row.warning ?? (nameTooSmall ? 'name-too-small' as const : undefined),
  })))

  return pages.map((page, index) => ({ ...page, index: index + 1, total: pages.length }))
}

export function createPrintDocument(options: CreatePrintDocumentOptions): string {
  const escapedTitle = escapeHtml(options.title)
  const orientation = options.orientation ?? 'landscape'
  const paper = getPaperSize(options.paper, orientation)

  const pagesHtml = options.pages
    .map((page, index) => {
      const svgMarkup = options.pageSvgMarkups[index] ?? ''
      const pageNumber = escapeHtml(String(page.index))
      const pageTotal = escapeHtml(String(page.total))

      return `
        <section class="print-sheet" aria-label="第 ${pageNumber} / ${pageTotal} 页">
          <div
            class="print-canvas"
            style="width: ${formatNumber(page.widthMm)}mm; height: ${formatNumber(page.heightMm)}mm;"
          >
            ${svgMarkup}
          </div>
          <span class="print-page-label" aria-hidden="true">第 ${pageNumber} / ${pageTotal} 页</span>
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
        size: ${options.paper} ${orientation};
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
        display: grid;
        place-items: center;
        width: ${formatNumber(paper.width)}mm;
        height: ${formatNumber(paper.height)}mm;
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
