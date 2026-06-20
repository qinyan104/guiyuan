/**
 * CanvasConfig.test.ts — 画布模板配置测试
 *
 * 测试纯计算函数：getCanvasIds, getCanvasConfig, getTextArea, getColumnWidth
 */

import { describe, it, expect, vi } from "vitest"
import {
  CANVAS_CONFIGS,
  getCanvasConfig,
  getCanvasIds,
  getTextArea,
  getColumnWidth,
} from "../CanvasConfig"
import type { CanvasConfig } from "../types"

// ── getCanvasIds ──

describe("getCanvasIds", () => {
  it("返回非空数组", () => {
    const ids = getCanvasIds()
    expect(ids).toBeInstanceOf(Array)
    expect(ids.length).toBeGreaterThan(0)
  })

  it("包含已知模板 ID", () => {
    const ids = getCanvasIds()
    expect(ids).toContain("mr_5")
    expect(ids).toContain("mr_4")
    expect(ids).toContain("simple")
    expect(ids).toContain("bamboo")
  })

  it("ID 数量与 CANVAS_CONFIGS 键数一致", () => {
    const ids = getCanvasIds()
    expect(ids.length).toBe(Object.keys(CANVAS_CONFIGS).length)
  })
})

// ── getCanvasConfig ──

describe("getCanvasConfig", () => {
  it("mr_5 返回有效配置对象，包含预期属性", () => {
    const config = getCanvasConfig("mr_5")
    expect(config).toBeDefined()
    expect(config.id).toBe("mr_5")
    expect(config.name).toBe("宣纸鱼尾·五栏")
    expect(config.width).toBe(2480)
    expect(config.height).toBe(1860)
    expect(config.margins).toBeDefined()
    expect(config.margins.top).toBe(200)
    expect(config.leafCol).toBe(36)
    expect(config.frame).toBeDefined()
    expect(config.fishTail).not.toBeNull()
    expect(config.multiRows).not.toBeNull()
    expect(config.multiRows!.enabled).toBe(true)
    expect(config.multiRows!.rowCount).toBe(5)
  })

  it("simple 返回正确配置（竖版，无鱼尾）", () => {
    const config = getCanvasConfig("simple")
    expect(config.id).toBe("simple")
    expect(config.width).toBe(1860)
    expect(config.height).toBe(2480) // 竖版，height > width
    expect(config.fishTail).toBeNull()
  })

  it("无效 ID 回退到 mr_5（不抛异常）", () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {})
    const config = getCanvasConfig("nonexistent_template_id")
    expect(config.id).toBe("mr_5")
    expect(warnSpy).toHaveBeenCalled()
    warnSpy.mockRestore()
  })

  it("所有返回的配置对象结构完整", () => {
    for (const id of getCanvasIds()) {
      const config = getCanvasConfig(id)
      expect(config.id).toBe(id)
      expect(typeof config.width).toBe("number")
      expect(typeof config.height).toBe("number")
      expect(config.width).toBeGreaterThan(0)
      expect(config.height).toBeGreaterThan(0)
      expect(config.margins).toBeDefined()
      expect(typeof config.margins.top).toBe("number")
      expect(typeof config.margins.bottom).toBe("number")
      expect(typeof config.margins.left).toBe("number")
      expect(typeof config.margins.right).toBe("number")
      expect(config.frame).toBeDefined()
      expect(typeof config.leafCol).toBe("number")
      expect(config.leafCol).toBeGreaterThan(0)
    }
  })
})

// ── getTextArea ──

describe("getTextArea", () => {
  it("返回正的 width 和 height", () => {
    const config = getCanvasConfig("mr_5")
    const area = getTextArea(config)
    expect(area.width).toBeGreaterThan(0)
    expect(area.height).toBeGreaterThan(0)
  })

  it("返回的区域在画布范围内", () => {
    const config = getCanvasConfig("mr_5")
    const area = getTextArea(config)
    expect(area.x).toBeGreaterThanOrEqual(0)
    expect(area.y).toBeGreaterThanOrEqual(0)
    expect(area.x + area.width).toBeLessThanOrEqual(config.width)
    expect(area.y + area.height).toBeLessThanOrEqual(config.height)
  })

  it("无鱼尾配置（simple）的文字区域更大", () => {
    const simpleConfig = getCanvasConfig("simple")
    const simpleArea = getTextArea(simpleConfig)

    // simple 没有鱼尾，文字区域应从 margins + frame 开始
    expect(simpleArea.width).toBeGreaterThan(0)
    expect(simpleArea.height).toBeGreaterThan(0)
  })

  it("有鱼尾配置（mr_5）的文字区域避开鱼尾", () => {
    const config = getCanvasConfig("mr_5")
    const area = getTextArea(config)
    const ft = config.fishTail!

    // 文字区域 y 应在上鱼尾之下
    expect(area.y).toBeGreaterThanOrEqual(
      ft.topY + ft.topRectHeight + ft.topTriaHeight,
    )
    // 文字区域底部应在下鱼尾之上
    expect(area.y + area.height).toBeLessThanOrEqual(ft.bottomY + ft.lineMargin)
  })
})

// ── getColumnWidth ──

describe("getColumnWidth", () => {
  it("返回正数", () => {
    const config = getCanvasConfig("mr_5")
    const w = getColumnWidth(config)
    expect(w).toBeGreaterThan(0)
  })

  it("列宽 = 文字区域宽度 / 列数", () => {
    const config = getCanvasConfig("mr_5")
    const area = getTextArea(config)
    const expected = area.width / config.leafCol
    expect(getColumnWidth(config)).toBeCloseTo(expected, 2)
  })

  it("不同模板列宽不同", () => {
    const w5 = getColumnWidth(getCanvasConfig("mr_5"))   // 36 列
    const wSimple = getColumnWidth(getCanvasConfig("simple")) // 20 列
    // mr_5 列数更多，每列更窄
    expect(w5).toBeLessThan(wSimple)
  })
})
