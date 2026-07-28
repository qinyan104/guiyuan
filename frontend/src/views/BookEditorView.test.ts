import { flushPromises, shallowMount } from "@vue/test-utils"
import { beforeEach, describe, expect, it, vi } from "vitest"
import BookSpread from "../components/book-editor/BookSpread.vue"
import BookToolbar from "../components/book-editor/BookToolbar.vue"
import type { BookDocument } from "../types/bookDocument"

const mocks = vi.hoisted(() => ({
  getPublication: vi.fn(),
  getBookDocument: vi.fn(),
  saveBookDocument: vi.fn(),
  loadBookFontSupport: vi.fn(),
}))

vi.mock("vue-router", () => ({
  useRoute: () => ({ params: { publicationId: "7" } }),
  useRouter: () => ({ push: vi.fn() }),
}))
vi.mock("../api/publication", () => ({ getPublication: mocks.getPublication }))
vi.mock("../features/book-editor/bookDocumentApi", () => ({
  getBookDocument: mocks.getBookDocument,
  saveBookDocument: mocks.saveBookDocument,
}))
vi.mock("../features/book-editor/bookFonts", async (importOriginal) => ({
  ...await importOriginal<typeof import("../features/book-editor/bookFonts")>(),
  loadBookFontSupport: mocks.loadBookFontSupport,
}))
vi.mock("../features/book-editor/bookPdfExport", () => ({ exportBookPdf: vi.fn() }))

import BookEditorView from "./BookEditorView.vue"

beforeEach(() => vi.clearAllMocks())

describe("BookEditorView", () => {
  it("将无法排版的缺字显示为可恢复错误", async () => {
    const book: BookDocument = {
      publicationId: 7,
      title: "字体测试",
      layout: { templateId: "classic", fontFamily: "XiaolaiMonoSC", fontSize: 18, marginPreset: "standard" },
      blocks: [{ type: "person", personId: "p-font", personName: "字体测试", generation: 1, text: "龘" }],
    }
    mocks.getPublication.mockResolvedValue({ publication: { title: "字体测试" } })
    mocks.getBookDocument.mockResolvedValue(book)
    mocks.loadBookFontSupport.mockResolvedValue(() => false)

    const wrapper = shallowMount(BookEditorView)
    await flushPromises()
    await flushPromises()

    expect(wrapper.find(".state.error").text()).toContain("后备字体缺少字形：龘")
    expect(wrapper.find(".toast.danger").text()).toContain("后备字体缺少字形：龘")
  })

  it("在选中块后插入、保存并删除手动分页符", async () => {
    const book: BookDocument = {
      publicationId: 7,
      title: "分页测试",
      layout: { templateId: "classic", fontFamily: "XiaolaiMonoSC", fontSize: 18, marginPreset: "standard" },
      blocks: [
        { type: "person", personId: "before", personName: "前文", generation: 1, text: "甲" },
        { type: "person", personId: "after", personName: "后文", generation: 1, text: "乙" },
      ],
    }
    mocks.getPublication.mockResolvedValue({ publication: { title: "分页测试" } })
    mocks.getBookDocument.mockResolvedValue(book)
    mocks.loadBookFontSupport.mockResolvedValue(() => true)
    mocks.saveBookDocument.mockImplementation(async (document: BookDocument) => document)
    const wrapper = shallowMount(BookEditorView)
    await flushPromises()

    wrapper.findComponent(BookSpread).vm.$emit("selectBlock", 0)
    await wrapper.vm.$nextTick()
    const toolbar = wrapper.findComponent(BookToolbar)
    toolbar.vm.$emit("insertPageBreak")
    await wrapper.vm.$nextTick()

    expect(toolbar.props("canDeletePageBreak")).toBe(true)
    toolbar.vm.$emit("save")
    await flushPromises()
    expect(mocks.saveBookDocument.mock.calls[0][0].blocks.map((block: { type: string }) => block.type)).toEqual(["person", "pageBreak", "person"])

    toolbar.vm.$emit("deletePageBreak")
    await wrapper.vm.$nextTick()
    toolbar.vm.$emit("save")
    await flushPromises()
    expect(mocks.saveBookDocument.mock.calls[1][0].blocks.map((block: { type: string }) => block.type)).toEqual(["person", "person"])
  })
})
