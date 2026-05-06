import { describe, expect, it } from 'vitest'

import { absolutizeExportResourceUrl } from './publicationExport'

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
