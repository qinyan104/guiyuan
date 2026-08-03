import type { FamilyUnit, Person, PublicationData } from '../../types/family'

type PersonWithDbId = Person & { dbId?: number }

export interface BranchMergePreview {
  publication: PublicationData
  targetPerson: Person
  addedPeople: number
  addedFamilies: number
  blockers: string[]
  warnings: string[]
}

const isFederatedId = (id: string) => id.startsWith('branch_')

export function buildBranchMergePreview(
  master: PublicationData,
  mountPersonId: string,
  target: PublicationData,
  targetPublicationId: number,
  targetRootDbId: number,
): BranchMergePreview | null {
  const mountPerson = master.people[mountPersonId]
  const rootEntry = Object.entries(target.people).find(
    ([id, person]) => !isFederatedId(id) && (person as PersonWithDbId).dbId === targetRootDbId,
  )
  if (!mountPerson || !rootEntry) return null

  const [rootPersonId, targetPerson] = rootEntry
  const localPeople = Object.fromEntries(
    Object.entries(master.people)
      .filter(([id]) => !isFederatedId(id))
      .map(([id, person]) => [id, { ...person }]),
  )
  const localFamilies = Object.fromEntries(
    Object.entries(master.families)
      .filter(([id]) => !isFederatedId(id))
      .map(([id, family]) => [id, { ...family, adults: [...family.adults], children: [...family.children] }]),
  )
  localPeople[mountPersonId] = { ...localPeople[mountPersonId], isMountPoint: false, mountPointTarget: undefined }

  const targetFamilies = Object.values(target.families).filter((family) => !isFederatedId(family.id))
  const adultFamilies = new Map<string, FamilyUnit[]>()
  for (const family of targetFamilies) {
    for (const adultId of family.adults) {
      const families = adultFamilies.get(adultId) ?? []
      families.push(family)
      adultFamilies.set(adultId, families)
    }
  }

  const includedPeople = new Set([rootPersonId])
  const includedFamilies = new Set<string>()
  const queue = [rootPersonId]
  while (queue.length) {
    const personId = queue.shift()!
    for (const family of adultFamilies.get(personId) ?? []) {
      if (includedFamilies.has(family.id)) continue
      includedFamilies.add(family.id)
      family.adults.forEach((id) => includedPeople.add(id))
      for (const childId of family.children) {
        if (!includedPeople.has(childId)) {
          includedPeople.add(childId)
          queue.push(childId)
        }
      }
    }
  }

  const blockers: string[] = []
  const warnings: string[] = []
  if (mountPerson.name.trim() !== targetPerson.name.trim()) {
    blockers.push(`姓名不一致：主谱“${mountPerson.name}”，目标谱“${targetPerson.name}”`)
  }
  if (targetPerson.isMountPoint) {
    blockers.push('目标合并人物本身仍是挂载点，请先处理其挂载关系')
  }
  if ([...includedPeople].some((id) => id !== rootPersonId && target.people[id]?.isMountPoint)) {
    blockers.push('合并范围内包含嵌套挂载点，请先处理其挂载关系')
  }
  if (mountPerson.gender !== 'unknown' && targetPerson.gender !== 'unknown' && mountPerson.gender !== targetPerson.gender) {
    warnings.push('两位人物的性别记录不一致')
  }
  for (const [label, left, right] of [
    ['生年', mountPerson.birth, targetPerson.birth],
    ['卒年', mountPerson.death, targetPerson.death],
  ] as const) {
    if (left?.trim() && right?.trim() && left.trim() !== right.trim()) {
      warnings.push(`${label}记录不一致：${left} / ${right}`)
    }
  }
  const masterHasAdultFamily = Object.values(localFamilies).some((family) => family.adults.includes(mountPersonId))
  const targetHasAdultFamily = targetFamilies.some(
    (family) => includedFamilies.has(family.id) && family.adults.includes(rootPersonId),
  )
  if (masterHasAdultFamily && targetHasAdultFamily) {
    blockers.push('两位人物都已有下游家庭，暂不支持自动合并')
  }

  // ponytail: preview mirrors the backend's stable merge prefix; move this to a preview API if merge rules grow.
  const prefix = `merged_${targetPublicationId}_`
  const mappedPersonIds = new Map<string, string>([[rootPersonId, mountPersonId]])
  let addedPeople = 0
  for (const personId of includedPeople) {
    if (personId === rootPersonId) continue
    const person = target.people[personId]
    if (!person) continue
    const mergedId = `${prefix}${personId}`
    mappedPersonIds.set(personId, mergedId)
    if (localPeople[mergedId]) {
      blockers.push(`人物编号冲突：${person.name}`)
      continue
    }
    localPeople[mergedId] = { ...person, id: mergedId }
    addedPeople++
  }

  let addedFamilies = 0
  for (const family of targetFamilies) {
    if (!includedFamilies.has(family.id)) continue
    const mergedId = `${prefix}${family.id}`
    if (localFamilies[mergedId]) {
      blockers.push(`家庭编号冲突：${family.id}`)
      continue
    }
    localFamilies[mergedId] = {
      ...family,
      id: mergedId,
      adults: family.adults.map((id) => mappedPersonIds.get(id)).filter((id): id is string => Boolean(id)),
      children: family.children.map((id) => mappedPersonIds.get(id)).filter((id): id is string => Boolean(id)),
    }
    addedFamilies++
  }

  return {
    publication: { ...master, people: localPeople, families: localFamilies },
    targetPerson,
    addedPeople,
    addedFamilies,
    blockers: [...new Set(blockers)],
    warnings,
  }
}
