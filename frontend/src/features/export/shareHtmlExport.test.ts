import { describe, expect, it, vi } from 'vitest'

import type { PublicationData, PublicationSettings } from '../../types/family'
import { defaultSettings } from '../../data/sampleFamily'

vi.mock('../persistence/draftPersistence', () => ({
  createPortablePublication: vi.fn(async (publication: PublicationData) => publication),
}))

import { buildEmbeddedScript, buildHtmlTemplate, buildInfoHeader, generateShareHtml } from './shareHtmlExport'

const samplePublication: PublicationData = {
  title: '\u674e\u6c0f\u5b97\u8c31',
  subtitle: '\u9647\u897f\u5802\u652f\u8c31',
  focusFamilyId: 'f1',
  people: {
    p1: {
      id: 'p1',
      name: '\u674e\u660e',
      gender: 'male',
      deceased: false,
      titleName: '\u65cf\u957f',
    },
    p2: {
      id: 'p2',
      name: '\u674e\u8fdc',
      gender: 'male',
      deceased: true,
    },
  },
  families: {
    f1: {
      id: 'f1',
      adults: ['p1'],
      children: ['p2'],
    },
  },
  info: {
    ancestralOrigin: '\u9647\u897f',
    hallName: '\u6566\u672c\u5802',
    familyMotto: '\u6566\u4eb2\u7766\u65cf',
  },
}

const sampleSettings: PublicationSettings = {
  ...defaultSettings,
  paper: 'A4',
  layoutMode: 'modern',
  cardWidth: 240,
  generationGap: 120,
  siblingGap: 48,
  partnerGap: 32,
  fontScale: 1,
  zoom: 1,
  paddingX: 40,
  paddingY: 40,
}

function createSvgFixture(): SVGSVGElement {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
  svg.setAttribute('viewBox', '0 0 100 100')

  const card = document.createElementNS('http://www.w3.org/2000/svg', 'g')
  card.setAttribute('class', 'person-card')
  card.setAttribute('data-person-id', 'p1')
  svg.appendChild(card)

  return svg
}

describe('shareHtmlExport helpers', () => {
  it('buildInfoHeader renders readable publication metadata', () => {
    const html = buildInfoHeader(samplePublication)

    expect(html).toContain('\u90e1\u671b/\u7956\u7c4d\uff1a\u9647\u897f')
    expect(html).toContain('\u5802\u53f7\uff1a\u6566\u672c\u5802')
    expect(html).toContain('\u65cf\u8bad\uff1a\u6566\u4eb2\u7766\u65cf')
  })

  it('buildHtmlTemplate renders readable password gate copy', () => {
    const html = buildHtmlTemplate({
      title: '\u4e0d\u5e94\u6cc4\u9732\u7684\u6807\u9898',
      themeCss: ':root {}',
      infoHeader: '<h1>\u4e0d\u5e94\u6cc4\u9732\u7684\u7b80\u4ecb</h1>',
      statsHtml: '\u4e0d\u5e94\u6cc4\u9732\u7684\u7edf\u8ba1',
      script: 'console.log("ok")',
      isEncrypted: true,
      generatedAt: '2026/05/13 23:00:00',
    })

    expect(html).toContain('<h2>\u65cf\u8c31\u5df2\u52a0\u5bc6</h2>')
    expect(html).toContain('<p>\u8bf7\u8f93\u5165\u5bc6\u7801\u4ee5\u67e5\u770b\u5185\u5bb9</p>')
    expect(html).toContain('placeholder="\u8bf7\u8f93\u5165\u5bc6\u7801"')
    expect(html).toContain('autocomplete="off"')
    expect(html).toContain('\u751f\u6210\u4e8e\uff1a2026/05/13 23:00:00')
    expect(html).not.toContain('\u4e0d\u5e94\u6cc4\u9732\u7684\u6807\u9898')
    expect(html).not.toContain('\u4e0d\u5e94\u6cc4\u9732\u7684\u7b80\u4ecb')
    expect(html).not.toContain('\u4e0d\u5e94\u6cc4\u9732\u7684\u7edf\u8ba1')
  })

  it('buildEmbeddedScript emits valid unlock script text', () => {
    const script = buildEmbeddedScript('{"v":1}', true)

    expect(() => new Function(script)).not.toThrow()
    expect(script).toContain('split(/[\\s,]+/)')
    expect(script).toContain('\u8bf7\u8f93\u5165\u5bc6\u7801')
    expect(script).toContain('\u5bc6\u7801\u9519\u8bef\u6216\u6587\u4ef6\u5df2\u635f\u574f')
    expect(script).toContain('\u79f0\u53f7')
  })

  it('keeps plain share data inside the script boundary', () => {
    const script = buildEmbeddedScript('{"name":"</script><script>alert(1)</script>"}', false)

    expect(script).not.toContain('</script>')
    expect(() => new Function(script)).not.toThrow()
  })

  it('generateShareHtml builds a parseable standalone document shell', async () => {
    const html = await generateShareHtml({
      publication: samplePublication,
      settings: sampleSettings,
      standaloneSvg: createSvgFixture(),
    })

    const doc = new DOMParser().parseFromString(html, 'text/html')
    const dataJsonMatch = html.match(/var DATA_JSON = ("(?:[^"\\]|\\.)*");/)

    expect(dataJsonMatch).not.toBeNull()

    const payloadJson = JSON.parse(dataJsonMatch![1]) as string
    const payload = JSON.parse(payloadJson) as { svgMarkup: string }

    expect(doc.querySelector('#app')).not.toBeNull()
    expect(doc.querySelector('#tree-viewport')).not.toBeNull()
    expect(doc.querySelector('#detail-panel')).not.toBeNull()
    expect(doc.querySelector('#tree-camera')).not.toBeNull()
    expect(doc.querySelector('#detail-content')).not.toBeNull()
    expect(html).not.toContain('<svg')
    expect(payload.svgMarkup).toContain('<g class="person-card"')
    expect(payload.svgMarkup).toContain('data-person-id="p1"')
    expect(html).toContain('setupCardClick')
    expect(html).toContain('#tree-camera .person-card')
    expect(doc.body.textContent).toContain('\u674e\u6c0f\u5b97\u8c31')
    expect(doc.body.textContent).toContain('\u90e1\u671b/\u7956\u7c4d\uff1a\u9647\u897f')
    expect(doc.body.textContent).toContain('\u5802\u53f7\uff1a\u6566\u672c\u5802')
    expect(doc.body.textContent).toContain('\u65cf\u8bad\uff1a\u6566\u4eb2\u7766\u65cf')
    expect(doc.body.textContent).toContain('\u5171 2 \u4eba')
    expect(doc.body.textContent).toContain('\u5728\u4e16 1 \u4eba')
    expect(doc.querySelector('#pub-stats')?.textContent).toBe('共 2 人 · 在世 1 人 · 已故 1 人')
    expect(doc.body.textContent).toContain('\u5df2\u6545 1 \u4eba')
    expect(doc.body.textContent).toContain('\u65cf\u8c31\u5df2\u52a0\u5bc6')
    expect(doc.body.textContent).toContain('\u8bf7\u8f93\u5165\u5bc6\u7801\u4ee5\u67e5\u770b\u5185\u5bb9')
    expect(doc.querySelector('#pwd-input')?.getAttribute('placeholder')).toBe('\u8bf7\u8f93\u5165\u5bc6\u7801')
    expect(doc.querySelector('#pwd-input')?.getAttribute('autocomplete')).toBe('off')
  })

  it('generateShareHtml supports explicit theme, embeds all themes css and switcher menu', async () => {
    const html = await generateShareHtml({
      publication: samplePublication,
      settings: sampleSettings,
      standaloneSvg: createSvgFixture(),
      theme: 'pine',
    })

    const doc = new DOMParser().parseFromString(html, 'text/html')
    expect(doc.documentElement.getAttribute('data-theme')).toBe('pine')
    expect(html).toContain('[data-theme="dark"]')
    expect(html).toContain('[data-theme="slate"]')
    expect(html).toContain('[data-theme="pine"]')
    expect(html).toContain('[data-theme="pure"]')
    expect(doc.querySelector('#theme-btn')).not.toBeNull()
    expect(doc.querySelector('#theme-menu')).not.toBeNull()
    expect(doc.querySelectorAll('.theme-option')).toHaveLength(5)
    expect(html).not.toContain('<svg')
  })
})
