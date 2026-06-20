/**
 * ColumnFlowEngine.test.ts — 竖排列流引擎测试
 *
 * 需要 mock FontMetricsEngine（依赖 Canvas API）。
 * 使用简单的 mock measure() 返回固定尺寸。
 */

import { describe, it, expect, vi, beforeEach } from "vitest"
import type { LayoutInput, CanvasConfig, PageGlyphs } from "../types"
import type { LineageEntry } from "../../../types/publishing"

// ── Mock FontMetricsEngine ──
// 模拟每个字符宽 24px、高 24px
vi.mock("../FontMetricsEngine", () => ({
  getFontMetricsEngine: () => ({
    measure: vi.fn((_char: string, _font: string, _size: number) => ({
      width: 24,
      height: 24,
      ascender: 19,
      descender: 5,
    })),
    preload: vi.fn(async () => {}),
    clearCache: vi.fn(),
    cacheSize: 0,
    getAverageWidth: vi.fn(() => 24),
    measureBatch: vi.fn((chars: string[]) =>
      chars.map(() => ({ width: 24, height: 24, ascender: 19, descender: 5 })),
    ),
  }),
}))

import { layoutColumns } from "../ColumnFlowEngine"
import { getCanvasConfig } from "../CanvasConfig"

// ── 辅助：构建 mock 条目 ──

function makeEntry(overrides: Partial<LineageEntry> = {}): LineageEntry {
  return {
    personId: "p1",
    personName: "张三",
    formattedText: "张三字伯元号清溪",
    generation: 0,
    gender: "male",
    ...overrides,
  }
}

function makeInput(
  entries: LineageEntry[],
  canvasId = "simple", // simple 模板无鱼尾，便于测试
): LayoutInput {
  return {
    entries,
    canvas: getCanvasConfig(canvasId),
    options: {
      fontSize: 12,
      lineHeight: 1.9,
      columns: 1,
      marginPreset: "standard",
      fontFamily: "qiji-combo",
    },
  }
}

// ── 测试 ──

describe("layoutColumns", () => {
  it("空条目 → 返回空页面（无字形）", () => {
    const pages = layoutColumns(makeInput([]))
    // 空条目可能返回 0 页或 1 页（空页）
    expect(pages).toBeInstanceOf(Array)
    for (const page of pages) {
      const totalGlyphs = page.columns?.reduce(
        (sum, col) => sum + col.glyphs.length,
        0,
      ) ?? 0
      expect(totalGlyphs).toBe(0)
    }
  })

  it("单个条目 → 至少产生一个包含字形的页面", () => {
    const entry = makeEntry({ formattedText: "张三字伯元" })
    const pages = layoutColumns(makeInput([entry]))
    expect(pages.length).toBeGreaterThanOrEqual(1)

    const firstPage = pages[0]
    expect(firstPage.pageNumber).toBe(1)
    expect(firstPage.columns).toBeDefined()
    expect(firstPage.columns!.length).toBeGreaterThan(0)

    // 至少有一列有字形
    const hasGlyphs = firstPage.columns!.some((c) => c.glyphs.length > 0)
    expect(hasGlyphs).toBe(true)
  })

  it("每个字形具有有效的 x, y, char, fontIndex, fontSize 属性", () => {
    const entry = makeEntry({ formattedText: "张三" })
    const pages = layoutColumns(makeInput([entry]))

    for (const page of pages) {
      for (const col of page.columns ?? []) {
        for (const glyph of col.glyphs) {
          expect(typeof glyph.char).toBe("string")
          expect(glyph.char.length).toBeGreaterThan(0)
          expect(typeof glyph.x).toBe("number")
          expect(typeof glyph.y).toBe("number")
          expect(typeof glyph.fontIndex).toBe("number")
          expect(typeof glyph.fontSize).toBe("number")
          expect(glyph.fontSize).toBeGreaterThan(0)
          expect(typeof glyph.width).toBe("number")
          expect(typeof glyph.height).toBe("number")
          expect(glyph.width).toBeGreaterThan(0)
          expect(glyph.height).toBeGreaterThan(0)
        }
      }
    }
  })

  it("多条目 → 字形总数等于所有条目字符总数", () => {
    const entries = [
      makeEntry({ personId: "p1", formattedText: "张三" }),
      makeEntry({ personId: "p2", formattedText: "李四" }),
    ]
    const pages = layoutColumns(makeInput(entries))

    let totalGlyphs = 0
    for (const page of pages) {
      for (const col of page.columns ?? []) {
        totalGlyphs += col.glyphs.length
      }
    }

    // formattedText "张三" 和 "李四" 各 2 字 + 代际标题 + 条目间间距字符
    // 代际标题是 GenHeader，不算字形，所以只有条目文本字形
    // 注意：\n 被跳过，¶ 和 § 是控制字符不生成字形
    // "张三" = 2 字, "李四" = 2 字
    expect(totalGlyphs).toBe(4)
  })

  it("字形的 sourceEntry 引用正确", () => {
    const entry = makeEntry({ personId: "test-person" })
    const pages = layoutColumns(makeInput([entry]))

    for (const page of pages) {
      for (const col of page.columns ?? []) {
        for (const glyph of col.glyphs) {
          expect(glyph.sourceEntry).toBeDefined()
          expect(glyph.sourceEntry!.personId).toBe("test-person")
        }
      }
    }
  })

  it("多代条目 → 生成代际标题 (generationHeaders)", () => {
    const entries = [
      makeEntry({ personId: "p1", generation: 0, formattedText: "一世祖" }),
      makeEntry({ personId: "p2", generation: 1, formattedText: "二世祖" }),
    ]
    const pages = layoutColumns(makeInput(entries))

    const allHeaders = pages.flatMap((p) => p.generationHeaders)
    expect(allHeaders.length).toBeGreaterThanOrEqual(2)

    // 第一世标题
    const gen0 = allHeaders.find((h) => h.generation === 0)
    expect(gen0).toBeDefined()
    expect(gen0!.titleText).toBe("第一世")

    // 第二世标题
    const gen1 = allHeaders.find((h) => h.generation === 1)
    expect(gen1).toBeDefined()
    expect(gen1!.titleText).toBe("第二世")
  })

  it("列从右到左排列（colIndex 0 的 x 最大）", () => {
    const entry = makeEntry({ formattedText: "测试文本排列" })
    const pages = layoutColumns(makeInput([entry]))

    if (pages.length > 0 && pages[0].columns!.length > 1) {
      const cols = pages[0].columns!
      // colIndex 0 应在最右边（x 最大）
      expect(cols[0].x).toBeGreaterThanOrEqual(cols[1].x)
    }
  })

  it("换页控制符 § 正确触发新页", () => {
    const entry = makeEntry({ formattedText: "前\u00A7后" }) // § = 换页
    const pages = layoutColumns(makeInput([entry]))
    // "前" + §(换页) + "后" 应产生至少 2 页
    expect(pages.length).toBeGreaterThanOrEqual(2)
  })

  it("换列控制符 ¶ 正确触发换列", () => {
    const entry = makeEntry({ formattedText: "前\u00B6后" }) // ¶ = 换列
    const pages = layoutColumns(makeInput([entry]))
    expect(pages.length).toBeGreaterThanOrEqual(1)

    // "前" 和 "后" 应在不同列
    const cols = pages[0].columns!
    const colWithFront = cols.find((c) =>
      c.glyphs.some((g) => g.char === "前"),
    )
    const colWithBack = cols.find((c) =>
      c.glyphs.some((g) => g.char === "后"),
    )
    expect(colWithFront).toBeDefined()
    expect(colWithBack).toBeDefined()
    expect(colWithFront!.columnIndex).not.toBe(colWithBack!.columnIndex)
  })

  it("紧凑边距 (compact) 文字区域更宽", () => {
    const entry = makeEntry({ formattedText: "测试边距" })

    const standardInput = makeInput([entry])
    standardInput.options.marginPreset = "standard"
    const standardPages = layoutColumns(standardInput)

    const compactInput = makeInput([entry])
    compactInput.options.marginPreset = "compact"
    const compactPages = layoutColumns(compactInput)

    // 紧凑模式下，列应该更宽（因为文字区域更大）
    // 通过比较第一列的 x 值（紧凑模式 x 应该更小 = 更靠近左边缘）
    const stdColX = standardPages[0].columns![0].x
    const cmpColX = compactPages[0].columns![0].x
    expect(cmpColX).toBeLessThanOrEqual(stdColX)
  })
})
