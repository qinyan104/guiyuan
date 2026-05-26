/**
 * CanvasConfig — 画布模板配置
 *
 * 12 个古籍画布模板的完整参数，前端硬编码定义。
 */

import type { CanvasConfig, FishTailConfig, FrameConfig, LogoConfig, MultiRowConfig } from "./types"

// ═══════════════════════════════════════════════════════════
// 工厂函数
// ═══════════════════════════════════════════════════════════

interface CanvasConfigRaw {
  id: string
  name: string
  width: number
  height: number
  backgroundColor: string
  backgroundImage: string
  margins: { top: number; bottom: number; left: number; right: number }
  leafCol: number
  leafCenterWidth: number
  frame: FrameConfig
  fishTail: FishTailConfig | null
  multiRows: MultiRowConfig | null
  logo: LogoConfig
}

function define(raw: CanvasConfigRaw): CanvasConfig {
  return raw
}

/** 无鱼尾的空配置 */
const NO_FISH_TAIL: FishTailConfig = {
  topY: 0, topColor: "", topRectHeight: 0, topTriaHeight: 0, topLineWidth: 0,
  bottomY: 0, bottomColor: "", bottomRectHeight: 0, bottomTriaHeight: 0,
  bottomLineWidth: 0, bottomDirection: 0,
  isFlower: false, flowerImage: "",
  lineColor: "", lineWidth: 0, lineMargin: 0,
}

/** 无多行的空配置 */
const NO_MULTI_ROWS: MultiRowConfig = {
  enabled: false, rowCount: 0, lineWidth: 0, lineColor: "",
}

/** 无 Logo 的空配置 */
const NO_LOGO: LogoConfig = {
  image: "", text: "", y: 0, color: "", fontFamily: "", fontSize: 0,
}

// ═══════════════════════════════════════════════════════════
// 12 个画布模板定义
// ═══════════════════════════════════════════════════════════

/**
 * mr_5 — 宣纸鱼尾·五栏 (旗舰模板)
 * 族谱专用：双鱼尾 + 五栏版心 + 多行模式 + 宣纸纹理
 */
const mr_5 = define({
  id: "mr_5",
  name: "宣纸鱼尾·五栏",
  width: 2480, height: 1860,
  backgroundColor: "white",
  backgroundImage: "paper.jpg",
  margins: { top: 200, bottom: 50, left: 50, right: 50 },
  leafCol: 36, leafCenterWidth: 100,
  frame: {
    inlineWidth: 1, inlineColor: "black",
    outlineWidth: 10, outlineColor: "black",
    outlineHMargin: 5, outlineVMargin: 5,
  },
  fishTail: {
    topY: 500, topColor: "black", topRectHeight: 50, topTriaHeight: 30, topLineWidth: 15,
    bottomY: 1500, bottomColor: "black", bottomRectHeight: 50, bottomTriaHeight: 30,
    bottomLineWidth: 15, bottomDirection: 1,
    isFlower: true, flowerImage: "3leaves.png",
    lineColor: "black", lineWidth: 1, lineMargin: 5,
  },
  multiRows: {
    enabled: true, rowCount: 5, lineWidth: 1, lineColor: "#333333",
  },
  logo: { image: "logo.png", text: "兀雨书屋", y: 1680, color: "white", fontFamily: "qiji-combo", fontSize: 40 },
})

/**
 * mr_4 — 宣纸鱼尾·四栏
 */
const mr_4 = define({
  id: "mr_4",
  name: "宣纸鱼尾·四栏",
  width: 2480, height: 1860,
  backgroundColor: "white",
  backgroundImage: "paper.jpg",
  margins: { top: 200, bottom: 50, left: 50, right: 50 },
  leafCol: 24, leafCenterWidth: 100,
  frame: {
    inlineWidth: 1, inlineColor: "black",
    outlineWidth: 10, outlineColor: "black",
    outlineHMargin: 5, outlineVMargin: 5,
  },
  fishTail: {
    topY: 500, topColor: "black", topRectHeight: 50, topTriaHeight: 30, topLineWidth: 15,
    bottomY: 1500, bottomColor: "black", bottomRectHeight: 50, bottomTriaHeight: 30,
    bottomLineWidth: 15, bottomDirection: 1,
    isFlower: true, flowerImage: "3leaves.png",
    lineColor: "black", lineWidth: 1, lineMargin: 5,
  },
  multiRows: {
    enabled: true, rowCount: 4, lineWidth: 2, lineColor: "#f5f5f5",
  },
  logo: { image: "logo.png", text: "兀雨书屋", y: 1680, color: "white", fontFamily: "qiji-combo", fontSize: 40 },
})

/**
 * 24_paper — 宣纸·五栏 (无多行)
 */
const _24_paper = define({
  id: "24_paper",
  name: "宣纸·五栏",
  width: 2480, height: 1860,
  backgroundColor: "white",
  backgroundImage: "paper.jpg",
  margins: { top: 200, bottom: 50, left: 50, right: 50 },
  leafCol: 24, leafCenterWidth: 120,
  frame: {
    inlineWidth: 1, inlineColor: "black",
    outlineWidth: 10, outlineColor: "black",
    outlineHMargin: 5, outlineVMargin: 5,
  },
  fishTail: {
    topY: 450, topColor: "black", topRectHeight: 50, topTriaHeight: 30, topLineWidth: 15,
    bottomY: 1550, bottomColor: "black", bottomRectHeight: 50, bottomTriaHeight: 30,
    bottomLineWidth: 15, bottomDirection: 1,
    isFlower: true, flowerImage: "3leaves.png",
    lineColor: "black", lineWidth: 1, lineMargin: 5,
  },
  multiRows: {
    enabled: false, rowCount: 5, lineWidth: 2, lineColor: "#f5f5f5",
  },
  logo: { image: "logo.png", text: "", y: 1680, color: "white", fontFamily: "qiji-combo", fontSize: 40 },
})

/**
 * 28_paper — 宣纸·密栏
 */
const _28_paper = define({
  id: "28_paper",
  name: "宣纸·密栏",
  width: 2480, height: 1860,
  backgroundColor: "white",
  backgroundImage: "paper.jpg",
  margins: { top: 200, bottom: 50, left: 50, right: 50 },
  leafCol: 28, leafCenterWidth: 100,
  frame: {
    inlineWidth: 1, inlineColor: "black",
    outlineWidth: 10, outlineColor: "black",
    outlineHMargin: 5, outlineVMargin: 5,
  },
  fishTail: {
    topY: 450, topColor: "black", topRectHeight: 50, topTriaHeight: 30, topLineWidth: 15,
    bottomY: 1550, bottomColor: "black", bottomRectHeight: 50, bottomTriaHeight: 30,
    bottomLineWidth: 15, bottomDirection: 1,
    isFlower: true, flowerImage: "3leaves.png",
    lineColor: "black", lineWidth: 1, lineMargin: 5,
  },
  multiRows: {
    enabled: false, rowCount: 5, lineWidth: 2, lineColor: "#f5f5f5",
  },
  logo: { image: "logo.png", text: "", y: 1680, color: "white", fontFamily: "qiji-combo", fontSize: 40 },
})

/**
 * 24_black — 黑底碑帖
 */
const _24_black = define({
  id: "24_black",
  name: "黑底碑帖",
  width: 2480, height: 1860,
  backgroundColor: "white",
  backgroundImage: "",
  margins: { top: 200, bottom: 50, left: 50, right: 50 },
  leafCol: 24, leafCenterWidth: 120,
  frame: {
    inlineWidth: 1, inlineColor: "#666",
    outlineWidth: 10, outlineColor: "#444",
    outlineHMargin: 5, outlineVMargin: 5,
  },
  fishTail: {
    topY: 450, topColor: "#666", topRectHeight: 50, topTriaHeight: 30, topLineWidth: 15,
    bottomY: 1550, bottomColor: "#666", bottomRectHeight: 50, bottomTriaHeight: 30,
    bottomLineWidth: 15, bottomDirection: 1,
    isFlower: true, flowerImage: "3leaves.png",
    lineColor: "#666", lineWidth: 1, lineMargin: 5,
  },
  multiRows: {
    enabled: false, rowCount: 5, lineWidth: 2, lineColor: "#f5f5f5",
  },
  logo: { image: "logo.png", text: "", y: 1680, color: "white", fontFamily: "qiji-combo", fontSize: 40 },
})

/**
 * 18_blue — 靛蓝染色
 */
const _18_blue = define({
  id: "18_blue",
  name: "靛蓝染色",
  width: 2480, height: 1860,
  backgroundColor: "white",
  backgroundImage: "",
  margins: { top: 200, bottom: 50, left: 50, right: 50 },
  leafCol: 18, leafCenterWidth: 120,
  frame: {
    inlineWidth: 1, inlineColor: "#0e6696",
    outlineWidth: 10, outlineColor: "#0e6696",
    outlineHMargin: 5, outlineVMargin: 5,
  },
  fishTail: {
    topY: 450, topColor: "#0e6696", topRectHeight: 50, topTriaHeight: 30, topLineWidth: 15,
    bottomY: 1450, bottomColor: "#0e6696", bottomRectHeight: 50, bottomTriaHeight: 30,
    bottomLineWidth: 15, bottomDirection: 1,
    isFlower: true, flowerImage: "3leaves.png",
    lineColor: "#0e6696", lineWidth: 1, lineMargin: 5,
  },
  multiRows: NO_MULTI_ROWS,
  logo: { image: "", text: "兀雨書屋", y: 1680, color: "white", fontFamily: "qiji-combo", fontSize: 40 },
})

/**
 * 18_red — 朱砂染色
 */
const _18_red = define({
  id: "18_red",
  name: "朱砂染色",
  width: 2480, height: 1860,
  backgroundColor: "white",
  backgroundImage: "",
  margins: { top: 200, bottom: 50, left: 50, right: 50 },
  leafCol: 18, leafCenterWidth: 120,
  frame: {
    inlineWidth: 1, inlineColor: "rgb(233,49,62)",
    outlineWidth: 10, outlineColor: "rgb(233,49,62)",
    outlineHMargin: 5, outlineVMargin: 5,
  },
  fishTail: {
    topY: 450, topColor: "rgb(233,49,62)", topRectHeight: 50, topTriaHeight: 30, topLineWidth: 15,
    bottomY: 1450, bottomColor: "rgb(233,49,62)", bottomRectHeight: 50, bottomTriaHeight: 30,
    bottomLineWidth: 15, bottomDirection: 1,
    isFlower: true, flowerImage: "3leaves.png",
    lineColor: "rgb(233,49,62)", lineWidth: 1, lineMargin: 5,
  },
  multiRows: NO_MULTI_ROWS,
  logo: { image: "logo.png", text: "", y: 1680, color: "white", fontFamily: "qiji-combo", fontSize: 40 },
})

/**
 * 20_paper — 小幅宣纸
 */
const _20_paper = define({
  id: "20_paper",
  name: "小幅宣纸",
  width: 2200, height: 1650,
  backgroundColor: "white",
  backgroundImage: "paper.jpg",
  margins: { top: 200, bottom: 50, left: 50, right: 50 },
  leafCol: 20, leafCenterWidth: 120,
  frame: {
    inlineWidth: 1, inlineColor: "black",
    outlineWidth: 10, outlineColor: "black",
    outlineHMargin: 5, outlineVMargin: 5,
  },
  fishTail: {
    topY: 450, topColor: "black", topRectHeight: 50, topTriaHeight: 30, topLineWidth: 15,
    bottomY: 1250, bottomColor: "black", bottomRectHeight: 50, bottomTriaHeight: 30,
    bottomLineWidth: 15, bottomDirection: 1,
    isFlower: true, flowerImage: "3leaves.png",
    lineColor: "black", lineWidth: 1, lineMargin: 5,
  },
  multiRows: NO_MULTI_ROWS,
  logo: { image: "logo.png", text: "", y: 1680, color: "white", fontFamily: "qiji-combo", fontSize: 40 },
})

/**
 * vintage — 复古旧纸
 */
const vintage = define({
  id: "vintage",
  name: "复古旧纸",
  width: 2480, height: 1860,
  backgroundColor: "white",
  backgroundImage: "",
  margins: { top: 200, bottom: 50, left: 50, right: 50 },
  leafCol: 24, leafCenterWidth: 120,
  frame: {
    inlineWidth: 1, inlineColor: "#8a7050",
    outlineWidth: 10, outlineColor: "#8a7050",
    outlineHMargin: 5, outlineVMargin: 0,
  },
  fishTail: {
    topY: 500, topColor: "black", topRectHeight: 50, topTriaHeight: 30, topLineWidth: 15,
    bottomY: 1500, bottomColor: "black", bottomRectHeight: 50, bottomTriaHeight: 30,
    bottomLineWidth: 15, bottomDirection: 1,
    isFlower: false, flowerImage: "",
    lineColor: "black", lineWidth: 1, lineMargin: 5,
  },
  multiRows: NO_MULTI_ROWS,
  logo: { image: "", text: "兀雨书屋", y: 1680, color: "white", fontFamily: "qiji-combo", fontSize: 40 },
})

/**
 * bamboo — 竹简
 * 无鱼尾、无版框、无版心折叠线
 */
const bamboo = define({
  id: "bamboo",
  name: "竹简",
  width: 2480, height: 1860,
  backgroundColor: "white",
  backgroundImage: "paper.jpg",
  margins: { top: 200, bottom: 100, left: 50, right: 50 },
  leafCol: 30, leafCenterWidth: 0,
  frame: {
    inlineWidth: 0, inlineColor: "",
    outlineWidth: 0, outlineColor: "",
    outlineHMargin: 0, outlineVMargin: 0,
  },
  fishTail: null,
  multiRows: NO_MULTI_ROWS,
  logo: NO_LOGO,
})

/**
 * simple — 极简竖版
 * 竖版 (portrait)、无线框、无鱼尾
 */
const simple = define({
  id: "simple",
  name: "极简竖版",
  width: 1860, height: 2480,
  backgroundColor: "white",
  backgroundImage: "",
  margins: { top: 50, bottom: 50, left: 100, right: 60 },
  leafCol: 20, leafCenterWidth: 0,
  frame: {
    inlineWidth: 1, inlineColor: "#cccccc",
    outlineWidth: 1, outlineColor: "#cccccc",
    outlineHMargin: 5, outlineVMargin: 0,
  },
  fishTail: null,
  multiRows: NO_MULTI_ROWS,
  logo: { image: "", text: "", y: 1680, color: "", fontFamily: "", fontSize: 40 },
})

/**
 * iphone15pm — 手机屏幕比例
 */
const iphone15pm = define({
  id: "iphone15pm",
  name: "手机屏幕",
  width: 2796, height: 1290,
  backgroundColor: "#eeeeee",
  backgroundImage: "paper.jpg",
  margins: { top: 50, bottom: 50, left: 150, right: 150 },
  leafCol: 32, leafCenterWidth: 90,
  frame: {
    inlineWidth: 1, inlineColor: "black",
    outlineWidth: 10, outlineColor: "black",
    outlineHMargin: 5, outlineVMargin: 5,
  },
  fishTail: {
    topY: 300, topColor: "black", topRectHeight: 50, topTriaHeight: 30, topLineWidth: 15,
    bottomY: 1000, bottomColor: "black", bottomRectHeight: 50, bottomTriaHeight: 30,
    bottomLineWidth: 15, bottomDirection: 1,
    isFlower: true, flowerImage: "3leaves.png",
    lineColor: "black", lineWidth: 1, lineMargin: 5,
  },
  multiRows: {
    enabled: false, rowCount: 5, lineWidth: 2, lineColor: "#f5f5f5",
  },
  logo: { image: "logo.png", text: "", y: 1100, color: "white", fontFamily: "qiji-combo", fontSize: 30 },
})

// ═══════════════════════════════════════════════════════════
// 导出
// ═══════════════════════════════════════════════════════════

/** 所有画布模板的注册表 */
export const CANVAS_CONFIGS: Record<string, CanvasConfig> = {
  mr_5,
  mr_4,
  "24_paper": _24_paper,
  "28_paper": _28_paper,
  "24_black": _24_black,
  "18_blue": _18_blue,
  "18_red": _18_red,
  "20_paper": _20_paper,
  vintage,
  bamboo,
  simple,
  iphone15pm,
}

/** 按 ID 获取画布配置 */
export function getCanvasConfig(id: string): CanvasConfig {
  const config = CANVAS_CONFIGS[id]
  if (!config) {
    console.warn(`[CanvasConfig] Unknown canvas id "${id}", falling back to mr_5`)
    return mr_5
  }
  return config
}

/** 获取所有画布 ID 列表 */
export function getCanvasIds(): string[] {
  return Object.keys(CANVAS_CONFIGS)
}

/**
 * 计算给定画布的可用文字区域
 * 返回 { x, y, width, height } 表示文字可以放置的区域
 */
export function getTextArea(config: CanvasConfig): {
  x: number
  y: number
  width: number
  height: number
} {
  const { margins, leafCenterWidth, fishTail, frame } = config

  // 左右边距加上版框间距
  const frameHInset = frame.outlineHMargin + Math.max(frame.inlineWidth, frame.outlineWidth)
  const x = margins.left + frameHInset
  const width = config.width - margins.left - margins.right - frameHInset * 2

  // 上下边距
  const frameVInset = frame.outlineVMargin + Math.max(frame.inlineWidth, frame.outlineWidth)
  let y = margins.top + frameVInset
  let bottomY = config.height - margins.bottom - frameVInset

  // 如果有鱼尾，文字区域避开鱼尾
  if (fishTail) {
    // 上鱼尾下方开始
    y = fishTail.topY + fishTail.topRectHeight + fishTail.topTriaHeight + fishTail.lineMargin
    // 下鱼尾上方结束
    bottomY = fishTail.bottomY - fishTail.lineMargin
  }

  const height = Math.max(0, bottomY - y)

  return { x, y, width, height }
}

/**
 * 计算每列宽度
 */
export function getColumnWidth(config: CanvasConfig): number {
  const textArea = getTextArea(config)
  const colCount = Math.max(1, config.leafCol)
  return textArea.width / colCount
}
