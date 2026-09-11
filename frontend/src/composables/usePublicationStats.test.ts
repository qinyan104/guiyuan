import { computed } from 'vue'
import { describe, expect, it } from 'vitest'
import type { Person, PublicationData } from '../types/family'
import { usePublicationStats } from './usePublicationStats'

const people: Record<string, Person> = {
  p1: { id: 'p1', name: '陈甲', gender: 'male', birth: '1800年', death: '1870年', deceased: true },
  p2: { id: 'p2', name: '李乙', gender: 'female', birth: '1805年', death: '1855年', deceased: true },
  p3: { id: 'p3', name: '陈甲', gender: 'male', birth: '1830年', death: '1900年', deceased: true },
  p4: { id: 'p4', name: '陈丙', gender: 'female', birth: '1860年' },
}

const publication: PublicationData = {
  title: '测试宗谱',
  subtitle: '',
  focusFamilyId: 'f1',
  people,
  families: {
    f1: { id: 'f1', adults: ['p1', 'p2'], children: ['p3'] },
    f2: { id: 'f2', adults: ['p3'], children: ['p4'] },
  },
  info: { hallName: '崇本堂', familyMotto: '敦亲睦族', ancestralOrigin: '颍川' },
}

describe('usePublicationStats', () => {
  it('computes population, generation and hall statistics', () => {
    const stats = usePublicationStats(computed(() => publication))

    expect(stats.totalCount.value).toBe(4)
    expect(stats.maleCount.value).toBe(2)
    expect(stats.deceasedCount.value).toBe(3)
    expect(stats.aliveCount.value).toBe(1)
    expect(stats.malePercent.value).toBe(50)
    expect(stats.clanHallInfo.value).toEqual({ hall: '崇本堂', motto: '敦亲睦族', origin: '颍川' })
    expect(stats.generationDistribution.value).toEqual([
      [1, 2],
      [2, 1],
      [3, 1],
    ])
    expect(stats.generationCount.value).toBe(3)
    expect(stats.peakGeneration.value).toEqual([1, 2])
  })

  it('computes lifespan summaries and historical span', () => {
    const stats = usePublicationStats(computed(() => publication))

    expect(stats.lifespans.value).toEqual([70, 50, 70])
    expect(stats.avgLifespan.value).toBe(63)
    expect(stats.oldestPerson.value).toEqual({ id: 'p1', name: '陈甲', years: 70, birth: '1800年', death: '1870年' })
    expect(stats.timelineSpan.value).toBe(100)
    expect(stats.lifespanBuckets.value).toEqual([
      ['30岁以下', 0],
      ['30-49岁', 0],
      ['50-69岁', 1],
      ['70-79岁 (古稀)', 2],
      ['80岁以上 (耄耋)', 0],
    ])
  })

  it('finds name patterns and produces a narrative summary', () => {
    const stats = usePublicationStats(computed(() => publication))

    expect(stats.nameCharDist.value).toEqual([['甲', 2]])
    expect(stats.surnameDist.value).toEqual([
      ['陈', 3],
      ['李', 1],
    ])
    expect(stats.narrativeSummary.value).toContain('本谱共载族人先祖 4 位')
    expect(stats.narrativeSummary.value).toContain('历传 3 世')
  })
})
