import type { LineageEntry, LineagePage } from "../types/publishing"
import type { FamilyUnit, Gender, Person, PublicationData } from "../types/family"

interface GenNode { pid: string; spId?: string; gen: number; kids: GenNode[] }

export interface LayoutOptions {
  fontSize?: number
  lineHeight?: number
  columns?: number
  marginPreset?: "compact" | "standard" | "loose"
  paper?: "A4" | "A3"
}

// ── Tree building ──

function findRoots(people: Record<string, Person>, families: Record<string, FamilyUnit>): string[] {
  const kids = new Set<string>()
  for (const f of Object.values(families)) for (const c of f.children) kids.add(c)
  const total = Object.keys(people).length
  return Object.keys(people).filter(id => {
    const hasConn = Object.values(families).some(f => f.adults.includes(id) || f.children.includes(id))
    if (!hasConn && total > 1) return false
    if (kids.has(id)) return false
    for (const f of Object.values(families)) if (f.adults[0] === id) return true
    return !Object.values(families).some(f => f.adults.includes(id))
  })
}

function buildNode(pid: string, families: Record<string, FamilyUnit>, gen: number, visited: Set<string>): GenNode {
  const node: GenNode = { pid, gen, kids: [] }
  if (visited.has(pid)) return node
  visited.add(pid)
  const myFams = Object.values(families).filter(f => f.adults[0] === pid)
  const allKids: string[] = []
  for (const f of myFams) {
    if (f.adults.length > 1) node.spId = f.adults[1]
    for (const c of f.children) allKids.push(c)
  }
  for (const f of Object.values(families)) {
    if (f.adults.length > 1 && f.adults[1] === pid) {
      for (const c of f.children) allKids.push(c)
      if (!node.spId) node.spId = f.adults[0]
    }
  }
  for (const kid of [...new Set(allKids)]) {
    node.kids.push(buildNode(kid, families, gen + 1, visited))
  }
  visited.delete(pid)
  return node
}

// ── Text generation ──

function formatEntry(
  pid: string, gen: number,
  people: Record<string, Person>,
  families: Record<string, FamilyUnit>,
): LineageEntry {
  const p = people[pid]
  if (!p) return { personId: pid, personName: pid, formattedText: pid, generation: gen, gender: "unknown" as const }

  const parts: string[] = []

  if (p.gender === "male") {
    if (p.titleName) {
      parts.push(`${p.titleName}公，讳${p.name}`)
    } else {
      parts.push(`公讳${p.name}`)
    }
  } else if (p.gender === "female") {
    parts.push(`${p.name}`)
  } else {
    parts.push(`${p.name}`)
  }

  const bio: string[] = []
  if (p.birth) bio.push(`生于${p.birth}`)
  if (p.death) bio.push(`卒于${p.death}`)
  if (p.age) bio.push(`享年${p.age}`)
  if (bio.length > 0) parts.push(bio.join("，") + "。")

  const fams = Object.values(families).filter(f => f.adults.includes(pid))
  const spouses: string[] = []
  for (const f of fams) {
    const spouseId = f.adults.find(a => a !== pid)
    if (spouseId && people[spouseId]) {
      spouses.push(people[spouseId].name)
    }
  }
  if (spouses.length > 0) {
    const label = p.gender === "female" ? "适" : "配"
    parts.push(`${label}${spouses.join("、")}。`)
  }

  const children = fams.flatMap(f => f.children).filter(c => people[c])
  if (children.length > 0) {
    const sons = children.filter(c => people[c]?.gender === "male")
    const daughters = children.filter(c => people[c]?.gender === "female")
    const kidParts: string[] = []
    if (sons.length > 0) {
      kidParts.push(`生子${sons.length}：${sons.map(s => people[s].name).join("、")}`)
    }
    if (daughters.length > 0) {
      kidParts.push(`生女${daughters.length}：${daughters.map(d => people[d].name).join("、")}`)
    }
    if (kidParts.length > 0) parts.push(kidParts.join("，") + "。")
  }

  if (p.note) parts.push(p.note)
  if (p.clan) parts.push(`族系：${p.clan}。`)

  return {
    personId: pid,
    personName: p.name,
    formattedText: parts.join(""),
    generation: gen,
    gender: p.gender,
  }
}

// ── Flatten tree ──

function collectEntries(
  node: GenNode,
  people: Record<string, Person>,
  families: Record<string, FamilyUnit>,
  entries: LineageEntry[],
  visited: Set<string>,
) {
  if (visited.has(node.pid)) return
  visited.add(node.pid)
  entries.push(formatEntry(node.pid, node.gen, people, families))
  for (const kid of node.kids) {
    collectEntries(kid, people, families, entries, visited)
  }
}

// ── Dynamic entries per page ──

function calcEntriesPerPage(opts: LayoutOptions): number {
  const fontSize = opts.fontSize ?? 12
  const lineHeight = opts.lineHeight ?? 1.9
  const columns = opts.columns ?? 1
  const paper = opts.paper ?? "A4"
  const margin = opts.marginPreset ?? "standard"

  // Base: A4, 12pt, 1.9lh, 1 column, standard margins → 15 entries
  const base = 15

  // Paper area ratio (A3 ≈ 2× A4, but usable area scales ~1.8×)
  const paperRatio = paper === "A3" ? 1.8 : 1

  // Font size: larger → fewer entries (inverse square-ish because both width & height affected)
  const fontFactor = Math.pow(12 / fontSize, 1.6)

  // Line height: larger → fewer entries
  const lineFactor = 1.9 / lineHeight

  // Columns: more → more entries
  const colFactor = columns

  // Margin: compact +15%, loose -15%
  const marginFactor = margin === "compact" ? 1.15 : margin === "loose" ? 0.85 : 1

  return Math.max(5, Math.round(base * paperRatio * fontFactor * lineFactor * colFactor * marginFactor))
}

// ── Pagination ──

export function paginate(entries: LineageEntry[], rootIds: string[], opts: LayoutOptions): LineagePage[] {
  const perPage = calcEntriesPerPage(opts)
  const pages: LineagePage[] = []
  for (let i = 0; i < entries.length; i += perPage) {
    pages.push({
      pageNumber: pages.length + 1,
      entries: entries.slice(i, i + perPage),
      rootPersonIds: rootIds,
    })
  }
  return pages
}

// ── Main export ──

export function computeLineageText(data: PublicationData, opts: LayoutOptions = {}): LineagePage[] {
  const { people, families } = data
  if (Object.keys(people).length === 0) return []

  if (Object.keys(families).length === 0 && Object.keys(people).length === 1) {
    const pid = Object.keys(people)[0]
    const entry = formatEntry(pid, 0, people, families)
    return paginate([entry], [pid], opts)
  }

  const roots = findRoots(people, families)
  if (roots.length === 0) return []

  const allEntries: LineageEntry[] = []
  const globalVisited = new Set<string>()

  for (const rid of roots) {
    const visited = new Set<string>()
    const rootNode = buildNode(rid, families, 0, visited)
    collectEntries(rootNode, people, families, allEntries, globalVisited)
  }

  return paginate(allEntries, roots, opts)
}
