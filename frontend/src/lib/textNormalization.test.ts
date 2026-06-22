import { describe, expect, it } from 'vitest'

import type { PublicationData } from '../types/family'
import { normalizePublicationTextInPlace, repairUtf8DecodedAsGbk } from './textNormalization'

const gbkDecoder = new TextDecoder('gbk')
const utf8Encoder = new TextEncoder()

function makeMojibake(value: string): string {
  return gbkDecoder.decode(utf8Encoder.encode(value))
}

describe('textNormalization', () => {
  it('repairs utf-8 text that was decoded as gbk', () => {
    expect(repairUtf8DecodedAsGbk(makeMojibake('朱棣'))).toBe('朱棣')
    expect(repairUtf8DecodedAsGbk(makeMojibake('明成祖·永乐帝'))).toBe('明成祖·永乐帝')
  })

  it('leaves already-correct text unchanged', () => {
    expect(repairUtf8DecodedAsGbk('已故')).toBe('已故')
    expect(repairUtf8DecodedAsGbk('宗族朱明宗室 · 凤阳朱氏帝系')).toBe('宗族朱明宗室 · 凤阳朱氏帝系')
  })

  it('normalizes publication text in place for canvas-facing fields', () => {
    const publication: PublicationData = {
      title: makeMojibake('明成祖·永乐帝'),
      subtitle: makeMojibake('朱明宗室 · 凤阳朱氏帝系'),
      focusFamilyId: 'f1',
      people: {
        p1: {
          id: 'p1',
          name: makeMojibake('朱棣'),
          gender: 'male',
          note: makeMojibake('明成祖·永乐帝'),
          clan: makeMojibake('朱明宗室 · 凤阳朱氏帝系'),
          mountPointTarget: {
            publicationId: 7,
            publicationTitle: makeMojibake('南明支谱'),
            rootPersonName: makeMojibake('朱棣'),
          },
        },
      },
      families: {
        f1: { id: 'f1', adults: ['p1'], children: [] },
      },
      info: {
        description: makeMojibake('懿文太子'),
      },
    }

    normalizePublicationTextInPlace(publication)

    expect(publication.title).toBe('明成祖·永乐帝')
    expect(publication.subtitle).toBe('朱明宗室 · 凤阳朱氏帝系')
    expect(publication.people.p1.name).toBe('朱棣')
    expect(publication.people.p1.note).toBe('明成祖·永乐帝')
    expect(publication.people.p1.clan).toBe('朱明宗室 · 凤阳朱氏帝系')
    expect(publication.people.p1.mountPointTarget?.publicationTitle).toBe('南明支谱')
    expect(publication.people.p1.mountPointTarget?.rootPersonName).toBe('朱棣')
    expect(publication.info?.description).toBe('懿文太子')
  })
})
