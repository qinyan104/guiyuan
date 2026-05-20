import { describe, it, expect } from 'vitest'
import { samplePublication } from '../data/sampleFamily'
import { findRelationshipPath, resolveKinshipTerm, getKinshipLabel } from './kinship'

// ─── 测试数据 ─────────────────────────────────────────────────

const pub = samplePublication

describe('findRelationshipPath', () => {
  it('same person returns null', () => {
    expect(findRelationshipPath(pub, 'p1', 'p1')).toBeNull()
  })

  it('non-existent person returns null', () => {
    expect(findRelationshipPath(pub, 'p1', 'p999')).toBeNull()
  })

  it('parent-child: 朱标(p3) is father of 朱允炆(p7)', () => {
    const path = findRelationshipPath(pub, 'p7', 'p3')
    expect(path).not.toBeNull()
    expect(path!.upSteps).toBe(1)
    expect(path!.downSteps).toBe(0)
    expect(path!.generationGap).toBe(-1) // p7 is younger gen
  })

  it('child-parent: 朱允炆(p7) is son of 朱标(p3)', () => {
    const path = findRelationshipPath(pub, 'p3', 'p7')
    expect(path).not.toBeNull()
    expect(path!.upSteps).toBe(0)
    expect(path!.downSteps).toBe(1)
    expect(path!.generationGap).toBe(1)
  })

  it('grandparent-grandchild: 朱元璋(p1) and 朱允炆(p7)', () => {
    const path = findRelationshipPath(pub, 'p7', 'p1')
    expect(path).not.toBeNull()
    expect(path!.upSteps).toBe(2)
    expect(path!.downSteps).toBe(0)
    expect(path!.commonAncestorId).toBe('p1')
  })

  it('siblings: 朱允炆(p7) and 朱雄英(p35) share parents', () => {
    const path = findRelationshipPath(pub, 'p7', 'p35')
    expect(path).not.toBeNull()
    expect(path!.upSteps).toBe(1)
    expect(path!.downSteps).toBe(1)
    expect(path!.generationGap).toBe(0)
    expect(path!.commonAncestorId).toBe('p3') // same father 朱标
  })

  it('堂兄弟: 朱允炆(p7) and 朱高炽(p10) share 朱元璋(p1)', () => {
    const path = findRelationshipPath(pub, 'p7', 'p10')
    expect(path).not.toBeNull()
    expect(path!.commonAncestorId).toBe('p1') // 朱元璋
    expect(path!.generationGap).toBe(0)
    expect(path!.isPatrilineal).toBe(true)
  })

  it('外亲: 袁祯(p20) and 朱高炽(p10) — 母系', () => {
    const path = findRelationshipPath(pub, 'p10', 'p20')
    expect(path).not.toBeNull()
    expect(path!.isPatrilineal).toBe(false) // 通过永安公主(女性)连接
  })

  it('无关联人物返回 null', () => {
    // 创建一个虚构的无关联人
    expect(findRelationshipPath(pub, 'p1', 'p99')).toBeNull()
  })
})

describe('resolveKinshipTerm', () => {
  it('self: same person', () => {
    const term = resolveKinshipTerm(pub, 'p10', 'p10')
    expect(term?.term).toBe('本人')
  })

  it('father: 朱允炆(p7) → 朱标(p3) = 爸爸', () => {
    const term = resolveKinshipTerm(pub, 'p7', 'p3')
    expect(term?.term).toBe('爸爸')
    expect(term?.isElder).toBe(true)
  })

  it('son: 朱标(p3) → 朱允炆(p7) = 儿子', () => {
    const term = resolveKinshipTerm(pub, 'p3', 'p7')
    expect(term?.term).toBe('儿子')
    expect(term?.isElder).toBe(false)
  })

  it('mother: 朱标(p3) → 马秀英(p2) = 妈妈', () => {
    const term = resolveKinshipTerm(pub, 'p3', 'p2')
    expect(term?.term).toBe('妈妈')
  })

  it('grandfather: 朱允炆(p7) → 朱元璋(p1) = 爷爷', () => {
    const term = resolveKinshipTerm(pub, 'p7', 'p1')
    expect(term?.term).toBe('爷爷')
    expect(term!.generationGap).toBe(2)
  })

  it('grandson: 朱元璋(p1) → 朱允炆(p7) = 孙子', () => {
    const term = resolveKinshipTerm(pub, 'p1', 'p7')
    expect(term?.term).toBe('孙子')
  })

  it('哥哥: 朱雄英(p35) is older brother of 朱允炆(p7)', () => {
    const term = resolveKinshipTerm(pub, 'p7', 'p35')
    expect(term?.term).toBe('哥哥')
    expect(term?.isElder).toBe(true)
  })

  it('弟弟: from 朱雄英(p35) to 朱允炆(p7)', () => {
    const term = resolveKinshipTerm(pub, 'p35', 'p7')
    expect(term?.term).toBe('弟弟')
    expect(term?.isElder).toBe(false)
  })

  it('堂哥: 朱允炆(p7) → 朱高炽(p10) 同辈父系', () => {
    const term = resolveKinshipTerm(pub, 'p7', 'p10')
    // p7(朱允炆, b.1377) is older than p10(朱高炽, b.1378)
    // So from p7's perspective, p10 is 堂弟
    // Actually p7 was born 1377, p10 was born 1378, so p7 is older
    // Therefore p7 calls p10 堂弟
    expect(term?.term).toBe('堂弟')
    expect(term?.generationGap).toBe(0)
  })

  it('堂哥: 朱高炽(p10) → 朱允炆(p7)', () => {
    const term = resolveKinshipTerm(pub, 'p10', 'p7')
    // p10(朱高炽, b.1378) is younger than p7(朱允炆, b.1377)
    // So from p10's perspective, p7 is 堂哥
    expect(term?.term).toBe('堂哥')
  })

  it('叔叔: 朱允炆(p7) → 朱棣(p4) = 叔叔', () => {
    const term = resolveKinshipTerm(pub, 'p7', 'p4')
    // 朱棣 is 朱标's younger brother, so from 朱允炆's perspective it's 叔叔
    expect(term?.term).toBe('叔叔')
    expect(term?.isElder).toBe(true)
  })

  it('舅舅: 朱高炽(p10) → 袁祯(p20) expects 外甥', () => {
    // Let's check: p10(朱高炽) -> p20(袁祯)
    // p18(永安公主) 是 p10 的姐姐，嫁给了 p19(袁容)，生了 p20(袁祯)
    // 所以 p20 是 p10 的 外甥
    // 反过来 p10 是 p20 的舅舅
    const term = resolveKinshipTerm(pub, 'p20', 'p10')
    expect(term?.term).toBe('舅舅')
    expect(term?.isElder).toBe(true)
  })

  it('外甥: 朱高炽(p10) → 袁祯(p20)', () => {
    const term = resolveKinshipTerm(pub, 'p10', 'p20')
    expect(term?.term).toBe('外甥')
    expect(term?.isElder).toBe(false)
  })

  it('姑姑: 朱允炆(p7) → 宁国公主(p5)', () => {
    const term = resolveKinshipTerm(pub, 'p7', 'p5')
    // 宁国公主是朱元璋的女儿，朱标的姐妹，朱允炆的姑姑
    expect(term?.term).toBe('姑姑')
    expect(term?.isElder).toBe(true)
  })

  it('曾祖父: 朱瞻基(p17) → 朱元璋(p1)', () => {
    // p17(朱瞻基) → p10(朱高炽) → p4(朱棣) → p1(朱元璋)
    // 所以 p1 是 p17 的曾祖父
    const term = resolveKinshipTerm(pub, 'p17', 'p1')
    expect(term?.term).toBe('曾祖父')
    expect(term!.generationGap).toBe(3)
  })

  it('曾孙: 朱元璋(p1) → 朱瞻基(p17)', () => {
    const term = resolveKinshipTerm(pub, 'p1', 'p17')
    expect(term?.term).toBe('曾孙')
    expect(term!.generationGap).toBe(-3)
  })
})

describe('getKinshipLabel', () => {
  it('returns term as a simple string', () => {
    expect(getKinshipLabel(pub, 'p7', 'p3')).toBe('爸爸')
    expect(getKinshipLabel(pub, 'p3', 'p7')).toBe('儿子')
    expect(getKinshipLabel(pub, 'p7', 'p10')).toBe('堂弟')
    expect(getKinshipLabel(pub, 'p1', 'p99')).toBe('未知关系')
  })
})
