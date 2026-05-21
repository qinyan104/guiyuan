import type { BookSheetLayout, LinePlacement, PageAnchor, PersonCardPlacement, TraditionalLayoutOptions } from "../types/publishing"
import type { FamilyUnit, Person, PublicationData } from "../types/family"

const TOP = 20; const BOT = 25; const LEFT = 15; const RIGHT = 15
const MAX_GEN = 5; const GEN_GAP = 8; const SIB_GAP = 4

function dims(p: "A4"|"A3") { return p==="A3" ? {w:297,h:420} : {w:210,h:297} }
function uw(p: "A4"|"A3") { return dims(p).w - LEFT - RIGHT }

interface GenNode { pid: string; spId?: string; gen: number; si: number; ts: number; kids: GenNode[] }
interface PgBuild { num: number; nodes: GenNode[]; roots: string[]; parent?: number; childPages: number[] }

// Step 1: Find roots (not children AND is first adult or solo)
function findRoots(people: Record<string,Person>, families: Record<string,FamilyUnit>): string[] {
  const kids = new Set<string>()
  for (const f of Object.values(families)) for (const c of f.children) kids.add(c)
    const totalPeople = Object.keys(people).length
  return Object.keys(people).filter(id => {
    // Exclude orphan spouses with no family connections (unless solo person)
    const hasAnyConn = Object.values(families).some(f => f.adults.includes(id) || f.children.includes(id))
    if (!hasAnyConn && totalPeople > 1) return false
    if (kids.has(id)) return false
    for (const f of Object.values(families)) if (f.adults[0]===id) return true
    return !Object.values(families).some(f => f.adults.includes(id))
  })
}

// Step 2: Build tree
function buildNode(pid: string, families: Record<string,FamilyUnit>, gen: number, si: number, ts: number, visited: Set<string>): GenNode {
  const node: GenNode = { pid, gen, si, ts, kids: [] }
  if (visited.has(pid)) return node
  visited.add(pid)
  const myFams = Object.values(families).filter(f => f.adults[0]===pid)
  // Collect all children across families
  const allKids: string[] = []
  for (const f of myFams) {
    if (f.adults.length>1) node.spId = f.adults[1]
    for (const c of f.children) allKids.push(c)
  }
  // Also check families where pid is not first adult (uxorilocal case)
  for (const f of Object.values(families)) {
    if (f.adults.length>1 && f.adults[1]===pid) {
      for (const c of f.children) allKids.push(c)
      node.spId = f.adults[0]
    }
  }
  const uniqueKids = [...new Set(allKids)]
  for (let i=0; i<uniqueKids.length; i++) {
    node.kids.push(buildNode(uniqueKids[i], families, gen+1, i, uniqueKids.length, visited))
  }
  visited.delete(pid)
  return node
}

// Step 3+4: Slice into pages
function sliceNode(node: GenNode, pageGen: number, page: PgBuild, pages: PgBuild[], opts: TraditionalLayoutOptions, parentPageNum?: number) {
  if (pageGen >= MAX_GEN) {
    // Start new page
    const newPg: PgBuild = { num: pages.length+1, nodes: [], roots: [node.pid], parent: page.num, childPages: [] }
    const cloned = { ...node, gen: 0, kids: node.kids.map(k => ({...k, gen: 0})) }
    newPg.nodes.push(cloned)
    page.childPages.push(newPg.num)
    pages.push(newPg)
    for (const kid of cloned.kids) {
      sliceNode(kid, 1, newPg, pages, opts, page.num)
    }
  } else {
    const pgNode = { ...node, gen: pageGen }
    page.nodes.push(pgNode)
    for (const kid of node.kids) {
      sliceNode(kid, pageGen+1, page, pages, opts)
    }
  }
  // Horizontal overflow check for this page
  checkOverflow(page, opts, pages)
}

function checkOverflow(page: PgBuild, opts: TraditionalLayoutOptions, pages: PgBuild[]) {
  const cardW = opts.cardWidth + SIB_GAP
  const maxW = uw(opts.paper) - SIB_GAP
  const perRow = Math.max(1, Math.floor(maxW / cardW))
  // Group nodes by gen
  const byGen = new Map<number, GenNode[]>()
  for (const n of page.nodes) {
    const arr = byGen.get(n.gen) || []
    arr.push(n); byGen.set(n.gen, arr)
  }
  for (const [gen, nodes] of byGen) {
    if (nodes.length <= perRow) continue
    // Split: first perRow stay, rest go to new pages
    const groups: GenNode[][] = []
    for (let i=0; i<nodes.length; i+=perRow) groups.push(nodes.slice(i, i+perRow))
    // Remove overflow nodes from page
    page.nodes = page.nodes.filter(n => n.gen!==gen || groups[0].includes(n as any))
    // Create continuation pages for remaining groups
    for (let g=1; g<groups.length; g++) {
      const contPg: PgBuild = { num: pages.length+1, nodes: groups[g], roots: page.roots, parent: page.num, childPages: [] }
      pages.push(contPg)
    }
  }
}

// Step 5: Anchors
function makeAnchors(pages: PgBuild[]): Map<number, PageAnchor[]> {
  const map = new Map<number, PageAnchor[]>()
  for (const pg of pages) {
    const anchors: PageAnchor[] = []
    if (pg.parent) anchors.push({ direction:"top", label:`父见第${pg.parent}页`, targetPage:pg.parent })
    for (const cp of pg.childPages) anchors.push({ direction:"bottom", label:`子转第${cp}页`, targetPage:cp })
    // Check for sibling continuation
    const prevPg = pages.find(p => p.num === pg.num - 1 && JSON.stringify(p.roots)===JSON.stringify(pg.roots))
    if (prevPg) anchors.push({ direction:"left", label:`左承第${prevPg.num}页`, targetPage:prevPg.num })
    map.set(pg.num, anchors)
  }
  // Add right anchors
  for (const pg of pages) {
    const nextPg = pages.find(p => p.num === pg.num + 1 && JSON.stringify(p.roots)===JSON.stringify(pg.roots))
    if (nextPg) {
      const a = map.get(pg.num) || []
      a.push({ direction:"right", label:`右续第${nextPg.num}页`, targetPage:nextPg.num })
      map.set(pg.num, a)
    }
  }
  return map
}

// Position cards
function positionCards(page: PgBuild, opts: TraditionalLayoutOptions): PersonCardPlacement[] {
  const cw = opts.cardWidth; const ch = opts.cardHeight
  // Group by gen, sort by si within gen
  const byGen = new Map<number, GenNode[]>()
  for (const n of page.nodes) {
    const arr = byGen.get(n.gen) || []
    arr.push(n); byGen.set(n.gen, arr)
  }
  const cards: PersonCardPlacement[] = []
  for (const [gen, nodes] of byGen) {
    nodes.sort((a,b) => a.si - b.si)
    for (let i=0; i<nodes.length; i++) {
      cards.push({ personId: nodes[i].pid, x: LEFT + i*(cw+SIB_GAP), y: TOP + gen*(ch+GEN_GAP), generation: gen })
    }
  }
  return cards
}

// Generate lines
function generateLines(page: PgBuild, cards: PersonCardPlacement[], opts: TraditionalLayoutOptions, data: PublicationData): LinePlacement[] {
  const lines: LinePlacement[] = []
  const cardMap = new Map(cards.map(c => [c.personId, c]))
  const ch = opts.cardHeight
  for (const n of page.nodes) {
    const parentCard = cardMap.get(n.pid)
    if (!parentCard) continue
    for (const kid of n.kids) {
      const kidCard = cardMap.get(kid.pid)
      if (!kidCard) continue
      const px = parentCard.x + opts.cardWidth/2
      const py = parentCard.y + ch
      const kx = kidCard.x + opts.cardWidth/2
      const ky = kidCard.y
      lines.push({
        fromPersonId: n.pid, toPersonId: kid.pid,
        points: [
          {x:px, y:py}, {x:px, y:(py+ky)/2}, {x:kx, y:(py+ky)/2}, {x:kx, y:ky}
        ]
      })
    }
  }
  return lines
}

// Main export
export function computeTraditionalLayout(data: PublicationData, options?: TraditionalLayoutOptions): BookSheetLayout[] {
  const opts = { paper:"A4" as const, cardWidth:30, cardHeight:15, ...options }
  const d = dims(opts.paper)
  
  if (Object.keys(data.people).length === 0) return []
  
  // Handle solo person
  if (Object.keys(data.families).length === 0 && Object.keys(data.people).length === 1) {
    const pid = Object.keys(data.people)[0]
    return [{
      sheetNumber:1, sheetType:"genealogy", dimensions:{width:d.w,height:d.h},
      rootPersonIds:[pid],
      elements: { personCards:[{personId:pid, x:LEFT, y:TOP, generation:0}], connectionLines:[], anchors:[] }
    }]
  }
  
  const roots = findRoots(data.people, data.families)
  const pages: PgBuild[] = []
  
  for (const rid of roots) {
    const visited = new Set<string>()
    const rootNode = buildNode(rid, data.families, 0, 0, roots.length, visited)
    const initPg: PgBuild = { num: pages.length+1, nodes: [], roots: [rid], childPages: [] }
    pages.push(initPg)
    sliceNode(rootNode, 0, initPg, pages, opts)
  }
  
  // Renumber pages
  for (let i=0; i<pages.length; i++) pages[i].num = i+1
  
  const anchorMap = makeAnchors(pages)
  
  return pages.map(pg => {
    const cards = positionCards(pg, opts)
    const lines = generateLines(pg, cards, opts, data)
    return {
      sheetNumber: pg.num, sheetType: "genealogy",
      dimensions: { width:d.w, height:d.h },
      rootPersonIds: pg.roots,
      elements: { personCards:cards, connectionLines:lines, anchors:anchorMap.get(pg.num)||[] },
      continuationOf: pg.parent,
      continuesTo: pg.childPages.length>0 ? pg.childPages : undefined
    }
  })
}

