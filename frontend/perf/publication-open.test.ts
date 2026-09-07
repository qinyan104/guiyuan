import { describe, expect, it } from 'vitest'
import { defaultSettings } from '../src/data/sampleFamily'
import { layoutPublication } from '../src/lib/layout'
import type { PublicationData } from '../src/types/family'

function makePublication(peopleCount: number): PublicationData {
  const people: PublicationData['people'] = {}
  const families: PublicationData['families'] = {}

  for (let index = 0; index < peopleCount; index += 1) {
    people[`p${index}`] = {
      id: `p${index}`,
      name: `Person ${index}`,
      gender: index % 2 === 0 ? 'male' : 'female',
    }
  }

  for (let index = 0; index < peopleCount - 1; index += 1) {
    families[`f${index}`] = {
      id: `f${index}`,
      adults: [`p${index}`],
      children: [`p${index + 1}`],
    }
  }

  return {
    title: `Performance ${peopleCount}`,
    subtitle: '',
    focusFamilyId: 'f0',
    people,
    families,
  }
}

function elapsedMillis(start: number): number {
  return Math.round((performance.now() - start) * 100) / 100
}

describe('publication open performance probe', () => {
  it('reports frontend stages without imposing machine-specific thresholds', () => {
    const configuredSize = Number(process.env.PERF_PEOPLE ?? 1000)
    expect(configuredSize).toBeGreaterThanOrEqual(2)

    const publication = makePublication(configuredSize)
    const payloadBytes = new TextEncoder().encode(JSON.stringify(publication)).byteLength

    layoutPublication(publication, defaultSettings)
    const timings: Array<{ stage: string; ms: number; details: string }> = []

    let start = performance.now()
    const layout = layoutPublication(publication, defaultSettings)
    timings.push({
      stage: 'layoutPublication',
      ms: elapsedMillis(start),
      details: `cards=${layout.cards.length} lines=${layout.lines.length}`,
    })

    start = performance.now()
    const parsed = JSON.parse(JSON.stringify(publication)) as PublicationData
    timings.push({
      stage: 'JSON parse/clone',
      ms: elapsedMillis(start),
      details: `bytes=${payloadBytes}`,
    })

    console.table(timings)
    expect(parsed.people).toHaveProperty('p0')
    expect(layout.cards.length).toBeGreaterThan(0)
  })
})
