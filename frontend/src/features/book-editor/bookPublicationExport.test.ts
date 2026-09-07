import { describe, expect, it } from "vitest"
import type { PublicationData } from "../../types/family"
import { buildPublicationMarkdown } from "./bookPublicationExport"

const publication: PublicationData = {
  title: "测试族谱",
  subtitle: "甲房",
  focusFamilyId: "f1",
  people: {
    p1: { id: "p1", name: "甲", gender: "male", avatarUrl: "/api/photos/1" },
    p2: { id: "p2", name: "乙", gender: "male", birth: "1900", note: "备注" },
    p3: { id: "p3", name: "丙", gender: "female", clan: "丁" },
  },
  families: {
    f1: { id: "f1", adults: ["p1"], children: ["p2"] },
  },
  info: { ancestralOrigin: "某地", hallName: "某堂", familyMotto: "慎终追远" },
}

describe("bookPublicationExport", () => {
  it("generates simple markdown in lineage order", () => {
    const markdown = buildPublicationMarkdown(publication)

    expect(markdown).toContain("# 测试族谱\n\n甲房\n\n- 原籍：某地\n\n- 堂号：某堂\n\n- 家训：慎终追远")
    expect(markdown).toContain("## 第 1 世\n\n### 甲\n- 世代：第 1 世\n- 性别：男\n- 子女：乙")
    expect(markdown).toContain("## 第 2 世\n\n### 乙")
  })

  it("keeps disconnected people in a separate section", () => {
    expect(buildPublicationMarkdown(publication)).toContain("## 其他人物\n\n### 丙\n- 世代：第 1 世\n- 性别：女")
  })
})
