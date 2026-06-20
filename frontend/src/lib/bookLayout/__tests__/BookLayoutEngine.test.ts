/**
 * BookLayoutEngine.test.ts — 主排版引擎测试
 *
 * 测试 DEFAULT_LAYOUT_OPTIONS 默认值和引擎实例化。
 * 需要 mock FontMetricsEngine（依赖 Canvas API）。
 */

import { describe, it, expect, vi, beforeEach } from "vitest"
import type { LineageEntry } from "../../../types/publishing"

// ── Mock FontMetricsEngine ──
vi.mock("../FontMetricsEngine", () => ({
  getFontMetricsEngine: () => ({
    measure: vi.fn((_char: string, _font: string, _size: number) => ({
      width: 22,
      height: 22,
      ascender: 18,
      descender: 4,
    })),
    preload: vi.fn(async () => {}),
    clearCache: vi.fn(),
    cacheSize: 0,
    getAverageWidth: vi.fn(() => 22),
    measureBatch: vi.fn((chars: string[]) =>
      chars.map(() => ({ width: 22, height: 22, ascender: 18, descender: 4 })),
    ),
  }),
}))

import {
  BookLayoutEngine,
  DEFAULT_LAYOUT_OPTIONS,
  getBookLayoutEngine,
} from "../BookLayoutEngine"

// ── DEFAULT_LAYOUT_OPTIONS ──

describe("DEFAULT_LAYOUT_OPTIONS", () => {
  it("包含所有必要字段", () => {
    expect(DEFAULT_LAYOUT_OPTIONS).toBeDefined()
    expect(typeof DEFAULT_LAYOUT_OPTIONS.fontSize).toBe("number")
    expect(typeof DEFAULT_LAYOUT_OPTIONS.lineHeight).toBe("number")
    expect(typeof DEFAULT_LAYOUT_OPTIONS.columns).toBe("number")
    expect(DEFAULT_LAYOUT_OPTIONS.marginPreset).toBeDefined()
  })

  it("默认字号为 18", () => {
    expect(DEFAULT_LAYOUT_OPTIONS.fontSize).toBe(18)
  })

  it("默认行距为 1.9", () => {
    expect(DEFAULT_LAYOUT_OPTIONS.lineHeight).toBe(1.9)
  })

  it("默认列为 1", () => {
    expect(DEFAULT_LAYOUT_OPTIONS.columns).toBe(1)
  })

  it("默认边距预设为 standard", () => {
    expect(DEFAULT_LAYOUT_OPTIONS.marginPreset).toBe("standard")
  })

  it("默认字体为 qiji-combo", () => {
    expect(DEFAULT_LAYOUT_OPTIONS.fontFamily).toBe("qiji-combo")
  })
})

// ── BookLayoutEngine 实例化 ──

describe("BookLayoutEngine", () => {
  it("可以无参实例化", () => {
    const engine = new BookLayoutEngine()
    expect(engine).toBeDefined()
    expect(engine).toBeInstanceOf(BookLayoutEngine)
  })

  it("getCanvasConfig 方法返回有效配置", () => {
    const engine = new BookLayoutEngine()
    const config = engine.getCanvasConfig("mr_5")
    expect(config).toBeDefined()
    expect(config.id).toBe("mr_5")
    expect(config.width).toBeGreaterThan(0)
    expect(config.height).toBeGreaterThan(0)
  })

  it("clearCache 不抛异常", () => {
    const engine = new BookLayoutEngine()
    expect(() => engine.clearFontCache()).not.toThrow()
    expect(() => engine.clearFontCache("qiji-combo", 18)).not.toThrow()
  })
})

// ── getBookLayoutEngine 单例 ──

describe("getBookLayoutEngine", () => {
  it("返回 BookLayoutEngine 实例", () => {
    const engine = getBookLayoutEngine()
    expect(engine).toBeInstanceOf(BookLayoutEngine)
  })

  it("多次调用返回同一实例", () => {
    const a = getBookLayoutEngine()
    const b = getBookLayoutEngine()
    expect(a).toBe(b)
  })
})

// ── layoutSync 完整排版测试 ──

describe("BookLayoutEngine.layoutSync", () => {
  it("空条目 → 返回有效页面数组", () => {
    const engine = new BookLayoutEngine()
    const pages = engine.layoutSync([], "simple")
    expect(pages).toBeInstanceOf(Array)
  })

  it("单条目 → 返回至少一页 ComposedPage", () => {
    const engine = new BookLayoutEngine()
    const entry: LineageEntry = {
      personId: "p1",
      personName: "张三",
      formattedText: "张三字伯元",
      generation: 0,
      gender: "male",
    }
    const pages = engine.layoutSync([entry], "simple")
    expect(pages.length).toBeGreaterThanOrEqual(1)

    const first = pages[0]
    expect(first.pageNumber).toBe(1)
    expect(first.width).toBeGreaterThan(0)
    expect(first.height).toBeGreaterThan(0)
    expect(first.layers).toBeInstanceOf(Array)
    expect(first.layers.length).toBeGreaterThan(0)
    expect(first.hitRegions).toBeInstanceOf(Array)
    expect(first.glyphs).toBeDefined()
  })

  it("多行模式模板（mr_5）正确排版", () => {
    const engine = new BookLayoutEngine()
    const entries: LineageEntry[] = [
      {
        personId: "p1",
        personName: "张三",
        formattedText: "张三字伯元号清溪",
        generation: 0,
        gender: "male",
      },
      {
        personId: "p2",
        personName: "张四",
        formattedText: "张四字仲亨",
        generation: 1,
        gender: "male",
      },
    ]
    const pages = engine.layoutSync(entries, "mr_5")
    expect(pages.length).toBeGreaterThanOrEqual(1)

    // mr_5 有多行模式 → glyphs 应有 multiRowColumns
    // composedPage 的 glyphs 保留原始排版数据
    expect(pages[0].glyphs).toBeDefined()
  })

  it("自定义 options 覆盖默认值", () => {
    const engine = new BookLayoutEngine()
    const entry: LineageEntry = {
      personId: "p1",
      personName: "李",
      formattedText: "李",
      generation: 0,
      gender: "male",
    }
    const pages = engine.layoutSync([entry], "simple", {
      fontSize: 24,
      lineHeight: 2.0,
      columns: 1,
      marginPreset: "compact",
    })
    expect(pages.length).toBeGreaterThanOrEqual(1)
  })
})

// ── layoutRaw 测试 ──

describe("BookLayoutEngine.layoutRaw", () => {
  it("返回原始 PageGlyphs（无装饰层）", () => {
    const engine = new BookLayoutEngine()
    const entry: LineageEntry = {
      personId: "p1",
      personName: "张三",
      formattedText: "张三",
      generation: 0,
      gender: "male",
    }
    const raw = engine.layoutRaw([entry], "simple")
    expect(raw).toBeInstanceOf(Array)
    expect(raw.length).toBeGreaterThanOrEqual(1)

    // PageGlyphs 结构
    const first = raw[0]
    expect(first.pageNumber).toBe(1)
    expect(first.generationHeaders).toBeDefined()
    // simple 模板使用 columns
    expect(first.columns).toBeDefined()
  })
})
