import { describe, expect, it } from "vitest"
import type { BookDocument } from "../../types/bookDocument"
import { CJK_FALLBACK_FONT, CJK_FALLBACK_FONTS } from "./bookFonts"
import { paginateBook } from "./bookPaginator"

const EXTENSION_C_CHARACTER = String.fromCodePoint(0x2a700)
const EXTENSION_G_CHARACTER = String.fromCodePoint(0x30000)

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

function pageLabels(result: ReturnType<typeof paginateBook>) {
  return result.pages.map((page) => page.blocks.map(({ block }) => block.type === "person" ? block.personName : block.type))
}

describe("paginateBook", () => {
  it.each([
    ["首选字体完全支持", "甲乙", [
      { text: "甲乙", fontFamily: "XiaolaiMonoSC" },
    ]],
    ["单个汉字缺失", "甲龘乙", [
      { text: "甲", fontFamily: "XiaolaiMonoSC" },
      { text: "龘", fontFamily: CJK_FALLBACK_FONT },
      { text: "乙", fontFamily: "XiaolaiMonoSC" },
    ]],
    ["中文标点缺失", "甲，乙", [
      { text: "甲", fontFamily: "XiaolaiMonoSC" },
      { text: "，", fontFamily: CJK_FALLBACK_FONT },
      { text: "乙", fontFamily: "XiaolaiMonoSC" },
    ]],
    ["连续混合字体片段", "甲乙龘，丙丁", [
      { text: "甲乙", fontFamily: "XiaolaiMonoSC" },
      { text: "龘，", fontFamily: CJK_FALLBACK_FONT },
      { text: "丙丁", fontFamily: "XiaolaiMonoSC" },
    ]],
    ["扩展区汉字缺失", `甲${EXTENSION_C_CHARACTER}乙`, [
      { text: "甲", fontFamily: "XiaolaiMonoSC" },
      { text: EXTENSION_C_CHARACTER, fontFamily: "Jigmo2" },
      { text: "乙", fontFamily: "XiaolaiMonoSC" },
    ]],
    ["第三平面汉字缺失", `甲${EXTENSION_G_CHARACTER}乙`, [
      { text: "甲", fontFamily: "XiaolaiMonoSC" },
      { text: EXTENSION_G_CHARACTER, fontFamily: "Jigmo3" },
      { text: "乙", fontFamily: "XiaolaiMonoSC" },
    ]],
  ])("按字符记录%s", (_label, text, expectedRuns) => {
    const book = simpleBook()
    book.layout.fontFamily = "XiaolaiMonoSC"
    book.blocks = [{
      type: "person",
      personId: "p-font",
      personName: "字体测试",
      generation: 1,
      text,
    }]

    const result = paginateBook(book, (fontFamily, char) => CJK_FALLBACK_FONTS.some((fallback) => fallback === fontFamily && (char !== EXTENSION_C_CHARACTER || fallback === "Jigmo2") && (char !== EXTENSION_G_CHARACTER || fallback === "Jigmo3")) || char !== "龘" && char !== "，" && char !== EXTENSION_C_CHARACTER && char !== EXTENSION_G_CHARACTER)

    expect(result.pages[0].blocks[0].columns[0]).toEqual({ text, runs: expectedRuns })
  })

  it("扩展区汉字位于栏尾时保持完整码点", () => {
    const book = simpleBook()
    const text = `${"甲".repeat(28)}${EXTENSION_C_CHARACTER}乙`
    book.layout.fontFamily = "XiaolaiMonoSC"
    book.blocks = [{
      type: "person",
      personId: "p-extension",
      personName: "扩展字测试",
      generation: 1,
      text,
    }]

    const result = paginateBook(book, (fontFamily, char) => char !== EXTENSION_C_CHARACTER || fontFamily === "Jigmo2")

    expect(result.pages[0].blocks[0].columns.map((column) => column.text)).toEqual([
      `${"甲".repeat(28)}${EXTENSION_C_CHARACTER}`,
      "乙",
    ])
    expect(result.pages[0].blocks[0].columns[0].runs.at(-1)).toEqual({ text: EXTENSION_C_CHARACTER, fontFamily: "Jigmo2" })
  })

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
      columns: [
        { text: "张氏族谱", runs: [{ text: "张氏族谱", fontFamily: "qiji-combo" }] },
        { text: "归源堂", runs: [{ text: "归源堂", fontFamily: "qiji-combo" }] },
      ],
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

  it("当前页容不下世代标题和首条人物正文时将两者一起换页", () => {
    const book = simpleBook()
    book.blocks = [
      book.blocks[0],
      {
        type: "person",
        personId: "preface",
        personName: "前文",
        generation: 0,
        text: "甲".repeat(29 * 17),
      },
      { type: "generationHeading", generation: 1, text: "第一世" },
      {
        type: "person",
        personId: "p-1",
        personName: "张一",
        generation: 1,
        text: "乙",
      },
    ]

    const result = paginateBook(book)

    expect(pageLabels(result)).toEqual([
      ["cover"],
      ["前文"],
      ["generationHeading", "张一"],
    ])

    const preface = book.blocks[1]
    if (preface.type !== "person") throw new Error("测试书稿缺少前文人物条目")
    preface.text = "甲".repeat(29 * 16)
    expect(pageLabels(paginateBook(book))).toEqual([
      ["cover"],
      ["前文", "generationHeading", "张一"],
    ])

    const firstPerson = book.blocks[3]
    if (firstPerson.type !== "person") throw new Error("测试书稿缺少首条人物条目")
    firstPerson.text = "乙".repeat(29 * 2)
    expect(pageLabels(paginateBook(book))).toEqual([
      ["cover"],
      ["前文"],
      ["generationHeading", "张一"],
    ])

    firstPerson.text = "乙".repeat(29 * 18)
    const continued = paginateBook(book)
    expect(pageLabels(continued)).toEqual([
      ["cover"],
      ["前文", "generationHeading", "张一"],
      ["张一"],
    ])
    expect(continued.pages.flatMap((page) => page.blocks).filter(({ blockIndex }) => blockIndex === 3).map(({ columnSpan }) => columnSpan)).toEqual([1, 17])
  })

  it("人物条目放不下当前页时保持完整并移到下一页", () => {
    const book = simpleBook()
    book.blocks = [
      book.blocks[0],
      {
        type: "person",
        personId: "p-1",
        personName: "张一",
        generation: 1,
        text: "甲".repeat(29 * 18),
      },
      {
        type: "person",
        personId: "p-2",
        personName: "张二",
        generation: 1,
        text: "乙".repeat(29),
      },
      {
        type: "person",
        personId: "p-3",
        personName: "张三",
        generation: 1,
        text: "丙".repeat(29 * 2),
      },
    ]

    const result = paginateBook(book)

    expect(pageLabels(result)).toEqual([
      ["cover"],
      ["张一", "张二"],
      ["张三"],
    ])
    expect(result.pages[2].blocks[0].columns.map((column) => column.text).join("")).toBe("丙".repeat(29 * 2))
  })

  it("超长人物条目按栏跨多页续排并保持单一条目身份", () => {
    const book = simpleBook()
    const text = "甲".repeat(29 * 40)
    book.blocks = [
      book.blocks[0],
      {
        type: "person",
        personId: "p-long",
        personName: "张长传",
        generation: 1,
        text,
      },
    ]

    const result = paginateBook(book)
    const fragments = result.pages.flatMap((page) => page.blocks).filter(({ blockIndex }) => blockIndex === 1)

    expect(fragments.map(({ columnSpan }) => columnSpan)).toEqual([19, 19, 2])
    expect(fragments.flatMap(({ columns }) => columns).map((column) => column.text).join("")).toBe(text)
    expect(fragments.every(({ block, blockIndex, fontFamily }) => block === book.blocks[1] && blockIndex === 1 && fontFamily === "qiji-combo")).toBe(true)
    expect(book.blocks).toHaveLength(2)

    const person = book.blocks[1]
    if (person.type !== "person") throw new Error("测试书稿缺少超长人物条目")
    person.text = "乙".repeat(29 * 20)
    expect(paginateBook(book).pages.flatMap((page) => page.blocks).filter(({ blockIndex }) => blockIndex === 1).map(({ columnSpan }) => columnSpan)).toEqual([19, 1])
  })
})
