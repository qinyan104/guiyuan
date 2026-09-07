import { flushPromises, shallowMount } from "@vue/test-utils"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  getPublication: vi.fn(),
  routerPush: vi.fn(),
}))

vi.mock("vue-router", () => ({
  useRoute: () => ({ params: { publicationId: "7" } }),
  useRouter: () => ({ push: mocks.routerPush }),
}))
vi.mock("../api/publication", () => ({ getPublication: mocks.getPublication }))

import BookEditorView from "./BookEditorView.vue"

const publication = {
  title: "测试族谱",
  subtitle: "甲房",
  focusFamilyId: "f1",
  people: {
    p1: { id: "p1", name: "甲", gender: "male" as const },
    p2: { id: "p2", name: "乙", gender: "male" as const },
  },
  families: {
    f1: { id: "f1", adults: ["p1"], children: ["p2"] },
  },
}

describe("BookEditorView", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.getPublication.mockResolvedValue({ publication })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it("只加载族谱数据并显示 Markdown 预览", async () => {
    const wrapper = shallowMount(BookEditorView)
    await flushPromises()

    expect(mocks.getPublication).toHaveBeenCalledWith(7)
    expect(wrapper.find(".markdown-preview").text()).toContain("# 测试族谱")
    expect(wrapper.find(".markdown-preview").text()).toContain("## 第 1 世")
    expect(wrapper.text()).not.toContain("导出 PDF")
  })

  it("提供 Markdown 下载入口", async () => {
    vi.stubGlobal("URL", { createObjectURL: vi.fn(() => "blob:test"), revokeObjectURL: vi.fn() })
    const click = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {})
    const wrapper = shallowMount(BookEditorView)
    await flushPromises()

    await wrapper.findAll("button")[1].trigger("click")

    expect(click).toHaveBeenCalledOnce()
  })

  it("加载失败时显示错误", async () => {
    mocks.getPublication.mockRejectedValue(new Error("网络不可用"))
    const wrapper = shallowMount(BookEditorView)
    await flushPromises()

    expect(wrapper.find(".state--error").text()).toContain("网络不可用")
  })
})
