import { computed, markRaw, reactive, ref } from 'vue'

import type {
  FamilyBranchMode,
  FamilyUnit,
  Gender,
  Person,
  PublicationData,
  PublicationSettings,
} from '../types/family'
import { findFamilyEntryPersonId, resolveFamilyBranchMode } from '../lib/familyBranchMode'
import { layoutPublication } from '../lib/layout'
import { resolveKinshipTerm, getKinshipLabel } from '../lib/kinship'
import { suggestLineageNote } from '../lib/lineageLabels'
import { getPersonStatusLabel, isPersonDeceased } from '../lib/personStatus'

function joinMetaParts(parts: Array<string | undefined>): string {
  return parts.filter((value): value is string => Boolean(value?.trim())).join(' · ')
}

export function usePublicationState(
  initialPublication: PublicationData,
  initialSettings: PublicationSettings,
  viewerPersonId?: string | null,
) {
  const _viewerPersonId = ref<string | null>(viewerPersonId ?? null)

  function freezePeople(pub: PublicationData): void {
    for (const id of Object.keys(pub.people)) {
      pub.people[id] = markRaw(pub.people[id] as object) as typeof pub.people[string]
    }
  }

  const cloned = structuredClone(initialPublication)
  freezePeople(cloned)
  const publication = reactive<PublicationData>(cloned)
  const settings = reactive<PublicationSettings>(structuredClone(initialSettings))
  const selectedPersonId = ref(
    publication.families[publication.focusFamilyId]?.adults[0] ?? Object.keys(publication.people)[0] ?? '',
  )
  const hoveredPersonId = ref<string | null>(null)

  function replaceReactiveObject<T extends object>(target: T, source: T) {
    Object.keys(target).forEach((key) => {
      delete (target as Record<string, unknown>)[key]
    })
    if ('people' in source) {
      freezePeople(source as unknown as PublicationData)
    }
    Object.assign(target, source)
  }

  function listFamilies(): FamilyUnit[] {
    return Object.values(publication.families)
  }

  function isPersonId(value: string | undefined): value is string {
    return typeof value === 'string' && value.length > 0
  }

  function findAdultFamilyIdForPerson(personId: string): string | undefined {
    return listFamilies().find((family) => family.adults.includes(personId))?.id
  }

  function findParentFamilyIdForPerson(personId: string): string | undefined {
    return listFamilies().find((family) => family.children.includes(personId))?.id
  }

  function getPersonStatus(person: Person | null): string {
    if (!person) return '未选择'
    return getPersonStatusLabel(person)
  }

  function getGenderLabel(gender: Gender): string {
    if (gender === 'male') return '男'
    if (gender === 'female') return '女'
    return '未定'
  }

  function setHoveredPerson(personId: string | null) {
    hoveredPersonId.value = personId
  }

  function getDefaultSelectedPersonId(sourcePublication: PublicationData): string {
    return sourcePublication.families[sourcePublication.focusFamilyId]?.adults[0] ?? Object.keys(sourcePublication.people)[0] ?? ''
  }

  // Core computeds
  const peopleList = computed(() => Object.values(publication.people))
  const totalPeople = computed(() => peopleList.value.length)
  const selectedPerson = computed(() => publication.people[selectedPersonId.value] ?? null)
  const layout = computed(() => layoutPublication(publication, settings))
  const relationshipToSelected = computed(() => {
    const selected = selectedPersonId.value
    const hovered = hoveredPersonId.value
    if (!selected || !hovered || selected === hovered) return null
    return resolveKinshipTerm(publication, selected, hovered)
  })
  const aliveCount = computed(() => peopleList.value.filter((person) => !isPersonDeceased(person)).length)
  const deceasedCount = computed(() => totalPeople.value - aliveCount.value)

  // Family computeds
  const selectedAdultFamily = computed(() => {
    const person = selectedPerson.value
    if (!person) return null
    const familyId = findAdultFamilyIdForPerson(person.id)
    return familyId ? publication.families[familyId] : null
  })

  const selectedParentFamily = computed(() => {
    const person = selectedPerson.value
    if (!person) return null
    const familyId = findParentFamilyIdForPerson(person.id)
    return familyId ? publication.families[familyId] : null
  })

  const selectedSpouse = computed(() => {
    const person = selectedPerson.value
    const family = selectedAdultFamily.value
    if (!person || !family) return null
    const spouseId = family.adults.find((adultId) => adultId && adultId !== person.id)
    return spouseId ? publication.people[spouseId] ?? null : null
  })

  const selectedChildren = computed(() => {
    const family = selectedAdultFamily.value
    if (!family) return []
    return family.children
      .map((childId) => publication.people[childId])
      .filter((person): person is Person => Boolean(person))
  })

  const selectedParents = computed(() => {
    const family = selectedParentFamily.value
    if (!family) return []
    return family.adults
      .map((adultId) => (adultId ? publication.people[adultId] : null))
      .filter((person): person is Person => Boolean(person))
  })

  // Branch computeds
  const selectedBranchEntryPerson = computed(() => {
    const family = selectedAdultFamily.value
    if (!family) return null
    const entryPersonId = findFamilyEntryPersonId(publication, family.id)
    return entryPersonId ? publication.people[entryPersonId] ?? null : null
  })

  const selectedBranchMode = computed<FamilyBranchMode | ''>(() => {
    const family = selectedAdultFamily.value
    if (!family) return ''
    return resolveFamilyBranchMode(publication, family.id) ?? ''
  })

  const canSetSelectedBranchMode = computed(() =>
    Boolean(selectedBranchEntryPerson.value?.gender === 'female' && selectedAdultFamily.value),
  )

  const selectedOutMarriedDaughter = computed(() => {
    const person = selectedPerson.value
    const family = selectedAdultFamily.value
    if (!person || person.gender !== 'female' || !family) return null
    const hasParentFamily = Boolean(findParentFamilyIdForPerson(person.id))
    const hasSpouse = family.adults.filter(isPersonId).length > 1
    return hasParentFamily && hasSpouse && selectedBranchMode.value === 'married-out' ? person : null
  })

  const selectedInLawOfOutMarriedDaughter = computed(() => {
    const spouse = selectedSpouse.value
    if (!spouse || spouse.gender !== 'female') return null
    return findParentFamilyIdForPerson(spouse.id) && selectedBranchMode.value === 'married-out' ? spouse : null
  })

  const canAddSpouse = computed(() => {
    const family = selectedAdultFamily.value
    if (!family) return true
    return family.adults.filter(isPersonId).length < 2
  })

  const parentActionLabel = computed(() => {
    const parentCount = selectedParents.value.length
    if (parentCount === 0) return '新增父母'
    if (parentCount === 1) return '补全父母'
    return '已有完整父母'
  })

  const hasCompleteParents = computed(() => selectedParents.value.length >= 2)

  const selectedChildItems = computed(() =>
    selectedChildren.value.map((person, index, list) => ({
      person,
      index,
      isFirst: index === 0,
      isLast: index === list.length - 1,
    })),
  )

  const selectedPersonLineageSuggestion = computed(() => {
    const person = selectedPerson.value
    if (!person) return ''
    return suggestLineageNote(publication, person.id)
  })

  const selectedPersonMeta = computed(() => {
    const person = selectedPerson.value
    if (!person) return '未选择人物'
    const identityMeta =
      joinMetaParts([
        person.titleName,
        person.clan,
        person.note || selectedPersonLineageSuggestion.value || getGenderLabel(person.gender),
      ]) || getGenderLabel(person.gender)
    const parts = [
      identityMeta,
      selectedSpouse.value ? `配偶 ${selectedSpouse.value.name}` : '未建配偶',
      `${selectedChildren.value.length} 位子女`,
    ]
    return parts.join(' · ')
  })

  const canSwapAdults = computed(() => {
    const family = selectedAdultFamily.value
    return Boolean(family && family.adults.filter(isPersonId).length > 1)
  })

  // Root / branch
  const rootFamilyId = computed(() => Object.keys(publication.families)[0] ?? '')
  const isRootFamilyFocused = computed(() =>
    Boolean(rootFamilyId.value && publication.focusFamilyId === rootFamilyId.value),
  )

  const isSelectedBranchFocused = computed(() => {
    const person = selectedPerson.value
    if (!person) return false
    const familyId = findAdultFamilyIdForPerson(person.id)
    return Boolean(familyId && familyId === publication.focusFamilyId)
  })

  const branchActionLabel = computed(() =>
    isSelectedBranchFocused.value ? '已是当前宗支' : '设为当前宗支',
  )

  const kinshipNotes = computed(() => {
    if (!_viewerPersonId.value) return null as Record<string, string> | null
    const map: Record<string, string> = {}
    for (const pid of Object.keys(publication.people)) {
      if (pid === _viewerPersonId.value) {
        map[pid] = '本人'
      } else {
        const label = getKinshipLabel(publication, _viewerPersonId.value, pid)
        if (label && label !== '未知关系') {
          map[pid] = label
        }
      }
    }
    return map
  })

  // Focus family
  const focusFamily = computed(() =>
    publication.families[publication.focusFamilyId] ?? Object.values(publication.families)[0],
  )

  const focusFamilyLabel = computed(() => {
    const adults = focusFamily.value?.adults.filter(isPersonId) ?? []
    return adults.map((adultId) => publication.people[adultId]?.name ?? adultId).join(' · ') || '未设置宗支'
  })

  const focusLineageCrumbs = computed(() => {
    const family = focusFamily.value
    if (!family) return ['未设置宗支']
    const branchMode = resolveFamilyBranchMode(publication, family.id)
    const rootFamId = Object.keys(publication.families)[0]
    const scopeLabel =
      branchMode === 'married-out'
        ? '外嫁支系'
        : branchMode === 'uxorilocal'
          ? '招婿承支'
          : family.id === rootFamId
            ? '父系主谱'
            : '父系分支'
    return [scopeLabel, focusFamilyLabel.value]
  })

  function setViewerPersonId(id: string | null) {
    _viewerPersonId.value = id
  }

  return {
    // State
    publication,
    settings,
    selectedPersonId,
    hoveredPersonId,
    // Helpers
    replaceReactiveObject,
    isPersonId,
    findAdultFamilyIdForPerson,
    findParentFamilyIdForPerson,
    getPersonStatus,
    getGenderLabel,
    getDefaultSelectedPersonId,
    setHoveredPerson,
    // Core computeds
    peopleList,
    totalPeople,
    selectedPerson,
    layout,
    relationshipToSelected,
    aliveCount,
    deceasedCount,
    // Family computeds
    selectedAdultFamily,
    selectedParentFamily,
    selectedSpouse,
    selectedChildren,
    selectedParents,
    // Branch computeds
    selectedBranchEntryPerson,
    selectedBranchMode,
    canSetSelectedBranchMode,
    selectedOutMarriedDaughter,
    selectedInLawOfOutMarriedDaughter,
    canAddSpouse,
    parentActionLabel,
    hasCompleteParents,
    selectedChildItems,
    selectedPersonLineageSuggestion,
    kinshipNotes,
    setViewerPersonId,
    viewerPersonId: _viewerPersonId,
    selectedPersonMeta,
    canSwapAdults,
    // Root/branch
    rootFamilyId,
    isRootFamilyFocused,
    isSelectedBranchFocused,
    branchActionLabel,
    // Focus family
    focusFamily,
    focusFamilyLabel,
    focusLineageCrumbs,

  }

}



export type PublicationState = ReturnType<typeof usePublicationState>


export type PublicationStateReturn = ReturnType<typeof usePublicationState>
