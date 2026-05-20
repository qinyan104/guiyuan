import { describe, expect, it } from 'vitest'

import { defaultSettings, samplePublication } from '../data/sampleFamily'
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
})
