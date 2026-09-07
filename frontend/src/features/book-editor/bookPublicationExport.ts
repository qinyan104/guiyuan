import type { PublicationData } from "../../types/family"

interface LineageNode {
  personId: string
  generation: number
  children: string[]
}

function childIdsFor(personId: string, data: PublicationData): string[] {
  const result: string[] = []
  for (const family of Object.values(data.families)) {
    if (family.adults[0] === personId && family.branchMode !== "married-out") result.push(...family.children)
    if (family.adults[1] === personId && family.branchMode !== "uxorilocal") result.push(...family.children)
  }
  return [...new Set(result)].filter((id) => Boolean(data.people[id]))
}

function generationFor(personId: string, data: PublicationData): number {
  let current = personId
  let generation = 0
  const seen = new Set<string>()
  while (true) {
    if (seen.has(current)) throw new Error(`世系关系存在循环：${data.people[personId]?.name || personId}`)
    seen.add(current)
    const parents = Object.values(data.families).filter((family) => family.children.includes(current))
    if (parents.length === 0) return generation
    if (parents.length > 1) throw new Error(`世系关系冲突：${data.people[current]?.name || current} 存在多个父母家庭`)
    const family = parents[0]
    const parentId = family.branchMode === "married-out" ? family.adults[1] : family.adults[0]
    if (!parentId || !data.people[parentId]) throw new Error(`世系关系不完整：无法确定 ${data.people[current]?.name || current} 的承系长辈`)
    current = parentId
    generation += 1
  }
}

function rootIds(data: PublicationData): string[] {
  const focusRoot = data.families[data.focusFamilyId]?.adults.find((id) => Boolean(data.people[id]))
  if (focusRoot) return [focusRoot]

  const children = new Set(Object.values(data.families).flatMap((family) => family.children))
  const roots = Object.keys(data.people).filter((id) => !children.has(id))
  return roots.length > 0 ? roots : Object.keys(data.people)
}

function buildLineage(data: PublicationData): LineageNode[] {
  const result: LineageNode[] = []
  const generations = new Map<string, number>()
  const queue = rootIds(data).map((personId) => ({ personId, generation: generationFor(personId, data) }))

  while (queue.length > 0) {
    const next = queue.shift()!
    const knownGeneration = generations.get(next.personId)
    if (knownGeneration !== undefined) {
      if (knownGeneration !== next.generation) throw new Error(`世系关系冲突：${data.people[next.personId]?.name || next.personId} 世代不一致`)
      continue
    }
    generations.set(next.personId, next.generation)
    const children = childIdsFor(next.personId, data)
    result.push({ personId: next.personId, generation: next.generation, children })
    queue.push(...children.map((personId) => ({ personId, generation: next.generation + 1 })))
  }

  return result
}

function spouseNames(personId: string, data: PublicationData): string[] {
  return Object.values(data.families)
    .filter((family) => family.adults.includes(personId))
    .flatMap((family) => family.adults.filter((id) => id !== personId && data.people[id]).map((id) => data.people[id].name))
}

function genderLabel(gender: PublicationData["people"][string]["gender"]): string {
  return gender === "male" ? "男" : gender === "female" ? "女" : "未知"
}

function personMarkdown(node: LineageNode, data: PublicationData): string {
  const person = data.people[node.personId]
  const lines = [`### ${person.name}`, `- 世代：第 ${node.generation + 1} 世`, `- 性别：${genderLabel(person.gender)}`]
  if (person.birth) lines.push(`- 出生：${person.birth}`)
  if (person.death) lines.push(`- 逝世：${person.death}`)
  if (person.age) lines.push(`- 享年：${person.age}`)
  const spouses = spouseNames(node.personId, data)
  if (spouses.length) lines.push(`- 配偶：${spouses.join("、")}`)
  const children = node.children.map((id) => data.people[id]?.name).filter(Boolean)
  if (children.length) lines.push(`- 子女：${children.join("、")}`)
  if (person.note?.trim()) lines.push(`- 备注：${person.note.trim()}`)
  return lines.join("\n")
}

export function buildPublicationMarkdown(data: PublicationData): string {
  const lineage = buildLineage(data)
  const knownIds = new Set(lineage.map((node) => node.personId))
  const remaining = Object.keys(data.people)
    .filter((personId) => !knownIds.has(personId))
    .map((personId) => ({ personId, generation: generationFor(personId, data), children: childIdsFor(personId, data) }))
  const sections = [`# ${data.title || "未命名族谱"}`, data.subtitle || ""]
  if (data.info?.ancestralOrigin) sections.push(`- 原籍：${data.info.ancestralOrigin}`)
  if (data.info?.hallName) sections.push(`- 堂号：${data.info.hallName}`)
  if (data.info?.familyMotto) sections.push(`- 家训：${data.info.familyMotto}`)

  let currentGeneration: number | null = null
  for (const node of lineage) {
    if (currentGeneration !== node.generation) {
      currentGeneration = node.generation
      sections.push(`## 第 ${node.generation + 1} 世`)
    }
    sections.push(personMarkdown(node, data))
  }
  if (remaining.length > 0) {
    sections.push("## 其他人物")
    sections.push(...remaining.map((node) => personMarkdown(node, data)))
  }
  return `${sections.filter(Boolean).join("\n\n").trim()}\n`
}
