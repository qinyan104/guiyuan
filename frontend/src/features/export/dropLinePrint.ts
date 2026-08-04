import type { PublicationPaper, PublicationSettings } from '../../types/family'

export type DropLinePrintOrientation = 'portrait' | 'landscape'
export type DropLinePrintFontFamily = 'song' | 'kai' | 'sans'
export type DropLinePrintLineStyle = 'solid' | 'dashed'

export interface DropLinePrintProfile {
  paper: PublicationPaper
  orientation: DropLinePrintOrientation
  fontFamily: DropLinePrintFontFamily
  nameSize: number
  nameColor: string
  lineColor: string
  lineWidth: number
  lineStyle: DropLinePrintLineStyle
  generationGap: number
  siblingGap: number
  partnerGap: number
  marginMm: number
  scale: number
  overlapMm: number
}

export interface DropLinePrintPreset {
  readonly id: 'traditional' | 'clean' | 'dense' | 'spacious'
  readonly label: string
  readonly description: string
  readonly profile: Readonly<DropLinePrintProfile>
}

export const DROP_LINE_PRINT_FONT_STACKS: Readonly<Record<DropLinePrintFontFamily, string>> = Object.freeze({
  song: '"Songti SC", "Noto Serif CJK SC", SimSun, serif',
  kai: 'KaiTi, STKaiti, "Noto Serif CJK SC", serif',
  sans: '"PingFang SC", "Microsoft YaHei", "Noto Sans CJK SC", sans-serif',
})

export const DEFAULT_DROP_LINE_PRINT_PROFILE: Readonly<DropLinePrintProfile> = Object.freeze({
  paper: 'A3',
  orientation: 'landscape',
  fontFamily: 'song',
  nameSize: 24,
  nameColor: '#171717',
  lineColor: '#2F2F2F',
  lineWidth: 1.5,
  lineStyle: 'solid',
  generationGap: 170,
  siblingGap: 88,
  partnerGap: 96,
  marginMm: 12,
  scale: 1,
  overlapMm: 8,
})

export const DROP_LINE_PRINT_PRESETS: readonly DropLinePrintPreset[] = Object.freeze([
  {
    id: 'traditional',
    label: '传统谱牒',
    description: '宋体竖排，端正均衡',
    profile: DEFAULT_DROP_LINE_PRINT_PROFILE,
  },
  {
    id: 'clean',
    label: '清简黑白',
    description: '线条轻，留白克制',
    profile: Object.freeze({
      ...DEFAULT_DROP_LINE_PRINT_PROFILE,
      paper: 'A4',
      nameSize: 22,
      nameColor: '#111111',
      lineColor: '#555555',
      lineWidth: 1,
      siblingGap: 80,
      marginMm: 14,
      overlapMm: 6,
    }),
  },
  {
    id: 'dense',
    label: '紧凑大谱',
    description: '压缩间距，容纳更多人物',
    profile: Object.freeze({
      ...DEFAULT_DROP_LINE_PRINT_PROFILE,
      nameSize: 20,
      generationGap: 130,
      siblingGap: 60,
      partnerGap: 72,
      marginMm: 8,
      scale: 0.9,
    }),
  },
  {
    id: 'spacious',
    label: '宽松阅览',
    description: '楷体大字，代际舒展',
    profile: Object.freeze({
      ...DEFAULT_DROP_LINE_PRINT_PROFILE,
      fontFamily: 'kai',
      nameSize: 28,
      lineColor: '#3E332B',
      lineWidth: 1.8,
      generationGap: 210,
      siblingGap: 128,
      partnerGap: 120,
      marginMm: 16,
      overlapMm: 10,
    }),
  },
])

const PX_PER_MM = 96 / 25.4
const MIN_PRINTED_NAME_MM = 2.8

function clampNumber(value: unknown, min: number, max: number, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value)
    ? Math.min(max, Math.max(min, value))
    : fallback
}

function pickChoice<T extends string>(value: unknown, choices: readonly T[], fallback: T): T {
  return typeof value === 'string' && choices.includes(value as T) ? value as T : fallback
}

function pickColor(value: unknown, fallback: string): string {
  return typeof value === 'string' && value.trim() ? value.trim() : fallback
}

export function normalizeDropLinePrintProfile(input: unknown): DropLinePrintProfile {
  const value = input && typeof input === 'object' && !Array.isArray(input)
    ? input as Record<string, unknown>
    : {}
  const fallback = DEFAULT_DROP_LINE_PRINT_PROFILE

  return {
    paper: pickChoice(value.paper, ['A4', 'A3'], fallback.paper),
    orientation: pickChoice(value.orientation, ['portrait', 'landscape'], fallback.orientation),
    fontFamily: pickChoice(value.fontFamily, ['song', 'kai', 'sans'], fallback.fontFamily),
    nameSize: clampNumber(value.nameSize, 18, 36, fallback.nameSize),
    nameColor: pickColor(value.nameColor, fallback.nameColor),
    lineColor: pickColor(value.lineColor, fallback.lineColor),
    lineWidth: clampNumber(value.lineWidth, 0.5, 4, fallback.lineWidth),
    lineStyle: pickChoice(value.lineStyle, ['solid', 'dashed'], fallback.lineStyle),
    generationGap: clampNumber(value.generationGap, 120, 220, fallback.generationGap),
    siblingGap: clampNumber(value.siblingGap, 56, 140, fallback.siblingGap),
    partnerGap: clampNumber(value.partnerGap, 72, 128, fallback.partnerGap),
    marginMm: clampNumber(value.marginMm, 5, 30, fallback.marginMm),
    scale: clampNumber(value.scale, 0.5, 2, fallback.scale),
    overlapMm: clampNumber(value.overlapMm, 0, 20, fallback.overlapMm),
  }
}

export function resolveDropLinePublicationSettings(
  base: PublicationSettings,
  profile: DropLinePrintProfile,
): PublicationSettings {
  const normalized = normalizeDropLinePrintProfile(profile)

  return {
    ...base,
    paper: normalized.paper,
    generationGap: normalized.generationGap,
    siblingGap: normalized.siblingGap,
    partnerGap: normalized.partnerGap,
    compactNameSize: normalized.nameSize,
    compactNameColor: normalized.nameColor,
    compactLineColor: normalized.lineColor,
    zoom: 1,
    cardShadowOpacity: 0,
    showCard: false,
    showBirth: false,
    showDeath: false,
    showAge: false,
    showNote: false,
    showStatus: false,
    showLineage: false,
    showPhoto: false,
  }
}

export function getPrintedNameSizeMm(nameSizePx: number, renderScale: number): number {
  return Math.max(0, nameSizePx) * Math.max(0, renderScale) / PX_PER_MM
}

export function isPrintedNameTooSmall(nameSizePx: number, renderScale: number): boolean {
  return getPrintedNameSizeMm(nameSizePx, renderScale) < MIN_PRINTED_NAME_MM
}
