import { mount } from "@vue/test-utils"
import { describe, expect, it } from "vitest"
import type { BookPageLayout } from "../../types/bookDocument"
import { paginateBook } from "../../features/book-editor/bookPaginator"
import BookPage from "./BookPage.vue"

describe("BookPage", () => {
  it("在正式书页外显示并选择手动分页标记", async () => {
    const layout = { templateId: "classic", fontFamily: "qiji-combo", fontSize: 18, marginPreset: "standard" as const }
    const metrics = paginateBook({ publicationId: 7, title: "测试", layout, blocks: [] }).metrics
    const page: BookPageLayout = {
      pageNumber: 2,
      blocks: [{
        block: { type: "pageBreak", id: "manual-break" },
        blockIndex: 1,
        columnSpan: 0,
        fontFamily: "qiji-combo",
        columns: [],
      }],
    }
    const wrapper = mount(BookPage, {
      props: { page, layout, metrics, scale: 1, selectedBlockIndex: 1 },
    })

    const marker = wrapper.get("button.page-break-marker")
    expect(marker.text()).toContain("手动分页")
    expect(marker.classes()).toContain("selected")
    expect(wrapper.find(".book-page .page-break-marker").exists()).toBe(false)

    await marker.trigger("click")
    expect(wrapper.emitted("selectBlock")).toEqual([[1]])
  })

  it("堆叠显示连续分页符并支持键盘选择逻辑块", async () => {
    const layout = { templateId: "classic", fontFamily: "qiji-combo", fontSize: 18, marginPreset: "standard" as const }
    const metrics = paginateBook({ publicationId: 7, title: "测试", layout, blocks: [] }).metrics
    const page: BookPageLayout = {
      pageNumber: 2,
      blocks: [
        { block: { type: "pageBreak", id: "break-1" }, blockIndex: 1, columnSpan: 0, fontFamily: "qiji-combo", columns: [] },
        { block: { type: "pageBreak", id: "break-2" }, blockIndex: 2, columnSpan: 0, fontFamily: "qiji-combo", columns: [] },
        {
          block: { type: "generationHeading", generation: 1, text: "第一世" },
          blockIndex: 3,
          columnSpan: 2,
          fontFamily: "qiji-combo",
          columns: [{ text: "第一世", runs: [{ text: "第一世", fontFamily: "qiji-combo" }] }],
        },
      ],
    }
    const wrapper = mount(BookPage, { props: { page, layout, metrics, scale: 1 } })

    expect(wrapper.get(".page-break-markers").findAll("button")).toHaveLength(2)
    await wrapper.findAll("button.page-break-marker")[1].trigger("click")
    expect(wrapper.emitted("selectBlock")?.at(-1)).toEqual([2])

    const heading = wrapper.get(".generation")
    expect(heading.attributes("role")).toBe("button")
    expect(heading.attributes("tabindex")).toBe("0")
    await heading.trigger("keydown", { key: "Enter" })
    expect(wrapper.emitted("selectBlock")?.at(-1)).toEqual([3])
  })
})
