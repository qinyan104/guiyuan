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
        historyLabel: '新增配偶 · 朱标',
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

  it('adds son and daughter with explicit genders', () => {
    const sonResult = applyRelationshipAction(clonePublication(), { type: 'add-child', personId: 'p4', gender: 'male' })
    const daughterResult = applyRelationshipAction(clonePublication(), { type: 'add-child', personId: 'p4', gender: 'female' })

    expect(sonResult).toEqual({
      ok: true,
      value: expect.objectContaining({
        historyLabel: '新增儿子 · 朱棣',
        selectedPersonId: expect.stringMatching(/^p\d+$/),
      }),
    })

    expect(daughterResult).toEqual({
      ok: true,
      value: expect.objectContaining({
        historyLabel: '新增女儿 · 朱棣',
        selectedPersonId: expect.stringMatching(/^p\d+$/),
      }),
    })

    if (!sonResult.ok || !daughterResult.ok) {
      return
    }

    expect(sonResult.value.publication.people[sonResult.value.selectedPersonId]).toEqual(
      expect.objectContaining({
        gender: 'male',
        note: '七孙',
      }),
    )

    expect(daughterResult.value.publication.people[daughterResult.value.selectedPersonId]).toEqual(
      expect.objectContaining({
        gender: 'female',
        note: '四孙女',
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
        historyLabel: '调整子女顺序 · 朱高炽',
      }),
    })

    if (!result.ok) {
      return
    }

    expect(result.value.publication.families.f3.children).toEqual(['p11', 'p10', 'p12', 'p18', 'p37'])
  })

  it('can switch a female branch between married-out and uxorilocal', () => {
    const publication = clonePublication()
    const result = applyRelationshipAction(publication, { type: 'set-branch-mode', personId: 'p18', branchMode: 'uxorilocal' })

    expect(result).toEqual({
      ok: true,
      value: expect.objectContaining({
        historyLabel: '设为招婿支 · 永安公主',
        selectedPersonId: 'p18',
        focusFamilyId: 'f6',
      }),
    })

    if (!result.ok) {
      return
    }

    expect(result.value.publication.families.f6.branchMode).toBe('uxorilocal')
  })

  it('cleans relationship references when deleting a person', () => {
    const publication = clonePublication()
    const summary = summarizeDeleteImpact(publication, 'p3')

    expect(summary).toEqual({
      spouseNames: ['常氏'],
      parentNames: ['朱元璋', '马秀英'],
      childNames: ['朱雄英', '朱允炆', '江都公主', '朱允熥'],
      removedFamilyIds: [],
    })

    const result = applyRelationshipAction(publication, { type: 'delete-person', personId: 'p3' })
    expect(result).toEqual({
      ok: true,
      value: expect.objectContaining({
        historyLabel: '删除人物 · 朱标',
      }),
    })

    if (!result.ok) {
      return
    }

    expect(result.value.publication.people.p3).toBeUndefined()
    expect(result.value.focusFamilyId).toBe('f1')
    expect(result.value.publication.families.f1.children).toEqual(['p4', 'p5', 'p33', 'p34'])
    expect(result.value.publication.families.f2).toEqual({
      id: 'f2',
      adults: ['p6'],
      children: ['p35', 'p7', 'p8', 'p36'],
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
          message: '朱标 已有配偶关系。',
        },
      ],
    })
  })
})
