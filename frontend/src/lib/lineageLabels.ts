import type { Gender, PublicationData } from '../types/family'
import { resolveFamilyBranchMode } from './familyBranchMode'

interface LineageEntry {
  personId: string
  depth: number
  external: boolean
}

interface FamilyIndexes {
  adultToFamily: Map<string, string>
  childToFamily: Map<string, string>
}

const ORDINAL_LABELS = ['长', '次', '三', '四', '五', '六', '七', '八', '九', '十']

function isPersonId(value: string | undefined): value is string {
  return typeof value === 'string' && value.length > 0
}

function buildFamilyIndexes(publication: PublicationData): FamilyIndexes {
  const adultToFamily = new Map<string, string>()
  const childToFamily = new Map<string, string>()

  for (const family of Object.values(publication.families)) {
    for (const adultId of family.adults) {
      if (!adultToFamily.has(adultId)) adultToFamily.set(adultId, family.id)
    }
    for (const childId of family.children) {
      if (!childToFamily.has(childId)) childToFamily.set(childId, family.id)
    }
  }

  return { adultToFamily, childToFamily }
}

function findAdultFamilyIdForPerson(indexes: FamilyIndexes, personId: string): string | undefined {
  return indexes.adultToFamily.get(personId)
}

function findParentFamilyIdForPerson(indexes: FamilyIndexes, personId: string): string | undefined {
  return indexes.childToFamily.get(personId)
}

function getOrdinalLabel(index: number): string {
  if (index < ORDINAL_LABELS.length) {
    return ORDINAL_LABELS[index]
  }

  return `第${index + 1}`
}

function getDirectChildLabel(gender: Gender, ordinal: string): string {
  if (gender === 'female') {
    return `${ordinal}女`
  }

  if (gender === 'male') {
    return `${ordinal}子`
  }

  return `${ordinal}子女`
}

function getGenerationLabel(depth: number, gender: Gender, ordinal: string, external: boolean): string {
  const prefix = external ? '外' : ''

  if (depth === 2) {
    return getDirectChildLabel(gender, ordinal)
  }

  if (depth === 3) {
    if (gender === 'female') {
      return `${prefix}${ordinal}孙女`
    }

    if (gender === 'male') {
      return `${prefix}${ordinal}孙`
    }

    return `${prefix}${ordinal}孙辈`
  }

  if (depth === 4) {
    return `${prefix}${gender === 'female' ? '曾孙女' : '曾孙'}`
  }

  if (depth === 5) {
    return `${prefix}${gender === 'female' ? '玄孙女' : '玄孙'}`
  }

  if (depth > 5) {
    return `${prefix}第${depth}世`
  }

  return ''
}

function buildLineageEntries(publication: PublicationData, indexes: FamilyIndexes): LineageEntry[] {
  const focusFamily = publication.families[publication.focusFamilyId] ?? Object.values(publication.families)[0]
  if (!focusFamily) {
    return []
  }

  const entries: LineageEntry[] = []
  const visitedPersonIds = new Set<string>()
  const visitedFamilyIds = new Set<string>([focusFamily.id])

  function appendPerson(personId: string, depth: number, external: boolean) {
    if (visitedPersonIds.has(personId) || !publication.people[personId]) {
      return
    }

    visitedPersonIds.add(personId)
    entries.push({ personId, depth, external })
  }

  focusFamily.adults.filter(isPersonId).forEach(adultId => {
    appendPerson(adultId, 1, false)
  })

  function visitChildren(familyId: string, childDepth: number, external: boolean) {
    const family = publication.families[familyId]
    if (!family) {
      return
    }

    family.children.forEach(childId => {
      const child = publication.people[childId]
      if (!child) {
        return
      }

      appendPerson(childId, childDepth, external)

      const childFamilyId = findAdultFamilyIdForPerson(indexes, childId)
      if (!childFamilyId || visitedFamilyIds.has(childFamilyId)) {
        return
      }

      visitedFamilyIds.add(childFamilyId)

      const nextExternal = external || resolveFamilyBranchMode(publication, childFamilyId) === 'married-out'
      visitChildren(childFamilyId, childDepth + 1, nextExternal)
    })
  }

  visitChildren(focusFamily.id, 2, false)
  return entries
}

function getOrdinalWithinLineage(publication: PublicationData, entries: LineageEntry[], target: LineageEntry): string {
  const person = publication.people[target.personId]
  if (!person) {
    return ''
  }

  const matchingEntries = entries.filter(entry => {
    const entryPerson = publication.people[entry.personId]
    return entry.depth === target.depth && entry.external === target.external && entryPerson?.gender === person.gender
  })

  const index = matchingEntries.findIndex(entry => entry.personId === target.personId)
  return getOrdinalLabel(Math.max(0, index))
}

function getFallbackChildSuggestion(publication: PublicationData, indexes: FamilyIndexes, personId: string): string {
  const person = publication.people[personId]
  const parentFamilyId = findParentFamilyIdForPerson(indexes, personId)
  if (!person || !parentFamilyId) {
    return ''
  }

  const family = publication.families[parentFamilyId]
  const sameGenderChildren = family.children.filter(childId => publication.people[childId]?.gender === person.gender)
  const index = sameGenderChildren.indexOf(personId)
  return getDirectChildLabel(person.gender, getOrdinalLabel(Math.max(0, index)))
}

export function suggestLineageNote(publication: PublicationData, personId: string): string {
  const person = publication.people[personId]
  if (!person) {
    return ''
  }

  const indexes = buildFamilyIndexes(publication)
  const entries = buildLineageEntries(publication, indexes)
  const target = entries.find(entry => entry.personId === personId)
  if (!target) {
    return getFallbackChildSuggestion(publication, indexes, personId)
  }

  const ordinal = getOrdinalWithinLineage(publication, entries, target)
  return getGenerationLabel(target.depth, person.gender, ordinal, target.external)
}
