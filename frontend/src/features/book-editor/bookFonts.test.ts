import { readFile } from "node:fs/promises"
import { resolve } from "node:path"
import { afterEach, describe, expect, it, vi } from "vitest"
import { CJK_FALLBACK_FONT, loadBookFontSupport } from "./bookFonts"

const EXTENSION_C_CHARACTER = String.fromCodePoint(0x2a700)

afterEach(() => vi.unstubAllGlobals())

describe("loadBookFontSupport", () => {
  it("字体临时加载失败后可以重试并读取随项目发布的后备字形", async () => {
    let requests = 0
    vi.stubGlobal("fetch", vi.fn(async (input: string) => {
      requests += 1
      if (requests === 1) throw new Error("temporary font failure")
      const fileName = input.split("/").at(-1)
      const bytes = await readFile(resolve(`public/vrain/fonts/${fileName}`))
      return { ok: true, arrayBuffer: async () => Uint8Array.from(bytes).buffer } as Response
    }))

    await expect(loadBookFontSupport(CJK_FALLBACK_FONT)).rejects.toThrow("temporary font failure")
    const supportsGlyph = await loadBookFontSupport(CJK_FALLBACK_FONT)

    expect(requests).toBe(4)
    expect(supportsGlyph(CJK_FALLBACK_FONT, "龘")).toBe(true)
    expect(supportsGlyph(CJK_FALLBACK_FONT, "，")).toBe(true)
    expect(supportsGlyph("HanaMinB", EXTENSION_C_CHARACTER)).toBe(true)
  })
})
