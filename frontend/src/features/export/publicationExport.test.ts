import { describe, expect, it } from 'vitest'

import { absolutizeExportResourceUrl, getRasterExportSize } from './publicationExport'

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
})
