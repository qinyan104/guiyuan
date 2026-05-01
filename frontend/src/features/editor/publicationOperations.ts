import type {
  FamilyUnit,
  FamilyBranchMode,
  Gender,
  Person,
  PublicationData,
  PublicationOperationPayload,
  PublicationOperationResult,
  ValidationIssue,
} from '../../types/family'
import { findFamilyEntryPersonId } from '../../lib/familyBranchMode'
import { suggestLineageNote } from '../../lib/lineageLabels'
import { validatePublicationData } from '../validation/draftSchema'

export type RelationshipAction =
  | { type: 'add-spouse'; personId: string }
  | { type: 'add-child'; personId: string; gender: Gender }
  | { type: 'add-parents'; personId: string }
  | { type: 'focus-branch'; personId: string }
  | { type: 'set-branch-mode'; personId: string; branchMode: FamilyBranchMode }
  | { type: 'swap-partners'; personId: string }
  | { type: 'move-child'; parentPersonId: string; childId: string; direction: -1 | 1 }
  | { type: 'remove-spouse'; personId: string }
  | { type: 'remove-parents'; personId: string }
  | { type: 'delete-person'; personId: string }

export interface DeleteImpactSummary {
  spouseNames: string[]
  parentNames: string[]
  childNames: string[]
  removedFamilyIds: string[]
}

function cloneJson<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T
}

function issue(path: string, message: string): ValidationIssue {
  return {
    code: 'operation-conflict',
    path,
    message,
  }
}

function fail(path: string, message: string): PublicationOperationResult {
  return {
    ok: false,
    issues: [issue(path, message)],
  }
}

function succeed(payload: PublicationOperationPayload): PublicationOperationResult {
  return {
    ok: true,
    value: payload,
  }
}

function listFamilies(publication: PublicationData): FamilyUnit[] {
  return Object.values(publication.families)
}

function isPersonId(value: string | undefined): value is string {
  return typeof value === 'string' && value.length > 0
}

function getPersonName(publication: PublicationData, personId: string): string {
  return publication.people[personId]?.name ?? personId
}

function getNextEntityId(publication: PublicationData, prefix: 'p' | 'f'): string {
  const collection = prefix === 'p' ? Object.keys(publication.people) : Object.keys(publication.families)
  let maxId = 0

  collection.forEach((id) => {
    if (!id.startsWith(prefix)) {
      return
    }

    const numeric = Number(id.slice(1))
    if (Number.isFinite(numeric)) {
      maxId = Math.max(maxId, numeric)
    }
  })

  return `${prefix}${maxId + 1}`
}

function createPerson(publication: PublicationData, input: { name: string; gender: Gender; note?: string }): Person {
  const id = getNextEntityId(publication, 'p')
  const person: Person = {
    id,
    name: input.name,
    gender: input.gender,
    note: input.note,
  }

  publication.people[id] = person
  return person
}

function findAdultFamilyIdForPerson(publication: PublicationData, personId: string): string | undefined {
  return listFamilies(publication).find((family) => family.adults.includes(personId))?.id
}

function findParentFamilyIdForPerson(publication: PublicationData, personId: string): string | undefined {
  return listFamilies(publication).find((family) => family.children.includes(personId))?.id
}

function ensureAdultFamily(publication: PublicationData, personId: string): FamilyUnit {
  const existingFamilyId = findAdultFamilyIdForPerson(publication, personId)
  if (existingFamilyId) {
    return publication.families[existingFamilyId]
  }

  const familyId = getNextEntityId(publication, 'f')
  const family: FamilyUnit = {
    id: familyId,
    adults: [personId],
    children: [],
  }

  publication.families[familyId] = family
  return family
}

function normalizeFamilyMembers(publication: PublicationData, family: FamilyUnit) {
  const normalizedAdults: string[] = []
  family.adults.forEach((adultId) => {
    if (isPersonId(adultId) && publication.people[adultId] && !normalizedAdults.includes(adultId)) {
      normalizedAdults.push(adultId)
    }
  })

  const normalizedChildren: string[] = []
  family.children.forEach((childId) => {
    if (publication.people[childId] && !normalizedAdults.includes(childId) && !normalizedChildren.includes(childId)) {
      normalizedChildren.push(childId)
    }
  })

  family.adults = normalizedAdults
  family.children = normalizedChildren
}

function ensureVisibleFamilyForPerson(publication: PublicationData, personId: string): string | undefined {
  if (!publication.people[personId]) {
    return undefined
  }

  const familyId = findAdultFamilyIdForPerson(publication, personId)
  if (familyId) {
    return familyId
  }

  return ensureAdultFamily(publication, personId).id
}

function pruneFamilies(publication: PublicationData) {
  Object.values(publication.families).forEach((family) => normalizeFamilyMembers(publication, family))

  Object.values(publication.families)
    .filter((family) => family.adults.length === 0)
    .forEach((family) => {
      const orphanChildIds = [...family.children]
      delete publication.families[family.id]

      orphanChildIds.forEach((childId) => {
        ensureVisibleFamilyForPerson(publication, childId)
      })
    })

  Object.values(publication.families).forEach((family) => normalizeFamilyMembers(publication, family))
}

function syncSelectionAndFocus(
  publication: PublicationData,
  input: {
    focusCandidates?: Array<string | undefined>
    selectionCandidates?: Array<string | undefined>
  } = {},
): { focusFamilyId: string; selectedPersonId: string } {
  const focusFamilyId =
    [...(input.focusCandidates ?? []), publication.focusFamilyId, Object.keys(publication.families)[0]].find(
      (familyId): familyId is string => Boolean(familyId && publication.families[familyId]),
    ) ?? ''

  const selectedPersonId =
    [...(input.selectionCandidates ?? []), Object.keys(publication.people)[0]].find(
      (personId): personId is string => Boolean(personId && publication.people[personId]),
    ) ?? ''

  publication.focusFamilyId = focusFamilyId

  return {
    focusFamilyId,
    selectedPersonId,
  }
}

function validateOperationResult(publication: PublicationData): ValidationIssue[] {
  return validatePublicationData(publication)
}

function resolveSpouse(publication: PublicationData, personId: string): Person | null {
  const familyId = findAdultFamilyIdForPerson(publication, personId)
  if (!familyId) {
    return null
  }

  const spouseId = publication.families[familyId].adults.find((adultId) => adultId !== personId)
  return spouseId ? publication.people[spouseId] ?? null : null
}

function resolveChildren(publication: PublicationData, personId: string): Person[] {
  const familyId = findAdultFamilyIdForPerson(publication, personId)
  if (!familyId) {
    return []
  }

  return publication.families[familyId].children
    .map((childId) => publication.people[childId])
    .filter((person): person is Person => Boolean(person))
}

function resolveParents(publication: PublicationData, personId: string): Person[] {
  const familyId = findParentFamilyIdForPerson(publication, personId)
  if (!familyId) {
    return []
  }

  return publication.families[familyId].adults
    .map((adultId) => publication.people[adultId])
    .filter((person): person is Person => Boolean(person))
}

export function summarizeDeleteImpact(publication: PublicationData, personId: string): DeleteImpactSummary | null {
  const person = publication.people[personId]
  if (!person) {
    return null
  }

  const spouseNames = resolveSpouse(publication, personId) ? [resolveSpouse(publication, personId)!.name] : []
  const parentNames = resolveParents(publication, personId).map((parent) => parent.name)
  const childNames = resolveChildren(publication, personId).map((child) => child.name)

  const nextPublication = cloneJson(publication)
  Object.values(nextPublication.families).forEach((family) => {
    family.adults = family.adults.filter((adultId) => adultId !== personId)
    family.children = family.children.filter((childId) => childId !== personId)
  })
  delete nextPublication.people[personId]

  const beforeFamilyIds = new Set(Object.keys(publication.families))
  pruneFamilies(nextPublication)
  const afterFamilyIds = new Set(Object.keys(nextPublication.families))
  const removedFamilyIds = [...beforeFamilyIds].filter((familyId) => !afterFamilyIds.has(familyId))

  return {
    spouseNames,
    parentNames,
    childNames,
    removedFamilyIds,
  }
}

export function applyRelationshipAction(publication: PublicationData, action: RelationshipAction): PublicationOperationResult {
  const nextPublication = cloneJson(publication)
  const publicationIssues = validatePublicationData(nextPublication)
  if (publicationIssues.length > 0) {
    return {
      ok: false,
      issues: publicationIssues,
    }
  }

  const hasPersonId = 'personId' in action
  const primaryPersonId = hasPersonId ? action.personId : action.parentPersonId
  const primaryPerson = nextPublication.people[primaryPersonId]

  if (!primaryPerson) {
    return fail('personId', '目标人物不存在。')
  }

  let focusCandidates: Array<string | undefined> = []
  let selectionCandidates: Array<string | undefined> = []
  let historyLabel = ''

  switch (action.type) {
    case 'add-spouse': {
      const family = ensureAdultFamily(nextPublication, action.personId)
      if (family.adults.filter(isPersonId).length >= 2) {
        return fail('personId', `${primaryPerson.name} 已有配偶关系。`)
      }

      const spouseGender: Gender =
        primaryPerson.gender === 'male' ? 'female' : primaryPerson.gender === 'female' ? 'male' : 'unknown'
      const spouse = createPerson(nextPublication, {
        name: '待命名配偶',
        gender: spouseGender,
        note: '配偶',
      })

      family.adults = [action.personId, spouse.id]
      selectionCandidates = [spouse.id]
      historyLabel = `新增配偶 · ${primaryPerson.name}`
      break
    }

    case 'add-child': {
      const family = ensureAdultFamily(nextPublication, action.personId)
      const isDaughter = action.gender === 'female'
      const child = createPerson(nextPublication, {
        name: isDaughter ? '待命名女儿' : '待命名儿子',
        gender: action.gender,
      })

      family.children = [...family.children, child.id]
      child.note = suggestLineageNote(nextPublication, child.id) || (isDaughter ? '女儿' : '儿子')
      if (primaryPerson.gender === 'female') {
        focusCandidates = [family.id]
      }
      selectionCandidates = [child.id]
      historyLabel = `${isDaughter ? '新增女儿' : '新增儿子'} · ${primaryPerson.name}`
      break
    }

    case 'add-parents': {
      const parentFamilyId = findParentFamilyIdForPerson(nextPublication, action.personId)
      if (!parentFamilyId) {
        const father = createPerson(nextPublication, { name: '待命名父亲', gender: 'male', note: '父亲' })
        const mother = createPerson(nextPublication, { name: '待命名母亲', gender: 'female', note: '母亲' })
        const familyId = getNextEntityId(nextPublication, 'f')

        nextPublication.families[familyId] = {
          id: familyId,
          adults: [father.id, mother.id],
          children: [action.personId],
        }
        focusCandidates = [familyId]
        selectionCandidates = [father.id]
        historyLabel = `新增父母 · ${primaryPerson.name}`
        break
      }

      const family = nextPublication.families[parentFamilyId]
      const existingParentIds = family.adults.filter(isPersonId)
      if (existingParentIds.length >= 2) {
        return fail('personId', `${primaryPerson.name} 已有完整父母关系。`)
      }

      if (existingParentIds.length === 0) {
        const father = createPerson(nextPublication, { name: '待命名父亲', gender: 'male', note: '父亲' })
        const mother = createPerson(nextPublication, { name: '待命名母亲', gender: 'female', note: '母亲' })
        family.adults = [father.id, mother.id]
        focusCandidates = [family.id]
        selectionCandidates = [father.id]
        historyLabel = `新增父母 · ${primaryPerson.name}`
        break
      }

      const existingParent = nextPublication.people[existingParentIds[0]]
      const parentGender: Gender =
        existingParent?.gender === 'male' ? 'female' : existingParent?.gender === 'female' ? 'male' : 'unknown'
      const parent = createPerson(nextPublication, {
        name: parentGender === 'male' ? '待命名父亲' : parentGender === 'female' ? '待命名母亲' : '待命名父母',
        gender: parentGender,
        note: parentGender === 'male' ? '父亲' : parentGender === 'female' ? '母亲' : '父母',
      })

      family.adults = parentGender === 'male' ? [parent.id, ...existingParentIds] : [...existingParentIds, parent.id]
      focusCandidates = [family.id]
      selectionCandidates = [parent.id]
      historyLabel = `新增父母 · ${primaryPerson.name}`
      break
    }

    case 'focus-branch': {
      const family = ensureAdultFamily(nextPublication, action.personId)
      if (family.adults[0] !== action.personId) {
        family.adults = [action.personId, ...family.adults.filter((adultId) => adultId !== action.personId)]
      }

      focusCandidates = [family.id]
      selectionCandidates = [action.personId]
      historyLabel = `设为当前宗支 · ${primaryPerson.name}`
      break
    }

    case 'set-branch-mode': {
      const familyId = findAdultFamilyIdForPerson(nextPublication, action.personId)
      if (!familyId) {
        return fail('personId', `${primaryPerson.name} 暂无可设置的婚配归属。`)
      }

      const entryPersonId = findFamilyEntryPersonId(nextPublication, familyId)
      const entryPerson = entryPersonId ? nextPublication.people[entryPersonId] : null
      if (!entryPerson || entryPerson.gender !== 'female') {
        return fail('personId', '只有女性承支家庭需要区分外嫁或招婿。')
      }

      nextPublication.families[familyId].branchMode = action.branchMode
      focusCandidates = [familyId]
      selectionCandidates = [action.personId]
      historyLabel = `${action.branchMode === 'uxorilocal' ? '设为招婿支' : '设为外嫁支'} · ${entryPerson.name}`
      break
    }

    case 'swap-partners': {
      const familyId = findAdultFamilyIdForPerson(nextPublication, action.personId)
      if (!familyId) {
        return fail('personId', `${primaryPerson.name} 暂无可切换的配偶关系。`)
      }

      const family = nextPublication.families[familyId]
      if (family.adults.filter(isPersonId).length < 2) {
        return fail('personId', `${primaryPerson.name} 暂无可切换的配偶关系。`)
      }

      family.adults = [...family.adults].reverse()
      selectionCandidates = [action.personId]
      focusCandidates = [family.id]
      historyLabel = '切换夫妻位置'
      break
    }

    case 'move-child': {
      const familyId = findAdultFamilyIdForPerson(nextPublication, action.parentPersonId)
      if (!familyId) {
        return fail('parentPersonId', `${primaryPerson.name} 暂无子女排序可调整。`)
      }

      const family = nextPublication.families[familyId]
      const currentIndex = family.children.indexOf(action.childId)
      const nextIndex = currentIndex + action.direction
      if (currentIndex < 0 || nextIndex < 0 || nextIndex >= family.children.length) {
        return fail('childId', '子女顺序调整目标无效。')
      }

      const nextChildren = [...family.children]
      ;[nextChildren[currentIndex], nextChildren[nextIndex]] = [nextChildren[nextIndex], nextChildren[currentIndex]]
      family.children = nextChildren
      selectionCandidates = [action.parentPersonId]
      focusCandidates = [family.id]
      historyLabel = `调整子女顺序 · ${getPersonName(nextPublication, action.childId)}`
      break
    }

    case 'remove-spouse': {
      const familyId = findAdultFamilyIdForPerson(nextPublication, action.personId)
      if (!familyId) {
        return fail('personId', `${primaryPerson.name} 当前没有配偶关系。`)
      }

      const family = nextPublication.families[familyId]
      const spouseId = family.adults.find((adultId) => adultId !== action.personId)
      if (!spouseId) {
        return fail('personId', `${primaryPerson.name} 当前没有配偶关系。`)
      }

      family.adults = family.adults.filter((adultId) => adultId !== spouseId)
      ensureVisibleFamilyForPerson(nextPublication, spouseId)
      pruneFamilies(nextPublication)
      focusCandidates = [nextPublication.focusFamilyId, family.id]
      selectionCandidates = [action.personId, spouseId]
      historyLabel = `解除配偶关系 · ${primaryPerson.name}`
      break
    }

    case 'remove-parents': {
      const familyId = findParentFamilyIdForPerson(nextPublication, action.personId)
      if (!familyId) {
        return fail('personId', `${primaryPerson.name} 当前没有父母关系。`)
      }

      const family = nextPublication.families[familyId]
      family.children = family.children.filter((childId) => childId !== action.personId)
      const ownFamilyId = ensureVisibleFamilyForPerson(nextPublication, action.personId)
      pruneFamilies(nextPublication)
      focusCandidates = [ownFamilyId, nextPublication.focusFamilyId, family.id]
      selectionCandidates = [action.personId]
      historyLabel = `解除父母关系 · ${primaryPerson.name}`
      break
    }

    case 'delete-person': {
      const spouseId = resolveSpouse(nextPublication, action.personId)?.id
      const childIds = resolveChildren(nextPublication, action.personId).map((child) => child.id)
      const parentIds = resolveParents(nextPublication, action.personId).map((parent) => parent.id)
      const adultFamilyId = findAdultFamilyIdForPerson(nextPublication, action.personId)
      const parentFamilyId = findParentFamilyIdForPerson(nextPublication, action.personId)

      Object.values(nextPublication.families).forEach((family) => {
        family.adults = family.adults.filter((adultId) => adultId !== action.personId)
        family.children = family.children.filter((childId) => childId !== action.personId)
      })
      delete nextPublication.people[action.personId]

      pruneFamilies(nextPublication)

      const childBranchFamilyIds = childIds.map((childId) => findAdultFamilyIdForPerson(nextPublication, childId))
      focusCandidates = [nextPublication.focusFamilyId, adultFamilyId, ...childBranchFamilyIds, parentFamilyId]
      selectionCandidates = [spouseId, ...childIds, ...parentIds]
      historyLabel = `删除人物 · ${primaryPerson.name}`
      break
    }
  }

  const nextSelection = syncSelectionAndFocus(nextPublication, {
    focusCandidates,
    selectionCandidates,
  })

  const issues = validateOperationResult(nextPublication)
  if (issues.length > 0) {
    return {
      ok: false,
      issues,
    }
  }

  return succeed({
    publication: nextPublication,
    selectedPersonId: nextSelection.selectedPersonId,
    focusFamilyId: nextSelection.focusFamilyId,
    historyLabel,
  })
}
