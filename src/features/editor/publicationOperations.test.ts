import { describe, expect, it } from 'vitest'

import { samplePublication } from '../../data/sampleFamily'
import { applyRelationshipAction, summarizeDeleteImpact } from './publicationOperations'

function clonePublication() {
  return JSON.parse(JSON.stringify(samplePublication))
}

describe('publication operations', () => {
  it('adds a spouse and selects the new person', () => {
    const publication = clonePublication()
    delete publication.people.p6
    publication.families.f2.adults = ['p3']

    const result = applyRelationshipAction(publication, { type: 'add-spouse', personId: 'p3' })

    expect(result).toEqual({
      ok: true,
      value: expect.objectContaining({
        historyLabel: '新增配偶 · 李文岳',
        selectedPersonId: expect.stringMatching(/^p\d+$/),
      }),
    })

    if (!result.ok) {
      return
    }

    const family = result.value.publication.families.f2
    expect(family.adults).toHaveLength(2)
    expect(result.value.publication.people[result.value.selectedPersonId]).toEqual(
      expect.objectContaining({
        note: '配偶',
      }),
    )
  })

  it('moves child order within the family', () => {
    const result = applyRelationshipAction(clonePublication(), {
      type: 'move-child',
      parentPersonId: 'p4',
      childId: 'p10',
      direction: 1,
    })

    expect(result).toEqual({
      ok: true,
      value: expect.objectContaining({
        historyLabel: '调整子女顺序 · 李明诚',
      }),
    })

    if (!result.ok) {
      return
    }

    expect(result.value.publication.families.f3.children).toEqual(['p11', 'p10', 'p12'])
  })

  it('cleans relationship references when deleting a person', () => {
    const publication = clonePublication()
    const summary = summarizeDeleteImpact(publication, 'p3')

    expect(summary).toEqual({
      spouseNames: ['陈淑珍'],
      parentNames: ['李承祚', '沈素琴'],
      childNames: ['李修远', '李清和'],
      removedFamilyIds: [],
    })

    const result = applyRelationshipAction(publication, { type: 'delete-person', personId: 'p3' })
    expect(result).toEqual({
      ok: true,
      value: expect.objectContaining({
        historyLabel: '删除人物 · 李文岳',
      }),
    })

    if (!result.ok) {
      return
    }

    expect(result.value.publication.people.p3).toBeUndefined()
    expect(result.value.publication.families.f1.children).toEqual(['p4', 'p5'])
    expect(result.value.publication.families.f2).toEqual({
      id: 'f2',
      adults: ['p6'],
      children: ['p7', 'p8'],
    })
    expect(result.value.publication.families[result.value.focusFamilyId]).toBeDefined()
  })

  it('blocks adding duplicate spouse relations', () => {
    const result = applyRelationshipAction(clonePublication(), { type: 'add-spouse', personId: 'p3' })

    expect(result).toEqual({
      ok: false,
      issues: [
        {
          code: 'operation-conflict',
          path: 'personId',
          message: '李文岳 已有配偶关系。',
        },
      ],
    })
  })
})
