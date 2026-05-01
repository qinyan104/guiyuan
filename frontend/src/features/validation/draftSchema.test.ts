import { describe, expect, it } from 'vitest'

import { blankPublication, samplePublication } from '../../data/sampleFamily'
import type { BuiltinSampleRecord } from '../../data/builtinDynastySamples'
import { builtinSamples } from '../../data/builtinDynastySamples'
import { validatePublicationData } from './draftSchema'

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
})
