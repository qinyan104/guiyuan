/**
 * 亲戚称谓推算器 (Chinese Kinship Term Calculator)
 */

import type { PublicationData, Person, Gender, FamilyUnit } from "../types/family"
import { resolveFamilyBranchMode } from "./familyBranchMode"

export interface KinshipTerm {
  term: string
  description: string
  generationGap: number
  isElder: boolean
}

export interface KinshipPath {
  path: string[]
  commonAncestorId: string
  upSteps: number
  downSteps: number
  generationGap: number
  isPatrilineal: boolean
  isEgoLinePatrilineal: boolean
  egoConnectorId: string | null
  alterConnectorId: string | null
  egoConnectorGender: Gender
  alterConnectorGender: Gender
}

interface AncestorEntry {
  personId: string
  depth: number
  path: { personId: string; gender: Gender }[]
}

interface ConnectorInfo {
  childId: string
  gender: Gender
}

interface KinshipGraph {
  parents: Map<string, string[]>
  children: Map<string, string[]>
  spouses: Map<string, string[]>
  siblings: Map<string, { siblingId: string; gender: Gender }[]>
  personFamilies: Map<string, string[]>
  families: Map<string, FamilyUnit>
  people: Map<string, Person>
}

function buildGraph(publication: PublicationData): KinshipGraph {
  const graph: KinshipGraph = {
    parents: new Map(),
    children: new Map(),
    spouses: new Map(),
    siblings: new Map(),
    personFamilies: new Map(),
    families: new Map(),
    people: new Map(),
  }
  for (const [id, person] of Object.entries(publication.people)) {
    graph.people.set(id, person)
  }
  for (const [id, family] of Object.entries(publication.families)) {
    graph.families.set(id, family)
  }
  for (const family of Object.values(publication.families)) {
    const adults = family.adults.filter((id) => graph.people.has(id))
    const children = family.children.filter((id) => graph.people.has(id))
    for (const pid of [...adults, ...children]) {
      const existing = graph.personFamilies.get(pid) ?? []
      existing.push(family.id)
      graph.personFamilies.set(pid, existing)
    }
    for (const childId of children) {
      const existingParents = graph.parents.get(childId) ?? []
      graph.parents.set(childId, [...existingParents, ...adults.filter((a) => !existingParents.includes(a))])
    }
    for (const adultId of adults) {
      const existingChildren = graph.children.get(adultId) ?? []
      graph.children.set(adultId, [...existingChildren, ...children.filter((c) => !existingChildren.includes(c))])
    }
    for (let i = 0; i < adults.length; i++) {
      for (let j = i + 1; j < adults.length; j++) {
        const s1 = graph.spouses.get(adults[i]) ?? []
        s1.push(adults[j])
        graph.spouses.set(adults[i], s1)
        const s2 = graph.spouses.get(adults[j]) ?? []
        s2.push(adults[i])
        graph.spouses.set(adults[j], s2)
      }
    }
    for (let i = 0; i < children.length; i++) {
      for (let j = i + 1; j < children.length; j++) {
        const ci = children[i]
        const cj = children[j]
        const pi = graph.people.get(ci)
        const pj = graph.people.get(cj)
        const sib1 = graph.siblings.get(ci) ?? []
        sib1.push({ siblingId: cj, gender: pj?.gender ?? "unknown" })
        graph.siblings.set(ci, sib1)
        const sib2 = graph.siblings.get(cj) ?? []
        sib2.push({ siblingId: ci, gender: pi?.gender ?? "unknown" })
        graph.siblings.set(cj, sib2)
      }
    }
  }
  return graph
}

function findAncestors(graph: KinshipGraph, personId: string, maxDepth: number = 50): AncestorEntry[] {
  const result: AncestorEntry[] = []
  const visited = new Set<string>()
  function dfs(currentId: string, depth: number, path: { personId: string; gender: Gender }[]) {
    if (depth > maxDepth || visited.has(currentId)) return
    visited.add(currentId)
    result.push({ personId: currentId, depth, path: [...path] })
    const parents = graph.parents.get(currentId)
    if (parents) {
      for (const parentId of parents) {
        const parent = graph.people.get(parentId)
        dfs(parentId, depth + 1, [...path, { personId: parentId, gender: parent?.gender ?? "unknown" }])
      }
    }
  }
  const person = graph.people.get(personId)
  dfs(personId, 0, person ? [{ personId, gender: person.gender ?? "unknown" }] : [])
  return result
}

function findLowestCommonAncestor(
  ancestorsA: AncestorEntry[],
  ancestorsB: AncestorEntry[],
): { ancestor: string; depthA: number; depthB: number; pathA: { personId: string; gender: Gender }[]; pathB: { personId: string; gender: Gender }[] } | null {
  const ancestorMapA = new Map<string, AncestorEntry>()
  for (const entry of ancestorsA) {
    if (!ancestorMapA.has(entry.personId) || entry.depth < ancestorMapA.get(entry.personId)!.depth) {
      ancestorMapA.set(entry.personId, entry)
    }
  }
  let best: { ancestor: string; depthA: number; depthB: number; pathA: { personId: string; gender: Gender }[]; pathB: { personId: string; gender: Gender }[]; totalDepth: number } | null = null
  for (const entryB of ancestorsB) {
    const entryA = ancestorMapA.get(entryB.personId)
    if (!entryA) continue
    const totalDepth = entryA.depth + entryB.depth
    if (!best || totalDepth < best.totalDepth) {
      best = { ancestor: entryB.personId, depthA: entryA.depth, depthB: entryB.depth, pathA: entryA.path, pathB: entryB.path, totalDepth }
    }
  }
  if (!best) return null
  return { ancestor: best.ancestor, depthA: best.depthA, depthB: best.depthB, pathA: best.pathA, pathB: best.pathB }
}

function isAllMaleOnPath(path: { personId: string; gender: Gender }[]): boolean {
  return path.every((entry) => entry.gender === "male")
}

function getConnectorInfo(path: { personId: string; gender: Gender }[], ancestorId: string, personId: string): ConnectorInfo | null {
  const ancestorIdx = path.findIndex((p) => p.personId === ancestorId)
  if (ancestorIdx < 0 || path.length < 2) return null
  const connectorIdx = Math.max(0, ancestorIdx - 1)
  if (connectorIdx >= path.length) return null
  const connector = path[connectorIdx]
  return { childId: connector.personId, gender: connector.gender }
}

function buildRelationshipPath(
  graph: KinshipGraph,
  personAId: string,
  personBId: string,
  lca: { ancestor: string; depthA: number; depthB: number; pathA: { personId: string; gender: Gender }[]; pathB: { personId: string; gender: Gender }[] },
): KinshipPath {
  const pathAReverse = lca.pathA.filter((p) => p.personId !== personAId && p.personId !== lca.ancestor).map((p) => p.personId).reverse()
  const pathB = lca.pathB.filter((p) => p.personId !== personBId && p.personId !== lca.ancestor).map((p) => p.personId)
  const fullPath = [personAId, ...pathAReverse, lca.ancestor, ...pathB, personBId]
  const egoSidePath = lca.pathA.filter((p) => p.personId !== lca.ancestor && p.personId !== personAId)
  const alterSidePath = lca.pathB.filter((p) => p.personId !== lca.ancestor && p.personId !== personBId)
  const isFullPatrilineal = isAllMaleOnPath(egoSidePath) && isAllMaleOnPath(alterSidePath)
  const isEgoLinePatrilineal = isAllMaleOnPath(egoSidePath)
  const egoConnector = getConnectorInfo(lca.pathA, lca.ancestor, personAId)
  const alterConnector = getConnectorInfo(lca.pathB, lca.ancestor, personBId)
  const generationGap = lca.depthB - lca.depthA
  return {
    path: fullPath,
    commonAncestorId: lca.ancestor,
    upSteps: lca.depthA,
    downSteps: lca.depthB,
    generationGap,
    isPatrilineal: isFullPatrilineal,
    isEgoLinePatrilineal,
    egoConnectorId: egoConnector?.childId ?? null,
    alterConnectorId: alterConnector?.childId ?? null,
    egoConnectorGender: egoConnector?.gender ?? "unknown",
    alterConnectorGender: alterConnector?.gender ?? "unknown",
  }
}

function extractYear(birthStr?: string): number | null {
  if (!birthStr) return null
  const match = birthStr.match(/(\d{4})/)
  return match ? parseInt(match[1], 10) : null
}

function isOlderSibling(publication: PublicationData, personAId: string, personBId: string): boolean | null {
  for (const family of Object.values(publication.families)) {
    const aIdx = family.children.indexOf(personAId)
    const bIdx = family.children.indexOf(personBId)
    if (aIdx >= 0 && bIdx >= 0) return aIdx < bIdx
  }
  const personA = publication.people[personAId]
  const personB = publication.people[personBId]
  if (!personA || !personB) return null
  const yearA = extractYear(personA.birth)
  const yearB = extractYear(personB.birth)
  if (yearA !== null && yearB !== null) return yearA < yearB
  return null
}

function isOlderSiblingInFamily(publication: PublicationData, personAId: string, personBId: string): boolean | null {
  for (const family of Object.values(publication.families)) {
    const aIdx = family.children.indexOf(personAId)
    const bIdx = family.children.indexOf(personBId)
    if (aIdx >= 0 && bIdx >= 0) return aIdx < bIdx
  }
  return null
}

function areSiblings(publication: PublicationData, personAId: string, personBId: string): boolean {
  for (const family of Object.values(publication.families)) {
    if (family.children.includes(personAId) && family.children.includes(personBId)) return true
  }
  return false
}

function findParentFamily(publication: PublicationData, personId: string): FamilyUnit | null {
  for (const family of Object.values(publication.families)) {
    if (family.children.includes(personId)) return family
  }
  return null
}

// Term tables
interface TermEntry { term: string; description: string }

const DIRECT_ELDER: Record<string, TermEntry> = {
  "male_1": { term: "爸爸", description: "父亲" },
  "female_1": { term: "妈妈", description: "母亲" },
  "male_2": { term: "爷爷", description: "祖父" },
  "female_2": { term: "奶奶", description: "祖母" },
  "male_3": { term: "曾祖父", description: "曾祖父" },
  "female_3": { term: "曾祖母", description: "曾祖母" },
}

const DIRECT_YOUNGER: Record<string, TermEntry> = {
  "male_1": { term: "儿子", description: "儿子" },
  "female_1": { term: "女儿", description: "女儿" },
  "male_2": { term: "孙子", description: "孙子" },
  "female_2": { term: "孙女", description: "孙女" },
  "male_3": { term: "曾孙", description: "曾孙" },
  "female_3": { term: "曾孙女", description: "曾孙女" },
}

const SIBLING: Record<string, TermEntry> = {
  "male_older": { term: "哥哥", description: "亲哥哥" },
  "male_younger": { term: "弟弟", description: "亲弟弟" },
  "female_older": { term: "姐姐", description: "亲姐姐" },
  "female_younger": { term: "妹妹", description: "亲妹妹" },
}

const TANG_COUSIN: Record<string, TermEntry> = {
  "male_older": { term: "堂哥", description: "堂哥（父亲的兄弟的儿子，较年长）" },
  "male_younger": { term: "堂弟", description: "堂弟（父亲的兄弟的儿子，较年轻）" },
  "female_older": { term: "堂姐", description: "堂姐（父亲的兄弟的女儿，较年长）" },
  "female_younger": { term: "堂妹", description: "堂妹（父亲的兄弟的女儿，较年轻）" },
  "male_unknown": { term: "堂兄弟", description: "堂兄弟" },
  "female_unknown": { term: "堂姐妹", description: "堂姐妹" },
}

const BIAO_COUSIN: Record<string, TermEntry> = {
  "male_older": { term: "表哥", description: "表哥（表亲，较年长）" },
  "male_younger": { term: "表弟", description: "表弟（表亲，较年轻）" },
  "female_older": { term: "表姐", description: "表姐（表亲，较年长）" },
  "female_younger": { term: "表妹", description: "表妹（表亲，较年轻）" },
  "male_unknown": { term: "表兄弟", description: "表兄弟" },
  "female_unknown": { term: "表姐妹", description: "表姐妹" },
}

const PATERNAL_ELDER_1: Record<string, TermEntry> = {
  "male": { term: "伯叔", description: "父亲的兄弟" },
  "female": { term: "姑姑", description: "父亲的姐妹" },
}

const MATERNAL_ELDER_1: Record<string, TermEntry> = {
  "male": { term: "舅舅", description: "母亲的兄弟" },
  "female": { term: "姨妈", description: "母亲的姐妹" },
}

const YOUNGER_1: Record<string, TermEntry> = {
  "male_patrilineal": { term: "侄子", description: "兄弟的儿子" },
  "female_patrilineal": { term: "侄女", description: "兄弟的女儿" },
  "male_matrilineal": { term: "外甥", description: "姐妹的儿子" },
  "female_matrilineal": { term: "外甥女", description: "姐妹的女儿" },
}

const ELDER_2: Record<string, TermEntry> = {
  "paternal_male": { term: "伯祖父", description: "祖父的兄弟" },
  "paternal_female": { term: "姑奶奶", description: "祖父的姐妹" },
  "maternal_male": { term: "舅公", description: "外婆的兄弟" },
  "maternal_female": { term: "姨奶奶", description: "外婆的姐妹" },
}

function resolveDirectLine(generationGap: number, alterGender: Gender): KinshipTerm | null {
  if (generationGap < 0) {
    const gap = Math.abs(generationGap)
    if (gap > 3) return { term: "远祖", description: "远祖", generationGap, isElder: true }
    const key = `${alterGender}_${gap}`
    const entry = DIRECT_ELDER[key]
    if (entry) return { term: entry.term, description: entry.description, generationGap: Math.abs(generationGap), isElder: true }
  } else if (generationGap > 0) {
    if (generationGap > 3) return { term: "远孙", description: "远孙", generationGap, isElder: false }
    const key = `${alterGender}_${generationGap}`
    const entry = DIRECT_YOUNGER[key]
    if (entry) return { term: entry.term, description: entry.description, generationGap: -Math.abs(generationGap), isElder: false }
  }
  return null
}

function resolveSameGeneration(publication: PublicationData, personAId: string, personBId: string, alterGender: Gender): KinshipTerm | null {
  for (const family of Object.values(publication.families)) {
    if (family.children.includes(personAId) && family.children.includes(personBId)) {
      const older = isOlderSibling(publication, personAId, personBId)
      let ageKey: string
      if (older === true) ageKey = "younger"
      else if (older === false) ageKey = "older"
      else ageKey = "unknown"
      const key = `${alterGender}_${ageKey}`
      const entry = SIBLING[key]
      if (entry) return { term: entry.term, description: entry.description, generationGap: 0, isElder: older === false }
    }
  }
  return null
}

function resolveSameGenerationCollateral(
  publication: PublicationData,
  personAId: string,
  personBId: string,
  alterGender: Gender,
  isPatrilineal: boolean,
): KinshipTerm {
  const older = isOlderSibling(publication, personAId, personBId)
  let ageKey: string
  if (older === true) ageKey = "younger"
  else if (older === false) ageKey = "older"
  else ageKey = "unknown"
  const table = isPatrilineal ? TANG_COUSIN : BIAO_COUSIN
  const lookupKey = `${alterGender}_${ageKey}`
  const entry = table[lookupKey]
  if (entry) {
    return { term: entry.term, description: entry.description, generationGap: 0, isElder: older === false }
  }
  const prefix = isPatrilineal ? "堂" : "表"
  const suffix = alterGender === "male" ? "兄弟" : "姐妹"
  return { term: `${prefix}${suffix}`, description: `${prefix}${suffix}`, generationGap: 0, isElder: older === false }
}

function resolveElderOneGeneration(
  publication: PublicationData,
  personAId: string,
  personBId: string,
  alterGender: Gender,
  isPatrilineal: boolean,
  alterConnectorGender: Gender,
  alterConnectorId: string | null,
): KinshipTerm {
  if (isPatrilineal && alterConnectorGender === "male") {
    const egoParentFamily = findParentFamily(publication, personAId)
    if (egoParentFamily && alterConnectorId && egoParentFamily.adults.length > 0) {
      for (const egoParentId of egoParentFamily.adults) {
        if (areSiblings(publication, egoParentId, alterConnectorId)) {
          const older = isOlderSiblingInFamily(publication, egoParentId, alterConnectorId)
          if (older === true) return { term: "叔叔", description: "父亲的弟弟", generationGap: 1, isElder: true }
          if (older === false) return { term: "伯父", description: "父亲的哥哥", generationGap: 1, isElder: true }
        }
      }
    }
    // Fallback: try birth year comparison
    const unclePerson = publication.people[alterConnectorId ?? ""]
    if (alterConnectorId && unclePerson && egoParentFamily) {
      for (const egoParentId of egoParentFamily.adults) {
        const older2 = isOlderSibling(publication, egoParentId, alterConnectorId)
        if (older2 === true) return { term: "叔叔", description: "父亲的弟弟", generationGap: 1, isElder: true }
        if (older2 === false) return { term: "伯父", description: "父亲的哥哥", generationGap: 1, isElder: true }
      }
    }
    // Last resort: use children order
    for (const family of Object.values(publication.families)) {
      for (const egoParentId of egoParentFamily?.adults ?? []) {
        const aIdx = family.children.indexOf(egoParentId)
        const bIdx = family.children.indexOf(alterConnectorId ?? "")
        if (aIdx >= 0 && bIdx >= 0) {
          return { term: aIdx < bIdx ? "伯父" : "叔叔", description: "父亲的兄弟", generationGap: 1, isElder: true }
        }
      }
    }
    return { term: "伯叔", description: "父亲的兄弟", generationGap: 1, isElder: true }
  }
  if (isPatrilineal && alterConnectorGender === "female") {
    return { term: "姑姑", description: "父亲的姐妹", generationGap: 1, isElder: true }
  }
  if (!isPatrilineal && alterConnectorGender === "male") {
    return { term: "舅舅", description: "母亲的兄弟", generationGap: 1, isElder: true }
  }
  if (!isPatrilineal && alterConnectorGender === "female") {
    return { term: "姨妈", description: "母亲的姐妹", generationGap: 1, isElder: true }
  }
  const lineLabel = isPatrilineal ? "父系" : "母系"
  return { term: `${lineLabel}长辈`, description: `${lineLabel}长辈，长一辈`, generationGap: 1, isElder: true }
}

function resolveYoungerOneGeneration(
  publication: PublicationData,
  personAId: string,
  personBId: string,
  alterGender: Gender,
  isEgoLinePatrilineal: boolean,
  alterConnectorGender: Gender,
  alterConnectorId: string | null,
): KinshipTerm | null {
  // Nephew/niece: ego is uncle/aunt of alter
  // Key insight: if the connector on alter side is male, it's a patrilineal nephew
  // If female connector, it's a matrilineal nephew (外甥/外甥女)
  const line = alterConnectorGender === "male" ? "patrilineal" : "matrilineal"
  const key = `${alterGender}_${line}`
  const entry = YOUNGER_1[key]
  if (entry) return { ...entry, generationGap: -1, isElder: false }
  return null
}

function resolveElderMultiGeneration(generationGap: number, alterGender: Gender, isPatrilineal: boolean): KinshipTerm {
  const gap = Math.abs(generationGap)
  if (gap >= 2) {
    const line = isPatrilineal ? "paternal" : "maternal"
    const key = `${line}_${alterGender}`
    const entry = ELDER_2[key]
    if (entry) return { ...entry, generationGap: Math.abs(generationGap), isElder: true }
  }
  const lineLabel = isPatrilineal ? "堂" : "表"
  return { term: `${lineLabel}祖辈`, description: `${lineLabel}祖辈`, generationGap, isElder: true }
}

function resolveYoungerMultiGeneration(generationGap: number, alterGender: Gender, isPatrilineal: boolean): KinshipTerm {
  const lineLabel = isPatrilineal ? "" : "外"
  return { term: `${lineLabel}远孙`, description: `${lineLabel}远孙`, generationGap, isElder: false }
}

export function findRelationshipPath(publication: PublicationData, personAId: string, personBId: string): KinshipPath | null {
  if (personAId === personBId) return null
  const graph = buildGraph(publication)
  if (!graph.people.has(personAId) || !graph.people.has(personBId)) return null
  const ancestorsA = findAncestors(graph, personAId)
  const ancestorsB = findAncestors(graph, personBId)
  const lca = findLowestCommonAncestor(ancestorsA, ancestorsB)
  if (!lca) return null
  return buildRelationshipPath(graph, personAId, personBId, lca)
}

export function resolveKinshipTerm(publication: PublicationData, personAId: string, personBId: string): KinshipTerm | null {
  if (personAId === personBId) {
    return { term: "本人", description: "自己", generationGap: 0, isElder: false }
  }

  const path = findRelationshipPath(publication, personAId, personBId)
  if (!path) return null

  const { generationGap, isPatrilineal, isEgoLinePatrilineal, alterConnectorGender, alterConnectorId } = path
  const personB = publication.people[personBId]
  const alterGender = personB?.gender ?? "unknown"

  // Direct line (generationGap != 0, path length is direct)
  if (generationGap !== 0 && (path.upSteps === 0 || path.downSteps === 0)) {
    const direct = resolveDirectLine(generationGap, alterGender)
    if (direct) return direct
  }

  // Same generation (generationGap == 0)
  if (generationGap === 0) {
    // Check if siblings first
    const sibling = resolveSameGeneration(publication, personAId, personBId, alterGender)
    if (sibling) return sibling

    // Cousins
    return resolveSameGenerationCollateral(publication, personAId, personBId, alterGender, isPatrilineal)
  }

  // One generation younger (nephew/niece)
  if (generationGap === 1) {
    const younger = resolveYoungerOneGeneration(publication, personAId, personBId, alterGender, isEgoLinePatrilineal, alterConnectorGender, alterConnectorId)
    if (younger) return younger
  }

  // One generation elder (uncle/aunt)
  if (generationGap === -1) {
    return resolveElderOneGeneration(publication, personAId, personBId, alterGender, isPatrilineal, alterConnectorGender, alterConnectorId)
  }

  // Multi-generational younger
  if (generationGap >= 2) {
    return resolveYoungerMultiGeneration(generationGap, alterGender, isPatrilineal)
  }

  // Multi-generational elder
  if (generationGap <= -2) {
    return resolveElderMultiGeneration(generationGap, alterGender, isPatrilineal)
  }

  return null
}


// ═══════════════════════════════════════════
// 姻亲关系推算 (In-Law Kinship)
// ═══════════════════════════════════════════

type EdgeType = "parent" | "child" | "spouse"

interface BfsStep {
  personId: string
  edge: EdgeType
  path: { personId: string; edge: EdgeType }[]
}

/** BFS traversing parents + children + spouses to find any connection */
function findAnyConnection(publication: PublicationData, fromId: string, toId: string): { path: string[]; edges: EdgeType[]; spousesUsed: string[] } | null {
  if (fromId === toId) return { path: [fromId], edges: [], spousesUsed: [] }
  const graph = buildGraph(publication)
  const visited = new Set<string>()
  const queue: BfsStep[] = [{ personId: fromId, edge: "parent", path: [] }]

  while (queue.length > 0) {
    const cur = queue.shift()!
    if (visited.has(cur.personId)) continue
    visited.add(cur.personId)
    const newPath = [...cur.path, { personId: cur.personId, edge: cur.edge }]

    if (cur.personId === toId && newPath.length > 1) {
      const edges = newPath.slice(1).map((s) => s.edge)
      const spousesUsed = newPath.filter((s) => s.edge === "spouse").map((s) => s.personId)
      return { path: newPath.map((s) => s.personId), edges, spousesUsed }
    }

    for (const pid of graph.parents.get(cur.personId) ?? []) {
      if (!visited.has(pid)) queue.push({ personId: pid, edge: "parent", path: newPath })
    }
    for (const cid of graph.children.get(cur.personId) ?? []) {
      if (!visited.has(cid)) queue.push({ personId: cid, edge: "child", path: newPath })
    }
    for (const sid of graph.spouses.get(cur.personId) ?? []) {
      if (!visited.has(sid)) queue.push({ personId: sid, edge: "spouse", path: newPath })
    }
  }
  return null
}

/** Female-relative husband term map */
const FEMALE_HUSBAND: Record<string, string> = {
  "姐姐": "姐夫", "妹妹": "妹夫", "姑姑": "姑父", "姨妈": "姨父", "姨": "姨父", "女儿": "女婿",
  "堂姐": "堂姐夫", "堂妹": "堂妹夫", "表姐": "表姐夫", "表妹": "表妹夫",
}

/** Male-relative wife term map */
const MALE_WIFE: Record<string, string> = {
  "哥哥": "嫂子", "弟弟": "弟媳", "叔叔": "婶婶", "舅舅": "舅妈", "儿子": "儿媳",
  "伯父": "伯母", "伯": "伯母",
  "堂哥": "堂嫂", "堂弟": "堂弟媳", "表哥": "表嫂", "表弟": "表弟媳",
}

/** Classify in-law relationship */
function classifyInLaw(
  publication: PublicationData, personAId: string, personBId: string,
  graph: KinshipGraph,
): KinshipTerm | null {
  const personA = publication.people[personAId]
  const personB = publication.people[personBId]
  const bGender = personB?.gender ?? "unknown"

  // Direct spouse?
  if (graph.spouses.get(personAId)?.includes(personBId)) {
    if (bGender === "male") return { term: "丈夫", description: "配偶", generationGap: 0, isElder: false }
    if (bGender === "female") return { term: "妻子", description: "配偶", generationGap: 0, isElder: false }
    return { term: "配偶", description: "配偶", generationGap: 0, isElder: false }
  }

  // Case 1: B is the spouse of A blood relative
  for (const spouseId of graph.spouses.get(personBId) ?? []) {
    const bloodTerm = resolveKinshipTerm(publication, personAId, spouseId)
    if (!bloodTerm) continue
    const spouse = publication.people[spouseId]
    if (spouse?.gender === "female") {
      const m = FEMALE_HUSBAND[bloodTerm.term]
      return { term: m ?? bloodTerm.term + "夫", description: bloodTerm.term + "的丈夫", generationGap: bloodTerm.generationGap, isElder: bloodTerm.isElder }
    }
    if (spouse?.gender === "male") {
      const m = MALE_WIFE[bloodTerm.term]
      return { term: m ?? bloodTerm.term + "妻", description: bloodTerm.term + "的妻子", generationGap: bloodTerm.generationGap, isElder: bloodTerm.isElder }
    }
  }

  // Case 2: B is a blood relative of A spouse
  for (const spouseId of graph.spouses.get(personAId) ?? []) {
    const relTerm = resolveKinshipTerm(publication, spouseId, personBId)
    if (!relTerm) continue
    const egoGender = personA?.gender ?? "unknown"
    const isWoman = egoGender === "female"

    if (relTerm.term === "爸爸" || relTerm.term === "父亲")
      return { term: isWoman ? "公公" : "岳父", description: (isWoman ? "丈夫" : "妻子") + "的父亲", generationGap: 1, isElder: true }
    if (relTerm.term === "妈妈" || relTerm.term === "母亲")
      return { term: isWoman ? "婆婆" : "岳母", description: (isWoman ? "丈夫" : "妻子") + "的母亲", generationGap: 1, isElder: true }

    // Sibling-in-law
    const SIB_MAP: Record<string, { f: string; m: string }> = {
      "哥哥": { f: "大伯", m: "大舅" }, "弟弟": { f: "小叔", m: "小舅" },
      "姐姐": { f: "大姑", m: "大姨" }, "妹妹": { f: "小姑", m: "小姨" },
    }
    const sb = SIB_MAP[relTerm.term]
    if (sb) return { term: isWoman ? sb.f : sb.m, description: relTerm.description, generationGap: 0, isElder: relTerm.isElder }

    // Generic
    return { term: relTerm.term, description: (isWoman ? "夫家" : "妻家") + "的" + relTerm.term, generationGap: relTerm.generationGap, isElder: relTerm.isElder }
  }

  return { term: "姻亲", description: "姻亲关系", generationGap: 0, isElder: false }
}

/** Extended relationship resolver: blood first, then in-law */
export function resolveKinshipTermExtended(
  publication: PublicationData, personAId: string, personBId: string
): KinshipTerm | null {
  if (personAId === personBId) return { term: "本人", description: "自己", generationGap: 0, isElder: false }
  const blood = resolveKinshipTerm(publication, personAId, personBId)
  if (blood) return blood
  const graph = buildGraph(publication)
  return classifyInLaw(publication, personAId, personBId, graph)
}

/** Extended path finder */
export function findRelationshipPathExtended(
  publication: PublicationData, personAId: string, personBId: string
): { isInLaw: boolean; bloodPath?: KinshipPath; inLawPath?: { path: string[]; spousesUsed: string[] } } | null {
  if (personAId === personBId) return null
  const bp = findRelationshipPath(publication, personAId, personBId)
  if (bp) return { isInLaw: false, bloodPath: bp }
  const conn = findAnyConnection(publication, personAId, personBId)
  if (conn && conn.spousesUsed.length > 0) return { isInLaw: true, inLawPath: { path: conn.path, spousesUsed: conn.spousesUsed } }
  return null
}
export function getKinshipLabel(publication: PublicationData, personAId: string, personBId: string): string {
  const result = resolveKinshipTerm(publication, personAId, personBId)
  return result?.term ?? "未知关系"
}
