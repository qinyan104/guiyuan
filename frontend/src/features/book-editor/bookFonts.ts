import fontkit from "@pdf-lib/fontkit"

export const BOOK_FONT_URLS = {
  "qiji-combo": "/vrain/fonts/qiji-combo.ttf",
  "WenYue-GuTiFangSong": "/vrain/fonts/WenYue-GuTiFangSong-JRFC-2.otf",
  XiaolaiMonoSC: "/vrain/fonts/XiaolaiMonoSC-Regular.ttf",
  PingXianZhenSong: "/vrain/fonts/PingXianZhenSong.ttf",
  HanaMinA: "/vrain/fonts/HanaMinA.ttf",
  HanaMinB: "/vrain/fonts/HanaMinB.ttf",
} as const

export const CJK_FALLBACK_FONT = "HanaMinA"
export const CJK_FALLBACK_FONTS = [CJK_FALLBACK_FONT, "HanaMinB"] as const

export type BookFontSupport = (fontFamily: string, char: string) => boolean

const coverageCache = new Map<string, Promise<ReadonlySet<number>>>()

export function resolveBookFontFamily(fontFamily: string): keyof typeof BOOK_FONT_URLS {
  return Object.prototype.hasOwnProperty.call(BOOK_FONT_URLS, fontFamily)
    ? fontFamily as keyof typeof BOOK_FONT_URLS
    : "qiji-combo"
}

async function loadFontCoverage(fontFamily: keyof typeof BOOK_FONT_URLS): Promise<ReadonlySet<number>> {
  let loading = coverageCache.get(fontFamily)
  if (!loading) {
    loading = fetch(BOOK_FONT_URLS[fontFamily])
      .then(async (response) => {
        if (!response.ok) throw new Error("无法加载排版字体")
        return new Set(fontkit.create(new Uint8Array(await response.arrayBuffer())).characterSet)
      })
      .catch((error) => {
        coverageCache.delete(fontFamily)
        throw error
      })
    coverageCache.set(fontFamily, loading)
  }
  return loading
}

export async function loadBookFontSupport(fontFamily: string): Promise<BookFontSupport> {
  const preferredFont = resolveBookFontFamily(fontFamily)
  const fontFamilies = new Set<keyof typeof BOOK_FONT_URLS>([preferredFont, "qiji-combo", ...CJK_FALLBACK_FONTS])
  const coverage = new Map(await Promise.all(Array.from(fontFamilies, async (family) => [family, await loadFontCoverage(family)] as const)))

  return (family, char) => {
    const actualFamily = resolveBookFontFamily(family)
    return coverage.get(actualFamily)?.has(char.codePointAt(0) ?? -1) ?? false
  }
}
