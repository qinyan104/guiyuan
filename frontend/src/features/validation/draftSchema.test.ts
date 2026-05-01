import { describe, expect, it } from 'vitest'

import { blankPublication, defaultSettings, samplePublication } from '../../data/sampleFamily'
import type { BuiltinSampleRecord } from '../../data/builtinDynastySamples'
import { builtinSamples } from '../../data/builtinDynastySamples'
import { normalizeSettings, validatePublicationData, validateSettings } from './draftSchema'

describe('validatePublicationData', () => {
  it('accepts the bundled sample publication', () => {
    expect(validatePublicationData(samplePublication)).toEqual([])
  })

  it('accepts the bundled blank publication', () => {
    expect(validatePublicationData(blankPublication)).toEqual([])
  })

  it('accepts every bundled dynasty sample publication', () => {
    const samples = (
      Array.isArray(builtinSamples) ? builtinSamples : Object.values(builtinSamples ?? {})
    ) as BuiltinSampleRecord[]

    expect(samples.length).toBeGreaterThan(0)

    for (const sample of samples) {
      expect(validatePublicationData(sample.publication)).toEqual([])
    }
  })

  it('rejects a focus family that does not exist', () => {
    const brokenPublication = {
      ...samplePublication,
      focusFamilyId: 'missing-family',
    }

    expect(validatePublicationData(brokenPublication)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'missing-focus-family',
          path: 'focusFamilyId',
        }),
      ]),
    )
  })

  it('rejects a family that references a missing person', () => {
    const brokenPublication = {
      ...samplePublication,
      families: {
        ...samplePublication.families,
        f1: {
          ...samplePublication.families.f1,
          children: [...samplePublication.families.f1.children, 'missing-person'],
        },
      },
    }

    expect(validatePublicationData(brokenPublication)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'missing-person-reference',
          path: `families.f1.children[${samplePublication.families.f1.children.length}]`,
        }),
      ]),
    )
  })

  it('rejects an empty title', () => {
    const broken = { ...samplePublication, title: '   ' }
    expect(validatePublicationData(broken)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: 'invalid-root', path: 'title' }),
      ]),
    )
  })

  it('rejects an empty subtitle', () => {
    const broken = { ...samplePublication, subtitle: '' }
    expect(validatePublicationData(broken)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: 'invalid-root', path: 'subtitle' }),
      ]),
    )
  })
})

describe('validateSettings', () => {
  it('accepts the default settings', () => {
    expect(validateSettings(defaultSettings)).toEqual([])
  })

  it('rejects a negative cardWidth', () => {
    const bad = { ...defaultSettings, cardWidth: -10 }
    expect(validateSettings(bad)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: 'invalid-settings', path: 'settings.cardWidth' }),
      ]),
    )
  })

  it('rejects a zoom below minimum', () => {
    const bad = { ...defaultSettings, zoom: 0.1 }
    expect(validateSettings(bad)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: 'invalid-settings', path: 'settings.zoom' }),
      ]),
    )
  })

  it('rejects a zoom above maximum', () => {
    const bad = { ...defaultSettings, zoom: 2.0 }
    expect(validateSettings(bad)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: 'invalid-settings', path: 'settings.zoom' }),
      ]),
    )
  })

  it('rejects Infinity values', () => {
    const bad = { ...defaultSettings, paddingX: Infinity }
    expect(validateSettings(bad)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: 'invalid-settings', path: 'settings.paddingX' }),
      ]),
    )
  })
})

describe('normalizeSettings', () => {
  it('clamps out-of-range values back to valid bounds', () => {
    const raw = { ...defaultSettings, zoom: 0.01, cardWidth: 999, paddingY: -50 }
    const result = normalizeSettings(raw)

    expect(result.zoom).toBe(0.55)
    expect(result.cardWidth).toBe(176)
    expect(result.paddingY).toBe(48)
  })

  it('leaves valid values untouched', () => {
    const result = normalizeSettings(defaultSettings)
    expect(result.cardWidth).toBe(defaultSettings.cardWidth)
    expect(result.generationGap).toBe(defaultSettings.generationGap)
    expect(result.siblingGap).toBe(defaultSettings.siblingGap)
    expect(result.zoom).toBe(defaultSettings.zoom)
    expect(result.fontScale).toBe(defaultSettings.fontScale)
    expect(result.paddingX).toBe(defaultSettings.paddingX)
    expect(result.paddingY).toBe(defaultSettings.paddingY)
  })
})
