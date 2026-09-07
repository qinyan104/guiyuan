import { test, expect, type Page } from '@playwright/test'
import { authenticatedRequest, loginPage, loginViaApi } from '../helpers/auth'

const TEST_USER = process.env.E2E_USERNAME || 'e2e_test'
const TEST_PASS = process.env.E2E_PASSWORD || 'test1234'
const PEOPLE_COUNT = Number(process.env.PERF_PEOPLE ?? 1000)
const SETTINGS = {
  paper: 'A3',
  layoutMode: 'modern',
  cardWidth: 160,
  generationGap: 100,
  siblingGap: 40,
  partnerGap: 20,
  fontScale: 1,
  zoom: 1,
  showCard: true,
  showDeath: true,
  showAge: true,
  showNote: true,
  showPhoto: false,
  paddingX: 40,
  paddingY: 40,
}

type PerfMetrics = {
  people: number
  families: number
  payloadBytes: number
  apiMs: number
  navigationToResponseMs: number
  firstCardMs: number
  dragMs: number
  zoomMs: number
  editorOpenMs: number
  editInputMs: number
  layoutPanelMs: number
  cardNodes: number
  lineNodes: number
  longTasks: Array<{ startTime: number; duration: number; attribution: string[] }>
  marks: Array<{ name: string; startTime: number }>
  audit: Array<{ source: string; action: string; durationMs: number; detail?: Record<string, unknown> }>
  frameCount: number
  sampledFps: number
}

declare global {
  interface Window {
    __publicationPerf?: {
      longTasks: Array<{ startTime: number; duration: number; attribution: string[] }>
    }
  }
}

test.skip(!process.env.E2E_PERF, 'Performance probe is opt-in: set E2E_PERF=1')

function makePublication(peopleCount: number) {
  const people: Record<string, { id: string; name: string; gender: 'male' | 'female' }> = {}
  const families: Record<string, { id: string; adults: string[]; children: string[] }> = {}

  for (let index = 0; index < peopleCount; index += 1) {
    people[`p${index}`] = {
      id: `p${index}`,
      name: `性能测试人物 ${index}`,
      gender: index % 2 === 0 ? 'male' : 'female',
    }
  }

  for (let index = 0; index * 2 + 1 < peopleCount; index += 1) {
    const children = [`p${index * 2 + 1}`]
    if (index * 2 + 2 < peopleCount) children.push(`p${index * 2 + 2}`)
    families[`f${index}`] = {
      id: `f${index}`,
      adults: [`p${index}`],
      children,
    }
  }

  return {
    title: `E2E 性能测试 ${peopleCount} 人`,
    subtitle: 'browser performance probe',
    focusFamilyId: 'f0',
    people,
    families,
  }
}

async function sampleFrames(page: Page, durationMs: number) {
  return page.evaluate(async (duration) => {
    return await new Promise<{ frameCount: number; sampledFps: number }>((resolve) => {
      const startedAt = performance.now()
      let frameCount = 0
      const tick = (now: number) => {
        frameCount += 1
        const elapsed = now - startedAt
        if (elapsed >= duration) {
          resolve({ frameCount, sampledFps: Math.round((frameCount * 1000 / elapsed) * 10) / 10 })
          return
        }
        requestAnimationFrame(tick)
      }
      requestAnimationFrame(tick)
    })
  }, durationMs)
}

test.describe('Publication browser performance', () => {
  test.describe.configure({ timeout: 120_000 })

  let publicationId = 0
  let authToken = ''

  test.beforeAll(async ({ request }) => {
    test.setTimeout(120_000)
    expect(PEOPLE_COUNT).toBeGreaterThanOrEqual(2)
    expect(PEOPLE_COUNT).toBeLessThanOrEqual(10000)

    authToken = await loginViaApi(request, TEST_USER, TEST_PASS)
    const response = await authenticatedRequest(request, authToken, '/api/publications', {
      method: 'POST',
      data: {
        title: `E2E 性能测试 ${PEOPLE_COUNT} 人`,
        subtitle: 'browser performance probe',
        publication: makePublication(PEOPLE_COUNT),
        settings: SETTINGS,
      },
    })
    expect(response.ok()).toBeTruthy()
    const body = await response.json() as { data?: { id?: number } }
    publicationId = body.data?.id ?? 0
    expect(publicationId).toBeGreaterThan(0)
  })

  test.afterAll(async ({ request }) => {
    test.setTimeout(120_000)
    if (publicationId && authToken) {
      await authenticatedRequest(request, authToken, `/api/publications/${publicationId}`, { method: 'DELETE' }).catch(() => {})
    }
  })

  test('reports open, render, and interaction metrics without reducing content', async ({ page, context }, testInfo) => {
    await page.addInitScript(() => {
      window.__publicationPerf = { longTasks: [] }
      if (typeof PerformanceObserver === 'undefined') return
      try {
        const observer = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            const attribution = 'attribution' in entry
              ? Array.from((entry as PerformanceLongTaskTiming).attribution ?? [])
                .map((item) => item.containerSrc || item.containerName || item.containerType)
              : []
            window.__publicationPerf?.longTasks.push({
              startTime: Math.round(entry.startTime * 10) / 10,
              duration: Math.round(entry.duration * 10) / 10,
              attribution,
            })
          }
        })
        observer.observe({ type: 'longtask', buffered: true })
      } catch {
        // Long Task API is optional in some browsers.
      }
    })

    await loginPage(page, TEST_USER, TEST_PASS)
    const profiler = process.env.E2E_CPU_PROFILE ? await context.newCDPSession(page) : null
    if (profiler) {
      await profiler.send('Profiler.enable')
      await profiler.send('Profiler.start', { callCount: true, detailed: true })
    }
    const tracePath = testInfo.outputPath('publication-open-trace.zip')
    if (process.env.E2E_TRACE) {
      await context.tracing.start({ screenshots: true, snapshots: true, sources: true })
    }
    const navigationStartedAt = Date.now()
    const apiStartedAt = Date.now()
    const publicationResponsePromise = page.waitForResponse((response) =>
      response.url().includes(`/api/publications/${publicationId}`) && response.request().method() === 'GET',
    )
    await page.goto(`/publication/${publicationId}`)
    const publicationResponse = await publicationResponsePromise
    const navigationToResponseMs = Date.now() - apiStartedAt
    expect(publicationResponse.ok()).toBeTruthy()

    const firstCard = page.locator('.person-card').first()
    await expect(firstCard).toBeVisible({ timeout: 30_000 })
    const firstCardMs = Date.now() - navigationStartedAt

    const responseBody = await publicationResponse.json() as {
      data?: { publication?: { people?: Record<string, unknown>; families?: Record<string, unknown> } }
    }
    const publication = responseBody.data?.publication
    const people = Object.keys(publication?.people ?? {}).length
    const families = Object.keys(publication?.families ?? {}).length
    const payloadBytes = new TextEncoder().encode(JSON.stringify(responseBody)).byteLength
    const browserTimings = await page.evaluate(() => ({
      marks: performance.getEntriesByType('mark')
        .filter((entry) => entry.name.startsWith('publication-open:'))
        .map((entry) => ({ name: entry.name, startTime: Math.round(entry.startTime * 10) / 10 })),
      resources: performance.getEntriesByType('resource')
        .filter((entry) => entry.name.includes('/api/publications/'))
        .map((entry) => ({ name: entry.name, duration: Math.round(entry.duration * 10) / 10 })),
      audit: ((window as Window & {
        __auditLog?: { value?: Array<{ source: string; action: string; durationMs: number; detail?: Record<string, unknown> }> }
      }).__auditLog?.value ?? [])
        .filter((entry) => entry.action === 'replaceReactiveObject'),
    }))
    const apiMs = browserTimings.resources.find((resource) => resource.name.endsWith(`/api/publications/${publicationId}`))?.duration ?? navigationToResponseMs

    const viewport = page.locator('.canvas-viewport')
    const box = await viewport.boundingBox()
    const framePromise = sampleFrames(page, 1000)
    const dragStartedAt = Date.now()
    if (box) {
      await page.mouse.move(box.x + box.width * 0.35, box.y + box.height * 0.5)
      await page.mouse.down()
      await page.mouse.move(box.x + box.width * 0.65, box.y + box.height * 0.5, { steps: 30 })
      await page.mouse.up()
    }
    const dragMs = Date.now() - dragStartedAt
    const frames = await framePromise

    const zoomStartedAt = Date.now()
    if (box) {
      await page.mouse.move(box.x + box.width * 0.5, box.y + box.height * 0.5)
      for (let index = 0; index < 8; index += 1) {
        await page.mouse.wheel(0, index % 2 === 0 ? -80 : 80)
      }
      await page.waitForTimeout(180)
    }
    const zoomMs = Date.now() - zoomStartedAt

    const editorStartedAt = Date.now()
    const visibleCard = page.locator('.person-card').first()
    await visibleCard.click()
    await expect(page.locator('.ped-overlay')).toBeVisible()
    const editorOpenMs = Date.now() - editorStartedAt

    const editorNameInput = page.locator('.ped-inp--hero')
    const originalName = await editorNameInput.inputValue()
    const editStartedAt = Date.now()
    await editorNameInput.fill(`${originalName}x`)
    await editorNameInput.fill(originalName)
    const editInputMs = Date.now() - editStartedAt
    await page.locator('.ped-close-btn').click()
    await expect(page.locator('.ped-overlay')).toBeHidden()

    const panelStartedAt = Date.now()
    const layoutToggle = page.locator('.tool-btn--panel').first()
    await layoutToggle.click()
    await expect(page.locator('.layout-panel')).toBeVisible()
    await page.locator('.layout-panel .floating-panel__close').click()
    await expect(page.locator('.layout-panel')).toBeHidden()
    const layoutPanelMs = Date.now() - panelStartedAt

    const metrics: PerfMetrics = {
      people,
      families,
      payloadBytes,
      apiMs,
      navigationToResponseMs,
      firstCardMs,
      dragMs,
      zoomMs,
      editorOpenMs,
      editInputMs,
      layoutPanelMs,
      cardNodes: await page.locator('.person-card').count(),
      lineNodes: await page.locator('.tree-lines path, .tree-lines circle').count(),
      longTasks: await page.evaluate(() => window.__publicationPerf?.longTasks ?? []),
      marks: browserTimings.marks,
      audit: browserTimings.audit,
      ...frames,
    }

    console.table(metrics)
    console.table(browserTimings.resources)
    console.table(browserTimings.audit)
    if (profiler) {
      const profile = await profiler.send('Profiler.stop') as {
        profile?: {
          nodes?: Array<{ id: number; callFrame: { functionName?: string; url?: string } }>
          samples?: number[]
        }
      }
      const nodes = new Map((profile.profile?.nodes ?? []).map((node) => [node.id, node]))
      const sampleCounts = new Map<number, number>()
      for (const sample of profile.profile?.samples ?? []) {
        sampleCounts.set(sample, (sampleCounts.get(sample) ?? 0) + 1)
      }
      const hotFunctions = [...sampleCounts.entries()]
        .sort((left, right) => right[1] - left[1])
        .slice(0, 20)
        .map(([nodeId, samples]) => ({
          samples,
          function: nodes.get(nodeId)?.callFrame.functionName || '(anonymous)',
          url: nodes.get(nodeId)?.callFrame.url || '',
        }))
      console.table(hotFunctions)
      await testInfo.attach('publication-open-cpu-profile.json', {
        body: JSON.stringify(profile, null, 2),
        contentType: 'application/json',
      })
    }
    if (process.env.E2E_TRACE) {
      await context.tracing.stop({ path: tracePath })
      await testInfo.attach('publication-open-trace.zip', {
        path: tracePath,
        contentType: 'application/zip',
      })
    }
    await testInfo.attach('publication-open-performance.json', {
      body: JSON.stringify(metrics, null, 2),
      contentType: 'application/json',
    })

    expect(people).toBe(PEOPLE_COUNT)
    expect(await firstCard.count()).toBe(1)
    expect(metrics.frameCount).toBeGreaterThan(0)
  })
})
