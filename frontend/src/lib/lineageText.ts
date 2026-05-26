import type { LineageEntry, LineagePage } from "../types/publishing"
import type { FamilyUnit, Gender, Person, PublicationData } from "../types/family"
import { getCanvasConfig, getTextArea } from "./bookLayout/CanvasConfig"

interface GenNode { pid: string; spId?: string; gen: number; kids: GenNode[] }

export interface LayoutOptions {
  fontSize?: number
  lineHeight?: number
  columns?: number
  marginPreset?: "compact" | "standard" | "loose"
  paper?: "A4" | "A3"
  canvasId?: string
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
  // 此人作为 adults[0] 的所有家庭
  const myFams = Object.values(families).filter(f => f.adults[0] === pid)
  const allKids: string[] = []
  for (const f of myFams) {
    if (f.adults.length > 1) node.spId = f.adults[1]
    // 外嫁女：子女不入本族世系
    if (f.branchMode === "married-out") continue
    for (const c of f.children) allKids.push(c)
  }
  // 此人作为 adults[1] 的家庭（配偶关系）
  for (const f of Object.values(families)) {
    if (f.adults.length > 1 && f.adults[1] === pid) {
      // 招婿：子女归入女方（adults[0]）的世系
      if (f.branchMode === "uxorilocal") {
        // 子女已在 adults[0] 的 myFams 中处理
      } else {
        for (const c of f.children) allKids.push(c)
      }
      if (!node.spId) node.spId = f.adults[0]
    }
  }
  // 子女递归
  for (const kid of [...new Set(allKids)]) {
    node.kids.push(buildNode(kid, families, gen + 1, visited))
  }
  visited.delete(pid)
  return node
}

// ── Text generation ──

/** 排行前缀 */
const ORDINALS = ["長", "次", "三", "四", "五", "六", "七", "八", "九", "十"]

function ordinal(i: number): string {
  return ORDINALS[i] || `${i + 1}`
}

/** 阿拉伯数字 → 汉字（年份用逐位法，普通数字用进位法） */
function numToCn(n: number): string {
  if (n === 0) return "零"
  const digits = "零一二三四五六七八九"
  // 1000–2099 的年份：逐位转换（一九三一、二零零一）
  if (n >= 1000 && n <= 2099) {
    return String(n).split("").map(d => digits[+d]).join("")
  }
  // 普通数字：进位法（八十、二百五）
  const units = ["", "十", "百", "千"]
  let s = ""
  let u = 0
  let hasContent = false
  while (n > 0) {
    const d = n % 10
    if (d > 0) {
      s = (u > 0 && d === 1 && u === 1 && !hasContent ? "" : digits[d]) + units[u] + s
      hasContent = true
    } else if (hasContent && u === 0) {
      s = digits[0] + s
    }
    n = Math.floor(n / 10)
    u++
  }
  return s.replace(/零+$/, "")
}

/** 去掉文本中的地点信息 */
function stripLocation(s: string): string {
  // 括号内容
  s = s.replace(/[（(][^)）]*[)）]/g, "")
  // 常见省市区县
  s = s.replace(/[省市区县乡镇村]{1,2}/g, "")
  // 常见方位词+地名模式
  s = s.replace(/[东西南北]?[京津沪渝苏浙皖闽赣鲁豫鄂湘粤桂琼川黔滇藏陕甘青宁蒙新台港][\w]{0,4}/g, "")
  // 常见地名后缀词
  s = s.replace(/[東西南北]?[京津滬渝蘇浙皖閩贛魯豫鄂湘粵桂瓊川黔滇藏陝甘青寧蒙新臺港][\w]{0,4}/g, "")
  // 清理多余空格和标点
  s = s.replace(/\s+/g, "")
  s = s.replace(/，+/g, "，")
  s = s.replace(/。。/g, "。")
  s = s.replace(/^[，。]/, "")
  return s
}

function formatEntry(
  pid: string, gen: number,
  people: Record<string, Person>,
  families: Record<string, FamilyUnit>,
  s?: LineageSettings,
): LineageEntry {
  const p = people[pid]
  if (!p) return { personId: pid, personName: pid, formattedText: pid, generation: gen, gender: "unknown" as const }

  const parts: string[] = []

  // ── 姓名 ──
  if (p.gender === "male") {
    if (p.titleName) {
      parts.push(`${p.titleName}公，諱${p.name}`)
    } else {
      parts.push(`公諱${p.name}`)
    }
  } else if (p.gender === "female") {
    // 女性有姓氏则标某氏
    const clanName = p.clan || p.name
    parts.push(`${clanName}`)
  } else {
    parts.push(`${p.name}`)
  }

  // ── 生卒（已过滤地名） ──
  const bio: string[] = []
  if (p.birth) bio.push(`生於${stripLocation(p.birth)}`)
  if (p.death) bio.push(`卒於${stripLocation(p.death)}`)
  if (p.age) {
    const ageWord = p.gender === "male" ? "享壽" : "享年"
    bio.push(`${ageWord}${p.age}`)
  }
  if (bio.length > 0) parts.push("。" + bio.join("，") + "。")

  // ── 配偶（含生卒信息） ──
  const fams = Object.values(families).filter(f => f.adults.includes(pid))
  const spouseEntries: string[] = []
  for (let i = 0; i < fams.length; i++) {
    const f = fams[i]
    const spouseId = f.adults.find(a => a !== pid)
    if (spouseId && people[spouseId]) {
      const s = people[spouseId]
      // 招婿：女为主，男为"贅"；外嫁：女"適"男
      const isUxori = f.branchMode === "uxorilocal"
      const prefix = p.gender === "female"
        ? (isUxori ? "招" : "適")
        : (isUxori ? "贅" : i === 0 ? "元配" : "繼配")
      const sParts: string[] = [prefix + s.name]
      if (s.birth) sParts.push(`生於${stripLocation(s.birth)}`)
      if (s.death) sParts.push(`卒於${stripLocation(s.death)}`)
      if (s.age) sParts.push(`享年${s.age}`)
      spouseEntries.push(sParts.join("，"))
    }
  }
  if (spouseEntries.length > 0) parts.push("。" + spouseEntries.join("，") + "。")

  // ── 子女 ──
  const children = fams.flatMap(f => f.children).filter(c => people[c])
  if (children.length > 0) {
    const sons = children.filter(c => people[c]?.gender === "male")
    const daughters = children.filter(c => people[c]?.gender === "female")
    const kidParts: string[] = []
    if (sons.length > 0) {
      kidParts.push(`子${sons.length}：${sons.map((s, i) => `${ordinal(i)}${people[s].name}`).join("、")}`)
    }
    if (daughters.length > 0) {
      kidParts.push(`女${daughters.length}：${daughters.map((d, i) => `${ordinal(i)}${people[d].name}`).join("、")}`)
    }
    if (kidParts.length > 0) parts.push("。" + kidParts.join("，") + "。")
  }

  // ── 備註 ──
  if (p.note) parts.push("。" + p.note)

  let text = parts.join("")
  // 阿拉伯数字 → 汉字（可关闭）
  if (s?.cnNumeral !== false) {
    text = text.replace(/\d+/g, (m) => numToCn(parseInt(m)))
  }
  // 去掉地点（可关闭）
  if (s?.hideLocation !== false) {
    text = stripLocation(text)
  }

  return {
    personId: pid,
    personName: p.name,
    formattedText: text,
    generation: gen,
    gender: p.gender,
  }
}

// ── Flatten tree ──

/** 按世代分层收集：同一世代内按支系长幼排列 */
function collectByGeneration(
  roots: GenNode[],
  people: Record<string, Person>,
  families: Record<string, FamilyUnit>,
  s: LineageSettings,
): LineageEntry[] {
  const entries: LineageEntry[] = []
  const visited = new Set<string>()
  // BFS：世代优先
  let currentGen: GenNode[] = roots
  while (currentGen.length > 0) {
    const nextGen: GenNode[] = []
    for (const node of currentGen) {
      if (visited.has(node.pid)) continue
      visited.add(node.pid)
      entries.push(formatEntry(node.pid, node.gen, people, families, s))
      // 子女按数组中顺序（即长幼序）入下一世代
      for (const kid of node.kids) {
        if (!visited.has(kid.pid)) nextGen.push(kid)
      }
    }
    currentGen = nextGen
  }
  return entries
}

/** DFS：按支系深度优先（父→子→孙一条线走到底） */
function collectDFS(
  roots: GenNode[],
  people: Record<string, Person>,
  families: Record<string, FamilyUnit>,
  s: LineageSettings,
): LineageEntry[] {
  const entries: LineageEntry[] = []
  const visited = new Set<string>()
  function walk(node: GenNode) {
    if (visited.has(node.pid)) return
    visited.add(node.pid)
    entries.push(formatEntry(node.pid, node.gen, people, families, s))
    for (const kid of node.kids) walk(kid)
  }
  for (const r of roots) walk(r)
  return entries
}

/** 收集配偶为独立条目 */
function addSpouseEntries(
  node: GenNode,
  people: Record<string, Person>,
  families: Record<string, FamilyUnit>,
  entries: LineageEntry[],
  visited: Set<string>,
  s: LineageSettings,
) {
  const myFams = Object.values(families).filter(f => f.adults.includes(node.pid))
  for (const f of myFams) {
    const spouseId = f.adults.find(a => a !== node.pid)
    if (spouseId && people[spouseId] && !visited.has(spouseId)) {
      visited.add(spouseId)
      entries.push(formatEntry(spouseId, node.gen, people, families, s))
    }
  }
  for (const kid of node.kids) addSpouseEntries(kid, people, families, entries, visited, s)
}

// ── Dynamic entries per page ──

function calcEntriesPerPage(opts: LayoutOptions, canvasId?: string): number {
  const fontSize = opts.fontSize ?? 12
  const lineHeight = opts.lineHeight ?? 1.9
  const columns = opts.columns ?? 1

  // 有模板时按实际文本区计算
  if (canvasId) {
    try {
      const { getCanvasConfig } = require("./CanvasConfig")
      const cfg = getCanvasConfig(canvasId)
      const ta = getTextArea(cfg)
      const pxFontSize = fontSize * 4 / 3
      const charsPerCol = Math.floor(ta.height / (pxFontSize * lineHeight))
      const colsUsed = Math.min(columns, cfg.leafCol)
      return Math.max(5, charsPerCol * colsUsed)
    } catch { /* fall through */ }
  }

  // 回退：经验公式
  const lineFactor = 1.9 / lineHeight
  const colFactor = columns
  const fontFactor = Math.pow(12 / fontSize, 1.6)
  return Math.max(5, Math.round(15 * fontFactor * lineFactor * colFactor))
}

// ── Pagination ──

export function paginate(entries: LineageEntry[], rootIds: string[], opts: LayoutOptions, canvasId?: string): LineagePage[] {
  const perPage = calcEntriesPerPage(opts, canvasId)
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

export interface LineageSettings {
  sortGenFirst?: boolean
  showSpouses?: boolean
  hideLocation?: boolean
  cnNumeral?: boolean
}

export function computeLineageText(data: PublicationData, opts: LayoutOptions = {}, settings: LineageSettings = {}): LineagePage[] {
  const { people, families, info } = data
  const pubInfo = info ? { ancestralOrigin: info.ancestralOrigin, hallName: info.hallName } : undefined
  const s = { sortGenFirst: true, showSpouses: false, hideLocation: true, cnNumeral: true, ...settings }

  if (Object.keys(people).length === 0) return []

  if (Object.keys(families).length === 0 && Object.keys(people).length === 1) {
    const pid = Object.keys(people)[0]
    const entry = formatEntry(pid, 0, people, families, s)
    return paginate([entry], [pid], opts)
  }

  const roots = findRoots(people, families)
  if (roots.length === 0) return []

  // 构建所有根节点的树
  const rootNodes: GenNode[] = []
  for (const rid of roots) {
    const visited = new Set<string>()
    rootNodes.push(buildNode(rid, families, 0, visited))
  }

  // BFS（按世代）或 DFS（按支系）
  const allEntries = s.sortGenFirst
    ? collectByGeneration(rootNodes, people, families, s)
    : collectDFS(rootNodes, people, families, s)

  // 女性独立条目
  if (s.showSpouses) {
    const spouseEntries: LineageEntry[] = []
    const spouseVisited = new Set(allEntries.map(e => e.personId))
    for (const r of rootNodes) addSpouseEntries(r, people, families, spouseEntries, spouseVisited, s)
    // 按世代插入
    for (const se of spouseEntries) {
      const idx = allEntries.findIndex(e => e.generation > se.generation)
      if (idx === -1) allEntries.push(se)
      else allEntries.splice(idx, 0, se)
    }
  }

  return paginate(allEntries, roots, opts, opts.canvasId)
}
