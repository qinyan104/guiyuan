import { describe, it, expect } from "vitest"
import { computeTraditionalLayout } from "./traditionalLayout"
import type { PublicationData, Person, FamilyUnit } from "../types/family"

function p(id: string, name: string, gender: "male" | "female" = "male"): Person { return { id, name, gender } }
function f(id: string, adults: string[], children: string[]): FamilyUnit { return { id, adults, children } }

function linearTree(generations: number): PublicationData {
  const people: Record<string, Person> = {}
  const families: Record<string, FamilyUnit> = {}
  for (let i = 0; i < generations; i++) {
    const pid = "gen" + i; const spId = "sp" + i
    people[pid] = p(pid, "D" + (i+1) + "S")
    people[spId] = p(spId, "P" + (i+1), "female")
    if (i > 0) families["f" + i] = f("f" + i, ["gen" + (i-1), "sp" + (i-1)], [pid])
  }
  return { title: "T", subtitle: "", focusFamilyId: "", people, families }
}

describe("traditionalLayout", () => {
  it("1. single root 3 gens -> 1 page", () => {
    const s = computeTraditionalLayout(linearTree(3))
    expect(s.length).toBe(1)
    expect(s[0].elements.personCards.map(c => c.personId)).toContain("gen0")
  })
  it("2. 8 gens -> multi page, gen5+ not on first", () => {
    const s = computeTraditionalLayout(linearTree(8))
    expect(s.length).toBeGreaterThanOrEqual(2)
    const firstIds = s[0].elements.personCards.map(c => c.personId).filter((id: string) => id.startsWith("gen"))
    if (firstIds.length > 0) {
      const maxG = Math.max(...firstIds.map((id: string) => parseInt(id.slice(3), 10)))
      expect(maxG).toBeLessThanOrEqual(4)
    }
  })
  it("3. three roots -> all appear", () => {
    const pp: Record<string, Person> = {}; const ff: Record<string, FamilyUnit> = {}
    for (let r = 0; r < 3; r++) {
      const rid = "r" + r; pp[rid] = p(rid, "Z"+(r+1)); pp[rid+"_s"] = p(rid+"_s","P","female")
      const cid = rid+"_c"; pp[cid] = p(cid,"Z"); ff["f"+r] = f("f"+r,[rid,rid+"_s"],[cid])
    }
    const all = computeTraditionalLayout({title:"",subtitle:"",focusFamilyId:"",people:pp,families:ff}).flatMap(s=>s.elements.personCards.map(c=>c.personId))
    expect(all).toContain("r0"); expect(all).toContain("r2")
  })
  it("4. 20 siblings -> horizontal overflow", () => {
    const pp: Record<string, Person> = { r: p("r","Z"), rs: p("rs","P","female") }
    const ch: string[] = []
    for (let i=0;i<20;i++) { const c="c"+i; pp[c]=p(c,"Z"+(i+1)); ch.push(c) }
    expect(computeTraditionalLayout({title:"",subtitle:"",focusFamilyId:"",people:pp,families:{f0:f("f0",["r","rs"],ch)}}).length).toBeGreaterThanOrEqual(2)
  })
  it("5. empty data -> []", () => {
    expect(computeTraditionalLayout({title:"",subtitle:"",focusFamilyId:"",people:{},families:{}})).toEqual([])
  })
  it("6. cycle -> no throw", () => {
    const pp = { a:p("a","A"), b:p("b","B"), c:p("c","C") }
    const ff = { f1:f("f1",["a"],["b"]), f2:f("f2",["b"],["c"]), f3:f("f3",["c"],["a"]) }
    expect(()=>computeTraditionalLayout({title:"",subtitle:"",focusFamilyId:"",people:pp,families:ff})).not.toThrow()
  })
  it("7. anchors bidirectional verify", () => {
    const s = computeTraditionalLayout(linearTree(8))
    for (const sh of s) for (const a of sh.elements.anchors) {
      if (a.direction === "bottom") {
        const t = s.find(x => x.sheetNumber === a.targetPage)
        expect(t).toBeDefined()
        if (t) expect(t.elements.anchors.some(x => x.direction === "top" && x.targetPage === sh.sheetNumber)).toBe(true)
      }
    }
  })
  it("8. solo person -> 1 page", () => {
    const s = computeTraditionalLayout({title:"",subtitle:"",focusFamilyId:"",people:{solo:p("solo","DG")},families:{}})
    expect(s.length).toBe(1)
    expect(s[0].elements.personCards[0].personId).toBe("solo")
  })
})
