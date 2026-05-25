/**
 * FontMetricsEngine — 字体度量引擎
 *
 * 使用离屏 Canvas 精确测量每个字符在指定字体/字号下的渲染尺寸。
 * 支持批量预加载和 LRU 缓存，保证排版性能。
 *
 * 设计原则：
 * - 零 DOM 依赖，纯 Canvas API
 * - 惰性创建 Canvas（仅首次度量时）
 * - LRU 缓存避免重复测量
 * - 键格式: "fontFamily|fontSize|char"
 */

export interface FontMetric {
  /** 字符渲染宽度（水平 advance width） */
  width: number
  /** 字符渲染高度（= fontSize，实际字形高度） */
  height: number
  /** 字体上行高度（baseline 上方，用于中文约 = fontSize * 0.8） */
  ascender: number
  /** 字体下行高度（baseline 下方，用于中文约 = fontSize * 0.2） */
  descender: number
}

/** 度量请求参数 */
export interface MeasureRequest {
  fontFamily: string
  fontSize: number
  char: string
}

/**
 * 常用中文字符集（CJK Unified Ideographs 基本区 U+4E00-U+9FFF）
 * 覆盖族谱文本中 99% 的汉字
 */
const COMMON_CHARS: string[] = (function () {
  const chars: string[] = []
  for (let cp = 0x4e00; cp <= 0x9fff; cp++) {
    chars.push(String.fromCodePoint(cp))
  }
  return chars
})()

/** 常用标点符号 */
const COMMON_PUNCTUATION = [
  "，", "。", "、", "；", "：", "？", "！",
  "\u201c", "\u201d", "\u2018", "\u2019",
  "（", "）", "《", "》", "【", "】",
  "…", "—", "～", "·", "　", " ",
  "%", "$", "&", "@", "\n",
  "一", "二", "三", "四", "五", "六", "七", "八", "九", "十",
  "百", "千", "万",
].join("")

export class FontMetricsEngine {
  private canvas: HTMLCanvasElement | null = null
  private ctx: CanvasRenderingContext2D | null = null

  /** 缓存: "font|size|char" → FontMetric */
  private cache = new Map<string, FontMetric>()

  /** LRU 淘汰队列 */
  private lruQueue: string[] = []

  /** 最大缓存条目数 */
  private readonly maxCacheSize: number

  constructor(maxCacheSize = 10000) {
    this.maxCacheSize = maxCacheSize
  }

  // ── 公开 API ──

  /**
   * 测量单个字符
   * 如果缓存命中则直接返回，否则即时测量并缓存
   */
  measure(char: string, fontFamily: string, fontSize: number): FontMetric {
    const key = this.cacheKey(fontFamily, fontSize, char)
    const cached = this.cache.get(key)
    if (cached) {
      this.touchLRU(key)
      return cached
    }
    const metric = this.measureUncached(char, fontFamily, fontSize)
    this.setCache(key, metric)
    return metric
  }

  /**
   * 批量测量字符（用于预加载字库）
   * 返回 Promise 以便在需要时等待完成
   */
  measureBatch(
    chars: string[],
    fontFamily: string,
    fontSize: number,
  ): FontMetric[] {
    return chars.map((char) => this.measure(char, fontFamily, fontSize))
  }

  /**
   * 预加载常用中文字符集到指定字体/字号
   * 用于在排版前批量预热缓存
   */
  async preload(fontFamily: string, fontSize: number): Promise<void> {
    const allChars = [
      ...new Set([
        ...COMMON_CHARS,
        ...COMMON_PUNCTUATION,
      ]),
    ].join("")

    // 批量测量（利用 Canvas measureText 的特性，一次测量整个字符串可能更快）
    // 但我们仍需逐个字符记录宽度
    this.ensureCanvas()

    const ctx = this.ctx!
    ctx.font = `${fontSize}pt "${fontFamily}"`

    for (const char of allChars) {
      const key = this.cacheKey(fontFamily, fontSize, char)
      if (!this.cache.has(key)) {
        const metrics = ctx.measureText(char)
        const metric: FontMetric = {
          width: metrics.width,
          height: fontSize,
          ascender: fontSize * 0.8,
          descender: fontSize * 0.2,
        }
        this.setCache(key, metric)
      }
    }
  }

  /**
   * 清除指定字体/字号的缓存
   */
  clearCache(fontFamily?: string, fontSize?: number): void {
    if (!fontFamily && !fontSize) {
      this.cache.clear()
      this.lruQueue = []
      return
    }

    const prefix = fontFamily ? `${fontFamily}|${fontSize ?? ""}` : `|${fontSize}`
    const toDelete: string[] = []
    for (const key of this.cache.keys()) {
      if (key.startsWith(prefix)) {
        toDelete.push(key)
      }
    }
    for (const key of toDelete) {
      this.cache.delete(key)
    }
    this.lruQueue = this.lruQueue.filter((k) => !toDelete.includes(k))
  }

  /** 获取当前缓存大小 */
  get cacheSize(): number {
    return this.cache.size
  }

  /**
   * 获取字符集的平均宽度（用于列宽估算）
   */
  getAverageWidth(chars: string[], fontFamily: string, fontSize: number): number {
    if (chars.length === 0) return 0
    let total = 0
    for (const char of chars) {
      total += this.measure(char, fontFamily, fontSize).width
    }
    return total / chars.length
  }

  // ── 内部方法 ──

  private cacheKey(fontFamily: string, fontSize: number, char: string): string {
    return `${fontFamily}|${fontSize}|${char}`
  }

  private ensureCanvas(): void {
    if (!this.canvas) {
      this.canvas = document.createElement("canvas")
      this.canvas.width = 1
      this.canvas.height = 1
      this.ctx = this.canvas.getContext("2d")!
    }
  }

  private measureUncached(
    char: string,
    fontFamily: string,
    fontSize: number,
  ): FontMetric {
    this.ensureCanvas()

    const ctx = this.ctx!
    ctx.font = `${fontSize}pt "${fontFamily}"`

    const metrics = ctx.measureText(char)

    return {
      width: metrics.width,
      height: fontSize,
      ascender: fontSize * 0.8,
      descender: fontSize * 0.2,
    }
  }

  private setCache(key: string, metric: FontMetric): void {
    // LRU 淘汰
    while (this.cache.size >= this.maxCacheSize && this.lruQueue.length > 0) {
      const oldest = this.lruQueue.shift()!
      this.cache.delete(oldest)
    }

    this.cache.set(key, metric)
    this.lruQueue.push(key)
  }

  private touchLRU(key: string): void {
    const idx = this.lruQueue.indexOf(key)
    if (idx !== -1) {
      this.lruQueue.splice(idx, 1)
      this.lruQueue.push(key)
    }
  }
}

/** 默认单例（可复用，避免重复创建 Canvas） */
let defaultInstance: FontMetricsEngine | null = null

export function getFontMetricsEngine(): FontMetricsEngine {
  if (!defaultInstance) {
    defaultInstance = new FontMetricsEngine()
  }
  return defaultInstance
}
