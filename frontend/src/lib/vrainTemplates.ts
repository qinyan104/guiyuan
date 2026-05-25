/**
 * vRain canvas template definitions.
 * Maps to vrain/canvas/*.cfg files.
 */
export interface CanvasTemplate {
  id: string
  name: string
  description: string
  dimensions: string
  columns: number | null
  paperTexture: boolean
  fishTail: boolean
  thumbnail: string   // path under /vrain/canvas/
}

export const CANVAS_TEMPLATES: CanvasTemplate[] = [
  {
    id: "mr_5",
    name: "宣纸鱼尾·五栏",
    description: "宣纸纹理 + 双鱼尾 + 五栏版心",
    dimensions: "2480×1860",
    columns: 5,
    paperTexture: true,
    fishTail: true,
    thumbnail: "/vrain/canvas/mr_5.jpg",
  },
  {
    id: "mr_4",
    name: "宣纸鱼尾·四栏",
    description: "宣纸纹理 + 双鱼尾 + 四栏版心",
    dimensions: "2480×1860",
    columns: 4,
    paperTexture: true,
    fishTail: true,
    thumbnail: "/vrain/canvas/mr_4.jpg",
  },
  {
    id: "24_paper",
    name: "宣纸·五栏",
    description: "标准宣纸五栏",
    dimensions: "2480×1860",
    columns: 5,
    paperTexture: true,
    fishTail: false,
    thumbnail: "/vrain/canvas/24_paper.jpg",
  },
  {
    id: "28_paper",
    name: "宣纸·密栏",
    description: "宣纸五栏，28行/叶",
    dimensions: "2480×1860",
    columns: 5,
    paperTexture: true,
    fishTail: false,
    thumbnail: "/vrain/canvas/28_paper.jpg",
  },
  {
    id: "vintage",
    name: "复古旧纸",
    description: "泛黄旧纸纹理",
    dimensions: "2480×1860",
    columns: 5,
    paperTexture: true,
    fishTail: true,
    thumbnail: "/vrain/canvas/vintage.jpg",
  },
  {
    id: "bamboo",
    name: "竹简",
    description: "竹简纹理背景",
    dimensions: "2480×1860",
    columns: 5,
    paperTexture: true,
    fishTail: false,
    thumbnail: "/vrain/canvas/bamboo.jpg",
  },
  {
    id: "24_black",
    name: "黑底碑帖",
    description: "黑底白字碑帖风格",
    dimensions: "2480×1860",
    columns: 5,
    paperTexture: false,
    fishTail: false,
    thumbnail: "/vrain/canvas/24_black.jpg",
  },
  {
    id: "18_blue",
    name: "靛蓝染色",
    description: "蓝色鱼尾+版框",
    dimensions: "2480×1860",
    columns: 1,
    paperTexture: false,
    fishTail: true,
    thumbnail: "/vrain/canvas/18_blue.jpg",
  },
  {
    id: "18_red",
    name: "朱砂染色",
    description: "红色鱼尾+版框",
    dimensions: "2480×1860",
    columns: 1,
    paperTexture: false,
    fishTail: true,
    thumbnail: "/vrain/canvas/18_red.jpg",
  },
  {
    id: "20_paper",
    name: "小幅宣纸",
    description: "宣纸 2200×1650",
    dimensions: "2200×1650",
    columns: 1,
    paperTexture: true,
    fishTail: false,
    thumbnail: "/vrain/canvas/20_paper.jpg",
  },
  {
    id: "simple",
    name: "极简竖版",
    description: "竖版无框无线",
    dimensions: "1860×2480",
    columns: 5,
    paperTexture: false,
    fishTail: false,
    thumbnail: "/vrain/canvas/simple.jpg",
  },
  {
    id: "iphone15pm",
    name: "手机屏幕",
    description: "iPhone 屏幕比例",
    dimensions: "2796×1290",
    columns: 5,
    paperTexture: true,
    fishTail: false,
    thumbnail: "/vrain/canvas/iphone15pm.jpg",
  },
]

export const FONT_OPTIONS = [
  { id: "qiji-combo.ttf", name: "奇迹 combo", description: "书法楷体风格（默认）" },
  { id: "HanaMinA.ttf", name: "花園明朝 A", description: "CJK 基本字符" },
  { id: "HanaMinB.ttf", name: "花園明朝 B", description: "CJK 扩展字符" },
]
