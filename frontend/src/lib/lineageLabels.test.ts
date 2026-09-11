import { describe, expect, it } from 'vitest'

import { samplePublication } from '../data/sampleFamily'
import { suggestLineageNote } from './lineageLabels'

function clonePublication() {
  return JSON.parse(JSON.stringify(samplePublication))
}

describe('lineage note suggestions', () => {
  it('suggests kinship labels within the main lineage', () => {
    const publication = clonePublication()

    expect(suggestLineageNote(publication, 'p3')).toBe('长子')
    expect(suggestLineageNote(publication, 'p4')).toBe('次子')
    expect(suggestLineageNote(publication, 'p7')).toBe('次孙')
    expect(suggestLineageNote(publication, 'p10')).toBe('四孙')
  })

  it('marks descendants of married-out daughters as external descendants', () => {
    const publication = clonePublication()

    expect(suggestLineageNote(publication, 'p20')).toBe('外曾孙')
  })

  it('keeps descendants internal after switching a daughter branch to uxorilocal', () => {
    const publication = clonePublication()
    publication.families.f6.branchMode = 'uxorilocal'

    expect(suggestLineageNote(publication, 'p20')).toBe('曾孙')
  })

  it('recalculates the title within the currently focused branch', () => {
    const publication = clonePublication()
    publication.focusFamilyId = 'f3'

    expect(suggestLineageNote(publication, 'p10')).toBe('长子')
    expect(suggestLineageNote(publication, 'p11')).toBe('长女')
  })
})
