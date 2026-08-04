import { afterEach, describe, expect, it, vi } from 'vitest'
import type { PublicationLayout } from '../../types/family'

import {
  absolutizeExportResourceUrl,
  createStandalonePublicationSvg,
  getRasterExportSize,
} from './publicationExport'

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
