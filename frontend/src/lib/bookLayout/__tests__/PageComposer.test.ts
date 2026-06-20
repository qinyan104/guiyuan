/**
 * PageComposer.test.ts — 页面合成器测试
 *
 * 测试 composePage 和 composePages 的纯组合逻辑。
 * PageComposer 不直接依赖 Canvas API，仅使用 getTextArea (纯计算)。
 */

import { describe, it, expect } from "vitest"
import { composePage, composePages } from "../PageComposer"
import { getCanvasConfig } from "../CanvasConfig"
import type {
  CanvasConfig,
  ColumnGlyphs,
  Glyph,
  MultiRowColumnGlyphs,
  PageGlyphs,
} from "../types"

// ── 辅助：构建 mock 数据 ──

function makeGlyph(overrides: Partial<Glyph> = {}): Glyph {
  return {
    char: "字",
    x: 100,
    y: 100,
    fontIndex: 0,
    fontSize: 18,
    color: "black",
    width: 24,
    height: 24,
    ...overrides,
  }
}

function makeEmptyPageGlyphs(pageNumber = 1): PageGlyphs {
  return {
    pageNumber,
    columns: [],
    generationHeaders: [],
  }
}

function makePageGlyphs(
  pageNumber: number,
  columnCount: number,
  glyphsPerColumn: number,
  config?: CanvasConfig,
): PageGlyphs {
  const cfg = config ?? getCanvasConfig("simple")
  const colWidth = 50
  const columns: ColumnGlyphs[] = []
  for (let i = 0; i < columnCount; i++) {
    const glyphs: Glyph[] = []
    for (let j = 0; j < glyphsPerColumn; j++) {
      glyphs.push(
        makeGlyph({
          char: String.fromCharCode(0x4e00 + i * glyphsPerColumn + j),
          x: 100 + i * colWidth,
          y: 100 + j * 30,
        }),
      )
    }
    columns.push({
      columnIndex: i,
      x: 100 + i * colWidth,
      y: 100,
      width: colWidth,
      height: 500,
      glyphs,
    })
  }
  return { pageNumber, columns, generationHeaders: [] }
}

function makeMultiRowPageGlyphs(pageNumber = 1): PageGlyphs {
  const rows = [
    {
      rowIndex: 0,
      yTop: 100,
      yBottom: 150,
      glyphs: [makeGlyph({ char: "甲", x: 100, y: 125 })],
    },
    {
      rowIndex: 1,
      yTop: 150,
      yBottom: 200,
      glyphs: [makeGlyph({ char: "乙", x: 100, y: 175 })],
    },
  ]
  const multiRowColumns: MultiRowColumnGlyphs[] = [
    { columnIndex: 0, x: 100, width: 60, rows },
  ]
  return { pageNumber, multiRowColumns, generationHeaders: [] }
}

// ── composePage ──

describe("composePage", () => {
  const config = getCanvasConfig("simple")

  it("空字形 → 产出有效页面结构", () => {
    const glyphs = makeEmptyPageGlyphs(1)
    const page = composePage(glyphs, config, 1)

    expect(page).toBeDefined()
    expect(page.pageNumber).toBe(1)
    expect(page.width).toBe(config.width)
    expect(page.height).toBe(config.height)
    expect(page.layers).toBeInstanceOf(Array)
    expect(page.layers.length).toBeGreaterThan(0) // 至少有背景层
    expect(page.hitRegions).toBeInstanceOf(Array)
    expect(page.glyphs).toBe(glyphs)
  })

  it("第一层是背景层", () => {
    const glyphs = makeEmptyPageGlyphs(1)
    const page = composePage(glyphs, config, 1)
    const bg = page.layers[0]
    expect(bg.kind).toBe("background")
    if (bg.kind === "background") {
      expect(bg.color).toBe(config.backgroundColor)
      expect(bg.pageWidth).toBe(config.width)
      expect(bg.pageHeight).toBe(config.height)
    }
  })

  it("有字形时生成 glyph 层", () => {
    const glyphs = makePageGlyphs(1, 2, 3)
    const page = composePage(glyphs, config, 1)

    const glyphLayers = page.layers.filter((l) => l.kind === "glyph")
    expect(glyphLayers.length).toBeGreaterThanOrEqual(1)
  })

  it("有版框配置时生成 frame 层", () => {
    const glyphs = makeEmptyPageGlyphs(1)
    const page = composePage(glyphs, config, 1)

    const frameLayers = page.layers.filter((l) => l.kind === "frame")
    // simple 模板 inlineWidth=1, outlineWidth=1，应生成 frame 层
    expect(frameLayers.length).toBe(1)
  })

  it("有鱼尾配置时生成 fishTail 层", () => {
    const mr5Config = getCanvasConfig("mr_5")
    const glyphs = makeEmptyPageGlyphs(1)
    const page = composePage(glyphs, mr5Config, 1)

    const fishLayers = page.layers.filter((l) => l.kind === "fishTail")
    // mr_5 有鱼尾 → 应有上下两个 fishTail 层
    expect(fishLayers.length).toBe(2)
  })

  it("无鱼尾配置（simple）不生成 fishTail 层", () => {
    const glyphs = makeEmptyPageGlyphs(1)
    const page = composePage(glyphs, config, 1)

    const fishLayers = page.layers.filter((l) => l.kind === "fishTail")
    expect(fishLayers.length).toBe(0)
  })

  it("生成 header 层", () => {
    const glyphs = makeEmptyPageGlyphs(1)
    const page = composePage(glyphs, config, 1)

    const headerLayers = page.layers.filter((l) => l.kind === "header")
    expect(headerLayers.length).toBe(1)
  })

  it("有 logo 文字时生成 footer 层", () => {
    const glyphs = makeEmptyPageGlyphs(1)
    // mr_5 有 logo 文字 "兀雨书屋"
    const mr5Config = getCanvasConfig("mr_5")
    const page = composePage(glyphs, mr5Config, 1)

    const footerLayers = page.layers.filter((l) => l.kind === "footer")
    expect(footerLayers.length).toBe(1)
  })

  it("多行模式生成 rowLine 层", () => {
    const glyphs = makeMultiRowPageGlyphs(1)
    const mr5Config = getCanvasConfig("mr_5") // multiRows.enabled = true
    const page = composePage(glyphs, mr5Config, 1)

    const rowLineLayers = page.layers.filter((l) => l.kind === "rowLine")
    // 有 2 行 → 1 条分隔线
    expect(rowLineLayers.length).toBeGreaterThanOrEqual(1)
  })

  it("字形有 sourceEntry 时生成 hitRegions", () => {
    const col: ColumnGlyphs = {
      columnIndex: 0,
      x: 100,
      y: 100,
      width: 50,
      height: 500,
      glyphs: [
        makeGlyph({
          char: "张",
          x: 110,
          y: 120,
          sourceEntry: {
            personId: "person-1",
            personName: "张三",
            formattedText: "张三",
            generation: 0,
            gender: "male",
          },
        }),
      ],
    }
    const glyphs: PageGlyphs = {
      pageNumber: 1,
      columns: [col],
      generationHeaders: [],
    }
    const page = composePage(glyphs, config, 1)

    expect(page.hitRegions.length).toBe(1)
    expect(page.hitRegions[0].id).toBe("person-1")
    expect(page.hitRegions[0].action).toBe("edit")
    expect(page.hitRegions[0].entry.personId).toBe("person-1")
  })

  it("字形无 sourceEntry 时不生成 hitRegions", () => {
    const col: ColumnGlyphs = {
      columnIndex: 0,
      x: 100,
      y: 100,
      width: 50,
      height: 500,
      glyphs: [makeGlyph({ char: "张", x: 110, y: 120 })], // 无 sourceEntry
    }
    const glyphs: PageGlyphs = {
      pageNumber: 1,
      columns: [col],
      generationHeaders: [],
    }
    const page = composePage(glyphs, config, 1)
    expect(page.hitRegions.length).toBe(0)
  })
})

// ── composePages ──

describe("composePages", () => {
  const config = getCanvasConfig("simple")

  it("空数组 → 返回空数组", () => {
    const pages = composePages([], config)
    expect(pages).toEqual([])
  })

  it("单页输入 → 输出单页", () => {
    const input = [makePageGlyphs(1, 2, 2)]
    const pages = composePages(input, config)
    expect(pages.length).toBe(1)
    expect(pages[0].pageNumber).toBe(1)
  })

  it("多页输入 → 正确页数", () => {
    const input = [
      makePageGlyphs(1, 2, 2),
      makePageGlyphs(2, 2, 2),
      makePageGlyphs(3, 1, 1),
    ]
    const pages = composePages(input, config)
    expect(pages.length).toBe(3)
    expect(pages[0].pageNumber).toBe(1)
    expect(pages[1].pageNumber).toBe(2)
    expect(pages[2].pageNumber).toBe(3)
  })

  it("每页都有层数组", () => {
    const input = [makePageGlyphs(1, 1, 1), makePageGlyphs(2, 1, 1)]
    const pages = composePages(input, config)
    for (const page of pages) {
      expect(page.layers).toBeInstanceOf(Array)
      expect(page.layers.length).toBeGreaterThan(0)
    }
  })
})
