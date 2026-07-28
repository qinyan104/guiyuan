import fontkit from "@pdf-lib/fontkit"

export const BOOK_FONT_URLS = {
  "qiji-combo": "/vrain/fonts/qiji-combo.ttf",
  "WenYue-GuTiFangSong": "/vrain/fonts/WenYue-GuTiFangSong-JRFC-2.otf",
  XiaolaiMonoSC: "/vrain/fonts/XiaolaiMonoSC-Regular.ttf",
  PingXianZhenSong: "/vrain/fonts/PingXianZhenSong.ttf",
  HanaMinA: "/vrain/fonts/HanaMinA.ttf",
} as const

export const CJK_FALLBACK_FONT = "HanaMinA"

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
  const [preferredCoverage, fallbackCoverage] = await Promise.all([
    loadFontCoverage(preferredFont),
    loadFontCoverage(CJK_FALLBACK_FONT),
  ])

  return (family, char) => {
    const actualFamily = resolveBookFontFamily(family)
    const coverage = actualFamily === preferredFont ? preferredCoverage : actualFamily === CJK_FALLBACK_FONT ? fallbackCoverage : undefined
    return coverage?.has(char.codePointAt(0) ?? -1) ?? false
  }
}
