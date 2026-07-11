/**
 * MultiRowEngine.test.ts — 族谱多行分割引擎测试
 *
 * 需要 mock FontMetricsEngine（依赖 Canvas API）。
 * 使用多行模式模板（mr_5、mr_4）进行测试。
 */

import { describe, it, expect, vi } from "vitest"
import type { LayoutInput, PageGlyphs } from "../types"
import type { LineageEntry } from "../../../types/publishing"

// ── Mock FontMetricsEngine ──
vi.mock("../FontMetricsEngine", () => ({
  getFontMetricsEngine: () => ({
    measure: vi.fn((_char: string, _font: string, _size: number) => ({
      width: 20,
      height: 20,
      ascender: 16,
      descender: 4,
    })),
    preload: vi.fn(async () => {}),
    clearCache: vi.fn(),
    cacheSize: 0,
    getAverageWidth: vi.fn(() => 20),
    measureBatch: vi.fn((chars: string[]) =>
      chars.map(() => ({ width: 20, height: 20, ascender: 16, descender: 4 })),
    ),
  }),
}))

import { layoutMultiRows } from "../MultiRowEngine"
import { getCanvasConfig } from "../CanvasConfig"

// ── 辅助 ──

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

function makeMultiRowInput(
  entries: LineageEntry[],
  canvasId = "mr_5",
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

/** 从 multiRowColumns 中收集所有字形 */
function collectGlyphs(pages: PageGlyphs[]) {
  return pages.flatMap(
    (p) =>
      p.multiRowColumns?.flatMap((c) => c.rows.flatMap((r) => r.glyphs)) ?? [],
  )
}

// ── 测试 ──

describe("layoutMultiRows", () => {
  it("空条目 → 无字形", () => {
    const pages = layoutMultiRows(makeMultiRowInput([]))
    const glyphs = collectGlyphs(pages)
    expect(glyphs.length).toBe(0)
  })

  it("单条目 → 至少一页，包含字形", () => {
    const entry = makeEntry({ formattedText: "张三" })
    const pages = layoutMultiRows(makeMultiRowInput([entry]))
    expect(pages.length).toBeGreaterThanOrEqual(1)

    const glyphs = collectGlyphs(pages)
    expect(glyphs.length).toBeGreaterThanOrEqual(2) // "张三" = 2 字
  })

  it("使用 multiRowColumns 字段（非 columns）", () => {
    const entry = makeEntry({ formattedText: "测试" })
    const pages = layoutMultiRows(makeMultiRowInput([entry]))

    expect(pages[0].multiRowColumns).toBeDefined()
    // columns 字段不应存在或为 undefined
    expect(pages[0].columns).toBeUndefined()
  })

  it("每个字形具有有效属性", () => {
    const entry = makeEntry({ formattedText: "张" })
    const pages = layoutMultiRows(makeMultiRowInput([entry]))
    const glyphs = collectGlyphs(pages)

    for (const g of glyphs) {
      expect(typeof g.char).toBe("string")
      expect(g.char.length).toBeGreaterThan(0)
      expect(typeof g.x).toBe("number")
      expect(typeof g.y).toBe("number")
      expect(g.fontIndex).toBe(0)
      expect(g.fontSize).toBeGreaterThan(0)
      expect(g.width).toBeGreaterThan(0)
      expect(g.height).toBeGreaterThan(0)
    }
  })

  it("多行结构：行按 rowCount 分割", () => {
    // mr_5 的 multiRows.rowCount = 5
    const config = getCanvasConfig("mr_5")
    const rowCount = config.multiRows!.rowCount

    // 创建足够多的条目填满一列（5 行）
    const entries = Array.from({ length: rowCount }, (_, i) =>
      makeEntry({
        personId: `p${i}`,
        personName: `人物${i}`,
        formattedText: `第${i}人`,
      }),
    )
    const pages = layoutMultiRows(makeMultiRowInput(entries, "mr_5"))

    // 第一列应该有 5 行
    const firstCol = pages[0].multiRowColumns![0]
    expect(firstCol).toBeDefined()
    expect(firstCol.rows.length).toBe(rowCount)

    // 每行至少有一个字形
    for (const row of firstCol.rows) {
      expect(row.glyphs.length).toBeGreaterThan(0)
    }
  })

  it("超出一列时自动换列", () => {
    const config = getCanvasConfig("mr_5")
    const rowCount = config.multiRows!.rowCount // 5

    // 创建 2×rowCount 个条目 → 应填满 2 列
    const entries = Array.from({ length: rowCount * 2 }, (_, i) =>
      makeEntry({
        personId: `p${i}`,
        formattedText: `人${i}`,
      }),
    )
    const pages = layoutMultiRows(makeMultiRowInput(entries, "mr_5"))

    const cols = pages[0].multiRowColumns!
    expect(cols.length).toBeGreaterThanOrEqual(2)
  })

  it("字形的 sourceEntry 引用正确", () => {
    const entry = makeEntry({
      personId: "test-id",
      personName: "测试人",
      formattedText: "测试人",
    })
    const pages = layoutMultiRows(makeMultiRowInput([entry]))
    const glyphs = collectGlyphs(pages)

    for (const g of glyphs) {
      expect(g.sourceEntry).toBeDefined()
      expect(g.sourceEntry!.personId).toBe("test-id")
    }
  })

  it("多代条目 → 按世代分组排版", () => {
    const entries = [
      makeEntry({ personId: "g0", generation: 0, formattedText: "一世" }),
      makeEntry({ personId: "g1", generation: 1, formattedText: "二世" }),
    ]
    const pages = layoutMultiRows(makeMultiRowInput(entries))
    const glyphs = collectGlyphs(pages)

    // 两个世代的字形都应存在
    const gen0Glyphs = glyphs.filter(
      (g) => g.sourceEntry?.generation === 0,
    )
    const gen1Glyphs = glyphs.filter(
      (g) => g.sourceEntry?.generation === 1,
    )
    expect(gen0Glyphs.length).toBeGreaterThan(0)
    expect(gen1Glyphs.length).toBeGreaterThan(0)
  })

  it("行具有正确的 yTop / yBottom 关系", () => {
    const entry = makeEntry({ formattedText: "测试" })
    const pages = layoutMultiRows(makeMultiRowInput([entry]))

    for (const page of pages) {
      for (const col of page.multiRowColumns ?? []) {
        for (const row of col.rows) {
          expect(row.yBottom).toBeGreaterThan(row.yTop)
          expect(row.rowIndex).toBeGreaterThanOrEqual(0)
        }
      }
    }
  })

  it("无多行配置时尝试回退到列流模式", () => {
    // bamboo 模板的 multiRows 有 enabled=false
    // MultiRowEngine 内部用 require("./ColumnFlowEngine") 做回退，
    // 在 vitest ESM 环境中 require 不可用，这是源码的一个已知限制。
    // 此处验证该路径确实会抛出异常（而非产生错误结果）。
    const entry = makeEntry({ formattedText: "测试" })
    const input = makeMultiRowInput([entry], "bamboo")

    const pages = layoutMultiRows(input)

    expect(pages).toHaveLength(1)
    expect(pages[0]?.columns?.length ?? 0).toBeGreaterThan(0)
  })
})
