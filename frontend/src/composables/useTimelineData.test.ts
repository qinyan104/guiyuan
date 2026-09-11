import { computed } from 'vue'
import { describe, expect, it } from 'vitest'
import type { Person, PublicationData } from '../types/family'
import { useTimelineData } from './useTimelineData'

function createPublication(people: Record<string, Person>): PublicationData {
  return {
    title: '测试宗谱',
    subtitle: '',
    focusFamilyId: 'f1',
    people,
    families: {
      f1: { id: 'f1', adults: ['p1', 'p2'], children: ['p3'] },
      f2: { id: 'f2', adults: ['p3', 'p4'], children: ['p5'] },
    },
  }
}

const people: Record<string, Person> = {
  p1: { id: 'p1', name: '甲', gender: 'male', birth: '1801年', death: '1860年' },
  p2: { id: 'p2', name: '乙', gender: 'female', birth: '1805年' },
  p3: { id: 'p3', name: '丙', gender: 'male', birth: '1830年', death: '1900年' },
  p4: { id: 'p4', name: '丁', gender: 'female', birth: '1835年' },
  p5: { id: 'p5', name: '戊', gender: 'male', birth: '1860年' },
}

describe('useTimelineData', () => {
  it('calculates generations and sorted event statistics', () => {
    const timeline = useTimelineData(computed(() => createPublication(people)))

    expect(timeline.allEvents.value[0]).toMatchObject({ person: people.p1, year: 1801, type: 'birth' })
    expect(timeline.allEvents.value.at(-1)).toMatchObject({ person: people.p3, year: 1900, type: 'death' })
    expect(timeline.availableGenerations.value).toEqual([1, 2, 3])
    expect(timeline.totalEvents.value).toBe(7)
    expect(timeline.distinctPeople.value).toBe(5)
    expect(timeline.span.value).toBe(99)
  })

  it('filters events and lifespan items by type, generation and search text', () => {
    const timeline = useTimelineData(computed(() => createPublication(people)))

    timeline.filterType.value = 'death'
    expect(timeline.filteredEvents.value.map(event => event.person.id)).toEqual(['p1', 'p3'])

    timeline.filterType.value = 'all'
    timeline.selectedGeneration.value = 2
    expect(timeline.lifespanItems.value.map(item => item.person.id)).toEqual(['p3', 'p4'])

    timeline.selectedGeneration.value = null
    timeline.searchQuery.value = '戊'
    expect(timeline.filteredEvents.value.map(event => event.person.id)).toEqual(['p5'])
    expect(timeline.lifespanItems.value.map(item => item.person.id)).toEqual(['p5'])
  })

  it('groups events by century and calculates lifespan bar positions', () => {
    const timeline = useTimelineData(computed(() => createPublication(people)))
    const groups = timeline.centuryGroups.value

    expect(groups.map(group => [group.centuryStart, group.births, group.deaths])).toEqual([
      [1800, 5, 1],
      [1900, 0, 1],
    ])
    expect(timeline.centuryLabel(1800)).toBe('公元 19 世纪 (1800年代)')
    expect(timeline.getLifespanBarLeft(1830)).toBeCloseTo((29 / 99) * 100)
    expect(timeline.getLifespanBarWidth(timeline.lifespanItems.value[0])).toBeCloseTo((59 / 99) * 100)
  })
})
