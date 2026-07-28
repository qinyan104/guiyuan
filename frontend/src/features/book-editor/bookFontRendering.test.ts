import { mount } from "@vue/test-utils"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import BookPage from "../../components/book-editor/BookPage.vue"
import type { BookDocument } from "../../types/bookDocument"
import { BOOK_FONT_URLS, resolveBookFontFamily } from "./bookFonts"
import { paginateBook } from "./bookPaginator"

const pdfMock = vi.hoisted(() => {
  const drawText = vi.fn()
  const page = {
    drawText,
    drawRectangle: vi.fn(),
    drawLine: vi.fn(),
    drawCircle: vi.fn(),
  }
  const document = {
    registerFontkit: vi.fn(),
    embedFont: vi.fn(async (bytes: ArrayBuffer) => ({
      family: new TextDecoder().decode(new Uint8Array(bytes)),
      widthOfTextAtSize: () => 10,
    })),
    addPage: vi.fn(() => page),
    save: vi.fn(async () => new Uint8Array()),
  }
  return { document, drawText }
})

vi.mock("pdf-lib", () => ({
  PDFDocument: { create: vi.fn(async () => pdfMock.document) },
  rgb: vi.fn(() => ({})),
}))

import { exportBookPdf } from "./bookPdfExport"

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

beforeEach(() => vi.clearAllMocks())

describe("古籍字体渲染", () => {
  it("预览与 PDF 使用分页结果中的同一组逐字字体", async () => {
    const extensionC = String.fromCodePoint(0x2a700)
    const extensionG = String.fromCodePoint(0x30000)
    const book: BookDocument = {
      publicationId: 7,
      title: "字体测试",
      layout: {
        templateId: "classic",
        fontFamily: "XiaolaiMonoSC",
        fontSize: 18,
        marginPreset: "standard",
      },
      blocks: [{
        type: "person",
        personId: "p-font",
        personName: "字体测试",
        generation: 1,
        text: `甲龘，${extensionC}${extensionG}乙`,
      }],
    }
    const pagination = paginateBook(book, (fontFamily, char) => {
      if (char === extensionC) return fontFamily === "Jigmo2"
      if (char === extensionG) return fontFamily === "Jigmo3"
      if (char === "龘" || char === "，") return fontFamily === "HanaMinA"
      return fontFamily === "XiaolaiMonoSC"
    })
    const runs = pagination.pages[0].blocks[0].columns.flatMap((column) => column.runs)
    const expected = runs.map((run) => ({ text: run.text, fontFamily: run.fontFamily }))

    const wrapper = mount(BookPage, {
      props: { page: pagination.pages[0], layout: book.layout, metrics: pagination.metrics, scale: 1 },
    })
    expect(wrapper.findAll(".person-column > span").map((span) => ({
      text: span.text(),
      fontFamily: (span.element as HTMLElement).style.fontFamily,
    }))).toEqual(expected)

    vi.stubGlobal("fetch", vi.fn(async (input: RequestInfo | URL) => ({
      ok: true,
      arrayBuffer: async () => new TextEncoder().encode(String(input)).buffer,
    } as Response)))
    Object.defineProperty(URL, "createObjectURL", { configurable: true, value: vi.fn(() => "blob:test") })
    Object.defineProperty(URL, "revokeObjectURL", { configurable: true, value: vi.fn() })
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => undefined)

    await exportBookPdf(book, pagination)

    const expectedGlyphs = runs.flatMap((run) => Array.from(run.text).map((text) => ({
      text,
      fontUrl: BOOK_FONT_URLS[resolveBookFontFamily(run.fontFamily)],
    })))
    const pdfGlyphs = pdfMock.drawText.mock.calls
      .filter(([text]) => Array.from(text as string).length === 1)
      .map(([text, options]) => ({
        text,
        fontUrl: (options as { font: { family: string } }).font.family,
      }))
    expect(pdfGlyphs).toEqual(expectedGlyphs)
  })

  it("PDF 不绘制编辑器的手动分页标记", async () => {
    const book: BookDocument = {
      publicationId: 7,
      title: "分页测试",
      layout: { templateId: "classic", fontFamily: "XiaolaiMonoSC", fontSize: 18, marginPreset: "standard" },
      blocks: [
        { type: "person", personId: "before", personName: "前文", generation: 1, text: "甲" },
        { type: "pageBreak", id: "manual-break-not-for-print" },
        { type: "person", personId: "after", personName: "后文", generation: 1, text: "乙" },
      ],
    }
    const pagination = paginateBook(book)
    vi.stubGlobal("fetch", vi.fn(async (input: RequestInfo | URL) => ({
      ok: true,
      arrayBuffer: async () => new TextEncoder().encode(String(input)).buffer,
    } as Response)))
    Object.defineProperty(URL, "createObjectURL", { configurable: true, value: vi.fn(() => "blob:test") })
    Object.defineProperty(URL, "revokeObjectURL", { configurable: true, value: vi.fn() })
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => undefined)

    expect(pagination.pages.flatMap((page) => page.blocks).some((item) => item.block.type === "pageBreak")).toBe(true)
    await exportBookPdf(book, pagination)

    const drawnText = pdfMock.drawText.mock.calls.map(([text]) => text)
    expect(drawnText).not.toContain("手动分页")
    expect(drawnText).not.toContain("manual-break-not-for-print")
  })
})
