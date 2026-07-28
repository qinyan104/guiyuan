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
})
