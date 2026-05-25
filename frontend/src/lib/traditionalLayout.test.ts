import { describe, it, expect } from "vitest"
import { layoutPublication } from "./layout"
import type { PublicationData, Person, FamilyUnit, PublicationSettings } from "../types/family"

function p(id: string, name: string, gender: "male" | "female" = "male"): Person {
  return { id, name, gender }
}

function f(id: string, adults: string[], children: string[]): FamilyUnit {
  return { id, adults, children }
}

function settings(): PublicationSettings {
  return {
    paper: "A3",
    layoutMode: "su",
    cardWidth: 222,
    generationGap: 88,
    siblingGap: 44,
    partnerGap: 18,
    fontScale: 1.1,
    zoom: 1,
    showCard: true,
    showBirth: true,
    showDeath: true,
    showAge: true,
    showNote: false,
    showStatus: true,
    showLineage: true,
    showPhoto: false,
    paddingX: 28,
    paddingY: 36,
  }
}

function linearTree(generations: number): PublicationData {
  const people: Record<string, Person> = {}
  const families: Record<string, FamilyUnit> = {}

  for (let i = 0; i < generations; i++) {
    const pid = `gen${i}`
    const spId = `sp${i}`
    people[pid] = p(pid, `D${i + 1}S`)
    people[spId] = p(spId, `P${i + 1}`, "female")
    if (i > 0) families[`f${i}`] = f(`f${i}`, [`gen${i - 1}`, `sp${i - 1}`], [pid])
  }

  return { title: "T", subtitle: "", focusFamilyId: "", people, families }
}

describe("layoutPublication", () => {
  it("produces a page for a small tree", () => {
    const layout = layoutPublication(linearTree(3), settings())
    expect(layout.pageCount).toBeGreaterThanOrEqual(1)
    expect(layout.cards.length).toBeGreaterThan(0)
  })

  it("supports multiple generations without throwing", () => {
    expect(() => layoutPublication(linearTree(8), settings())).not.toThrow()
  })

  it("handles empty data", () => {
    const layout = layoutPublication({ title: "", subtitle: "", focusFamilyId: "", people: {}, families: {} }, settings())
    expect(layout.cards).toEqual([])
  })
})
