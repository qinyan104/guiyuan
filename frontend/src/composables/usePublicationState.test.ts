import { describe, expect, it } from 'vitest'

import { defaultSettings, samplePublication } from '../data/sampleFamily'
import type { PublicationData } from '../types/family'
import { usePublicationState } from './usePublicationState'

describe('usePublicationState', () => {
  it('computes hovered kinship relative to the selected person', () => {
    const state = usePublicationState(samplePublication, defaultSettings)

    state.selectedPersonId.value = 'p7'
    state.setHoveredPerson('p10')

    expect(state.relationshipToSelected.value).toMatchObject({
      term: '堂弟',
      description: expect.any(String),
    })
  })

  it('clears hovered kinship when hover leaves or points to the selected person', () => {
    const state = usePublicationState(samplePublication, defaultSettings)

    state.selectedPersonId.value = 'p7'
    state.setHoveredPerson('p7')
    expect(state.relationshipToSelected.value).toBeNull()

    state.setHoveredPerson('p10')
    expect(state.relationshipToSelected.value?.term).toBe('堂弟')

    state.setHoveredPerson(null)
    expect(state.relationshipToSelected.value).toBeNull()
  })

  it('preserves valid Chinese names when loading and replacing publication data', () => {
    const publication: PublicationData = {
      title: '史氏族谱',
      subtitle: '',
      focusFamilyId: 'f1',
      people: {
        p1: { id: 'p1', name: '史小伟', gender: 'male' },
      },
      families: {
        f1: { id: 'f1', adults: ['p1'], children: [] },
      },
    }
    const state = usePublicationState(publication, defaultSettings)

    expect(state.publication.people.p1.name).toBe('史小伟')

    const replacement = structuredClone(publication)
    replacement.people.p1.name = '谢志'
    state.replaceReactiveObject(state.publication, replacement)

    expect(state.publication.people.p1.name).toBe('谢志')
  })
})
