import { describe, expect, it } from 'vitest'

import * as canvasExport from './useCanvasExport'

describe('buildSinglePagePdfRequest', () => {
  it('derives PDF page size from SVG viewBox when present', () => {
    const buildSinglePagePdfRequest = (canvasExport as any).buildSinglePagePdfRequest

    const request = buildSinglePagePdfRequest({
      svgMarkup: '<svg viewBox="0 0 1123 914" width="1123" height="914"></svg>',
      layout: { width: 1123, height: 794 },
    })

    expect(request.pdfWidth).toBeCloseTo(842.25, 2)
    expect(request.pdfHeight).toBeCloseTo(685.5, 2)
  })

  it('falls back to layout dimensions when SVG has no viewBox', () => {
    const buildSinglePagePdfRequest = (canvasExport as any).buildSinglePagePdfRequest

    const request = buildSinglePagePdfRequest({
      svgMarkup: '<svg width="1123" height="794"></svg>',
      layout: { width: 1123, height: 794 },
    })

    expect(request.pdfWidth).toBeCloseTo(842.25, 2)
    expect(request.pdfHeight).toBeCloseTo(595.5, 2)
  })
  it('converts CSS pixel layout dimensions into PDF points', () => {
    const buildSinglePagePdfRequest = (canvasExport as any).buildSinglePagePdfRequest

    const request = buildSinglePagePdfRequest({
      svgMarkup: '<svg width="1123" height="794" viewBox="0 0 1123 794"><defs><style>:root { --text-main: #241a10; } @import url(\'https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800&display=swap\'); .publication-svg { background: var(--canvas-bg, #fff9ef); } .label { fill: var(--text-main); font-family: \'Manrope\', sans-serif; }</style><filter id="cardShadow"><feDropShadow dx="1" dy="1" stdDeviation="1" /></filter></defs><g filter="url(#cardShadow)"><text class="label">Test</text></g></svg>',
      layout: {
        width: 1123,
        height: 794,
      },
    })

    expect(request.svgMarkup).toContain('width="842.25pt"')
    expect(request.svgMarkup).toContain('height="595.5pt"')
    expect(request.svgMarkup).not.toContain('@import')
    expect(request.svgMarkup).not.toContain(':root')
    expect(request.svgMarkup).not.toContain('background:')
    expect(request.svgMarkup).not.toContain('filter="url(#cardShadow)"')
    expect(request.svgMarkup).toContain('#241a10')
    expect(request.svgMarkup).not.toContain('var(--text-main)')
    expect(request.svgMarkup).toContain("'Microsoft YaHei', 'PingFang SC', 'Noto Sans CJK SC', sans-serif")
    expect(request.pdfWidth).toBeCloseTo(842.25, 2)
    expect(request.pdfHeight).toBeCloseTo(595.5, 2)
  })

  it('preserves aspect ratio for large canvases', () => {
    const buildSinglePagePdfRequest = (canvasExport as any).buildSinglePagePdfRequest

    const request = buildSinglePagePdfRequest({
      svgMarkup: '<svg />',
      layout: {
        width: 4200,
        height: 1800,
      },
    })

    expect(request.pdfWidth / request.pdfHeight).toBeCloseTo(4200 / 1800, 4)
  })
})
