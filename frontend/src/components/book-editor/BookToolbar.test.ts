import { shallowMount } from "@vue/test-utils"
import { describe, expect, it } from "vitest"
import BookToolbar from "./BookToolbar.vue"

describe("BookToolbar", () => {
  it("清楚显示已保存和未保存状态", async () => {
    const wrapper = shallowMount(BookToolbar, {
      props: {
        title: "未保存测试",
        layout: { templateId: "classic", fontFamily: "qiji-combo", fontSize: 18, marginPreset: "standard" },
        saving: false,
        exporting: false,
        hasDocument: true,
        viewMode: "spread",
        zoom: 1,
        canInsertPageBreak: false,
        canDeletePageBreak: false,
        hasUnsavedChanges: false,
      },
    })

    expect(wrapper.get("[role='status']").text()).toBe("已保存")
    await wrapper.setProps({ hasUnsavedChanges: true })
    expect(wrapper.get("[role='status']").text()).toBe("未保存")
  })
})
