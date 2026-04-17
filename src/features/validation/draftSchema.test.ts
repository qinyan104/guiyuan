import { describe, expect, it } from 'vitest'

import { samplePublication } from '../../data/sampleFamily'
import { validatePublicationData } from './draftSchema'

describe('validatePublicationData', () => {
  it('accepts the bundled sample publication', () => {
    expect(validatePublicationData(samplePublication)).toEqual([])
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
          path: 'families.f1.children[3]',
        }),
      ]),
    )
  })
})
