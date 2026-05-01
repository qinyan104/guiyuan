import type { FamilyBranchMode, FamilyUnit, PublicationData } from '../types/family'

export function isPersonId(value: string | undefined): value is string {
  return typeof value === 'string' && value.length > 0
}

function listFamilies(publication: PublicationData): FamilyUnit[] {
  return Object.values(publication.families)
}

function findParentFamilyIdForPerson(publication: PublicationData, personId: string): string | undefined {
  return listFamilies(publication).find((family) => family.children.includes(personId))?.id
}

export function findFamilyEntryPersonId(publication: PublicationData, familyId: string): string | undefined {
  const family = publication.families[familyId]
  if (!family) {
    return undefined
  }

  return family.adults.find((adultId) => isPersonId(adultId) && Boolean(findParentFamilyIdForPerson(publication, adultId)))
}

export function resolveFamilyBranchMode(publication: PublicationData, familyId: string): FamilyBranchMode | undefined {
  const family = publication.families[familyId]
  if (!family) {
    return undefined
  }

  if (family.branchMode) {
    return family.branchMode
  }

  const entryPersonId = findFamilyEntryPersonId(publication, familyId)
  if (!entryPersonId) {
    return undefined
  }

  return publication.people[entryPersonId]?.gender === 'female' ? 'married-out' : undefined
}
