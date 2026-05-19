import { describe, expect, it } from 'vitest'

import { defaultSettings, samplePublication } from '../data/sampleFamily'
import { applyRelationshipAction } from '../features/editor/publicationOperations'
import { layoutPublication } from './layout'

function clonePublication() {
  return JSON.parse(JSON.stringify(samplePublication))
}

describe('layoutPublication', () => {
  it('keeps the parent connector anchored on the bloodline child card after adding a spouse', () => {
    const result = applyRelationshipAction(clonePublication(), { type: 'add-spouse', personId: 'p5' })
    expect(result.ok).toBe(true)

    if (!result.ok) {
      return
    }

    const spouseId = result.value.selectedPersonId
    const layout = layoutPublication(result.value.publication, defaultSettings)
    const personCard = layout.cards.find((card) => card.personId === 'p5')
    const spouseCard = layout.cards.find((card) => card.personId === spouseId)

    expect(personCard).toBeDefined()
    expect(spouseCard).toBeDefined()

    if (!personCard || !spouseCard) {
      return
    }

    const personCenterX = personCard.x + personCard.width / 2
    const inboundLine = layout.lines.find((line) => line.x1 === line.x2 && line.y2 === personCard.y && line.x1 === personCenterX)

    expect(inboundLine).toBeDefined()
    expect(spouseCard.x).toBeGreaterThan(personCard.x)
  })

  it('keeps a single child branch directly under the parent center', () => {
    const publication = clonePublication()
    publication.families.f1.children = ['p5']

    const result = applyRelationshipAction(publication, { type: 'add-spouse', personId: 'p5' })
    expect(result.ok).toBe(true)

    if (!result.ok) {
      return
    }

    const layout = layoutPublication(result.value.publication, defaultSettings)
    const parentLeftCard = layout.cards.find((card) => card.personId === 'p1')
    const parentRightCard = layout.cards.find((card) => card.personId === 'p2')
    const childCard = layout.cards.find((card) => card.personId === 'p5')

    expect(parentLeftCard).toBeDefined()
    expect(parentRightCard).toBeDefined()
    expect(childCard).toBeDefined()

    if (!parentLeftCard || !parentRightCard || !childCard) {
      return
    }

    const parentCenterX = (parentLeftCard.x + parentLeftCard.width / 2 + parentRightCard.x + parentRightCard.width / 2) / 2
    const childCenterX = childCard.x + childCard.width / 2
    const childBarY = childCard.y - 48
    const bridgeLine = layout.lines.find(
      (line) =>
        line.y1 === childBarY &&
        line.y2 === childBarY &&
        line.x1 === Math.min(parentCenterX, childCenterX) &&
        line.x2 === Math.max(parentCenterX, childCenterX),
    )

    expect(childCenterX).toBe(parentCenterX)
    expect(bridgeLine).toBeUndefined()
  })

  it('centers two child branches under the couple center after adding a spouse', () => {
    const publication = clonePublication()
    publication.families.f1.children = ['p5']
    publication.people.p5.gender = 'male'

    const spouseResult = applyRelationshipAction(publication, { type: 'add-spouse', personId: 'p5' })
    expect(spouseResult.ok).toBe(true)
    if (!spouseResult.ok) {
      return
    }

    const firstChildResult = applyRelationshipAction(spouseResult.value.publication, {
      type: 'add-child',
      personId: 'p5',
      gender: 'male',
    })
    expect(firstChildResult.ok).toBe(true)
    if (!firstChildResult.ok) {
      return
    }

    const secondChildResult = applyRelationshipAction(firstChildResult.value.publication, {
      type: 'add-child',
      personId: 'p5',
      gender: 'female',
    })
    expect(secondChildResult.ok).toBe(true)
    if (!secondChildResult.ok) {
      return
    }

    const layout = layoutPublication(secondChildResult.value.publication, defaultSettings)
    const spouseCard = layout.cards.find((card) => card.personId === spouseResult.value.selectedPersonId)
    const personCard = layout.cards.find((card) => card.personId === 'p5')
    const firstChildCard = layout.cards.find((card) => card.personId === firstChildResult.value.selectedPersonId)
    const secondChildCard = layout.cards.find((card) => card.personId === secondChildResult.value.selectedPersonId)

    expect(personCard).toBeDefined()
    expect(spouseCard).toBeDefined()
    expect(firstChildCard).toBeDefined()
    expect(secondChildCard).toBeDefined()

    if (!personCard || !spouseCard || !firstChildCard || !secondChildCard) {
      return
    }

    const coupleCenterX = (personCard.x + personCard.width / 2 + spouseCard.x + spouseCard.width / 2) / 2
    const leftChildCenterX = Math.min(firstChildCard.x + firstChildCard.width / 2, secondChildCard.x + secondChildCard.width / 2)
    const rightChildCenterX = Math.max(firstChildCard.x + firstChildCard.width / 2, secondChildCard.x + secondChildCard.width / 2)
    const childBarY = firstChildCard.y - 48
    const bridgeLine = layout.lines.find(
      (line) =>
        line.y1 === childBarY &&
        line.y2 === childBarY &&
        line.x1 === leftChildCenterX &&
        line.x2 === rightChildCenterX,
    )

    expect((leftChildCenterX + rightChildCenterX) / 2).toBe(coupleCenterX)
    expect(bridgeLine).toBeDefined()
  })

  it('keeps a married daughter marked in her father lineage while still showing her descendants', () => {
    const publication = clonePublication()
    publication.families.f1.children = ['p5']

    const spouseResult = applyRelationshipAction(publication, { type: 'add-spouse', personId: 'p5' })
    expect(spouseResult.ok).toBe(true)
    if (!spouseResult.ok) {
      return
    }

    const spouseId = spouseResult.value.selectedPersonId
    const childResult = applyRelationshipAction(spouseResult.value.publication, {
      type: 'add-child',
      personId: 'p5',
      gender: 'male',
    })
    expect(childResult.ok).toBe(true)
    if (!childResult.ok) {
      return
    }

    const outboundChildId = childResult.value.selectedPersonId
    const fatherLinePublication = JSON.parse(JSON.stringify(childResult.value.publication))
    fatherLinePublication.focusFamilyId = 'f1'
    const fatherLineLayout = layoutPublication(fatherLinePublication, defaultSettings)
    const daughterCard = fatherLineLayout.cards.find((card) => card.personId === 'p5')
    const spouseCard = fatherLineLayout.cards.find((card) => card.personId === spouseId)
    const outboundChildCard = fatherLineLayout.cards.find((card) => card.personId === outboundChildId)

    expect(daughterCard).toEqual(expect.objectContaining({ lineageRole: 'married-out' }))
    expect(spouseCard).toEqual(expect.objectContaining({ lineageRole: 'in-law' }))
    expect(outboundChildCard).toBeDefined()

    const daughterBranchLayout = layoutPublication(childResult.value.publication, defaultSettings)
    expect(daughterBranchLayout.cards.find((card) => card.personId === outboundChildId)).toBeDefined()
  })

  it('compresses the layout when showCard is false', () => {
    const standardSettings = { ...defaultSettings, showCard: true }
    const compactSettings = { ...defaultSettings, showCard: false }

    const standardLayout = layoutPublication(samplePublication, standardSettings)
    const compactLayout = layoutPublication(samplePublication, compactSettings)

    // Verify compact card dimensions
    compactLayout.cards.forEach((card) => {
      expect(card.width).toBe(32)
      expect(card.height).toBe(110)
    })

    // Verify overall height is reduced
    expect(compactLayout.height).toBeLessThan(standardLayout.height)
  })

  it('ships the sample with an out-married daughter branch ready to inspect', () => {
    const rootLayout = layoutPublication(clonePublication(), defaultSettings)
    const daughterCard = rootLayout.cards.find((card) => card.personId === 'p18')
    const sonInLawCard = rootLayout.cards.find((card) => card.personId === 'p19')
    const grandchildCard = rootLayout.cards.find((card) => card.personId === 'p20')

    expect(daughterCard).toEqual(expect.objectContaining({ lineageRole: 'married-out' }))
    expect(sonInLawCard).toEqual(expect.objectContaining({ lineageRole: 'in-law' }))
    expect(grandchildCard).toBeDefined()

    const daughterBranchPublication = clonePublication()
    daughterBranchPublication.focusFamilyId = 'f6'
    const daughterBranchLayout = layoutPublication(daughterBranchPublication, defaultSettings)
    expect(daughterBranchLayout.cards.find((card) => card.personId === 'p20')).toBeDefined()
  })

  it('keeps a recruited son-in-law branch inside the natal lineage', () => {
    const publication = clonePublication()
    publication.families.f6.branchMode = 'uxorilocal'

    const layout = layoutPublication(publication, defaultSettings)
    const daughterCard = layout.cards.find((card) => card.personId === 'p18')
    const sonInLawCard = layout.cards.find((card) => card.personId === 'p19')
    const grandchildCard = layout.cards.find((card) => card.personId === 'p20')

    expect(daughterCard).toEqual(expect.objectContaining({ lineageRole: 'uxorilocal' }))
    expect(sonInLawCard).toEqual(expect.objectContaining({ lineageRole: 'in-law' }))
    expect(grandchildCard).toBeDefined()
  })
})
