import { describe, expect, it } from 'vitest'

import { defaultSettings, samplePublication } from '../../data/sampleFamily'
import { inferHistoryLabel, serializeTrackedSnapshot, type EditorSnapshot } from './historyCore'

function createSnapshot(overrides: Partial<EditorSnapshot> = {}): EditorSnapshot {
  return {
    publication: JSON.parse(JSON.stringify(samplePublication)),
    settings: JSON.parse(JSON.stringify(defaultSettings)),
    selectedPersonId: 'p1',
    ...overrides,
  }
}

describe('historyCore', () => {
  it('ignores zoom when serializing tracked snapshot', () => {
    const left = createSnapshot()
    const right = createSnapshot({
      settings: {
        ...defaultSettings,
        zoom: defaultSettings.zoom + 0.2,
      },
    })

    expect(serializeTrackedSnapshot(left)).toBe(serializeTrackedSnapshot(right))
  })

  it('prefers a pending history label when provided', () => {
    expect(inferHistoryLabel(createSnapshot(), createSnapshot(), '导入 JSON 草稿')).toBe('导入 JSON 草稿')
  })

  it('falls back to a person-centric label for publication edits', () => {
    const previous = createSnapshot()
    const current = createSnapshot({
      publication: {
        ...samplePublication,
        people: {
          ...samplePublication.people,
          p1: {
            ...samplePublication.people.p1,
            note: '新增注记',
          },
        },
      },
    })

    expect(inferHistoryLabel(previous, current)).toBe('编辑 朱元璋 信息')
  })
})
