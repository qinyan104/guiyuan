import { describe, expect, it } from "vitest"
import type { PublicationData } from "../../types/family"
import { buildPublicationMarkdown } from "./bookPublicationExport"

const publication: PublicationData = {
  title: "测试族谱",
  subtitle: "甲房",
  focusFamilyId: "f1",
  people: {
    p1: { id: "p1", name: "甲", gender: "male", birth: "1900年", death: "1970年", age: "71岁", titleName: "守诚" },
    p2: { id: "p2", name: "李", gender: "female" },
    p3: { id: "p3", name: "乙", gender: "male", birth: "1920-1-2", note: "迁居某地" },
    p4: { id: "p4", name: "丙", gender: "female" },
    p5: { id: "p5", name: "丁", gender: "unknown" },
  },
  families: {
    f1: { id: "f1", adults: ["p1", "p2"], children: ["p3", "p4", "p5"] },
  },
  info: { description: "本支自甲公始。", ancestralOrigin: "某地", hallName: "某堂", familyMotto: "慎终追远", revisionNotes: "初次整理" },
}

describe("bookPublicationExport", () => {
  it("uses traditional genealogy wording for lineage records", () => {
    const markdown = buildPublicationMarkdown(publication)

    expect(markdown).toContain("## 一世\n\n### 甲\n\n甲公，字（号）守诚，生于一九〇〇年，卒于一九七〇年，享年七十一岁，配李氏，生子女三：长子乙、次女丙、三子女丁。")
    expect(markdown).toContain("## 谱序\n\n本支自甲公始。\n\n原籍某地，堂号某堂，家训为“慎终追远”。\n\n修订说明：初次整理")
    expect(markdown).toContain("## 二世\n\n### 乙\n\n乙公，生于一九二〇年一月二日，附记：迁居某地。")
    expect(markdown).not.toContain("- 性别：")
  })

  it("does not repeat spouses as unrelated people", () => {
    const markdown = buildPublicationMarkdown(publication)

    expect(markdown).toContain("配李氏")
    expect(markdown).not.toContain("### 李")
  })

  it("uses the lineage entry person when a focused family is a branch", () => {
    const focusedBranch = {
      ...publication,
      focusFamilyId: "f2",
      families: { ...publication.families, f2: { id: "f2", adults: ["p2", "p3"], children: [] } },
    }

    expect(buildPublicationMarkdown(focusedBranch)).toContain("## 二世\n\n### 乙")
  })

  it("keeps disconnected people with an explicit unknown generation", () => {
    const disconnected = { ...publication, people: { ...publication.people, p6: { id: "p6", name: "戊", gender: "male" as const } } }

    expect(buildPublicationMarkdown(disconnected)).toContain("## 其他人物\n\n### 戊\n\n戊公，世次不详。")
  })
})
