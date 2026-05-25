/**
 * CanvasRenderer — Canvas 2D 渲染器
 *
 * 将 ComposedPage 的渲染图层绘制到 HTML Canvas。
 * 每种 RenderLayer 类型有对应的绘制函数。
 *
 * 使用方式：
 *   const renderer = new CanvasRenderer()
 *   renderer.render(ctx, page)  // 绘制页面
 *   renderer.hitTest(mouseX, mouseY, page)  // 点击检测
 */

import type { ComposedPage, HitRegion, RenderLayer } from "./types"

export class CanvasRenderer {
  /** 全局缩放因子（用于高清屏适配） */
  private dpr: number
  /** 纹理图片缓存 */
  private imageCache = new Map<string, HTMLImageElement>()
  /** 已加载的字体 */
  private loadedFonts = new Set<string>()

  constructor(dpr?: number) {
    this.dpr = dpr ?? (typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1)
  }

  /** 预加载字体 */
  async preloadFont(name: string, url: string): Promise<void> {
    if (this.loadedFonts.has(name)) return
    try {
      const font = new FontFace(name, `url(${url})`)
      await font.load()
      document.fonts.add(font)
      this.loadedFonts.add(name)
    } catch {
      console.warn(`Font load failed: ${name}`)
    }
  }

  /** 预加载纹理图片 */
  async preloadImages(urls: string[]): Promise<void> {
    const toLoad = urls.filter((u) => u && !this.imageCache.has(u))
    await Promise.all(
      toLoad.map(
        (url) =>
          new Promise<void>((resolve) => {
            const img = new Image()
            img.onload = () => { this.imageCache.set(url, img); resolve() }
            img.onerror = () => resolve()
            img.src = url
          }),
      ),
    )
  }

  /**
   * 渲染完整页面到 Canvas 上下文
   */
  render(ctx: CanvasRenderingContext2D, page: ComposedPage, scale = 1): void {
    ctx.save()

    if (scale !== 1) {
      ctx.scale(scale, scale)
    }

    for (const layer of page.layers) {
      this.renderLayer(ctx, layer)
    }

    ctx.restore()
  }

  /**
   * 绘制单个图层
   */
  private renderLayer(ctx: CanvasRenderingContext2D, layer: RenderLayer): void {
    switch (layer.kind) {
      case "background":
        this.renderBackground(ctx, layer)
        break
      case "frame":
        this.renderFrame(ctx, layer)
        break
      case "fishTail":
        this.renderFishTail(ctx, layer)
        break
      case "header":
        this.renderHeader(ctx, layer)
        break
      case "footer":
        this.renderFooter(ctx, layer)
        break
      case "glyph":
        this.renderGlyphs(ctx, layer)
        break
      case "rowLine":
        this.renderRowLines(ctx, layer)
        break
    }
  }

  /**
   * 点击检测：返回鼠标坐标下的交互区域
   */
  hitTest(
    mouseX: number,
    mouseY: number,
    page: ComposedPage,
    scale = 1,
  ): HitRegion | null {
    const sx = mouseX / scale
    const sy = mouseY / scale

    // 从后往前查找（上层优先）
    for (let i = page.hitRegions.length - 1; i >= 0; i--) {
      const region = page.hitRegions[i]
      const r = region.rect
      if (sx >= r.x && sx <= r.x + r.width && sy >= r.y && sy <= r.y + r.height) {
        return region
      }
    }
    return null
  }

  /**
   * 绘制编辑光标
   */
  renderCursor(
    ctx: CanvasRenderingContext2D,
    region: HitRegion,
    scale = 1,
  ): void {
    ctx.save()
    if (scale !== 1) ctx.scale(scale, scale)

    const r = region.rect
    ctx.strokeStyle = "#e04040"
    ctx.lineWidth = 2
    ctx.setLineDash([4, 3])
    ctx.strokeRect(r.x - 1, r.y - 1, r.width + 2, r.height + 2)
    ctx.setLineDash([])

    ctx.restore()
  }

  /**
   * 获取 Canvas 适配高清屏的实际尺寸
   */
  getCanvasSize(page: ComposedPage): { width: number; height: number } {
    return {
      width: page.width * this.dpr,
      height: page.height * this.dpr,
    }
  }

  /**
   * 计算缩放以适配容器
   */
  /**
   * 计算缩放以填充容器（而不是适配）
   * 使用 90% 的容器空间，让页面尽量大
   */
  /**
   * 计算页面缩放
   * - containerScale: 让页面填满容器
   * - comfortScale:   让文字达到舒适可读大小（目标 ~11pt 视觉）
   * - 取两者中较大的，但不超过 2x
   */
  getFitScale(page: ComposedPage, containerWidth: number, containerHeight: number, fontSize = 14): number {
    const usableW = containerWidth * 0.92
    const usableH = containerHeight * 0.92
    const containerScale = Math.min(usableW / page.width, usableH / page.height)
    const comfortScale = 11 / fontSize // 目标视觉 11pt
    return Math.max(containerScale, Math.min(comfortScale, 2))
  }

  // ── 各图层绘制 ──

  private renderBackground(
    ctx: CanvasRenderingContext2D,
    layer: import("./types").BackgroundLayer,
  ): void {
    ctx.save()
    ctx.setTransform(1, 0, 0, 1, 0, 0)
    const W = ctx.canvas.width
    const H = ctx.canvas.height

    // 底色
    ctx.fillStyle = layer.color
    ctx.fillRect(0, 0, W, H)

    // 纸张纹理叠加
    if (layer.textureUrl) {
      const img = this.imageCache.get(layer.textureUrl)
      if (img && img.complete) {
        const opacity = layer.textureOpacity ?? 0.25
        ctx.globalAlpha = opacity

        // 用 Canvas pattern 铺满纹理
        try {
          const pattern = ctx.createPattern(img, "repeat")
          if (pattern) {
            ctx.fillStyle = pattern
            ctx.fillRect(0, 0, W, H)
          }
        } catch {
          // pattern 创建失败时直接画一张拉伸的图
          ctx.drawImage(img, 0, 0, W, H)
        }
        ctx.globalAlpha = 1
      }
    }

    ctx.restore()
  }

  private renderFrame(
    ctx: CanvasRenderingContext2D,
    layer: import("./types").FrameLayer,
  ): void {
    // 外框
    if (layer.outline) {
      const o = layer.outline
      ctx.strokeStyle = o.color
      ctx.lineWidth = o.lineWidth
      ctx.strokeRect(o.x, o.y, o.width, o.height)
    }

    // 内框
    {
      const i = layer.inline
      if (i.lineWidth > 0) {
        ctx.strokeStyle = i.color
        ctx.lineWidth = i.lineWidth
        ctx.strokeRect(i.x, i.y, i.width, i.height)
      }
    }

    // 版心折叠线
    if (layer.centerFold) {
      const cf = layer.centerFold
      ctx.strokeStyle = cf.color
      ctx.lineWidth = cf.lineWidth
      ctx.beginPath()
      ctx.moveTo(cf.x, cf.yTop)
      ctx.lineTo(cf.x, cf.yBottom)
      ctx.stroke()
    }
  }

  private renderFishTail(
    ctx: CanvasRenderingContext2D,
    layer: import("./types").FishTailLayer,
  ): void {
    const { centerX, rectY, rectHeight, triaHeight, triaDirection, color, lineWidth } = layer

    ctx.strokeStyle = color
    ctx.fillStyle = color
    ctx.lineWidth = lineWidth
    ctx.lineCap = "round"

    // 矩形身体
    const halfW = 12 // 鱼尾宽度的一半
    ctx.strokeRect(centerX - halfW, rectY, halfW * 2, rectHeight)

    // 三角形尾巴
    const triaY = triaDirection === "up"
      ? rectY - triaHeight
      : rectY + rectHeight

    // 如果有弧形鱼尾图，用图片替代三角形
    if (layer.flowerImageUrl) {
      const img = this.imageCache.get(layer.flowerImageUrl)
      if (img && img.complete) {
        const imgW = halfW * 2 + 12
        const imgH = triaHeight + 8
        const imgX = centerX - imgW / 2
        const imgY = triaDirection === "up" ? triaY - 4 : rectY + rectHeight
        ctx.drawImage(img, imgX, imgY, imgW, imgH)
        // 画完后跳过三角形绘制
      } else {
        this.drawFishTailTriangle(ctx, centerX, halfW, triaDirection, rectY, rectHeight, triaY)
      }
    } else {
      this.drawFishTailTriangle(ctx, centerX, halfW, triaDirection, rectY, rectHeight, triaY)
    }

    // 连接线
    if (layer.connectorLine) {
      const cl = layer.connectorLine
      ctx.strokeStyle = cl.color
      ctx.lineWidth = cl.lineWidth
      ctx.beginPath()
      ctx.moveTo(centerX, cl.yTop)
      ctx.lineTo(centerX, cl.yBottom)
      ctx.stroke()
    }
  }

  private renderHeader(
    ctx: CanvasRenderingContext2D,
    layer: import("./types").HeaderLayer,
  ): void {
    ctx.fillStyle = layer.color
    ctx.font = `${layer.fontSize}pt "${layer.fontFamily}"`
    ctx.textAlign = "center"
    ctx.textBaseline = "top"
    ctx.fillText(layer.title, layer.x, layer.y)
  }

  private renderFooter(
    ctx: CanvasRenderingContext2D,
    layer: import("./types").FooterLayer,
  ): void {
    if (layer.logoText) {
      ctx.fillStyle = layer.color
      ctx.font = `${layer.fontSize}pt "${layer.fontFamily}"`
      ctx.textAlign = "center"
      ctx.textBaseline = "bottom"
      ctx.fillText(layer.logoText, layer.x, layer.logoY ?? layer.y)
    }
  }

  private drawFishTailTriangle(
    ctx: CanvasRenderingContext2D,
    centerX: number,
    halfW: number,
    triaDirection: "up" | "down",
    rectY: number,
    rectHeight: number,
    triaY: number,
  ): void {
    ctx.beginPath()
    ctx.moveTo(centerX - halfW - 6, triaDirection === "up" ? rectY : rectY + rectHeight)
    ctx.lineTo(centerX, triaY)
    ctx.lineTo(centerX + halfW + 6, triaDirection === "up" ? rectY : rectY + rectHeight)
    ctx.closePath()
    ctx.stroke()
  }

  private renderGlyphs(
    ctx: CanvasRenderingContext2D,
    layer: import("./types").GlyphLayer,
  ): void {
    for (const glyph of layer.glyphs) {
      ctx.fillStyle = glyph.color
      ctx.font = `${glyph.fontSize}pt "qiji-combo", "Noto Serif SC", serif`
      ctx.textAlign = "left"
      ctx.textBaseline = "alphabetic"
      ctx.fillText(glyph.char, glyph.x, glyph.y)
    }
  }

  private renderRowLines(
    ctx: CanvasRenderingContext2D,
    layer: import("./types").RowLineLayer,
  ): void {
    for (const line of layer.lines) {
      ctx.strokeStyle = line.color
      ctx.lineWidth = line.lineWidth
      ctx.beginPath()
      ctx.moveTo(line.x1, line.y1)
      ctx.lineTo(line.x2, line.y2)
      ctx.stroke()
    }
  }
}

/** 默认渲染器实例 */
let defaultRenderer: CanvasRenderer | null = null

export function getCanvasRenderer(): CanvasRenderer {
  if (!defaultRenderer) {
    defaultRenderer = new CanvasRenderer()
  }
  return defaultRenderer
}
