import { describe, expect, it } from 'vitest'

import { defaultSettings } from '../../data/sampleFamily'
import {
  DEFAULT_DROP_LINE_PRINT_PROFILE,
  DROP_LINE_PRINT_PRESETS,
  getPrintedNameSizeMm,
  isPrintedNameTooSmall,
  normalizeDropLinePrintProfile,
  resolveDropLinePublicationSettings,
} from './dropLinePrint'

describe('drop-line print profiles', () => {
  it('provides four distinct built-in profiles that normalize without changes', () => {
    expect(DROP_LINE_PRINT_PRESETS).toHaveLength(4)
    expect(new Set(DROP_LINE_PRINT_PRESETS.map(({ id }) => id)).size).toBe(4)

    for (const preset of DROP_LINE_PRINT_PRESETS) {
      expect(normalizeDropLinePrintProfile(preset.profile)).toEqual(preset.profile)
    }
  })

  it('normalizes untrusted saved values to supported choices and numeric bounds', () => {
    const normalized = normalizeDropLinePrintProfile({
      paper: 'Letter',
      orientation: 'diagonal',
      fontFamily: 'remote-font',
      nameSize: 100,
      nameColor: ' ',
      lineColor: null,
      lineWidth: -4,
      lineStyle: 'dots',
      generationGap: 999,
      siblingGap: 0,
      partnerGap: Number.POSITIVE_INFINITY,
      marginMm: 2,
      scale: 3,
      overlapMm: -5,
    })

    expect(normalized).toEqual({
      ...DEFAULT_DROP_LINE_PRINT_PROFILE,
      nameSize: 36,
      lineWidth: 0.5,
      generationGap: 220,
      siblingGap: 56,
      marginMm: 5,
      scale: 2,
      overlapMm: 0,
    })
  })

  it('creates an isolated names-and-lines publication settings snapshot', () => {
    const base = structuredClone(defaultSettings)
    const profile = normalizeDropLinePrintProfile({
      ...DEFAULT_DROP_LINE_PRINT_PROFILE,
      paper: 'A4',
      nameSize: 30,
      nameColor: '#111111',
      lineColor: '#222222',
      generationGap: 180,
      siblingGap: 70,
      partnerGap: 80,
    })

    const resolved = resolveDropLinePublicationSettings(base, profile)

    expect(base).toEqual(defaultSettings)
    expect(resolved).not.toBe(base)
    expect(resolved).toMatchObject({
      paper: 'A4',
      compactNameSize: 30,
      compactNameColor: '#111111',
      compactLineColor: '#222222',
      generationGap: 180,
      siblingGap: 70,
      partnerGap: 80,
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
    })
  })

  it('flags printed names below the 2.8mm readability threshold', () => {
    expect(getPrintedNameSizeMm(16, 0.5)).toBeCloseTo(2.117, 3)
    expect(isPrintedNameTooSmall(16, 0.5)).toBe(true)
    expect(isPrintedNameTooSmall(22, 0.5)).toBe(false)
  })
})
