import type { FamilyUnit, Person, PublicationData } from "../../types/family"
import { findFamilyEntryPersonId } from "../../lib/familyBranchMode"
import {
  DEFAULT_BOOK_LAYOUT,
  type BookBlock,
  type BookDocument,
  type PersonBlock,
} from "../../types/bookDocument"

interface GenNode {
  pid: string
  generation: number
  children: GenNode[]
}

const ORDINALS = ["長", "次", "三", "四", "五", "六", "七", "八", "九", "十"]

function ordinal(index: number): string {
  return ORDINALS[index] ?? `${index + 1}`
}

function numberToHan(value: number): string {
  const digits = "零一二三四五六七八九"
  if (value >= 1000 && value <= 2099) {
    return String(value).split("").map((char) => digits[Number(char)]).join("")
  }
  if (value <= 10) return value === 10 ? "十" : digits[value]
  if (value < 20) return `十${digits[value - 10]}`
  if (value < 100) {
    const tens = Math.floor(value / 10)
    const ones = value % 10
    return `${digits[tens]}十${ones ? digits[ones] : ""}`
  }
  return String(value).split("").map((char) => digits[Number(char)]).join("")
}

function arabicToHan(text: string): string {
  return text.replace(/\d+/g, (match) => numberToHan(Number(match)))
}

function findRoots(people: Record<string, Person>, families: Record<string, FamilyUnit>): string[] {
  const children = new Set<string>()
  for (const family of Object.values(families)) {
    for (const child of family.children) children.add(child)
  }
  const total = Object.keys(people).length
  const ids = Object.keys(people)
  return ids.filter((id) => {
    const hasConnection = Object.values(families).some((family) => family.adults.includes(id) || family.children.includes(id))
    if (!hasConnection && total > 1) return false
    if (children.has(id)) return false
    if (Object.values(families).some((family) => family.adults[0] === id)) return true
    return !Object.values(families).some((family) => family.adults.includes(id))
  })
}

function childIdsFor(pid: string, families: Record<string, FamilyUnit>): string[] {
  const ids: string[] = []
  for (const family of Object.values(families)) {
    if (family.adults[0] === pid) {
      if (family.branchMode !== "married-out") ids.push(...family.children)
    } else if (family.adults[1] === pid && family.branchMode !== "uxorilocal") {
      ids.push(...family.children)
    }
  }
  return [...new Set(ids)]
}

function rootIdsFor(data: PublicationData): string[] {
  const focusFamily = data.families[data.focusFamilyId]
  const focusEntryId = findFamilyEntryPersonId(data, data.focusFamilyId)
  if (focusEntryId && data.people[focusEntryId]) return [focusEntryId]
  const focusRootId = focusFamily?.adults.find((id) => data.people[id])
  if (focusRootId) return [focusRootId]
  const roots = findRoots(data.people, data.families)
  return roots.length > 0 ? roots : Object.keys(data.people)
}

function buildNode(
  pid: string,
  generation: number,
  people: Record<string, Person>,
  families: Record<string, FamilyUnit>,
  seen: Set<string>,
): GenNode {
  const node: GenNode = { pid, generation, children: [] }
  if (seen.has(pid)) return node
  seen.add(pid)
  node.children = childIdsFor(pid, families)
    .filter((id) => people[id])
    .map((id) => buildNode(id, generation + 1, people, families, seen))
  seen.delete(pid)
  return node
}

function collectByGeneration(roots: GenNode[]): GenNode[] {
  const result: GenNode[] = []
  let queue = roots
  const visited = new Set<string>()
  while (queue.length > 0) {
    const next: GenNode[] = []
    for (const node of queue) {
      if (visited.has(node.pid)) continue
      visited.add(node.pid)
      result.push(node)
      next.push(...node.children)
    }
    queue = next
  }
  return result
}

function spouseTexts(pid: string, p: Person, people: Record<string, Person>, families: Record<string, FamilyUnit>): string[] {
  const result: string[] = []
  const fams = Object.values(families).filter((family) => family.adults.includes(pid))
  for (let i = 0; i < fams.length; i++) {
    const family = fams[i]
    const spouseId = family.adults.find((id) => id !== pid)
    const spouse = spouseId ? people[spouseId] : null
    if (!spouse) continue
    const prefix = p.gender === "female"
      ? (family.branchMode === "uxorilocal" ? "招贅" : "適")
      : (i === 0 ? "配" : "繼配")
    const suffix = spouse.gender === "female" && !spouse.name.endsWith("氏") ? "氏" : ""
    result.push(`${prefix}${spouse.name}${suffix}`)
  }
  return result
}

function childrenText(pid: string, people: Record<string, Person>, families: Record<string, FamilyUnit>): string {
  const children = childIdsFor(pid, families).filter((id) => people[id])
  const sons = children.filter((id) => people[id]?.gender === "male")
  const daughters = children.filter((id) => people[id]?.gender === "female")
  const parts: string[] = []
  if (sons.length) parts.push(`子${sons.length}：${sons.map((id, i) => `${ordinal(i)}${people[id].name}`).join("、")}`)
  if (daughters.length) parts.push(`女${daughters.length}：${daughters.map((id, i) => `${ordinal(i)}${people[id].name}`).join("、")}`)
  return parts.join("，")
}

function personText(pid: string, generation: number, people: Record<string, Person>, families: Record<string, FamilyUnit>): PersonBlock {
  const p = people[pid]
  const parts: string[] = []
  const name = p.titleName ? `${p.titleName}公諱${p.name}` : (p.gender === "male" ? `公諱${p.name}` : `${p.clan || p.name}氏`)
  parts.push(name)
  if (p.birth) parts.push(`生於${p.birth}`)
  if (p.death) parts.push(`卒於${p.death}`)
  if (p.age) parts.push(`${p.gender === "male" ? "享壽" : "享年"}${p.age}`)
  const spouses = spouseTexts(pid, p, people, families)
  if (spouses.length) parts.push(spouses.join("，"))
  const children = childrenText(pid, people, families)
  if (children) parts.push(children)
  if (p.note) parts.push(p.note)
  const text = parts
    .filter(Boolean)
    .map((part, index) => (index === 0 ? part : part.replace(/[。]+$/g, "")))
    .join("。")
    .replace(/。。+/g, "。")

  return {
    type: "person",
    personId: pid,
    personName: p.name,
    generation,
    text: arabicToHan(text.endsWith("。") ? text : `${text}。`),
  }
}

function cnGen(generation: number): string {
  const nums = ["一", "二", "三", "四", "五", "六", "七", "八", "九", "十"]
  return nums[generation] ? `第${nums[generation]}世` : `第${generation + 1}世`
}

export function generateBookDocument(publicationId: number, data: PublicationData): BookDocument {
  const rootIds = rootIdsFor(data)
  const rootNodes = rootIds.map((pid) => buildNode(pid, 0, data.people, data.families, new Set()))
  const nodes = collectByGeneration(rootNodes)
  const blocks: BookBlock[] = [
    { type: "cover", title: data.title || "未命名族谱", subtitle: data.subtitle || data.info?.hallName },
  ]
  let currentGeneration: number | null = null
  for (const node of nodes) {
    if (!data.people[node.pid]) continue
    if (currentGeneration !== node.generation) {
      currentGeneration = node.generation
      blocks.push({ type: "generationHeading", generation: node.generation, text: cnGen(node.generation) })
    }
    blocks.push(personText(node.pid, node.generation, data.people, data.families))
  }
  return {
    publicationId,
    title: data.title || "未命名族谱",
    layout: { ...DEFAULT_BOOK_LAYOUT },
    blocks,
  }
}
