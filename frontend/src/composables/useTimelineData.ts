import { computed, ref, type ComputedRef } from 'vue'
import { parseExactDate, parseYear } from '../lib/dateUtils'
import { getHistoricalEra, type HistoricalDateInfo } from '../lib/dynastyUtils'
import type { FamilyUnit, Person, PublicationData } from '../types/family'

export interface TimelineEvent {
  person: Person
  year: number
  exactDate: number
  type: 'birth' | 'death'
  label: string
  centuryStart: number
  era: HistoricalDateInfo
  generation?: number
  ageAtDeath?: number
}

export interface LifespanItem {
  person: Person
  generation?: number
  birthYear: number
  deathYear: number | null
  lifespan: number | null
  era: HistoricalDateInfo
}

export function useTimelineData(pubData: ComputedRef<PublicationData>) {
  const viewMode = ref<'feed' | 'spectrum'>('feed')
  const filterType = ref<'all' | 'birth' | 'death'>('all')
  const searchQuery = ref('')
  const selectedGeneration = ref<number | null>(null)
  const families = computed<Record<string, FamilyUnit>>(() => pubData.value.families ?? {})

  const generationMap = computed(() => {
    const map = new Map<string, number>()
    const rootId = pubData.value.focusFamilyId
    const rootFamily = rootId ? families.value[rootId] : Object.values(families.value)[0]
    if (!rootFamily) return map

    const queue: Array<{ personId: string; generation: number }> = []
    for (const adultId of rootFamily.adults) {
      if (adultId && !map.has(adultId)) {
        map.set(adultId, 1)
        queue.push({ personId: adultId, generation: 1 })
      }
    }

    let head = 0
    const familyList = Object.values(families.value)
    while (head < queue.length) {
      const current = queue[head++]
      for (const family of familyList) {
        if (!family.adults.includes(current.personId)) continue
        for (const spouseId of family.adults) {
          if (spouseId && !map.has(spouseId)) {
            map.set(spouseId, current.generation)
            queue.push({ personId: spouseId, generation: current.generation })
          }
        }
        for (const childId of family.children) {
          if (childId && !map.has(childId)) {
            map.set(childId, current.generation + 1)
            queue.push({ personId: childId, generation: current.generation + 1 })
          }
        }
      }
    }
    return map
  })

  const allEvents = computed<TimelineEvent[]>(() => {
    const events: TimelineEvent[] = []
    const people = Object.values(pubData.value.people ?? {})

    for (const person of people) {
      const birthYear = parseYear(person.birth)
      const deathYear = parseYear(person.death)
      const generation = generationMap.value.get(person.id)
      const age = birthYear !== null && deathYear !== null && deathYear >= birthYear ? deathYear - birthYear : undefined

      if (birthYear !== null) {
        events.push({
          person,
          year: birthYear,
          exactDate: parseExactDate(person.birth),
          type: 'birth',
          label: person.birth || `${birthYear}年`,
          centuryStart: Math.floor(birthYear / 100) * 100,
          era: getHistoricalEra(birthYear),
          generation,
        })
      }
      if (deathYear !== null) {
        events.push({
          person,
          year: deathYear,
          exactDate: parseExactDate(person.death),
          type: 'death',
          label: person.death || `${deathYear}年`,
          centuryStart: Math.floor(deathYear / 100) * 100,
          era: getHistoricalEra(deathYear),
          generation,
          ageAtDeath: age,
        })
      }
    }
    return events.sort((a, b) =>
      a.exactDate !== b.exactDate ? a.exactDate - b.exactDate : a.type === 'birth' ? -1 : 1,
    )
  })

  const availableGenerations = computed(() => {
    const generations = new Set<number>()
    for (const event of allEvents.value) {
      if (event.generation !== undefined) generations.add(event.generation)
    }
    return Array.from(generations).sort((a, b) => a - b)
  })

  const filteredEvents = computed(() => {
    const query = searchQuery.value.trim().toLowerCase()
    return allEvents.value.filter(event => {
      if (filterType.value !== 'all' && event.type !== filterType.value) return false
      if (selectedGeneration.value !== null && event.generation !== selectedGeneration.value) return false
      if (query) {
        const matchesName = event.person.name.toLowerCase().includes(query)
        const matchesYear = String(event.year).includes(query)
        const matchesEra = event.era.fullLabel.toLowerCase().includes(query)
        const matchesDetail = event.label.toLowerCase().includes(query)
        if (!matchesName && !matchesYear && !matchesEra && !matchesDetail) return false
      }
      return true
    })
  })

  const centuryGroups = computed(() => {
    const groups = new Map<number, TimelineEvent[]>()
    for (const event of filteredEvents.value) {
      if (!groups.has(event.centuryStart)) groups.set(event.centuryStart, [])
      groups.get(event.centuryStart)?.push(event)
    }
    return Array.from(groups.entries())
      .sort((a, b) => a[0] - b[0])
      .map(([centuryStart, events]) => ({
        centuryStart,
        eraName: events[0]?.era.dynasty ?? '',
        events,
        births: events.filter(event => event.type === 'birth').length,
        deaths: events.filter(event => event.type === 'death').length,
        people: new Set(events.map(event => event.person.id)).size,
      }))
  })

  const lifespanItems = computed<LifespanItem[]>(() => {
    const query = searchQuery.value.trim().toLowerCase()
    const items: LifespanItem[] = []
    for (const person of Object.values(pubData.value.people ?? {})) {
      const birthYear = parseYear(person.birth)
      if (birthYear === null) continue
      const deathYear = parseYear(person.death)
      const generation = generationMap.value.get(person.id)
      const lifespan = deathYear !== null && deathYear >= birthYear ? deathYear - birthYear : null
      if (selectedGeneration.value !== null && generation !== selectedGeneration.value) continue
      if (query) {
        const matchesName = person.name.toLowerCase().includes(query)
        const matchesYear =
          String(birthYear).includes(query) || (deathYear !== null && String(deathYear).includes(query))
        if (!matchesName && !matchesYear) continue
      }
      items.push({ person, generation, birthYear, deathYear, lifespan, era: getHistoricalEra(birthYear) })
    }
    return items.sort((a, b) => a.birthYear - b.birthYear)
  })

  const minYear = computed(() => (allEvents.value.length ? allEvents.value[0].year : 0))
  const maxYear = computed(() => (allEvents.value.length ? allEvents.value[allEvents.value.length - 1].year : 0))
  const earliest = computed(() => (allEvents.value.length ? allEvents.value[0].year : null))
  const latest = computed(() => (allEvents.value.length ? allEvents.value[allEvents.value.length - 1].year : null))
  const span = computed(() => (earliest.value !== null && latest.value !== null ? latest.value - earliest.value : null))
  const totalEvents = computed(() => allEvents.value.length)
  const distinctPeople = computed(() => new Set(allEvents.value.map(event => event.person.id)).size)

  function centuryLabel(centuryStart: number): string {
    if (centuryStart < 0) return `公元前 ${Math.abs(centuryStart)} 年代`
    const century = Math.floor(centuryStart / 100) + 1
    return `公元 ${century} 世纪 (${centuryStart}年代)`
  }

  function getLifespanBarLeft(birthYear: number): number {
    const total = maxYear.value - minYear.value || 1
    return Math.max(0, Math.min(100, ((birthYear - minYear.value) / total) * 100))
  }

  function getLifespanBarWidth(item: LifespanItem): number {
    const total = maxYear.value - minYear.value || 1
    const end = item.deathYear ?? item.birthYear + (item.lifespan ?? 60)
    return Math.max(1.5, Math.min(100, (Math.max(1, end - item.birthYear) / total) * 100))
  }

  return {
    viewMode,
    filterType,
    searchQuery,
    selectedGeneration,
    allEvents,
    availableGenerations,
    filteredEvents,
    centuryGroups,
    lifespanItems,
    minYear,
    maxYear,
    earliest,
    latest,
    span,
    totalEvents,
    distinctPeople,
    centuryLabel,
    getLifespanBarLeft,
    getLifespanBarWidth,
  }
}
