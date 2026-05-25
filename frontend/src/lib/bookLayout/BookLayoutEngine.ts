/**
 * BookLayoutEngine — 古籍排版引擎统一入口
 *
 * 组合 FontMetricsEngine、CanvasConfig、ColumnFlowEngine、
 * MultiRowEngine、PageComposer，提供一行 API 完成全流程排版。
 *
 * 使用方式：
 *   const engine = new BookLayoutEngine()
 *   const pages = await engine.layout({ entries, canvas, options })
 *   // pages: ComposedPage[] — 可直接用于 Canvas 渲染
 */

import type { LineageEntry } from "../../types/publishing"
import type {
  CanvasConfig,
  ComposedPage,
  LayoutInput,
  LayoutOptions,
  PageGlyphs,
} from "./types"
import { getCanvasConfig } from "./CanvasConfig"
import { getFontMetricsEngine } from "./FontMetricsEngine"
import { layoutColumns } from "./ColumnFlowEngine"
import { layoutMultiRows } from "./MultiRowEngine"
import { composePages } from "./PageComposer"

/** 排版引擎默认选项 */
export const DEFAULT_LAYOUT_OPTIONS: LayoutOptions = {
  fontSize: 18,
  lineHeight: 1.9,
  columns: 1,
  marginPreset: "standard",
  fontFamily: "qiji-combo",
}

export class BookLayoutEngine {
  private fontMetrics = getFontMetricsEngine()

  /**
   * 完整排版流程
   *
   * @param entries - 已格式化的条目列表（来自 lineageText.ts）
   * @param canvasId - 画布模板 ID（如 "mr_5"）
   * @param options - 用户可调排版参数
   * @returns 完整合成后的页面数组，可直接用于 Canvas 渲染
   */
  async layout(
    entries: LineageEntry[],
    canvasId: string,
    options: LayoutOptions = DEFAULT_LAYOUT_OPTIONS,
  ): Promise<ComposedPage[]> {
    // 1. 解析画布配置
    const canvas = getCanvasConfig(canvasId)

    // 2. 预加载字体度量（异步，首次调用批量预热 GB2312 字库）
    await this.fontMetrics.preload("Noto Serif SC", options.fontSize)

    // 3. 构建排版输入
    const input: LayoutInput = { entries, canvas, options }

    // 4. 执行排版（根据是否多行模式选择算法）
    let glyphPages: PageGlyphs[]
    if (canvas.multiRows?.enabled) {
      glyphPages = layoutMultiRows(input)
    } else {
      glyphPages = layoutColumns(input)
    }

    // 5. 页面合成（添加装饰元素）
    const composedPages = composePages(glyphPages, canvas)

    return composedPages
  }

  /**
   * 同步排版（不预加载字体，适合已有缓存的场景）
   */
  layoutSync(
    entries: LineageEntry[],
    canvasId: string,
    options: LayoutOptions = DEFAULT_LAYOUT_OPTIONS,
  ): ComposedPage[] {
    const canvas = getCanvasConfig(canvasId)
    const input: LayoutInput = { entries, canvas, options }

    const glyphPages =
      canvas.multiRows?.enabled
        ? layoutMultiRows(input)
        : layoutColumns(input)

    return composePages(glyphPages, canvas)
  }

  /**
   * 仅排版计算（不合成装饰），返回原始 PageGlyphs[]
   * 适用于只需要排版数据、不需要渲染的场景
   */
  layoutRaw(
    entries: LineageEntry[],
    canvasId: string,
    options: LayoutOptions = DEFAULT_LAYOUT_OPTIONS,
  ): PageGlyphs[] {
    const canvas = getCanvasConfig(canvasId)
    const input: LayoutInput = { entries, canvas, options }

    return canvas.multiRows?.enabled
      ? layoutMultiRows(input)
      : layoutColumns(input)
  }

  /**
   * 获取画布配置
   */
  getCanvasConfig(canvasId: string): CanvasConfig {
    return getCanvasConfig(canvasId)
  }

  /**
   * 清除字体缓存（切换字体/字号时调用）
   */
  clearFontCache(fontFamily?: string, fontSize?: number): void {
    this.fontMetrics.clearCache(fontFamily, fontSize)
  }
}

/** 默认引擎实例 */
let defaultEngine: BookLayoutEngine | null = null

export function getBookLayoutEngine(): BookLayoutEngine {
  if (!defaultEngine) {
    defaultEngine = new BookLayoutEngine()
  }
  return defaultEngine
}
