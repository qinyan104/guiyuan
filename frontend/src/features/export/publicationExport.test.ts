import { afterEach, describe, expect, it, vi } from 'vitest'
import type { PublicationLayout } from '../../types/family'

import {
  absolutizeExportResourceUrl,
  createPrintDocument,
  createPrintLayoutPages,
  createPrintPageSvg,
  createStandalonePublicationSvg,
  getRasterExportSize,
  serializeSvg,
} from './publicationExport'
import { DEFAULT_DROP_LINE_PRINT_PROFILE } from './dropLinePrint'

afterEach(() => vi.unstubAllGlobals())

describe('absolutizeExportResourceUrl', () => {
  it('resolves relative photo URLs to absolute URLs for server-side PDF export', () => {
    expect(absolutizeExportResourceUrl('/api/photos/42', 'http://localhost:5173')).toBe(
      'http://localhost:5173/api/photos/42',
    )
  })

  it('keeps relative photo URLs unchanged when no explicit base URL is provided', () => {
    expect(absolutizeExportResourceUrl('/api/photos/42')).toBe('/api/photos/42')
  })

  it('keeps embedded data URLs unchanged', () => {
    const dataUrl = 'data:image/png;base64,abc123'
    expect(absolutizeExportResourceUrl(dataUrl, 'http://localhost:5173')).toBe(dataUrl)
  })
})

describe('getRasterExportSize', () => {
  it('exports normal canvases at 2x resolution', () => {
    expect(getRasterExportSize({ width: 1200, height: 800 })).toEqual({
      width: 2400,
      height: 1600,
      pixelRatio: 2,
    })
  })

  it('caps huge infinite canvases to the maximum raster side', () => {
    expect(getRasterExportSize({ width: 10000, height: 5000 })).toEqual({
      width: 8192,
      height: 4096,
      pixelRatio: 0.8192,
    })
  })

  it('never exceeds the maximum side for extremely large canvases', () => {
    expect(getRasterExportSize({ width: 100000, height: 50000 })).toEqual({
      width: 8192,
      height: 4096,
      pixelRatio: 0.08192,
    })
  })

  it('also caps total pixels for square canvases', () => {
    const size = getRasterExportSize({ width: 8192, height: 8192 })

    expect(size.width * size.height).toBeLessThanOrEqual(32 * 1024 * 1024)
  })
})

describe('createStandalonePublicationSvg', () => {
  const layout: PublicationLayout = {
    width: 100,
    height: 100,
    cards: [{ personId: 'p1', x: 0, y: 0, width: 80, height: 100 }],
    lines: [],
    displayedPeople: 1,
    generationCount: 1,
    pageCount: 1,
    paperPixelWidth: 100,
    paperPixelHeight: 100,
    titleAreaHeight: 0,
  }

  it('fails instead of reporting success when an image cannot be embedded', async () => {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
    const image = document.createElementNS('http://www.w3.org/2000/svg', 'image')
    image.setAttribute('href', '/missing-photo.png')
    svg.appendChild(image)
    vi.stubGlobal('fetch', vi.fn(async () => ({
      ok: false,
      status: 404,
      blob: async () => new Blob(),
    })))

    await expect(createStandalonePublicationSvg({ svgElement: svg, layout, title: 'test' }))
      .rejects.toThrow('图片')
  })

  it('includes compact-card styles and removes transient canvas state', async () => {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
    const card = document.createElementNS('http://www.w3.org/2000/svg', 'g')
    const name = document.createElementNS('http://www.w3.org/2000/svg', 'text')
    card.setAttribute('class', 'person-card person-card--selected person-card--hovered person-card--subdued')
    name.setAttribute('class', 'person-card__name')
    name.textContent = '李明'
    card.appendChild(name)
    svg.appendChild(card)

    const exported = await createStandalonePublicationSvg({ svgElement: svg, layout, title: 'test' })
    const css = exported.querySelector('[data-export-style="publication"]')?.textContent ?? ''

    expect(css).toContain('.person-card__drop-line')
    expect(css).toContain('.person-card__name--compact')
    expect(css).toContain('fill: var(--card-hover-fill, var(--card-panel-fill));')
    expect(css).toContain('cursor: help')
    expect(card.classList.contains('person-card--selected')).toBe(true)
    expect(exported.querySelector('.person-card')?.getAttribute('class')).toBe('person-card')
    expect(exported.querySelector('.person-card > title')?.textContent).toBe('李明')
    expect(exported.querySelector('.person-card')?.getAttribute('aria-label')).toBe('李明')
  })
})

function createLayout(
  width: number,
  height: number,
  cards: PublicationLayout['cards'] = [],
): PublicationLayout {
  return {
    width,
    height,
    cards,
    lines: [],
    displayedPeople: cards.length,
    generationCount: cards.length ? 1 : 0,
    pageCount: 1,
    paperPixelWidth: 1123,
    paperPixelHeight: 794,
    titleAreaHeight: 0,
  }
}

describe('createPrintLayoutPages', () => {
  it('returns no pages for an empty layout', () => {
    expect(createPrintLayoutPages(createLayout(0, 0), DEFAULT_DROP_LINE_PRINT_PROFILE)).toEqual([])
  })

  it('keeps a readable layout on one centered page', () => {
    const pages = createPrintLayoutPages(
      createLayout(600, 400, [{ personId: 'p1', x: 284, y: 150, width: 32, height: 110 }]),
      DEFAULT_DROP_LINE_PRINT_PROFILE,
    )

    expect(pages).toHaveLength(1)
    expect(pages[0]).toMatchObject({
      index: 1,
      total: 1,
      row: 0,
      column: 0,
      x: 0,
      y: 0,
      width: 600,
      height: 400,
    })
    expect(pages[0].widthMm).toBeLessThanOrEqual(396)
    expect(pages[0].heightMm).toBeLessThanOrEqual(273)
  })

  it.each([
    ['horizontal', 2600, 500, 2, 1],
    ['vertical', 700, 2000, 1, 2],
    ['both axes', 2800, 2000, 2, 2],
  ])('tiles layouts that overflow %s', (_label, width, height, minColumns, minRows) => {
    const pages = createPrintLayoutPages(createLayout(width, height), {
      ...DEFAULT_DROP_LINE_PRINT_PROFILE,
      nameSize: 18,
    })

    expect(Math.max(...pages.map(({ column }) => column)) + 1).toBeGreaterThanOrEqual(minColumns)
    expect(Math.max(...pages.map(({ row }) => row)) + 1).toBeGreaterThanOrEqual(minRows)
    expect(pages.every(({ total }) => total === pages.length)).toBe(true)
  })

  it('keeps overlap between tiles and aligns the final tile to the layout edge', () => {
    const layout = createLayout(2600, 500)
    const pages = createPrintLayoutPages(layout, {
      ...DEFAULT_DROP_LINE_PRINT_PROFILE,
      nameSize: 18,
    })
    const firstRow = pages.filter(({ row }) => row === 0)

    expect(firstRow[1].x).toBeLessThan(firstRow[0].x + firstRow[0].width)
    expect(firstRow.at(-1)!.x + firstRow.at(-1)!.width).toBe(layout.width)
  })

  it('moves a page seam away from a compact person name', () => {
    const card = { personId: 'p1', x: 1470, y: 100, width: 40, height: 110 }
    const pages = createPrintLayoutPages(createLayout(2600, 500, [card]), {
      ...DEFAULT_DROP_LINE_PRINT_PROFILE,
      nameSize: 18,
    })
    const firstRow = pages.filter(({ row }) => row === 0)
    const firstEnd = firstRow[0].x + firstRow[0].width
    const secondStart = firstRow[1].x

    expect(firstEnd > card.x && firstEnd < card.x + card.width).toBe(false)
    expect(secondStart > card.x && secondStart < card.x + card.width).toBe(false)
    expect(firstRow.every(({ warning }) => warning === undefined)).toBe(true)
  })

  it('returns a blocking warning when no nearby seam can avoid a name', () => {
    const card = { personId: 'p1', x: 1350, y: 100, width: 300, height: 110 }
    const pages = createPrintLayoutPages(createLayout(2600, 500, [card]), {
      ...DEFAULT_DROP_LINE_PRINT_PROFILE,
      nameSize: 18,
    })

    expect(pages.some(({ warning }) => warning === 'name-cut')).toBe(true)
  })
})

describe('print page output', () => {
  it.each([
    ['A4', 'portrait', '210', '297'],
    ['A4', 'landscape', '297', '210'],
    ['A3', 'portrait', '297', '420'],
    ['A3', 'landscape', '420', '297'],
  ] as const)('uses fixed %s %s paper dimensions', (paper, orientation, widthMm, heightMm) => {
    const pages = createPrintLayoutPages(createLayout(600, 400), {
      ...DEFAULT_DROP_LINE_PRINT_PROFILE,
      paper,
      orientation,
    })
    const html = createPrintDocument({
      title: '<张氏>',
      paper,
      orientation,
      pages,
      pageSvgMarkups: ['<svg></svg>'],
    })

    expect(html).toContain(`size: ${paper} ${orientation};`)
    expect(html).toContain(`width: ${widthMm}mm;`)
    expect(html).toContain(`height: ${heightMm}mm;`)
    expect(html).toContain('&lt;张氏&gt; - 打印排版')
    expect(html).toContain('第 1 / 1 页')
  })

  it('scopes internal SVG ids independently for every printed page', () => {
    const source = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
    const filter = document.createElementNS('http://www.w3.org/2000/svg', 'filter')
    const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect')
    filter.id = 'shadow'
    rect.setAttribute('filter', 'url(#shadow)')
    source.append(filter, rect)
    const pages = [
      { index: 1, total: 2, row: 0, column: 0, x: 0, y: 0, width: 100, height: 100, widthMm: 100, heightMm: 100 },
      { index: 2, total: 2, row: 0, column: 1, x: 90, y: 0, width: 100, height: 100, widthMm: 100, heightMm: 100 },
    ]

    const first = serializeSvg(createPrintPageSvg(source, pages[0], '族谱'), false)
    const second = serializeSvg(createPrintPageSvg(source, pages[1], '族谱'), false)

    const firstId = first.match(/id="([^"]+)"/)?.[1]
    const secondId = second.match(/id="([^"]+)"/)?.[1]

    expect(firstId).toBeTruthy()
    expect(secondId).toBeTruthy()
    expect(firstId).not.toBe(secondId)
    expect(first).toContain(`url(#${firstId})`)
    expect(second).toContain(`url(#${secondId})`)
  })
})
