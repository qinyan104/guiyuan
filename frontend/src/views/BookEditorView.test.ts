import { enableAutoUnmount, flushPromises, shallowMount } from "@vue/test-utils"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import BookSpread from "../components/book-editor/BookSpread.vue"
import BookToolbar from "../components/book-editor/BookToolbar.vue"
import type { BookDocument } from "../types/bookDocument"

const mocks = vi.hoisted(() => ({
  getPublication: vi.fn(),
  getBookDocument: vi.fn(),
  saveBookDocument: vi.fn(),
  loadBookFontSupport: vi.fn(),
  generateBookDocument: vi.fn(),
  routerPush: vi.fn(),
  routeGuard: null as null | (() => boolean),
}))

vi.mock("vue-router", () => ({
  useRoute: () => ({ params: { publicationId: "7" } }),
  useRouter: () => ({ push: mocks.routerPush }),
  onBeforeRouteLeave: (guard: () => boolean) => { mocks.routeGuard = guard },
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
vi.mock("../features/book-editor/bookGenerator", () => ({ generateBookDocument: mocks.generateBookDocument }))

import BookEditorView from "./BookEditorView.vue"

enableAutoUnmount(afterEach)

beforeEach(() => {
  vi.clearAllMocks()
  mocks.routeGuard = null
})
afterEach(() => vi.unstubAllGlobals())

function editableBook(): BookDocument {
  return {
    publicationId: 7,
    title: "未保存测试",
    layout: { templateId: "classic", fontFamily: "XiaolaiMonoSC", fontSize: 18, marginPreset: "standard" },
    blocks: [
      { type: "person", personId: "before", personName: "前文", generation: 1, text: "甲" },
      { type: "person", personId: "after", personName: "后文", generation: 1, text: "乙" },
    ],
  }
}

async function mountLoadedBook() {
  const book = editableBook()
  mocks.getPublication.mockResolvedValue({ publication: { title: book.title } })
  mocks.getBookDocument.mockResolvedValue(book)
  mocks.loadBookFontSupport.mockResolvedValue(() => true)
  mocks.saveBookDocument.mockImplementation(async (document: BookDocument) => document)
  const wrapper = shallowMount(BookEditorView)
  await flushPromises()
  return {
    wrapper,
    toolbar: wrapper.findComponent(BookToolbar),
    spread: wrapper.findComponent(BookSpread),
  }
}

function firstPersonText(spread: ReturnType<typeof shallowMount>): string | undefined {
  const pagination = (spread.props() as {
    pagination: { pages: Array<{ blocks: Array<{ block: BookDocument["blocks"][number] }> }> }
  }).pagination
  const item = pagination.pages
    .flatMap((page: { blocks: Array<{ block: BookDocument["blocks"][number] }> }) => page.blocks)
    .find((candidate: { block: BookDocument["blocks"][number] }) => candidate.block.type === "person")
  return item?.block.type === "person" ? item.block.text : undefined
}

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

  it("正文、版式和分页符修改共用同一个未保存状态", async () => {
    const { wrapper, toolbar, spread } = await mountLoadedBook()
    expect(toolbar.props("hasUnsavedChanges")).toBe(false)

    spread.vm.$emit("updatePerson", 0, "正文已修改")
    await wrapper.vm.$nextTick()
    expect(toolbar.props("hasUnsavedChanges")).toBe(true)
    toolbar.vm.$emit("save")
    await flushPromises()
    expect(toolbar.props("hasUnsavedChanges")).toBe(false)

    toolbar.vm.$emit("updateLayout", { ...editableBook().layout, fontSize: 20 })
    await wrapper.vm.$nextTick()
    expect(toolbar.props("hasUnsavedChanges")).toBe(true)
    toolbar.vm.$emit("save")
    await flushPromises()
    expect(toolbar.props("hasUnsavedChanges")).toBe(false)

    spread.vm.$emit("selectBlock", 0)
    await wrapper.vm.$nextTick()
    toolbar.vm.$emit("insertPageBreak")
    await wrapper.vm.$nextTick()
    expect(toolbar.props("hasUnsavedChanges")).toBe(true)
  })

  it("初次生成书稿建立干净基线", async () => {
    const generated = editableBook()
    mocks.getPublication.mockResolvedValue({ publication: { title: generated.title } })
    mocks.getBookDocument.mockResolvedValue(null)
    mocks.loadBookFontSupport.mockResolvedValue(() => true)
    mocks.generateBookDocument.mockReturnValue(generated)
    const wrapper = shallowMount(BookEditorView)
    await flushPromises()
    const toolbar = wrapper.findComponent(BookToolbar)

    toolbar.vm.$emit("generate")
    await flushPromises()

    expect(toolbar.props("hasDocument")).toBe(true)
    expect(toolbar.props("hasUnsavedChanges")).toBe(false)
  })

  it("保存失败保留编辑内容和未保存状态", async () => {
    const { wrapper, toolbar, spread } = await mountLoadedBook()
    mocks.saveBookDocument.mockRejectedValue(new Error("保存服务不可用"))
    spread.vm.$emit("updatePerson", 0, "不能丢失的正文")
    await wrapper.vm.$nextTick()

    toolbar.vm.$emit("save")
    await flushPromises()

    expect(toolbar.props("hasUnsavedChanges")).toBe(true)
    expect(firstPersonText(spread)).toBe("不能丢失的正文")
    expect(wrapper.get(".toast.danger").text()).toContain("保存服务不可用")
  })

  it("保存期间的新编辑不会被较早的保存响应覆盖", async () => {
    let finishSave!: (document: BookDocument) => void
    const saving = new Promise<BookDocument>((resolve) => { finishSave = resolve })
    const { wrapper, toolbar, spread } = await mountLoadedBook()
    mocks.saveBookDocument.mockReturnValue(saving)
    spread.vm.$emit("updatePerson", 0, "提交中的正文")
    await wrapper.vm.$nextTick()
    toolbar.vm.$emit("save")
    await wrapper.vm.$nextTick()

    spread.vm.$emit("updatePerson", 0, "保存期间继续修改")
    await wrapper.vm.$nextTick()
    finishSave(mocks.saveBookDocument.mock.calls[0][0])
    await flushPromises()

    expect(firstPersonText(spread)).toBe("保存期间继续修改")
    expect(toolbar.props("hasUnsavedChanges")).toBe(true)
  })

  it("仅在未保存时保护路由和浏览器离开", async () => {
    const confirmLeave = vi.fn(() => false)
    vi.stubGlobal("confirm", confirmLeave)
    const { wrapper, toolbar, spread } = await mountLoadedBook()
    expect(mocks.routeGuard?.()).toBe(true)
    expect(confirmLeave).not.toHaveBeenCalled()

    const cleanUnload = new Event("beforeunload", { cancelable: true })
    window.dispatchEvent(cleanUnload)
    expect(cleanUnload.defaultPrevented).toBe(false)

    spread.vm.$emit("updatePerson", 0, "离开前修改")
    await wrapper.vm.$nextTick()
    expect(mocks.routeGuard?.()).toBe(false)
    expect(confirmLeave).toHaveBeenCalledOnce()
    const dirtyUnload = new Event("beforeunload", { cancelable: true })
    window.dispatchEvent(dirtyUnload)
    expect(dirtyUnload.defaultPrevented).toBe(true)

    confirmLeave.mockReturnValue(true)
    expect(mocks.routeGuard?.()).toBe(true)
    toolbar.vm.$emit("save")
    await flushPromises()
    confirmLeave.mockClear()
    expect(mocks.routeGuard?.()).toBe(true)
    expect(confirmLeave).not.toHaveBeenCalled()
  })
})
