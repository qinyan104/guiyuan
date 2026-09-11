import { findFamilyEntryPersonId, resolveFamilyBranchMode } from '../../lib/familyBranchMode'
import type { FamilyBranchMode, Person, PublicationData } from '../../types/family'

interface LineageNode {
  personId: string
  generation: number
}

interface ChildReference {
  personId: string
  branchMode?: FamilyBranchMode
  mainLine: boolean
}

const CHINESE_DIGITS = ['零', '一', '二', '三', '四', '五', '六', '七', '八', '九']
const CHINESE_UNITS = ['', '十', '百', '千']
const CHINESE_YEAR_DIGITS = ['〇', '一', '二', '三', '四', '五', '六', '七', '八', '九']

function chineseNumber(value: number): string {
  if (value < 1) return String(value)
  const digits: string[] = []
  let remaining = value
  let unit = 0
  let zeroPending = false

  while (remaining > 0) {
    const digit = remaining % 10
    if (digit === 0) {
      if (digits.length > 0) zeroPending = true
    } else {
      if (zeroPending) digits.unshift('零')
      const omitOne = digit === 1 && unit === 1 && remaining === digit
      digits.unshift(`${omitOne ? '' : CHINESE_DIGITS[digit]}${CHINESE_UNITS[unit] || ''}`)
      zeroPending = false
    }
    remaining = Math.floor(remaining / 10)
    unit += 1
  }

  return digits.join('')
}

function chineseYear(value: string): string {
  return value
    .split('')
    .map(digit => CHINESE_YEAR_DIGITS[Number(digit)] || digit)
    .join('')
}

function genealogyDate(value: string): string {
  const clean = markdownText(value)
  const dateParts = clean.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/)
  if (dateParts)
    return `${chineseYear(dateParts[1])}年${chineseNumber(Number(dateParts[2]))}月${chineseNumber(Number(dateParts[3]))}日`
  return clean.replace(/\d{4}(?=年)/g, chineseYear).replace(/\d+(?=[月日])/g, part => chineseNumber(Number(part)))
}

function genealogyAge(value: string): string {
  const clean = markdownText(value)
  const age = clean.match(/^(\d+)(岁)?$/)
  return age ? `${chineseNumber(Number(age[1]))}${age[2] || ''}` : clean
}

function markdownText(value: string): string {
  return value
    .trim()
    .replace(/[\r\n]+/g, ' ')
    .replace(/\\/g, '\\\\')
    .replace(/([#*_`[\]])/g, '\\$1')
}

function personName(person?: Person): string {
  return markdownText(person?.name || '未命名')
}

function recordName(person: Person): string {
  const name = personName(person)
  if (person.gender === 'male') return `${name}公`
  if (person.gender === 'female' && !name.endsWith('氏')) return `${name}氏`
  return name
}

function spouseName(person: Person): string {
  const name = personName(person)
  if (person.gender === 'female' && !name.endsWith('氏')) return `${name}氏`
  if (person.gender === 'male') return `${name}公`
  return name
}

function isMainLineChild(adults: string[], personId: string, branchMode?: FamilyBranchMode): boolean {
  const adultIndex = adults.indexOf(personId)
  if (adultIndex === 0) return branchMode !== 'married-out'
  if (adultIndex === 1) return branchMode !== 'uxorilocal'
  return true
}

function allChildIds(data: PublicationData): ReadonlySet<string> {
  return new Set(Object.values(data.families).flatMap(family => family.children))
}

function familyChildrenFor(
  personId: string,
  data: PublicationData,
  childPersonIds: ReadonlySet<string>,
): ChildReference[] {
  const references = Object.values(data.families).flatMap(family =>
    family.adults.includes(personId)
      ? family.children
          .filter(childId => Boolean(data.people[childId]))
          .map(childId => ({
            personId: childId,
            branchMode: resolveFamilyBranchMode(data, family.id, childPersonIds),
            mainLine: isMainLineChild(
              family.adults,
              personId,
              resolveFamilyBranchMode(data, family.id, childPersonIds),
            ),
          }))
      : [],
  )
  const unique = new Map<string, ChildReference>()
  references.forEach(reference => {
    unique.set(reference.personId, unique.get(reference.personId) || reference)
  })
  return [...unique.values()]
}

function childIdsFor(personId: string, data: PublicationData, childPersonIds: ReadonlySet<string>): string[] {
  return familyChildrenFor(personId, data, childPersonIds)
    .filter(reference => reference.mainLine)
    .map(reference => reference.personId)
}

function generationFor(personId: string, data: PublicationData, childPersonIds: ReadonlySet<string>): number {
  let current = personId
  let generation = 0
  const seen = new Set<string>()
  while (true) {
    if (seen.has(current)) throw new Error(`世系关系存在循环：${data.people[personId]?.name || personId}`)
    seen.add(current)
    const parents = Object.values(data.families).filter(family => family.children.includes(current))
    if (parents.length === 0) return generation
    if (parents.length > 1) throw new Error(`世系关系冲突：${data.people[current]?.name || current} 存在多个父母家庭`)
    const family = parents[0]
    const branchMode = resolveFamilyBranchMode(data, family.id, childPersonIds)
    const parentId = branchMode === 'married-out' ? family.adults[1] : family.adults[0]
    if (!parentId || !data.people[parentId])
      throw new Error(`世系关系不完整：无法确定 ${data.people[current]?.name || current} 的承系长辈`)
    current = parentId
    generation += 1
  }
}

function rootIds(data: PublicationData, childPersonIds: ReadonlySet<string>): string[] {
  const focusFamily = data.families[data.focusFamilyId]
  const focusEntry = focusFamily ? findFamilyEntryPersonId(data, focusFamily.id, childPersonIds) : undefined
  const focusRoot = focusEntry || focusFamily?.adults.find(id => Boolean(data.people[id]))
  if (focusRoot) return [focusRoot]

  const roots = Object.keys(data.people).filter(id => !childPersonIds.has(id))
  return roots.length > 0 ? roots : Object.keys(data.people)
}

function buildLineage(data: PublicationData, childPersonIds: ReadonlySet<string>): LineageNode[] {
  const result: LineageNode[] = []
  const generations = new Map<string, number>()
  const queue = rootIds(data, childPersonIds).map(personId => ({
    personId,
    generation: generationFor(personId, data, childPersonIds),
  }))
  let cursor = 0

  while (cursor < queue.length) {
    const next = queue[cursor++]
    const knownGeneration = generations.get(next.personId)
    if (knownGeneration !== undefined) {
      if (knownGeneration !== next.generation)
        throw new Error(`世系关系冲突：${data.people[next.personId]?.name || next.personId} 世代不一致`)
      continue
    }
    generations.set(next.personId, next.generation)
    result.push(next)
    queue.push(
      ...childIdsFor(next.personId, data, childPersonIds).map(personId => ({
        personId,
        generation: next.generation + 1,
      })),
    )
  }

  return result
}

function spouseNames(personId: string, data: PublicationData): string[] {
  return [
    ...new Set(
      Object.values(data.families)
        .filter(family => family.adults.includes(personId))
        .flatMap(family =>
          family.adults.filter(id => id !== personId && data.people[id]).map(id => spouseName(data.people[id])),
        ),
    ),
  ]
}

function childLabel(person: Person, index: number): string {
  const ordinal = index === 0 ? '长' : index === 1 ? '次' : chineseNumber(index + 1)
  if (person.gender === 'male') return `${ordinal}子`
  if (person.gender === 'female') return `${ordinal}女`
  return `${ordinal}子女`
}

function childClause(personId: string, data: PublicationData, childPersonIds: ReadonlySet<string>): string | null {
  const children = familyChildrenFor(personId, data, childPersonIds)
  if (children.length === 0) return null

  const genders = new Set(children.map(reference => data.people[reference.personId].gender))
  const label =
    genders.size === 1 && genders.has('male') ? '子' : genders.size === 1 && genders.has('female') ? '女' : '子女'
  const names = children.map((reference, index) => {
    const branch =
      reference.branchMode === 'married-out' ? '（外嫁支）' : reference.branchMode === 'uxorilocal' ? '（招婿支）' : ''
    return `${childLabel(data.people[reference.personId], index)}${personName(data.people[reference.personId])}${branch}`
  })
  return `生${label}${chineseNumber(children.length)}：${names.join('、')}`
}

function lifeClauses(person: Person): string[] {
  const clauses: string[] = []
  if (person.birth) clauses.push(`生于${genealogyDate(person.birth)}`)
  if (person.death) clauses.push(`卒于${genealogyDate(person.death)}`)
  else if (person.deceased) clauses.push('卒年未详')
  if (person.age) clauses.push(`享年${genealogyAge(person.age)}`)
  return clauses
}

function personMarkdown(
  node: LineageNode | { personId: string },
  data: PublicationData,
  childPersonIds: ReadonlySet<string>,
): string {
  const person = data.people[node.personId]
  const clauses = [
    ...('generation' in node ? [] : ['世次不详']),
    ...(person.titleName ? [`字（号）${markdownText(person.titleName)}`] : []),
    ...(person.clan ? [`系${markdownText(person.clan)}`] : []),
    ...lifeClauses(person),
  ]
  const spouses = spouseNames(node.personId, data)
  if (spouses.length > 0) clauses.push(`配${spouses.join('、')}`)
  const children = childClause(node.personId, data, childPersonIds)
  if (children) clauses.push(children)
  if (person.note?.trim()) clauses.push(`附记：${markdownText(person.note)}`)
  return `${recordName(person)}${clauses.length > 0 ? `，${clauses.join('，')}` : ''}。`
}

function buildPreface(data: PublicationData): string | null {
  const info = data.info
  if (!info) return null
  const paragraphs: string[] = []
  if (info.description?.trim()) paragraphs.push(markdownText(info.description))

  const identity = [
    info.ancestralOrigin ? `原籍${markdownText(info.ancestralOrigin)}` : '',
    info.hallName ? `堂号${markdownText(info.hallName)}` : '',
    info.familyMotto ? `家训为“${markdownText(info.familyMotto)}”` : '',
  ].filter(Boolean)
  if (identity.length > 0) paragraphs.push(`${identity.join('，')}。`)
  if (info.revisionNotes?.trim()) paragraphs.push(`修订说明：${markdownText(info.revisionNotes)}`)
  return paragraphs.length > 0 ? paragraphs.join('\n\n') : null
}

export function buildPublicationMarkdown(data: PublicationData): string {
  const childPersonIds = allChildIds(data)
  const lineage = buildLineage(data, childPersonIds)
  const coveredIds = new Set(
    lineage.flatMap(node => [
      node.personId,
      ...Object.values(data.families)
        .filter(family => family.adults.includes(node.personId))
        .flatMap(family => family.adults),
    ]),
  )
  const remaining = Object.keys(data.people)
    .filter(personId => !coveredIds.has(personId))
    .map(personId => ({ personId }))
  const sections = [`# ${markdownText(data.title || '未命名族谱')}`]
  if (data.subtitle?.trim()) sections.push(`> ${markdownText(data.subtitle)}`)
  const preface = buildPreface(data)
  if (preface) sections.push('## 谱序', preface)

  let currentGeneration: number | null = null
  for (const node of lineage) {
    if (currentGeneration !== node.generation) {
      currentGeneration = node.generation
      sections.push(`## ${chineseNumber(node.generation + 1)}世`)
    }
    sections.push(`### ${personName(data.people[node.personId])}`, personMarkdown(node, data, childPersonIds))
  }
  if (remaining.length > 0) {
    sections.push('## 其他人物')
    remaining.forEach(node => {
      sections.push(`### ${personName(data.people[node.personId])}`, personMarkdown(node, data, childPersonIds))
    })
  }
  return `${sections.join('\n\n').trim()}\n`
}
