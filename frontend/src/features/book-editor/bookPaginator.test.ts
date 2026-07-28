import { describe, expect, it } from "vitest"
import type { BookDocument } from "../../types/bookDocument"
import { paginateBook } from "./bookPaginator"

function simpleBook(): BookDocument {
  return {
    publicationId: 7,
    title: "张氏族谱",
    layout: {
      templateId: "classic",
      fontFamily: "qiji-combo",
      fontSize: 18,
      marginPreset: "standard",
    },
    blocks: [
      { type: "cover", title: "张氏族谱", subtitle: "归源堂" },
      { type: "generationHeading", generation: 1, text: "第一世" },
      {
        type: "person",
        personId: "p-1",
        personName: "张一",
        generation: 1,
        text: `${"甲".repeat(29)}乙`,
      },
    ],
  }
}

describe("paginateBook", () => {
  it("为简单书稿产出可供预览和 PDF 共用的规范化排版结果", () => {
    const book = simpleBook()
    const result = paginateBook(book)

    expect(paginateBook(book)).toEqual(result)
    expect(result.metrics).toMatchObject({
      pageWidth: 1240,
      pageHeight: 1754,
      pageMargin: 168,
      charsPerColumn: 29,
      columnsPerPage: 19,
    })
    expect(result.metrics.bodyFontSize).toBeCloseTo(30.6)
    expect(result.metrics.columnGap).toBeCloseTo(47.43)
    expect(result.pages.map((page) => page.blocks.map((item) => item.block.type))).toEqual([
      ["cover"],
      ["generationHeading", "person"],
    ])

    expect(result.pages[0].blocks[0]).toMatchObject({
      blockIndex: 0,
      columnSpan: 0,
      fontFamily: "qiji-combo",
      columns: [],
    })
    expect(result.pages[1].blocks[1]).toMatchObject({
      blockIndex: 2,
      columnSpan: 2,
      fontFamily: "qiji-combo",
      columns: [
        {
          text: "甲".repeat(29),
          runs: [{ text: "甲".repeat(29), fontFamily: "qiji-combo" }],
        },
        {
          text: "乙",
          runs: [{ text: "乙", fontFamily: "qiji-combo" }],
        },
      ],
    })
  })
})
